// GDP and counterfactuals (section 9, step 9, and section 13).
import { CONFIG } from '../data/config.js';
import { BUILDINGS, FARM_WASTE_GDP_PENALTY } from '../data/buildings.js';
import { SERVICE_KEYS } from '../data/services.js';
import { within, isBuilt, isMarine, isResidential, isFarm, round1 } from './grid.js';
import { wasteTokensAt } from './waste.js';
import { happiness } from './happiness.js';
import { emptyServices } from './services.js';

const cfg = (state) => state.config ?? CONFIG;
const defaultRecv = (cell) => cell.received;
const isWaterSink = (c) => isMarine(c) || c.habitat === 'lake';

// Income of one built tile this turn, before the happiness multiplier and upkeep. Never below 0.
export function tileIncome(state, cell, recv = defaultRecv) {
  const g = BUILDINGS[cell.building].gdp;
  const r = recv(cell);
  let v = g.base;
  if (g.serviceBonus) v += Math.floor(r[g.serviceBonus.service] / g.serviceBonus.divisor);
  if (g.nearbyResidential) {
    const n = within(state, cell.row, cell.col, g.nearbyResidential.radius).filter(isResidential).length;
    v += Math.min(n, g.nearbyResidential.max);
  }
  if (g.wastePenalty) {
    const near = within(state, cell.row, cell.col, g.wastePenalty.radius);
    if (near.some((c) => wasteTokensAt(state, c) > 0)) v -= g.wastePenalty.amount;
  }
  if (g.pollutionPenalty) {
    const rad = g.pollutionPenalty.radius;
    const applies = rad == null || within(state, cell.row, cell.col, rad).some(isWaterSink);
    if (applies) v -= Math.floor(state.pollution / g.pollutionPenalty.divisor);
  }
  if (isFarm(cell)) v -= FARM_WASTE_GDP_PENALTY * wasteTokensAt(state, cell);
  return Math.max(0, v);
}

export function upkeep(cell) {
  return BUILDINGS[cell.building].upkeep ?? 0;
}

// Net GDP of one built tile this turn (income minus upkeep), before the happiness multiplier. Can be negative.
export function tileGdp(state, cell, recv = defaultRecv) {
  return tileIncome(state, cell, recv) - upkeep(cell);
}

export function happinessMultiplier(state, H) {
  const c = cfg(state);
  return 1 + c.happinessGdpFactor * (H - c.happinessNeutral);
}

// Projected GDP for the current board. Returns { raw, total, H, perTile: [{ cell, gdp, income, upkeep }] }.
// raw is the sum of net tile GDP. total applies the happiness multiplier to income (not upkeep) in perTurn mode.
export function projectGdp(state, recv = defaultRecv) {
  const H = recv === defaultRecv ? state.happiness : happiness(state, recv).H;
  const perTurn = cfg(state).happinessMode === 'perTurn';
  const mult = perTurn ? happinessMultiplier(state, H) : 1;
  let raw = 0;
  let total = 0;
  const perTile = [];
  for (const cell of state.cells) {
    if (!isBuilt(cell)) continue;
    const income = tileIncome(state, cell, recv);
    const cost = upkeep(cell);
    raw += income - cost;
    total += income * mult - cost;
    perTile.push({ cell, gdp: income - cost, income, upkeep: cost });
  }
  return { raw, total: round1(total), H, perTile };
}

const zeroAll = () => emptyServices();

export function counterfactualGdp(state) {
  const noNature = projectGdp(state, zeroAll);
  const without = {};
  for (const s of SERVICE_KEYS) {
    without[s] = projectGdp(state, (cell) => ({ ...cell.received, [s]: 0 }));
  }
  return { noNature, without };
}
