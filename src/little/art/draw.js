// Little Green: draws every texture at start-up with Phaser graphics, in a bold cartoon style
// (bright fills, thick dark outlines). Board pieces are drawn at 256 px and shown at 128 (camera zoom 2).
import { COLOURS as C } from './palette.js';

const O = 7; // outline width at 256 px; smaller textures use a thinner one

function pen(g, o = O) {
  const fill = (c, a = 1) => g.fillStyle(c, a);
  const p = {
    o,
    circle(x, y, r, c, outline = true) {
      if (outline) { fill(C.outline); g.fillCircle(x, y, r + p.o); }
      fill(c); g.fillCircle(x, y, r);
    },
    ellipse(x, y, w, h, c, outline = true) {
      if (outline) { fill(C.outline); g.fillEllipse(x, y, w + 2 * p.o, h + 2 * p.o); }
      fill(c); g.fillEllipse(x, y, w, h);
    },
    rrect(x, y, w, h, r, c, outline = true) {
      if (outline) { fill(C.outline); g.fillRoundedRect(x - p.o, y - p.o, w + 2 * p.o, h + 2 * p.o, r + p.o); }
      fill(c); g.fillRoundedRect(x, y, w, h, r);
    },
    poly(points, c, outline = true) {
      const pts = points.map(([x, y]) => ({ x, y }));
      if (outline) { g.lineStyle(2 * p.o, C.outline); g.strokePoints(pts, true, true); }
      fill(c); g.fillPoints(pts, true);
    },
    // Several circles merged into one outlined blob.
    blob(circles, c) {
      fill(C.outline);
      for (const [x, y, r] of circles) g.fillCircle(x, y, r + p.o);
      fill(c);
      for (const [x, y, r] of circles) g.fillCircle(x, y, r);
    },
    arc(x, y, r, a0, a1, c, w) {
      g.lineStyle(w, c);
      g.beginPath();
      g.arc(x, y, r, a0 * Math.PI, a1 * Math.PI, false);
      g.strokePath();
    },
    line(x0, y0, x1, y1, c, w) {
      g.lineStyle(w, c);
      g.lineBetween(x0, y0, x1, y1);
    }
  };
  return p;
}

// Eyes and mouth. mood: happy, hot, sad, cool (sunglasses).
function face(p, x, y, s, mood) {
  const ex = 26 * s;
  if (mood === 'cool') {
    p.rrect(x - ex - 16 * s, y - 12 * s, 30 * s, 20 * s, 6 * s, C.black, false);
    p.rrect(x + ex - 14 * s, y - 12 * s, 30 * s, 20 * s, 6 * s, C.black, false);
    p.line(x - 6 * s, y - 6 * s, x + 6 * s, y - 6 * s, C.black, 5 * s);
  } else {
    for (const dx of [-ex, ex]) {
      p.circle(x + dx, y, 10 * s, C.black, false);
      p.circle(x + dx + 3 * s, y - 4 * s, 4 * s, C.white, false);
    }
  }
  if (mood === 'hot' || mood === 'sad') {
    p.circle(x - ex - 14 * s, y + 18 * s, 8 * s, C.red, false);
    p.circle(x + ex + 14 * s, y + 18 * s, 8 * s, C.red, false);
  } else {
    p.circle(x - ex - 12 * s, y + 18 * s, 8 * s, C.pinkCheek, false);
    p.circle(x + ex + 12 * s, y + 18 * s, 8 * s, C.pinkCheek, false);
  }
  if (mood === 'hot') p.ellipse(x, y + 28 * s, 22 * s, 26 * s, C.black, false);
  else if (mood === 'sad') p.arc(x, y + 42 * s, 18 * s, 1.15, 1.85, C.black, 6 * s);
  else p.arc(x, y + 10 * s, 20 * s, 0.15, 0.85, C.black, 6 * s);
}

function drop(p, x, y, r, c) {
  p.poly([[x - r * 0.85, y - r * 0.2], [x, y - r * 2.1], [x + r * 0.85, y - r * 0.2]], c);
  p.circle(x, y, r, c);
  p.poly([[x - r * 0.8, y - r * 0.3], [x, y - r * 1.9], [x + r * 0.8, y - r * 0.3]], c, false);
}

function star(p, cx, cy, R, c, points = 5, inner = 0.48) {
  const pts = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? R : R * inner;
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  p.poly(pts, c);
}

