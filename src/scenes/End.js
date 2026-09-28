// End: summary of the game, nature's contribution and high scores.
import Phaser from 'phaser';
import { UI as C, OVERLAY_COLOURS } from '../art/palette.js';
import { SERVICES, SERVICE_KEYS } from '../data/services.js';
import { W, setupCamera } from '../ui/layout.js';
import { text, button, panel, money } from '../ui/widgets.js';
import { addHighScore, variantLabel, personalBest, isPlatinum } from '../ui/prefs.js';

const MEDAL_COLOURS = { platinum: '#b8e6f5', gold: '#e8b53a', silver: '#d4d4dc', bronze: '#d08a4a' };

export class End extends Phaser.Scene {
  constructor() {
    super('End');
  }

  init(data) {
    this.st = data.state;
  }

  create() {
    const st = this.st;
    const f = st.final;
    setupCamera(this);
    this.cameras.main.setBackgroundColor(C.bg);
    const platinum = isPlatinum(f.medal, f.score, personalBest(st.config));
    const entry = { score: f.score, natureShare: f.natureShare, seed: st.seed, date: Date.now(), medal: platinum ? 'platinum' : f.medal };
    const { list, rank } = addHighScore(st.config, entry);

    text(this, 40, 24, `${st.mapName}: after ${st.config.turns} turns`, { size: 26, bold: true, color: C.gold });
    text(this, 40, 62, `Seed ${st.seed}  ·  ${variantLabel(st.config)}`, { size: 13, color: C.dim });

    // Score breakdown.
    panel(this, 40, 96, 380, 250);
    text(this, 60, 108, 'Final score', { size: 16, color: C.dim });
    text(this, 60, 128, money(f.score), { size: 44, bold: true, color: C.gold });
    const medal = platinum ? 'platinum' : f.medal;
    const medalName = { platinum: 'Platinum!', gold: 'Gold medal', silver: 'Silver medal', bronze: 'Bronze medal' }[medal] ?? 'No medal';
    const next = platinum ? 'Your own world record: your best ever gold on this device.'
      : medal === 'gold' ? 'Beat your best score here for platinum.'
        : medal === 'silver' ? `Gold needs a score of ${money(f.goldScore)}.`
          : medal === 'bronze' ? 'Silver needs both objectives met.'
            : `Bronze needs ${f.housingTarget} residents and everyone fed at the end.`;
    text(this, 250, 118, medalName, { size: 18, bold: true, color: MEDAL_COLOURS[medal] ?? C.dim });
    text(this, 250, 142, next, { size: 11, color: C.dim, wrap: 160 });
    const lines = [
      `GDP earned: ${money(f.gdp)}`,
      `   after waste bills ${money(f.wasteBill)}, fertiliser ${money(f.fertiliser)}, food ${money(f.foodCost)}` +
        (f.upkeep ? `, running costs ${money(f.upkeep)}` : ''),
      `Event damage: −${money(f.eventDamage)}${f.destroyed ? ` (${f.destroyed} tile${f.destroyed === 1 ? '' : 's'} wrecked)` : ''}`,
      f.housingShortfall > 0
        ? `✘ Homes ${f.residents}/${f.housingTarget}: −${money(f.housingPenalty)}`
        : `✔ Homes ${f.residents}/${f.housingTarget}: target met`
    ];
    if (st.config.happinessMode === 'endGame') lines.push(`Happiness multiplier: ×${f.endMultiplier.toFixed(2)}`);
    f.objectives.forEach((o) => lines.push(`${o.met ? '✔' : '✘'} ${o.name}: ${o.met ? `+${money(o.bonus)}` : 'not met'}`));
    text(this, 60, 190, lines.join('\n'), { size: 14, lineSpacing: 3 });

    // Nature's contribution: the central message.
    panel(this, 440, 96, 800, 250, 0x2b3a2b).setStrokeStyle(3, 0x86b04a);
    text(this, 464, 108, "Nature's contribution to your economy", { size: 18, bold: true, color: C.good });
    const pct = Math.round(f.natureShare * 100);
    text(this, 464, 136, money(f.natureContribution), { size: 56, bold: true, color: C.text });
    text(this, 464, 204, pct > 100
      ? 'More than all the GDP you earned: without it, your region would have lost money.'
      : `That is ${pct}% of all the GDP your region earned.`, { size: pct > 100 ? 17 : 20, color: C.text });
    text(this, 464, 236,
      'This is what you would have lost if pollinators, green space and clean air,\nand clean water had simply not been there.',
      { size: 14, color: C.dim, lineSpacing: 4 });
    text(this, 464, 290, `In events, nature also saved you ${money(f.damageAvoided)} of damage (${f.eventHits} tile${f.eventHits === 1 ? '' : 's'} were hit).`,
      { size: 15, color: C.text, wrap: 760 });

    // Per-service bars.
    panel(this, 40, 364, 700, 300);
    text(this, 60, 376, 'Contribution by service', { size: 16, bold: true, color: C.gold });
    const max = Math.max(1, ...SERVICE_KEYS.map((k) => f.perService[k]));
    SERVICE_KEYS.forEach((k, i) => {
      const y = 414 + i * 44;
      this.add.image(76, y + 12, SERVICES[k].icon).setScale(1);
      text(this, 100, y + 2, SERVICES[k].name, { size: 13 });
      const w = Math.max(2, (f.perService[k] / max) * 380);
      this.add.rectangle(100, y + 22, w, 12, OVERLAY_COLOURS[k]).setOrigin(0);
      text(this, 100 + w + 8, y + 16, money(f.perService[k]), { size: 13, bold: true });
    });
    text(this, 60, 636, "These overlap, so they don't add up to the total.", { size: 12, color: C.dim });

    // Wildlife.
    panel(this, 760, 364, 480, 120);
    text(this, 780, 376, 'Wildlife', { size: 16, bold: true, color: C.gold });
    text(this, 780, 404,
      `Biodiversity intactness: ${Math.round(f.startIntactness * 100)}% → ${Math.round(f.endIntactness * 100)}%\n` +
      `Ancient habitats lost: ${f.primaryLost}`,
      { size: 15, lineSpacing: 6 });

    // High scores.
    panel(this, 760, 496, 480, 168);
    text(this, 780, 504, 'High scores (this device, these settings)', { size: 13, bold: true, color: C.gold });
    list.slice(0, 10).forEach((e, i) => {
      const col = i < 5 ? 0 : 1;
      const row = i % 5;
      const mine = i === rank;
      text(this, 780 + col * 230, 526 + row * 22, `${i + 1}. ${money(e.score)}  seed ${e.seed}`, { size: 13, color: mine ? C.gold : C.text, bold: mine });
    });

    button(this, 40, 676, 220, 36, 'Replay this seed', () => this.scene.start('Game', { config: { ...st.config, seed: st.seed } }), { bold: true });
    button(this, 270, 676, 220, 36, 'New game', () => this.scene.start('Title', { fromUrl: false, config: { ...st.config, seed: null, objectives: null } }), { bold: true, fill: 0x4d6a3a });
    if (rank === 0 && list.length > 1) text(this, W - 40, 30, 'New high score!', { size: 22, bold: true, color: C.gold, origin: [1, 0] });
  }
}
