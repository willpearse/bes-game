import { describe, it, expect } from 'vitest';
import { tinyGame, at } from './helpers.js';
import { createGame, placeBuilding, recompute, chooseObjectives } from '../src/engine/state.js';
import { takeTurn, legalTargets, preview, choiceCost, canAfford, canRestore } from '../src/engine/actions.js';
import { drawTile, updateMarket, menuUnlocked } from '../src/engine/market.js';
import { resolveEvent, tilesAtRisk, upcomingEvent, eventDamageFor } from '../src/engine/events.js';
import { evaluateObjective, evaluateObjectives } from '../src/engine/objectives.js';
import { tileGdp, projectGdp } from '../src/engine/gdp.js';
import { OBJECTIVES } from '../src/data/objectives.js';
import { BUILDINGS } from '../src/data/buildings.js';

const build = (s, r, c, b) => { placeBuilding(at(s, r, c), b); recompute(s); };

describe('market', () => {
  it('discards slot 0 and shifts when another slot is taken', () => {
    const s = createGame({ seed: 11 });
    const before = s.market.slots.slice();
    const next = s.market.piles.A.slice(0, 2);
    updateMarket(s, 3, []);
    expect(s.market.slots).toEqual([before[1], before[2], before[4], before[5], next[0], next[1]]);
  });
  it('only removes slot 0 when slot 0 is taken', () => {
    const s = createGame({ seed: 11 });
    const before = s.market.slots.slice();
    const next = s.market.piles.A[0];
    updateMarket(s, 0, []);
    expect(s.market.slots).toEqual([...before.slice(1), next]);
  });
  it('discards slot 0 on pass', () => {
    const s = createGame({ seed: 11 });
    const before = s.market.slots.slice();
    const t = takeTurn(s, { type: 'pass' }).state;
    expect(t.market.slots.slice(0, 5)).toEqual(before.slice(1));
  });
  it('charges the slot surcharge', () => {
    const s = createGame({ seed: 11 });
    s.cash = 100;
    expect(choiceCost(s, { type: 'restore', restoration: 'plantWoodland', slot: 5 })).toBe(4);
    const b = s.market.slots[2];
    expect(choiceCost(s, { type: 'build', slot: 2 })).toBe(BUILDINGS[b].cost + 1);
    expect(choiceCost(s, { type: 'pass' })).toBe(0);
    expect(choiceCost(s, { type: 'dance' })).toBeNull();
    s.market.slots[4] = null;
    expect(choiceCost(s, { type: 'restore', restoration: 'plantWoodland', slot: 4 })).toBeNull();
    expect(choiceCost(s, { type: 'build', slot: 4 })).toBeNull();
    expect(choiceCost(s, { type: 'restore', restoration: 'nope', slot: 0 })).toBeNull();
  });
  it('changes piles at turns 9 and 17', () => {
    let s = createGame({ seed: 11 });
    for (let i = 0; i < 8; i++) s = takeTurn(s, { type: 'pass' }).state;
    expect(s.turn).toBe(9);
    expect(s.stage).toBe('B');
    expect(s.market.piles.A).toHaveLength(0);
    expect(s.market.piles.B).toHaveLength(16);
    const nextB = s.market.piles.B[0];
    s = takeTurn(s, { type: 'pass' }).state;
    expect(s.market.slots[5]).toBe(nextB);
    for (let i = 0; i < 7; i++) s = takeTurn(s, { type: 'pass' }).state;
    expect(s.turn).toBe(17);
    expect(s.stage).toBe('C');
    expect(s.market.piles.B).toHaveLength(0);
    expect(s.market.piles.C).toHaveLength(16);
  });
  it('draws from the next pile when the current one runs out, else null', () => {
    const s = createGame({ seed: 11 });
    s.market.piles.A = [];
    const b0 = s.market.piles.B[0];
    expect(drawTile(s)).toBe(b0);
    s.market.piles.B = [];
    s.market.piles.C = [];
    expect(drawTile(s)).toBeNull();
    updateMarket(s, null, []);
    expect(s.market.slots[5]).toBeNull();
  });
  it('menu mode unlocks by stage', () => {
    const s = createGame({ seed: 1, config: { marketMode: 'menu' } });
    expect(s.market).toBeNull();
    expect(menuUnlocked(s)).toContain('cottages');
    expect(menuUnlocked(s)).not.toContain('factory');
    s.stage = 'B';
    expect(menuUnlocked(s)).toContain('factory');
    expect(menuUnlocked(s)).not.toContain('windFarm');
    s.stage = 'C';
    expect(menuUnlocked(s)).toContain('windFarm');
    s.stage = 'A';
    expect(choiceCost(s, { type: 'build', building: 'factory' })).toBeNull();
    expect(choiceCost(s, { type: 'restore', restoration: 'plantWoodland' })).toBe(1);
  });
});

