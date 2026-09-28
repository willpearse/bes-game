// Objectives (section 12).
import { OBJECTIVES } from '../data/objectives.js';
import { within, isNature, isBuilt, isFarm, isMarine, isLand } from './grid.js';
import { intactness, reserveProtected } from './intensity.js';
import { wasteTokensAt } from './waste.js';

const habitatCount = (state, habitats) => state.cells.filter((c) => isNature(c) && habitats.includes(c.habitat)).length;

// Cell counts per habitat, recorded at game start for "gain" objectives.
export function habitatCounts(state) {
  const out = {};
  for (const c of state.cells) if (isNature(c)) out[c.habitat] = (out[c.habitat] ?? 0) + 1;
  return out;
}

// Returns { met, progress } where progress is a short string for the HUD.
export function evaluateObjective(state, id) {
  const o = OBJECTIVES[id];
  switch (o.kind) {
    case 'pollutionMax':
      return { met: state.pollution <= o.value, progress: `pollution ${Math.round(state.pollution)}` };
    case 'keepPrimary': {
      const kept = state.startPrimary.filter((i) => state.cells[i].landUse === 'primary').length;
      return { met: kept === state.startPrimary.length, progress: `${kept}/${state.startPrimary.length}` };
    }
    case 'habitatCount': {
      const n = habitatCount(state, o.habitats);
      return { met: n >= o.value, progress: `${n}/${o.value}` };
    }
    case 'habitatGain': {
      const start = o.habitats.reduce((s, h) => s + (state.startHabitats?.[h] ?? 0), 0);
      const n = habitatCount(state, o.habitats);
      const need = start + o.gain;
      return { met: n >= need, progress: `${n}/${need}` };
    }
    case 'happinessMin':
      return { met: state.happiness >= o.value, progress: `${state.happiness.toFixed(1)}` };
    case 'intactnessMin': {
      const v = intactness(state);
      return { met: v >= o.value - 1e-9, progress: `${Math.round(v * 100)}%` };
    }
    case 'netGain': {
      const v = intactness(state);
      return { met: v >= state.stats.startIntactness - 1e-9, progress: `${Math.round(v * 100)}% vs ${Math.round(state.stats.startIntactness * 100)}%` };
    }
    case 'thirtyByThirty': {
      const land = state.cells.filter(isLand);
      const sea = state.cells.filter(isMarine);
      const wild = land.filter((c) => isNature(c) && c.intensity === 'minimal').length / Math.max(1, land.length);
      const reserved = sea.filter((c) => reserveProtected(state, c)).length / Math.max(1, sea.length);
      return { met: wild >= o.land - 1e-9 && reserved >= o.sea - 1e-9, progress: `land ${Math.round(wild * 100)}%, sea ${Math.round(reserved * 100)}%` };
    }
    case 'restorationsMin': {
      const n = state.stats.restorations ?? 0;
      return { met: n >= o.value, progress: `${n}/${o.value}` };
    }
    case 'cleanRivers': {
      const dirty = state.cells.filter((c) => c.habitat === 'river' && wasteTokensAt(state, c) > 0).length;
      return { met: dirty === 0, progress: dirty ? `${dirty} dirty` : 'clean' };
    }
    case 'natureShareMin': {
      const share = state.cf.actual > 0 ? (state.cf.actual - state.cf.noNature) / state.cf.actual : 0;
      return { met: share >= o.value - 1e-9, progress: `${Math.round(share * 100)}%` };
    }
    case 'coastGuard': {
      const coastal = state.cells.filter((c) => isBuilt(c) && within(state, c.row, c.col, o.radius).some(isMarine));
      const ok = coastal.filter((c) => (c.received?.[o.service] ?? 0) >= o.min).length;
      return { met: coastal.length >= o.atLeast && ok === coastal.length, progress: `${ok}/${coastal.length} safe` };
    }
    case 'noEventHits':
      return { met: state.stats.eventHits === 0, progress: `${state.stats.eventHits} hit` };
    case 'farmsWithService': {
      const n = state.cells.filter((c) => isFarm(c) && (c.received?.[o.service] ?? 0) >= o.min).length;
      return { met: n >= o.value, progress: `${n}/${o.value}` };
    }
    default:
      throw new Error(`Unknown objective kind ${o.kind}`);
  }
}

export function evaluateObjectives(state) {
  return state.objectives.map((id) => ({ id, name: OBJECTIVES[id].name, text: OBJECTIVES[id].text, ...evaluateObjective(state, id) }));
}
