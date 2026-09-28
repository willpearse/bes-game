#!/usr/bin/env node
// Generates src/art/sprites.js: 32x32 sprites as palette-index strings.
//   node scripts/draw-sprites.js
// The output file is plain data, so an artist can edit it by hand or replace it
// with strings exported from a real spritesheet. This script is just a quick way
// to draw rounded, "cute" shapes without typing 32x32 grids by hand.
import { writeFileSync } from 'node:fs';

const N = 32;

// ---------- tiny raster canvas ----------

class Canvas {
  constructor(fill = '.') {
    this.px = Array.from({ length: N }, () => Array(N).fill(fill));
  }
  set(x, y, c) {
    x = Math.round(x); y = Math.round(y);
    if (x >= 0 && y >= 0 && x < N && y < N && c != null) this.px[y][x] = c;
    return this;
  }
  get(x, y) {
    x = Math.round(x); y = Math.round(y);
    return x >= 0 && y >= 0 && x < N && y < N ? this.px[y][x] : '.';
  }
  rect(x, y, w, h, c) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c);
    return this;
  }
  // Rounded rectangle with corner radius r.
  rrect(x, y, w, h, r, c) {
    for (let j = y; j < y + h; j++) {
      for (let i = x; i < x + w; i++) {
        const dx = Math.max(x + r - i - 0.5, 0, i + 0.5 - (x + w - r));
        const dy = Math.max(y + r - j - 0.5, 0, j + 0.5 - (y + h - r));
        if (dx * dx + dy * dy <= r * r + 0.3) this.set(i, j, c);
      }
    }
    return this;
  }
  ellipse(cx, cy, rx, ry, c) {
    for (let j = Math.floor(cy - ry); j <= Math.ceil(cy + ry); j++) {
      for (let i = Math.floor(cx - rx); i <= Math.ceil(cx + rx); i++) {
        const dx = (i - cx) / (rx + 0.35);
        const dy = (j - cy) / (ry + 0.35);
        if (dx * dx + dy * dy <= 1) this.set(i, j, c);
      }
    }
    return this;
  }
  circle(cx, cy, r, c) {
    return this.ellipse(cx, cy, r, r, c);
  }
  line(x0, y0, x1, y1, c, w = 1) {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2 + 1;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const x = x0 + (x1 - x0) * t;
      const y = y0 + (y1 - y0) * t;
      if (w <= 1) this.set(x, y, c);
      else this.circle(x, y, (w - 1) / 2, c);
    }
    return this;
  }
  poly(points, c) {
    const ys = points.map((p) => p[1]);
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
      const xs = [];
      for (let i = 0; i < points.length; i++) {
        const [x0, y0] = points[i];
        const [x1, y1] = points[(i + 1) % points.length];
        if ((y0 <= y + 0.5 && y1 > y + 0.5) || (y1 <= y + 0.5 && y0 > y + 0.5)) {
          xs.push(x0 + ((y + 0.5 - y0) / (y1 - y0)) * (x1 - x0));
        }
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (let x = Math.ceil(xs[k] - 0.5); x <= Math.floor(xs[k + 1] - 0.5); x++) this.set(x, y, c);
      }
    }
    return this;
  }
  // Soft outline: colour c on transparent pixels touching a filled pixel (4-neighbour).
  outline(c = '0') {
    const add = [];
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        if (this.px[y][x] !== '.') continue;
        if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => this.get(x + dx, y + dy) !== '.' && this.get(x + dx, y + dy) !== c)) add.push([x, y]);
      }
    }
    for (const [x, y] of add) this.px[y][x] = c;
    return this;
  }
  rows() {
    return this.px.map((r) => r.join(''));
  }
}

// Deterministic pseudo-random scatter.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Places n points spread out (rejection sampling on distance), wrapping at edges.
function scatter(seed, n, minDist, margin = 1) {
  const r = rng(seed);
  const pts = [];
  let tries = 0;
  while (pts.length < n && tries < 2000) {
    tries++;
    const p = [margin + r() * (N - 2 * margin), margin + r() * (N - 2 * margin)];
    if (pts.every((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) >= minDist)) pts.push(p.map(Math.round));
  }
  return pts;
}

// Palette (see src/art/palette.js):
// 0 outline  1 dark brown  2 brown  3 tan  4 cream  5 dark green  6 green  7 light green
// 8 pale green  9 heather  a deep sea  b water  c light water  d red  e gold  f grey

