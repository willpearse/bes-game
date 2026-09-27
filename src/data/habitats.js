// Habitats (section 5). Map codes: uppercase = primary, lowercase = matureSecondary.
// buildable: 'land' (land builds), 'sea' (sea builds), 'none'.
// cleans: waste tokens removed per turn (null = not applicable, marine).
export const HABITATS = {
  peat:      { code: 'p', name: 'Peat bog',           services: { POL: 0, WAT: 3, FLD: 2, AIR: 3, REC: 1 }, cleans: 1, buildable: 'land', marine: false },
  moorland:  { code: 'm', name: 'Upland moorland',    services: { POL: 1, WAT: 2, FLD: 1, AIR: 1, REC: 2 }, cleans: 0, buildable: 'land', marine: false },
  heath:     { code: 'h', name: 'Lowland heath',      services: { POL: 2, WAT: 1, FLD: 0, AIR: 1, REC: 2 }, cleans: 1, buildable: 'land', marine: false },
  meadow:    { code: 'g', name: 'Wildflower meadow',  services: { POL: 3, WAT: 1, FLD: 1, AIR: 1, REC: 2 }, cleans: 1, buildable: 'land', marine: false },
  woodland:  { code: 'w', name: 'Broadleaf woodland', services: { POL: 2, WAT: 2, FLD: 2, AIR: 3, REC: 3 }, cleans: 1, buildable: 'land', marine: false },
  fen:       { code: 'f', name: 'Fen and reedbed',    services: { POL: 1, WAT: 3, FLD: 3, AIR: 2, REC: 2 }, cleans: 2, buildable: 'land', marine: false },
  river:     { code: 'r', name: 'River',              services: { POL: 0, WAT: 1, FLD: 0, AIR: 0, REC: 2 }, cleans: 0, buildable: 'none', marine: false, water: true },
  lake:      { code: 'l', name: 'Lake',               services: { POL: 0, WAT: 2, FLD: 1, AIR: 0, REC: 3 }, cleans: 0, buildable: 'none', marine: false, water: true },
  saltmarsh: { code: 's', name: 'Saltmarsh',          services: { POL: 0, WAT: 2, FLD: 3, AIR: 2, REC: 1 }, cleans: 2, buildable: 'land', marine: false },
  dunes:     { code: 'd', name: 'Sand dunes',         services: { POL: 1, WAT: 0, FLD: 3, AIR: 0, REC: 3 }, cleans: 0, buildable: 'land', marine: false },
  seagrass:  { code: 'z', name: 'Seagrass meadow',    services: { POL: 0, WAT: 2, FLD: 1, AIR: 2, REC: 1 }, cleans: null, buildable: 'none', marine: true },
  openSea:   { code: 'o', name: 'Open sea',           services: { POL: 0, WAT: 0, FLD: 0, AIR: 0, REC: 1 }, cleans: null, buildable: 'sea', marine: true }
};

// Habitats whose cells clean adjacent river cells (riparian buffer, section 10.1).
export const RIPARIAN_HABITATS = ['fen', 'saltmarsh'];
export const RIPARIAN_CLEAN = 1;
