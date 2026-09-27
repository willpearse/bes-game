// Waste (section 10): token mode with downhill flow, or simple mode.
import { CONFIG } from '../data/config.js';
import { HABITATS, RIPARIAN_HABITATS, RIPARIAN_CLEAN } from '../data/habitats.js';
import { BUILDINGS } from '../data/buildings.js';
import { cellAt, idx, ortho, isBuilt, isNature, isMarine, building, round1 } from './grid.js';

const cfg = (state) => state.config ?? CONFIG;

// Effective waste tokens on a cell, for all effects.
// Simple mode: a cell counts as holding one token if it is within 1 of (or is) a tile with waste > 0.
export function wasteTokensAt(state, cell) {
  if (cfg(state).wasteMode !== 'simple') return cell.waste;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const c = cellAt(state, cell.row + dr, cell.col + dc);
      if (c && isBuilt(c) && BUILDINGS[c.building].waste > 0) return 1;
    }
  }
  return 0;
}

// Clean capacity of a nature land cell: habitat cleans, minus 1 at intense use.
export function cleanCapacity(cell) {
  if (!isNature(cell)) return 0;
  const h = HABITATS[cell.habitat];
  if (h.cleans == null) return 0;
  return Math.max(0, h.cleans - (cell.intensity === 'intense' ? 1 : 0));
}

function removeFrom(cell, n) {
  const removed = Math.min(cell.waste, n);
  cell.waste -= removed;
  return removed;
}

// Lowest orthogonal neighbour strictly lower than the cell, tie-break N, E, S, W.
export function flowTarget(state, cell) {
  let best = null;
  for (const n of ortho(state, cell.row, cell.col)) {
    if (n.elevation < cell.elevation && (best === null || n.elevation < best.elevation)) best = n;
  }
  return best;
}

function isRiver(cell) {
  return cell.habitat === 'river';
}

function isSink(cell) {
  return isMarine(cell) || cell.habitat === 'lake';
}

// Step 10 in token mode. Mutates state, pushes to log.
export function resolveWasteTokens(state, log) {
  const c = cfg(state);
  const record = { produced: 0, cleaned: 0, recycled: 0, riparian: 0, moves: [], toSea: 0, toLake: 0 };

  // 1. Produce.
  for (const cell of state.cells) {
    if (isBuilt(cell)) {
      const w = BUILDINGS[cell.building].waste;
      cell.waste += w;
      record.produced += w;
    }
  }

  // 2. Clean: nature land cells, then riparian buffers, then recycling centres.
  for (const cell of state.cells) {
    const cap = cleanCapacity(cell);
    if (cap > 0) record.cleaned += removeFrom(cell, cap);
  }
  for (const cell of state.cells) {
    if (isNature(cell) && RIPARIAN_HABITATS.includes(cell.habitat)) {
      for (const n of ortho(state, cell.row, cell.col)) {
        if (isRiver(n)) record.riparian += removeFrom(n, RIPARIAN_CLEAN);
      }
    }
  }
  for (const cell of state.cells) {
    const b = building(cell);
    if (b && b.recycles) {
      let left = b.recycles;
      for (const t of [cell, ...ortho(state, cell.row, cell.col)]) {
        if (left <= 0) break;
        const r = removeFrom(t, left);
        left -= r;
        record.recycled += r;
      }
    }
  }

  // 3-4. Move simultaneously, with river tokens continuing up to riverMaxSteps. Sinks absorb.
  for (let step = 1; step <= c.riverMaxSteps; step++) {
    const delta = new Array(state.cells.length).fill(0);
    let moved = false;
    for (const cell of state.cells) {
      if (cell.waste <= 0) continue;
      if (step > 1 && !isRiver(cell)) continue;
      const target = flowTarget(state, cell);
      if (!target) continue;
      const n = cell.waste;
      delta[idx(state, cell.row, cell.col)] -= n;
      delta[idx(state, target.row, target.col)] += n;
      record.moves.push({ step, from: { row: cell.row, col: cell.col }, to: { row: target.row, col: target.col }, count: n });
      moved = true;
    }
    if (!moved) break;
    for (let i = 0; i < delta.length; i++) state.cells[i].waste += delta[i];
    // Sinks: tokens entering marine or lake cells are removed.
    for (const cell of state.cells) {
      if (cell.waste > 0 && isSink(cell)) {
        if (isMarine(cell)) {
          state.seaPollution += cell.waste;
          record.toSea += cell.waste;
        } else {
          cell.lakePollution = (cell.lakePollution ?? 0) + cell.waste;
          record.toLake += cell.waste;
        }
        cell.waste = 0;
      }
    }
  }

  seaRecovery(state, record);
  log.push({ type: 'waste', ...record });
  return record;
}

// Step 10 in simple mode.
export function resolveWasteSimple(state, log) {
  let produced = 0;
  let capacity = 0;
  for (const cell of state.cells) {
    if (isBuilt(cell)) {
      const b = BUILDINGS[cell.building];
      produced += b.waste;
      capacity += b.recycles ?? 0;
    } else {
      capacity += cleanCapacity(cell);
    }
  }
  const toSea = Math.max(0, produced - capacity);
  state.seaPollution += toSea;
  const record = { produced, cleaned: Math.min(produced, capacity), recycled: 0, riparian: 0, moves: [], toSea, toLake: 0 };
  seaRecovery(state, record);
  log.push({ type: 'waste', ...record });
  return record;
}

function seaRecovery(state, record) {
  const c = cfg(state);
  const healthy = state.cells.filter((x) => isNature(x) && x.habitat === 'seagrass' && x.intensity !== 'intense').length;
  const before = state.seaPollution;
  state.seaPollution = round1(Math.max(0, state.seaPollution - c.seaRecoveryPerSeagrass * healthy));
  record.seaRecovered = round1(before - state.seaPollution);
}

export function resolveWaste(state, log) {
  return cfg(state).wasteMode === 'simple' ? resolveWasteSimple(state, log) : resolveWasteTokens(state, log);
}