// ---------- habitats (full tiles) ----------

const tuft = (cv, x, y, c = '6') => { cv.set(x, y, c); cv.set(x - 1, y - 1, c); cv.set(x + 1, y - 1, c); cv.set(x, y - 1, c); };
const flower = (cv, x, y, petal, centre = 'e') => {
  cv.set(x - 1, y, petal); cv.set(x + 1, y, petal); cv.set(x, y - 1, petal); cv.set(x, y + 1, petal); cv.set(x, y, centre);
};

const H = {};

H.meadow = () => {
  const cv = new Canvas('7');
  scatter(11, 16, 5).forEach(([x, y]) => tuft(cv, x, y, '6'));
  scatter(12, 10, 7).forEach(([x, y], i) => flower(cv, x, y, ['4', 'd', '9', 'e'][i % 4], i % 4 === 3 ? '4' : 'e'));
  scatter(13, 6, 8).forEach(([x, y]) => cv.set(x, y, '8'));
  return { rows: cv.rows(), veg: '5678de94', bare: ['3', '2'], ground: '8' };
};

// Bare ground: compacted, trampled earth with rubble and a few stubborn weeds.
H.bare = () => {
  const cv = new Canvas('3');
  scatter(71, 6, 10, 4).forEach(([x, y]) => cv.ellipse(x, y, 4, 2.5, '2'));
  scatter(72, 9, 6).forEach(([x, y]) => cv.ellipse(x, y, 1.5, 1, 'f').set(x - 1, y - 1, 'c'));
  scatter(73, 7, 5).forEach(([x, y]) => cv.set(x, y, '1'));
  scatter(74, 4, 7).forEach(([x, y]) => tuft(cv, x, y, '6'));
  return { rows: cv.rows(), veg: '6', bare: ['2', '3'], ground: '3' };
};

H.moorland = () => {
  const cv = new Canvas('6');
  scatter(21, 7, 9, 3).forEach(([x, y]) => cv.ellipse(x, y, 4, 3, '9').ellipse(x - 1, y - 1, 2, 1, 'd'));
  scatter(22, 5, 9, 3).forEach(([x, y]) => cv.ellipse(x, y, 3, 2, '3'));
  scatter(23, 10, 5).forEach(([x, y]) => tuft(cv, x, y, '5'));
  scatter(24, 3, 12, 4).forEach(([x, y]) => cv.ellipse(x, y, 1.5, 1, 'f'));
  return { rows: cv.rows(), veg: '5679d', bare: ['2', '1'], ground: '3' };
};

H.heath = () => {
  const cv = new Canvas('8');
  scatter(31, 8, 9, 3).forEach(([x, y]) => {
    cv.circle(x, y, 3, '6').set(x - 1, y - 1, '7');
    cv.set(x + 1, y - 1, 'e'); cv.set(x - 1, y + 1, 'e'); cv.set(x + 2, y + 1, 'e');
  });
  scatter(32, 8, 6).forEach(([x, y]) => { cv.set(x, y, '9'); cv.set(x, y - 1, '9'); cv.set(x + 1, y, '9'); });
  scatter(33, 5, 8).forEach(([x, y]) => cv.set(x, y, '3'));
  return { rows: cv.rows(), veg: '56789e', bare: ['3', '2'], ground: '3' };
};

H.peat = () => {
  const cv = new Canvas('1');
  scatter(41, 9, 7, 3).forEach(([x, y], i) => cv.ellipse(x, y, 3, 2, i % 3 ? '6' : '7').set(x - 1, y - 1, '8'));
  scatter(42, 3, 12, 5).forEach(([x, y]) => cv.ellipse(x, y, 4, 2.5, 'b').ellipse(x - 1, y - 1, 1.5, 0.6, 'c'));
  scatter(43, 10, 5).forEach(([x, y]) => cv.set(x, y, '2'));
  return { rows: cv.rows(), veg: '5678', bare: ['2', '1'], ground: '1' };
};

H.woodland = () => {
  const cv = new Canvas('6');
  scatter(51, 12, 5).forEach(([x, y]) => tuft(cv, x, y, '5'));
  const trees = [[8, 9], [23, 7], [15, 20], [4, 25], [27, 24]];
  for (const [x, y] of trees) {
    cv.rect(x - 1, y + 4, 3, 4, '1');
    cv.circle(x, y, 6, '5');
    cv.circle(x - 1, y - 1, 4.5, '6');
    cv.circle(x - 2, y - 2, 2, '7');
  }
  return { rows: cv.rows(), veg: '5678', bare: ['3', '2'], ground: '7' };
};