describe('placement and restoration', () => {
  it('land tiles next to built only', () => {
    const s = createGame({ seed: 1, config: { marketMode: 'menu' } });
    const tg = legalTargets(s, { type: 'build', building: 'cottages' });
    // Orthogonal neighbours of the village at (4,5),(5,5), plus the squares across the river.
    const keys = tg.map((t) => `${t.row},${t.col}`).sort();
    expect(keys).toEqual(['3,5', '4,6', '5,6', '6,5', '4,3', '5,3'].sort());
  });
  it('hill farms go on moorland or heath anywhere', () => {
    const s = createGame({ seed: 1, config: { marketMode: 'menu' } });
    const tg = legalTargets(s, { type: 'build', building: 'hillFarm' });
    expect(tg.length).toBeGreaterThan(10);
    tg.forEach((t) => expect(['moorland', 'heath']).toContain(at(s, t.row, t.col).habitat));
  });
  it('sea tiles: fleets anywhere at sea, harbours next to built land', () => {
    const s = tinyGame(['#o', 'oo'], { config: { startingCash: 50 } });
    expect(legalTargets(s, { type: 'build', building: 'fishingFleet' })).toHaveLength(3);
    s.stage = 'B';
    const h = legalTargets(s, { type: 'build', building: 'harbour' });
    expect(h.map((t) => `${t.row},${t.col}`).sort()).toEqual(['0,1', '1,0']);
    // A fishing fleet does not count as a built neighbour.
    const s2 = tinyGame(['g', 'o'], { buildings: {}, config: { startingCash: 50 } });
    s2.cells[0].kind = 'nature';
    placeBuilding(at(s2, 1, 0), 'fishingFleet');
    expect(legalTargets(s2, { type: 'build', building: 'cottages' })).toHaveLength(0);
    // Cannot build on rivers, lakes, seagrass, or other built tiles.
    const s3 = tinyGame(['r#lz'], { config: { startingCash: 50 } });
    expect(legalTargets(s3, { type: 'build', building: 'conifer' })).toHaveLength(0);
  });
  it('returns nothing when unaffordable', () => {
    const s = createGame({ seed: 1, config: { marketMode: 'menu', startingCash: 1 } });
    expect(canAfford(s, { type: 'build', building: 'cottages' })).toBe(false);
    expect(legalTargets(s, { type: 'build', building: 'cottages' })).toEqual([]);
  });
  it('restoration targets', () => {
    const s = tinyGame(['gmhr', 'Fcop'], { buildings: { F: 'familyFarm', c: 'conifer' } });
    expect(canRestore(s, 'plantWoodland', at(s, 0, 0))).toBe(true);
    expect(canRestore(s, 'plantWoodland', at(s, 1, 0))).toBe(true);
    expect(canRestore(s, 'plantWoodland', at(s, 1, 3))).toBe(false);
    expect(canRestore(s, 'restoreWetland', at(s, 0, 0))).toBe(false); // not next to water
    expect(canRestore(s, 'sowMeadow', at(s, 1, 1))).toBe(true);
    expect(canRestore(s, 'sowMeadow', at(s, 0, 0))).toBe(false);
    expect(canRestore(s, 'rewetPeat', at(s, 0, 1))).toBe(true);
    expect(canRestore(s, 'marineReserve', at(s, 1, 2))).toBe(true);
    const w = tinyGame(['gr', 'Fr'], { buildings: { F: 'familyFarm' } });
    expect(canRestore(w, 'restoreWetland', at(w, 0, 0))).toBe(true);
    expect(canRestore(w, 'restoreWetland', at(w, 1, 0))).toBe(true);
  });
  it('restoring demolishes built tiles and resets to young secondary', () => {
    const s = tinyGame(['#Fr'], { buildings: { F: 'familyFarm' } });
    const { state, log } = takeTurn(s, { type: 'restore', restoration: 'restoreWetland', row: 0, col: 1 });
    const c = at(state, 0, 1);
    expect(c.kind).toBe('nature');
    expect(c.habitat).toBe('fen');
    expect(c.landUse).toBe('youngSecondary');
    expect(c.age).toBe(1); // aged once during this turn's succession step
    expect(log.some((l) => l.type === 'demolish')).toBe(true);
    expect(state.cash).toBe(Math.round((10 - 1 + log.find((l) => l.type === 'gdp').total) * 10) / 10);
  });
});

