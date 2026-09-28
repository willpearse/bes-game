// Wellbeing and happiness (section 9, step 8).
import { CONFIG } from '../data/config.js';
import { BUILDINGS, WELLBEING } from '../data/buildings.js';
import { within, ortho, isBuilt, isResidential, building, round1 } from './grid.js';
import { wasteTokensAt } from './waste.js';

const cfg = (state) => state.config ?? CONFIG;
const defaultRecv = (cell) => cell.received;

// Best bonus from buildings with a wellbeingBonus of the given key (school or hospital) within its radius.
export function bestBonus(state, cell, key) {
  const rule = BUILDINGS[key].wellbeingBonus;
  const near = within(state, cell.row, cell.col, rule.radius).some((c) => isBuilt(c) && c.building === key);
  return near ? rule.amount : 0;
}

export function wellbeingParts(state, cell, recv = defaultRecv) {
  const b = building(cell);
  const r = recv(cell);
  const W = WELLBEING;
  let nuisance = 0;
  for (const n of within(state, cell.row, cell.col, 1)) {
    const nb = building(n);
    if (nb && nb.nuisance) nuisance += nb.nuisance;
  }
  let tokens = wasteTokensAt(state, cell);
  for (const n of ortho(state, cell.row, cell.col)) tokens += wasteTokensAt(state, n);
  return {
    base: b.wellbeingBase,
    green: Math.min(r.GRN, W.greenCap) / W.greenDivisor,
    school: bestBonus(state, cell, 'school'),
    hospital: bestBonus(state, cell, 'hospital'),
    nuisance: 0 - Math.min(nuisance, W.nuisanceMax),
    waste: 0 - Math.min(tokens * W.wastePenaltyPer, W.wastePenaltyMax)
  };
}

export function wellbeing(state, cell, recv = defaultRecv) {
  const p = wellbeingParts(state, cell, recv);
  const w = p.base + p.green + p.school + p.hospital + p.nuisance + p.waste;
  return Math.max(WELLBEING.min, Math.min(WELLBEING.max, w));
}

export function totalResidents(state) {
  let n = 0;
  for (const c of state.cells) if (isResidential(c)) n += BUILDINGS[c.building].residents;
  return n;
}

// Returns { H, residents, wellbeing: [{ cell, w }] }. Pure (does not write to state).
export function happiness(state, recv = defaultRecv) {
  const c = cfg(state);
  let weighted = 0;
  let residents = 0;
  const list = [];
  for (const cell of state.cells) {
    if (!isResidential(cell)) continue;
    const w = wellbeing(state, cell, recv);
    const n = BUILDINGS[cell.building].residents;
    weighted += w * n;
    residents += n;
    list.push({ cell, w });
  }
  const H = round1(residents > 0 ? weighted / residents : c.noResidentsHappiness);
  return { H, residents, wellbeing: list };
}

// Step 8: writes wellbeing to residential cells and H to state.
export function computeHappiness(state) {
  const res = happiness(state);
  for (const cell of state.cells) cell.wellbeing = null;
  for (const { cell, w } of res.wellbeing) cell.wellbeing = round1(w);
  state.happiness = res.H;
  state.residents = res.residents;
  return res.H;
}
