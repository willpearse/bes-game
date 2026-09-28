// Player actions: legalTargets(), preview(), takeTurn() (sections 8, 9 and 17).
import { CONFIG, INTENSITIES } from '../data/config.js';
import { HABITATS } from '../data/habitats.js';
import { BUILDINGS } from '../data/buildings.js';
import { RESTORATIONS } from '../data/restorations.js';
import { SERVICE_KEYS } from '../data/services.js';
import { ORTHO, ortho, isBuilt, isNature, isLand, cellAt, round1 } from './grid.js';
import { placeBuilding, recompute } from './state.js';
import { updateMarket, discardEarlierPiles, menuUnlocked, stageForTurn, surcharge } from './market.js';
import { updateIntensity, applyPrimaryLoss, applySuccession, intactness } from './intensity.js';
import { computeSupply, computeReceived, emptyServices, topContributor } from './services.js';
import { computeHappiness, happiness } from './happiness.js';
import { projectGdp, counterfactualGdp, happinessMultiplier } from './gdp.js';
import { resolveWaste } from './waste.js';
import { resolveEvent } from './events.js';
import { evaluateObjectives } from './objectives.js';

const cfg = (state) => state.config ?? CONFIG;
// Fast structural copy of a game state (plain JSON data). Equivalent to structuredClone.
export function cloneState(st) {
  const copyServices = (o) => (o ? { ...o } : o);
  return {
    ...st,
    config: { ...st.config, objectives: st.config.objectives ? st.config.objectives.slice() : st.config.objectives, eventTurns: st.config.eventTurns.slice(), marketSurcharge: st.config.marketSurcharge.slice(),
      pressureThresholds: st.config.pressureThresholds.slice(), stageStartTurns: { ...st.config.stageStartTurns } },
    cells: st.cells.map((c) => ({ ...c, supply: copyServices(c.supply), received: copyServices(c.received) })),
    market: st.market ? { slots: st.market.slots.slice(), piles: Object.fromEntries(Object.entries(st.market.piles).map(([k, v]) => [k, v.slice()])) } : null,
    events: st.events.map((e) => ({ ...e })),
    eventHistory: structuredClone(st.eventHistory),
    objectives: st.objectives.slice(),
    startPrimary: st.startPrimary.slice(),
    stats: { ...st.stats },
    startHabitats: { ...st.startHabitats },
    objectiveOffer: st.objectiveOffer.slice(),
    cf: { ...st.cf, without: { ...st.cf.without } },
    history: st.history.map((h) => ({ ...h })),
    final: st.final ? structuredClone(st.final) : null
  };
}

const clone = cloneState;

// ---------- choices and costs ----------

// A choice is { type: 'build', slot } or { type: 'build', building } (menu mode),
// or { type: 'restore', restoration, slot } ({ type: 'restore', restoration } in menu mode).
export function choiceBuilding(state, choice) {
  if (choice.type !== 'build') return null;
  if (cfg(state).marketMode === 'market') return state.market.slots[choice.slot] ?? null;
  return menuUnlocked(state).includes(choice.building) ? choice.building : null;
}

export function choiceCost(state, choice) {
  const market = cfg(state).marketMode === 'market';
  if (choice.type === 'pass') return 0;
  if (choice.type === 'build') {
    const b = choiceBuilding(state, choice);
    if (!b) return null;
    return BUILDINGS[b].cost + (market ? surcharge(state, choice.slot) : 0);
  }
  if (choice.type === 'restore') {
    if (!RESTORATIONS[choice.restoration]) return null;
    if (market) return state.market.slots[choice.slot] != null ? surcharge(state, choice.slot) : null;
    return cfg(state).menuRestoreCost;
  }
  return null;
}

export function canAfford(state, choice) {
  const cost = choiceCost(state, choice);
  return cost != null && cost <= state.cash + 1e-9;
}

// ---------- placement rules ----------

function isBuiltNeighbour(c) {
  return isBuilt(c) && !BUILDINGS[c.building].notBuiltNeighbour;
}