describe('preview', () => {
  it('reports GDP, services, intensity changes, happiness and warnings', () => {
    const s = createGame({ seed: 1, config: { marketMode: 'menu' } });
    const p = preview(s, { type: 'build', building: 'cottages' }, 3, 5);
    expect(p.gdp).toBe(1);
    expect(p.received.REC).toBeGreaterThan(0);
    expect(p.cost).toBe(2);
    expect(p.intensityChanges.length).toBeGreaterThan(0);
    expect(typeof p.happinessDelta).toBe('number');
    expect(p.gdpDelta).toBeGreaterThan(0);
    expect(p.sources.map((x) => x.service).sort()).toEqual(['AIR', 'REC', 'WAT']);
    const g = tinyGame(['#G']);
    const pw = preview(g, { type: 'build', building: 'cottages' }, 0, 1);
    expect(pw.warnings[0]).toMatch(/ancient habitat/);
    const pr = preview(g, { type: 'restore', restoration: 'plantWoodland' }, 0, 1);
    expect(pr.warnings[0]).toMatch(/ancient habitat/);
    expect(pr.received).toBeNull();
  });
  it('warns when nearby ancient habitat would be lost', () => {
    const s = tinyGame(['#GG'], { config: { startingCash: 50 } });
    at(s, 0, 2).waste = 1;
    s.stage = 'B';
    recompute(s);
    const p = preview(s, { type: 'build', building: 'factory' }, 0, 1);
    expect(p.warnings.some((w) => /nearby would be lost/.test(w))).toBe(true);
  });
});

describe('GDP formulas', () => {
  it('family farm earns 1 + floor(POL/2), minus waste', () => {
    const s = tinyGame(['ggg', 'gFg', 'ggg'], { buildings: { F: 'familyFarm' } });
    expect(at(s, 1, 1).received.POL).toBe(6);
    expect(tileGdp(s, at(s, 1, 1))).toBe(4);
    at(s, 1, 1).waste = 2;
    expect(tileGdp(s, at(s, 1, 1))).toBe(2);
    at(s, 1, 1).waste = 9;
    expect(tileGdp(s, at(s, 1, 1))).toBe(0);
  });
  it('business park counts residential tiles within 2, max +3', () => {
    const s = tinyGame(['##B##'], { buildings: { B: 'businessPark' } });
    expect(tileGdp(s, at(s, 0, 2))).toBe(5);
    const s2 = tinyGame(['#B'], { buildings: { B: 'businessPark' } });
    expect(tileGdp(s2, at(s2, 0, 1))).toBe(3);
  });
  it('holiday park: REC, primary, waste and sea pollution', () => {
    const s = tinyGame(['Gmm', 'mPm', 'mmo'], { buildings: { P: 'holidayPark' } });
    const c = at(s, 1, 1);
    const rec = Math.floor(c.received.REC / 2);
    expect(tileGdp(s, c)).toBe(1 + rec + 1);
    at(s, 0, 1).waste = 1;
    expect(tileGdp(s, c)).toBe(1 + rec + 1 - 2);
    s.seaPollution = 10;
    expect(tileGdp(s, c)).toBe(Math.max(0, 1 + rec + 1 - 2 - 2));
  });
  it('fishing fleet: seagrass within 2 not intense, max +3, minus sea pollution', () => {
    const s = tinyGame(['zzzzz', 'ooFoo'], { buildings: { F: 'fishingFleet' } });
    // Seagrass next to the fleet is under pressure 2 (light); none intense.
    expect(tileGdp(s, at(s, 1, 2))).toBe(4);
    s.seaPollution = 7;
    expect(tileGdp(s, at(s, 1, 2))).toBe(3);
    s.seaPollution = 30;
    expect(tileGdp(s, at(s, 1, 2))).toBe(0);
  });
  it('happiness multiplies GDP in perTurn mode but not endGame mode', () => {
    const s = tinyGame(['g#g']);
    const p = projectGdp(s);
    expect(p.total).toBeCloseTo(p.raw * (1 + 0.1 * (s.happiness - 5)), 1);
    s.config.happinessMode = 'endGame';
    expect(projectGdp(s).total).toBe(projectGdp(s).raw);
  });
});

