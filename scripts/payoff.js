#!/usr/bin/env node
// Pay-off of each kind of building, with and without nature touching it, against what the parameters predict.
//   npm run payoff -- --games 200 --bot all
// Options: --games N (default 100), --bot as in simulate.js (default all), --seed S (first seed, default 1),
//          plus the same variant flags as simulate.js. Prints Markdown tables.
import { BUILDINGS, WELLBEING } from '../src/data/buildings.js';
import { HABITATS } from '../src/data/habitats.js';
import { SERVICE_KEYS } from '../src/data/services.js';
import { PREDICTS_B } from '../src/data/predicts.js';
import { CONFIG } from '../src/data/config.js';
import { EVENTS } from '../src/data/events.js';
import { MAPS } from '../src/data/maps/index.js';
import { ortho, idx, isBuilt, isNature } from '../src/engine/grid.js';
import { wasteRelease, wasteBillRate } from '../src/engine/waste.js';
import { tileFood, fertiliser } from '../src/engine/gdp.js';
import { BOT_RULES, playGame, parseArgs, variantConfig, botList } from './bots.js';

const args = parseArgs(process.argv.slice(2));
const games = Number(args.games ?? 100);
const bots = botList(args.bot, ['random', 'greedy', 'nature', 'balanced']);
const firstSeed = Number(args.seed ?? 1);
const config = variantConfig(args);
const cfg = { ...CONFIG, ...config };

const IDS = Object.keys(BUILDINGS);
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const f1 = (x) => (Number.isFinite(x) ? x.toFixed(1) : '–');
const f2 = (x) => (Number.isFinite(x) ? x.toFixed(2) : '–');
const pct = (x) => (Number.isFinite(x) ? `${Math.round(x * 100)}%` : '–');

// ---------- theory, from the parameters alone ----------

// A typical touching nature square: the average habitat on the map's starting nature cells, at light use
// (mature secondary, B 0.8), because a building puts pressure on every square next to it.
const map = MAPS[cfg.mapId];
const startHabitats = map.rows.join('').split('')
  .map((ch) => Object.keys(HABITATS).find((k) => HABITATS[k].code === ch.toLowerCase()))
  .filter(Boolean);
// Sea tiles (fleet, wind farm) use the average marine square instead.
const B_LIGHT = PREDICTS_B.matureSecondary.light;
const average = (habitats) => Object.fromEntries(SERVICE_KEYS.map((s) => [s, mean(habitats.map((h) => HABITATS[h].services[s])) * B_LIGHT]));
const perSquare = {
  land: average(startHabitats.filter((h) => !HABITATS[h].marine)),
  sea: average(startHabitats.filter((h) => HABITATS[h].marine))
};
const SEA_TILES = new Set(Object.keys(BUILDINGS).filter((id) => BUILDINGS[id].placement.startsWith('sea')));
const theoryServices = (id, k) => {
  const per = perSquare[SEA_TILES.has(id) ? 'sea' : 'land'];
  return Object.fromEntries(SERVICE_KEYS.map((s) => [s, Math.min(cfg.serviceCap, k * per[s])]));
};

// Income before happiness, with no waste or pollution, and the most nearby homes a business park can count.
function theoryIncome(id, k) {
  const g = BUILDINGS[id].gdp;
  let v = g.base;
  if (g.serviceBonus) v += Math.floor(theoryServices(id, k)[g.serviceBonus.service] / g.serviceBonus.divisor);
  if (g.nearbyResidential) v += g.nearbyResidential.max;
  return v;
}
// Waste bill: waste the touching nature cannot soak up (1 per wasteAbsorbDivisor water received).
const theoryBill = (id, k) => Math.max(0, BUILDINGS[id].waste - Math.floor(theoryServices(id, k).WAT / cfg.wasteAbsorbDivisor)) * cfg.wasteBillPerToken;
function theoryFood(id, k) {
  const f = BUILDINGS[id].food;
  if (!f) return 0;
  return f.base + (f.serviceBonus ? Math.floor(theoryServices(id, k)[f.serviceBonus.service] / f.serviceBonus.divisor) : 0);
}
const theoryWellbeing = (id, k) => Math.min(WELLBEING.max,
  BUILDINGS[id].wellbeingBase + Math.min(WELLBEING.greenCap, theoryServices(id, k).GRN) / WELLBEING.greenDivisor);