// Orthogonally next to a built tile, or next to one across a single river square (as if bridged).
function nextToBuilt(state, cell) {
  for (const [dr, dc] of ORTHO) {
    const n = cellAt(state, cell.row + dr, cell.col + dc);
    if (!n) continue;
    if (isBuiltNeighbour(n)) return true;
    if (isNature(n) && n.habitat === 'river') {
      const far = cellAt(state, cell.row + 2 * dr, cell.col + 2 * dc);
      if (far && isBuiltNeighbour(far) && isLand(far)) return true;
    }
  }
  return false;
}

function isBuildableLand(cell) {
  return isNature(cell) && HABITATS[cell.habitat].buildable === 'land';
}

function isOpenSea(cell) {
  return isNature(cell) && cell.habitat === 'openSea';
}

export function canPlaceBuilding(state, buildingId, cell) {
  const b = BUILDINGS[buildingId];
  if (b.noReserve && cell.reserve) return false;
  switch (b.placement) {
    case 'landNextToBuilt': return isBuildableLand(cell) && nextToBuilt(state, cell);
    case 'landAnywhere': return isBuildableLand(cell);
    case 'moorOrHeath': return isNature(cell) && (cell.habitat === 'moorland' || cell.habitat === 'heath');
    case 'seaAnywhere': return isOpenSea(cell);
    case 'seaNextToBuiltLand':
      return isOpenSea(cell) && ortho(state, cell.row, cell.col).some((n) => isBuiltNeighbour(n) && isLand(n));
    default: throw new Error(`Unknown placement ${b.placement}`);
  }
}

export function canRestore(state, restorationId, cell) {
  const r = RESTORATIONS[restorationId];
  let ok = false;
  if (isNature(cell)) ok = r.habitats.includes(cell.habitat);
  else ok = r.buildings.includes(cell.building);
  if (!ok) return false;
  if (r.reserve && cell.reserve) return false;
  if (r.nextToWater) {
    ok = ortho(state, cell.row, cell.col).some((n) => isNature(n) && (n.habitat === 'river' || n.habitat === 'lake'));
  }
  return ok;
}

export function legalTargets(state, choice) {
  if (state.gameOver || !canAfford(state, choice)) return [];
  const out = [];
  if (choice.type === 'build') {
    const b = choiceBuilding(state, choice);
    for (const cell of state.cells) if (canPlaceBuilding(state, b, cell)) out.push({ row: cell.row, col: cell.col });
  } else if (choice.type === 'restore') {
    for (const cell of state.cells) if (canRestore(state, choice.restoration, cell)) out.push({ row: cell.row, col: cell.col });
  }
  return out;
}

function isLegal(state, choice, row, col) {
  return legalTargets(state, choice).some((t) => t.row === row && t.col === col);
}

// ---------- applying actions ----------

function applyChoice(state, choice, row, col, log) {
  const cell = cellAt(state, row, col);
  const wasPrimary = isNature(cell) && cell.landUse === 'primary';
  const name = HABITATS[cell.habitat].name.toLowerCase();
  if (choice.type === 'build') {
    const b = choiceBuilding(state, choice);
    placeBuilding(cell, b);
    log.push({ type: 'build', building: b, row, col });
  } else {
    const r = RESTORATIONS[choice.restoration];
    if (r.reserve) {
      cell.reserve = true;
      if (cell.habitat === 'openSea') cell.reserveAge = 0;
    } else {
      const demolished = isBuilt(cell) ? cell.building : null;
      cell.kind = 'nature';
      cell.building = null;
      cell.habitat = r.result;
      cell.landUse = 'youngSecondary';
      cell.age = 0;
      cell.restored = true;
      if (demolished) log.push({ type: 'demolish', building: demolished, row, col });
    }
    state.stats.restorations = (state.stats.restorations ?? 0) + 1;
    log.push({ type: 'restore', restoration: choice.restoration, row, col });
  }
  if (wasPrimary && cell.landUse !== 'primary') {
    state.stats.primaryLost += 1;
    log.push({ type: 'primaryLost', row, col, habitat: cell.habitat,
      message: `Ancient ${name} lost: it can never be restored to this state.` });
  }
}

