import { describe, it, expect } from 'vitest';
import { tinyGame, at } from './helpers.js';
import { resolveWasteTokens, cleanCapacity, residentsUpstream, overflow } from '../src/engine/waste.js';
import { placeBuilding, recompute } from '../src/engine/state.js';
import { takeTurn, legalTargets, canRestore, preview } from '../src/engine/actions.js';
import { resolveEvent, wreckTiles } from '../src/engine/events.js';
import { cellSupply } from '../src/engine/services.js';
import { tileGdp } from '../src/engine/gdp.js';

// A river running south to the sea, with bare ground (which cleans nothing) on its west bank.
const riverRows = ['br', 'br', 'br', 'br', 'br', 'oo'];
const riverElev = [[20, 9], [20, 8], [20, 7], [20, 6], [20, 5], [0, 0]];
const total = (s) => s.cells.reduce((a, c) => a + c.waste, 0);

describe('beaver dams', () => {
  it('can only go on a river square without a dam or a building', () => {
    const s = tinyGame(['#r', 'gr'], { elevation: [[9, 5], [9, 4]] });
    const act = { type: 'restore', restoration: 'beaverDam' };
    expect(legalTargets(s, act)).toEqual([{ row: 0, col: 1 }, { row: 1, col: 1 }]);
    const t = takeTurn(s, { ...act, row: 0, col: 1 }).state;
    expect(at(t, 0, 1).dam).toBe(true);
    expect(at(t, 0, 1).habitat).toBe('river');
    expect(canRestore(t, 'beaverDam', at(t, 0, 1))).toBe(false);
    placeBuilding(at(t, 1, 1), 'sewageWorks');
    expect(canRestore(t, 'beaverDam', at(t, 1, 1))).toBe(false);
  });
  it('adds water service to the river square and cleans waste', () => {
    const s = tinyGame(['r']);
    expect(cellSupply(at(s, 0, 0)).WAT).toBe(0);
    expect(cleanCapacity(at(s, 0, 0))).toBe(0);
    at(s, 0, 0).dam = true;
    expect(cellSupply(at(s, 0, 0)).WAT).toBeGreaterThan(1.5);
    expect(cleanCapacity(at(s, 0, 0))).toBe(3); // 3 * 0.9, rounded
  });
  it('holds waste flowing down until the next turn, cleaning it', () => {
    const s = tinyGame(riverRows, { elevation: riverElev });
    at(s, 2, 1).dam = true;
    at(s, 0, 1).waste = 5;
    const rec = resolveWasteTokens(s, []);
    // 5 flow down, 3 are cleaned at the dam, 2 wait there.
    expect(rec.toSea).toBe(0);
    expect(rec.cleaned).toBe(3);
    expect(at(s, 2, 1).waste).toBe(2);
    const rec2 = resolveWasteTokens(s, []);
    expect(rec2.cleaned).toBe(2);
    expect(total(s)).toBe(0);
    // Without the dam, all 5 reach the sea within two turns.
    const n = tinyGame(riverRows, { elevation: riverElev });
    at(n, 0, 1).waste = 5;
    resolveWasteTokens(n, []);
    const r2 = resolveWasteTokens(n, []);
    expect(r2.toSea).toBe(5);
  });
  it('a dam is not a habitat change, so it never costs ancient habitat', () => {
    const s = tinyGame(['#R'], { elevation: [[9, 5]] });
    const p = preview(s, { type: 'restore', restoration: 'beaverDam' }, 0, 1, { grown: true });
    expect(p.warnings).toEqual([]);
  });
});

describe('sewage works', () => {
  it('goes on an undammed river square and costs its upkeep every turn', () => {
    const s = tinyGame(['#r', 'gr'], { elevation: [[9, 5], [9, 4]] });
    at(s, 1, 1).dam = true;
    expect(legalTargets(s, { type: 'build', building: 'sewageWorks' })).toEqual([{ row: 0, col: 1 }]);
    const t = takeTurn({ ...s, cash: 20 }, { type: 'build', building: 'sewageWorks', row: 0, col: 1 }).state;
    expect(at(t, 0, 1).building).toBe('sewageWorks');
    expect(tileGdp(t, at(t, 0, 1))).toBe(-2);
    expect(t.stats.upkeep).toBe(2);
  });
  it('catches the waste flowing down, holds it in its tank and treats some each turn', () => {
    const s = tinyGame(riverRows, { elevation: riverElev, config: { sewageTreatPerTurn: 4 } });
    placeBuilding(at(s, 3, 1), 'sewageWorks');
    at(s, 0, 1).waste = 10;
    const rec = resolveWasteTokens(s, []);
    expect(rec.toSea).toBe(0);
    expect(rec.treated).toBe(4);
    expect(at(s, 3, 1).tank).toBe(6);
    expect(at(s, 3, 1).waste).toBe(0);
    resolveWasteTokens(s, []);
    expect(at(s, 3, 1).tank).toBe(2);
  });
  it('overflows when too many residents drain through it', () => {
    const rows = ['#r', '#r', 'br', 'br', 'oo'];
    const elevation = [[12, 9], [11, 8], [20, 7], [20, 6], [0, 0]];
    const s = tinyGame(rows, { elevation, buildings: { '#': 'towerBlock' }, config: { sewageResidentsMax: 4 } });
    const w = at(s, 2, 1);
    placeBuilding(w, 'sewageWorks');
    expect(residentsUpstream(s, w)).toBe(8);
    w.tank = 5;
    const rec = resolveWasteTokens(s, []);
    // The tower blocks' own waste reaches the works this turn too, so the tank holds more than 5 when it overflows.
    expect(rec.overflows).toHaveLength(1);
    expect(rec.overflows[0]).toMatchObject({ row: 2, col: 1, reason: 'homes', upstream: 8 });
    expect(rec.overflows[0].count).toBeGreaterThanOrEqual(5);
    expect(w.tank).toBe(0);
    expect(at(s, 3, 1).waste).toBe(rec.overflows[0].count); // dumped just downstream
    expect(rec.treated).toBe(0);
  });
  it('overflows in a river flood', () => {
    const s = tinyGame(['br', 'br', 'oo'], { elevation: [[20, 9], [20, 8], [0, 0]] });
    const w = at(s, 0, 1);
    placeBuilding(w, 'sewageWorks');
    w.tank = 7;
    recompute(s);
    const report = resolveEvent(s, 'riverFlood', []);
    expect(report.overflows).toEqual([{ row: 0, col: 1, count: 7, reason: 'flood' }]);
    expect(at(s, 1, 1).waste).toBe(7);
  });
  it('a wrecked works leaves the river as it was', () => {
    const s = tinyGame(['br', 'br', 'oo'], { elevation: [[20, 9], [20, 8], [0, 0]] });
    const w = at(s, 0, 1);
    placeBuilding(w, 'sewageWorks');
    w.tank = 2;
    wreckTiles({ ...s, config: { ...s.config, eventDestroyShare: 1 } }, [{ row: 0, col: 1, min: 3, value: 0 }]);
    expect(w.kind).toBe('nature');
    expect(w.habitat).toBe('river');
    expect(w.tank).toBe(0);
  });
  it('overflow into the sea adds to water pollution', () => {
    const s = tinyGame(['r', 'o'], { elevation: [[5], [0]] });
    const w = at(s, 0, 0);
    placeBuilding(w, 'sewageWorks');
    w.tank = 3;
    expect(overflow(s, w)).toBe(3);
    expect(s.pollution).toBe(3);
    expect(overflow(s, w)).toBe(0);
  });
});
