// Waste (section 10): token mode with downhill flow, or simple mode.
import { CONFIG } from '../data/config.js';
import { HABITATS } from '../data/habitats.js';
import { BUILDINGS } from '../data/buildings.js';
import { cellAt, idx, ortho, isBuilt, isNature, isMarine, building, round1 } from './grid.js';
import { cellB } from './intensity.js';

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

// Clean capacity of a nature land cell (not river, lake or sea): its water service supply, rounded down.
// Worn or young habitat has a lower B, so it supplies less and cleans less.
export function cleanCapacity(cell) {
  if (!isNature(cell)) return 0;
  const h = HABITATS[cell.habitat];
  if (h.marine || h.water) return 0;
  return Math.floor(Math.round(h.services.WAT * cellB(cell) * 1000) / 1000);
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

const defaultRecv = (cell) => cell.received;

// What happens to each built tile's waste this turn. Nature touching the tile soaks up
// floor(WAT received / wasteAbsorbDivisor); then touching recycling centres (in row order, N, E, S, W)
// soak up to their capacity. The rest is released: it is billed and becomes tokens that flow downhill.
// Returns a Map from cell index to { made, absorbed, recycled, released }, plus spare recycling
// capacity per recycling centre under the key `spare` (a Map from cell index to capacity left).
export function wasteRelease(state, recv = defaultRecv) {
  const c = cfg(state);
  const out = new Map();
  for (const cell of state.cells) {
    if (!isBuilt(cell)) continue;
    const made = BUILDINGS[cell.building].waste;
    const absorbed = Math.min(made, Math.floor((recv(cell)?.WAT ?? 0) / c.wasteAbsorbDivisor));
    out.set(idx(state, cell.row, cell.col), { made, absorbed, recycled: 0, released: made - absorbed });
  }
  const spare = new Map();
  for (const cell of state.cells) {
    const b = building(cell);
    if (!b || !b.recycles) continue;
    let left = b.recycles;
    for (const n of ortho(state, cell.row, cell.col)) {
      const r = out.get(idx(state, n.row, n.col));
      if (!r || left <= 0) continue;
      const take = Math.min(left, r.released);
      r.recycled += take;
      r.released -= take;
      left -= take;
    }
    spare.set(idx(state, cell.row, cell.col), left);
  }
  out.spare = spare;
  return out;
}

// Step 10 in token mode. Mutates state, pushes to log.
export function resolveWasteTokens(state, log) {
  const c = cfg(state);
  const record = { produced: 0, absorbed: 0, cleaned: 0, recycled: 0, released: 0, moves: [], toSea: 0, toLake: 0 };

  // 1. Produce: only released waste becomes tokens (the rest was soaked up at source).
  const release = wasteRelease(state);
  for (const [i, r] of release) {
    state.cells[i].waste += r.released;
    record.produced += r.made;
    record.absorbed += r.absorbed;
    record.recycled += r.recycled;
    record.released += r.released;
  }

  // 2. Clean: each nature land cell cleans its own cell, then river cells N, E, S, W of it,
  // up to its capacity. Then recycling centres use any spare capacity on their own and touching squares.
  for (const cell of state.cells) {
    let left = cleanCapacity(cell);
    for (const t of [cell, ...ortho(state, cell.row, cell.col).filter(isRiver)]) {
      if (left <= 0) break;
      const r = removeFrom(t, left);
      left -= r;
      record.cleaned += r;
    }
  }
  for (const cell of state.cells) {
    const b = building(cell);
    if (b && b.recycles) {
      let left = release.spare.get(idx(state, cell.row, cell.col)) ?? 0;
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
    // Sinks: tokens entering marine or lake cells become water pollution.
    for (const cell of state.cells) {
      if (cell.waste > 0 && isSink(cell)) {
        state.pollution += cell.waste;
        if (isMarine(cell)) record.toSea += cell.waste;
        else record.toLake += cell.waste;
        cell.waste = 0;
      }
    }
  }

  seaRecovery(state, record);
  log.push({ type: 'waste', ...record });
  return record;
}

// Step 10 in simple mode: released waste beyond the land's total cleaning capacity goes straight to water.
export function resolveWasteSimple(state, log) {
  let produced = 0;
  let released = 0;
  let capacity = 0;
  for (const r of wasteRelease(state).values()) {
    produced += r.made;
    released += r.released;
  }
  for (const cell of state.cells) capacity += cleanCapacity(cell);
  const toSea = Math.max(0, released - capacity);
  state.pollution += toSea;
  const record = { produced, absorbed: produced - released, cleaned: Math.min(released, capacity), recycled: 0, released, moves: [], toSea, toLake: 0 };
  seaRecovery(state, record);
  log.push({ type: 'waste', ...record });
  return record;
}

function seaRecovery(state, record) {
  const c = cfg(state);
  const healthy = state.cells.filter((x) => isNature(x) && x.habitat === 'seagrass' && x.intensity !== 'intense').length;
  const before = state.pollution;
  const afterSeagrass = Math.max(0, state.pollution - c.pollutionRecoveryPerSeagrass * healthy);
  state.pollution = round1(afterSeagrass * (1 - c.pollutionDecay));
  record.recovered = round1(before - state.pollution);
}

export function resolveWaste(state, log) {
  return cfg(state).wasteMode === 'simple' ? resolveWasteSimple(state, log) : resolveWasteTokens(state, log);
}