// Expected event cost per turn for a tile exposed to one kind of event and unprotected:
// each kind is drawn with probability eventCount / kinds, and hits for max(minimum, multiplier x GDP).
const pEvent = Math.min(cfg.eventCount, cfg.eventTurns.length) / Object.keys(EVENTS).length;
const theoryHazard = (gdp) => (pEvent * Math.max(cfg.eventDamageMinimum, cfg.eventDamageMultiplier * gdp)) / cfg.turns;

// ---------- simulation ----------

function collect(bot) {
  const tileTurns = []; // { id, k, net, gross, mult, wellbeing, received }
  const tiles = new Map(); // key -> { id, placed, turns, net, damage, cost }
  const hazards = { atRisk: 0, hit: 0, damage: 0 };
  let bills = 0;
  let foodCost = 0;
  let grossAfterH = 0;
  const Hs = [];
  for (let g = 0; g < games; g++) {
    const live = new Map();
    playGame(bot, firstSeed + g, config, (before, action, { state, log }) => {
      const gdp = log.find((l) => l.type === 'gdp');
      const mult = cfg.happinessMode === 'perTurn' ? 1 + cfg.happinessGdpFactor * (gdp.happiness - cfg.happinessNeutral) : 1;
      Hs.push(gdp.happiness);
      const earn = new Map(gdp.earnings.map((e) => [`${e.row},${e.col}`, e.amount]));
      // Services and buildings are unchanged by the waste step, so this is the release used for this turn's GDP.
      const release = wasteRelease(state);
      foodCost += gdp.food.cost;
      const seen = new Set();
      for (const cell of state.cells) {
        if (!isBuilt(cell)) continue;
        const pos = `${cell.row},${cell.col}`;
        seen.add(pos);
        let t = live.get(pos);
        if (!t || t.id !== cell.building) {
          const built = action.type === 'build' && action.row === cell.row && action.col === cell.col;
          t = { id: cell.building, placed: state.turn, turns: 0, net: 0, food: 0, damage: 0, cost: built ? BUILDINGS[cell.building].cost : 0, start: !built };
          live.set(pos, t);
          tiles.set(`${g}:${pos}:${state.turn}`, t);
        }
        // Approximate: the bill rate uses pollution after this turn's waste step.
        const bill = release.get(idx(state, cell.row, cell.col)).released * wasteBillRate(state) + fertiliser(state, cell);
        const net = earn.get(pos) ?? 0;
        const food = tileFood(cell);
        t.turns += 1;
        t.net += net;
        t.food += food;
        bills += bill;
        grossAfterH += net + bill;
        const k = ortho(state, cell.row, cell.col).filter(isNature).length;
        tileTurns.push({ id: cell.building, k, net, bill, food, mult, wellbeing: cell.wellbeing, received: cell.received });
      }
      for (const pos of [...live.keys()]) if (!seen.has(pos)) live.delete(pos);
      const ev = log.find((l) => l.type === 'event');
      if (ev) {
        hazards.atRisk += ev.hit.length + ev.protected.length;
        hazards.hit += ev.hit.length;
        hazards.damage += ev.damage;
        for (const h of ev.hit) {
          const t = live.get(`${h.row},${h.col}`);
          if (t) t.damage += h.damage;
        }
      }
    });
  }
  return { tileTurns, tiles: [...tiles.values()], hazards, bills, foodCost, grossAfterH, H: mean(Hs) };
}

// ---------- report ----------

