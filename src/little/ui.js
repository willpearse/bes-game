// Little Green: small shared helpers for scenes.
import Phaser from 'phaser';
import { RES } from './layout.js';
import { COLOURS, css } from './art/palette.js';

export const FONT = '"Arial Rounded MT Bold", "Trebuchet MS", "Segoe UI", Verdana, sans-serif';

export function bigText(scene, x, y, str, { size = 48, colour = COLOURS.white, stroke = COLOURS.outline, origin = [0.5, 0.5] } = {}) {
  const t = scene.add.text(x, y, str, {
    fontFamily: FONT,
    fontSize: `${size}px`,
    fontStyle: 'bold',
    color: css(colour),
    stroke: css(stroke),
    strokeThickness: Math.max(4, Math.round(size / 7))
  });
  t.setResolution(RES * 1.5);
  t.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
  return t.setOrigin(...origin);
}

// Shows a texture drawn at 2x at its logical size.
export function sprite(scene, x, y, key, size) {
  return scene.add.image(x, y, key).setDisplaySize(size, size);
}

export const tween = (scene, config) => new Promise((resolve) => scene.tweens.add({ ...config, onComplete: () => resolve() }));
export const wait = (scene, ms) => new Promise((resolve) => scene.time.delayedCall(ms, resolve));

// A sky background with soft clouds, shared by every scene.
export function sky(scene, w, h) {
  const g = scene.add.graphics();
  g.fillGradientStyle(COLOURS.skyDeep, COLOURS.skyDeep, COLOURS.sky, COLOURS.sky, 1);
  g.fillRect(0, 0, w, h);
  g.fillStyle(COLOURS.white, 0.7);
  for (const [x, y, s] of [[160, 90, 1], [520, 50, 0.8], [860, 110, 1.1]]) {
    g.fillCircle(x, y, 28 * s);
    g.fillCircle(x + 30 * s, y - 12 * s, 34 * s);
    g.fillCircle(x + 64 * s, y, 26 * s);
    g.fillRect(x, y, 64 * s, 26 * s);
  }
  return g;
}
