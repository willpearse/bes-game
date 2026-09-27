// Objectives (section 12). Conditions are interpreted in engine/objectives.js.
export const OBJECTIVES = {
  cleanSeas:        { name: 'Clean seas',         text: 'Sea pollution 2 or less',                   kind: 'seaPollutionMax', value: 2 },
  ancientHeritage:  { name: 'Ancient heritage',   text: 'Keep every ancient habitat',                kind: 'keepPrimary' },
  wetlandCounty:    { name: 'Wetland county',     text: 'At least 3 fen or peat bog cells',          kind: 'habitatCount', habitats: ['fen', 'peat'], value: 3 },
  happyPlace:       { name: 'Happy place',        text: 'Happiness 8 or more',                       kind: 'happinessMin', value: 8 },
  thrivingWildlife: { name: 'Thriving wildlife',  text: 'Biodiversity intactness 70% or more',       kind: 'intactnessMin', value: 0.7 },
  growingCommunity: { name: 'Growing community',  text: 'At least 12 residents',                     kind: 'residentsMin', value: 12 },
  weatheredIt:      { name: 'Weathered it',       text: 'No tiles hit by any event',                 kind: 'noEventHits' },
  farmToFork:       { name: 'Farm to fork',       text: '4 farms each getting pollination 3+',       kind: 'farmsWithService', service: 'POL', min: 3, value: 4 }
};
