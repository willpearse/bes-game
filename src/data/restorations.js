// Restoration actions (section 7).
// targets: habitat keys (nature cells) and building keys (built cells, demolished with no refund).
export const RESTORATIONS = {
  plantWoodland: {
    name: 'Plant woodland', result: 'woodland',
    habitats: ['meadow', 'heath', 'moorland'], buildings: ['familyFarm', 'hillFarm', 'conifer'],
    tip: 'Turns the cell into young broadleaf woodland.'
  },
  restoreWetland: {
    name: 'Restore wetland', result: 'fen',
    habitats: ['meadow'], buildings: ['familyFarm', 'hillFarm'], nextToWater: true,
    tip: 'Fen next to a river or lake. Great at cleaning water and holding floods.'
  },
  sowMeadow: {
    name: 'Sow wildflower meadow', result: 'meadow',
    habitats: [], buildings: ['familyFarm', 'hillFarm', 'conifer'],
    tip: 'Turns farmland or plantation back into meadow.'
  },
  rewetPeat: {
    name: 'Rewet peat', result: 'peat',
    habitats: ['moorland'], buildings: [],
    tip: 'Blocks drains on moorland so peat bog can form again.'
  },
  marineReserve: {
    name: 'Marine reserve', result: null, reserve: true,
    habitats: ['openSea', 'seagrass'], buildings: [],
    tip: 'Protects nearby sea. Open sea grows seagrass after 4 turns.'
  }
};

export const RESTORATION_KEYS = Object.keys(RESTORATIONS);