describe('events', () => {
  function floodGame(rows, buildings = {}) {
    const s = tinyGame(rows, { buildings });
    s.events = [{ turn: 1, id: 'riverFlood' }];
    return s;
  }
  it('hits unprotected tiles for max(2, 4 x GDP)', () => {
    const s = floodGame(['r#']);
    s.cash = 20;
    const log = [];
    const rep = resolveEvent(s, 'riverFlood', log);
    expect(rep.hit).toHaveLength(1);
    expect(rep.damage).toBe(4); // cottages GDP 1 -> 4
    expect(s.cash).toBe(16);
    expect(s.score).toBe(-4);
    expect(s.stats.eventHits).toBe(1);
    expect(eventDamageFor(s, 0)).toBe(2);
    expect(eventDamageFor(s, 0.3)).toBe(2);
  });
  it('protects tiles with FLD >= 3 and names the protector', () => {
    const s = floodGame(['ffr', 'f#r', 'ffr']);
    const rep = resolveEvent(s, 'riverFlood', []);
    expect(rep.hit).toHaveLength(0);
    expect(rep.protected).toHaveLength(1);
    expect(rep.protected[0].by.name).toBe('Fen and reedbed');
    expect(rep.messages[0]).toBe('Your fen and reedbed protected 1 tile from the river flood.');
    expect(rep.avoided).toBe(4);
    expect(s.stats.eventDamageAvoided).toBe(4);
  });
  it('threshold is exactly 3', () => {
    const s = floodGame(['r#']);
    at(s, 0, 1).received.FLD = 2.99;
    expect(resolveEvent(s, 'riverFlood', []).hit).toHaveLength(1);
    at(s, 0, 1).received.FLD = 3;
    expect(resolveEvent(s, 'riverFlood', []).hit).toHaveLength(0);
  });
  it('cash never goes below 0', () => {
    const s = floodGame(['r#']);
    s.cash = 1;
    resolveEvent(s, 'riverFlood', []);
    expect(s.cash).toBe(0);
  });
  it('storm surge, heatwave and pests pick the right tiles', () => {
    const s = tinyGame(['#Fcmmo'], { buildings: { F: 'familyFarm', c: 'conifer' } });
    expect(tilesAtRisk(s, 'stormSurge').map((t) => t.cell.col).sort()).toEqual([]);
    const s2 = tinyGame(['mm#o'], {});
    expect(tilesAtRisk(s2, 'stormSurge')).toHaveLength(1);
    const heat = tilesAtRisk(s, 'heatwave');
    expect(heat.map((t) => [t.cell.col, t.rule.service])).toEqual([[0, 'AIR'], [1, 'WAT']]);
    const pests = tilesAtRisk(s, 'pestOutbreak');
    expect(pests.map((t) => t.cell.col)).toEqual([1, 2]);
  });
  it('fires at the end of the scheduled turn and reveals the next one', () => {
    let s = createGame({ seed: 4 });
    expect(upcomingEvent(s).turn).toBe(8);
    expect(upcomingEvent(s).turnsLeft).toBe(7);
    for (let i = 0; i < 7; i++) s = takeTurn(s, { type: 'pass' }).state;
    const { state, log } = takeTurn(s, { type: 'pass' });
    expect(log.some((l) => l.type === 'event')).toBe(true);
    expect(state.eventHistory).toHaveLength(1);
    expect(upcomingEvent(state).turn).toBe(16);
    state.turn = 25;
    expect(upcomingEvent(state)).toBeNull();
  });
});

