// Garden: the board, the visitor, the three nature cards, and every animation.
// The engine decides what happens; this scene only plays back the log takeTurn returns.
import Phaser from 'phaser';
import {
  W, H, TILE, BOARD_X, BOARD_Y, PANEL_X, PANEL_W, VISITOR_Y, VISITOR_H,
  setupCamera, logicalPointer, cellCentre, cellUnder, cardBox, inBox
} from '../layout.js';
import { COLOURS } from '../art/palette.js';
import { bigText, sprite, tween, wait, sky } from '../ui.js';
import { createGame, cellAt, touching, visitor, streamIsClean } from '../engine/state.js';
import { takeTurn, blocked } from '../engine/turn.js';
import { needs } from '../engine/rules.js';
import { NATURE_PIECES } from '../data/pieces.js';
import { LINES } from '../data/lines.js';
import { say, hush, whenQuiet } from '../voice.js';
import { play } from '../sound.js';
import { prefs, setMuted } from '../prefs.js';

const HINT_AFTER_MS = 15000;

const pieceKey = (cell) => {
  if (cell.piece === 'house') return cell.hot ? 'house_hot' : 'house_happy';
  if (cell.piece === 'veg') return `veg_${cell.fruit}`;
  return cell.piece;
};
const fill = (text, v) => text.replace('{animal}', v.animal);

export class Garden extends Phaser.Scene {
  constructor() {
    super('Garden');
  }

  init(data) {
    this.state = createGame({ seed: data.seed ?? 1 });
    this.picked = null;     // nature piece chosen from the cards
    this.aim = null;        // { x, y } while a finger is down holding a piece
    this.busy = false;
  }

  create() {
    setupCamera(this);
    sky(this, W, H);
    this.drawBoard();
    this.drawTopBar();
    this.drawPanel();
    this.glow = this.add.graphics().setDepth(5);
    this.ghost = this.add.image(0, 0, 'px').setVisible(false).setAlpha(0.8).setDepth(20);
    this.heat = this.add.rectangle(0, 0, W, H, COLOURS.heat, 0).setOrigin(0).setDepth(30);
    this.input.on('pointerdown', (p) => this.onDown(logicalPointer(this, p)));
    this.input.on('pointermove', (p) => this.onMove(logicalPointer(this, p)));
    this.input.on('pointerup', (p) => this.onUp(logicalPointer(this, p)));
    this.input.on('gameout', () => this.clearAim());
    this.render();
    this.time.delayedCall(1400, () => this.announceVisitor());
  }

  // ---------- building the screen ----------

