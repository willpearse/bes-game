// Market (section 8.1) and menu unlocks (section 8.2).
import { CONFIG } from '../data/config.js';
import { STAGE_ORDER, STAGE_PILES, MENU_UNLOCKS } from '../data/decks.js';
import { shuffle } from './rng.js';

const cfg = (state) => state.config ?? CONFIG;

export const MARKET_SIZE = 6;

export function stageForTurn(state, turn) {
  const starts = cfg(state).stageStartTurns;
  let stage = STAGE_ORDER[0];
  for (const s of STAGE_ORDER) if (turn >= starts[s]) stage = s;
  return stage;
}

export function buildPiles(state) {
  const piles = {};
  for (const stage of STAGE_ORDER) {
    const pile = [];
    for (const [id, counts] of Object.entries(STAGE_PILES)) {
      for (let i = 0; i < (counts[stage] ?? 0); i++) pile.push(id);
    }
    piles[stage] = shuffle(state, pile);
  }
  return piles;
}

// Draw from the current stage pile, falling through to later piles. Returns null if all are empty.
export function drawTile(state) {
  const start = STAGE_ORDER.indexOf(state.stage);
  for (let i = start; i < STAGE_ORDER.length; i++) {
    const pile = state.market.piles[STAGE_ORDER[i]];
    if (pile.length > 0) return pile.shift();
  }
  return null;
}

export function initMarket(state) {
  state.market = { slots: [], piles: buildPiles(state) };
  for (let i = 0; i < MARKET_SIZE; i++) state.market.slots.push(drawTile(state));
}

// Step 2. takenSlot is the slot index taken (build or restore), or null on pass.
export function updateMarket(state, takenSlot, log) {
  const slots = state.market.slots.slice();
  const removed = [];
  if (takenSlot !== 0 && slots[0] != null) removed.push({ slot: 0, tile: slots[0], reason: 'discarded' });
  if (takenSlot != null) slots[takenSlot] = null;
  if (takenSlot !== 0) slots[0] = null;
  const kept = slots.filter((t) => t != null);
  while (kept.length < MARKET_SIZE) kept.push(drawTile(state));
  state.market.slots = kept;
  log.push({ type: 'market', removed, slots: kept.slice() });
}

// At the start of a new stage, discard what is left of earlier piles.
export function discardEarlierPiles(state) {
  const cur = STAGE_ORDER.indexOf(state.stage);
  const discarded = [];
  for (let i = 0; i < cur; i++) {
    const s = STAGE_ORDER[i];
    discarded.push(...state.market.piles[s]);
    state.market.piles[s] = [];
  }
  return discarded;
}

export function menuUnlocked(state) {
  const cur = STAGE_ORDER.indexOf(state.stage);
  const out = [];
  for (let i = 0; i <= cur; i++) out.push(...MENU_UNLOCKS[STAGE_ORDER[i]]);
  return out;
}

export function surcharge(state, slot) {
  return cfg(state).marketSurcharge[slot] ?? 0;
}
