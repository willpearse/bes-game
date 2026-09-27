// Derives visual state variants of sprites (pure functions on palette-index strings).
import { NATURE_SPRITES, ICON_SPRITES } from './sprites.js';

const hash = (x, y, salt) => {
  let h = (x * 374761393 + y * 668265263 + salt * 2246822519) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return (h ^ (h >>> 16)) % 100;
};

const INTENSITY_BARE = { minimal: 0, light: 18, intense: 48 };
const KEEP_BY_LANDUSE = { youngSecondary: 30, intermediateSecondary: 65 };

export function landUseVariant(landUse) {
  if (landUse === 'youngSecondary') return 'y';
  if (landUse === 'intermediateSecondary') return 'i';
  return 'n';
}

export function natureKey(habitat, intensity, landUse) {
  return `hab_${habitat}_${intensity}_${landUseVariant(landUse)}`;
}

// Returns 16 rows for a habitat at the given intensity and succession variant ('n', 'i', 'y').
export function natureRows(habitat, intensity, variant) {
  const spr = NATURE_SPRITES[habitat];
  const out = spr.rows.map((r) => r.split(''));
  const keep = variant === 'y' ? KEEP_BY_LANDUSE.youngSecondary : variant === 'i' ? KEEP_BY_LANDUSE.intermediateSecondary : 100;
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const ch = out[y][x];
      if (!spr.veg.includes(ch)) continue;
      if (keep < 100 && hash(x, y, 1) >= keep) out[y][x] = spr.ground;
      const bare = INTENSITY_BARE[intensity];
      if (bare > 0 && spr.bare.length && hash(x, y, 2) < bare) {
        out[y][x] = spr.bare[hash(x, y, 3) < 60 ? 0 : spr.bare.length - 1];
      }
    }
  }
  // Young and intermediate woodland get visible saplings.
  if (habitat === 'woodland' && variant !== 'n') {
    const spots = variant === 'y' ? [[1, 0], [8, -2], [3, 6], [10, 5]] : [[0, -3], [7, -4], [2, 3], [9, 2], [5, 7]];
    for (const [ox, oy] of spots) stamp(out, ICON_SPRITES.sapling, ox, oy);
  }
  return out.map((r) => r.join(''));
}

function stamp(rows, sprite, ox, oy) {
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const ch = sprite[y][x];
      const tx = x + ox;
      const ty = y + oy;
      if (ch !== '.' && tx >= 0 && ty >= 0 && tx < 16 && ty < 16) rows[ty][tx] = ch;
    }
  }
}
