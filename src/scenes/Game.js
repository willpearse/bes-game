// Game: board rendering and input. Runs alongside the UI scene.
import Phaser from 'phaser';
import { GameSession } from '../session.js';
import { UI, OVERLAY_COLOURS } from '../art/palette.js';
import { natureKey } from '../art/textures.js';
import { SPRITE_SIZE } from '../art/sprites.js';
import { TILE, BOARD_X, BOARD_Y, BOARD_SIZE, cellToXY, cellCentre, setupCamera, logicalPointer } from '../ui/layout.js';
import { text, fmt1 } from '../ui/widgets.js';
import { flowTarget, wasteTokensAt } from '../engine/waste.js';
import { cellAt } from '../engine/grid.js';
import { markPlayed, natureAnimations, setNatureAnimations } from '../ui/prefs.js';
import { deliveries } from '../engine/services.js';
import { RESTORATIONS } from '../data/restorations.js';
import { SERVICES, SERVICE_KEYS } from '../data/services.js';


const lerpColour = (a, b, t) => {
  const c = Phaser.Display.Color.Interpolate.ColorWithColor(
    Phaser.Display.Color.ValueToColor(a), Phaser.Display.Color.ValueToColor(b), 100, Math.round(t * 100));
  return Phaser.Display.Color.GetColor(c.r, c.g, c.b);
};

