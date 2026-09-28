// One restrained 16-colour palette. Sprites refer to these by hex index (0-f); '.' is transparent.
export const PALETTE = [
  '#3b2d3f', // 0 outline (soft plum)
  '#5e4033', // 1 dark brown (peat, soil)
  '#a0714c', // 2 brown (bare earth, wood)
  '#dcb47e', // 3 tan (sand, dry grass)
  '#fdf3dc', // 4 cream (walls, dunes, sheep)
  '#2f6243', // 5 dark green (forest)
  '#4f9c4f', // 6 green
  '#8dcb5e', // 7 light green
  '#d9ec8e', // 8 pale green
  '#a578c2', // 9 heather purple
  '#2a4f84', // a deep sea
  '#4a8fd0', // b water
  '#a4d8f2', // c light water
  '#e8676a', // d red (roofs, cheeks)
  '#f7cb52', // e gold
  '#a3acbf'  // f grey
];

export const hex = (i) => parseInt(PALETTE[i].slice(1), 16);

// UI colours drawn from the palette.
export const UI = {
  bg: 0x1b1b24,
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
  GRN: 0x86b04a,
  WAT: 0x7fb2d6,
  BIO: 0x5fd068,
  WASTE: 0x8a6142
};
