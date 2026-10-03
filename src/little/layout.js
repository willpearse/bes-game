// Little Green screen layout (1280x720 logical, drawn at RES like the main game).
export { W, H, RES, setupCamera, logicalPointer } from '../ui/layout.js';

export const TILE = 128;
export const BOARD_X = 24;
export const BOARD_Y = 168;
export const PANEL_X = 1072;   // right-hand column: visitor, then the three nature cards
export const PANEL_W = 192;
export const VISITOR_Y = 16;
export const VISITOR_H = 220;
export const CARD_Y = 252;
export const CARD_H = 140;
export const CARD_GAP = 12;

export const cellCentre = (row, col) => ({ x: BOARD_X + col * TILE + TILE / 2, y: BOARD_Y + row * TILE + TILE / 2 });

export function cellUnder(state, x, y) {
  const col = Math.floor((x - BOARD_X) / TILE);
  const row = Math.floor((y - BOARD_Y) / TILE);
  return row >= 0 && col >= 0 && row < state.height && col < state.width ? { row, col } : null;
}

export const cardBox = (i) => ({ x: PANEL_X, y: CARD_Y + i * (CARD_H + CARD_GAP), w: PANEL_W, h: CARD_H });

export const inBox = (b, x, y) => x >= b.x && y >= b.y && x < b.x + b.w && y < b.y + b.h;