// Young and intermediate woodland: saplings, then small trees.
const smallTree = (cv, x, y, r) => {
  cv.rect(x - 1, y + r - 1, 2, 3, '1');
  cv.circle(x, y, r, '5').circle(x - 1, y - 1, r - 1.5, '6').circle(x - 2, y - 2, Math.max(1, r / 3), '7');
};
const sprout = (cv, x, y) => {
  cv.line(x, y, x, y - 3, '2');
  cv.ellipse(x - 2, y - 3, 1.5, 1, '6').ellipse(x + 2, y - 4, 1.5, 1, '5').set(x, y - 5, '6');
};
H.woodland.young = () => {
  const cv = new Canvas('7');
  scatter(52, 10, 6).forEach(([x, y]) => tuft(cv, x, y, '6'));
  scatter(53, 7, 9, 4).forEach(([x, y]) => sprout(cv, x, y + 2));
  return cv.rows();
};
H.woodland.intermediate = () => {
  const cv = new Canvas('6');
  scatter(54, 10, 5).forEach(([x, y]) => tuft(cv, x, y, '5'));
  scatter(55, 6, 11, 5).forEach(([x, y]) => smallTree(cv, x, y, 3.5));
  return cv.rows();
};

H.fen = () => {
  const cv = new Canvas('b');
  scatter(61, 5, 10, 2).forEach(([x, y]) => cv.ellipse(x, y, 4, 1, 'c'));
  const clumps = scatter(62, 7, 8, 3);
  for (const [x, y] of clumps) {
    cv.ellipse(x, y + 3, 4, 1.5, '6');
    for (const dx of [-2, 0, 2]) {
      cv.line(x + dx, y + 3, x + dx + (dx > 0 ? 1 : dx < 0 ? -1 : 0), y - 4, dx === 0 ? '7' : '6');
    }
    cv.rect(x - 1, y - 6, 2, 3, '2');
    cv.set(x + 2, y - 5, '3');
  }
  return { rows: cv.rows(), veg: '67238', bare: ['2', '1'], ground: 'b' };
};

H.river = () => {
  const cv = new Canvas('b');
  cv.rect(0, 0, 4, N, '6').rect(28, 0, 4, N, '6');
  cv.rect(3, 0, 1, N, '7').rect(28, 0, 1, N, '7');
  for (let y = 0; y < N; y += 4) { cv.set(1, y, '5'); cv.set(30, y + 2, '5'); }
  scatter(71, 7, 6, 6).forEach(([x, y]) => cv.line(x - 2, y, x + 2, y, 'c'));
  return { rows: cv.rows(), veg: 'c', bare: ['3', '2'], ground: 'b' };
};

H.lake = () => {
  const cv = new Canvas('7');
  scatter(81, 6, 8, 1).forEach(([x, y]) => tuft(cv, x, y, '6'));
  cv.ellipse(15.5, 15.5, 15, 14, 'b');
  cv.ellipse(16, 17, 9, 7, 'a');
  cv.ellipse(10, 9, 3, 1, 'c').ellipse(22, 23, 2, 0.6, 'c');
  cv.ellipse(23, 10, 2.5, 1.5, '6').set(23, 10, 'd');
  return { rows: cv.rows(), veg: '67d', bare: ['3', '2'], ground: '7' };
};

H.saltmarsh = () => {
  const cv = new Canvas('7');
  scatter(91, 12, 5).forEach(([x, y]) => tuft(cv, x, y, '6'));
  cv.line(0, 8, 8, 11, 'b', 3).line(8, 11, 16, 9, 'b', 3).line(16, 9, 22, 14, 'b', 2).line(22, 14, 31, 13, 'b', 3);
  cv.line(10, 31, 13, 23, 'b', 2).line(13, 23, 20, 20, 'b', 2);
  cv.line(3, 9, 6, 10, 'c');
  scatter(92, 8, 6).forEach(([x, y]) => { if (cv.get(x, y) === '7') cv.set(x, y, '9'); });
  return { rows: cv.rows(), veg: '5679', bare: ['3', '2'], ground: '3' };
};

