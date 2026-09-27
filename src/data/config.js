// Global constants and variant flags. Every tunable number lives in src/data/.
export const CONFIG = {
  mapId: 'estuary',
  turns: 24,
  eventTurns: [8, 16, 24],
  startingCash: 10,
  marketMode: 'market',        // 'market' | 'menu'
  marketSurcharge: [0, 0, 1, 2, 3, 4],
  wasteMode: 'tokens',         // 'tokens' | 'simple'
  happinessMode: 'perTurn',    // 'perTurn' | 'endGame'
  populationPressure: false,
  pressureThresholds: [10, 20, 30, 40],
  serviceCap: 6,
  objectiveBonus: 50,
  seed: null,                  // null = random

  // Extra constants not named in section 15 of the spec, kept here so logic has no magic numbers.
  stageStartTurns: { A: 1, B: 9, C: 17 },
  menuRestoreCost: 1,
  objectiveCount: 2,
  eventCount: 3,
  riverMaxSteps: 3,
  seaPollutionPressureThreshold: 10,
  seaRecoveryPerSeagrass: 0.5,
  lakePollutionSupplyPenalty: 0.1,
  happinessGdpFactor: 0.1,
  happinessNeutral: 5,
  noResidentsHappiness: 5,
  populationPressurePenalty: 0.5,
  eventDamageMultiplier: 4,
  eventDamageMinimum: 2,
  eventProtectionThreshold: 3
};

// Maps pressure to use intensity (section 9, step 3): pressure >= min gives that intensity.
export const PRESSURE_TO_INTENSITY = [
  { min: 3, intensity: 'intense' },
  { min: 1, intensity: 'light' },
  { min: 0, intensity: 'minimal' }
];

export const INTENSITIES = ['minimal', 'light', 'intense'];

// Restored vegetation succession (section 7): age thresholds.
export const SUCCESSION = [
  { from: 'youngSecondary', to: 'intermediateSecondary', age: 3 },
  { from: 'intermediateSecondary', to: 'matureSecondary', age: 7 }
];

// Open-sea marine reserve turns into young seagrass at this age.
export const RESERVE_SEAGRASS_AGE = 4;
