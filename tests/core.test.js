import { describe, it, expect } from 'vitest';
import { createGame, valleyElevation } from '../src/engine/state.js';
import { takeTurn, legalTargets } from '../src/engine/actions.js';
import { mulberry32, seedToInt, shuffle, random } from '../src/engine/rng.js';
import { intensityForPressure, biodiversityValue } from '../src/engine/intensity.js';
import { PREDICTS_B } from '../src/data/predicts.js';
import { counterfactualGdp, projectGdp } from '../src/engine/gdp.js';
import { cellAt } from '../src/engine/grid.js';
import { tinyGame } from './helpers.js';
import { CONFIG } from '../src/data/config.js';

describe('rng', () => {
  it('is deterministic for a seed', () => {
    const a = [];
    const b = [];
    let sa = 42;
    let sb = 42;
    for (let i = 0; i < 5; i++) {
      let v;
      [v, sa] = mulberry32(sa); a.push(v);
      [v, sb] = mulberry32(sb); b.push(v);
    }
    expect(a).toEqual(b);
    expect(new Set(a).size).toBe(5);
    a.forEach((v) => { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThan(1); });
  });
  it('hashes string seeds and shuffles without losing items', () => {
    expect(seedToInt('hello')).toBe(seedToInt('hello'));
    expect(seedToInt('hello')).not.toBe(seedToInt('world'));
    const st = { rng: 7 };
    const out = shuffle(st, [1, 2, 3, 4, 5, 6]);
    expect(out.slice().sort()).toEqual([1, 2, 3, 4, 5, 6]);
    expect(typeof random(st)).toBe('number');
  });
});

describe('createGame', () => {
  const s = createGame({ seed: 42 });
  it('loads the estuary map', () => {
    expect(s.width).toBe(10);
    expect(s.cells).toHaveLength(100);
    expect(cellAt(s, 0, 0).landUse).toBe('primary');
    expect(cellAt(s, 0, 2).landUse).toBe('matureSecondary');
    expect(cellAt(s, 0, 4).habitat).toBe('lake');
    expect(cellAt(s, 4, 5).kind).toBe('built');
    expect(cellAt(s, 4, 5).building).toBe('cottages');
    expect(cellAt(s, 4, 5).habitat).toBe('meadow');
  });
  it('uses the valley elevation formula', () => {
    expect(cellAt(s, 9, 0).elevation).toBe(0); // open sea
    expect(cellAt(s, 4, 4).elevation).toBe(5); // river: 9 - row
    expect(cellAt(s, 4, 5).elevation).toBe(7); // land: 9 - row + 2|col-4|
    expect(valleyElevation(0, 0, 'peat', 10)).toBe(17);
  });
  it('starts with cash, market, events and objectives', () => {
    expect(s.cash).toBe(10);
    expect(s.turn).toBe(1);
    expect(s.market.slots).toHaveLength(6);
    expect(s.market.piles.A).toHaveLength(16);
    expect(s.market.piles.B).toHaveLength(16);
    expect(s.market.piles.C).toHaveLength(16);
    expect(s.events.map((e) => e.turn)).toEqual([8, 16, 24]);
    expect(new Set(s.events.map((e) => e.id)).size).toBe(3);
    expect(s.objectives).toHaveLength(2);
  });
  it('runs intensity, services and happiness before turn 1', () => {
    const river = cellAt(s, 4, 4);
    expect(river.pressure).toBe(2); // two cottages within 1
    expect(river.intensity).toBe('light');
    expect(cellAt(s, 4, 5).received.GRN).toBeGreaterThan(0);
    expect(s.happiness).toBeGreaterThan(0);
    expect(s.residents).toBe(2);
    expect(s.stats.startIntactness).toBeGreaterThan(0.8);
  });
  it('JSON round-trips', () => {
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });
  it('picks a random seed when none is given', () => {
    const r = createGame({});
    expect(typeof r.seed).toBe('number');
  });
  it('rejects unknown maps', () => {
    expect(() => createGame({ mapId: 'nope', seed: 1 })).toThrow();
  });
});

describe('turn advance', () => {
  it('passing advances turns and ends after 24', () => {
    let s = createGame({ seed: 3 });
    for (let i = 0; i < 23; i++) s = takeTurn(s, { type: 'pass' }).state;
    expect(s.turn).toBe(24);
    expect(s.gameOver).toBe(false);
    const { state, log } = takeTurn(s, { type: 'pass' });
    expect(state.gameOver).toBe(true);
    expect(state.final).not.toBeNull();
    expect(log.some((l) => l.type === 'gameOver')).toBe(true);
    expect(() => takeTurn(state, { type: 'pass' })).toThrow();
    expect(legalTargets(state, { type: 'build', slot: 0 })).toEqual([]);
  });
  it('earns GDP into cash and score', () => {
    const s = createGame({ seed: 3 });
    const { state, log } = takeTurn(s, { type: 'pass' });
    const g = log.find((l) => l.type === 'gdp');
    expect(typeof g.total).toBe('number');
    expect(state.cash).toBeCloseTo(Math.max(0, 10 + g.total), 5);
    expect(state.score).toBeCloseTo(g.total, 5);
  });
  it('does not mutate its input', () => {
    const s = createGame({ seed: 3 });
    const copy = structuredClone(s);
    takeTurn(s, { type: 'pass' });
    expect(s).toEqual(copy);
  });
  it('rejects illegal and unknown actions', () => {
    const s = createGame({ seed: 3 });
    expect(() => takeTurn(s, { type: 'build', slot: 0, row: 0, col: 4 })).toThrow();
    expect(() => takeTurn(s, { type: 'dance' })).toThrow();
  });
});