describe('objectives', () => {
  it('evaluates each objective', () => {
    const s = tinyGame(['Gff', 'p#o'], { buildings: {} });
    s.seaPollution = 2;
    expect(evaluateObjective(s, 'cleanSeas').met).toBe(true);
    s.seaPollution = 2.5;
    expect(evaluateObjective(s, 'cleanSeas').met).toBe(false);
    expect(evaluateObjective(s, 'ancientHeritage').met).toBe(true);
    at(s, 0, 0).landUse = 'matureSecondary';
    expect(evaluateObjective(s, 'ancientHeritage').met).toBe(false);
    expect(evaluateObjective(s, 'wetlandCounty').met).toBe(false); // needs 2 more than the start
    s.startHabitats = { fen: 1 };
    expect(evaluateObjective(s, 'wetlandCounty').met).toBe(true);
    s.happiness = 8;
    expect(evaluateObjective(s, 'happyPlace').met).toBe(true);
    expect(evaluateObjective(s, 'thrivingWildlife').met).toBe(true);
    expect(evaluateObjective(s, 'growingCommunity').met).toBe(false);
    expect(evaluateObjective(s, 'weatheredIt').met).toBe(true);
    s.stats.eventHits = 1;
    expect(evaluateObjective(s, 'weatheredIt').met).toBe(false);
    expect(evaluateObjective(s, 'farmToFork').met).toBe(false);
    const f = tinyGame(['gggggg', 'FFgFFg', 'gggggg'], { buildings: { F: 'familyFarm' } });
    expect(evaluateObjective(f, 'farmToFork').met).toBe(true);
    s.objectives = Object.keys(OBJECTIVES);
    expect(evaluateObjectives(s)).toHaveLength(Object.keys(OBJECTIVES).length);
    expect(() => evaluateObjective(s, 'nope')).toThrow();
  });
  it('adds the bonus to the final score', () => {
    let s = createGame({ seed: 8 });
    s.objectives = ['weatheredIt', 'cleanSeas'];
    s.events = [];
    for (let i = 0; i < 24; i++) s = takeTurn(s, { type: 'pass' }).state;
    expect(s.final.objectiveBonus).toBe(s.final.objectives.filter((o) => o.met).length * 50);
    expect(s.final.score).toBeCloseTo(s.final.gdpAfterDamage + s.final.objectiveBonus, 5);
  });
  it('endGame happiness mode multiplies total GDP at the end', () => {
    let s = createGame({ seed: 8, config: { happinessMode: 'endGame' } });
    for (let i = 0; i < 24; i++) s = takeTurn(s, { type: 'pass' }).state;
    const f = s.final;
    expect(f.endMultiplier).toBeCloseTo(1 + 0.1 * (s.happiness - 5), 5);
    expect(f.gdpAfterDamage).toBeCloseTo((s.gdpEarned - s.eventDamage) * f.endMultiplier, 0);
    expect(f.natureContribution).toBeGreaterThanOrEqual(0);
  });
});

describe('crossing rivers', () => {
  it('counts a built tile across one river square as next to built', () => {
    const s = tinyGame(['ggg', 'rrr', 'g#g']);
    const keys = legalTargets(s, { type: 'build', building: 'cottages' }).map((t) => `${t.row},${t.col}`).sort();
    // (2,0) and (2,2) touch the village; (0,1) is across the river at (1,1).
    expect(keys).toEqual(['0,1', '2,0', '2,2']);
  });
  it('does not cross two river squares or diagonally', () => {
    const s = tinyGame(['g', 'r', 'r', '#']);
    expect(legalTargets(s, { type: 'build', building: 'cottages' })).toHaveLength(0);
    const d = tinyGame(['gr', 'r#']);
    expect(legalTargets(d, { type: 'build', building: 'cottages' })).toHaveLength(0);
  });
  it('does not bridge from fishing fleets or wind farms', () => {
    const s = tinyGame(['grF'], { buildings: { F: 'fishingFleet' } });
    expect(legalTargets(s, { type: 'build', building: 'cottages' })).toHaveLength(0);
  });
  it('lets the estuary village reach the left bank', () => {
    const s = createGame({ seed: 1, config: { marketMode: 'menu' } });
    const cols = legalTargets(s, { type: 'build', building: 'cottages' }).map((t) => t.col);
    expect(Math.min(...cols)).toBeLessThan(4);
  });
});

