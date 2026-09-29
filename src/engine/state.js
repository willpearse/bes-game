// createGame(): builds the initial, fully resolved game state (plain JSON data).
import { CONFIG, MAP_DEFAULTS } from '../data/config.js';
import { HABITATS } from '../data/habitats.js';
import { BUILDINGS } from '../data/buildings.js';
import { EVENTS } from '../data/events.js';
import { OBJECTIVES } from '../data/objectives.js';
import { SERVICE_KEYS } from '../data/services.js';
import { MAPS } from '../data/maps/index.js';
import { seedToInt, sample, randomSeed } from './rng.js';
import { initMarket, stageForTurn } from './market.js';
import { updateIntensity, intactness } from './intensity.js';
import { computeSupply, computeReceived } from './services.js';
import { computeHappiness } from './happiness.js';
import { projectGdp } from './gdp.js';
import { habitatCounts } from './objectives.js';

const CODE_TO_HABITAT = Object.fromEntries(Object.entries(HABITATS).map(([k, h]) => [h.code, k]));

export function valleyElevation(row, col, habitat, height) {
  const h = HABITATS[habitat];
  const top = height - 1 - row;
  if (h.marine) return 0;
  if (habitat === 'river' || habitat === 'lake') return top;
  return top + 2 * Math.abs(col - 4);
}

function makeCell(row, col, habitat, landUse) {
  return {
    row, col,
    kind: 'nature',
    habitat,              // for built cells: the ground the tile stands on
    building: null,
    landUse,
    intensity: 'minimal',
    elevation: 0,
    waste: 0,
    age: 0,
    restored: false,
    reserve: false,
    reserveAge: null,
    dam: false,           // a beaver dam on a river square
    tank: 0,              // waste held by a sewage works, waiting to be treated
    soil: null,           // soil health 0..soilMax on farms that have it, else null
    pressure: 0,
    B: 0,
    supply: null,
    received: null,
    wellbeing: null,
    gdp: 0
  };
}

export function placeBuilding(cell, buildingId) {
  const b = BUILDINGS[buildingId];
  cell.kind = 'built';
  cell.building = buildingId;
  cell.landUse = b.landUse;
  cell.intensity = b.intensity;
  cell.age = 0;
  cell.restored = false;
  cell.reserveAge = null;
  cell.soil = b.soil ? CONFIG.soilMax : null;
}

export function parseMap(map) {
  const cells = [];
  for (let row = 0; row < map.height; row++) {
    const line = map.rows[row];
    for (let col = 0; col < map.width; col++) {
      const ch = line[col];
      // A starting building is a building id, or { building, habitat } for the ground under it.
      const start = map.startingBuildings?.[ch];
      const buildingId = typeof start === 'string' ? start : start?.building;
      let cell;
      if (buildingId) {
        cell = makeCell(row, col, start.habitat ?? map.startingBuildingHabitat ?? 'meadow', 'matureSecondary');
        placeBuilding(cell, buildingId);
      } else {
        const habitat = CODE_TO_HABITAT[ch.toLowerCase()];
        if (!habitat) throw new Error(`Unknown map code '${ch}' at ${row},${col}`);
        const landUse = HABITATS[habitat].landUse ?? (ch === ch.toUpperCase() ? 'primary' : 'matureSecondary');
        cell = makeCell(row, col, habitat, landUse);
      }
      if (map.elevation === 'valleyFormula') cell.elevation = valleyElevation(row, col, cell.habitat, map.height);
      else cell.elevation = map.elevation[row][col];
      cells.push(cell);
    }
  }
  return cells;
}

// Runs steps 3, 6, 7 and 8 (and projects GDP for display) without advancing the game.
export function recompute(state) {
  const changes = updateIntensity(state);
  computeSupply(state);
  computeReceived(state);
  computeHappiness(state);
  const proj = projectGdp(state);
  for (const { cell, gdp } of proj.perTile) cell.gdp = gdp;
  state.food = proj.food;
  return { changes, projection: proj };
}

