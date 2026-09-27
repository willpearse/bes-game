// Game: board rendering and input. Runs alongside the UI scene.
import Phaser from 'phaser';
import { GameSession } from '../session.js';
import { UI, OVERLAY_COLOURS } from '../art/palette.js';
import { natureKey } from '../art/textures.js';
import { TILE, BOARD_X, BOARD_Y, BOARD_SIZE, cellToXY, cellCentre } from '../ui/layout.js';
import { text, fmt1 } from '../ui/widgets.js';
import { flowTarget, wasteTokensAt } from '../engine/waste.js';
import { cellAt } from '../engine/grid.js';
import { markPlayed } from '../ui/prefs.js';

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
    this.cameras.main.setBackgroundColor(UI.bg);
    const s = this.session;
    const st = s.state;

    // Board frame.
    this.add.rectangle(BOARD_X - 6, BOARD_Y - 6, BOARD_SIZE + 12, BOARD_SIZE + 12, 0x000000).setOrigin(0);
    this.cells = [];
    for (const cell of st.cells) {
      const { x, y } = cellToXY(cell.row, cell.col);
      const v = {
        ground: this.add.image(x, y, 'px').setOrigin(0).setScale(3).setDepth(0),
        building: this.add.image(x, y, 'px').setOrigin(0).setScale(3).setDepth(1).setVisible(false),
        primary: this.add.image(x, y, 'primaryMark').setOrigin(0).setScale(3).setDepth(2).setVisible(false),
        reserve: this.add.image(x, y, 'reserveMark').setOrigin(0).setScale(3).setDepth(2).setVisible(false),
        tint: this.add.rectangle(x, y, TILE, TILE, 0x000000, 0).setOrigin(0).setDepth(3),
        waste: this.add.image(x + 2, y + TILE - 30, 'waste').setOrigin(0).setScale(2).setDepth(4).setVisible(false),
        wasteText: text(this, x + 30, y + TILE - 20, '', { size: 12, bold: true }).setDepth(4),
        badge: text(this, x + TILE - 2, y + TILE - 2, '', { size: 12, bold: true, color: '#ffffff', origin: [1, 1] }).setDepth(6),
        debug: text(this, x + 2, y + 1, '', { size: 9, color: '#ffffff' }).setDepth(7)
      };
      v.badge.setBackgroundColor('#1b1b24cc').setPadding(2, 0, 2, 0);
      v.debug.setBackgroundColor('#00000099');
      this.cells.push(v);
    }
    this.targetG = this.add.graphics().setDepth(5);
    this.hoverG = this.add.graphics().setDepth(5);
    this.arrowG = this.add.graphics().setDepth(4);
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
    const col = Math.floor((p.x - BOARD_X) / TILE);
    const row = Math.floor((p.y - BOARD_Y) / TILE);
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
      } else if (['POL', 'WAT', 'FLD', 'AIR', 'REC'].includes(ov)) {
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
    g.clear();
    g.lineStyle(3, 0xe8b53a, 1);
    for (const t of this.session.targets) {
      const { x, y } = cellToXY(t.row, t.col);
      g.strokeRect(x + 2, y + 2, TILE - 4, TILE - 4);
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
    if (pv) {
      g.lineStyle(3, 0xd9634f, 1);
      for (const c of pv.intensityChanges) {
        const p = cellToXY(c.row, c.col);
        g.strokeRect(p.x + 3, p.y + 3, TILE - 6, TILE - 6);
      }
    }
    // Numbers on hover so overlays never rely on colour alone.
    const cell = cellAt(s.state, h.row, h.col);
    let label = '';
    if (s.overlay === 'BIO') label = `B ${cell.B.toFixed(2)}`;
    else if (['POL', 'WAT', 'FLD', 'AIR', 'REC'].includes(s.overlay)) {
      label = `supplies ${fmt1(cell.supply[s.overlay])}`;
      if (cell.kind === 'built') label += `\nreceives ${fmt1(cell.received[s.overlay])}`;
    } else if (s.overlay === 'WASTE') label = `waste ${wasteTokensAt(s.state, cell)}\nheight ${cell.elevation}`;
    if (pv) label = `${label ? label + '\n' : ''}${pv.gdp ? `+£${pv.gdp}/turn` : ''}`.trim();
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
      const t = text(this, c.x, c.y - 10, `+£${fmt1(e.amount).replace(/\.0$/, '')}`, { size: 14, bold: true, color: UI.gold, origin: [0.5, 0.5] });
      t.setStroke('#000000', 3);
      this.animLayer.add(t);
      this.tweens.add({ targets: t, y: c.y - 44, alpha: 0, duration: 1100, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
    }

    // Waste tokens animate along their moves.
    let duration = 700;
    if (this.animatingWaste) {
      const stepMs = 200;
      const start = 350;
      for (const m of moves) {
        const a = cellCentre(m.from.row, m.from.col);
        const b = cellCentre(m.to.row, m.to.col);
        const tok = this.add.image(a.x, a.y, 'waste').setScale(2).setAlpha(0);
        this.animLayer.add(tok);
        this.tweens.add({
          targets: tok, x: b.x, y: b.y, alpha: { from: 1, to: 1 }, delay: start + (m.step - 1) * stepMs, duration: stepMs,
          onStart: () => tok.setAlpha(1),
          onComplete: () => tok.destroy()
        });
      }
      const maxStep = Math.max(...moves.map((m) => m.step));
      duration = start + maxStep * stepMs + 50;
    }
    this.time.delayedCall(duration, () => {
      this.animatingWaste = false;
      this.renderBoard();
      s.busy = false;
      s.emit('turnAnimated', { log });
    });
  }
}