describe('objective offer', () => {
  it('offers 4 and keeps 2, the same for a seed', () => {
    const a = createGame({ seed: 5 });
    const b = createGame({ seed: 5 });
    expect(a.objectiveOffer).toHaveLength(4);
    expect(a.objectiveOffer).toEqual(b.objectiveOffer);
    expect(a.objectives).toEqual(a.objectiveOffer.slice(0, 2));
  });
  it('uses the chosen objectives when valid', () => {
    const offer = createGame({ seed: 5 }).objectiveOffer;
    const pick = [offer[3], offer[1]];
    expect(createGame({ seed: 5, config: { objectives: pick } }).objectives).toEqual(pick);
    expect(createGame({ seed: 5, config: { objectives: ['nope', offer[0]] } }).objectives).toEqual(offer.slice(0, 2));
    expect(chooseObjectives(offer, [offer[0], offer[0]], 2)).toEqual(offer.slice(0, 2));
    expect(chooseObjectives(offer, null, 2)).toEqual(offer.slice(0, 2));
  });
  it('choosing objectives does not change the rest of the game', () => {
    const offer = createGame({ seed: 5 }).objectiveOffer;
    const a = createGame({ seed: 5 });
    const b = createGame({ seed: 5, config: { objectives: [offer[2], offer[3]] } });
    expect(b.market).toEqual(a.market);
    expect(b.events).toEqual(a.events);
  });
});

describe('new objectives', () => {
  it('biodiversity net gain compares with the start', () => {
    const s = createGame({ seed: 2 });
    expect(evaluateObjective(s, 'netGain').met).toBe(true);
    const t = takeTurn(s, { type: 'build', slot: s.market.slots.indexOf('cottages') >= 0 ? s.market.slots.indexOf('cottages') : 0,
      ...legalTargets(s, { type: 'build', slot: s.market.slots.indexOf('cottages') >= 0 ? s.market.slots.indexOf('cottages') : 0 })[0] }).state;
    expect(evaluateObjective(t, 'netGain').met).toBe(false);
  });
  it('30 by 30 needs sea reserves', () => {
    const s = tinyGame(['ggggg#oooooooo']);
    expect(evaluateObjective(s, 'thirtyByThirty').met).toBe(false);
    at(s, 0, 9).reserve = true;
    recompute(s);
    expect(evaluateObjective(s, 'thirtyByThirty').met).toBe(true);
  });
  it('habitat gain, restorations, clean rivers, nature pays, coast guard', () => {
    let s = tinyGame(['#gg', 'rgl']);
    expect(evaluateObjective(s, 'pollinatorParadise').met).toBe(true);
    s = takeTurn(s, { type: 'restore', restoration: 'plantWoodland', row: 0, col: 1 }).state;
    expect(evaluateObjective(s, 'pollinatorParadise').met).toBe(false);
    expect(s.stats.restorations).toBe(1);
    expect(evaluateObjective(s, 'rewilder').progress).toBe('1/5');
    at(s, 1, 0).waste = 0;
    at(s, 1, 2).lakePollution = 0;
    expect(evaluateObjective(s, 'cleanRivers').met).toBe(true);
    at(s, 1, 0).waste = 1;
    expect(evaluateObjective(s, 'cleanRivers').met).toBe(false);
    s.cf.actual = 10; s.cf.noNature = 4;
    expect(evaluateObjective(s, 'naturePays').met).toBe(true);
    s.cf.noNature = 6;
    expect(evaluateObjective(s, 'naturePays').met).toBe(false);
    const c = tinyGame(['ss##', 'ssss', 'oooo']);
    expect(evaluateObjective(c, 'coastGuard').met).toBe(true);
    const c2 = tinyGame(['hh##', 'hhhh', 'oooo']);
    expect(evaluateObjective(c2, 'coastGuard').met).toBe(false);
    expect(evaluateObjective(tinyGame(['ss#', 'ooo']), 'coastGuard').met).toBe(false); // only one coastal tile
    expect(evaluateObjective(s, 'blueCarbon').progress).toBe('0/2');
  });
});
