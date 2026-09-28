import { describe, it, expect } from 'vitest';
import { tinyGame, at } from './helpers.js';
import { resolveWasteTokens, resolveWasteSimple, flowTarget, cleanCapacity, wasteTokensAt, resolveWaste } from '../src/engine/waste.js';
import { placeBuilding, recompute } from '../src/engine/state.js';
import { takeTurn } from '../src/engine/actions.js';

describe('waste movement', () => {
  it('moves to the lowest lower neighbour, tie-break N, E, S, W', () => {
    const s = tinyGame(['bbb', 'bbb', 'bbb'], { elevation: [[9, 3, 9], [3, 5, 3], [9, 3, 9]] });
    expect(flowTarget(s, at(s, 1, 1))).toBe(at(s, 0, 1)); // all equal: N
    at(s, 0, 1).elevation = 4;
    expect(flowTarget(s, at(s, 1, 1))).toBe(at(s, 1, 2)); // E beats S and W
    at(s, 1, 2).elevation = 4;
    expect(flowTarget(s, at(s, 1, 1))).toBe(at(s, 2, 1)); // S beats W
    at(s, 1, 0).elevation = 1;
    expect(flowTarget(s, at(s, 1, 1))).toBe(at(s, 1, 0)); // strictly lowest wins
    at(s, 0, 1).elevation = 9; at(s, 1, 2).elevation = 9; at(s, 2, 1).elevation = 9; at(s, 1, 0).elevation = 5;
    expect(flowTarget(s, at(s, 1, 1))).toBeNull(); // equal is not lower
  });
  it('moves all tokens simultaneously by one step on land', () => {
    const s = tinyGame(['bbbb'], { elevation: [[8, 6, 4, 2]] });
    at(s, 0, 0).waste = 2;
    at(s, 0, 1).waste = 1;
    const rec = resolveWasteTokens(s, []);
    expect(at(s, 0, 0).waste).toBe(0);
    expect(at(s, 0, 1).waste).toBe(2);
    expect(at(s, 0, 2).waste).toBe(1);
    expect(rec.moves).toHaveLength(2);
  });
  it('river tokens keep moving up to 3 steps', () => {
    const s = tinyGame(['rrrrrr'], { elevation: [[10, 9, 8, 7, 6, 5]] });
    at(s, 0, 0).waste = 1;
    resolveWasteTokens(s, []);
    expect(at(s, 0, 3).waste).toBe(1);
    resolveWasteTokens(s, []);
    expect(at(s, 0, 5).waste).toBe(1); // stops at the end: no lower neighbour
  });
  it('land tokens entering a river continue downstream in the same turn', () => {
    const s = tinyGame(['brrrr'], { elevation: [[12, 10, 9, 8, 7]] });
    at(s, 0, 0).waste = 1;
    resolveWasteTokens(s, []);
    expect(at(s, 0, 3).waste).toBe(1); // 3 steps: land->r1->r2->r3
  });
  it('tokens that leave the river stop', () => {
    const s = tinyGame(['rrbb'], { elevation: [[10, 9, 8, 7]] });
    at(s, 0, 0).waste = 1;
    resolveWasteTokens(s, []);
    expect(at(s, 0, 2).waste).toBe(1);
  });
  it('sinks: sea and lake cells both add to water pollution', () => {
    const s = tinyGame(['bro', 'blb'], { elevation: [[5, 3, 0], [5, 2, 5]] });
    at(s, 0, 0).waste = 2; // -> river (0,1) -> lake (1,1) at elevation 2 vs sea 0: sea is E
    const rec = resolveWasteTokens(s, []);
    expect(s.pollution).toBe(1.8); // 2, less 10% that disperses
    expect(rec.toSea).toBe(2);
    const s2 = tinyGame(['bl'], { elevation: [[5, 2]] });
    at(s2, 0, 0).waste = 3;
    const rec2 = resolveWasteTokens(s2, []);
    expect(s2.pollution).toBe(2.7);
    expect(rec2.toLake).toBe(3);
    expect(at(s2, 0, 1).waste).toBe(0);
  });
  it('nature cells clean their own cell, then touching river cells', () => {
    const s = tinyGame(['frs', 'brb'], { elevation: [[9, 9, 9], [9, 9, 9]] });
    at(s, 0, 1).waste = 5;
    at(s, 1, 1).waste = 5;
    const rec = resolveWasteTokens(s, []);
    expect(at(s, 0, 1).waste).toBe(0); // fen and saltmarsh remove up to 3 each
    expect(at(s, 1, 1).waste).toBe(5); // bare ground cleans nothing
    expect(rec.cleaned).toBe(5);
    const s2 = tinyGame(['fr'], { elevation: [[9, 9]] });
    at(s2, 0, 0).waste = 1;
    at(s2, 0, 1).waste = 5;
    resolveWasteTokens(s2, []);
    expect(at(s2, 0, 0).waste).toBe(0); // own cell first
    expect(at(s2, 0, 1).waste).toBe(3);
  });
  it('riverbank nature also cleans waste flowing past, within its capacity for the turn', () => {
    const s = tinyGame(['br', 'fr', 'br', 'br', 'oo'], { elevation: [[20, 9], [20, 8], [20, 7], [20, 6], [0, 0]] });
    at(s, 0, 1).waste = 4; // above the fen: it flows past the fen this turn
    const rec = resolveWasteTokens(s, []);
    expect(rec.cleaned).toBe(3); // the fen's full capacity, used once
    expect(s.cells.reduce((a, c) => a + c.waste, 0)).toBe(1);
  });
  it('clean capacity is the water supply rounded, so it falls with B', () => {
    const s = tinyGame(['f'], { elevation: [[5]] });
    expect(cleanCapacity(at(s, 0, 0))).toBe(3); // 3 * 0.9 = 2.7
    at(s, 0, 0).intensity = 'intense';
    expect(cleanCapacity(at(s, 0, 0))).toBe(2); // 3 * 0.65 = 1.95
    expect(cleanCapacity(tinyGame(['w']).cells[0])).toBe(2); // 2 * 0.9
    expect(cleanCapacity(tinyGame(['g']).cells[0])).toBe(1); // 1 * 0.9
    const down = tinyGame(['g'], { config: { cleanRounding: 0 } });
    expect(cleanCapacity(down.cells[0], down)).toBe(0); // rounded down
    expect(cleanCapacity(tinyGame(['P']).cells[0])).toBe(3); // primary peat 3 * 1.0
    expect(cleanCapacity(tinyGame(['r']).cells[0])).toBe(0); // rivers do not clean
    at(s, 0, 0).waste = 4;
    resolveWasteTokens(s, []);
    expect(at(s, 0, 0).waste).toBe(2); // worn fen cleans 2
    const m = tinyGame(['m']);
    m.cells[0].intensity = 'intense';
    expect(cleanCapacity(m.cells[0])).toBe(1); // 1 * 0.65
    expect(cleanCapacity(tinyGame(['b']).cells[0])).toBe(0); // bare ground
    const sea = tinyGame(['o']);
    expect(cleanCapacity(sea.cells[0])).toBe(0);
  });
  it('built tiles release the waste touching nature cannot soak up', () => {
    const s = tinyGame(['mmm', 'mmm'], { elevation: [[5, 5, 5], [5, 5, 5]] });
    placeBuilding(at(s, 1, 1), 'factory'); // 3 waste; moorland WAT 0.8 x 3 = 2.4 soaks up 1
    recompute(s);
    const rec = resolveWasteTokens(s, []);
    expect(rec).toMatchObject({ produced: 3, absorbed: 1, released: 2 });
    expect(at(s, 1, 1).waste).toBe(2);
  });
  it('water pollution falls by 0.5 per healthy seagrass cell, then 10% disperses', () => {
    const s = tinyGame(['zzo']);
    s.pollution = 3;
    resolveWasteTokens(s, []);
    expect(s.pollution).toBe(1.8); // (3 - 0.5 * 2) * 0.9
    at(s, 0, 0).intensity = 'intense';
    resolveWasteTokens(s, []);
    expect(s.pollution).toBe(1.2); // (1.8 - 0.5) * 0.9 = 1.17
    s.pollution = 0.2;
    resolveWasteTokens(s, []);
    expect(s.pollution).toBe(0);
  });
  it('a village drains into the river and waits there if the river cannot flow', () => {
    let s = tinyGame(['b#rb'], { elevation: [[9, 7, 5, 9]] });
    s = takeTurn(s, { type: 'pass' }).state;
    expect(at(s, 0, 1).waste).toBe(0);
    expect(at(s, 0, 2).waste).toBe(1);
  });
});

describe('simple waste mode', () => {
  it('counts one token within 1 of a polluting tile', () => {
    const s = tinyGame(['bbbbb'], { config: { wasteMode: 'simple' } });
    placeBuilding(at(s, 0, 1), 'factory');
    expect(wasteTokensAt(s, at(s, 0, 0))).toBe(1);
    expect(wasteTokensAt(s, at(s, 0, 1))).toBe(1);
    expect(wasteTokensAt(s, at(s, 0, 2))).toBe(1);
    expect(wasteTokensAt(s, at(s, 0, 3))).toBe(0);
  });
  it('raises water pollution by uncleaned waste, then recovers', () => {
    const s = tinyGame(['bbzz'], { config: { wasteMode: 'simple' } });
    placeBuilding(at(s, 0, 0), 'factory'); // 3 waste; moorland cleans 0
    recompute(s);
    const rec = resolveWasteSimple(s, []);
    expect(rec.toSea).toBe(3);
    expect(s.pollution).toBe(1.8); // (3 - 0.5 * 2 seagrass) * 0.9
    const s2 = tinyGame(['#ff'], { config: { wasteMode: 'simple' } });
    resolveWaste(s2, []);
    expect(s2.pollution).toBe(0); // fens clean 4 > 1
  });
});
