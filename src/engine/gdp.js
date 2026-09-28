// GDP and counterfactuals (section 9, step 9, and section 13).
import { CONFIG } from '../data/config.js';
import { BUILDINGS, FARM_WASTE_GDP_PENALTY } from '../data/buildings.js';
import { SERVICE_KEYS } from '../data/services.js';
import { within, idx, isBuilt, isMarine, isResidential, isFarm, round1 } from './grid.js';
import { wasteTokensAt, wasteRelease, wasteBillRate } from './waste.js';
import { happiness, totalResidents } from './happiness.js';
import { emptyServices } from './services.js';

const cfg = (state) => state.config ?? CONFIG;
const defaultRecv = (cell) => cell.received;
const isWaterSink = (c) => isMarine(c) || c.habitat === 'lake';

// Income of one built tile this turn, before the happiness multiplier and waste bill. Never below 0.
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
    if (applies) v -= Math.min(g.pollutionPenalty.max ?? Infinity, Math.floor(state.pollution / g.pollutionPenalty.divisor));
  }
  if (isFarm(cell)) v -= FARM_WASTE_GDP_PENALTY * wasteTokensAt(state, cell);
  return Math.max(0, v);
}

// Food made by one built tile this turn (farms and fishing fleets).
export function tileFood(cell, recv = defaultRecv) {
  const f = BUILDINGS[cell.building].food;
  if (!f) return 0;
  let v = f.base;
  if (f.serviceBonus) v += Math.floor((recv(cell)?.[f.serviceBonus.service] ?? 0) / f.serviceBonus.divisor);
  return v;
}

// Food made, needed and bought in this turn. Residents eat foodPerResident each; any shortfall is bought in.
export function foodBalance(state, recv = defaultRecv) {
  const c = cfg(state);
  let made = 0;
  for (const cell of state.cells) if (isBuilt(cell)) made += tileFood(cell, recv);
  const need = totalResidents(state) * c.foodPerResident;
  const bought = Math.max(0, need - made);
  return { made, need, bought, cost: round1(bought * c.foodImportPrice) };
}

// Fertiliser bought by a farm with worn soil: fertiliserPerPoint for each point below soilMax.
export function fertiliser(state, cell) {
  const c = cfg(state);
  return cell.soil == null ? 0 : (c.soilMax - cell.soil) * c.fertiliserPerPoint;
}

// Running costs of one built tile this turn: its waste bill plus any fertiliser.
function tileCosts(state, cell, released) {
  return round1(released * wasteBillRate(state) + fertiliser(state, cell));
}

// Net GDP of one built tile this turn (income minus waste bill and fertiliser), before the happiness multiplier.
// Can be negative.
export function tileGdp(state, cell, recv = defaultRecv) {
  const r = wasteRelease(state, recv).get(idx(state, cell.row, cell.col));
  return round1(tileIncome(state, cell, recv) - tileCosts(state, cell, r.released));
}

export function happinessMultiplier(state, H) {
  const c = cfg(state);
  return 1 + c.happinessGdpFactor * (H - c.happinessNeutral);
}

// Projected GDP for the current board. Returns { raw, total, income, H, perTile, food, bill }.
// income is the sum of tile income before the happiness multiplier; bill sums waste bills and fertiliser.
// perTile: [{ cell, gdp, income, bill, released }], where gdp = income - bill.
// total = sum of income x happiness multiplier (perTurn mode) - bills - food bought.
// raw is the same without the multiplier.
export function projectGdp(state, recv = defaultRecv) {
  const c = cfg(state);
  const H = recv === defaultRecv ? state.happiness : happiness(state, recv).H;
  const mult = c.happinessMode === 'perTurn' ? happinessMultiplier(state, H) : 1;
  const release = wasteRelease(state, recv);
  const food = foodBalance(state, recv);
  let raw = -food.cost;
  let total = -food.cost;
  let bill = 0;
  let incomeSum = 0;
  const perTile = [];
  for (const cell of state.cells) {
    if (!isBuilt(cell)) continue;
    const income = tileIncome(state, cell, recv);
    const released = release.get(idx(state, cell.row, cell.col)).released;
    const b = tileCosts(state, cell, released);
    bill += b;
    incomeSum += income;
    raw += income - b;
    total += income * mult - b;
    perTile.push({ cell, gdp: income - b, income, bill: b, released });
  }
  return { raw: round1(raw), total: round1(total), income: incomeSum, H, perTile, food, bill: round1(bill) };
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
