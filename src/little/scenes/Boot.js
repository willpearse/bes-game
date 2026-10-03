// Boot: draw every texture, then show the start screen.
import Phaser from 'phaser';
import { makeTextures } from '../art/draw.js';

export class Boot extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    makeTextures(this);
    this.scene.start('Start');
  }
}
