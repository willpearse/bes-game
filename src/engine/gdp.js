// GDP and counterfactuals (section 9, step 9, and section 13).
import { CONFIG } from '../data/config.js';
import { BUILDINGS, FARM_WASTE_GDP_PENALTY } from '../data/buildings.js';
import { SERVICE_KEYS } from '../data/services.js';
import { within, isBuilt, isNature, isMarine, isResidential, isFarm, round1 } from './grid.js';
import { wasteTokensAt } from './waste.js';
import { happiness } from './happiness.js';
import { emptyServices } from './services.js';

const cfg = (state) => state.config ?? CONFIG;
const defaultRecv = (cell) => cell.received;

// GDP of one built tile this turn, before the happiness multiplier.
export function tileGdp(state, cell, recv = defaultRecv) {
  const b = BUILDINGS[cell.building];
  const g = b.gdp;
  const r = recv(cell);
  let v = g.base;
  if (g.serviceBonus) v += Math.floor(r[g.serviceBonus.service] / g.serviceBonus.divisor);
  if (g.nearbyResidential) {
    const n = within(state, cell.row, cell.col, g.nearbyResidential.radius).filter(isResidential).length;
    v += Math.min(n, g.nearbyResidential.max);
  }
  if (g.primaryBonus) {
    const near = within(state, cell.row, cell.col, g.primaryBonus.radius);
    if (near.some((c) => isNature(c) && c.landUse === 'primary')) v += g.primaryBonus.amount;
  }
  if (g.wastePenalty) {
    const near = within(state, cell.row, cell.col, g.wastePenalty.radius);
    if (near.some((c) => wasteTokensAt(state, c) > 0)) v -= g.wastePenalty.amount;
  }
  if (g.seagrassBonus) {
    const near = within(state, cell.row, cell.col, g.seagrassBonus.radius);
    const n = near.filter((c) => isNature(c) && c.habitat === 'seagrass' && c.intensity !== 'intense').length;
    v += Math.min(n, g.seagrassBonus.max);
  }
  if (g.seaPollutionPenalty) {
    const rad = g.seaPollutionPenalty.radius;
    const applies = rad == null || within(state, cell.row, cell.col, rad).some(isMarine);
    if (applies) v -= Math.floor(state.seaPollution / g.seaPollutionPenalty.divisor);
  }
  if (isFarm(cell)) v -= FARM_WASTE_GDP_PENALTY * wasteTokensAt(state, cell);
  return Math.max(0, v);
}

export function happinessMultiplier(state, H) {
  const c = cfg(state);
  return 1 + c.happinessGdpFactor * (H - c.happinessNeutral);
}

// Projected GDP for the current board. Returns { raw, total, H, perTile: [{cell, gdp}] }.
// raw is the sum of tile GDP; total applies the happiness multiplier in perTurn mode.
export function projectGdp(state, recv = defaultRecv) {
  const H = recv === defaultRecv ? state.happiness : happiness(state, recv).H;
  let raw = 0;
  const perTile = [];
  for (const cell of state.cells) {
    if (!isBuilt(cell)) continue;
    const g = tileGdp(state, cell, recv);
    raw += g;
    perTile.push({ cell, gdp: g });
  }
  const perTurn = cfg(state).happinessMode === 'perTurn';
  const total = round1(perTurn ? raw * happinessMultiplier(state, H) : raw);
  return { raw, total, H, perTile };
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
