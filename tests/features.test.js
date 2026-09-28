import { describe, it, expect } from 'vitest';
import { tinyGame, at } from './helpers.js';
import { placeBuilding, recompute, createGame } from '../src/engine/state.js';
import { takeTurn, legalTargets, preview } from '../src/engine/actions.js';
import { updateSoil, reserveProtected, updateIntensity } from '../src/engine/intensity.js';
import { tileGdp, fertiliser } from '../src/engine/gdp.js';
import { resolveEvent, tilesAtRisk, wreckTiles } from '../src/engine/events.js';
import { evaluateObjective } from '../src/engine/objectives.js';

const build = (s, r, c, b) => { placeBuilding(at(s, r, c), b); recompute(s); };

describe('bare ground', () => {
  it('is degraded (urban land use), buildable and restorable to woodland, meadow or wetland', () => {
    const s = tinyGame(['#br', 'bgg']);
    const bare = at(s, 0, 1);
    expect(bare.habitat).toBe('bare');
    expect(bare.landUse).toBe('urban');
    expect(bare.supply.GRN).toBeLessThan(0.5);
    expect(legalTargets(s, { type: 'build', building: 'cottages' }).some((t) => t.row === 0 && t.col === 1)).toBe(true);
    for (const r of ['plantWoodland', 'sowMeadow', 'restoreWetland']) {
      expect(legalTargets(s, { type: 'restore', restoration: r }).some((t) => t.row === 0 && t.col === 1)).toBe(true);
    }
    // Wetland needs water next to it; peat cannot be made from bare ground.
    expect(legalTargets(s, { type: 'restore', restoration: 'restoreWetland' }).some((t) => t.row === 1 && t.col === 0)).toBe(false);
    expect(legalTargets(s, { type: 'restore', restoration: 'rewetPeat' })).toHaveLength(0);
  });
  it('gives something from day one when restored', () => {
    const s = tinyGame(['#bg']);
    const p = preview(s, { type: 'restore', restoration: 'plantWoodland' }, 0, 1);
    expect(p.intactnessDelta).toBeGreaterThan(0);
    expect(p.happinessDelta).toBeGreaterThan(0);
  });
});

describe('the sea', () => {
  it('wind farms protect the sea squares touching them, like a reef', () => {
    const s = tinyGame(['ooooo', 'ooooo']);
    expect(reserveProtected(s, at(s, 0, 1))).toBe(false);
    build(s, 0, 2, 'windFarm');
    expect(reserveProtected(s, at(s, 0, 1))).toBe(true);
    expect(reserveProtected(s, at(s, 1, 2))).toBe(true);
    expect(reserveProtected(s, at(s, 1, 1))).toBe(false); // diagonal
    build(s, 0, 0, 'fishingFleet');
    updateIntensity(s);
    expect(at(s, 0, 1).intensity).toBe('minimal'); // the fleet's pressure is cancelled next to the reef
  });
  it('storm surges only put land tiles at risk', () => {
    const s = tinyGame(['#o', 'oo']);
    build(s, 1, 1, 'windFarm');
    const risk = tilesAtRisk(s, 'stormSurge').map((t) => t.cell.building);
    expect(risk).toEqual(['cottages']);
  });
});

describe('soil', () => {
  it('declines without water-holding nature touching the farm, recovers with it, and costs fertiliser', () => {
    const s = tinyGame(['oFo'], { buildings: { F: 'familyFarm' } });
    const farm = at(s, 0, 1);
    expect(farm.soil).toBe(3);
    expect(updateSoil(s)).toEqual([{ row: 0, col: 1, from: 3, to: 2 }]);
    updateSoil(s);
    expect(farm.soil).toBe(1);
    expect(fertiliser(s, farm)).toBe(2);
    const before = tileGdp(s, farm);
    farm.soil = 3;
    expect(tileGdp(s, farm)).toBe(before + 2);
    // With fens touching it (WAT >= 2) the soil recovers, up to 3.
    const wet = tinyGame(['fFf'], { buildings: { F: 'familyFarm' } });
    at(wet, 0, 1).soil = 1;
    updateSoil(wet);
    updateSoil(wet);
    updateSoil(wet);
    expect(at(wet, 0, 1).soil).toBe(3);
  });
  it('always declines on intensive farms, and only farms have soil', () => {
    const s = tinyGame(['fCf', 'f#f'], { buildings: { C: 'cluckTowers' } });
    updateSoil(s);
    expect(at(s, 0, 1).soil).toBe(2);
    expect(at(s, 1, 1).soil).toBeNull();
    expect(fertiliser(s, at(s, 1, 1))).toBe(0);
  });
  it('is updated each turn and logged, and cleared when a farm is restored', () => {
    let s = tinyGame(['#Fo'], { buildings: { F: 'familyFarm' }, config: { startingCash: 20 } });
    const r = takeTurn(s, { type: 'pass' });
    expect(r.log.find((l) => l.type === 'soil').changes[0].to).toBe(2);
    expect(r.state.stats.fertiliser).toBe(1);
    s = takeTurn(r.state, { type: 'restore', restoration: 'sowMeadow', row: 0, col: 1 }).state;
    expect(at(s, 0, 1).soil).toBeNull();
  });
});

