// Objectives (section 12). Conditions are interpreted in engine/objectives.js.
// `why` is shown on the title screen when the player picks their objectives.
export const OBJECTIVES = {
  cleanSeas: {
    name: 'Clean waters', text: 'Water pollution 2 or less', kind: 'pollutionMax', value: 2,
    why: 'Fishing and tourism depend on clean seas and lakes.'
  },
  ancientHeritage: {
    name: 'Ancient heritage', text: 'Keep every ancient habitat', kind: 'keepPrimary',
    why: 'Ancient habitats took centuries to form and cannot be recreated.'
  },
  wetlandCounty: {
    name: 'Wetland county', text: 'Create 2 new fen or peat bog cells', kind: 'habitatGain', habitats: ['fen', 'peat'], gain: 2,
    why: 'Wetlands store carbon, clean water and hold back floods.'
  },
  happyPlace: {
    name: 'Happy place', text: 'Happiness 8 or more', kind: 'happinessMin', value: 8,
    why: 'Nearby nature is good for mental and physical health.'
  },
  thrivingWildlife: {
    name: 'Thriving wildlife', text: 'Biodiversity intactness 70% or more', kind: 'intactnessMin', value: 0.7,
    why: 'Intact nature keeps delivering services for the long term.'
  },
  weatheredIt: {
    name: 'Weathered it', text: 'No tiles hit by any event', kind: 'noEventHits',
    why: 'Nature-based defences protect homes and businesses from extreme weather.'
  },
  farmToFork: {
    name: 'Farm to fork', text: '4 farms each getting pollination 3+', kind: 'farmsWithService', service: 'POL', min: 3, value: 4,
    why: 'Around three quarters of crop types benefit from animal pollinators.'
  },
  netGain: {
    name: 'Biodiversity net gain', text: 'End with at least the biodiversity you started with', kind: 'netGain',
    why: 'In England, most new developments must now leave nature better off than before.'
  },
  thirtyByThirty: {
    name: '30 by 30', text: '30% of land wild (minimal use) and 30% of sea in reserves', kind: 'thirtyByThirty', land: 0.3, sea: 0.3,
    why: 'The UK has pledged to protect 30% of its land and sea for nature by 2030.'
  },
  pollinatorParadise: {
    name: 'Pollinator paradise', text: 'No net loss of meadow and heath', kind: 'habitatGain', habitats: ['meadow', 'heath'], gain: 0,
    why: 'Britain has lost most of its wildflower meadows since the 1930s.'
  },
  blueCarbon: {
    name: 'Blue carbon', text: 'Gain 2 saltmarsh or seagrass cells', kind: 'habitatGain', habitats: ['saltmarsh', 'seagrass'], gain: 2,
    why: 'Coastal habitats lock away carbon and shelter young fish.'
  },
  rewilder: {
    name: 'Rewilder', text: 'Restore nature at least 5 times', kind: 'restorationsMin', value: 5,
    why: 'Restoration can bring back services that were lost.'
  },
  cleanRivers: {
    name: 'Clean rivers', text: 'No waste in any river at the end', kind: 'cleanRivers',
    why: 'Healthy rivers support wildlife, drinking water and recreation.'
  },
  naturePays: {
    name: 'Nature pays', text: "Half your GDP comes from nature's services", kind: 'natureShareMin', value: 0.5,
    why: "Much of the economy quietly depends on nature's services."
  },
  coastGuard: {
    name: 'Coast guard', text: 'At least 2 coastal tiles, all with water and flood protection 3+', kind: 'coastGuard',
    radius: 2, service: 'WAT', min: 3, atLeast: 2,
    why: 'Saltmarsh, dunes and seagrass soften storm waves for free.'
  }
};
