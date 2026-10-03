// Little Green: game state. Pure JS, no Phaser. State is plain JSON and never mutated after creation.
import { LITTLE_CONFIG } from '../data/config.js';
import { ANIMALS } from '../data/pieces.js';
import GARDEN from '../data/garden.json' with { type: 'json' };
import { seedToInt, shuffle } from '../../engine/rng.js';

const ORTHO = [[-1, 0], [0, 1], [1, 0], [0, -1]]; // N, E, S, W

export function cellAt(state, row, col) {
  if (row < 0 || col < 0 || row >= state.height || col >= state.width) return null;
  return state.cells[row * state.width + col];
}

// The four squares touching a square (N, E, S, W).
export function touching(state, row, col) {
  const out = [];
  for (const [dr, dc] of ORTHO) {
    const c = cellAt(state, row + dr, col + dc);
    if (c) out.push(c);
  }
  return out;
}

export function touches(state, cell, piece) {
  return touching(state, cell.row, cell.col).filter((c) => c.piece === piece);
}

export function touchesStream(state, cell) {
  return touching(state, cell.row, cell.col).filter((c) => c.ground === 'stream');
}

export function cellsWith(state, piece) {
  return state.cells.filter((c) => c.piece === piece);
}

function parseGarden(garden) {
  const cells = [];
  let duck = null;
  garden.rows.forEach((line, row) => {
    [...line].forEach((ch, col) => {
      const stream = ch === 's' || ch === 'D';
      if (ch === 'D') duck = { row, col };
      cells.push({ row, col, ground: stream ? 'stream' : 'grass', piece: ch === 'H' ? 'house' : null, fruit: 0, hot: false });
    });
  });
  return { width: garden.rows[0].length, height: garden.rows.length, cells, duck };
}

// The visitors for a whole game: the first asks for CONFIG.firstVisitor, the rest are shuffled.
function makeVisitors(state, config) {
  const pieces = [];
  for (const [piece, n] of Object.entries(config.visitors)) for (let i = 0; i < n; i++) pieces.push(piece);
  const first = pieces.indexOf(config.firstVisitor);
  if (first >= 0) pieces.splice(first, 1);
  const order = first >= 0 ? [config.firstVisitor, ...shuffle(state, pieces)] : shuffle(state, pieces);
  let animals = [];
  return order.slice(0, config.turns).map((piece) => {
    if (animals.length === 0) animals = shuffle(state, ANIMALS);
    return { piece, animal: animals.pop() };
  });
}

export function createGame({ seed = 1, garden = GARDEN, config = LITTLE_CONFIG } = {}) {
  const { width, height, cells, duck } = parseGarden(garden);
  const state = {
    seed,
    rng: seedToInt(seed),
    config,
    width,
    height,
    cells,
    duck,
    turn: 1,
    step: 'visitor',     // 'visitor' (place their piece), 'nature' (choose and place one), 'over'
    visitors: [],
    streamMuck: 0,
    basket: 0,
    heatwaves: [],       // { turn, cool, hot } for each heatwave so far
    stars: null
  };
  state.visitors = makeVisitors(state, config);
  return state;
}

export function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

export function visitor(state) {
  return state.step === 'over' ? null : state.visitors[state.turn - 1];
}

export function isHeatwaveTurn(state, turn = state.turn) {
  return state.config.heatwaveTurns.includes(turn);
}

export function streamIsClean(state) {
  return state.streamMuck <= state.config.cleanStreamMax;
}
