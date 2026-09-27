// Built tiles (section 6).
// placement: landNextToBuilt | moorOrHeath | landAnywhere | seaNextToBuiltLand | seaAnywhere
// gdp: interpreted by engine/gdp.js. Keys:
//   base, serviceBonus {service, divisor}, nearbyResidential {radius, max},
//   primaryBonus {radius, amount}, wastePenalty {radius, amount},
//   seaPollutionPenalty {radius (null = always), divisor}, seagrassBonus {radius, max}
export const BUILDINGS = {
  cottages: {
    name: 'Cottages', role: 'homes', landUse: 'urban', intensity: 'light', cost: 2,
    gdp: { base: 1 }, waste: 1, residents: 1, wellbeingBase: 5, pressure: 1,
    placement: 'landNextToBuilt', tags: ['residential'],
    tip: 'Cosy homes. Happy residents make the whole economy work better.'
  },
  towerBlock: {
    name: 'Tower block', role: 'high-density homes', landUse: 'urban', intensity: 'intense', cost: 5,
    gdp: { base: 3 }, waste: 2, residents: 4, wellbeingBase: 4, pressure: 2,
    placement: 'landNextToBuilt', tags: ['residential'],
    tip: 'Lots of people on a small footprint.'
  },
  familyFarm: {
    name: 'Family farm', role: 'farm', landUse: 'cropland', intensity: 'light', cost: 3,
    gdp: { base: 1, serviceBonus: { service: 'POL', divisor: 2 } }, waste: 1, residents: 0, pressure: 1,
    placement: 'landNextToBuilt', tags: ['farm'],
    tip: 'Earns more with pollinators nearby.'
  },
  hillFarm: {
    name: 'Hill farm', role: 'sheep grazing', landUse: 'pasture', intensity: 'light', cost: 2,
    gdp: { base: 2 }, waste: 0, residents: 0, pressure: 1,
    placement: 'moorOrHeath', tags: ['farm'],
    tip: 'Sheep on the hills. Only on moorland or heath.'
  },
  cluckTowers: {
    name: 'Cluck Towers', role: 'intensive poultry', landUse: 'cropland', intensity: 'intense', cost: 5,
    gdp: { base: 5 }, waste: 3, residents: 0, pressure: 2, nuisance: 2,
    placement: 'landNextToBuilt', tags: ['farm'],
    tip: 'A great many chickens. Neighbours may notice the smell.'
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
      serviceBonus: { service: 'REC', divisor: 2 },
      primaryBonus: { radius: 2, amount: 1 },
      wastePenalty: { radius: 1, amount: 2 },
      seaPollutionPenalty: { radius: 2, divisor: 5 }
    },
    waste: 1, residents: 0, pressure: 1,
    placement: 'landNextToBuilt', tags: [],
    tip: 'Visitors pay for views and clean beaches.'
  },
  school: {
    name: 'School', role: 'education', landUse: 'urban', intensity: 'light', cost: 3,
    gdp: { base: 1 }, waste: 0, residents: 0, pressure: 1,
    wellbeingBonus: { radius: 3, amount: 1, boostedAmount: 2, boost: { forestSchool: 2 } },
    placement: 'landNextToBuilt', tags: [],
    tip: 'Cheers up homes within 3. A forest school (2+ nature neighbours) does even better.'
  },
  hospital: {
    name: 'Hospital', role: 'health', landUse: 'urban', intensity: 'light', cost: 5,
    gdp: { base: 2 }, waste: 1, residents: 0, pressure: 1,
    wellbeingBonus: { radius: 4, amount: 1, boostedAmount: 2, boost: { service: 'AIR', min: 3 } },
    placement: 'landNextToBuilt', tags: [],
    tip: 'Cheers up homes within 4, more so with clean air.'
  },
  businessPark: {
    name: 'Business park', role: 'offices', landUse: 'urban', intensity: 'light', cost: 4,
    gdp: { base: 2, nearbyResidential: { radius: 2, max: 3 } }, waste: 1, residents: 0, pressure: 1,
    placement: 'landNextToBuilt', tags: [],
    tip: 'Earns more with homes nearby.'
  },
  factory: {
    name: 'Factory', role: 'industry', landUse: 'urban', intensity: 'intense', cost: 5,
    gdp: { base: 6 }, waste: 3, residents: 0, pressure: 2, nuisance: 2,
    placement: 'landNextToBuilt', tags: [],
    tip: 'Big earner, big mess.'
  },
  recycling: {
    name: 'Recycling centre', role: 'waste', landUse: 'urban', intensity: 'light', cost: 3,
    gdp: { base: 0 }, waste: 0, residents: 0, pressure: 1, recycles: 3,
    placement: 'landNextToBuilt', tags: [],
    tip: 'Clears up to 3 waste a turn from its own and neighbouring cells.'
  },
  harbour: {
    name: 'Harbour', role: 'port', landUse: 'urban', intensity: 'intense', cost: 5,
    gdp: { base: 5 }, waste: 2, residents: 0, pressure: 2, nuisance: 2,
    placement: 'seaNextToBuiltLand', noReserve: true, tags: [],
    tip: 'Open sea, next to a built land tile.'
  },
  fishingFleet: {
    name: 'Fishing fleet', role: 'fishing', landUse: 'urban', intensity: 'intense', cost: 3,
    gdp: { base: 1, seagrassBonus: { radius: 2, max: 3 }, seaPollutionPenalty: { radius: null, divisor: 5 } },
    waste: 0, residents: 0, pressure: 2,
    placement: 'seaAnywhere', noReserve: true, notBuiltNeighbour: true, tags: [],
    tip: 'Catches more near healthy seagrass nurseries.'
  },
  windFarm: {
    name: 'Offshore wind farm', role: 'energy', landUse: 'urban', intensity: 'light', cost: 4,
    gdp: { base: 3 }, waste: 0, residents: 0, pressure: 0,
    placement: 'seaAnywhere', notBuiltNeighbour: true, tags: [],
    tip: 'Clean power from the breeze.'
  }
};

// Built tiles that supply services (base values, scaled by their own B).
export const BUILDING_SERVICES = {
  familyFarm: { POL: 1, WAT: 0, FLD: 0, AIR: 0, REC: 0 },
  hillFarm:   { POL: 1, WAT: 0, FLD: 0, AIR: 0, REC: 1 },
  conifer:    { POL: 0, WAT: 0, FLD: 1, AIR: 2, REC: 1 }
};

// Wellbeing rules for residential tiles (section 9, step 8).
export const WELLBEING = {
  recCap: 6, recDivisor: 2,
  airCap: 6, airDivisor: 3,
  lowWaterThreshold: 2, lowWaterPenalty: 1,
  nuisanceMax: 4,
  wastePenaltyPer: 1, wastePenaltyMax: 3,
  min: 0, max: 10
};

// Farm tiles lose this much GDP per waste token on their own cell.
export const FARM_WASTE_GDP_PENALTY = 1;
