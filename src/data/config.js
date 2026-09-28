// Global constants and variant flags. Every tunable number lives in src/data/.
export const CONFIG = {
  mapId: 'estuary',
  turns: 24,
  eventTurns: [8, 16, 24],
  marketMode: 'market',        // 'market' | 'menu'
  marketSurcharge: [0, 0, 1, 2, 3, 4],
  wasteMode: 'tokens',         // 'tokens' | 'simple'
  happinessMode: 'perTurn',    // 'perTurn' | 'endGame'
  serviceCap: 6,
  objectiveBonus: 50,
  seed: null,                  // null = random

  // Extra constants not named in section 15 of the spec, kept here so logic has no magic numbers.
  stageStartTurns: { A: 1, B: 9, C: 17 },
  menuRestoreCost: 1,
  objectiveCount: 2,          // objectives the player keeps
  objectiveOffer: 4,          // objectives offered to choose from
  objectives: null,           // chosen objective ids; null = the first objectiveCount of the offer
  eventCount: 3,
  riverMaxSteps: 3,
  pollutionPressureThreshold: 10,  // water pollution at which every sea and lake cell gains 1 pressure
  pollutionRecoveryPerSeagrass: 0.5,
  pollutionDecay: 0.1,        // share of water pollution that disperses each turn (after seagrass)
  happinessGdpFactor: 0.1,
  happinessNeutral: 5,
  noResidentsHappiness: 5,
  eventDamageMultiplier: 4,   // damage to an unprotected tile = max(minimum, multiplier x its GDP this turn)
  eventDamageMinimum: 2,
  eventDestroyShare: 0.2,     // floods and storm surges wreck this share of the tiles they hit (rounded), most exposed first

  // Waste bill: nature touching a building soaks up 1 waste per wasteAbsorbDivisor water service it receives;
  // every token left over costs wasteBillPerToken and flows downhill.
  wasteAbsorbDivisor: 1.5,
  // A land nature square cleans waste on itself and the river beside it: its water service supply plus this, rounded
  // down, in tokens a turn (0.5 = round to the nearest, so meadow and heath clean 1).
  cleanRounding: 0.5,
  wasteBillPerToken: 1,
  // Chronic pollution makes clean-up dearer: +£1 a token per wasteBillPollutionStep of water pollution, up to wasteBillMax.
  wasteBillPollutionStep: 40,
  wasteBillMax: 2,

  // Soil health on farms that have it: 0..soilMax. Each turn it falls by 1 if the farm receives less than soilWater
  // water service (or always, for intensive farms), and recovers by 1 otherwise. Each missing point costs fertiliserPerPoint.
  soilMax: 3,
  soilWater: 2,
  fertiliserPerPoint: 1,

  // Food: each resident eats foodPerResident a turn; any shortfall is bought in at foodImportPrice a unit.
  foodPerResident: 1,
  foodImportPrice: 1,

  // Housing target (set per map): each resident short of it at the end costs this much.
  housingPenaltyPerResident: 10,
  eventProtectionThreshold: 3
};

// Maps pressure to use intensity (section 9, step 3): pressure >= min gives that intensity.
// Used when a map does not set its own. A config value (tests, URL) still beats the map's.
export const MAP_DEFAULTS = {
  startingCash: 10,
  housingTarget: 16,
  goldScore: 600      // score needed (with silver) for a gold medal; about the greedy bot's average on the map
};

// Medals, best first. Platinum (a personal best on this device) is awarded by the UI, not the engine.
export const MEDALS = ['gold', 'silver', 'bronze'];

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
