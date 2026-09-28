// Title: settings, the objective choice (pick 2 of 4) and high scores.
import Phaser from 'phaser';
import { CONFIG } from '../data/config.js';
import { OBJECTIVES } from '../data/objectives.js';
import { setupCamera } from '../ui/layout.js';
import { UI } from '../art/palette.js';
import { text, button, panel } from '../ui/widgets.js';
import { configFromUrl, highScores, variantLabel, savedSettings, saveSettings, natureAnimations, setNatureAnimations } from '../ui/prefs.js';
import { createGame } from '../engine/state.js';
import { randomSeed } from '../engine/rng.js';

// Flowing waste and crowding are always on in normal play. They can still be switched with
// URL flags (?waste=simple&pressure=0) for testing, but are not offered here.
const OPTIONS = [
  { key: 'mapId', label: 'Map', choices: [['estuary', 'River estuary'], ['millValley', 'Mill valley']],
    tip: 'River estuary: wild, healthy land and a tiny village; aim for 16 residents. Mill valley: a busy, worn valley with a town, farms and a mill; aim for 30.' },
  { key: 'marketMode', label: 'Tiles', choices: [['market', 'Market'], ['menu', 'Menu']],
    tip: 'Market: take tiles from a changing row of 6. Menu: build anything unlocked.' },
  { key: 'happinessMode', label: 'Happiness', choices: [['perTurn', 'Every turn'], ['endGame', 'At the end']],
    tip: 'When happiness multiplies your GDP.' },
  { key: 'animations', label: 'Nature at work', choices: [[true, 'Show'], [false, 'Hide']],
    tip: 'Show bees, water, leaves and walkers travelling from nature to the tiles they help. Press N in game to switch.' }
];

