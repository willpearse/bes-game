import { describe, it, expect } from 'vitest';
import { tinyGame, at } from './helpers.js';
import { resolveWasteTokens, resolveWasteSimple, flowTarget, cleanCapacity, wasteTokensAt, resolveWaste } from '../src/engine/waste.js';
import { placeBuilding, recompute } from '../src/engine/state.js';
import { takeTurn } from '../src/engine/actions.js';

describe('waste movement', () => {
  it('moves to the lowest lower neighbour, tie-break N, E, S, W', () => {
    const s = tinyGame(['mmm', 'mmm', 'mmm'], { elevation: [[9, 3, 9], [3, 5, 3], [9, 3, 9]] });
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
    const s = tinyGame(['mmmm'], { elevation: [[8, 6, 4, 2]] });
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
    const s = tinyGame(['mrrrr'], { elevation: [[12, 10, 9, 8, 7]] });
    at(s, 0, 0).waste = 1;
    resolveWasteTokens(s, []);
    expect(at(s, 0, 3).waste).toBe(1); // 3 steps: land->r1->r2->r3
  });
  it('tokens that leave the river stop', () => {
    const s = tinyGame(['rrmm'], { elevation: [[10, 9, 8, 7]] });
    at(s, 0, 0).waste = 1;
    resolveWasteTokens(s, []);
    expect(at(s, 0, 2).waste).toBe(1);
  });
  it('sinks: marine cells add to sea pollution, lakes to lake pollution', () => {
    const s = tinyGame(['mro', 'mlm'], { elevation: [[5, 3, 0], [5, 2, 5]] });
    at(s, 0, 0).waste = 2; // -> river (0,1) -> lake (1,1) at elevation 2 vs sea 0: sea is E
    const rec = resolveWasteTokens(s, []);
    expect(s.seaPollution).toBe(2);
    expect(rec.toSea).toBe(2);
    const s2 = tinyGame(['ml'], { elevation: [[5, 2]] });
    at(s2, 0, 0).waste = 3;
    resolveWasteTokens(s2, []);
    expect(at(s2, 0, 1).lakePollution).toBe(3);
    expect(at(s2, 0, 1).waste).toBe(0);
  });
  it('riparian buffer: fen and saltmarsh clean adjacent river cells', () => {
    const s = tinyGame(['frs', 'mrm'], { elevation: [[9, 9, 9], [9, 9, 9]] });
    at(s, 0, 1).waste = 5;
    at(s, 1, 1).waste = 5;
    const rec = resolveWasteTokens(s, []);
    expect(at(s, 0, 1).waste).toBe(3); // fen and saltmarsh each remove 1
    expect(at(s, 1, 1).waste).toBe(5); // moorland does not
    expect(rec.riparian).toBe(2);
  });
  it('nature cells clean their own tokens, minus 1 at intense', () => {
    const s = tinyGame(['f'], { elevation: [[5]] });
    expect(cleanCapacity(at(s, 0, 0))).toBe(2);
    at(s, 0, 0).intensity = 'intense';
    expect(cleanCapacity(at(s, 0, 0))).toBe(1);
    at(s, 0, 0).waste = 4;
    resolveWasteTokens(s, []);
    expect(at(s, 0, 0).waste).toBe(3);
    const m = tinyGame(['m']);
    m.cells[0].intensity = 'intense';
    expect(cleanCapacity(m.cells[0])).toBe(0);
    const sea = tinyGame(['o']);
    expect(cleanCapacity(sea.cells[0])).toBe(0);
  });
  it('built tiles produce waste; recycling centres remove up to 3', () => {
    const s = tinyGame(['mRm', 'mmm'], { buildings: { R: 'recycling' }, elevation: [[5, 5, 5], [5, 5, 5]] });
    placeBuilding(at(s, 1, 1), 'factory'); // 3 waste
    at(s, 0, 0).waste = 2;
    const rec = resolveWasteTokens(s, []);
    expect(rec.produced).toBe(3);
    expect(rec.recycled).toBe(3);
    expect(at(s, 1, 1).waste).toBe(0);
    expect(at(s, 0, 0).waste).toBe(2); // not orthogonal to the centre
  });
  it('sea recovers 0.5 per healthy seagrass cell', () => {
    const s = tinyGame(['zzo']);
    s.seaPollution = 3;
    resolveWasteTokens(s, []);
    expect(s.seaPollution).toBe(2);
    at(s, 0, 0).intensity = 'intense';
    resolveWasteTokens(s, []);
    expect(s.seaPollution).toBe(1.5);
    s.seaPollution = 0.2;
    resolveWasteTokens(s, []);
    expect(s.seaPollution).toBe(0);
  });
  it('a village drains into the river and waits there if the river cannot flow', () => {
    let s = tinyGame(['g#rg'], { elevation: [[9, 7, 5, 9]] });
    s = takeTurn(s, { type: 'pass' }).state;
    expect(at(s, 0, 1).waste).toBe(0);
    expect(at(s, 0, 2).waste).toBe(1);
  });
});

describe('simple waste mode', () => {
  it('counts one token within 1 of a polluting tile', () => {
    const s = tinyGame(['ggggg'], { config: { wasteMode: 'simple' } });
    placeBuilding(at(s, 0, 1), 'factory');
    expect(wasteTokensAt(s, at(s, 0, 0))).toBe(1);
    expect(wasteTokensAt(s, at(s, 0, 1))).toBe(1);
    expect(wasteTokensAt(s, at(s, 0, 2))).toBe(1);
    expect(wasteTokensAt(s, at(s, 0, 3))).toBe(0);
  });
  it('raises sea pollution by uncleaned waste, then recovers', () => {
    const s = tinyGame(['mmzz'], { config: { wasteMode: 'simple' } });
    placeBuilding(at(s, 0, 0), 'factory'); // 3 waste; moorland cleans 0
    recompute(s);
    const rec = resolveWasteSimple(s, []);
    expect(rec.toSea).toBe(3);
    expect(s.seaPollution).toBe(2); // 3 - 0.5 * 2 seagrass
    const s2 = tinyGame(['#ff'], { config: { wasteMode: 'simple' } });
    resolveWaste(s2, []);
    expect(s2.seaPollution).toBe(0); // fens clean 4 > 1
  });
});
