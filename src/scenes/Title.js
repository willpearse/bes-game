// Title: variant settings and high scores.
import Phaser from 'phaser';
import { CONFIG } from '../data/config.js';
import { setupCamera } from '../ui/layout.js';
import { UI } from '../art/palette.js';
import { text, button, panel } from '../ui/widgets.js';
import { configFromUrl, highScores, variantLabel, savedSettings, saveSettings } from '../ui/prefs.js';

const OPTIONS = [
  { key: 'marketMode', label: 'Tiles', choices: [['market', 'Market'], ['menu', 'Menu']],
    tip: 'Market: take tiles from a changing row of 6. Menu: build anything unlocked.' },
  { key: 'wasteMode', label: 'Waste', choices: [['tokens', 'Flows downhill'], ['simple', 'Simple']],
    tip: 'Flows downhill: waste tokens run into rivers and the sea. Simple: waste only affects neighbours.' },
  { key: 'happinessMode', label: 'Happiness', choices: [['perTurn', 'Every turn'], ['endGame', 'At the end']],
    tip: 'When happiness multiplies your GDP.' },
  { key: 'populationPressure', label: 'Crowding', choices: [[false, 'Off'], [true, 'On']],
    tip: 'On: happiness drops as the population passes 10, 20, 30 and 40.' }
];

export class Title extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  init(data) {
    const url = data?.fromUrl === false ? {} : configFromUrl();
    const saved = savedSettings();
    this.cfg = { ...CONFIG, ...saved, ...url, ...(data?.config ?? {}) };
    if (!('seed' in url) && !data?.config?.seed) this.cfg.seed = null;
    this.seedText = this.cfg.seed == null ? '' : String(this.cfg.seed);
    this.editingSeed = false;
  }

  create() {
    setupCamera(this);
    this.cameras.main.setBackgroundColor(UI.bg);
    // Decorative strip of habitats.
    const strip = ['peat', 'moorland', 'heath', 'meadow', 'woodland', 'fen', 'river', 'saltmarsh', 'dunes', 'seagrass', 'openSea'];
    for (let i = 0; i < 27; i++) {
      const h = strip[i % strip.length];
      this.add.image(i * 48, 0, `hab_${h}_minimal_n`).setOrigin(0).setScale(1.5);
      this.add.image(i * 48, 672, `hab_${strip[(i + 5) % strip.length]}_minimal_n`).setOrigin(0).setScale(1.5);
    }
    ['cottages', 'familyFarm', 'windFarm', 'fishingFleet', 'school'].forEach((b, i) => {
      this.add.image(84 + i * 70, 184, `bld_${b}`).setScale(2).setOrigin(0.5);
    });

    text(this, 60, 72, 'Green and Pleasant', { size: 52, bold: true, color: UI.gold });
    text(this, 64, 136, 'Plan a corner of Britain. Grow the economy. Find out how much of it nature pays for.', { size: 16, color: UI.text });

    text(this, 64, 232,
      'Each turn, build one tile or restore some nature. Built tiles earn money, and much of it\n' +
      'depends on pollinators, clean water, flood defences, clean air and lovely places to walk.\n' +
      'Development puts pressure on nature. Waste flows downhill into rivers and the sea.\n' +
      'Three events will test whether nature is protecting you. 24 turns, about 10 to 15 minutes.',
      { size: 15, color: UI.text, lineSpacing: 6 });

    panel(this, 60, 350, 640, 300);
    text(this, 80, 364, 'Game settings', { size: 18, bold: true, color: UI.gold });
    this.optionButtons = [];
    OPTIONS.forEach((opt, i) => {
      const y = 400 + i * 44;
      text(this, 80, y + 8, opt.label, { size: 15 });
      opt.choices.forEach(([value, label], j) => {
        const b = button(this, 200 + j * 170, y, 160, 32, label, () => {
          this.cfg[opt.key] = value;
          this.refresh();
        }, { onHover: (on) => this.tip.setText(on ? opt.tip : '') });
        b.opt = opt;
        b.value = value;
        this.optionButtons.push(b);
      });
    });
    const sy = 400 + OPTIONS.length * 44;
    text(this, 80, sy + 8, 'Seed', { size: 15 });
    this.seedButton = button(this, 200, sy, 160, 32, '', () => {
      this.editingSeed = true;
      this.refresh();
    }, { onHover: (on) => this.tip.setText(on ? 'Click and type a number to replay a game. Leave empty for a random game.' : '') });
    this.randomButton = button(this, 370, sy, 160, 32, 'Clear', () => {
      this.seedText = '';
      this.editingSeed = false;
      this.refresh();
    });
    this.tip = text(this, 80, 620, '', { size: 13, color: UI.dim, wrap: 600 });

    if (this.scale.fullscreen.available) {
      const fs = button(this, 1196, 64, 56, 40, '', () => this.scale.toggleFullscreen(), {
        onUp: true, onHover: (on) => this.tip.setText(on ? 'Full screen on or off.' : '')
      });
      fs.add(this.add.image(28, 20, 'icon_fullscreen').setScale(0.75));
    } else if (this.sys.game.device.input.touch) {
      text(this, 740, 632, 'To play full screen on iPhone or iPad: tap Share, then "Add to Home Screen".', { size: 12, color: UI.dim, wrap: 480 });
    }

    this.startButton = button(this, 740, 560, 480, 64, 'Start game', () => this.start(), { size: 24, bold: true, fill: 0x4d6a3a });

    panel(this, 740, 350, 480, 196);
    this.scoreTitle = text(this, 760, 362, '', { size: 16, bold: true, color: UI.gold });
    this.scoreVariant = text(this, 760, 384, '', { size: 11, color: UI.dim, wrap: 440 });
    this.scoreList = text(this, 760, 404, '', { size: 13, lineSpacing: 1 });

    this.input.keyboard.on('keydown', (e) => {
      if (e.key === 'Enter') {
        if (this.editingSeed) { this.editingSeed = false; this.refresh(); } else this.start();
        return;
      }
      if (!this.editingSeed) return;
      if (/^[0-9]$/.test(e.key) && this.seedText.length < 10) this.seedText += e.key;
      else if (e.key === 'Backspace') this.seedText = this.seedText.slice(0, -1);
      else if (e.key === 'Escape') this.editingSeed = false;
      this.refresh();
    });
    this.refresh();
  }

  refresh() {
    for (const b of this.optionButtons) b.setActive(this.cfg[b.opt.key] === b.value);
    const shown = this.seedText === '' ? (this.editingSeed ? '_' : 'Random') : this.seedText + (this.editingSeed ? '_' : '');
    this.seedButton.setLabel(shown).setActive(this.editingSeed);
    this.randomButton.setEnabled(this.seedText !== '');
    const scores = highScores(this.cfg);
    this.scoreTitle.setText('High scores');
    this.scoreVariant.setText(variantLabel(this.cfg));
    const cols = scores.length
      ? scores.map((s, i) => `${String(i + 1).padStart(2, ' ')}.  £${Math.round(s.score)}   nature ${Math.round((s.natureShare ?? 0) * 100)}%   seed ${s.seed}`).join('\n')
      : 'No scores yet for these settings.';
    this.scoreList.setText(cols);
  }

  start() {
    const cfg = { ...this.cfg, seed: this.seedText === '' ? null : Number(this.seedText) };
    saveSettings({
      marketMode: cfg.marketMode, wasteMode: cfg.wasteMode,
      happinessMode: cfg.happinessMode, populationPressure: cfg.populationPressure
    });
    this.scene.start('Game', { config: cfg });
  }
}
