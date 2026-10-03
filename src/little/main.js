// Little Green: Phaser config for the reception-age game (little.html).
import Phaser from 'phaser';
import { Boot } from './scenes/Boot.js';
import { Start } from './scenes/Start.js';
import { Garden } from './scenes/Garden.js';
import { Stars } from './scenes/Stars.js';
import { W, H, RES } from './layout.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: W * RES,
  height: H * RES,
  antialias: true,
  fps: { smoothStep: false },
  backgroundColor: '#45b4f5',
  input: { activePointers: 2 },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [Boot, Start, Garden, Stars]
};

window.game = new Phaser.Game(config);
