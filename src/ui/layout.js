// Screen layout constants (1280x720 logical).
export const W = 1280;
export const H = 720;
export const TILE = 48;          // 16 px sprites at x3
export const BOARD_X = 48;
export const BOARD_Y = 96;
export const BOARD_SIZE = 480;
export const RIGHT_X = 560;
export const RIGHT_W = 700;
export const TOP_H = 78;
export const BOTTOM_Y = 664;

export const cellToXY = (row, col) => ({ x: BOARD_X + col * TILE, y: BOARD_Y + row * TILE });
export const cellCentre = (row, col) => ({ x: BOARD_X + col * TILE + TILE / 2, y: BOARD_Y + row * TILE + TILE / 2 });