export class Title extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  init(data) {
    const url = data?.fromUrl === false ? {} : configFromUrl();
    const saved = savedSettings();
    this.cfg = {
      ...CONFIG,
      mapId: saved.mapId ?? CONFIG.mapId,
      marketMode: saved.marketMode ?? CONFIG.marketMode,
      happinessMode: saved.happinessMode ?? CONFIG.happinessMode,
      ...url,
      ...(data?.config ?? {})
    };
    this.cfg.animations = natureAnimations();
    const fixedSeed = 'seed' in url || data?.config?.seed != null;
    this.seedText = fixedSeed && this.cfg.seed != null ? String(this.cfg.seed) : '';
    this.randomSeedValue = randomSeed();
    this.editingSeed = false;
    this.chosen = [];
    this.offerSeed = null;
  }

  // The seed a game started now would use.
  currentSeed() {
    return this.seedText === '' ? this.randomSeedValue : Number(this.seedText);
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

    text(this, 60, 64, 'Green and Pleasant', { size: 52, bold: true, color: UI.gold });
    text(this, 64, 128, 'Plan a corner of Britain. Grow the economy. Find out how much of it nature pays for.', { size: 15, color: UI.text });

    text(this, 64, 222,
      'Each turn, build one tile or restore some nature. Reach the housing target and keep everyone fed.\n' +
      'The nature touching each tile does the work: pollinators for farms, green space for happy\n' +
      'residents, wetlands that soak up waste (saving your waste bill) and hold back floods.\n' +
      'Three events will test whether nature is protecting you. 24 turns, about 10 to 15 minutes.',
      { size: 14, color: UI.text, lineSpacing: 5 });

    // Settings.
    panel(this, 60, 322, 640, 262);
    text(this, 80, 332, 'Game settings', { size: 17, bold: true, color: UI.gold });
    this.optionButtons = [];
    OPTIONS.forEach((opt, i) => {
      const y = 364 + i * 42;
      text(this, 80, y + 8, opt.label, { size: 15 });
      opt.choices.forEach(([value, label], j) => {
        const b = button(this, 220 + j * 170, y, 160, 32, label, () => {
          this.cfg[opt.key] = value;
          if (opt.key === 'animations') setNatureAnimations(value);
          this.refresh();
        }, { onHover: (on) => this.tip.setText(on ? opt.tip : '') });
        b.opt = opt;
        b.value = value;
        this.optionButtons.push(b);
      });
    });
    const sy = 364 + OPTIONS.length * 42;
    text(this, 80, sy + 8, 'Seed', { size: 15 });
    this.seedButton = button(this, 220, sy, 160, 32, '', () => {
      this.editingSeed = true;
      this.refresh();
    }, { onHover: (on) => this.tip.setText(on ? 'Click and type a number to replay a game. The seed sets the map\'s market, events and the objectives on offer.' : '') });
    this.randomButton = button(this, 390, sy, 160, 32, 'New random', () => {
      this.seedText = '';
      this.randomSeedValue = randomSeed();
      this.editingSeed = false;
      this.refresh();
    });
    this.tip = text(this, 80, sy + 44, '', { size: 12, color: UI.dim, wrap: 600 });

    // High scores.
    panel(this, 60, 594, 640, 72);
    this.scoreTitle = text(this, 80, 600, 'High scores', { size: 14, bold: true, color: UI.gold });
    this.scoreVariant = text(this, 200, 602, '', { size: 11, color: UI.dim });
    this.scoreList = text(this, 80, 622, '', { size: 12, lineSpacing: 2, wrap: 600 });

    // Objectives: pick 2 of the 4 on offer.
    panel(this, 740, 60, 480, 500);
    text(this, 760, 70, 'Choose 2 objectives (+£50 each if met)', { size: 17, bold: true, color: UI.gold });
    this.objNote = text(this, 760, 94, '', { size: 12, color: UI.dim });
    this.objCards = [0, 1, 2, 3].map((i) => {
      const y = 116 + i * 110;
      const c = this.add.container(756, y);
      const bg = this.add.rectangle(0, 0, 448, 102, UI.panelLight).setOrigin(0).setStrokeStyle(2, 0x000000);
      const tick = text(this, 14, 10, '', { size: 20, bold: true, color: UI.gold });
      const name = text(this, 44, 10, '', { size: 16, bold: true });
      const statement = text(this, 44, 34, '', { size: 14, wrap: 390 });
      const why = text(this, 44, 58, '', { size: 12, color: UI.dim, wrap: 390 });
      c.add([bg, tick, name, statement, why]);
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerdown', () => this.toggleObjective(i));
      Object.assign(c, { bg, tick, name, statement, why });
      return c;
    });

    this.startButton = button(this, 740, 574, this.scale.fullscreen.available ? 416 : 480, 64, 'Start game', () => this.start(),
      { size: 24, bold: true, fill: 0x4d6a3a });
    if (this.scale.fullscreen.available) {
      const fs = button(this, 1164, 574, 56, 64, '', () => this.scale.toggleFullscreen(), {
        onUp: true, onHover: (on) => this.tip.setText(on ? 'Full screen on or off.' : '')
      });
      fs.add(this.add.image(28, 32, 'icon_fullscreen').setScale(0.75));
    } else if (this.sys.game.device.input.touch) {
      text(this, 740, 644, 'To play full screen on iPhone or iPad: tap Share, then "Add to Home Screen".', { size: 11, color: UI.dim, wrap: 480 });
    }

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

  // The objectives on offer come from the seed, exactly as the game will draw them.
  refreshOffer() {
    const seed = this.currentSeed();
    if (seed === this.offerSeed) return;
    this.offerSeed = seed;
    this.offer = createGame({ config: { ...this.cfg, objectives: null }, seed }).objectiveOffer;
    const keep = (this.cfg.objectives ?? []).filter((id) => this.offer.includes(id));
    this.chosen = keep.length === this.cfg.objectiveCount ? keep : this.offer.slice(0, this.cfg.objectiveCount);
  }

  toggleObjective(i) {
    const id = this.offer[i];
    if (this.chosen.includes(id)) this.chosen = this.chosen.filter((x) => x !== id);
    else {
      this.chosen = this.chosen.concat([id]);
      if (this.chosen.length > this.cfg.objectiveCount) this.chosen.shift();
    }
    this.refresh();
  }

  refresh() {
    this.refreshOffer();
    for (const b of this.optionButtons) b.setActive(this.cfg[b.opt.key] === b.value);
    const shown = this.seedText === '' ? (this.editingSeed ? '_' : 'Random') : this.seedText + (this.editingSeed ? '_' : '');
    this.seedButton.setLabel(shown).setActive(this.editingSeed);

    this.objNote.setText(`Seed ${this.currentSeed()} offers these four. Click to choose.`);
    this.offer.forEach((id, i) => {
      const o = OBJECTIVES[id];
      const c = this.objCards[i];
      const on = this.chosen.includes(id);
      c.tick.setText(on ? '✔' : '○');
      c.name.setText(o.name);
      c.statement.setText(o.text);
      c.why.setText(o.why);
      c.bg.setFillStyle(on ? 0x3d4f2e : UI.panelLight).setStrokeStyle(on ? 3 : 2, on ? 0xe8b53a : 0x000000);
    });
    const ready = this.chosen.length === this.cfg.objectiveCount;
    this.startButton.setEnabled(ready).setLabel(ready ? 'Start game' : `Choose ${this.cfg.objectiveCount - this.chosen.length} more objective${this.cfg.objectiveCount - this.chosen.length > 1 ? 's' : ''}`);

    const scores = highScores(this.cfg);
    this.scoreVariant.setText(variantLabel(this.cfg));
    this.scoreList.setText(scores.length
      ? scores.slice(0, 6).map((s, i) => `${i + 1}. £${Math.round(s.score)}${s.medal ? ` ${s.medal}` : ''} (seed ${s.seed})`).join('    ')
      : 'No scores yet for these settings.');
  }

  start() {
    if (this.chosen.length !== this.cfg.objectiveCount) return;
    const { animations, ...rest } = this.cfg;
    const cfg = { ...rest, seed: this.currentSeed(), objectives: this.chosen.slice() };
    saveSettings({ mapId: cfg.mapId, marketMode: cfg.marketMode, happinessMode: cfg.happinessMode });
    this.scene.start('Game', { config: cfg });
  }
}
