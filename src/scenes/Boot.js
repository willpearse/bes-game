// Boot: generate placeholder textures from palette-index strings.
import Phaser from 'phaser';
import { PALETTE } from '../art/palette.js';
import { NATURE_SPRITES, BUILDING_SPRITES, ICON_SPRITES } from '../art/sprites.js';
import { natureRows } from '../art/textures.js';
import { INTENSITIES } from '../data/config.js';

export class Boot extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    const g = this.add.graphics();
    const make = (key, rows) => {
      g.clear();
      for (let y = 0; y < rows.length; y++) {
        for (let x = 0; x < rows[y].length; x++) {
          const ch = rows[y][x];
          if (ch === '.') continue;
          g.fillStyle(parseInt(PALETTE[parseInt(ch, 16)].slice(1), 16), 1);
          g.fillRect(x, y, 1, 1);
        }
      }
      g.generateTexture(key, 16, 16);
    };
    for (const habitat of Object.keys(NATURE_SPRITES)) {
      for (const intensity of INTENSITIES) {
        for (const v of ['n', 'i', 'y']) make(`hab_${habitat}_${intensity}_${v}`, natureRows(habitat, intensity, v));
      }
    }
    for (const [k, rows] of Object.entries(BUILDING_SPRITES)) make(`bld_${k}`, rows);
    for (const [k, rows] of Object.entries(ICON_SPRITES)) make(k, rows);
    // A plain white pixel texture for tints and overlays.
    g.clear();
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 4, 4);
    g.generateTexture('px', 4, 4);
    g.destroy();
    this.scene.start('Title');
  }
}