H.dunes = () => {
  const cv = new Canvas('4');
  cv.ellipse(8, 30, 14, 8, '3').ellipse(26, 12, 12, 6, '3');
  cv.ellipse(8, 28, 12, 6, '4').ellipse(26, 10, 10, 4, '4');
  const grass = [[6, 8], [14, 5], [22, 26], [28, 20], [4, 18], [17, 15]];
  for (const [x, y] of grass) {
    cv.line(x, y, x - 2, y - 4, '6').line(x, y, x, y - 5, '7').line(x, y, x + 2, y - 4, '6');
  }
  scatter(101, 5, 7).forEach(([x, y]) => { if (cv.get(x, y) === '4') cv.set(x, y, '3'); });
  return { rows: cv.rows(), veg: '67', bare: ['3', '2'], ground: '4' };
};

H.seagrass = () => {
  const cv = new Canvas('b');
  scatter(111, 4, 10, 3).forEach(([x, y]) => cv.line(x - 1, y, x + 1, y, 'c'));
  const fronds = scatter(112, 9, 6, 3);
  for (const [x, y] of fronds) {
    cv.line(x, y + 4, x - 1, y, '6').line(x - 1, y, x, y - 4, '6');
    cv.line(x + 2, y + 4, x + 3, y - 1, '7');
    cv.line(x - 2, y + 4, x - 3, y + 1, '5');
  }
  return { rows: cv.rows(), veg: '5678', bare: ['b', 'a'], ground: 'b' };
};

H.openSea = () => {
  const cv = new Canvas('a');
  scatter(121, 7, 9, 3).forEach(([x, y]) => {
    cv.line(x - 3, y + 1, x - 1, y - 1, 'b').line(x - 1, y - 1, x + 1, y - 1, 'c').line(x + 1, y - 1, x + 3, y + 1, 'b');
  });
  scatter(122, 4, 10).forEach(([x, y]) => cv.set(x, y, 'b'));
  return { rows: cv.rows(), veg: 'bc', bare: ['f', '2'], ground: 'a' };
};

// ---------- buildings (transparent background, soft outline) ----------

const B = {};

const house = (cv, x, y, w, h, roof = 'd') => {
  cv.rrect(x, y, w, h, 1, '4');
  cv.poly([[x - 2, y + 1], [x + w / 2, y - h * 0.75], [x + w + 2, y + 1]], roof);
  cv.rect(x + Math.floor(w / 2) - 1, y + h - 4, 3, 4, '2');
  cv.rrect(x + 1, y + 2, 3, 3, 1, 'c');
  if (w > 8) cv.rrect(x + w - 4, y + 2, 3, 3, 1, 'c');
};

B.cottages = () => {
  const cv = new Canvas();
  cv.rect(6, 4, 3, 6, 'f');
  house(cv, 3, 11, 12, 9);
  house(cv, 17, 17, 11, 9, 'e');
  cv.outline();
  cv.circle(8, 2, 1.5, '4').circle(10, 1, 1, '4');
  return cv.rows();
};

B.towerBlock = () => {
  const cv = new Canvas();
  cv.rrect(9, 3, 15, 27, 2, 'f');
  cv.rect(9, 3, 15, 2, '4');
  for (let y = 7; y < 26; y += 4) for (let x = 11; x < 22; x += 4) cv.rrect(x, y, 3, 2, 0, (x + y) % 3 === 0 ? 'e' : 'c');
  cv.rrect(15, 26, 4, 4, 1, '2');
  cv.outline();
  return cv.rows();
};

B.familyFarm = () => {
  const cv = new Canvas();
  cv.rect(0, 0, N, N, '8');
  for (let y = 1; y < N; y += 4) cv.rect(0, y, N, 2, y % 8 === 1 ? '7' : 'e');
  cv.rrect(16, 12, 13, 14, 2, '0');
  cv.rrect(17, 13, 11, 12, 1, 'd');
  cv.poly([[15, 14], [22.5, 6], [30, 14]], '0');
  cv.poly([[16.5, 13.5], [22.5, 7.5], [28.5, 13.5]], 'd');
  cv.rect(20, 18, 5, 7, '4').line(20, 18, 24, 24, 'd').line(24, 18, 20, 24, 'd');
  cv.circle(7, 22, 4, '0').circle(7, 22, 3, 'e').line(5, 21, 9, 21, '3').line(5, 23, 9, 23, '3');
  return cv.rows();
};