export function primaryWarning(state, choice, cell) {
  if (!isNature(cell) || cell.landUse !== 'primary') return null;
  if (choice.type === 'build') return 'This is ancient habitat. Once built on, it cannot be restored.';
  if (choice.type === 'restore' && !RESTORATIONS[choice.restoration].reserve) {
    return 'This is ancient habitat. Changing it means it can never be ancient again.';
  }
  return null;
}

// ---------- preview ----------

const rank = (i) => INTENSITIES.indexOf(i);

// States are never mutated after takeTurn returns them, so the recomputed baseline can be cached.
const baselineCache = new WeakMap();

function baseline(state) {
  let b = baselineCache.get(state);
  if (!b) {
    const before = clone(state);
    b = { before, base: recompute(before).projection };
    baselineCache.set(state, b);
  }
  return b;
}

// Restored habitat as it will be once grown: mature secondary, and seagrass on an open-sea reserve.
function grow(cell, choice) {
  if (choice.type !== 'restore') return;
  if (RESTORATIONS[choice.restoration].reserve) {
    if (cell.habitat === 'openSea') Object.assign(cell, { habitat: 'seagrass', reserveAge: null, restored: true });
    else return;
  }
  cell.landUse = 'matureSecondary';
}

// Options: { grown: true } previews a restoration as it will be once the habitat has grown.
export function preview(state, choice, row, col, { grown = false } = {}) {
  const { before, base } = baseline(state);
  const after = clone(state);
  applyChoice(after, choice, row, col, []);
  if (grown) grow(cellAt(after, row, col), choice);
  const proj = recompute(after).projection;
  const cell = cellAt(after, row, col);

  const intensityChanges = [];
  const warnings = [];
  const pw = primaryWarning(state, choice, cellAt(state, row, col));
  if (pw) warnings.push(pw);
  for (let i = 0; i < after.cells.length; i++) {
    const a = after.cells[i];
    const b = before.cells[i];
    if (isNature(a) && isNature(b) && rank(a.intensity) > rank(b.intensity)) {
      intensityChanges.push({ row: a.row, col: a.col, from: b.intensity, to: a.intensity });
      if (a.landUse === 'primary' && a.intensity === 'intense') {
        warnings.push(`Ancient ${HABITATS[a.habitat].name.toLowerCase()} nearby would be lost.`);
      }
    }
  }
  // Where the new tile's services would come from (for preview arrows).
  const sources = [];
  if (isBuilt(cell)) {
    for (const s of BUILDINGS[cell.building].uses ?? []) {
      const src = topContributor(after, row, col, s);
      if (src && cell.received[s] > 0) sources.push({ service: s, row: src.row, col: src.col });
    }
  }
  return {
    gdp: isBuilt(cell) ? cell.gdp : 0,
    sources,
    received: isBuilt(cell) ? { ...cell.received } : null,
    intensityChanges,
    happinessDelta: round1(after.happiness - before.happiness),
    intactnessDelta: intactness(after) - intactness(before),
    gdpDelta: round1(proj.total - base.total),
    turnGdp: proj.total,
    cost: choiceCost(state, choice),
    warnings
  };
}

// ---------- turn resolution ----------

