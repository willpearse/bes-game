#!/usr/bin/env node
// Headless balance simulation.
//   npm run simulate -- --games 500 --bot greedy
// Options: --games N (default 100), --bot random|greedy|nature|balanced|both|all or a comma list
//          (default both = random and greedy), --seed S (first seed, default 1),
//          --map estuary|millValley, --market menu, --waste simple, --happiness endGame (as the URL flags).
//          --set key=value,key=value overrides CONFIG numbers for tuning (for example --set wasteBillMax=2).
import { SERVICE_KEYS } from '../src/data/services.js';
import { BOTS, BOT_RULES, playGame, parseArgs, variantConfig, botList } from './bots.js';

const args = parseArgs(process.argv.slice(2));
const games = Number(args.games ?? 100);
const bots = botList(args.bot, ['random', 'greedy']);
const firstSeed = Number(args.seed ?? 1);
const config = variantConfig(args);

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
    results.push(playGame(bot, firstSeed + i, config));
    if (process.stdout.isTTY && (i + 1) % 10 === 0) process.stdout.write(`\r  ${bot}: ${i + 1}/${games}`);
  }
  if (process.stdout.isTTY) process.stdout.write('\r' + ' '.repeat(40) + '\r');
  console.log(`\n${bot} bot (${((Date.now() - t0) / 1000).toFixed(1)} s): ${BOT_RULES[bot]}`);
  console.log(row('Score (£)', results.map((f) => f.score)));
  console.log(row('GDP after damage (£)', results.map((f) => f.gdpAfterDamage)));
  console.log(row("Nature's share of GDP", results.map((f) => f.natureShare * 100), 1, '%'));
  for (const k of SERVICE_KEYS) console.log(row(`  ${k} contribution (£)`, results.map((f) => f.perService[k])));
  console.log(row('Food bought (£)', results.map((f) => f.foodCost)));
  console.log(row('Waste bills (£)', results.map((f) => f.wasteBill)));
  console.log(row('Fertiliser (£)', results.map((f) => f.fertiliser)));
  console.log(row('Tiles wrecked by events', results.map((f) => f.destroyed)));
  console.log(row('Water pollution at end', results.map((f) => f.pollution)));
  console.log(row('Residents at end', results.map((f) => f.residents)));
  console.log(row('Housing penalty (£)', results.map((f) => f.housingPenalty)));
  console.log(row('Event hits (tiles)', results.map((f) => f.eventHits)));
  console.log(row('Event damage (£)', results.map((f) => f.eventDamage)));
  console.log(row('Damage avoided (£)', results.map((f) => f.damageAvoided)));
  console.log(row('Primary cells lost', results.map((f) => f.primaryLost)));
  console.log(row('Intactness at end', results.map((f) => f.endIntactness * 100), 1, '%'));
  console.log(row('Objectives met', results.map((f) => f.objectives.filter((o) => o.met).length)));
  const share = (pred) => `${Math.round((100 * results.filter(pred).length) / results.length)}%`;
  console.log(`  Medals: none ${share((f) => !f.medal)}, bronze ${share((f) => f.medal === 'bronze')}, ` +
    `silver ${share((f) => f.medal === 'silver')}, gold ${share((f) => f.medal === 'gold')}` +
    `  (housing met ${share((f) => f.medalChecks.housing)}, fed at end ${share((f) => f.medalChecks.fed)}, ` +
    `objectives met ${share((f) => f.medalChecks.objectives)}, gold score ${share((f) => f.medalChecks.score)})`);
}
