// GameSession: the bridge between the pure engine and the Phaser scenes.
// Holds the current state plus UI selection, and emits events scenes subscribe to.
import { createGame } from './engine/state.js';
import { takeTurn, legalTargets, preview, canAfford, choiceCost } from './engine/actions.js';

export class GameSession {
  constructor(config) {
    this.listeners = {};
    this.config = config;
    this.state = createGame({ config, seed: config.seed });
    this.mode = 'build';            // 'build' | 'restore'
    this.choice = null;             // selected choice (see engine/actions.js)
    this.restoreSlot = null;        // market slot to discard when restoring
    this.restoration = null;
    this.targets = [];
    this.hover = null;              // { row, col }
    this.inspected = null;          // { row, col }
    this.overlay = 'none';
    this.debug = false;
    this.busy = false;              // true while turn animations play
    this.lastLog = [];
  }

  on(evt, fn) {
    (this.listeners[evt] = this.listeners[evt] ?? []).push(fn);
  }

  off(evt, fn) {
    this.listeners[evt] = (this.listeners[evt] ?? []).filter((f) => f !== fn);
  }

  emit(evt, payload) {
    for (const fn of this.listeners[evt] ?? []) fn(payload);
  }

  get market() {
    return this.state.config.marketMode === 'market';
  }

  setMode(mode) {
    this.mode = mode;
    this.choice = null;
    this.targets = [];
    if (mode === 'restore') {
      if (this.market && this.restoreSlot == null) this.restoreSlot = this.cheapestSlot();
    }
    this.refreshChoice();
  }

  cheapestSlot() {
    const i = this.state.market.slots.findIndex((t) => t != null);
    return i >= 0 ? i : null;
  }

  // Build mode: pick a market slot (market) or a building id (menu).
  selectBuild(slotOrBuilding) {
    this.mode = 'build';
    this.choice = this.market ? { type: 'build', slot: slotOrBuilding } : { type: 'build', building: slotOrBuilding };
    this.refreshTargets();
  }

  // Restore mode: pick the card to discard (market) and/or the restoration action.
  selectRestoreSlot(slot) {
    this.mode = 'restore';
    this.restoreSlot = slot;
    this.refreshChoice();
  }

  selectRestoration(id) {
    this.mode = 'restore';
    this.restoration = this.restoration === id ? null : id;
    if (this.market && this.restoreSlot == null) this.restoreSlot = this.cheapestSlot();
    this.refreshChoice();
  }

  refreshChoice() {
    if (this.mode === 'restore' && this.restoration) {
      this.choice = this.market
        ? (this.restoreSlot != null ? { type: 'restore', restoration: this.restoration, slot: this.restoreSlot } : null)
        : { type: 'restore', restoration: this.restoration };
    } else if (this.mode === 'restore') {
      this.choice = null;
    }
    this.refreshTargets();
  }

  refreshTargets() {
    this.targets = this.choice ? legalTargets(this.state, this.choice) : [];
    this.emit('selection');
  }

  cancel() {
    this.choice = null;
    this.targets = [];
    if (this.mode === 'restore') this.restoration = null;
    this.emit('selection');
  }

  isTarget(row, col) {
    return this.targets.some((t) => t.row === row && t.col === col);
  }

  setHover(cell) {
    this.hover = cell;
    this.emit('hover');
  }

  inspect(cell) {
    this.inspected = cell;
    this.emit('inspect');
  }

  setOverlay(o) {
    this.overlay = o;
    this.emit('overlay');
  }

  toggleDebug() {
    this.debug = !this.debug;
    this.emit('overlay');
  }

  previewAt(row, col) {
    if (!this.choice || !this.isTarget(row, col)) return null;
    return preview(this.state, this.choice, row, col);
  }

  canAfford(choice) {
    return canAfford(this.state, choice);
  }

  cost(choice) {
    return choiceCost(this.state, choice);
  }

  // Click on a board cell: place if it is a target, otherwise inspect.
  clickCell(row, col) {
    if (this.busy || this.state.gameOver) return;
    if (this.choice && this.isTarget(row, col)) {
      this.act({ ...this.choice, row, col });
    } else {
      this.inspect({ row, col });
    }
  }

  pass() {
    if (this.busy || this.state.gameOver) return;
    this.act({ type: 'pass' });
  }

  act(action) {
    const before = this.state;
    const { state, log } = takeTurn(this.state, action);
    this.state = state;
    this.lastLog = log;
    this.choice = null;
    this.targets = [];
    this.restoration = null;
    if (this.market) this.restoreSlot = null;
    if (this.mode === 'restore' && this.market) this.restoreSlot = this.cheapestSlot();
    this.emit('turn', { before, state, log, action });
    this.emit('selection');
  }
}