describe('wrecked tiles', () => {
  function flood(rows) {
    const s = tinyGame(rows, { config: { startingCash: 50 } });
    s.events = [{ turn: 1, id: 'riverFlood' }];
    return s;
  }
  it('floods wreck 1 in 5 of the tiles they hit, most exposed first, leaving bare ground', () => {
    // Five cottages along a river, none protected: 5 x 0.2 = 1 is wrecked.
    const s = flood(['#####', 'rrrrr']);
    const rep = resolveEvent(s, 'riverFlood', []);
    expect(rep.hit).toHaveLength(5);
    expect(rep.destroyed).toHaveLength(1);
    const wrecked = at(s, rep.destroyed[0].row, rep.destroyed[0].col);
    expect(wrecked).toMatchObject({ kind: 'nature', habitat: 'bare', building: null, landUse: 'urban' });
    expect(s.stats.destroyed).toBe(1);
  });
  it('ranks by the shortfall of the protecting service, breaking ties with the seeded RNG', () => {
    const s = flood(['##']);
    const hit = [
      { row: 0, col: 0, name: 'A', value: 2.5, min: 3 },
      { row: 0, col: 1, name: 'B', value: 0, min: 3 },
      { row: 0, col: 0, name: 'C', value: 0, min: 3 },
      { row: 0, col: 1, name: 'D', value: 1, min: 3 },
      { row: 0, col: 0, name: 'E', value: 1, min: 3 }
    ];
    const a = tinyGame(['##']);
    const b = tinyGame(['##']);
    const pick = (st) => wreckTiles(st, hit.map((h) => ({ ...h })));
    const first = pick(a);
    expect(first).toHaveLength(1);
    expect(['B', 'C']).toContain(first[0].name); // the two with no protection at all
    expect(pick(b)).toEqual(first); // same seed, same choice
    expect(wreckTiles(s, hit.slice(0, 2))).toHaveLength(0); // 2 x 0.2 rounds to 0
  });
  it('heatwaves and pest outbreaks never wreck tiles, and the board is refreshed after a wreck', () => {
    const s = tinyGame(['#####', '#####']);
    s.events = [{ turn: 1, id: 'heatwave' }];
    const hot = takeTurn(s, { type: 'pass' });
    expect(hot.log.find((l) => l.type === 'event').destroyed).toEqual([]);
    const w = tinyGame(['#####', 'rrrrr'], { config: { startingCash: 50 } });
    w.events = [{ turn: 1, id: 'riverFlood' }];
    const { state } = takeTurn(w, { type: 'pass' });
    expect(state.residents).toBe(4); // one of five homes wrecked, and residents recomputed
  });
});

describe('new objectives', () => {
  it('forest school: a school with 2+ nature squares touching it', () => {
    const s = tinyGame(['#Sg', 'ggg'], { buildings: { S: 'school' } });
    expect(evaluateObjective(s, 'forestSchool')).toEqual({ met: true, progress: '2/2' });
    const t = tinyGame(['#S#'], { buildings: { S: 'school' } });
    expect(evaluateObjective(t, 'forestSchool').met).toBe(false);
    expect(evaluateObjective(tinyGame(['#g']), 'forestSchool').met).toBe(false); // no school
  });
  it('healthy town: every home within 4 of a hospital', () => {
    const s = tinyGame(['#gH#'], { buildings: { H: 'hospital' } });
    expect(evaluateObjective(s, 'healthyTown')).toEqual({ met: true, progress: '2/2' });
    const t = tinyGame(['#ggggH'], { buildings: { H: 'hospital' } });
    expect(evaluateObjective(t, 'healthyTown').met).toBe(false);
    expect(evaluateObjective(tinyGame(['ggH'], { buildings: { H: 'hospital' } }), 'healthyTown').met).toBe(false); // no homes
  });
  it('coast guard only counts land tiles', () => {
    const s = tinyGame(['s##s', 'ssss', 'oooo']);
    build(s, 2, 0, 'windFarm');
    expect(evaluateObjective(s, 'coastGuard').met).toBe(true);
  });
});

describe('medals', () => {
  const finish = (config, rows = ['#ff', 'fFf', 'fff']) => {
    let s = tinyGame(rows, { buildings: { F: 'familyFarm' }, config: { turns: 1, eventTurns: [], ...config } });
    s.objectives = [];
    return takeTurn(s, { type: 'pass' }).state.final;
  };
  it('bronze needs the housing target and everyone fed; silver adds objectives; gold adds the score', () => {
    expect(finish({ housingTarget: 1, goldScore: 1e6 }).medal).toBe('silver'); // no objectives chosen: all met
    expect(finish({ housingTarget: 1, goldScore: -100 }).medal).toBe('gold');
    expect(finish({ housingTarget: 5 }).medal).toBeNull();
    const hungry = finish({ housingTarget: 1 }, ['##g']);
    expect(hungry.medalChecks.fed).toBe(false);
    expect(hungry.medal).toBeNull();
  });
  it('bronze when an objective is missed', () => {
    let s = tinyGame(['#ff', 'fFf', 'fff'], { buildings: { F: 'familyFarm' }, config: { turns: 1, eventTurns: [], housingTarget: 1 } });
    s.objectives = ['forestSchool'];
    const f = takeTurn(s, { type: 'pass' }).state.final;
    expect(f.medal).toBe('bronze');
    expect(f.medalChecks).toMatchObject({ housing: true, fed: true, objectives: false });
  });
  it('maps set the gold score', () => {
    expect(createGame({ seed: 1 }).goldScore).toBeGreaterThan(0);
  });
});
