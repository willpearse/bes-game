// Restoration actions (section 7).
// targets: habitat keys (nature cells) and building keys (built cells, demolished with no refund).
export const RESTORATIONS = {
  plantWoodland: {
    name: 'Plant woodland', short: 'Woodland', icon: 'act_plantWoodland', result: 'woodland',
    habitats: ['meadow', 'heath', 'moorland', 'bare'], buildings: ['familyFarm', 'hillFarm', 'conifer'],
    tip: 'Turns the cell into young broadleaf woodland.'
  },
  restoreWetland: {
    name: 'Restore wetland', short: 'Wetland', icon: 'act_restoreWetland', result: 'fen',
    habitats: ['meadow', 'bare'], buildings: ['familyFarm', 'hillFarm'], nextToWater: true,
    tip: 'Fen next to a river or lake. Great at cleaning water and holding floods.'
  },
  sowMeadow: {
    name: 'Sow wildflower meadow', short: 'Meadow', icon: 'act_sowMeadow', result: 'meadow',
    habitats: ['bare'], buildings: ['familyFarm', 'hillFarm', 'conifer'],
    tip: 'Turns bare ground, farmland or plantation into meadow.'
  },
  rewetPeat: {
    name: 'Rewet peat', short: 'Peat bog', icon: 'act_rewetPeat', result: 'peat',
    habitats: ['moorland'], buildings: [],
    tip: 'Blocks drains on moorland so peat bog can form again.'
  },
  marineReserve: {
    name: 'Marine reserve', short: 'Sea reserve', icon: 'act_marineReserve', result: null, reserve: true,
    habitats: ['openSea', 'seagrass'], buildings: [],
    tip: 'Protects nearby sea. Open sea grows seagrass after 4 turns.'
  }
};

export const RESTORATION_KEYS = Object.keys(RESTORATIONS);