  drawBoard() {
    const s = this.state;
    const g = this.add.graphics();
    g.fillStyle(COLOURS.outline, 1);
    g.fillRoundedRect(BOARD_X - 10, BOARD_Y - 10, s.width * TILE + 20, s.height * TILE + 20, 26);
    g.fillStyle(COLOURS.board, 1);
    g.fillRoundedRect(BOARD_X - 4, BOARD_Y - 4, s.width * TILE + 8, s.height * TILE + 8, 22);
    this.ground = [];
    this.pieces = [];
    this.bubbles = [];
    for (const c of s.cells) {
      const { x, y } = cellCentre(c.row, c.col);
      this.ground.push(sprite(this, x, y, c.ground, TILE));
      this.pieces.push(null);
      this.bubbles.push(null);
    }
    this.muckTint = this.add.graphics();
    this.muckBlobs = [];
    const d = s.duck && cellCentre(s.duck.row, s.duck.col);
    this.duck = d ? sprite(this, d.x, d.y + 10, 'duck_happy', 96).setDepth(3) : null;
    if (this.duck) this.tweens.add({ targets: this.duck, y: d.y + 2, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.duckWasHappy = true;
  }

  drawTopBar() {
    this.track = this.add.graphics();
    this.trackSuns = this.state.config.heatwaveTurns.map((t) => sprite(this, 70 + (t - 1) * 74, 76, 'sun', 62).setDepth(2));
    this.basket = sprite(this, 760, 76, 'basket', 96);
    this.basketText = bigText(this, 820, 80, '0', { size: 52, origin: [0, 0.5] });
    this.mute = sprite(this, 990, 76, prefs.muted ? 'speaker_off' : 'speaker_on', 72);
  }

  drawPanel() {
    const g = this.add.graphics();
    g.fillStyle(COLOURS.outline, 1);
    g.fillRoundedRect(PANEL_X - 6, VISITOR_Y - 6, PANEL_W + 12, VISITOR_H + 12, 26);
    g.fillStyle(COLOURS.cream, 1);
    g.fillRoundedRect(PANEL_X, VISITOR_Y, PANEL_W, VISITOR_H, 22);
    this.animal = sprite(this, PANEL_X + 70, VISITOR_Y + 140, 'rabbit', 130);
    this.wish = sprite(this, PANEL_X + 132, VISITOR_Y + 62, 'bubble', 110);
    this.wishIcon = sprite(this, PANEL_X + 140, VISITOR_Y + 56, 'house_happy', 64);
    this.cards = NATURE_PIECES.map((piece, i) => {
      const b = cardBox(i);
      const bg = this.add.graphics();
      const icon = sprite(this, b.x + b.w / 2, b.y + b.h / 2, piece, 120);
      return { piece, box: b, bg, icon };
    });
  }

  // ---------- drawing the state ----------

  render() {
    const s = this.state;
    s.cells.forEach((c, i) => {
      const { x, y } = cellCentre(c.row, c.col);
      if (c.piece && !this.pieces[i]) this.pieces[i] = sprite(this, x, y, pieceKey(c), TILE).setDepth(2);
      if (this.pieces[i]) this.pieces[i].setTexture(pieceKey(c));
    });
    this.renderStream();
    this.renderBubbles();
    this.renderTrack();
    this.renderPanel();
    this.basketText.setText(String(s.basket));
  }

  // muck: how much mucky water to show (the animations step it up and down before the final state).
  renderStream(muck = this.state.streamMuck) {
    const s = this.state;
    const amount = Math.min(0.7, (muck / 5) * 0.7);
    this.muckTint.clear();
    this.muckTint.fillStyle(COLOURS.muck, amount);
    const water = s.cells.filter((c) => c.ground === 'stream');
    for (const c of water) this.muckTint.fillRect(BOARD_X + c.col * TILE, BOARD_Y + c.row * TILE, TILE, TILE);
    // One floating blob per unit of mucky water, spread along the stream.
    const want = Math.min(muck, water.length * 2);
    while (this.muckBlobs.length > want) this.muckBlobs.pop().destroy();
    while (this.muckBlobs.length < want) {
      const k = this.muckBlobs.length;
      const c = water[(k * 5 + 2) % water.length];
      const { x, y } = cellCentre(c.row, c.col);
      const blob = sprite(this, x + (k % 2 ? 30 : -30), y + (k % 3 - 1) * 26, 'muck', 44).setDepth(1);
      this.tweens.add({ targets: blob, y: blob.y - 6, duration: 900 + k * 70, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.muckBlobs.push(blob);
    }
    if (this.duck) {
      const happy = muck <= s.config.cleanStreamMax;
      this.duck.setTexture(happy ? 'duck_happy' : 'duck_sad').setDisplaySize(96, 96);
      if (happy !== this.duckWasHappy) {
        this.duckWasHappy = happy;
        return happy ? 'duckHappy' : 'duckSad';
      }
    }
    return null;
  }

  // A wish bubble over each house or veg patch that still wants something from nature.
  renderBubbles() {
    const want = new Map();
    for (const n of needs(this.state)) {
      const i = n.row * this.state.width + n.col;
      if (!want.has(i)) want.set(i, n.need);
    }
    this.state.cells.forEach((c, i) => {
      const need = want.get(i);
      const b = this.bubbles[i];
      if (b && b.need === need) return;
      if (b) { b.bg.destroy(); b.icon.destroy(); this.bubbles[i] = null; }
      if (!need) return;
      const { x, y } = cellCentre(c.row, c.col);
      const bg = sprite(this, x + 38, y - 38, 'bubble', 70).setDepth(8);
      const icon = sprite(this, x + 43, y - 42, need, 40).setDepth(9);
      this.tweens.add({ targets: [bg, icon], y: '-=5', duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.bubbles[i] = { need, bg, icon };
    });
  }

  renderTrack() {
    const s = this.state;
    const g = this.track.clear();
    for (let t = 1; t <= s.config.turns; t++) {
      const x = 70 + (t - 1) * 74;
      const now = t === s.turn && s.step !== 'over';
      const done = t < s.turn || s.step === 'over';
      g.fillStyle(COLOURS.outline, 1);
      g.fillCircle(x, 76, now ? 32 : 24);
      g.fillStyle(done ? COLOURS.leaf : now ? COLOURS.white : COLOURS.grey, 1);
      g.fillCircle(x, 76, now ? 26 : 18);
    }
    s.config.heatwaveTurns.forEach((t, i) => this.trackSuns[i].setAlpha(t < s.turn || s.step === 'over' ? 0.45 : 1));
  }

  renderPanel() {
    const s = this.state;
    const v = visitor(s);
    if (v) this.animal.setTexture(v.animal).setDisplaySize(130, 130);
    const wantsPiece = s.step === 'visitor' && v;
    this.wish.setVisible(!!v);
    this.wishIcon.setVisible(!!v).setTexture(wantsPiece ? (v.piece === 'house' ? 'house_happy' : 'veg_3') : 'heart').setDisplaySize(wantsPiece ? 64 : 48, wantsPiece ? 64 : 48);
    const natureTime = s.step === 'nature';
    for (const card of this.cards) {
      const { x, y, w, h } = card.box;
      const picked = natureTime && this.picked === card.piece;
      card.bg.clear();
      card.bg.fillStyle(COLOURS.outline, 1);
      card.bg.fillRoundedRect(x - (picked ? 10 : 6), y - (picked ? 10 : 6), w + (picked ? 20 : 12), h + (picked ? 20 : 12), 26);
      card.bg.fillStyle(picked ? COLOURS.cardPicked : COLOURS.card, 1);
      card.bg.fillRoundedRect(x, y, w, h, 22);
      card.bg.setAlpha(natureTime ? 1 : 0.5);
      card.icon.setAlpha(natureTime ? 1 : 0.4);
    }
  }

  // ---------- input ----------

  heldPiece() {
    const s = this.state;
    if (s.step === 'visitor') return visitor(s).piece;
    if (s.step === 'nature') return this.picked;
    return null;
  }

  onDown(p) {
    this.lastTouch = this.time.now;
    if (Math.hypot(p.x - 990, p.y - 76) < 44) return this.toggleMute();
    if (this.busy || this.state.step === 'over') return;
    if (inBox({ x: PANEL_X, y: VISITOR_Y, w: PANEL_W, h: VISITOR_H }, p.x, p.y)) return this.repeatVisitor();
    const card = this.cards.find((c) => inBox(c.box, p.x, p.y));
    if (card) {
      if (this.state.step !== 'nature') { play('wobble'); return this.repeatVisitor(); }
      this.pick(card.piece);
      this.aim = { ...p, fromCard: true };
      this.showAim(p);
      return;
    }
    const cell = cellUnder(this.state, p.x, p.y);
    if (!cell) return;
    if (this.duck && this.state.duck.row === cell.row && this.state.duck.col === cell.col && blocked(this.state, cell.row, cell.col) === 'stream') {
      play('pick');
      say(streamIsClean(this.state) ? 'Quack quack!' : LINES.duckSad, { interrupt: true });
      return;
    }
    if (!this.heldPiece()) {
      this.wobbleCards();
      say(LINES.pickFirst, { interrupt: true });
      return;
    }
    this.aim = { ...p };
    this.showAim(p);
  }

  onMove(p) {
    if (!this.aim || this.busy) return;
    this.aim = { ...this.aim, x: p.x, y: p.y };
    this.showAim(p);
  }

  onUp(p) {
    if (!this.aim || this.busy) return;
    const fromCard = this.aim.fromCard;
    this.clearAim();
    const cell = cellUnder(this.state, p.x, p.y);
    if (!cell) return; // tapped a card, or let go off the board: keep the piece picked
    const why = blocked(this.state, cell.row, cell.col);
    if (why) {
      if (fromCard && why === 'outside') return;
      play('wobble');
      this.shake(cell);
      say(why === 'stream' ? LINES.stream : LINES.taken, { interrupt: true });
      return;
    }
    this.place(cell);
  }

  showAim(p) {
    const piece = this.heldPiece();
    const cell = cellUnder(this.state, p.x, p.y);
    this.glow.clear();
    if (!piece) return;
    this.ghost.setVisible(true).setTexture(piece === 'house' ? 'house_happy' : piece === 'veg' ? 'veg_0' : piece).setDisplaySize(112, 112);
    if (!cell) { this.ghost.setPosition(p.x, p.y - 30); return; }
    const ok = !blocked(this.state, cell.row, cell.col);
    const { x, y } = cellCentre(cell.row, cell.col);
    this.ghost.setPosition(x, y - (ok ? 0 : 20));
    // The four touching squares glow: this is where the piece will help (or be helped).
    for (const n of touching(this.state, cell.row, cell.col)) {
      this.glow.lineStyle(8, COLOURS.yellow, 1);
      this.glow.strokeRoundedRect(BOARD_X + n.col * TILE + 8, BOARD_Y + n.row * TILE + 8, TILE - 16, TILE - 16, 24);
    }
    this.glow.lineStyle(10, ok ? COLOURS.white : COLOURS.red, 1);
    this.glow.strokeRoundedRect(BOARD_X + cell.col * TILE + 4, BOARD_Y + cell.row * TILE + 4, TILE - 8, TILE - 8, 28);
  }

  clearAim() {
    this.aim = null;
    this.glow.clear();
    this.ghost.setVisible(false);
  }

  pick(piece) {
    if (this.picked !== piece) {
      this.picked = piece;
      play('pick');
      say(LINES.picked[piece], { interrupt: true });
    }
    this.renderPanel();
    const card = this.cards.find((c) => c.piece === piece);
    this.tweens.add({ targets: card.icon, scale: card.icon.scale * 1.15, duration: 120, yoyo: true });
  }

  wobbleCards() {
    play('wobble');
    for (const c of this.cards) this.tweens.add({ targets: c.icon, angle: { from: -12, to: 12 }, duration: 90, yoyo: true, repeat: 2, onComplete: () => c.icon.setAngle(0) });
  }

  shake(cell) {
    const i = cell.row * this.state.width + cell.col;
    const target = this.pieces[i] ?? this.ground[i];
    const x = target.x;
    this.tweens.add({ targets: target, x: x + 8, duration: 60, yoyo: true, repeat: 3, onComplete: () => target.setX(x) });
  }

  toggleMute() {
    setMuted(!prefs.muted);
    if (prefs.muted) hush();
    this.mute.setTexture(prefs.muted ? 'speaker_off' : 'speaker_on').setDisplaySize(72, 72);
  }

  repeatVisitor() {
    const v = visitor(this.state);
    if (!v) return;
    play('pick');
    say(this.state.step === 'visitor' ? fill(LINES.visitor[v.piece], v) : LINES.pickNature, { interrupt: true });
  }

  announceVisitor() {
    const v = visitor(this.state);
    if (!v) return;
    this.tweens.add({ targets: this.animal, y: { from: this.animal.y - 30, to: this.animal.y }, duration: 400, ease: 'Bounce.easeOut' });
    say(fill(LINES.visitor[v.piece], v));
    this.armHint();
  }

  // If a child waits a long time choosing nature, a gentle spoken hint and a wiggle on the square.
  armHint() {
    this.hintTimer?.remove();
    this.lastTouch = this.time.now;
    this.hintTimer = this.time.addEvent({
      delay: 1000, loop: true, callback: () => {
        if (this.busy || this.state.step !== 'nature' || this.time.now - this.lastTouch < HINT_AFTER_MS) return;
        this.lastTouch = this.time.now;
        const n = needs(this.state)[0];
        if (!n) return;
        say(LINES.hint[n.need]);
        const i = n.row * this.state.width + n.col;
        if (this.pieces[i]) this.tweens.add({ targets: this.pieces[i], scale: this.pieces[i].scale * 1.15, duration: 250, yoyo: true, repeat: 1 });
      }
    });
  }

  // ---------- playing a turn ----------

  async place(cell) {
    const piece = this.heldPiece();
    const action = this.state.step === 'visitor' ? { row: cell.row, col: cell.col } : { row: cell.row, col: cell.col, piece };
    const { state, log } = takeTurn(this.state, action);
    this.busy = true;
    this.hintTimer?.remove();
    if (this.state.step === 'nature') this.picked = null;
    this.state = state;
    await this.playLog(log);
    this.busy = false;
    if (state.step === 'over') return;
    this.armHint();
  }

  async playLog(log) {
    const spoken = new Set();
    const once = (key, line) => {
      if (spoken.has(key) || spoken.size >= 3) return;
      spoken.add(key);
      say(line);
    };
    const duck = (key) => { if (key) once(key, LINES[key]); };
    for (const e of log) {
      switch (e.type) {
        case 'placed': await this.animPlaced(e); break;
        case 'pickNature':
          this.renderPanel();
          say(LINES.pickNature, { interrupt: true });
          for (const c of this.cards) this.tweens.add({ targets: c.icon, y: c.icon.y - 14, duration: 180, yoyo: true, delay: 80 * this.cards.indexOf(c) });
          break;
        case 'bees': once('bees', LINES.bees); await this.animBees(e); break;
        case 'noBees': once('noBees', LINES.noBees); await this.animNoBees(e); break;
        case 'soak': once('soak', LINES.soak); await this.animSoak(e); break;
        case 'muck': once('muck', LINES.muck); duck(await this.animMuck(e)); break;
        case 'clean': once('clean', LINES.clean); duck(await this.animClean(e)); break;
        case 'heatwave': await this.animHeat(e); break;
        case 'visitor':
          await whenQuiet(6000);
          this.render();
          if (e.heatwave) {
            say(LINES.heatWarning);
            const sun = this.trackSuns[this.state.config.heatwaveTurns.indexOf(e.turn)];
            this.tweens.add({ targets: sun, scale: sun.scale * 1.4, duration: 300, yoyo: true, repeat: 2 });
          }
          this.announceVisitor();
          break;
        case 'over':
          await whenQuiet(6000);
          await wait(this, 500);
          play('fanfare');
          say(LINES.finished, { interrupt: true });
          await wait(this, 1800);
          this.scene.start('Stars', { state: this.state });
          return;
        default: break;
      }
    }
    this.render();
  }

  // ---------- animations ----------

  async animPlaced(e) {
    const [row, col] = e.at;
    const i = row * this.state.width + col;
    const { x, y } = cellCentre(row, col);
    const img = sprite(this, x, y, pieceKey(cellAt(this.state, row, col)), TILE).setDepth(2);
    this.pieces[i] = img;
    const full = img.scale;
    img.setScale(0);
    play('pop');
    this.renderBubbles();
    await tween(this, { targets: img, scale: full, duration: 420, ease: 'Back.easeOut' });
    if (e.piece === 'flowers' || e.piece === 'tree' || e.piece === 'reeds') this.sparkleAt(x, y, COLOURS.yellow);
  }

  sparkleAt(x, y, tint = COLOURS.white) {
    play('sparkle');
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      const sp = sprite(this, x, y, 'sparkle', 30).setTint(tint).setDepth(25);
      this.tweens.add({ targets: sp, x: x + Math.cos(a) * 60, y: y + Math.sin(a) * 60, alpha: 0, duration: 600, onComplete: () => sp.destroy() });
    }
  }

  async fly(key, size, from, to, { arc = 60, duration = 700 } = {}) {
    const a = cellCentre(...from);
    const b = to.x !== undefined ? to : cellCentre(...to);
    const img = sprite(this, a.x, a.y, key, size).setDepth(25);
    const path = { t: 0 };
    await tween(this, {
      targets: path, t: 1, duration, ease: 'Sine.easeInOut',
      onUpdate: () => {
        const t = path.t;
        img.setPosition(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t - Math.sin(t * Math.PI) * arc);
      }
    });
    img.destroy();
  }

  async animBees(e) {
    play('buzz');
    await this.fly('bee', 48, e.from, e.to, { arc: 50, duration: 800 });
    play('grow');
    this.pieces[e.to[0] * this.state.width + e.to[1]]?.setTexture(`veg_${e.fruit}`);
    await this.fly('strawberry', 44, e.to, { x: 760, y: 76 }, { arc: 120, duration: 650 });
    this.basketText.setText(String(e.basket));
    this.tweens.add({ targets: this.basket, scale: this.basket.scale * 1.2, duration: 120, yoyo: true });
  }

  async animNoBees(e) {
    this.shake({ row: e.at[0], col: e.at[1] });
    await wait(this, 350);
  }

  async animSoak(e) {
    await this.fly('muck', 44, e.from, e.to, { arc: 30, duration: 550 });
    const { x, y } = cellCentre(...e.to);
    this.sparkleAt(x, y, COLOURS.cool);
    await wait(this, 200);
  }

  async animMuck(e) {
    await this.fly('muck', 44, e.from, e.to, { arc: 40, duration: 750 });
    play('splash');
    const mood = this.renderStream(e.stream);
    await wait(this, 200);
    return mood;
  }

  async animClean(e) {
    await this.fly('muck', 40, e.from, e.to, { arc: 20, duration: 500 });
    const { x, y } = cellCentre(...e.to);
    this.sparkleAt(x, y, COLOURS.cool);
    return this.renderStream(e.stream);
  }

  async animHeat(e) {
    play('hot');
    const sun = sprite(this, W / 2, -120, 'sun', 220).setDepth(31);
    await Promise.all([
      tween(this, { targets: this.heat, fillAlpha: 0.35, duration: 600 }),
      tween(this, { targets: sun, y: 130, duration: 800, ease: 'Back.easeOut' })
    ]);
    say(e.hot.length === 0 ? LINES.heatAllCool : LINES.heatSomeHot);
    for (const at of e.cool) {
      const { x, y } = cellCentre(...at);
      play('cool');
      this.sparkleAt(x, y, COLOURS.cool);
      await wait(this, 250);
    }
    for (const at of e.hot) {
      const i = at[0] * this.state.width + at[1];
      this.pieces[i]?.setTexture('house_hot');
      this.shake({ row: at[0], col: at[1] });
      await wait(this, 250);
    }
    await wait(this, 1400);
    await Promise.all([
      tween(this, { targets: this.heat, fillAlpha: 0, duration: 600 }),
      tween(this, { targets: sun, y: -140, duration: 600, ease: 'Sine.easeIn' })
    ]);
    sun.destroy();
  }
}