const sheep = (cv, x, y) => {
  cv.circle(x, y, 4, '4').circle(x - 3, y + 1, 3, '4').circle(x + 3, y + 1, 3, '4');
  cv.ellipse(x + 5, y, 2, 2.5, '0').set(x + 5, y - 1, '4');
  cv.rect(x - 3, y + 4, 1, 3, '0').rect(x + 2, y + 4, 1, 3, '0');
};

B.hillFarm = () => {
  const cv = new Canvas();
  sheep(cv, 10, 9);
  sheep(cv, 21, 17);
  cv.outline();
  for (let x = 0; x < N; x += 5) cv.rrect(x, 26, 6, 4, 1, 'f').set(x + 2, 27, '4');
  cv.rect(0, 30, N, 1, '0');
  return cv.rows();
};

B.cluckTowers = () => {
  const cv = new Canvas();
  cv.rrect(24, 3, 7, 25, 3, 'f').rect(24, 8, 7, 1, '4').rect(24, 14, 7, 1, '4');
  cv.rrect(1, 12, 23, 14, 2, '4');
  cv.rrect(0, 9, 25, 5, 2, 'f');
  for (let x = 3; x < 22; x += 5) cv.rrect(x, 16, 3, 3, 1, 'e');
  cv.rect(10, 21, 5, 5, '2');
  cv.outline();
  // A chicken, in front.
  cv.circle(7, 28, 2.5, '4').set(9, 27, 'e').set(6, 25, 'd').set(7, 25, 'd').set(8, 27, '0');
  return cv.rows();
};

const conifer = (cv, x, y, s = 1) => {
  cv.poly([[x, y - 9 * s], [x - 5 * s, y + 1], [x + 5 * s, y + 1]], '5');
  cv.poly([[x, y - 9 * s], [x - 2 * s, y - 3 * s], [x, y - 3 * s]], '6');
  cv.rect(x - 1, y + 1, 2, 3, '1');
};

B.conifer = () => {
  const cv = new Canvas();
  conifer(cv, 7, 12); conifer(cv, 18, 11); conifer(cv, 28, 13, 0.85);
  conifer(cv, 12, 26); conifer(cv, 24, 27);
  cv.outline('5');
  return cv.rows();
};

const caravan = (cv, x, y, stripe) => {
  cv.rrect(x, y, 14, 8, 3, '4');
  cv.rect(x, y + 4, 14, 1, stripe);
  cv.rrect(x + 2, y + 1, 4, 3, 1, 'c');
  cv.circle(x + 9, y + 8, 1.5, '0');
};

B.holidayPark = () => {
  const cv = new Canvas();
  caravan(cv, 14, 6, 'd');
  caravan(cv, 3, 19, 'b');
  cv.poly([[20, 29], [25, 19], [30, 29]], 'e').line(25, 20, 25, 29, 'd');
  cv.outline();
  cv.line(3, 3, 3, 15, '2').poly([[4, 3], [10, 5], [4, 7]], 'd');
  return cv.rows();
};

B.school = () => {
  const cv = new Canvas();
  cv.rrect(3, 14, 26, 15, 1, '4');
  cv.poly([[1, 15], [16, 6], [31, 15]], 'd');
  cv.rrect(13, 2, 6, 8, 1, '4').poly([[12, 3], [16, -1], [20, 3]], 'd');
  cv.circle(16, 6, 1.5, 'e');
  for (const x of [5, 9, 20, 24]) cv.rrect(x, 18, 3, 4, 1, 'c');
  cv.rrect(14, 21, 5, 8, 2, '2').set(17, 25, 'e');
  cv.outline();
  return cv.rows();
};

B.hospital = () => {
  const cv = new Canvas();
  cv.rrect(3, 7, 26, 22, 2, '4');
  cv.rect(3, 7, 26, 3, 'c');
  cv.rrect(12, 11, 8, 8, 1, 'f').rect(15, 12, 2, 6, 'd').rect(13, 14, 6, 2, 'd');
  for (const x of [5, 23]) { cv.rrect(x, 12, 4, 3, 1, 'c'); cv.rrect(x, 18, 4, 3, 1, 'c'); }
  cv.rrect(13, 22, 6, 7, 1, 'b').rect(16, 22, 1, 7, 'c');
  cv.outline();
  return cv.rows();
};