function flower(p, x, y, petal, s = 1) {
  for (let i = 0; i < 5; i++) {
    const a = (i * 2 * Math.PI) / 5 - Math.PI / 2;
    p.circle(x + 20 * s * Math.cos(a), y + 20 * s * Math.sin(a), 15 * s, petal);
  }
  for (let i = 0; i < 5; i++) {
    const a = (i * 2 * Math.PI) / 5 - Math.PI / 2;
    p.circle(x + 20 * s * Math.cos(a), y + 20 * s * Math.sin(a), 15 * s, petal, false);
  }
  p.circle(x, y, 12 * s, C.yellow === petal ? C.orange : C.yellow);
}

function strawberry(p, x, y, s) {
  const o = p.o;
  p.o = Math.max(2.5, Math.min(o, 5 * s));
  p.blob([[x - 12 * s, y - 6 * s, 14 * s], [x + 12 * s, y - 6 * s, 14 * s], [x, y + 8 * s, 15 * s]], C.red);
  p.poly([[x - 20 * s, y + 2 * s], [x + 20 * s, y + 2 * s], [x, y + 28 * s]], C.red);
  p.blob([[x - 12 * s, y - 6 * s, 14 * s], [x + 12 * s, y - 6 * s, 14 * s], [x, y + 8 * s, 15 * s]], C.red);
  p.poly([[x - 19 * s, y + 2 * s], [x + 19 * s, y + 2 * s], [x, y + 26 * s]], C.red, false);
  for (const [dx, dy] of [[-10, -4], [8, -6], [0, 6], [-4, 16], [10, 10]]) p.circle(x + dx * s, y + dy * s, 2.5 * s, C.yellow, false);
  star(p, x, y - 18 * s, 13 * s, C.leaf, 5, 0.45);
  p.o = o;
}

