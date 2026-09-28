// Player-facing descriptions derived from data (plain British English).
import { BUILDINGS } from '../data/buildings.js';
import { HABITATS } from '../data/habitats.js';
import { SERVICES } from '../data/services.js';
import { LAND_USE_NAMES } from '../data/predicts.js';

export function gdpLabel(id) {
  const g = BUILDINGS[id].gdp;
  const parts = [`${g.base}`];
  if (g.serviceBonus) parts.push(SERVICES[g.serviceBonus.service].short.toLowerCase());
  if (g.nearbyResidential) parts.push('homes');
  return parts.join(' + ');
}

// Food a building makes each turn, as a short label ("1 + pollination"), or null.
export function foodLabel(id) {
  const f = BUILDINGS[id].food;
  if (!f) return null;
  return f.serviceBonus ? `${f.base} + ${SERVICES[f.serviceBonus.service].short.toLowerCase()}` : `${f.base}`;
}

export function landUseText(cell) {
  return `${LAND_USE_NAMES[cell.landUse]}, ${cell.intensity} use`;
}

export function habitatName(id) {
  return HABITATS[id].name;
}

export function serviceTooltip(key) {
  const s = SERVICES[key];
  const ncp = s.ncp.map((n, i) => `NCP ${n}: ${s.ncpNames[i]}`).join('\n');
  return `${s.name}\n${s.tip}\nReaches the four squares touching it.\nIPBES Nature's Contributions to People:\n${ncp}`;
}
