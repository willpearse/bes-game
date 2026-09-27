// Phaser game config.
import Phaser from 'phaser';
import { Boot } from './scenes/Boot.js';
import { Title } from './scenes/Title.js';
import { Game } from './scenes/Game.js';
import { UI } from './scenes/UI.js';
import { End } from './scenes/End.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: 1280,
  height: 720,
  pixelArt: true,
  backgroundColor: '#1b1b24',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [Boot, Title, Game, UI, End]
};

window.game = new Phaser.Game(config);
