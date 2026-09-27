import { createGame } from '../src/engine/state.js';
import { cellAt } from '../src/engine/grid.js';

// Builds a game on a small hand-made map. elevation is an array of number arrays (or omitted = all 5).
export function tinyGame(rows, { elevation, buildings = {}, config = {}, seed = 1 } = {}) {
  const height = rows.length;
  const width = rows[0].length;
  const map = {
    id: 'test', name: 'Test', width, height, rows,
    startingBuildings: { '#': 'cottages', ...buildings },
    startingBuildingHabitat: 'meadow',
    elevation: elevation ?? rows.map((r) => Array.from(r, () => 5))
  };
  return createGame({ map, seed, config: { marketMode: 'menu', ...config } });
}

export const at = (state, r, c) => cellAt(state, r, c);
