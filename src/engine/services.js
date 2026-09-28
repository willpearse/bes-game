// Service supply and services received (section 9, steps 6 and 7).
import { CONFIG } from '../data/config.js';
import { SERVICE_KEYS } from '../data/services.js';
import { HABITATS } from '../data/habitats.js';
import { BUILDINGS, BUILDING_SERVICES } from '../data/buildings.js';
import { ortho, isBuilt } from './grid.js';
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

export function cellSupply(cell) {
  const base = baseServices(cell);
  const out = emptyServices();
  if (!base) return out;
  const B = cellB(cell);
  for (const k of SERVICE_KEYS) out[k] = round3(base[k] * B);
  return out;
}

// Step 6.
export function computeSupply(state) {
  for (const cell of state.cells) {
    cell.B = cellB(cell);
    cell.supply = cellSupply(cell);
  }
}

// Services received: the sum of the supply of the four touching cells (N, E, S, W), capped.
export function receivedAt(state, row, col) {
  const out = emptyServices();
  for (const k of SERVICE_KEYS) {
    let sum = 0;
    for (const c of ortho(state, row, col)) sum += c.supply[k];
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

// The touching cell (N, E, S, W) that contributes most of service s to (row, col).
export function topContributor(state, row, col, s) {
  let best = null;
  for (const c of ortho(state, row, col)) {
    if (c.supply[s] > 0 && (best === null || c.supply[s] > best.supply[s])) best = c;
  }
  return best;
}

// Nature at work: for each built tile and each service it uses, the cell that supplies most of it.
// Returns up to `max` deliveries, spread across services and tiles (round-robin), in a stable order.
export function deliveries(state, max = Infinity) {
  const byService = {};
  for (const cell of state.cells) {
    if (!isBuilt(cell)) continue;
    for (const s of BUILDINGS[cell.building].uses ?? []) {
      if ((cell.received?.[s] ?? 0) <= 0) continue;
      const src = topContributor(state, cell.row, cell.col, s);
      if (!src) continue;
      (byService[s] = byService[s] ?? []).push({
        service: s, from: { row: src.row, col: src.col }, to: { row: cell.row, col: cell.col }, amount: cell.received[s]
      });
    }
  }
  const queues = SERVICE_KEYS.map((k) => byService[k] ?? []);
  const out = [];
  for (let i = 0; out.length < max && queues.some((q) => i < q.length); i++) {
    for (const q of queues) if (i < q.length && out.length < max) out.push(q[i]);
  }
  return out;
}
