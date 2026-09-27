// Small UI helpers shared by scenes.
import Phaser from 'phaser';
import { UI } from '../art/palette.js';
import { RES } from './layout.js';

export const FONT = '"Trebuchet MS", "Segoe UI", Verdana, sans-serif';

export function text(scene, x, y, str, opts = {}) {
  const t = scene.add.text(x, y, str, {
    fontFamily: FONT,
    fontSize: `${opts.size ?? 14}px`,
    color: opts.color ?? UI.text,
    fontStyle: opts.bold ? 'bold' : 'normal',
    align: opts.align ?? 'left',
    wordWrap: opts.wrap ? { width: opts.wrap } : undefined,
    lineSpacing: opts.lineSpacing ?? 2
  });
  // Render at full canvas resolution with smooth filtering, so text is never speckled.
  t.setResolution(RES * 1.5);
  t.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
  if (opts.origin) t.setOrigin(...opts.origin);
  return t;
}

// A clickable rectangle button with a label. Returns a container with setEnabled/setActive.
export function button(scene, x, y, w, h, label, onClick, opts = {}) {
  const c = scene.add.container(x, y);
  const bg = scene.add.rectangle(0, 0, w, h, opts.fill ?? UI.panelLight).setOrigin(0).setStrokeStyle(2, 0x000000);
  const t = text(scene, w / 2, h / 2, label, { size: opts.size ?? 14, origin: [0.5, 0.5], bold: opts.bold });
  c.add([bg, t]);
  c.bg = bg;
  c.label = t;
  c.enabled = true;
  c.active = false;
  bg.setInteractive({ useHandCursor: true });
  bg.on('pointerover', () => { if (c.enabled) bg.setStrokeStyle(2, 0xe8b53a); if (opts.onHover) opts.onHover(true); });
  bg.on('pointerout', () => { bg.setStrokeStyle(2, c.active ? 0xe8b53a : 0x000000); if (opts.onHover) opts.onHover(false); });
  // Fullscreen requests must come from pointerup, so buttons can opt into it.
  bg.on(opts.onUp ? 'pointerup' : 'pointerdown', (p) => { if (p.rightButtonDown()) return; if (c.enabled) onClick(); });
  c.setEnabled = (on) => {
    c.enabled = on;
    t.setAlpha(on ? 1 : 0.4);
    return c;
  };
  c.setActive = (on) => {
    c.active = on;
    bg.setFillStyle(on ? (opts.activeFill ?? 0x4d6a3a) : (opts.fill ?? UI.panelLight));
    bg.setStrokeStyle(2, on ? 0xe8b53a : 0x000000);
    return c;
  };
  c.setLabel = (s) => { t.setText(s); return c; };
  return c;
}

export function panel(scene, x, y, w, h, fill = UI.panel) {
  return scene.add.rectangle(x, y, w, h, fill).setOrigin(0).setStrokeStyle(2, 0x000000);
}

export const money = (x) => `£${Math.round(x)}`;
export const fmt1 = (x) => (Math.round(x * 10) / 10).toFixed(1);
