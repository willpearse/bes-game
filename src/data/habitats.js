// Habitats (section 5). Map codes: uppercase = primary, lowercase = matureSecondary.
// services: base supply of POL (pollination), GRN (green space and clean air), WAT (clean water and flood
// protection), multiplied by the cell's B. A land nature cell also cleans waste: its WAT supply, rounded down, in tokens a turn.
// buildable: 'land' (land builds), 'sea' (sea builds), 'none'.
export const HABITATS = {
  peat:      { code: 'p', name: 'Peat bog',           services: { POL: 0, GRN: 2, WAT: 3 }, buildable: 'land', marine: false },
  moorland:  { code: 'm', name: 'Upland moorland',    services: { POL: 1, GRN: 2, WAT: 1 }, buildable: 'land', marine: false },
  heath:     { code: 'h', name: 'Lowland heath',      services: { POL: 2, GRN: 2, WAT: 1 }, buildable: 'land', marine: false },
  meadow:    { code: 'g', name: 'Wildflower meadow',  services: { POL: 3, GRN: 2, WAT: 1 }, buildable: 'land', marine: false },
  woodland:  { code: 'w', name: 'Broadleaf woodland', services: { POL: 2, GRN: 3, WAT: 2 }, buildable: 'land', marine: false },
  fen:       { code: 'f', name: 'Fen and reedbed',    services: { POL: 1, GRN: 2, WAT: 3 }, buildable: 'land', marine: false },
  river:     { code: 'r', name: 'River',              services: { POL: 0, GRN: 2, WAT: 0 }, buildable: 'none', marine: false, water: true },
  lake:      { code: 'l', name: 'Lake',               services: { POL: 0, GRN: 3, WAT: 1 }, buildable: 'none', marine: false, water: true },
  saltmarsh: { code: 's', name: 'Saltmarsh',          services: { POL: 0, GRN: 1, WAT: 3 }, buildable: 'land', marine: false },
  dunes:     { code: 'd', name: 'Sand dunes',         services: { POL: 1, GRN: 2, WAT: 2 }, buildable: 'land', marine: false },
  seagrass:  { code: 'z', name: 'Seagrass meadow',    services: { POL: 0, GRN: 1, WAT: 3 }, buildable: 'none', marine: true },
  openSea:   { code: 'o', name: 'Open sea',           services: { POL: 0, GRN: 1, WAT: 0 }, buildable: 'sea', marine: true }
};