export class Game extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  init(data) {
    this.session = new GameSession(data.config);
    this.registry.set('session', this.session);
  }

  create() {
    setupCamera(this);
    this.cameras.main.setBackgroundColor(UI.bg);
    const s = this.session;
    const st = s.state;

    // Board frame.
    this.add.rectangle(BOARD_X - 6, BOARD_Y - 6, BOARD_SIZE + 12, BOARD_SIZE + 12, 0x000000).setOrigin(0);
    this.cells = [];
    for (const cell of st.cells) {
      const { x, y } = cellToXY(cell.row, cell.col);
      const v = {
        ground: this.add.image(x, y, 'px').setOrigin(0).setScale(TILE / SPRITE_SIZE).setDepth(0),
        building: this.add.image(x, y, 'px').setOrigin(0).setScale(TILE / SPRITE_SIZE).setDepth(1).setVisible(false),
        primary: this.add.image(x, y, 'primaryMark').setOrigin(0).setScale(TILE / SPRITE_SIZE).setDepth(2).setVisible(false),
        reserve: this.add.image(x, y, 'reserveMark').setOrigin(0).setScale(TILE / SPRITE_SIZE).setDepth(2).setVisible(false),
        tint: this.add.rectangle(x, y, TILE, TILE, 0x000000, 0).setOrigin(0).setDepth(3),
        waste: this.add.image(x - 2, y + TILE - 30, 'waste').setOrigin(0).setScale(1).setDepth(4).setVisible(false),
        wasteText: text(this, x + 30, y + TILE - 20, '', { size: 12, bold: true }).setDepth(4),
        badge: text(this, x + TILE - 2, y + TILE - 2, '', { size: 12, bold: true, color: '#ffffff', origin: [1, 1] }).setDepth(6),
        debug: text(this, x + 2, y + 1, '', { size: 9, color: '#ffffff' }).setDepth(7),
        ghost: this.add.image(x + TILE / 2, y + TILE / 2, 'px').setScale(0.875).setAlpha(0.7).setDepth(5).setVisible(false)
      };
      v.badge.setBackgroundColor('#1b1b24cc').setPadding(2, 0, 2, 0);
      v.debug.setBackgroundColor('#00000099');
      this.cells.push(v);
    }
    this.targetG = this.add.graphics().setDepth(5);
    this.hoverG = this.add.graphics().setDepth(5);
    this.arrowG = this.add.graphics().setDepth(4);
    this.sourceIcons = SERVICE_KEYS.map((k) => this.add.image(0, 0, SERVICES[k].icon).setScale(0.6).setDepth(8).setVisible(false));
    this.hoverLabel = text(this, 0, 0, '', { size: 13, bold: true, color: '#ffffff' }).setDepth(8).setVisible(false);
    this.hoverLabel.setBackgroundColor('#1b1b24ee').setPadding(4, 2, 4, 2);
    this.animLayer = this.add.container(0, 0).setDepth(9);

    // Input.
    const zone = this.add.zone(BOARD_X, BOARD_Y, BOARD_SIZE, BOARD_SIZE).setOrigin(0).setInteractive();
    zone.on('pointermove', (p) => this.onMove(p));
    zone.on('pointerout', () => { s.setHover(null); });
    zone.on('pointerdown', (p) => {
      if (p.rightButtonDown()) { s.cancel(); return; }
      const c = this.pointerCell(p);
      if (c) s.clickCell(c.row, c.col);
    });
    this.input.mouse?.disableContextMenu();
    this.input.on('pointerdown', (p) => { if (p.rightButtonDown()) s.cancel(); });
    this.input.keyboard.on('keydown-ESC', () => s.cancel());
    this.input.keyboard.on('keydown-D', () => s.toggleDebug());
    this.input.keyboard.on('keydown-N', () => {
      setNatureAnimations(!natureAnimations());
      s.emit('toast', natureAnimations() ? 'Nature at work: animations on (N to turn off).' : 'Nature at work: animations off (N to turn on).');
    });

    const onSel = () => { this.drawTargets(); this.drawHover(); };
    const onHover = () => this.drawHover();
    const onOverlay = () => this.renderBoard();
    const onTurn = (e) => this.onTurn(e);
    s.on('selection', onSel);
    s.on('hover', onHover);
    s.on('overlay', onOverlay);
    s.on('turn', onTurn);
    this.events.once('shutdown', () => {
      s.off('selection', onSel); s.off('hover', onHover); s.off('overlay', onOverlay); s.off('turn', onTurn);
    });

    this.renderBoard();
    this.drawTargets();
    this.scene.launch('UI');
    this.tweens.add({ targets: this.targetG, alpha: { from: 1, to: 0.45 }, duration: 600, yoyo: true, repeat: -1 });
  }

  pointerCell(p) {
    const pt = logicalPointer(this, p);
    const col = Math.floor((pt.x - BOARD_X) / TILE);
    const row = Math.floor((pt.y - BOARD_Y) / TILE);
    if (row < 0 || col < 0 || row >= this.session.state.height || col >= this.session.state.width) return null;
    return { row, col };
  }

  onMove(p) {
    const c = this.pointerCell(p);
    const h = this.session.hover;
    if (!c && !h) return;
    if (c && h && c.row === h.row && c.col === h.col) return;
    this.session.setHover(c);
  }

  renderBoard() {
    const s = this.session;
    const st = s.state;
    const ov = s.overlay;
    this.arrowG.clear();
    for (const cell of st.cells) {
      const v = this.cells[cell.row * st.width + cell.col];
      const built = cell.kind === 'built';
      // Ground: built tiles stand on a worn version of their habitat.
      const groundIntensity = built ? 'intense' : cell.intensity;
      const groundUse = built ? 'matureSecondary' : cell.landUse;
      v.ground.setTexture(natureKey(cell.habitat, groundIntensity, groundUse));
      v.building.setVisible(built);
      if (built) v.building.setTexture(`bld_${cell.building}`);
      v.primary.setVisible(!built && cell.landUse === 'primary');
      v.reserve.setVisible(cell.reserve);

      // Overlay tint.
      let alpha = 0;
      let colour = 0x000000;
      v.badge.setText('');
      if (ov === 'BIO') {
        colour = lerpColour(0x2a1f2a, OVERLAY_COLOURS.BIO, cell.B);
        alpha = 0.78;
      } else if (SERVICE_KEYS.includes(ov)) {
        const val = cell.supply?.[ov] ?? 0;
        colour = lerpColour(0x1b1b24, OVERLAY_COLOURS[ov], Math.min(1, val / 3));
        alpha = 0.8;
        if (built) {
          v.badge.setText(fmt1(cell.received?.[ov] ?? 0));
        }
      } else if (ov === 'WASTE') {
        colour = 0x1b1b24;
        alpha = 0.45;
      }
      v.tint.setFillStyle(colour, alpha);

      // Waste tokens.
      const tokens = wasteTokensAt(st, cell);
      const showWaste = tokens > 0 && (st.config.wasteMode === 'tokens' || ov === 'WASTE');
      v.waste.setVisible(showWaste && !this.animatingWaste);
      v.wasteText.setText(showWaste && !this.animatingWaste && tokens > 1 ? `${tokens}` : '');
      if (ov === 'WASTE' && st.config.wasteMode === 'tokens') {
        const t = flowTarget(st, cell);
        if (t) this.drawArrow(cell, t);
      }

      // Debug view.
      if (s.debug) {
        v.debug.setText(`e${cell.elevation} p${cell.pressure}\nB${cell.B.toFixed(2)}\nw${cell.waste}`).setVisible(true);
      } else {
        v.debug.setVisible(false);
      }
    }
    this.drawHover();
  }

  drawArrow(from, to) {
    const a = cellCentre(from.row, from.col);
    const b = cellCentre(to.row, to.col);
    const dx = (b.x - a.x) * 0.34;
    const dy = (b.y - a.y) * 0.34;
    const g = this.arrowG;
    g.lineStyle(2, 0xc9a36b, 0.9);
    g.lineBetween(a.x - dx * 0.4, a.y - dy * 0.4, a.x + dx, a.y + dy);
    const ang = Math.atan2(dy, dx);
    const hx = a.x + dx;
    const hy = a.y + dy;
    g.fillStyle(0xc9a36b, 0.9);
    g.fillTriangle(
      hx + Math.cos(ang) * 6, hy + Math.sin(ang) * 6,
      hx + Math.cos(ang + 2.4) * 6, hy + Math.sin(ang + 2.4) * 6,
      hx + Math.cos(ang - 2.4) * 6, hy + Math.sin(ang - 2.4) * 6
    );
  }

  drawTargets() {
    const g = this.targetG;
    const s = this.session;
    g.clear();
    g.lineStyle(3, 0xe8b53a, 1);
    for (const v of this.cells) v.ghost.setVisible(false);
    // Restore actions show a faint icon on every square they can be used on.
    const icon = s.choice?.type === 'restore' ? RESTORATIONS[s.choice.restoration].icon : null;
    for (const t of s.targets) {
      const { x, y } = cellToXY(t.row, t.col);
      g.strokeRect(x + 2, y + 2, TILE - 4, TILE - 4);
      if (icon) this.cells[t.row * s.state.width + t.col].ghost.setTexture(icon).setVisible(true);
    }
  }

  drawHover() {
    const s = this.session;
    const g = this.hoverG;
    g.clear();
    this.hoverLabel.setVisible(false);
    const h = s.hover;
    if (s.inspected) {
      const { x, y } = cellToXY(s.inspected.row, s.inspected.col);
      g.lineStyle(2, 0x7fb2d6, 1);
      g.strokeRect(x + 1, y + 1, TILE - 2, TILE - 2);
    }
    if (!h) return;
    const { x, y } = cellToXY(h.row, h.col);
    g.lineStyle(2, 0xffffff, 1);
    g.strokeRect(x, y, TILE, TILE);
    const pv = s.choice && s.isTarget(h.row, h.col) ? s.previewAt(h.row, h.col) : null;
    s.currentPreview = pv;
    for (const ic of this.sourceIcons) ic.setVisible(false);
    if (pv) {
      g.lineStyle(3, 0xd9634f, 1);
      for (const c of pv.intensityChanges) {
        const p = cellToXY(c.row, c.col);
        g.strokeRect(p.x + 3, p.y + 3, TILE - 6, TILE - 6);
      }
      // Faint arrows from the squares that would supply the new tile.
      const to = cellCentre(h.row, h.col);
      pv.sources.forEach((src, i) => {
        const from = cellCentre(src.row, src.col);
        const off = (i - (pv.sources.length - 1) / 2) * 5;
        g.lineStyle(2, OVERLAY_COLOURS[src.service], 0.9);
        g.lineBetween(from.x + off, from.y + off, to.x, to.y);
        // Icons from the same square sit side by side.
        const same = pv.sources.filter((o) => o.row === src.row && o.col === src.col);
        const k = same.indexOf(src);
        const ic = this.sourceIcons[SERVICE_KEYS.indexOf(src.service)];
        ic.setPosition(from.x + (k - (same.length - 1) / 2) * 16, from.y - 12).setVisible(true);
      });
    }
    // Numbers on hover so overlays never rely on colour alone.
    const cell = cellAt(s.state, h.row, h.col);
    let label = '';
    if (s.overlay === 'BIO') label = `B ${cell.B.toFixed(2)}`;
    else if (SERVICE_KEYS.includes(s.overlay)) {
      label = `supplies ${fmt1(cell.supply[s.overlay])}`;
      if (cell.kind === 'built') label += `\nreceives ${fmt1(cell.received[s.overlay])}`;
    } else if (s.overlay === 'WASTE') label = `waste ${wasteTokensAt(s.state, cell)}\nheight ${cell.elevation}`;
    if (pv) label = `${label ? label + '\n' : ''}${pv.gdp ? `${pv.gdp < 0 ? '−' : '+'}£${Math.abs(pv.gdp)}/turn` : ''}`.trim();
    if (label) {
      this.hoverLabel.setText(label).setVisible(true);
      const lx = Math.min(x + TILE + 4, BOARD_X + BOARD_SIZE - this.hoverLabel.width);
      this.hoverLabel.setPosition(lx, Math.max(BOARD_Y, y - this.hoverLabel.height - 2));
    }
    s.emit('preview', pv);
  }

  onTurn({ log }) {
    const s = this.session;
    markPlayed();
    s.busy = true;
    const waste = log.find((l) => l.type === 'waste');
    const moves = waste?.moves ?? [];
    this.animatingWaste = moves.length > 0 && s.state.config.wasteMode === 'tokens';
    this.renderBoard();
    this.drawTargets();

    // Floating GDP text above each earning tile.
    const gdp = log.find((l) => l.type === 'gdp');
    for (const e of gdp?.earnings ?? []) {
      const c = cellCentre(e.row, e.col);
      const sign = e.amount < 0 ? '−' : '+';
      const t = text(this, c.x, c.y - 10, `${sign}£${fmt1(Math.abs(e.amount)).replace(/\.0$/, '')}`,
        { size: 14, bold: true, color: e.amount < 0 ? UI.bad : UI.gold, origin: [0.5, 0.5] });
      t.setStroke('#000000', 3);
      this.animLayer.add(t);
      this.tweens.add({ targets: t, y: c.y - 44, alpha: 0, duration: 1100, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
    }

    // Waste tokens animate along their moves.
    let duration = 700;
    if (natureAnimations()) duration = Math.max(duration, this.animateDeliveries());
    const ev = log.find((l) => l.type === 'event');
    if (ev) duration = Math.max(duration, this.animateEvent(ev));
    if (this.animatingWaste) {
      const stepMs = 200;
      const start = 350;
      for (const m of moves) {
        const a = cellCentre(m.from.row, m.from.col);
        const b = cellCentre(m.to.row, m.to.col);
        const tok = this.add.image(a.x, a.y, 'waste').setScale(1).setAlpha(0);
        this.animLayer.add(tok);
        this.tweens.add({
          targets: tok, x: b.x, y: b.y, alpha: { from: 1, to: 1 }, delay: start + (m.step - 1) * stepMs, duration: stepMs,
          onStart: () => tok.setAlpha(1),
          onComplete: () => tok.destroy()
        });
      }
      const maxStep = Math.max(...moves.map((m) => m.step));
      duration = Math.max(duration, start + maxStep * stepMs + 50);
    }
    this.time.delayedCall(duration, () => {
      this.animatingWaste = false;
      this.renderBoard();
      s.busy = false;
      s.emit('turnAnimated', { log });
    });
  }

  // Nature at work: small icons fly from the nature that supplies each tile (bees to farms, and so on).
  // Returns how long the animation takes, in ms.
  animateDeliveries() {
    const list = deliveries(this.session.state, 10);
    const start = 150;
    const stagger = 55;
    const flight = 750;
    list.forEach((d, i) => {
      const a = cellCentre(d.from.row, d.from.col);
      const b = cellCentre(d.to.row, d.to.col);
      const icon = this.add.image(a.x, a.y, SERVICES[d.service].icon).setScale(0.55).setAlpha(0);
      this.animLayer.add(icon);
      const bee = d.service === 'POL';
      const lift = 14 + (i % 3) * 5;
      const p = { t: 0 };
      this.tweens.add({
        targets: p, t: 1, delay: start + i * stagger, duration: flight, ease: 'Sine.easeInOut',
        onStart: () => icon.setAlpha(1),
        onUpdate: () => {
          const t = p.t;
          const wobble = bee ? Math.sin(t * Math.PI * 6) * 3 : 0;
          icon.setPosition(a.x + (b.x - a.x) * t + wobble, a.y + (b.y - a.y) * t - Math.sin(t * Math.PI) * lift);
          if (d.service === 'GRN') icon.setRotation(Math.sin(t * Math.PI * 2) * 0.5);
        },
        onComplete: () => {
          this.tweens.add({ targets: icon, scale: 0.8, alpha: 0, duration: 200, onComplete: () => icon.destroy() });
        }
      });
    });
    return list.length ? start + (list.length - 1) * stagger + flight + 200 : 0;
  }

  // Events: shields pop up over protected tiles, with a line back to the nature that saved them;
  // tiles that were hit flash red.
  animateEvent(ev) {
    const g = this.add.graphics();
    this.animLayer.add(g);
    for (const p of ev.protected) {
      const c = cellCentre(p.row, p.col);
      if (p.by) {
        const f = cellCentre(p.by.row, p.by.col);
        g.lineStyle(2, 0xa4d8f2, 0.9).lineBetween(f.x, f.y, c.x, c.y);
      }
      const shield = this.add.image(c.x, c.y, SERVICES[p.service].icon).setScale(0);
      this.animLayer.add(shield);
      this.tweens.add({ targets: shield, scale: 0.9, duration: 350, ease: 'Back.easeOut', delay: 200 });
      this.tweens.add({ targets: shield, alpha: 0, duration: 400, delay: 1500, onComplete: () => shield.destroy() });
    }
    for (const h of ev.hit) {
      const { x, y } = cellToXY(h.row, h.col);
      const flash = this.add.rectangle(x, y, TILE, TILE, 0xe8676a, 0).setOrigin(0);
      this.animLayer.add(flash);
      this.tweens.add({ targets: flash, fillAlpha: 0.7, duration: 250, yoyo: true, repeat: 2, delay: 200, onComplete: () => flash.destroy() });
      const c = cellCentre(h.row, h.col);
      const t = text(this, c.x, c.y, `−£${Math.round(h.damage)}`, { size: 14, bold: true, color: '#ffffff', origin: [0.5, 0.5] });
      t.setStroke('#000000', 3);
      this.animLayer.add(t);
      this.tweens.add({ targets: t, y: c.y - 30, alpha: 0, duration: 1400, delay: 300, onComplete: () => t.destroy() });
    }
    // Wrecked tiles: a cloud of dust and a label, over the bare ground they have become.
    for (const d of ev.destroyed ?? []) {
      const c = cellCentre(d.row, d.col);
      const dust = this.add.circle(c.x, c.y, 6, 0x8a6142, 0.9);
      this.animLayer.add(dust);
      this.tweens.add({ targets: dust, radius: 30, alpha: 0, duration: 900, delay: 900, ease: 'Cubic.easeOut', onComplete: () => dust.destroy() });
      const t = text(this, c.x, c.y + 12, 'Wrecked!', { size: 13, bold: true, color: '#ffd9a0', origin: [0.5, 0.5] });
      t.setStroke('#000000', 3).setAlpha(0);
      this.animLayer.add(t);
      this.tweens.add({ targets: t, alpha: 1, y: c.y - 6, duration: 300, delay: 1000 });
      this.tweens.add({ targets: t, alpha: 0, duration: 500, delay: 2300, onComplete: () => t.destroy() });
    }
    this.tweens.add({ targets: g, alpha: 0, duration: 400, delay: 1500, onComplete: () => g.destroy() });
    return ev.destroyed?.length ? 2900 : 1900;
  }
}
