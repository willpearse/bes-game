// Events (section 11). atRisk and protection rules are interpreted in engine/events.js.
export const EVENTS = {
  riverFlood: {
    name: 'River flood', verb: 'the river flood',
    atRisk: [{ nearHabitats: ['river', 'lake'], radius: 1 }],
    protection: [{ service: 'WAT', min: 3 }],
    blurb: 'Heavy rain upstream. Tiles next to rivers and lakes are at risk unless wetlands and woods hold the water back.'
  },
  stormSurge: {
    name: 'Storm surge', verb: 'the storm surge',
    atRisk: [{ nearMarine: true, radius: 2 }],
    protection: [{ service: 'WAT', min: 3 }],
    blurb: 'A winter storm drives the sea inland. Coastal tiles need saltmarsh, dunes or seagrass to break the waves.'
  },
  heatwave: {
    name: 'Heatwave and drought', verb: 'the heatwave',
    atRisk: [{ tag: 'residential', service: 'GRN', min: 3 }, { tag: 'farm', service: 'WAT', min: 3 }],
    blurb: 'A scorching summer. Homes need shady green space; farms need water.'
  },
  pestOutbreak: {
    name: 'Pest outbreak', verb: 'the pest outbreak',
    atRisk: [{ buildings: ['familyFarm', 'conifer'], service: 'POL', min: 3 }],
    blurb: 'Aphids and beetles everywhere. Crops and plantations need natural pest control.'
  }
};