const DRAW = {
  grass(p) {
    p.rrect(6, 6, 244, 244, 40, C.grass, false);
    for (const [x, y] of [[60, 70], [180, 60], [120, 140], [70, 200], [200, 180]]) {
      p.line(x - 8, y + 8, x - 12, y - 6, C.grassLight, 6);
      p.line(x, y + 8, x, y - 10, C.grassLight, 6);
      p.line(x + 8, y + 8, x + 12, y - 6, C.grassLight, 6);
    }
  },
  stream(p) {
    p.rrect(0, 0, 256, 256, 0, C.stream, false);
    for (const y of [60, 140, 210]) {
      for (const x of [40, 150]) p.arc(x + (y % 80), y, 26, 1.1, 1.9, C.streamLight, 8);
    }
  },
  house_happy(p) { house(p, 'happy'); },
  house_hot(p) { house(p, 'hot'); },
  veg_0(p) { veg(p, 0); },
  veg_1(p) { veg(p, 1); },
  veg_2(p) { veg(p, 2); },
  veg_3(p) { veg(p, 3); },
  flowers(p) {
    for (const [x, y] of [[70, 80], [180, 70], [125, 140], [60, 195], [190, 185]]) p.line(x, y, x, y + 50, C.leaf, 8);
    flower(p, 70, 80, C.pink);
    flower(p, 180, 70, C.purple);
    flower(p, 125, 140, C.yellow, 1.15);
    flower(p, 60, 195, C.purple, 0.9);
    flower(p, 190, 185, C.pink, 0.9);
  },
  tree(p, g) {
    g.fillStyle(C.outline, 0.25);
    g.fillEllipse(128, 228, 200, 44);
    p.rrect(108, 140, 40, 96, 12, C.trunk);
    p.blob([[128, 92, 72], [70, 128, 50], [186, 128, 50], [128, 150, 44]], C.leaf);
    for (const [x, y, r] of [[100, 70, 16], [160, 84, 12], [80, 128, 10]]) p.circle(x, y, r, C.leafLight, false);
  },
  reeds(p) {
    p.ellipse(128, 196, 216, 92, C.pond);
    p.arc(100, 205, 26, 1.1, 1.9, C.streamLight, 6);
    for (const [x, top, lean] of [[60, 90, -10], [96, 50, 0], [134, 70, 6], [170, 44, 4], [204, 96, 12]]) {
      p.line(x, 210, x + lean, top, C.outline, 16);
      p.line(x, 210, x + lean, top, C.reed, 9);
      p.rrect(x + lean - 9, top - 4, 18, 46, 9, C.cattail);
    }
    p.line(84, 210, 60, 140, C.reed, 7);
    p.line(150, 210, 178, 130, C.reed, 7);
  },
  bee(p) {
    p.ellipse(22, 16, 22, 18, C.white);
    p.ellipse(42, 16, 22, 18, C.white);
    p.ellipse(32, 38, 44, 30, C.yellow);
    p.rrect(24, 25, 6, 26, 3, C.black, false);
    p.rrect(36, 25, 6, 26, 3, C.black, false);
    p.circle(50, 34, 4, C.black, false);
  },
  strawberry(p) { strawberry(p, 32, 34, 1); },
  muck(p) {
    drop(p, 32, 40, 18, C.muck);
    p.circle(25, 40, 4, C.black, false);
    p.circle(39, 40, 4, C.black, false);
    p.arc(32, 56, 7, 1.2, 1.8, C.black, 3);
  },
  sparkle(p) { star(p, 32, 32, 28, C.white, 4, 0.32); },
  heart(p) {
    p.blob([[22, 24, 14], [42, 24, 14]], C.roof);
    p.poly([[9, 30], [55, 30], [32, 56]], C.roof);
    p.blob([[22, 24, 14], [42, 24, 14]], C.roof);
    p.poly([[10, 29], [54, 29], [32, 54]], C.roof, false);
  },
  sun(p) {
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      const pt = (r, da) => [128 + r * Math.cos(a + da), 128 + r * Math.sin(a + da)];
      p.poly([pt(80, -0.18), pt(120, 0), pt(80, 0.18)], C.orange);
    }
    p.circle(128, 128, 84, C.sun);
    face(p, 128, 118, 1.6, 'cool');
  },
  duck_happy(p) { duck(p, 'happy'); },
  duck_sad(p) { duck(p, 'sad'); },
  star(p) { star(p, 64, 68, 56, C.gold); p.circle(48, 52, 7, C.white, false); },
  star_empty(p) { star(p, 64, 68, 56, C.grey); },
  play(p) {
    p.circle(128, 128, 112, C.leaf);
    p.poly([[100, 70], [190, 128], [100, 186]], C.white);
  },
  again(p) {
    p.circle(64, 64, 56, C.leaf);
    p.arc(64, 64, 30, 0.2, 1.75, C.white, 12);
    p.poly([[88, 30], [102, 62], [70, 58]], C.white, false);
  },
  speaker_on(p) { speaker(p, true); },
  speaker_off(p) { speaker(p, false); },
  rabbit(p) {
    for (const x of [70, 122]) {
      p.ellipse(x, 60, 40, 110, C.rabbit);
      p.ellipse(x, 66, 18, 76, C.pinkCheek, false);
    }
    p.circle(96, 128, 62, C.rabbit);
    face(p, 96, 118, 1, 'happy');
    p.ellipse(96, 140, 16, 11, C.roof, false);
  },
  hedgehog(p) {
    const pts = [];
    for (let i = 0; i < 28; i++) {
      const a = (i * Math.PI) / 14;
      const r = i % 2 === 0 ? 86 : 66;
      pts.push([96 + r * Math.cos(a), 108 + r * Math.sin(a)]);
    }
    p.poly(pts, C.hedgehog);
    p.ellipse(96, 130, 112, 96, C.cream);
    face(p, 96, 124, 0.9, 'happy');
    p.circle(96, 140, 9, C.black, false);
  },
  fox(p) {
    p.poly([[36, 30], [86, 70], [46, 100]], C.fox);
    p.poly([[156, 30], [106, 70], [146, 100]], C.fox);
    p.circle(96, 120, 66, C.fox);
    p.ellipse(96, 150, 92, 56, C.white, false);
    face(p, 96, 112, 1, 'happy');
    p.circle(96, 140, 9, C.black, false);
  },
  mouse(p) {
    for (const x of [44, 148]) {
      p.circle(x, 60, 40, C.mouse);
      p.circle(x, 60, 24, C.pinkCheek, false);
    }
    p.circle(96, 124, 62, C.mouse);
    face(p, 96, 116, 1, 'happy');
    p.circle(96, 138, 9, C.roof, false);
    for (const dy of [-6, 6]) { p.line(40, 138 + dy, 70, 140, C.outline, 3); p.line(122, 140, 152, 138 + dy, C.outline, 3); }
  },
  basket(p) {
    p.arc(64, 64, 40, 1.05, 1.95, C.outline, 14);
    p.arc(64, 64, 40, 1.05, 1.95, C.trunk, 7);
    strawberry(p, 46, 62, 0.7);
    strawberry(p, 80, 60, 0.7);
    p.rrect(18, 70, 92, 44, 12, C.trunk);
    p.line(26, 86, 102, 86, C.soilDark, 5);
    p.line(26, 100, 102, 100, C.soilDark, 5);
  },
  bubble(p) {
    p.circle(18, 112, 8, C.white);
    p.circle(34, 94, 12, C.white);
    p.circle(72, 56, 44, C.white);
  }
};

