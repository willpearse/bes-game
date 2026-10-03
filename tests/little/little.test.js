import { describe, it, expect } from 'vitest';
import { createGame, cellAt, visitor, streamIsClean, touching, cloneState } from '../../src/little/engine/state.js';
import { takeTurn, legalTargets, blocked } from '../../src/little/engine/turn.js';
import { needs, stars } from '../../src/little/engine/rules.js';
import { LITTLE_CONFIG } from '../../src/little/data/config.js';

const tiny = (rows, config = {}) => createGame({ seed: 3, garden: { rows }, config: { ...LITTLE_CONFIG, ...config } });

// Places pieces directly (for setting up a board); the engine never does this.
function put(state, list) {
  const s = cloneState(state);
  for (const [row, col, piece] of list) cellAt(s, row, col).piece = piece;
  return s;
}

describe('little: setup', () => {
  it('reads the default garden', () => {
    const s = createGame({ seed: 1 });
    expect(s.width).toBe(8);
    expect(s.height).toBe(4);
    expect(s.duck).toEqual({ row: 3, col: 2 });
    expect(cellAt(s, 1, 1).piece).toBe('house');
    expect(cellAt(s, 3, 0).ground).toBe('stream');
    expect(s.step).toBe('visitor');
  });

  it('gives a visitor per turn, the first asking for a veg patch', () => {
    const s = createGame({ seed: 7 });
    expect(s.visitors).toHaveLength(LITTLE_CONFIG.turns);
    expect(s.visitors[0].piece).toBe('veg');
    expect(s.visitors.filter((v) => v.piece === 'house')).toHaveLength(4);
    expect(visitor(s)).toEqual(s.visitors[0]);
  });

  it('is deterministic for a seed', () => {
    expect(createGame({ seed: 'abc' }).visitors).toEqual(createGame({ seed: 'abc' }).visitors);
  });

  it('shuffles every visitor when there is no fixed first one', () => {
    const s = tiny(['gg'], { firstVisitor: 'none', turns: 2, visitors: { house: 1, veg: 1 } });
    expect(s.visitors.map((v) => v.piece).sort()).toEqual(['house', 'veg']);
  });

  it('finds touching squares (N, E, S, W only)', () => {
    const s = tiny(['ggg', 'ggg', 'ggg']);
    expect(touching(s, 1, 1)).toHaveLength(4);
    expect(touching(s, 0, 0)).toHaveLength(2);
  });
});

describe('little: placing', () => {
  it('only allows empty grass', () => {
    const s = createGame({ seed: 1 });
    expect(blocked(s, 3, 0)).toBe('stream');
    expect(blocked(s, 1, 1)).toBe('taken');
    expect(blocked(s, 9, 9)).toBe('outside');
    expect(blocked(s, 0, 0)).toBeNull();
    expect(legalTargets(s)).toHaveLength(32 - 9 - 1);
    expect(() => takeTurn(s, { row: 3, col: 0 })).toThrow();
  });

  it('places the visitor piece, then a chosen nature piece', () => {
    const s0 = createGame({ seed: 1 });
    const { state: s1, log } = takeTurn(s0, { row: 0, col: 0 });
    expect(cellAt(s1, 0, 0).piece).toBe('veg');
    expect(cellAt(s0, 0, 0).piece).toBeNull(); // input not mutated
    expect(s1.step).toBe('nature');
    expect(log.map((e) => e.type)).toEqual(['placed', 'pickNature']);
    expect(() => takeTurn(s1, { row: 0, col: 1, piece: 'house' })).toThrow();
    const { state: s2, log: log2 } = takeTurn(s1, { row: 0, col: 1, piece: 'flowers' });
    expect(cellAt(s2, 0, 1).piece).toBe('flowers');
    expect(s2.turn).toBe(2);
    expect(s2.step).toBe('visitor');
    expect(log2.at(-1)).toMatchObject({ type: 'visitor', turn: 2 });
  });

  it('ends after the last turn with stars and allows nothing more', () => {
    let s = createGame({ seed: 4 });
    for (let t = 0; t < LITTLE_CONFIG.turns; t++) {
      let [r, c] = legalTargets(s)[0];
      s = takeTurn(s, { row: r, col: c }).state;
      [r, c] = legalTargets(s)[0];
      const out = takeTurn(s, { row: r, col: c, piece: 'tree' });
      s = out.state;
      if (t === LITTLE_CONFIG.turns - 1) expect(out.log.at(-1).type).toBe('over');
    }
    expect(s.step).toBe('over');
    expect(s.stars).toEqual(stars(s));
    expect(visitor(s)).toBeNull();
    expect(legalTargets(s)).toEqual([]);
    expect(() => takeTurn(s, { row: 0, col: 0, piece: 'tree' })).toThrow();
  });
});

describe('little: bees', () => {
  it('a veg patch touching flowers grows strawberries; one without gets no bees', () => {
    let s = tiny(['gggg', 'ssss'], { turns: 5, heatwaveTurns: [] });
    s = put(s, [[0, 3, 'veg']]);
    s = takeTurn(s, { row: 0, col: 0 }).state; // veg (first visitor)
    const { state, log } = takeTurn(s, { row: 0, col: 1, piece: 'flowers' });
    expect(log).toContainEqual({ type: 'bees', from: [0, 1], to: [0, 0], fruit: 1, basket: 1 });
    expect(log).toContainEqual({ type: 'noBees', at: [0, 3] });
    expect(cellAt(state, 0, 0).fruit).toBe(1);
    expect(state.basket).toBe(1);
  });

  it('caps the strawberries on one patch', () => {
    let s = tiny(['gggggg', 'ssssss'], { fruitMax: 1, heatwaveTurns: [], visitors: { veg: 8 } });
    s = takeTurn(s, { row: 0, col: 0 }).state;
    s = takeTurn(s, { row: 0, col: 1, piece: 'flowers' }).state;
    s = takeTurn(s, { row: 0, col: 2 }).state;
    s = takeTurn(s, { row: 0, col: 3, piece: 'tree' }).state;
    expect(cellAt(s, 0, 0).fruit).toBe(1);
    expect(s.basket).toBe(3); // the second patch also touches the flowers
  });
});

