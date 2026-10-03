// Pieces a child can place. Visitors ask for people pieces; the child chooses a nature piece.
export const PIECES = {
  house: { kind: 'people', name: 'house' },
  veg: { kind: 'people', name: 'veg patch' },
  flowers: { kind: 'nature', name: 'flowers', helps: 'veg' },
  tree: { kind: 'nature', name: 'tree', helps: 'house' },
  reeds: { kind: 'nature', name: 'reeds', helps: 'house' }
};

export const NATURE_PIECES = ['flowers', 'tree', 'reeds'];

// Animal families who visit, one per turn.
export const ANIMALS = ['rabbit', 'hedgehog', 'fox', 'mouse'];