function house(p, mood) {
  p.rrect(162, 26, 30, 60, 6, C.trunk);
  p.poly([[26, 128], [128, 28], [230, 128]], C.roof);
  p.rrect(50, 116, 156, 124, 18, mood === 'hot' ? C.wallHot : C.wall);
  p.rrect(110, 196, 36, 44, 10, C.door);
  face(p, 128, 148, 1, mood);
  if (mood === 'hot') {
    drop(p, 40, 178, 11, C.cool);
    drop(p, 220, 150, 11, C.cool);
  }
}

function veg(p, fruit) {
  p.rrect(22, 30, 212, 206, 34, C.soil);
  for (const y of [86, 140, 194]) p.line(44, y, 212, y, C.soilDark, 8);
  const spots = [[72, 76], [184, 76], [128, 130], [72, 184], [184, 184]];
  const grown = fruit > 0;
  for (const [x, y] of spots) {
    if (grown) {
      p.ellipse(x - 12, y, 28, 16, C.sprout);
      p.ellipse(x + 12, y, 28, 16, C.sprout);
    } else {
      p.line(x, y + 6, x, y - 8, C.sprout, 6);
      p.ellipse(x - 7, y - 10, 12, 8, C.sprout, false);
    }
  }
  const berries = [[72, 92], [184, 92], [128, 146]].slice(0, fruit);
  for (const [x, y] of berries) strawberry(p, x, y, 0.9);
}

function duck(p, mood) {
  p.ellipse(76, 88, 92, 50, C.yellow);
  p.poly([[114, 70], [124, 58], [120, 86]], C.yellow);
  p.circle(50, 52, 28, C.yellow);
  p.ellipse(18, 58, 24, 12, C.orange);
  p.ellipse(86, 82, 40, 20, C.sun, false);
  if (mood === 'happy') {
    p.circle(46, 46, 6, C.black, false);
    p.circle(48, 44, 2, C.white, false);
  } else {
    p.line(38, 46, 54, 44, C.black, 5);
    drop(p, 42, 70, 6, C.cool);
  }
}

function speaker(p, on) {
  p.rrect(14, 34, 22, 28, 4, C.white);
  p.poly([[30, 36], [56, 16], [56, 80], [30, 60]], C.white);
  if (on) {
    p.arc(56, 48, 18, -0.3, 0.3, C.white, 6);
    p.arc(56, 48, 32, -0.3, 0.3, C.white, 6);
  } else {
    p.line(66, 32, 90, 64, C.roof, 8);
    p.line(90, 32, 66, 64, C.roof, 8);
  }
}

const SIZES = {
  bee: 64, strawberry: 64, muck: 64, sparkle: 64, heart: 64,
  duck_happy: 128, duck_sad: 128, star: 128, star_empty: 128, basket: 128, bubble: 128, again: 128,
  speaker_on: 96, speaker_off: 96,
  rabbit: 192, hedgehog: 192, fox: 192, mouse: 192
};

export const TEXTURE_KEYS = Object.keys(DRAW);

export function makeTextures(scene) {
  const g = scene.add.graphics();
  for (const [key, fn] of Object.entries(DRAW)) {
    const size = SIZES[key] ?? 256;
    g.clear();
    fn(pen(g, Math.max(3, (O * size) / 256)), g);
    g.generateTexture(key, size, size);
  }
  g.clear();
  g.fillStyle(0xffffff, 1);
  g.fillRect(0, 0, 4, 4);
  g.generateTexture('px', 4, 4);
  g.destroy();
}