console.log(`# Building pay-off: ${games} games per bot, seeds ${firstSeed} to ${firstSeed + games - 1}`);
console.log(`\nVariant: ${JSON.stringify(config)}. "Touching nature" (k) counts the 4 squares N, E, S, W that are nature (including river and sea).`);
console.log(`\nTheory assumes each touching nature square supplies the map's average habitat at light use (B ${B_LIGHT}). ` +
  `Land: ${SERVICE_KEYS.map((s) => `${s} ${f2(perSquare.land[s])}`).join(', ')}. ` +
  `Sea (for fleet and wind farm): ${SERVICE_KEYS.map((s) => `${s} ${f2(perSquare.sea[s])}`).join(', ')}. ` +
  `Received is capped at ${cfg.serviceCap}. Theory ignores waste tokens and pollution, and gives a business park its full bonus for homes. ` +
  `Net = income x happiness multiplier - waste bill (1 per waste token that touching nature cannot soak up). ` +
  `Food is shown separately: each unit saves £${cfg.foodImportPrice} of food the town would otherwise buy, and each resident eats ${cfg.foodPerResident}.`);

const all = {};
for (const bot of bots) {
  const t0 = Date.now();
  all[bot] = collect(bot);
  console.error(`${bot}: ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}

console.log('\n## Bots\n');
console.log('| Bot | Rule | Mean H | Tile-turns | Waste bills and fertiliser as % of income | Food bought as % of income | Event damage as % of income | Tiles at risk hit |');
console.log('|---|---|---|---|---|---|---|---|');
for (const bot of bots) {
  const d = all[bot];
  console.log(`| ${bot} | ${BOT_RULES[bot]} | ${f1(d.H)} | ${d.tileTurns.length} | ${pct(d.bills / d.grossAfterH)} | ${pct(d.foodCost / d.grossAfterH)} | ${pct(d.hazards.damage / d.grossAfterH)} | ${d.hazards.hit}/${d.hazards.atRisk} (${pct(d.hazards.hit / d.hazards.atRisk)}) |`);
}

// Net GDP per turn by touching nature, pooled over bots, with theory at H 5 and at the pooled mean H.
const pooled = bots.flatMap((b) => all[b].tileTurns);
const pooledMult = mean(pooled.map((t) => t.mult));
console.log(`\n## Net GDP per turn by touching nature (all bots pooled)\n`);
console.log(`Each cell: observed mean net £ per tile per turn (number of tile-turns), then theory at the pooled mean multiplier x${f2(pooledMult)}. Last columns: theory at H 5 (income - waste bill), and food made per turn in theory.`);
console.log('\n| Building | Waste | ' + [0, 1, 2, 3, 4].map((k) => `k=${k}`).join(' | ') + ' | Theory at H 5, k=0 → 4 | Food, k=0 → 4 |');
console.log('|---|---|' + [0, 1, 2, 3, 4].map(() => '---').join('|') + '|---|---|');
for (const id of IDS) {
  const rows = pooled.filter((t) => t.id === id);
  if (!rows.length) continue;
  const cells = [0, 1, 2, 3, 4].map((k) => {
    const r = rows.filter((t) => t.k === k);
    const th = theoryIncome(id, k) * pooledMult - theoryBill(id, k);
    return r.length ? `${f1(mean(r.map((t) => t.net)))} (${r.length}) vs ${f1(th)}` : `– vs ${f1(th)}`;
  });
  const h5 = [0, 1, 2, 3, 4].map((k) => theoryIncome(id, k) - theoryBill(id, k)).join(' → ');
  const fd = BUILDINGS[id].food ? [0, 1, 2, 3, 4].map((k) => theoryFood(id, k)).join(' → ') : '–';
  console.log(`| ${BUILDINGS[id].name} | ${BUILDINGS[id].waste} | ${cells.join(' | ')} | ${h5} | ${fd} |`);
}

// Homes: wellbeing by touching nature, observed vs theory.
console.log('\n## Home wellbeing by touching nature (all bots pooled)\n');
console.log('Observed mean wellbeing (tile-turns) vs theory (base + green space, before schools, hospitals, nuisance and waste).');
console.log('\n| Home | ' + [0, 1, 2, 3, 4].map((k) => `k=${k}`).join(' | ') + ' |');
console.log('|---|' + [0, 1, 2, 3, 4].map(() => '---').join('|') + '|');
for (const id of IDS.filter((i) => BUILDINGS[i].residents > 0)) {
  const rows = pooled.filter((t) => t.id === id);
  const cells = [0, 1, 2, 3, 4].map((k) => {
    const r = rows.filter((t) => t.k === k);
    return `${r.length ? f1(mean(r.map((t) => t.wellbeing))) : '–'} (${r.length}) vs ${f1(theoryWellbeing(id, k))}`;
  });
  console.log(`| ${BUILDINGS[id].name} | ${cells.join(' | ')} |`);
}

// Lifetime pay-off of tiles the bots built (not the starting village).
console.log('\n## Lifetime pay-off of each building placed (all bots pooled)\n');
console.log(`Mean over tiles built during play. Pay-off = net GDP earned + food made x £${cfg.foodImportPrice} - food eaten by its residents x £${cfg.foodImportPrice} - cost - event damage. Hazard theory: expected event cost per turn if exposed to one kind of event and unprotected, at the observed mean net GDP.`);
console.log('\n| Building | Tiles | Cost | Turns kept | Net GDP/turn | Food value/turn | Event damage/turn | Hazard theory/turn | Pay-off | Turns to pay back cost |');
console.log('|---|---|---|---|---|---|---|---|---|---|');
const built = bots.flatMap((b) => all[b].tiles.filter((t) => !t.start));
for (const id of IDS) {
  const ts = built.filter((t) => t.id === id);
  if (!ts.length) continue;
  const turns = mean(ts.map((t) => t.turns));
  const netPerTurn = ts.reduce((a, t) => a + t.net, 0) / ts.reduce((a, t) => a + t.turns, 0);
  const dmgPerTurn = ts.reduce((a, t) => a + t.damage, 0) / ts.reduce((a, t) => a + t.turns, 0);
  // Food made is worth what it saves in bought food; residents' food is a cost at the same price.
  const foodValue = (t) => (t.food - t.turns * BUILDINGS[id].residents * cfg.foodPerResident) * cfg.foodImportPrice;
  const foodPerTurn = ts.reduce((a, t) => a + foodValue(t), 0) / ts.reduce((a, t) => a + t.turns, 0);
  const payoff = mean(ts.map((t) => t.net + foodValue(t) - t.cost - t.damage));
  const perTurn = netPerTurn + foodPerTurn - dmgPerTurn;
  const payback = perTurn > 0 ? BUILDINGS[id].cost / perTurn : Infinity;
  console.log(`| ${BUILDINGS[id].name} | ${ts.length} | ${BUILDINGS[id].cost} | ${f1(turns)} | ${f2(netPerTurn)} | ${f2(foodPerTurn)} | ${f2(dmgPerTurn)} | ${f2(theoryHazard(Math.max(0, netPerTurn)))} | ${f1(payoff)} | ${Number.isFinite(payback) ? f1(payback) : 'never'} |`);
}

// Per bot: how each bot's tiles do with little vs plenty of nature.
console.log('\n## Net GDP per turn with little (k ≤ 1) vs plenty (k ≥ 3) of touching nature, by bot\n');
console.log('| Bot | ' + IDS.filter((i) => pooled.some((t) => t.id === i)).map((i) => BUILDINGS[i].name).join(' | ') + ' |');
console.log('|---|' + IDS.filter((i) => pooled.some((t) => t.id === i)).map(() => '---').join('|') + '|');
for (const bot of bots) {
  const rows = all[bot].tileTurns;
  const cells = IDS.filter((i) => pooled.some((t) => t.id === i)).map((id) => {
    const lo = rows.filter((t) => t.id === id && t.k <= 1).map((t) => t.net);
    const hi = rows.filter((t) => t.id === id && t.k >= 3).map((t) => t.net);
    return `${f1(mean(lo))} / ${f1(mean(hi))}`;
  });
  console.log(`| ${bot} | ${cells.join(' | ')} |`);
}
