// Objectives (section 12).
import { OBJECTIVES } from '../data/objectives.js';
import { isNature, isFarm } from './grid.js';
import { intactness } from './intensity.js';

// Returns { met, progress } where progress is a short string for the HUD.
export function evaluateObjective(state, id) {
  const o = OBJECTIVES[id];
  switch (o.kind) {
    case 'seaPollutionMax':
      return { met: state.seaPollution <= o.value, progress: `sea ${Math.round(state.seaPollution)}` };
    case 'keepPrimary': {
      const kept = state.startPrimary.filter((i) => state.cells[i].landUse === 'primary').length;
      return { met: kept === state.startPrimary.length, progress: `${kept}/${state.startPrimary.length}` };
    }
    case 'habitatCount': {
      const n = state.cells.filter((c) => isNature(c) && o.habitats.includes(c.habitat)).length;
      return { met: n >= o.value, progress: `${n}/${o.value}` };
    }
    case 'happinessMin':
      return { met: state.happiness >= o.value, progress: `${state.happiness.toFixed(1)}` };
    case 'intactnessMin': {
      const v = intactness(state);
      return { met: v >= o.value - 1e-9, progress: `${Math.round(v * 100)}%` };
    }
    case 'residentsMin':
      return { met: state.residents >= o.value, progress: `${state.residents}/${o.value}` };
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