B.businessPark = () => {
  const cv = new Canvas();
  cv.rrect(3, 5, 12, 24, 2, 'b');
  cv.rrect(16, 11, 13, 18, 2, 'b');
  for (let y = 8; y < 27; y += 4) cv.rect(5, y, 8, 2, 'c');
  for (let y = 14; y < 27; y += 4) cv.rect(18, y, 9, 2, 'c');
  cv.line(5, 7, 8, 7, '4').line(18, 13, 21, 13, '4');
  cv.outline();
  cv.rect(0, 30, N, 1, 'f');
  return cv.rows();
};

B.factory = () => {
  const cv = new Canvas();
  cv.rrect(21, 5, 5, 22, 1, 'd').rect(21, 9, 5, 2, '4').rect(21, 15, 5, 2, '4');
  cv.rrect(1, 17, 29, 12, 1, 'f');
  for (const x of [1, 8, 15]) cv.poly([[x, 18], [x + 7, 11], [x + 7, 18]], 'f');
  for (const x of [4, 11, 18, 25]) cv.rrect(x, 21, 3, 3, 1, 'e');
  cv.rect(12, 25, 5, 4, '2');
  cv.outline();
  cv.circle(24, 3, 2, 'f').circle(28, 1, 1.5, 'f');
  return cv.rows();
};

const boat = (cv, x, y) => {
  cv.poly([[x - 7, y], [x + 7, y], [x + 5, y + 4], [x - 5, y + 4]], 'd');
  cv.rect(x - 7, y, 14, 1, '4');
  cv.rrect(x - 4, y - 4, 5, 4, 1, '4').rect(x - 3, y - 3, 2, 2, 'c');
  cv.rect(x + 3, y - 10, 1, 10, '2');
  cv.poly([[x + 4, y - 10], [x + 9, y - 2], [x + 4, y - 2]], '4');
};

B.fishingFleet = () => {
  const cv = new Canvas();
  boat(cv, 10, 13);
  boat(cv, 20, 25);
  cv.outline();
  return cv.rows();
};

const turbine = (cv, x, y) => {
  cv.poly([[x - 1, y], [x + 1, y], [x + 2, 30], [x - 2, 30]], '4');
  cv.line(x, y, x, y - 8, 'c', 2).line(x, y, x + 7, y + 4, 'c', 2).line(x, y, x - 7, y + 4, 'c', 2);
  cv.circle(x, y, 1.5, 'f');
};

B.windFarm = () => {
  const cv = new Canvas();
  turbine(cv, 9, 10);
  turbine(cv, 23, 15);
  cv.outline();
  return cv.rows();
};

// ---------- icons ----------

const I = {};

I.icon_POL = () => {
  const cv = new Canvas();
  cv.ellipse(10, 9, 5, 4, 'c').ellipse(20, 8, 5, 4, 'c');
  cv.ellipse(15, 18, 10, 8, 'e');
  cv.rect(12, 11, 2, 15, '0').rect(18, 11, 2, 15, '0');
  cv.set(7, 16, '0'); cv.set(9, 16, '0'); cv.set(8, 19, 'd');
  cv.poly([[25, 17], [30, 18], [25, 20]], '0');
  cv.outline();
  return cv.rows();
};

I.icon_WAT = () => {
  const cv = new Canvas();
  cv.circle(16, 19, 9, 'b');
  cv.poly([[16, 2], [8, 17], [24, 17]], 'b');
  cv.ellipse(12, 18, 2, 4, 'c');
  cv.outline();
  return cv.rows();
};

I.icon_GRN = () => {
  const cv = new Canvas();
  cv.ellipse(17, 14, 10, 7, '7');
  cv.poly([[7, 14], [17, 7], [27, 14], [17, 21]], '7');
  cv.line(6, 27, 24, 8, '6', 2);
  cv.line(13, 14, 11, 9, '6').line(18, 14, 20, 19, '6');
  cv.ellipse(14, 11, 3, 1.5, '8');
  cv.outline();
  return cv.rows();
};

I.icon_BIO = () => {
  const cv = new Canvas();
  cv.ellipse(9, 11, 7, 6, '9').ellipse(23, 11, 7, 6, '9');
  cv.ellipse(10, 22, 5, 5, '9').ellipse(22, 22, 5, 5, '9');
  cv.circle(9, 11, 2, 'e').circle(23, 11, 2, 'e');
  cv.rrect(15, 7, 2, 20, 1, '0');
  cv.line(15, 7, 12, 2, '0').line(16, 7, 19, 2, '0');
  cv.outline();
  return cv.rows();
};

