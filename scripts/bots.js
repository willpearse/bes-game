// Bots for headless balance runs (scripts/simulate.js, scripts/payoff.js).
// Each bot is one simple rule, described in BOT_RULES so reports can say what was played.
import { createGame } from '../src/engine/state.js';
import { takeTurn, legalTargets, preview, choiceCost } from '../src/engine/actions.js';
import { menuUnlocked } from '../src/engine/market.js';
import { cellAt, ortho, isNature } from '../src/engine/grid.js';
import { mulberry32 } from '../src/engine/rng.js';
import { RESTORATION_KEYS } from '../src/data/restorations.js';

export const BOT_RULES = {
  random: 'Picks pass, build or restore at random, then a random legal choice and square.',
  greedy: "Takes the build or restoration with the best gain in this turn's GDP per pound spent; passes if nothing gains.",
  nature: 'Never builds. Every turn it makes the restoration that would add most GDP once the habitat has grown, then most happiness, then most biodiversity.',
  balanced: 'Builds like greedy, but only off ancient habitat and where the new tile keeps at least two nature squares touching it; otherwise restores like the nature bot.'
};

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

// Best action by value(); returns null if none has value > min.
function best(list, value, min = 0) {
  let top = null;
  let topValue = min;
  for (const a of list) {
    const v = value(a);
    if (v > topValue + 1e-9) { top = a; topValue = v; }
  }
  return top;
}

// Compares [a, b, ...] keys lexicographically.
function better(k, key) {
  for (let i = 0; i < k.length; i++) {
    if (k[i] > key[i] + 1e-9) return true;
    if (k[i] < key[i] - 1e-9) return false;
  }
  return false;
}

// Nature bot's choice: most GDP once grown, then most happiness, then most biodiversity. Never passes if it can restore.
function bestRestoration(state, restores) {
  let top = null;
  let key = null;
  for (const a of restores) {
    const p = preview(state, a, a.row, a.col, { grown: true });
    const k = [p.gdpDelta, p.happinessDelta, p.intactnessDelta];
    if (!key || better(k, key)) { top = a; key = k; }
  }
  return top;
}

const perPound = (state, a) => preview(state, a, a.row, a.col).gdpDelta / Math.max(1, choiceCost(state, a));

// A build keeps at least two nature squares touching the new tile, and is not on ancient habitat.
function wellSpaced(state, a) {
  const cell = cellAt(state, a.row, a.col);
  if (cell.landUse === 'primary') return false;
  return ortho(state, a.row, a.col).filter(isNature).length >= 2;
}

export const BOTS = {
  random(state, rng) {
    const acts = actionsFor(state);
    const types = ['pass', ...(acts.build.length ? ['build'] : []), ...(acts.restore.length ? ['restore'] : [])];
    const type = types[Math.floor(rng() * types.length)];
    if (type === 'pass') return { type: 'pass' };
    const list = acts[type];
    return list[Math.floor(rng() * list.length)];
  },
  greedy(state) {
    const acts = actionsFor(state);
    return best([...acts.build, ...acts.restore], (a) => perPound(state, a)) ?? { type: 'pass' };
  },
  nature(state) {
    return bestRestoration(state, actionsFor(state).restore) ?? { type: 'pass' };
  },
  balanced(state) {
    const acts = actionsFor(state);
    const build = best(acts.build.filter((a) => wellSpaced(state, a)), (a) => perPound(state, a));
    return build ?? bestRestoration(state, acts.restore) ?? { type: 'pass' };
  }
};

export const BOT_NAMES = Object.keys(BOTS);

// Plays one game. onTurn(stateBefore, action, { state, log }) is called after each turn.
export function playGame(bot, seed, config = {}, onTurn = null) {
  let state = createGame({ seed, config });
  let r = seed;
  const rng = () => { const [v, n] = mulberry32(r); r = n; return v; };
  while (!state.gameOver) {
    const action = BOTS[bot](state, rng);
    const res = takeTurn(state, action);
    if (onTurn) onTurn(state, action, res);
    state = res.state;
  }
  return state.final;
}

// Command-line helpers shared by the scripts.
export function parseArgs(argv) {
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

export function variantConfig(args) {
  const config = {};
  if (args.market) config.marketMode = args.market === 'menu' ? 'menu' : 'market';
  if (args.waste) config.wasteMode = args.waste === 'simple' ? 'simple' : 'tokens';
  if (args.happiness) config.happinessMode = args.happiness === 'endGame' ? 'endGame' : 'perTurn';
  if (args.pressure) config.populationPressure = ['1', 'true', 'on'].includes(String(args.pressure));
  return config;
}

export function botList(arg, fallback) {
  if (!arg || arg === 'both') return fallback;
  if (arg === 'all') return BOT_NAMES;
  return String(arg).split(',');
}
