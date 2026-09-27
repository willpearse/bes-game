// Events (section 11).
import { CONFIG } from '../data/config.js';
import { EVENTS } from '../data/events.js';
import { within, isBuilt, isMarine, hasTag, cellName, round1 } from './grid.js';
import { topContributor } from './services.js';

const cfg = (state) => state.config ?? CONFIG;

// For a built tile, which rule of the event puts it at risk (or null).
export function riskRule(state, event, cell) {
  if (!isBuilt(cell)) return null;
  for (const rule of event.atRisk) {
    if (rule.nearHabitats) {
      const near = within(state, cell.row, cell.col, rule.radius).some((c) => rule.nearHabitats.includes(c.habitat) && !isBuilt(c));
      if (near) return { service: event.protection[0].service, min: event.protection[0].min };
    } else if (rule.nearMarine) {
      if (within(state, cell.row, cell.col, rule.radius).some(isMarine)) {
        return { service: event.protection[0].service, min: event.protection[0].min };
      }
    } else if (rule.tag) {
      if (hasTag(cell, rule.tag)) return { service: rule.service, min: rule.min };
    } else if (rule.buildings) {
      if (rule.buildings.includes(cell.building)) return { service: rule.service, min: rule.min };
    }
  }
  return null;
}

export function tilesAtRisk(state, eventId) {
  const event = EVENTS[eventId];
  const out = [];
  for (const cell of state.cells) {
    const rule = riskRule(state, event, cell);
    if (rule) out.push({ cell, rule });
  }
  return out;
}

export function eventDamageFor(state, gdp) {
  const c = cfg(state);
  return Math.max(c.eventDamageMinimum, c.eventDamageMultiplier * gdp);
}

// Step 11. Mutates state (cash, score, stats), returns the report and pushes it to the log.
export function resolveEvent(state, eventId, log) {
  const event = EVENTS[eventId];
  const hit = [];
  const protectedTiles = [];
  let damage = 0;
  let potential = 0;
  for (const { cell, rule } of tilesAtRisk(state, eventId)) {
    const d = round1(eventDamageFor(state, cell.gdp ?? 0));
    potential += d;
    const value = cell.received?.[rule.service] ?? 0;
    const pos = { row: cell.row, col: cell.col, name: cellName(cell) };
    if (value >= rule.min) {
      const top = topContributor(state, cell.row, cell.col, rule.service);
      protectedTiles.push({ ...pos, service: rule.service, value, damageAvoided: d,
        by: top ? { row: top.row, col: top.col, name: cellName(top) } : null });
    } else {
      hit.push({ ...pos, service: rule.service, value, damage: d });
      damage += d;
    }
  }
  damage = round1(damage);
  potential = round1(potential);
  state.cash = round1(Math.max(0, state.cash - damage));
  state.eventDamage = round1(state.eventDamage + damage);
  state.score = round1(state.score - damage);
  state.stats.eventHits += hit.length;
  state.stats.eventPotentialDamage = round1(state.stats.eventPotentialDamage + potential);
  state.stats.eventDamageAvoided = round1(state.stats.eventDamageAvoided + (potential - damage));

  // Group protectors by name: "Your saltmarsh protected 3 tiles from the storm surge."
  const byName = {};
  for (const p of protectedTiles) {
    if (!p.by) continue;
    const key = p.by.name;
    byName[key] = byName[key] ?? { name: key, count: 0, cells: [] };
    byName[key].count += 1;
    if (!byName[key].cells.some((c) => c.row === p.by.row && c.col === p.by.col)) byName[key].cells.push(p.by);
  }
  const protectors = Object.values(byName).sort((a, b) => b.count - a.count);
  const messages = protectors.map((p) =>
    `Your ${p.name.toLowerCase()} protected ${p.count} tile${p.count === 1 ? '' : 's'} from ${event.verb}.`);

  const report = {
    type: 'event', id: eventId, name: event.name, turn: state.turn,
    hit, protected: protectedTiles, protectors, messages,
    damage, potential, avoided: round1(potential - damage)
  };
  state.eventHistory.push(report);
  log.push(report);
  return report;
}

// The next scheduled event at or after the current turn (revealed one stage ahead).
export function upcomingEvent(state) {
  const next = state.events.find((e) => e.turn >= state.turn);
  if (!next) return null;
  return { ...next, name: EVENTS[next.id].name, turnsLeft: next.turn - state.turn };
}

