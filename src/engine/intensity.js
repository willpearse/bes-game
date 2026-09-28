// Pressure, use intensity, Primary loss, succession (section 9, steps 3 to 5).
import { CONFIG, PRESSURE_TO_INTENSITY, SUCCESSION, RESERVE_SEAGRASS_AGE } from '../data/config.js';
import { PREDICTS_B } from '../data/predicts.js';
import { HABITATS } from '../data/habitats.js';
import { BUILDINGS } from '../data/buildings.js';
import { within, ortho, isBuilt, isNature, isMarine, isLand } from './grid.js';
import { wasteTokensAt } from './waste.js';

const cfg = (state) => state.config ?? CONFIG;

export function intensityForPressure(pressure) {
  for (const row of PRESSURE_TO_INTENSITY) if (pressure >= row.min) return row.intensity;
  return 'minimal';
}

export function biodiversityValue(landUse, intensity) {
  return PREDICTS_B[landUse][intensity];
}

export function cellB(cell) {
  return biodiversityValue(cell.landUse, cell.intensity);
}

// Is a marine cell protected: by a reserve (the reserve cell itself or any within 1), or by a reef
// (a building with reef: true, such as a wind farm, touching it N, E, S or W)?
export function reserveProtected(state, cell) {
  if (!isMarine(cell)) return false;
  if (cell.reserve) return true;
  if (within(state, cell.row, cell.col, 1).some((c) => c.reserve)) return true;
  return ortho(state, cell.row, cell.col).some((c) => isBuilt(c) && BUILDINGS[c.building].reef);
}

// Soil health on farms (between services received and GDP). Returns the list of changes.
export function updateSoil(state) {
  const c = cfg(state);
  const changes = [];
  for (const cell of state.cells) {
    if (!isBuilt(cell) || cell.soil == null) continue;
    const rule = BUILDINGS[cell.building].soil;
    const declines = rule === 'always' || (cell.received?.WAT ?? 0) < c.soilWater;
    const next = Math.max(0, Math.min(c.soilMax, cell.soil + (declines ? -1 : 1)));
    if (next !== cell.soil) {
      changes.push({ row: cell.row, col: cell.col, from: cell.soil, to: next });
      cell.soil = next;
    }
  }
  return changes;
}

export function pressureOn(state, cell) {
  let p = 0;
  for (const n of within(state, cell.row, cell.col, 1)) {
    if (isBuilt(n)) p += BUILDINGS[n.building].pressure;
  }
  if (wasteTokensAt(state, cell) > 0) p += 1;
  if ((isMarine(cell) || cell.habitat === 'lake') && state.pollution >= cfg(state).pollutionPressureThreshold) p += 1;
  return p;
}

// Step 3. Returns list of intensity changes.
export function updateIntensity(state) {
  const changes = [];
  for (const cell of state.cells) {
    if (!isNature(cell)) {
      cell.pressure = 0;
      continue;
    }
    const p = pressureOn(state, cell);
    cell.pressure = p;
    const next = reserveProtected(state, cell) ? 'minimal' : intensityForPressure(p);
    if (next !== cell.intensity) {
      changes.push({ row: cell.row, col: cell.col, from: cell.intensity, to: next });
      cell.intensity = next;
    }
  }
  return changes;
}

// Step 4. Primary cells at intense use permanently become mature secondary.
export function applyPrimaryLoss(state, log) {
  const lost = [];
  for (const cell of state.cells) {
    if (isNature(cell) && cell.landUse === 'primary' && cell.intensity === 'intense') {
      cell.landUse = 'matureSecondary';
      const name = HABITATS[cell.habitat].name.toLowerCase();
      const entry = {
        type: 'primaryLost', row: cell.row, col: cell.col, habitat: cell.habitat,
        message: `Ancient ${name} lost: it can never be restored to this state.`
      };
      lost.push(entry);
      log.push(entry);
    }
  }
  state.stats.primaryLost += lost.length;
  return lost;
}

// Step 5. Succession of restored cells and reserve seagrass growth.
export function applySuccession(state, log) {
  for (const cell of state.cells) {
    if (!isNature(cell)) continue;
    if (cell.reserve && cell.habitat === 'openSea' && cell.reserveAge != null) {
      cell.reserveAge += 1;
      if (cell.reserveAge >= RESERVE_SEAGRASS_AGE) {
        cell.habitat = 'seagrass';
        cell.landUse = 'youngSecondary';
        cell.restored = true;
        cell.age = 0;
        cell.reserveAge = null;
        log.push({ type: 'succession', row: cell.row, col: cell.col, habitat: 'seagrass', to: 'youngSecondary',
          message: 'Seagrass has taken root in your marine reserve.' });
      }
      continue;
    }
    if (!cell.restored) continue;
    cell.age += 1;
    for (const step of SUCCESSION) {
      if (cell.landUse === step.from && cell.age >= step.age) {
        cell.landUse = step.to;
        const name = HABITATS[cell.habitat].name.toLowerCase();
        const stage = step.to === 'matureSecondary' ? 'has matured' : 'is maturing';
        log.push({ type: 'succession', row: cell.row, col: cell.col, habitat: cell.habitat, to: step.to,
          message: `Your young ${name} ${stage}.` });
      }
    }
  }
}

// Regional biodiversity intactness: mean B over land cells.
export function intactness(state) {
  const land = state.cells.filter(isLand);
  if (land.length === 0) return 0;
  return land.reduce((s, c) => s + cellB(c), 0) / land.length;
}
