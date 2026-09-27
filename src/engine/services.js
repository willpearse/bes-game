// Service supply and services received (section 9, steps 6 and 7).
import { CONFIG } from '../data/config.js';
import { SERVICES, SERVICE_KEYS } from '../data/services.js';
import { HABITATS } from '../data/habitats.js';
import { BUILDING_SERVICES } from '../data/buildings.js';
import { within, isBuilt } from './grid.js';
import { cellB } from './intensity.js';

const cfg = (state) => state.config ?? CONFIG;

// Rounding avoids floating-point noise at thresholds such as FLD >= 3.
function round3(x) {
  return Math.round(x * 1000) / 1000;
}

export function emptyServices() {
  return Object.fromEntries(SERVICE_KEYS.map((k) => [k, 0]));
}

export function baseServices(cell) {
  if (isBuilt(cell)) return BUILDING_SERVICES[cell.building] ?? null;
  return HABITATS[cell.habitat].services;
}

export function cellSupply(state, cell) {
  const base = baseServices(cell);
  const out = emptyServices();
  if (!base) return out;
  const B = cellB(cell);
  let mult = 1;
  if (!isBuilt(cell) && cell.habitat === 'lake') {
    mult = Math.max(0, 1 - cfg(state).lakePollutionSupplyPenalty * (cell.lakePollution ?? 0));
  }
  for (const k of SERVICE_KEYS) out[k] = round3(base[k] * B * mult);
  return out;
}

// Step 6.
export function computeSupply(state) {
  for (const cell of state.cells) {
    cell.B = cellB(cell);
    cell.supply = cellSupply(state, cell);
  }
}

export function receivedAt(state, row, col) {
  const out = emptyServices();
  for (const k of SERVICE_KEYS) {
    let sum = 0;
    for (const c of within(state, row, col, SERVICES[k].radius)) sum += c.supply[k];
    out[k] = Math.min(cfg(state).serviceCap, round3(sum));
  }
  return out;
}

// Step 7.
export function computeReceived(state) {
  for (const cell of state.cells) {
    cell.received = isBuilt(cell) ? receivedAt(state, cell.row, cell.col) : null;
  }
}

// The cell within the service radius that contributes most of service s to (row, col).
export function topContributor(state, row, col, s) {
  let best = null;
  for (const c of within(state, row, col, SERVICES[s].radius)) {
    if (c.supply[s] > 0 && (best === null || c.supply[s] > best.supply[s])) best = c;
  }
  return best;
}
