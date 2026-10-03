// Start: one big play button. The tap also unlocks sound and speech on phones and tablets.
import Phaser from 'phaser';
import { W, H, setupCamera } from '../layout.js';
import { COLOURS } from '../art/palette.js';
import { bigText, sprite, sky } from '../ui.js';
import { unlockAudio, play } from '../sound.js';
import { say } from '../voice.js';
import { LINES } from '../data/lines.js';

export class Start extends Phaser.Scene {
  constructor() {
    super('Start');
  }

  create() {
    setupCamera(this);
    sky(this, W, H);
    const g = this.add.graphics();
    g.fillStyle(COLOURS.board, 1);
    g.fillRect(0, 540, W, 180);
    g.fillStyle(COLOURS.grass, 1);
    g.fillEllipse(W / 2, 560, W * 1.3, 120);
    bigText(this, W / 2, 130, 'Little Green', { size: 96, colour: COLOURS.yellow });
    sprite(this, 1110, 110, 'sun', 170);
    const deco = [['tree', 150, 500], ['house_happy', 300, 520], ['flowers', 440, 560], ['veg_3', 840, 560], ['reeds', 990, 540], ['tree', 1140, 510]];
    for (const [key, x, y] of deco) sprite(this, x, y, key, 150);
    const bee = sprite(this, 520, 420, 'bee', 56);
    this.tweens.add({ targets: bee, x: 760, y: 470, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const btn = sprite(this, W / 2, 360, 'play', 220);
    this.tweens.add({ targets: btn, scale: btn.scale * 1.08, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    btn.setInteractive({ useHandCursor: true });
    btn.on('pointerup', () => {
      unlockAudio();
      play('pop');
      say(LINES.welcome, { interrupt: true });
      const seed = new URLSearchParams(window.location.search).get('seed');
      this.scene.start('Garden', { seed: seed ?? Math.floor(Math.random() * 1e9) });
    });
  }
}
