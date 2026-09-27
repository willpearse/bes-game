// Phaser game config.
import Phaser from 'phaser';
import { Boot } from './scenes/Boot.js';
import { Title } from './scenes/Title.js';
import { Game } from './scenes/Game.js';
import { UI } from './scenes/UI.js';
import { End } from './scenes/End.js';
import { W, H, RES } from './ui/layout.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  // Logical size is 1280x720; the canvas is RES times bigger for sharp text (see ui/layout.js).
  width: W * RES,
  height: H * RES,
  pixelArt: true,
  backgroundColor: '#1b1b24',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    fullscreenTarget: 'game'
  },
  scene: [Boot, Title, Game, UI, End]
};

window.game = new Phaser.Game(config);

// pixelArt makes Phaser set 'image-rendering: pixelated' on the canvas, which turns text into
// speckles whenever the browser shrinks the canvas to fit the window. Sprites are already drawn
// on whole pixels inside the canvas, so smooth browser scaling keeps both sprites and text clear.
const smoothCanvas = () => { if (window.game.canvas) window.game.canvas.style.imageRendering = 'auto'; };
window.game.events.once('ready', smoothCanvas);
smoothCanvas();
