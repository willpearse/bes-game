// Little Green: legal squares and taking a turn.
// takeTurn(state, action) returns { state, log } and never mutates its input.
// Actions: { row, col } to place the visitor's piece; { row, col, piece } to place a nature piece.
import { cellAt, cloneState, visitor, isHeatwaveTurn } from './state.js';
import { NATURE_PIECES } from '../data/pieces.js';
import { bees, muck, heatwave, stars } from './rules.js';

// Why a square cannot take a piece: null if it can, else 'stream', 'taken' or 'outside'.
export function blocked(state, row, col) {
  const c = cellAt(state, row, col);
  if (!c) return 'outside';
  if (c.ground === 'stream') return 'stream';
  if (c.piece) return 'taken';
  return null;
}

export function legalTargets(state) {
  if (state.step === 'over') return [];
  return state.cells.filter((c) => !blocked(state, c.row, c.col)).map((c) => [c.row, c.col]);
}

// The piece an action would place, or null if the action is not allowed.
export function pieceFor(state, action) {
  if (state.step === 'visitor') return visitor(state).piece;
  if (state.step === 'nature' && NATURE_PIECES.includes(action.piece)) return action.piece;
  return null;
}

export function takeTurn(state, action) {
  const piece = pieceFor(state, action);
  if (!piece) throw new Error(`Cannot place ${action.piece ?? 'that'} during the ${state.step} step`);
  const why = blocked(state, action.row, action.col);
  if (why) throw new Error(`Cannot place on ${action.row},${action.col}: ${why}`);

  const s = cloneState(state);
  const log = [];
  cellAt(s, action.row, action.col).piece = piece;
  log.push({ type: 'placed', piece, at: [action.row, action.col] });

  if (s.step === 'visitor') {
    s.step = 'nature';
    log.push({ type: 'pickNature' });
    return { state: s, log };
  }

  // End of the turn: houses recover from the last heatwave, then bees, mucky water and any heatwave.
  for (const c of s.cells) c.hot = false;
  bees(s, log);
  muck(s, log);
  heatwave(s, log);

  if (s.turn >= s.config.turns) {
    s.step = 'over';
    s.stars = stars(s);
    log.push({ type: 'over', stars: s.stars });
  } else {
    s.turn += 1;
    s.step = 'visitor';
    log.push({ type: 'visitor', turn: s.turn, ...visitor(s), heatwave: isHeatwaveTurn(s) });
  }
  return { state: s, log };
}