describe('PREDICTS', () => {
  it('maps pressure to intensity', () => {
    expect(intensityForPressure(0)).toBe('minimal');
    expect(intensityForPressure(1)).toBe('light');
    expect(intensityForPressure(2)).toBe('light');
    expect(intensityForPressure(3)).toBe('intense');
    expect(intensityForPressure(9)).toBe('intense');
  });
  it('looks up B for every class and intensity', () => {
    const expected = {
      primary: [1.0, 0.9, 0.75], matureSecondary: [0.9, 0.8, 0.65], intermediateSecondary: [0.75, 0.65, 0.55],
      youngSecondary: [0.6, 0.5, 0.4], plantation: [0.55, 0.45, 0.35], pasture: [0.6, 0.5, 0.35],
      cropland: [0.5, 0.4, 0.25], urban: [0.4, 0.3, 0.15]
    };
    for (const [cls, vals] of Object.entries(expected)) {
      ['minimal', 'light', 'intense'].forEach((i, k) => expect(biodiversityValue(cls, i)).toBe(vals[k]));
    }
    expect(Object.keys(PREDICTS_B)).toHaveLength(8);
  });
});

describe('determinism and counterfactuals', () => {
  function play(seed) {
    let s = createGame({ seed });
    const logs = [];
    for (let t = 0; t < 24; t++) {
      let action = { type: 'pass' };
      for (let slot = 0; slot < 6; slot++) {
        const tg = legalTargets(s, { type: 'build', slot });
        if (tg.length) { action = { type: 'build', slot, ...tg[tg.length - 1] }; break; }
      }
      const r = takeTurn(s, action);
      s = r.state;
      logs.push(r.log);
    }
    return { s, logs };
  }
  it('same seed and actions give identical games', () => {
    const a = play(99);
    const b = play(99);
    expect(a.s).toEqual(b.s);
    expect(a.logs).toEqual(b.logs);
  });
  it('different seeds give different markets', () => {
    expect(createGame({ seed: 1 }).market).not.toEqual(createGame({ seed: 2 }).market);
  });
  it('noNature GDP is never greater than actual on the starting map', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const s = createGame({ seed });
      const actual = projectGdp(s).total;
      const cf = counterfactualGdp(s);
      expect(cf.noNature.total).toBeLessThanOrEqual(actual);
      for (const k of Object.keys(cf.without)) expect(cf.without[k].total).toBeLessThanOrEqual(actual);
    }
  });
  it('accumulated counterfactuals never exceed actual over a game', () => {
    const { s } = play(5);
    expect(s.cf.noNature).toBeLessThanOrEqual(s.cf.actual);
    expect(s.final.natureContribution).toBeGreaterThanOrEqual(0);
  });
});

describe('cloneState', () => {
  it('matches structuredClone and shares no mutable data', async () => {
    const { cloneState } = await import('../src/engine/actions.js');
    let s = createGame({ seed: 12 });
    for (let i = 0; i < 9; i++) s = takeTurn(s, { type: 'pass' }).state;
    const c = cloneState(s);
    expect(c).toEqual(structuredClone(s));
    c.cells[0].supply.POL = 99;
    c.market.piles.B.push('x');
    c.config.eventTurns.push(99);
    c.eventHistory[0].hit.push(1);
    expect(s.cells[0].supply.POL).not.toBe(99);
    expect(s.market.piles.B).not.toContain('x');
    expect(s.config.eventTurns).toHaveLength(3);
    expect(s.eventHistory[0].hit).not.toContain(1);
  });
});

describe('maps', () => {
  it('loads Mill valley with its own starting cash, housing target and buildings', () => {
    const s = createGame({ seed: 1, mapId: 'millValley' });
    expect(s.mapName).toBe('Mill valley');
    expect(s.cash).toBe(15);
    expect(s.housingTarget).toBe(30);
    expect(s.residents).toBeGreaterThan(10);
    const hill = s.cells.find((c) => c.building === 'hillFarm');
    expect(hill.habitat).toBe('moorland'); // { building, habitat } form of startingBuildings
    expect(s.cells.find((c) => c.building === 'factory')).toBeTruthy();
    // Explicit config still beats the map.
    expect(createGame({ seed: 1, mapId: 'millValley', config: { startingCash: 3, housingTarget: 7 } })).toMatchObject({ cash: 3, housingTarget: 7 });
  });
  it('plays a whole game on each map', () => {
    for (const mapId of ['estuary', 'millValley']) {
      let s = createGame({ seed: 2, mapId });
      while (!s.gameOver) s = takeTurn(s, { type: 'pass' }).state;
      expect(Number.isFinite(s.final.score)).toBe(true);
    }
  });
});

describe('map defaults', () => {
  it('uses the map values when the config is the full CONFIG (as the title screen passes it)', () => {
    const s = createGame({ seed: 1, config: { ...CONFIG, mapId: 'millValley' } });
    expect(s).toMatchObject({ cash: 15, housingTarget: 30 });
    const t = tinyGame(['#g']);
    expect(t).toMatchObject({ cash: 10, housingTarget: 16 }); // MAP_DEFAULTS for a map without its own
  });
});