describe('little: mucky water', () => {
  it('reeds touching a house soak up its muck; otherwise it reaches the nearest stream square', () => {
    let s = tiny(['ggggg', 'ggggg', 'sssss'], { heatwaveTurns: [] });
    s = put(s, [[0, 0, 'house'], [0, 4, 'house']]);
    s = takeTurn(s, { row: 1, col: 2 }).state; // veg
    const { state, log } = takeTurn(s, { row: 0, col: 1, piece: 'reeds' });
    expect(log).toContainEqual({ type: 'soak', from: [0, 0], to: [0, 1] });
    expect(log).toContainEqual({ type: 'muck', from: [0, 4], to: [2, 4], stream: 1 });
    expect(state.streamMuck).toBe(1);
    expect(streamIsClean(state)).toBe(true);
  });

  it('reeds beside the stream clean it', () => {
    let s = tiny(['ggg', 'ggg', 'sss'], { heatwaveTurns: [] });
    s = put(s, [[0, 0, 'house'], [0, 2, 'house']]);
    s = takeTurn(s, { row: 0, col: 1 }).state; // veg
    const { state, log } = takeTurn(s, { row: 1, col: 1, piece: 'reeds' });
    expect(log.filter((e) => e.type === 'muck')).toHaveLength(2);
    expect(log).toContainEqual({ type: 'clean', from: [2, 1], to: [1, 1], stream: 1 });
    expect(state.streamMuck).toBe(1);
  });

  it('reeds have nothing to clean in a clean stream', () => {
    let s = tiny(['ggg', 'sss'], { heatwaveTurns: [] });
    s = takeTurn(s, { row: 0, col: 0 }).state;
    const { log } = takeTurn(s, { row: 0, col: 1, piece: 'reeds' });
    expect(log.some((e) => e.type === 'clean')).toBe(false);
  });
});

describe('little: heatwaves', () => {
  it('houses touching a tree stay cool; the rest get hot, then recover', () => {
    let s = tiny(['ggggg', 'ggggg', 'sssss'], { heatwaveTurns: [1] });
    s = put(s, [[0, 0, 'house'], [0, 4, 'house']]);
    s = takeTurn(s, { row: 0, col: 2 }).state; // veg
    const { state, log } = takeTurn(s, { row: 0, col: 1, piece: 'tree' });
    expect(log).toContainEqual({ type: 'heatwave', cool: [[0, 0]], hot: [[0, 4]] });
    expect(cellAt(state, 0, 4).hot).toBe(true);
    expect(state.heatwaves).toEqual([{ turn: 1, cool: 1, hot: 1 }]);
    const next = takeTurn(takeTurn(state, { row: 1, col: 0 }).state, { row: 1, col: 1, piece: 'flowers' });
    expect(cellAt(next.state, 0, 4).hot).toBe(false);
    expect(next.log.some((e) => e.type === 'heatwave')).toBe(false);
  });

  it('warns at the start of a heatwave turn', () => {
    let s = tiny(['ggggg', 'sssss'], { heatwaveTurns: [2] });
    s = takeTurn(s, { row: 0, col: 0 }).state;
    const { log } = takeTurn(s, { row: 0, col: 1, piece: 'flowers' });
    expect(log.at(-1)).toMatchObject({ type: 'visitor', turn: 2, heatwave: true });
  });
});

describe('little: needs and stars', () => {
  it('lists what houses and veg patches still want', () => {
    let s = tiny(['gggg', 'ssss'], { heatwaveTurns: [] });
    s = put(s, [[0, 0, 'veg'], [0, 3, 'house']]);
    expect(needs(s)).toEqual([
      { row: 0, col: 0, piece: 'veg', need: 'flowers' },
      { row: 0, col: 3, piece: 'house', need: 'reeds' },
      { row: 0, col: 3, piece: 'house', need: 'tree' }
    ]);
    const heat = { ...s, config: { ...s.config, heatwaveTurns: [1] } };
    expect(needs(heat).filter((n) => n.piece === 'house').map((n) => n.need)).toEqual(['tree', 'reeds']);
    s = put(s, [[0, 1, 'flowers'], [0, 2, 'tree']]);
    expect(needs(s)).toEqual([{ row: 0, col: 3, piece: 'house', need: 'reeds' }]);
  });

  it('gives a star for each lesson', () => {
    let s = tiny(['gggg', 'ssss'], { heatwaveTurns: [] });
    s = put(s, [[0, 0, 'veg'], [0, 1, 'flowers']]);
    expect(stars(s)).toEqual({ bee: true, water: true, cool: true });
    s = put(s, [[0, 3, 'veg']]);
    s.streamMuck = 5;
    s.heatwaves = [{ turn: 1, cool: 0, hot: 1 }];
    expect(stars(s)).toEqual({ bee: false, water: false, cool: false });
  });
});
