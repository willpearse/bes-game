// One restrained 16-colour palette. Sprites refer to these by hex index (0-f); '.' is transparent.
export const PALETTE = [
  '#1b1b24', // 0 ink
  '#4a3b33', // 1 dark brown (peat, soil)
  '#8a6142', // 2 brown (bare earth)
  '#c9a36b', // 3 tan (sand, dry grass)
  '#f2e6c2', // 4 cream (walls, dunes)
  '#2f4a2f', // 5 dark green (forest)
  '#4d7a3a', // 6 green
  '#86b04a', // 7 light green
  '#c8d86b', // 8 pale green
  '#7a4f7a', // 9 heather purple
  '#1f3a5c', // a deep sea
  '#3a6ea5', // b water
  '#7fb2d6', // c light water
  '#b8433a', // d brick red
  '#e8b53a', // e gold
  '#8c8f99'  // f grey
];

export const hex = (i) => parseInt(PALETTE[i].slice(1), 16);

// UI colours drawn from the palette.
export const UI = {
  bg: hex(0),
  panel: 0x262633,
  panelLight: 0x333344,
  text: '#f2e6c2',
  dim: '#8c8f99',
  gold: '#e8b53a',
  good: '#86b04a',
  bad: '#d9634f',
  accent: '#7fb2d6'
};

// Single-hue ramps for service overlays (low -> high), and biodiversity.
export const OVERLAY_COLOURS = {
  POL: 0xe8b53a,
  WAT: 0x7fb2d6,
  FLD: 0x9aa6ff,
  AIR: 0x86b04a,
  REC: 0xef8f5a,
  BIO: 0x5fd068,
  WASTE: 0x8a6142
};
