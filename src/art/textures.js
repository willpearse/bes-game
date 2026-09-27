// Derives visual state variants of sprites (pure functions on palette-index strings).
import { NATURE_SPRITES, SPRITE_SIZE } from './sprites.js';

const N = SPRITE_SIZE;

const hash = (x, y, salt) => {
  let h = (x * 374761393 + y * 668265263 + salt * 2246822519) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

// Smooth, tileable value noise in 0..1, so bare ground appears in soft patches, not speckles.
function noise(x, y, salt) {
  let total = 0;
  let weight = 0;
  for (const [cell, w] of [[8, 0.7], [4, 0.3]]) {
    const g = N / cell;
    const gx = x / cell;
    const gy = y / cell;
    const x0 = Math.floor(gx);
    const y0 = Math.floor(gy);
    const fx = gx - x0;
    const fy = gy - y0;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const v = (i, j) => hash(((x0 + i) % g + g) % g, ((y0 + j) % g + g) % g, salt + cell);
    const top = v(0, 0) * (1 - sx) + v(1, 0) * sx;
    const bottom = v(0, 1) * (1 - sx) + v(1, 1) * sx;
    total += w * (top * (1 - sy) + bottom * sy);
    weight += w;
  }
  return total / weight;
}

// Fraction of vegetation that turns bare at each use intensity.
const INTENSITY_BARE = { minimal: 0, light: 0.2, intense: 0.5 };
// Fraction of vegetation kept by succession stage (when a habitat has no hand-drawn rows).
const KEEP = { y: 0.35, i: 0.7, n: 1 };

// Noise field for a salt, with the value below which a fraction f of its pixels fall.
const fields = new Map();
function field(salt) {
  if (!fields.has(salt)) {
    const values = [];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) values.push(noise(x, y, salt));
    const sorted = values.slice().sort((a, b) => a - b);
    fields.set(salt, { at: (x, y) => values[y * N + x], quantile: (f) => sorted[Math.min(sorted.length - 1, Math.floor(f * sorted.length))] });
  }
  return fields.get(salt);
}

const saltFor = (name) => [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % 1000;

export function landUseVariant(landUse) {
  if (landUse === 'youngSecondary') return 'y';
  if (landUse === 'intermediateSecondary') return 'i';
  return 'n';
}

export function natureKey(habitat, intensity, landUse) {
  return `hab_${habitat}_${intensity}_${landUseVariant(landUse)}`;
}

// Returns SPRITE_SIZE rows for a habitat at the given intensity and succession variant ('n', 'i', 'y').
export function natureRows(habitat, intensity, variant) {
  const spr = NATURE_SPRITES[habitat];
  let src = spr.rows;
  let keep = KEEP[variant];
  if (variant === 'y' && spr.young) { src = spr.young; keep = 1; }
  if (variant === 'i' && spr.intermediate) { src = spr.intermediate; keep = 1; }
  const out = src.map((r) => r.split(''));
  const bare = INTENSITY_BARE[intensity];
  const thin = field(saltFor(habitat) + 1);
  const wear = field(saltFor(habitat) + 2);
  const keepLimit = thin.quantile(keep);
  const bareLimit = wear.quantile(bare);
  const bareCore = wear.quantile(bare * 0.45);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const ch = out[y][x];
      if (!spr.veg.includes(ch)) continue;
      if (keep < 1 && thin.at(x, y) > keepLimit) out[y][x] = spr.ground;
      if (bare > 0 && spr.bare.length && wear.at(x, y) < bareLimit) {
        // Darker bare colour in the middle of each patch.
        out[y][x] = spr.bare[wear.at(x, y) < bareCore ? spr.bare.length - 1 : 0];
      }
    }
  }
  return out.map((r) => r.join(''));
}
