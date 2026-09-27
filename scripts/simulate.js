#!/usr/bin/env node
// Headless balance simulation.
//   npm run simulate -- --games 500 --bot greedy
// Options: --games N (default 100), --bot random|greedy|both (default both), --seed S (first seed, default 1),
//          --market menu, --waste simple, --happiness endGame, --pressure 1 (same variant flags as the URL).
import { createGame } from '../src/engine/state.js';
import { takeTurn, legalTargets, preview, choiceCost } from '../src/engine/actions.js';
import { menuUnlocked } from '../src/engine/market.js';
import { mulberry32 } from '../src/engine/rng.js';
import { RESTORATION_KEYS } from '../src/data/restorations.js';
import { SERVICE_KEYS } from '../src/data/services.js';

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) out[key] = true;
      else { out[key] = next; i++; }
    }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const games = Number(args.games ?? 100);
const bots = args.bot && args.bot !== 'both' ? [args.bot] : ['random', 'greedy'];
const firstSeed = Number(args.seed ?? 1);
const config = {};
if (args.market) config.marketMode = args.market === 'menu' ? 'menu' : 'market';
if (args.waste) config.wasteMode = args.waste === 'simple' ? 'simple' : 'tokens';
if (args.happiness) config.happinessMode = args.happiness === 'endGame' ? 'endGame' : 'perTurn';
if (args.pressure) config.populationPressure = ['1', 'true', 'on'].includes(String(args.pressure));

// All choices (without a target) available this turn.
function choices(state) {
  const out = [];
  if (state.config.marketMode === 'market') {
    state.market.slots.forEach((t, slot) => { if (t) out.push({ type: 'build', slot }); });
    const restoreSlot = state.market.slots.findIndex((t) => t != null);
    if (restoreSlot >= 0) for (const r of RESTORATION_KEYS) out.push({ type: 'restore', restoration: r, slot: restoreSlot });
  } else {
    for (const b of menuUnlocked(state)) out.push({ type: 'build', building: b });
    for (const r of RESTORATION_KEYS) out.push({ type: 'restore', restoration: r });
  }
  return out;
}

function actionsFor(state) {
  const acts = { build: [], restore: [] };
  for (const ch of choices(state)) {
    for (const t of legalTargets(state, ch)) acts[ch.type].push({ ...ch, row: t.row, col: t.col });
  }
  return acts;
}

const BOTS = {
  random(state, rng) {
    const acts = actionsFor(state);
    const types = ['pass', ...(acts.build.length ? ['build'] : []), ...(acts.restore.length ? ['restore'] : [])];
    const type = types[Math.floor(rng() * types.length)];
    if (type === 'pass') return { type: 'pass' };
    const list = acts[type];
    return list[Math.floor(rng() * list.length)];
  },
  // Picks the action with the best previewed GDP gain per pound; passes if nothing gains.
  greedy(state) {
    const acts = actionsFor(state);
    let best = { type: 'pass' };
    let bestValue = 0;
    for (const a of [...acts.build, ...acts.restore]) {
      const p = preview(state, a, a.row, a.col);
      const value = p.gdpDelta / Math.max(1, choiceCost(state, a));
      if (value > bestValue + 1e-9) { bestValue = value; best = a; }
    }
    return best;
  }
};

function playGame(bot, seed) {
  let state = createGame({ seed, config });
  let r = seed;
  const rng = () => { const [v, n] = mulberry32(r); r = n; return v; };
  while (!state.gameOver) state = takeTurn(state, BOTS[bot](state, rng)).state;
  return state.final;
}

const stats = (xs) => {
  const n = xs.length;
  const mean = xs.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, n - 1));
  const sorted = xs.slice().sort((a, b) => a - b);
  return { mean, sd, min: sorted[0], median: sorted[Math.floor(n / 2)], max: sorted[n - 1] };
};

const row = (label, xs, digits = 1, unit = '') => {
  const s = stats(xs);
  const f = (x) => `${x.toFixed(digits)}${unit}`;
  return `  ${label.padEnd(26)} mean ${f(s.mean).padStart(9)}  sd ${f(s.sd).padStart(8)}  min ${f(s.min).padStart(8)}  median ${f(s.median).padStart(8)}  max ${f(s.max).padStart(8)}`;
};

console.log(`Green and Pleasant balance simulation: ${games} games per bot, seeds ${firstSeed}..${firstSeed + games - 1}`);
console.log(`Variant: ${JSON.stringify(config)}`);
for (const bot of bots) {
  if (!BOTS[bot]) { console.error(`Unknown bot ${bot}`); process.exit(1); }
  const t0 = Date.now();
  const results = [];
  for (let i = 0; i < games; i++) {
    results.push(playGame(bot, firstSeed + i));
    if (process.stdout.isTTY && (i + 1) % 10 === 0) process.stdout.write(`\r  ${bot}: ${i + 1}/${games}`);
  }
  if (process.stdout.isTTY) process.stdout.write('\r' + ' '.repeat(40) + '\r');
  console.log(`\n${bot} bot (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  console.log(row('Score (£)', results.map((f) => f.score)));
  console.log(row('GDP after damage (£)', results.map((f) => f.gdpAfterDamage)));
  console.log(row("Nature's share of GDP", results.map((f) => f.natureShare * 100), 1, '%'));
  for (const k of SERVICE_KEYS) console.log(row(`  ${k} contribution (£)`, results.map((f) => f.perService[k])));
  console.log(row('Event hits (tiles)', results.map((f) => f.eventHits)));
  console.log(row('Event damage (£)', results.map((f) => f.eventDamage)));
  console.log(row('Damage avoided (£)', results.map((f) => f.damageAvoided)));
  console.log(row('Primary cells lost', results.map((f) => f.primaryLost)));
  console.log(row('Intactness at end', results.map((f) => f.endIntactness * 100), 1, '%'));
  console.log(row('Objectives met', results.map((f) => f.objectives.filter((o) => o.met).length)));
}