I.coin = () => {
  const cv = new Canvas();
  cv.circle(16, 16, 13, 'e');
  cv.circle(16, 16, 10, '3').circle(16, 16, 9, 'e');
  // Pound sign.
  cv.line(13, 22, 21, 22, '2', 2).line(14, 22, 14, 13, '2', 2).line(14, 13, 16, 10, '2', 2).line(16, 10, 19, 11, '2', 2).line(11, 17, 18, 17, '2', 2);
  cv.ellipse(9, 10, 2, 3, '4');
  cv.outline();
  return cv.rows();
};

I.waste = () => {
  const cv = new Canvas();
  cv.ellipse(16, 20, 11, 7, '2');
  cv.ellipse(16, 14, 7, 5, '2');
  cv.ellipse(12, 12, 2, 1, '3').ellipse(10, 18, 2, 1, '3');
  cv.set(13, 18, '0'); cv.set(19, 18, '0');
  cv.line(14, 22, 18, 22, '1');
  cv.outline('1');
  return cv.rows();
};

const face = (mouth) => () => {
  const cv = new Canvas();
  cv.circle(16, 16, 13, 'e');
  cv.ellipse(11, 13, 1.5, 2.5, '0').ellipse(21, 13, 1.5, 2.5, '0');
  cv.set(11, 12, '4'); cv.set(21, 12, '4');
  cv.ellipse(7, 19, 2, 1.2, 'd').ellipse(25, 19, 2, 1.2, 'd');
  mouth(cv);
  cv.outline();
  return cv.rows();
};

I.face_happy = face((cv) => cv.line(11, 20, 13, 23, '0', 2).line(13, 23, 19, 23, '0', 2).line(19, 23, 21, 20, '0', 2));
I.face_ok = face((cv) => cv.line(12, 22, 20, 22, '0', 2));
I.face_sad = face((cv) => cv.line(11, 24, 13, 21, '0', 2).line(13, 21, 19, 21, '0', 2).line(19, 21, 21, 24, '0', 2));

I.primaryMark = () => {
  const cv = new Canvas();
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? 2.4 : 5.5;
    pts.push([26 + Math.cos(a) * r, 6 + Math.sin(a) * r]);
  }
  cv.poly(pts, 'e');
  cv.outline();
  return cv.rows();
};

I.reserveMark = () => {
  const cv = new Canvas();
  cv.ellipse(6, 26, 4, 2.5, 'c').poly([[9, 26], [13, 23], [13, 29]], 'c').set(4, 25, '0');
  cv.outline('a');
  return cv.rows();
};

I.sapling = () => {
  const cv = new Canvas();
  cv.line(16, 30, 16, 22, '2', 2);
  cv.ellipse(12, 21, 4, 2.5, '7').ellipse(20, 20, 4, 2.5, '6');
  cv.circle(16, 17, 3, '7');
  return cv.rows();
};

// Restoration actions.
I.act_plantWoodland = () => {
  const cv = new Canvas();
  cv.ellipse(16, 25, 12, 4, '2').ellipse(16, 24, 10, 2.5, '1');
  cv.line(16, 24, 16, 12, '2', 2);
  cv.ellipse(10, 12, 5, 3, '7').ellipse(22, 10, 5, 3, '6').circle(16, 7, 4.5, '7');
  cv.set(9, 11, '8'); cv.set(15, 5, '8');
  cv.line(26, 26, 29, 16, 'f', 2).rrect(27, 12, 4, 5, 1, '2');
  cv.outline();
  return cv.rows();
};

I.act_restoreWetland = () => {
  const cv = new Canvas();
  cv.ellipse(16, 26, 14, 4, 'b').ellipse(12, 25, 4, 1, 'c');
  for (const [x, top] of [[8, 9], [12, 5], [17, 8], [21, 4], [25, 10]]) cv.line(x, 25, x + (x % 2 ? 1 : -1), top, x % 3 ? '6' : '7', 2);
  cv.rrect(11, 3, 3, 5, 1, '2').rrect(20, 2, 3, 5, 1, '2');
  cv.circle(27, 5, 3, 'b').poly([[27, 0], [24, 4], [30, 4]], 'b').set(26, 4, 'c');
  cv.outline();
  return cv.rows();
};

