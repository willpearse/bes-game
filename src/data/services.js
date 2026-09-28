// Player-facing ecosystem services and their IPBES Nature's Contributions to People (NCP).
// A built tile receives each service from the four squares touching it (N, E, S, W), capped at CONFIG.serviceCap.
export const SERVICE_KEYS = ['POL', 'GRN', 'WAT'];

export const SERVICES = {
  POL: { name: 'Pollination and pest control', short: 'Pollination', icon: 'icon_POL', ncp: [2, 10],
    ncpNames: ['Pollination and dispersal of seeds', 'Regulation of pests and diseases'],
    tip: 'Bees and other wildlife pollinate crops and eat pests. Farms earn more with it.' },
  GRN: { name: 'Green space and clean air', short: 'Green space', icon: 'icon_GRN', ncp: [3, 4, 15, 16, 17],
    ncpNames: ['Regulation of air quality', 'Regulation of climate', 'Learning and inspiration',
      'Physical and psychological experiences', 'Supporting identities'],
    tip: 'Lovely places to walk, and plants that clean and cool the air. Makes residents happier.' },
  WAT: { name: 'Clean water and flood protection', short: 'Water', icon: 'icon_WAT', ncp: [6, 7, 8, 9],
    ncpNames: ['Regulation of freshwater quantity', 'Regulation of freshwater quality', 'Formation of soils',
      'Regulation of hazards and extreme events'],
    tip: 'Wetlands and soils clean up waste, hold back floods and break storm waves.' }
};

// NCP shown elsewhere: 11-13 appear directly as GDP; NCP 1 is represented by B. 5, 14, 18 unused.
export const OTHER_NCP_NOTE = 'Energy, food and materials (NCP 11 to 13) show up directly as GDP from farms, forestry, fisheries and wind. Habitat (NCP 1) is shown as biodiversity.';