export function takeTurn(state, action) {
  if (state.gameOver) throw new Error('Game is over');
  const s = clone(state);
  const c = cfg(s);
  const log = [];
  const market = c.marketMode === 'market';

  // 1. Apply action.
  let takenSlot = null;
  if (action.type === 'build' || action.type === 'restore') {
    if (!isLegal(s, action, action.row, action.col)) {
      throw new Error(`Illegal action ${JSON.stringify(action)}`);
    }
    const cost = choiceCost(s, action);
    s.cash = round1(s.cash - cost);
    applyChoice(s, action, action.row, action.col, log);
    if (market) takenSlot = action.slot;
  } else if (action.type === 'pass') {
    log.push({ type: 'pass' });
  } else {
    throw new Error(`Unknown action type ${action.type}`);
  }

  // 2. Market.
  if (market) updateMarket(s, takenSlot, log);

  // 3-5. Intensity, Primary loss, succession.
  const changes = updateIntensity(s);
  if (changes.length) log.push({ type: 'intensity', changes });
  applyPrimaryLoss(s, log);
  applySuccession(s, log);

  // 6-8. Supply, received, happiness.
  computeSupply(s);
  computeReceived(s);
  computeHappiness(s);

  // 9. GDP and counterfactuals.
  const proj = projectGdp(s);
  const mult = c.happinessMode === 'perTurn' ? happinessMultiplier(s, s.happiness) : 1;
  const earnings = [];
  for (const { cell, gdp, income, upkeep } of proj.perTile) {
    cell.gdp = gdp;
    const amount = round1(income * mult - upkeep);
    if (amount !== 0) earnings.push({ row: cell.row, col: cell.col, amount });
  }
  s.cash = round1(Math.max(0, s.cash + proj.total));
  s.score = round1(s.score + proj.total);
  s.gdpEarned = round1(s.gdpEarned + proj.total);
  s.lastTurnGdp = proj.total;
  const cf = counterfactualGdp(s);
  s.cf.actual = round1(s.cf.actual + proj.total);
  s.cf.noNature = round1(s.cf.noNature + cf.noNature.total);
  for (const k of SERVICE_KEYS) s.cf.without[k] = round1(s.cf.without[k] + cf.without[k].total);
  log.push({ type: 'gdp', total: proj.total, raw: proj.raw, happiness: s.happiness, earnings });

  // 10. Waste.
  resolveWaste(s, log);

  // 11. Event.
  const ev = s.events.find((e) => e.turn === s.turn);
  if (ev) resolveEvent(s, ev.id, log);

  s.history.push({
    turn: s.turn, gdp: proj.total, cash: s.cash, score: s.score, happiness: s.happiness,
    intactness: round1(intactness(s) * 1000) / 1000, pollution: s.pollution
  });

  // 12. Advance.
  s.turn += 1;
  if (s.turn > c.turns) {
    s.turn = c.turns;
    endGame(s, log);
  } else {
    const stage = stageForTurn(s, s.turn);
    if (stage !== s.stage) {
      s.stage = stage;
      const discarded = market ? discardEarlierPiles(s) : [];
      log.push({ type: 'stage', stage, discarded });
    }
  }
  return { state: s, log };
}

// ---------- end of game ----------

export function endGame(s, log) {
  const c = cfg(s);
  const objectives = evaluateObjectives(s);
  const bonus = objectives.filter((o) => o.met).length * c.objectiveBonus;
  let gdpTotal = round1(s.gdpEarned - s.eventDamage);
  const cf = { actual: s.cf.actual, noNature: s.cf.noNature, without: { ...s.cf.without } };
  let endMultiplier = 1;
  if (c.happinessMode === 'endGame') {
    endMultiplier = happinessMultiplier(s, s.happiness);
    gdpTotal = round1(gdpTotal * endMultiplier);
    // Counterfactuals use the happiness each would have had on the final board.
    const noNatureH = happiness(s, () => emptyServices()).H;
    cf.actual = round1(cf.actual * endMultiplier);
    cf.noNature = round1(cf.noNature * happinessMultiplier(s, noNatureH));
    for (const k of SERVICE_KEYS) {
      const h = happiness(s, (cell) => ({ ...cell.received, [k]: 0 })).H;
      cf.without[k] = round1(cf.without[k] * happinessMultiplier(s, h));
    }
  }
  const score = round1(gdpTotal + bonus);
  const natureContribution = round1(cf.actual - cf.noNature);
  const perService = Object.fromEntries(SERVICE_KEYS.map((k) => [k, round1(cf.actual - cf.without[k])]));
  s.score = score;
  s.gameOver = true;
  s.final = {
    score,
    gdp: round1(s.gdpEarned * endMultiplier),
    gdpAfterDamage: gdpTotal,
    eventDamage: s.eventDamage,
    endMultiplier,
    objectives: objectives.map((o) => ({ ...o, bonus: o.met ? c.objectiveBonus : 0 })),
    objectiveBonus: bonus,
    natureContribution,
    natureShare: cf.actual > 0 ? natureContribution / cf.actual : 0,
    perService,
    damageAvoided: s.stats.eventDamageAvoided,
    eventHits: s.stats.eventHits,
    startIntactness: s.stats.startIntactness,
    endIntactness: intactness(s),
    primaryLost: s.stats.primaryLost,
    seed: s.seed
  };
  log.push({ type: 'gameOver', final: s.final });
}

