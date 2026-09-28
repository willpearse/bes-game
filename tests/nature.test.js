import { describe, it, expect } from 'vitest';
import { tinyGame, at } from './helpers.js';
import { placeBuilding, recompute } from '../src/engine/state.js';
import { updateIntensity, applyPrimaryLoss, applySuccession, pressureOn, reserveProtected, intactness } from '../src/engine/intensity.js';
import { computeSupply, computeReceived, receivedAt, topContributor, deliveries } from '../src/engine/services.js';
import { wellbeing, wellbeingParts, happiness, computeHappiness } from '../src/engine/happiness.js';
import { takeTurn, legalTargets } from '../src/engine/actions.js';

const build = (s, r, c, b) => { placeBuilding(at(s, r, c), b); recompute(s); };

describe('pressure and intensity', () => {
  it('sums building pressure within 1', () => {
    const s = tinyGame(['ggggg', 'ggggg', 'ggggg']);
    build(s, 1, 1, 'factory'); // pressure 2
    build(s, 1, 3, 'cottages'); // pressure 1
    expect(at(s, 1, 2).pressure).toBe(3);
    expect(at(s, 1, 2).intensity).toBe('intense');
    expect(at(s, 0, 0).pressure).toBe(2);
    expect(at(s, 0, 0).intensity).toBe('light');
    expect(at(s, 0, 4).pressure).toBe(1);
    expect(at(s, 2, 4).intensity).toBe('light');
    expect(at(s, 1, 1).pressure).toBe(0); // built cells have no pressure
  });
  it('adds 1 for waste on the cell', () => {
    const s = tinyGame(['ggg']);
    at(s, 0, 1).waste = 2;
    expect(pressureOn(s, at(s, 0, 1))).toBe(1);
    updateIntensity(s);
    expect(at(s, 0, 1).intensity).toBe('light');
  });
  it('adds 1 to marine cells when sea pollution is 10 or more', () => {
    const s = tinyGame(['ggzo']);
    s.seaPollution = 9.5;
    expect(pressureOn(s, at(s, 0, 3))).toBe(0);
    s.seaPollution = 10;
    expect(pressureOn(s, at(s, 0, 3))).toBe(1);
    expect(pressureOn(s, at(s, 0, 0))).toBe(0);
  });
  it('forces reserve-protected marine cells to minimal', () => {
    const s = tinyGame(['gooooo']);
    build(s, 0, 2, 'fishingFleet');
    build(s, 0, 4, 'fishingFleet');
    expect(at(s, 0, 3).intensity).toBe('intense'); // pressure 4
    at(s, 0, 5).reserve = true;
    updateIntensity(s);
    expect(reserveProtected(s, at(s, 0, 3))).toBe(false);
    expect(at(s, 0, 3).intensity).toBe('intense'); // reserve at distance 2
    at(s, 0, 4).reserve = false;
    at(s, 0, 3).reserve = true;
    updateIntensity(s);
    expect(at(s, 0, 3).intensity).toBe('minimal');
    expect(reserveProtected(s, at(s, 0, 0))).toBe(false); // land cell
  });
});

describe('services', () => {
  it('receives within radius, excluding own cell, with cap', () => {
    // Meadow POL 3, radius 1. A built tile surrounded by meadow at distance 1 and 2.
    const s = tinyGame(['ggggg', 'ggggg', 'ggggg', 'ggggg', 'ggggg']);
    build(s, 2, 2, 'windFarm'); // pressure 0, supplies nothing, so neighbours stay minimal
    // 8 meadow neighbours: 8 * 3 * 0.9 = 21.6 -> capped at 6
    expect(at(s, 2, 2).received.POL).toBe(6);
    s.config.serviceCap = 100;
    computeReceived(s);
    expect(at(s, 2, 2).received.POL).toBeCloseTo(21.6, 5);
    // WAT radius 2: 24 meadow cells * 1 * 0.9
    expect(at(s, 2, 2).received.WAT).toBeCloseTo(21.6, 5);
  });
  it('excludes the tile itself', () => {
    const s = tinyGame(['o', 'g']);
    build(s, 1, 0, 'familyFarm'); // supplies POL 1 * 0.4 itself
    expect(at(s, 1, 0).supply.POL).toBeCloseTo(0.4, 5);
    expect(at(s, 1, 0).received.POL).toBe(0);
  });
  it('radius 1 does not reach distance 2', () => {
    const s = tinyGame(['gdd']);
    build(s, 0, 2, 'windFarm');
    // dunes POL 1 at distance 1 (0.9), meadow POL 3 at distance 2 not counted
    expect(at(s, 0, 2).received.POL).toBeCloseTo(0.9, 5);
    expect(receivedAt(s, 0, 2).REC).toBeCloseTo(0.9 * 3 + 0.9 * 2, 5);
  });
  it('reduces lake supply by lake pollution', () => {
    const s = tinyGame(['lg']);
    at(s, 0, 0).lakePollution = 3;
    computeSupply(s);
    expect(at(s, 0, 0).supply.REC).toBeCloseTo(3 * 0.9 * 0.7, 5);
    at(s, 0, 0).lakePollution = 20;
    computeSupply(s);
    expect(at(s, 0, 0).supply.REC).toBe(0);
  });
  it('finds the top contributor', () => {
    const s = tinyGame(['gsd', 'ggg']);
    build(s, 1, 1, 'windFarm');
    expect(topContributor(s, 1, 1, 'FLD').habitat).toBe('saltmarsh');
    expect(topContributor(s, 0, 0, 'POL')).not.toBeNull();
  });
});