// The objectives offered to the player: drawn from the seed, so a seed always offers the same ones.
function offerObjectives(state) {
  const c = state.config;
  return sample(state, Object.keys(OBJECTIVES), Math.max(c.objectiveOffer, c.objectiveCount));
}

// The player's chosen objectives if valid (distinct, from the offer, the right number), else the first of the offer.
export function chooseObjectives(offer, chosen, count) {
  const ok = Array.isArray(chosen) && chosen.length === count && new Set(chosen).size === count && chosen.every((id) => offer.includes(id));
  return ok ? chosen.slice() : offer.slice(0, count);
}

// A map setting can be one number, or one per difficulty ({ student, teacher }).
export function forDifficulty(value, difficulty) {
  if (value == null || typeof value !== 'object') return value;
  return value[difficulty] ?? value.teacher;
}

export function createGame({ mapId, config, seed, map: customMap } = {}) {
  const cfg = { ...CONFIG, ...(config ?? {}) };
  if (mapId) cfg.mapId = mapId;
  const resolvedSeed = seed ?? cfg.seed ?? randomSeed();
  cfg.seed = resolvedSeed;
  // A map object can be passed directly (used by tests and future map editors).
  const map = customMap ?? MAPS[cfg.mapId];
  if (!map) throw new Error(`Unknown map ${cfg.mapId}`);

  const state = {
    mapId: map.id,
    mapName: map.name,
    width: map.width,
    height: map.height,
    config: cfg,
    seed: resolvedSeed,
    rng: seedToInt(resolvedSeed),
    turn: 1,
    stage: 'A',
    gameOver: false,
    // Explicit config beats the map, which beats the CONFIG default.
    cash: config?.startingCash ?? forDifficulty(map.startingCash, cfg.difficulty) ?? MAP_DEFAULTS.startingCash,
    housingTarget: config?.housingTarget ?? forDifficulty(map.housingTarget, cfg.difficulty) ?? MAP_DEFAULTS.housingTarget,
    goldScore: config?.goldScore ?? forDifficulty(map.goldScore, cfg.difficulty) ?? MAP_DEFAULTS.goldScore,
    food: null,           // { made, need, bought, cost } this turn
    score: 0,
    gdpEarned: 0,
    eventDamage: 0,
    lastTurnGdp: 0,
    happiness: cfg.noResidentsHappiness,
    residents: 0,
    pollution: 0,         // water pollution: waste that reached the sea or a lake
    cells: parseMap(map),
    market: null,
    events: [],
    eventHistory: [],
    objectives: [],
    startPrimary: [],
    stats: { primaryLost: 0, eventHits: 0, eventPotentialDamage: 0, eventDamageAvoided: 0, startIntactness: 0, restorations: 0,
      foodCost: 0, wasteBill: 0, fertiliser: 0, upkeep: 0, destroyed: 0 },
    startHabitats: {},
    objectiveOffer: [],
    // Running GDP totals: actual, with no nature, and without each service. income holds the income-only
    // parts (before the happiness multiplier), used to apply an end-of-game multiplier to income alone.
    cf: {
      actual: 0, noNature: 0, without: Object.fromEntries(SERVICE_KEYS.map((k) => [k, 0])),
      income: { actual: 0, noNature: 0, without: Object.fromEntries(SERVICE_KEYS.map((k) => [k, 0])) }
    },
    history: [],
    final: null
  };
  state.stage = stageForTurn(state, 1);
  state.startPrimary = state.cells.map((c, i) => (c.landUse === 'primary' ? i : -1)).filter((i) => i >= 0);

  if (cfg.marketMode === 'market') initMarket(state);
  const eventIds = sample(state, Object.keys(EVENTS), Math.min(cfg.eventCount, cfg.eventTurns.length));
  state.events = cfg.eventTurns.slice(0, eventIds.length).map((turn, i) => ({ turn, id: eventIds[i] }));
  state.objectiveOffer = offerObjectives(state);
  state.objectives = chooseObjectives(state.objectiveOffer, cfg.objectives, cfg.objectiveCount);

  recompute(state);
  state.stats.startIntactness = intactness(state);
  state.startHabitats = habitatCounts(state);
  return state;
}
