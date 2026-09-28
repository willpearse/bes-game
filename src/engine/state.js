// createGame(): builds the initial, fully resolved game state (plain JSON data).
import { CONFIG } from '../data/config.js';
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
    lakePollution: 0,
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
}

export function parseMap(map) {
  const cells = [];
  for (let row = 0; row < map.height; row++) {
    const line = map.rows[row];
    for (let col = 0; col < map.width; col++) {
      const ch = line[col];
      const buildingId = map.startingBuildings?.[ch];
      let cell;
      if (buildingId) {
        cell = makeCell(row, col, map.startingBuildingHabitat ?? 'meadow', 'matureSecondary');
        placeBuilding(cell, buildingId);
      } else {
        const habitat = CODE_TO_HABITAT[ch.toLowerCase()];
        if (!habitat) throw new Error(`Unknown map code '${ch}' at ${row},${col}`);
        cell = makeCell(row, col, habitat, ch === ch.toUpperCase() ? 'primary' : 'matureSecondary');
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
    cash: cfg.startingCash,
    score: 0,
    gdpEarned: 0,
    eventDamage: 0,
    lastTurnGdp: 0,
    happiness: cfg.noResidentsHappiness,
    residents: 0,
    seaPollution: 0,
    cells: parseMap(map),
    market: null,
    events: [],
    eventHistory: [],
    objectives: [],
    startPrimary: [],
    stats: { primaryLost: 0, eventHits: 0, eventPotentialDamage: 0, eventDamageAvoided: 0, startIntactness: 0, restorations: 0 },
    startHabitats: {},
    objectiveOffer: [],
    cf: { actual: 0, noNature: 0, without: Object.fromEntries(SERVICE_KEYS.map((k) => [k, 0])) },
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