describe('Primary loss', () => {
  it('happens exactly when a Primary cell reaches intense', () => {
    const s = tinyGame(['GGGG']);
    build(s, 0, 0, 'cottages'); // pressure 1 on (0,1)
    const log = [];
    expect(applyPrimaryLoss(s, log)).toHaveLength(0);
    expect(at(s, 0, 1).landUse).toBe('primary');
    build(s, 0, 2, 'cottages'); // (0,1) now pressure 2, still light
    expect(applyPrimaryLoss(s, log)).toHaveLength(0);
    build(s, 0, 3, 'factory'); // (0,2) is built; nothing else intense
    at(s, 0, 1).waste = 1; // pressure 3 -> intense
    updateIntensity(s);
    const lost = applyPrimaryLoss(s, log);
    expect(lost).toHaveLength(1);
    expect(at(s, 0, 1).landUse).toBe('matureSecondary');
    expect(log[0].message).toMatch(/Ancient wildflower meadow lost/);
    expect(s.stats.primaryLost).toBe(1);
  });
  it('building on a primary cell counts as a loss', () => {
    const s = tinyGame(['#G']);
    const { state, log } = takeTurn(s, { type: 'build', building: 'cottages', row: 0, col: 1 });
    expect(state.stats.primaryLost).toBe(1);
    expect(log.some((l) => l.type === 'primaryLost')).toBe(true);
  });
});

describe('succession', () => {
  it('young -> intermediate at age 3 -> mature at age 7', () => {
    const s = tinyGame(['gg']);
    const c = at(s, 0, 0);
    Object.assign(c, { restored: true, landUse: 'youngSecondary', age: 0 });
    const log = [];
    const stages = [];
    for (let i = 0; i < 8; i++) { applySuccession(s, log); stages.push(c.landUse); }
    expect(stages).toEqual([
      'youngSecondary', 'youngSecondary', 'intermediateSecondary', 'intermediateSecondary',
      'intermediateSecondary', 'intermediateSecondary', 'matureSecondary', 'matureSecondary'
    ]);
    expect(log.map((l) => l.to)).toEqual(['intermediateSecondary', 'matureSecondary']);
    expect(at(s, 0, 1).age).toBe(0); // not restored, never ages
  });
  it('restored cells never become primary', () => {
    const s = tinyGame(['g']);
    Object.assign(at(s, 0, 0), { restored: true, landUse: 'youngSecondary', age: 0 });
    for (let i = 0; i < 30; i++) applySuccession(s, []);
    expect(at(s, 0, 0).landUse).toBe('matureSecondary');
  });
  it('an open-sea marine reserve becomes seagrass at age 4', () => {
    let s = tinyGame(['#o', 'oo']);
    s = takeTurn(s, { type: 'restore', restoration: 'marineReserve', row: 1, col: 1 }).state;
    expect(at(s, 1, 1).reserve).toBe(true);
    expect(at(s, 1, 1).habitat).toBe('openSea');
    expect(at(s, 1, 1).reserveAge).toBe(1);
    for (let i = 0; i < 2; i++) s = takeTurn(s, { type: 'pass' }).state;
    expect(at(s, 1, 1).habitat).toBe('openSea');
    const { state, log } = takeTurn(s, { type: 'pass' });
    expect(at(state, 1, 1).habitat).toBe('seagrass');
    expect(at(state, 1, 1).landUse).toBe('youngSecondary');
    expect(log.some((l) => l.type === 'succession' && l.habitat === 'seagrass')).toBe(true);
    // Reserve still forces nearby marine cells to minimal.
    expect(at(state, 0, 1).intensity).toBe('minimal');
    // Fishing fleets cannot go on reserve cells.
    const tg = legalTargets(state, { type: 'build', building: 'fishingFleet' });
    expect(tg.some((t) => t.row === 1 && t.col === 1)).toBe(false);
  });
  it('a seagrass reserve keeps its habitat', () => {
    let s = tinyGame(['#z']);
    s = takeTurn(s, { type: 'restore', restoration: 'marineReserve', row: 0, col: 1 }).state;
    for (let i = 0; i < 5; i++) s = takeTurn(s, { type: 'pass' }).state;
    expect(at(s, 0, 1).habitat).toBe('seagrass');
    expect(at(s, 0, 1).landUse).toBe('matureSecondary');
  });
});

