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
  beaverDam: {
    name: 'Welcome beavers', short: 'Beavers', icon: 'act_beaverDam', result: null, dam: true,
    habitats: ['river'], buildings: [],
    // A dammed river square adds these services (scaled by its B), holds waste flowing down for a turn,
    // and cleans up to \`cleans\` tokens a turn on itself and the river squares touching it.
    addsServices: { POL: 0, GRN: 1, WAT: 2 }, cleans: 3,
    tip: 'Beavers build a dam on this stretch of river. It slows the water, traps and cleans waste, and holds back floods.'
  },
  marineReserve: {
    name: 'Marine reserve', short: 'Sea reserve', icon: 'act_marineReserve', result: null, reserve: true,
    habitats: ['openSea', 'seagrass'], buildings: [],
    tip: 'Protects nearby sea. Open sea grows seagrass after 4 turns.'
  }
};

export const RESTORATION_KEYS = Object.keys(RESTORATIONS);
