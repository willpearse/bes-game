// Built tiles (section 6).
// uses: services that change the tile's GDP or its residents' wellbeing (animated as deliveries).
// placement: landNextToBuilt | moorOrHeath | landAnywhere | seaNextToBuiltLand | seaAnywhere | river
// upkeep: running cost each turn, paid whatever else happens.
// sewage: the tile is a sewage works (see CONFIG.sewageTreatPerTurn and engine/waste.js).
// waste: tokens made each turn. Nature touching the tile soaks some up (see CONFIG.wasteAbsorbDivisor); the rest
//   costs CONFIG.wasteBillPerToken each (the waste bill) and flows downhill.
// food: food made each turn, interpreted like gdp (base, serviceBonus). Residents eat CONFIG.foodPerResident each.
// soil: the tile has soil health (see CONFIG.soil); 'always' means it declines whatever nature touches it.
// reef: sea squares touching the tile are protected like a marine reserve (rig-to-reef).
// gdp: interpreted by engine/gdp.js. Keys:
//   base, serviceBonus {service, divisor}, nearbyResidential {radius, max},
//   wastePenalty {radius, amount}, pollutionPenalty {radius (null = always), divisor, max}
export const BUILDINGS = {
  cottages: {
    name: 'Cottages', role: 'homes', landUse: 'urban', intensity: 'light', cost: 2,
    gdp: { base: 1 }, waste: 1, residents: 1, wellbeingBase: 4, pressure: 1,
    placement: 'landNextToBuilt', tags: ['residential'], uses: ['GRN'],
    tip: 'Cosy homes. Happy residents make the whole economy work better.'
  },
  towerBlock: {
    name: 'Tower block', role: 'high-density homes', landUse: 'urban', intensity: 'intense', cost: 5,
    gdp: { base: 3 }, waste: 2, residents: 4, wellbeingBase: 3, pressure: 2,
    placement: 'landNextToBuilt', tags: ['residential'], uses: ['GRN'],
    tip: 'Lots of people on a small footprint.'
  },
  familyFarm: {
    name: 'Family farm', role: 'farm', landUse: 'cropland', intensity: 'light', cost: 3,
    gdp: { base: 1, serviceBonus: { service: 'POL', divisor: 2 } },
    food: { base: 1, serviceBonus: { service: 'POL', divisor: 2 } }, waste: 1, residents: 0, pressure: 1, soil: true,
    placement: 'landNextToBuilt', tags: ['farm'], uses: ['POL'],
    tip: 'Earns more, and grows more food, with pollinators nearby. Its soil wears out without water-holding nature touching it.'
  },
  hillFarm: {
    name: 'Hill farm', role: 'sheep grazing', landUse: 'pasture', intensity: 'light', cost: 2,
    gdp: { base: 2 }, food: { base: 1 }, waste: 0, residents: 0, pressure: 1,
    placement: 'moorOrHeath', tags: ['farm'],
    tip: 'Sheep on the hills. Only on moorland or heath.'
  },
  cluckTowers: {
    name: 'Cluck Towers', role: 'intensive poultry', landUse: 'cropland', intensity: 'intense', cost: 7,
    gdp: { base: 4 }, food: { base: 3 }, waste: 3, residents: 0, pressure: 2, nuisance: 2, soil: 'always',
    placement: 'landNextToBuilt', tags: ['farm'],
    tip: 'A great many chickens and a lot of food. Neighbours may notice the smell, and the soil always wears out.'
  },
  conifer: {
    name: 'Conifer plantation', role: 'forestry', landUse: 'plantation', intensity: 'light', cost: 3,
    gdp: { base: 2 }, waste: 0, residents: 0, pressure: 1,
    placement: 'landAnywhere', tags: [],
    tip: 'Neat rows of timber. Some shelter, less wildlife.'
  },
  holidayPark: {
    name: 'Holiday park', role: 'tourism', landUse: 'urban', intensity: 'light', cost: 4,
    gdp: {
      base: 1,
      serviceBonus: { service: 'GRN', divisor: 2 },
      wastePenalty: { radius: 1, amount: 2 },
      pollutionPenalty: { radius: 2, divisor: 5 }
    },
    waste: 1, residents: 0, pressure: 1,
    placement: 'landNextToBuilt', tags: [], uses: ['GRN'],
    tip: 'Visitors pay for green space and clean water.'
  },
  school: {
    name: 'School', role: 'education', landUse: 'urban', intensity: 'light', cost: 3,
    gdp: { base: 1 }, waste: 0, residents: 0, pressure: 1,
    wellbeingBonus: { radius: 3, amount: 1 },
    placement: 'landNextToBuilt', tags: [],
    tip: 'Cheers up homes within 3.'
  },
  hospital: {
    name: 'Hospital', role: 'health', landUse: 'urban', intensity: 'light', cost: 5,
    gdp: { base: 2 }, waste: 1, residents: 0, pressure: 1,
    wellbeingBonus: { radius: 4, amount: 2 },
    placement: 'landNextToBuilt', tags: [],
    tip: 'Cheers up homes within 4.'
  },
  businessPark: {
    name: 'Business park', role: 'offices', landUse: 'urban', intensity: 'light', cost: 6,
    gdp: { base: 2, nearbyResidential: { radius: 2, max: 2 } }, waste: 1, residents: 0, pressure: 1,
    placement: 'landNextToBuilt', tags: [],
    tip: 'Earns more with homes nearby (up to 2).'
  },
  factory: {
    name: 'Factory', role: 'industry', landUse: 'urban', intensity: 'intense', cost: 8,
    gdp: { base: 6 }, waste: 3, residents: 0, pressure: 2, nuisance: 2,
    placement: 'landNextToBuilt', tags: [],
    tip: 'Big earner, big mess.'
  },
  sewageWorks: {
    name: 'Sewage works', role: 'water treatment', landUse: 'urban', intensity: 'light', cost: 8,
    gdp: { base: 0 }, upkeep: 2, waste: 0, residents: 0, pressure: 1, sewage: true,
    placement: 'river', notBuiltNeighbour: true, tags: [],
    tip: 'Treats the waste flowing down the river. Costs £2 a turn to run. Too many homes upstream, or a flood, and it overflows.'
  },
  fishingFleet: {
    name: 'Fishing fleet', role: 'fishing', landUse: 'urban', intensity: 'intense', cost: 4,
    gdp: { base: 1, serviceBonus: { service: 'WAT', divisor: 2 }, pollutionPenalty: { radius: null, divisor: 5, max: 2 } },
    food: { base: 1, serviceBonus: { service: 'WAT', divisor: 2 } },
    waste: 0, residents: 0, pressure: 2,
    placement: 'seaAnywhere', noReserve: true, notBuiltNeighbour: true, tags: [], uses: ['WAT'],
    tip: 'Lands fish (food). Catches more in clean water, such as near seagrass nurseries. Hates pollution.'
  },
  windFarm: {
    name: 'Offshore wind farm', role: 'energy', landUse: 'urban', intensity: 'light', cost: 4,
    gdp: { base: 3 }, waste: 0, residents: 0, pressure: 0,
    placement: 'seaAnywhere', notBuiltNeighbour: true, reef: true, tags: [],
    tip: 'Clean power from the breeze. Its foundations become a reef: sea squares touching it are protected.'
  }
};

// Built tiles that supply services (base values, scaled by their own B).
export const BUILDING_SERVICES = {
  familyFarm: { POL: 1, GRN: 0, WAT: 0 },
  hillFarm:   { POL: 1, GRN: 1, WAT: 0 },
  conifer:    { POL: 0, GRN: 2, WAT: 1 }
};

// Wellbeing of residential tiles (section 9, step 8): base + green space received (capped)
// + best school + best hospital - nuisance - waste, clamped to min..max.
export const WELLBEING = {
  greenCap: 6, greenDivisor: 1,
  nuisanceMax: 4,
  wastePenaltyPer: 1, wastePenaltyMax: 3,
  min: 0, max: 10
};

// Farm tiles lose this much GDP per waste token on their own cell.
export const FARM_WASTE_GDP_PENALTY = 1;
