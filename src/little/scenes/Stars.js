// Stars: the end of a garden. Up to three stars, each with what it was for, then play again.
import Phaser from 'phaser';
import { W, H, setupCamera } from '../layout.js';
import { COLOURS } from '../art/palette.js';
import { bigText, sprite, tween, wait, sky } from '../ui.js';
import { LINES } from '../data/lines.js';
import { say, whenQuiet } from '../voice.js';
import { play } from '../sound.js';

const STARS = [
  { key: 'bee', icon: 'bee' },
  { key: 'water', icon: 'duck_happy' },
  { key: 'cool', icon: 'tree' }
];

export class Stars extends Phaser.Scene {
  constructor() {
    super('Stars');
  }

  init(data) {
    this.result = data.state;
  }

  async create() {
    setupCamera(this);
    sky(this, W, H);
    const g = this.add.graphics();
    g.fillStyle(COLOURS.board, 1);
    g.fillRect(0, 600, W, 120);
    g.fillStyle(COLOURS.grass, 1);
    g.fillEllipse(W / 2, 612, W * 1.3, 80);
    bigText(this, W / 2, 90, 'Hooray!', { size: 84, colour: COLOURS.yellow });
    sprite(this, W / 2 - 60, 540, 'basket', 110);
    bigText(this, W / 2 + 10, 545, String(this.result.basket), { size: 64, origin: [0, 0.5] });

    const stars = this.result.stars;
    const xs = [W / 2 - 320, W / 2, W / 2 + 320];
    const slots = STARS.map((s, i) => {
      sprite(this, xs[i], 270, 'star_empty', 200);
      sprite(this, xs[i], 410, s.icon, 96).setAlpha(stars[s.key] ? 1 : 0.5);
      return s;
    });

    await whenQuiet(5000);
    let won = 0;
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      await wait(this, 400);
      if (stars[s.key]) {
        won++;
        const star = sprite(this, xs[i], 270, 'star', 200);
        const full = star.scale;
        star.setScale(0).setAngle(-90);
        play('star');
        await tween(this, { targets: star, scale: full, angle: 0, duration: 600, ease: 'Back.easeOut' });
        this.tweens.add({ targets: star, scale: full * 1.06, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        say(LINES.stars[s.key]);
      } else {
        say(LINES.nextTime[s.key]);
      }
      await whenQuiet(6000);
    }
    if (won === 3) {
      play('fanfare');
      say(LINES.allStars);
      for (let k = 0; k < 12; k++) {
        const b = sprite(this, Math.random() * W, H + 30, k % 2 ? 'bee' : 'heart', 48);
        this.tweens.add({ targets: b, y: -40, x: b.x + (Math.random() - 0.5) * 200, duration: 2500 + Math.random() * 1500, delay: k * 120 });
      }
      await whenQuiet(4000);
    }
    say(LINES.again);
    const again = sprite(this, W / 2 + 360, 545, 'again', 120);
    this.tweens.add({ targets: again, scale: again.scale * 1.1, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    again.setInteractive({ useHandCursor: true });
    again.on('pointerup', () => {
      play('pop');
      this.scene.start('Garden', { seed: Math.floor(Math.random() * 1e9) });
    });
  }
}