I.act_sowMeadow = () => {
  const cv = new Canvas();
  cv.rrect(3, 4, 12, 15, 2, '4').rect(3, 4, 12, 4, 'e');
  flower(cv, 9, 13, 'd', 'e');
  cv.set(8, 16, '6'); cv.set(9, 17, '6');
  for (const [x, y] of [[18, 9], [21, 13], [19, 17], [24, 11]]) cv.ellipse(x, y, 1, 0.8, '2');
  for (const [x, y, c] of [[10, 26, 'd'], [17, 25, '9'], [24, 26, 'e'], [28, 22, '4']]) {
    cv.line(x, 30, x, y + 2, '6');
    cv.circle(x, y, 2, c).set(x, y, c === 'e' ? '2' : 'e');
  }
  cv.outline();
  return cv.rows();
};

I.act_rewetPeat = () => {
  const cv = new Canvas();
  cv.rrect(1, 16, 30, 14, 3, '1');
  cv.rrect(3, 17, 12, 8, 2, 'b').ellipse(7, 19, 2.5, 0.8, 'c');
  cv.rect(15, 11, 4, 18, '2').rect(15, 11, 4, 1, '3').rect(16, 14, 2, 1, '1').rect(16, 20, 2, 1, '1');
  cv.rect(19, 22, 11, 3, '3');
  cv.ellipse(6, 13, 3, 2, '7').ellipse(26, 14, 3, 2, '6');
  cv.outline();
  return cv.rows();
};

I.act_marineReserve = () => {
  const cv = new Canvas();
  cv.circle(16, 16, 13, 'd').circle(16, 16, 8.5, '.');
  for (const a of [0.8, 2.4, 3.9, 5.5]) cv.line(16 + Math.cos(a) * 9, 16 + Math.sin(a) * 9, 16 + Math.cos(a) * 13, 16 + Math.sin(a) * 13, '4', 3);
  cv.ellipse(15, 16, 4, 2.5, 'c').poly([[18, 16], [22, 13], [22, 19]], 'c').set(13, 15, '0');
  cv.outline();
  return cv.rows();
};

I.icon_fullscreen = () => {
  const cv = new Canvas();
  const corner = (x, y, dx, dy) => cv.line(x, y, x + dx * 8, y, '4', 3).line(x, y, x, y + dy * 8, '4', 3);
  corner(5, 5, 1, 1); corner(26, 5, -1, 1); corner(5, 26, 1, -1); corner(26, 26, -1, -1);
  cv.outline();
  return cv.rows();
};

// ---------- write the file ----------

const q = (rows, indent) => rows.map((r) => `${indent}'${r}'`).join(',\n');
let out = `// 32x32 sprites as palette-index strings (see palette.js). '.' is transparent.
// Generated by scripts/draw-sprites.js; safe to edit by hand or replace with a real spritesheet export.
//
// Nature sprites are drawn at their lush (minimal use) state. src/art/textures.js derives
// the light/intense and young/intermediate looks by turning soft patches of vegetation
// (\`veg\` colours) into bare ground (\`bare\` colours) or plain ground (\`ground\`).
// A habitat can instead supply its own \`young\` and \`intermediate\` rows.

export const SPRITE_SIZE = ${N};

export const NATURE_SPRITES = {
`;
out += Object.entries(H).map(([k, f]) => {
  const s = f();
  let extra = '';
  if (f.young) extra += `,\n    young: [\n${q(f.young(), '      ')}\n    ]`;
  if (f.intermediate) extra += `,\n    intermediate: [\n${q(f.intermediate(), '      ')}\n    ]`;
  return `  ${k}: {\n    veg: '${s.veg}', bare: ['${s.bare.join("', '")}'], ground: '${s.ground}',\n    rows: [\n${q(s.rows, '      ')}\n    ]${extra}\n  }`;
}).join(',\n');
out += '\n};\n\n// Built tiles. Transparent pixels show the ground habitat underneath.\nexport const BUILDING_SPRITES = {\n';
out += Object.entries(B).map(([k, f]) => `  ${k}: [\n${q(f(), '    ')}\n  ]`).join(',\n');
out += '\n};\n\n// Service icons and other small sprites.\nexport const ICON_SPRITES = {\n';
out += Object.entries(I).map(([k, f]) => `  ${k}: [\n${q(f(), '    ')}\n  ]`).join(',\n');
out += '\n};\n';

const target = new URL('../src/art/sprites.js', import.meta.url);
writeFileSync(target, out);
console.log(`Wrote ${target.pathname}`);
