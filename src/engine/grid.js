// Grid helpers. Cells are stored row-major in state.cells.
import { HABITATS } from '../data/habitats.js';
import { BUILDINGS } from '../data/buildings.js';

export const ORTHO = [[-1, 0], [0, 1], [1, 0], [0, -1]]; // N, E, S, W

export function idx(state, row, col) {
  return row * state.width + col;
}

export function inBounds(state, row, col) {
  return row >= 0 && col >= 0 && row < state.height && col < state.width;
}

export function cellAt(state, row, col) {
  return inBounds(state, row, col) ? state.cells[idx(state, row, col)] : null;
}

// Cells within Chebyshev distance r, excluding the cell itself.
export function within(state, row, col, r) {
  const out = [];
  for (let dr = -r; dr <= r; dr++) {
    for (let dc = -r; dc <= r; dc++) {
      if (dr === 0 && dc === 0) continue;
      const c = cellAt(state, row + dr, col + dc);
      if (c) out.push(c);
    }
  }
  return out;
}

// Orthogonal neighbours in N, E, S, W order.
export function ortho(state, row, col) {
  const out = [];
  for (const [dr, dc] of ORTHO) {
    const c = cellAt(state, row + dr, col + dc);
    if (c) out.push(c);
  }
  return out;
}

export function isBuilt(cell) {
  return cell.kind === 'built';
}

export function isNature(cell) {
  return cell.kind === 'nature';
}

// Marine is a property of the ground: nature marine habitats, or built tiles placed on the sea.
export function isMarine(cell) {
  return HABITATS[cell.habitat]?.marine === true;
}

export function isLand(cell) {
  return !isMarine(cell);
}

export function building(cell) {
  return isBuilt(cell) ? BUILDINGS[cell.building] : null;
}

export function hasTag(cell, tag) {
  const b = building(cell);
  return !!b && b.tags.includes(tag);
}

export function isResidential(cell) {
  return hasTag(cell, 'residential');
}

export function isFarm(cell) {
  return hasTag(cell, 'farm');
}

export function cellName(cell) {
  return isBuilt(cell) ? BUILDINGS[cell.building].name : HABITATS[cell.habitat].name;
}

export function round1(x) {
  return Math.round(x * 10) / 10;
}
