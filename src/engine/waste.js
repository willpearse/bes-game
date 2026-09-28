// Waste (section 10): token mode with downhill flow, or simple mode.
import { CONFIG } from '../data/config.js';
import { HABITATS } from '../data/habitats.js';
import { BUILDINGS } from '../data/buildings.js';
import { cellAt, idx, ortho, isBuilt, isNature, isMarine, round1 } from './grid.js';
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

// Clean capacity of a nature land cell (not river, lake or sea): its water service supply, rounded
// (CONFIG.cleanRounding 0.5 rounds to the nearest whole token, 0 rounds down).
// Worn or young habitat has a lower B, so it supplies less and cleans less.
export function cleanCapacity(cell, state = null) {
  if (!isNature(cell)) return 0;
  const h = HABITATS[cell.habitat];
  if (h.marine || h.water) return 0;
  const c = state ? cfg(state) : CONFIG;
  return Math.floor(Math.round((h.services.WAT * cellB(cell) + c.cleanRounding) * 1000) / 1000);
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
// floor(WAT received / wasteAbsorbDivisor); the rest is released: it is billed and becomes tokens that flow downhill.
// Returns a Map from cell index to { made, absorbed, released }.
export function wasteRelease(state, recv = defaultRecv) {
  const c = cfg(state);
  const out = new Map();
  for (const cell of state.cells) {
    if (!isBuilt(cell)) continue;
    const made = BUILDINGS[cell.building].waste;
    const absorbed = Math.min(made, Math.floor((recv(cell)?.WAT ?? 0) / c.wasteAbsorbDivisor));
    out.set(idx(state, cell.row, cell.col), { made, absorbed, released: made - absorbed });
  }
  return out;
}

// The waste bill per released token: dearer as water pollution becomes chronic, up to a cap.
export function wasteBillRate(state) {
  const c = cfg(state);
  return Math.min(c.wasteBillMax, c.wasteBillPerToken + Math.floor(state.pollution / c.wasteBillPollutionStep));
}

// Step 10 in token mode. Mutates state, pushes to log.
export function resolveWasteTokens(state, log) {
  const c = cfg(state);
  const record = { produced: 0, absorbed: 0, cleaned: 0, released: 0, moves: [], toSea: 0, toLake: 0 };

  // 1. Produce: only released waste becomes tokens (the rest was soaked up at source).
  const release = wasteRelease(state);
  for (const [i, r] of release) {
    state.cells[i].waste += r.released;
    record.produced += r.made;
    record.absorbed += r.absorbed;
    record.released += r.released;
  }

  // 2. Clean: each nature land cell cleans its own cell, then river cells N, E, S, W of it,
  // up to its capacity for the turn. It cleans again after each move, so waste flowing past is caught too.
  const capLeft = state.cells.map((cell) => cleanCapacity(cell, state));
  const cleanPass = () => {
    state.cells.forEach((cell, i) => {
      for (const t of [cell, ...ortho(state, cell.row, cell.col).filter(isRiver)]) {
        if (capLeft[i] <= 0) break;
        const r = removeFrom(t, capLeft[i]);
        capLeft[i] -= r;
        record.cleaned += r;
      }
    });
  };
  cleanPass();
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
    cleanPass();
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
  for (const cell of state.cells) capacity += cleanCapacity(cell, state);
  const toSea = Math.max(0, released - capacity);
  state.pollution += toSea;
  const record = { produced, absorbed: produced - released, cleaned: Math.min(released, capacity), released, moves: [], toSea, toLake: 0 };
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