describe('wellbeing', () => {
  it('computes the formula parts', () => {
    const s = tinyGame(['ggg', 'g#g', 'ggg']);
    const c = at(s, 1, 1);
    const p = wellbeingParts(s, c);
    expect(p.base).toBe(5);
    expect(p.rec).toBeCloseTo(Math.min(c.received.REC, 6) / 2, 5);
    expect(p.air).toBeCloseTo(Math.min(c.received.AIR, 6) / 3, 5);
    expect(p.water).toBe(c.received.WAT < 2 ? -1 : 0);
  });
  it('clamps to 0..10', () => {
    const s = tinyGame(['www', 'w#w', 'www']);
    expect(wellbeing(s, at(s, 1, 1))).toBeLessThanOrEqual(10);
    const zero = () => ({ POL: 0, WAT: 0, FLD: 0, AIR: 0, REC: 0 });
    at(s, 1, 1).waste = 5;
    const s2 = tinyGame(['@@@', '@#@', '@@@'], { buildings: { '#': 'towerBlock', '@': 'factory' } });
    at(s2, 1, 1).waste = 10;
    // 4 - 1 (water) - 4 (nuisance, capped) - 3 (waste, capped) = -4 -> 0
    expect(wellbeing(s2, at(s2, 1, 1), zero)).toBe(0);
    const p = wellbeingParts(s2, at(s2, 1, 1), zero);
    expect(p.nuisance).toBe(-4);
    expect(p.waste).toBe(-3);
  });
  it('counts waste on the tile and orthogonal neighbours only', () => {
    const s = tinyGame(['ggg', 'g#g', 'ggg']);
    at(s, 0, 0).waste = 3; // diagonal: ignored
    expect(wellbeingParts(s, at(s, 1, 1)).waste).toBe(0);
    at(s, 0, 1).waste = 1;
    at(s, 1, 1).waste = 1;
    expect(wellbeingParts(s, at(s, 1, 1)).waste).toBe(-2);
  });
  it('uses the best school and hospital only', () => {
    const s = tinyGame(['gggggg', 'g#Sggg', 'ggggSg'], { buildings: { '#': 'cottages', S: 'school' } });
    // (1,2) school has 3 nature orthogonal neighbours minus... check forest school
    const p = wellbeingParts(s, at(s, 1, 1));
    expect(p.school).toBe(2);
    const s2 = tinyGame(['#H'], { buildings: { '#': 'cottages', H: 'hospital' } });
    expect(wellbeingParts(s2, at(s2, 0, 0)).hospital).toBe(1); // no AIR, not boosted
    const s3 = tinyGame(['www', '#Hw', 'www'], { buildings: { '#': 'cottages', H: 'hospital' } });
    expect(at(s3, 1, 1).received.AIR).toBeGreaterThanOrEqual(3);
    expect(wellbeingParts(s3, at(s3, 1, 0)).hospital).toBe(2);
    const s4 = tinyGame(['#SS'], { buildings: { '#': 'cottages', S: 'school' } });
    expect(wellbeingParts(s4, at(s4, 0, 0)).school).toBe(1); // not a forest school
  });
  it('happiness is resident-weighted, 5 with no homes, and has population pressure', () => {
    const empty = tinyGame(['ggg']);
    expect(happiness(empty).H).toBe(5);
    const s = tinyGame(['#T'], { buildings: { '#': 'cottages', T: 'towerBlock' } });
    const w1 = wellbeing(s, at(s, 0, 0));
    const w2 = wellbeing(s, at(s, 0, 1));
    expect(s.happiness).toBeCloseTo(Math.round(((w1 + 4 * w2) / 5) * 10) / 10, 5);
    s.config.populationPressure = true;
    s.config.pressureThresholds = [3, 5, 100];
    const before = happiness({ ...s, config: { ...s.config, populationPressure: false } }).H;
    expect(computeHappiness(s)).toBeCloseTo(before - 1, 5);
  });
});

describe('intactness', () => {
  it('is the mean B over land cells only', () => {
    const s = tinyGame(['Go']);
    expect(intactness(s)).toBe(1);
  });
});

describe('deliveries', () => {
  it('lists the top supplier of each used service, capped and spread across services', () => {
    const s = tinyGame(['wgw', 'g#g', 'Fgf'], { buildings: { F: 'familyFarm' } });
    const all = deliveries(s);
    const services = all.map((d) => d.service);
    expect(services).toContain('POL'); // to the farm
    expect(services).toContain('REC'); // to the cottages
    expect(all.every((d) => d.amount > 0)).toBe(true);
    const home = all.find((d) => d.service === 'AIR' && d.to.row === 1);
    expect(at(s, home.from.row, home.from.col).habitat).toBe('woodland');
    const two = deliveries(s, 2);
    expect(two).toHaveLength(2);
    expect(two[0].service).not.toBe(two[1].service);
    expect(deliveries(tinyGame(['ggg']))).toEqual([]);
  });
});
