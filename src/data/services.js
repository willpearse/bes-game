// Player-facing ecosystem services and their IPBES Nature's Contributions to People (NCP).
export const SERVICE_KEYS = ['POL', 'WAT', 'FLD', 'AIR', 'REC'];

export const SERVICES = {
  POL: { name: 'Pollination and pest control', short: 'Pollination', icon: 'icon_POL', ncp: [2, 10], radius: 1,
    ncpNames: ['Pollination and dispersal of seeds', 'Regulation of pests and diseases'],
    tip: 'Bees and other wildlife pollinate crops and eat pests.' },
  WAT: { name: 'Clean water', short: 'Water', icon: 'icon_WAT', ncp: [6, 7, 8], radius: 2,
    ncpNames: ['Regulation of freshwater quantity', 'Regulation of freshwater quality', 'Formation of soils'],
    tip: 'Wetlands and soils keep water flowing and clean.' },
  FLD: { name: 'Flood and storm protection', short: 'Flood defence', icon: 'icon_FLD', ncp: [9], radius: 2,
    ncpNames: ['Regulation of hazards and extreme events'],
    tip: 'Marshes, dunes and bogs soak up floods and break storm waves.' },
  AIR: { name: 'Clean air and climate', short: 'Air and climate', icon: 'icon_AIR', ncp: [3, 4], radius: 2,
    ncpNames: ['Regulation of air quality', 'Regulation of climate'],
    tip: 'Plants clean the air, cool the land and lock up carbon.' },
  REC: { name: 'Recreation and inspiration', short: 'Recreation', icon: 'icon_REC', ncp: [15, 16, 17], radius: 2,
    ncpNames: ['Learning and inspiration', 'Physical and psychological experiences', 'Supporting identities'],
    tip: 'Lovely places to walk, learn and feel at home.' }
};

// NCP shown elsewhere: 11-13 appear directly as GDP; NCP 1 is represented by B. 5, 14, 18 unused.
export const OTHER_NCP_NOTE = 'Energy, food and materials (NCP 11 to 13) show up directly as GDP from farms, forestry, fisheries and wind. Habitat (NCP 1) is shown as biodiversity.';
