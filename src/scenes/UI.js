// UI: HUD, market, restoration picker, inspector, overlays bar, toasts, event modal, hints.
import Phaser from 'phaser';
import { UI as C } from '../art/palette.js';
import { BUILDINGS } from '../data/buildings.js';
import { RESTORATIONS, RESTORATION_KEYS } from '../data/restorations.js';
import { SERVICES, SERVICE_KEYS, OTHER_NCP_NOTE } from '../data/services.js';
import { EVENTS } from '../data/events.js';
import { OBJECTIVES } from '../data/objectives.js';
import { STAGE_ORDER, MENU_UNLOCKS } from '../data/decks.js';
import { RIGHT_X, RIGHT_W, BOTTOM_Y, BOARD_X, W, H, setupCamera, logicalPointer } from '../ui/layout.js';
import { text, button, panel, money, fmt1 } from '../ui/widgets.js';
import { gdpLabel, foodLabel, landUseText, habitatName, serviceTooltip } from '../ui/describe.js';
import { upcomingEvent } from '../engine/events.js';
import { intactness } from '../engine/intensity.js';
import { evaluateObjectives } from '../engine/objectives.js';
import { menuUnlocked, surcharge } from '../engine/market.js';
import { wasteTokensAt, wasteBillRate } from '../engine/waste.js';
import { tileFood } from '../engine/gdp.js';
import { cellAt } from '../engine/grid.js';
import { isFirstGame, hintsSeen, markHintSeen } from '../ui/prefs.js';

const HINTS = {
  place: 'Pick a tile from the market, then click a gold square on the map to build it.',
  overlays: 'Try the buttons along the bottom: they show where each of nature\'s services comes from.',
  waste: 'Waste flows downhill into rivers, lakes and the sea. Wetlands with a strong water service (fen, peat, saltmarsh) clean it up, including the river beside them.',
  restore: 'Restoring nature is a valid turn. Switch to Restore, pick an action, and click a square.',
  food: 'Every resident eats 1 food a turn. Farms and fishing fleets make it; anything short is bought in, which costs you.'
};

const ALL_BUILDINGS = STAGE_ORDER.flatMap((s) => MENU_UNLOCKS[s]);

export class UI extends Phaser.Scene {
  constructor() {
    super('UI');
  }

  create() {
    setupCamera(this);
    this.session = this.registry.get('session');
    const s = this.session;
    this.firstGame = isFirstGame();
    this.prevObjectives = evaluateObjectives(s.state).map((o) => o.met);

    this.buildTopBar();
    this.buildMarket();
    this.buildActions();
    this.buildInspector();
    this.buildBottomBar();
    this.buildToasts();
    this.buildTooltip();

    const onSel = () => this.refresh();
    const onPreview = () => this.refreshInspector();
    const onInspect = () => this.refreshInspector();
    const onHover = () => this.refreshInspector();
    const onOverlay = () => this.refreshBottom();
    const onAnimated = (e) => this.afterTurn(e.log);
    const onToast = (msg) => this.toast(msg, C.accent);
    s.on('toast', onToast);
    s.on('selection', onSel);
    s.on('preview', onPreview);
    s.on('inspect', onInspect);
    s.on('hover', onHover);
    s.on('overlay', onOverlay);
    s.on('turnAnimated', onAnimated);
    this.events.once('shutdown', () => {
      s.off('selection', onSel); s.off('preview', onPreview); s.off('inspect', onInspect);
      s.off('hover', onHover); s.off('overlay', onOverlay); s.off('turnAnimated', onAnimated);
      s.off('toast', onToast);
    });

    this.input.keyboard.on('keydown-P', () => s.pass());
    this.refresh();
    this.showHint('place');
  }

  // ---------------- top bar ----------------

  buildTopBar() {
    panel(this, 0, 0, W, 78, 0x20202c);
    this.hudTurn = text(this, 16, 10, '', { size: 18, bold: true });
    this.add.image(222, 20, 'coin').setScale(1);
    this.hudCash = text(this, 240, 10, '', { size: 18, bold: true, color: C.gold });
    this.hudScore = text(this, 320, 10, '', { size: 18 });
    this.hudFace = this.add.image(482, 20, 'face_happy').setScale(1);
    this.hudHappy = text(this, 500, 10, '', { size: 18 });
    this.add.image(580, 20, 'icon_BIO').setScale(1);
    this.hudBio = text(this, 598, 10, '', { size: 18 });
    this.add.image(700, 20, 'waste').setScale(1);
    this.hudSea = text(this, 716, 10, '', { size: 18 });
    this.hudEvent = text(this, 16, 46, '', { size: 15, color: C.accent });
    this.hudHomes = text(this, 600, 46, '', { size: 15 });
    this.hudFood = text(this, 720, 46, '', { size: 15 });
    this.hudObjTitle = text(this, 880, 6, 'Objectives (+£50 each, hover for details)', { size: 12, color: C.dim });
    this.hudObj = [text(this, 880, 24, '', { size: 14 }), text(this, 880, 46, '', { size: 14 })];

    const tipZone = (x, y, w, h, fn) => {
      const z = this.add.zone(x, y, w, h).setOrigin(0).setInteractive();
      z.on('pointerover', () => this.showTip(fn()));
      z.on('pointerout', () => this.hideTip());
    };
    tipZone(204, 4, 110, 34, () => 'Cash: spend it on tiles. It can never go below £0.');
    tipZone(318, 4, 150, 34, () => 'Score: total GDP earned so far, after event damage.');
    tipZone(468, 4, 100, 34, () => 'Happiness (0 to 10): the average wellbeing of residents.\nAbove 5 it boosts GDP; below 5 it drags it down.');
    tipZone(568, 4, 120, 34, () => 'Biodiversity intactness: average nature value (B) across the land.\nIt started at ' + Math.round(this.session.state.stats.startIntactness * 100) + '%.');
    tipZone(690, 4, 170, 34, () => `Water pollution: waste that has reached the sea or a lake.\nIt hurts fishing and holiday parks near water, and makes clean-up dearer: waste bills are now £${wasteBillRate(this.session.state)} a token.\nHealthy seagrass cleans it slowly; wetlands and woods by the river stop it getting there.`);
    tipZone(876, 4, 400, 70, () => evaluateObjectives(this.session.state)
      .map((o) => `${o.met ? '✔ On track' : '○ Not yet'}: ${o.name}\n${o.text} (now ${o.progress})\n${OBJECTIVES[o.id].why}`).join('\n\n'));
    tipZone(596, 40, 118, 30, () => {
      const st = this.session.state;
      return `Homes: residents now, and the housing target for the end of the game.\nEach resident short at the end costs £${st.config.housingPenaltyPerResident}.`;
    });
    tipZone(716, 40, 160, 30, () => {
      const f = this.session.state.food;
      return `Food made this turn / food your residents eat (1 each).\nFarms and fishing fleets make food; pollinators and clean water help them make more.` +
        (f?.bought ? `\nYou are buying ${f.bought} food this turn, costing £${fmt1(f.cost).replace(/\.0$/, '')}.` : '\nEveryone is fed.');
    });
    tipZone(10, 40, 580, 34, () => {
      const ev = upcomingEvent(this.session.state);
      return ev ? `${EVENTS[ev.id].name}\n${EVENTS[ev.id].blurb}` : 'No more events.';
    });
  }

  refreshTopBar() {
    const st = this.session.state;
    this.hudTurn.setText(`Turn ${st.turn}/${st.config.turns}  ·  Stage ${st.stage}`);
    this.hudCash.setText(money(st.cash));
    this.hudScore.setText(`Score ${money(st.score)}`);
    this.hudHappy.setText(`${fmt1(st.happiness)}`);
    this.hudFace.setTexture(st.happiness >= 6.5 ? 'face_happy' : st.happiness >= 4 ? 'face_ok' : 'face_sad');
    this.hudBio.setText(`${Math.round(intactness(st) * 100)}%`);
    this.hudSea.setText(`Pollution ${fmt1(st.pollution).replace(/\.0$/, '')}`);
    this.hudHomes.setText(`Homes ${st.residents}/${st.housingTarget}`);
    this.hudHomes.setColor(st.residents >= st.housingTarget ? C.good : C.text);
    const f = st.food ?? { made: 0, need: 0, bought: 0 };
    this.hudFood.setText(`Food ${f.made}/${f.need}${f.bought ? `  (buying ${f.bought})` : ''}`);
    this.hudFood.setColor(f.bought ? C.bad : C.good);
    const ev = upcomingEvent(st);
    if (ev) {
      const left = ev.turnsLeft;
      const when = left === 0 ? 'at the end of this turn!' : `in ${left + 1} turn${left === 0 ? '' : 's'} (end of turn ${ev.turn})`;
      this.hudEvent.setText(`Next event: ${ev.name} ${when}${when.endsWith('!') ? '' : '.'} Hover for details.`);
      this.hudEvent.setColor(left <= 1 ? C.bad : C.accent);
    } else {
      this.hudEvent.setText('No more events this game.');
    }
    evaluateObjectives(st).forEach((o, i) => {
      this.hudObj[i].setText(`${o.met ? '✔' : '○'} ${o.name} (${o.progress})`);
      this.hudObj[i].setColor(o.met ? C.good : C.text);
    });
  }

  // ---------------- market / menu ----------------

  buildMarket() {
    const s = this.session;
    this.marketTitle = text(this, RIGHT_X, 86, '', { size: 16, bold: true, color: C.gold });
    this.cards = [];
    if (s.market) {
      for (let i = 0; i < 6; i++) {
        const x = RIGHT_X + i * 117;
        const y = 110;
        const c = this.add.container(x, y);
        const bg = this.add.rectangle(0, 0, 111, 160, C.panel).setOrigin(0).setStrokeStyle(2, 0x000000);
        const price = text(this, 55, 6, '', { size: 16, bold: true, color: C.gold, origin: [0.5, 0] });
        const sprite = this.add.image(55, 54, 'px').setScale(1.5);
        const name = text(this, 55, 82, '', { size: 12, bold: true, origin: [0.5, 0], align: 'center', wrap: 104 });
        const info = text(this, 55, 116, '', { size: 11, color: C.dim, origin: [0.5, 0], align: 'center', wrap: 106 });
        const slotTag = text(this, 55, 146, i === 0 ? 'drops out next' : '', { size: 10, color: C.bad, origin: [0.5, 0] });
        c.add([bg, price, sprite, name, info, slotTag]);
        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerdown', () => this.clickCard(i));
        bg.on('pointerover', () => { bg.setStrokeStyle(2, 0xe8b53a); this.showCardTip(i); });
        bg.on('pointerout', () => { this.refreshMarket(); this.hideTip(); });
        Object.assign(c, { bg, price, sprite, name, info, slot: i });
        this.cards.push(c);
      }
    } else {
      ALL_BUILDINGS.forEach((id, i) => {
        const col = i % 8;
        const row = Math.floor(i / 8);
        const x = RIGHT_X + col * 88;
        const y = 110 + row * 74;
        const c = this.add.container(x, y);
        const bg = this.add.rectangle(0, 0, 84, 70, C.panel).setOrigin(0).setStrokeStyle(2, 0x000000);
        const sprite = this.add.image(22, 22, `bld_${id}`).setScale(1);
        const price = text(this, 80, 4, `£${BUILDINGS[id].cost}`, { size: 14, bold: true, color: C.gold, origin: [1, 0] });
        const name = text(this, 42, 42, BUILDINGS[id].name, { size: 10, origin: [0.5, 0], align: 'center', wrap: 80 });
        c.add([bg, sprite, price, name]);
        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerdown', () => this.clickMenu(id));
        bg.on('pointerover', () => { bg.setStrokeStyle(2, 0xe8b53a); this.showTip(this.buildingTip(id)); });
        bg.on('pointerout', () => { this.refreshMarket(); this.hideTip(); });
        Object.assign(c, { bg, sprite, price, name, building: id });
        this.cards.push(c);
      });
    }
  }

  buildingTip(id) {
    const b = BUILDINGS[id];
    const lines = [`${b.name} (${b.role})`, b.tip, `Costs £${b.cost}. GDP ${gdpLabel(id)} a turn.${foodLabel(id) ? ` Food ${foodLabel(id)}.` : ''}${b.residents ? ` Houses ${b.residents} (each eats 1 food).` : ''} Waste ${b.waste}: nature touching it soaks up 1 per 2 water; the rest costs £1 each.`];
    if (b.residents) lines.push(`Homes for ${b.residents} resident${b.residents > 1 ? 's' : ''}.`);
    if (b.pressure) lines.push(`Puts pressure ${b.pressure} on nature next to it.`);
    if (b.nuisance) lines.push('Homes next to it are less happy.');
    return lines.join('\n');
  }

  showCardTip(i) {
    const id = this.session.state.market.slots[i];
    if (!id) return;
    const extra = this.session.mode === 'restore'
      ? `\n\nRestore mode: discard this card for £${surcharge(this.session.state, i)}.`
      : `\n\nThis slot adds £${surcharge(this.session.state, i)}.`;
    this.showTip(this.buildingTip(id) + extra);
  }

  clickCard(i) {
    const s = this.session;
    if (s.busy || s.state.gameOver || !s.state.market.slots[i]) return;
    if (s.mode === 'restore') s.selectRestoreSlot(i);
    else if (s.choice?.slot === i) s.cancel();
    else s.selectBuild(i);
  }

  clickMenu(id) {
    const s = this.session;
    if (s.busy || s.state.gameOver) return;
    if (!menuUnlocked(s.state).includes(id)) return;
    if (s.choice?.building === id) s.cancel();
    else s.selectBuild(id);
  }

  refreshMarket() {
    const s = this.session;
    const st = s.state;
    const restoring = s.mode === 'restore';
    if (s.market) {
      this.marketTitle.setText(restoring
        ? 'Restore: choose a card to discard (you pay only the slot price)'
        : 'Market: older tiles get cheaper, then drop out');
      this.cards.forEach((c, i) => {
        const id = st.market.slots[i];
        c.setVisible(true);
        if (!id) {
          c.sprite.setVisible(false);
          c.name.setText('(empty)');
          c.price.setText('');
          c.info.setText('');
          c.bg.setStrokeStyle(2, 0x000000).setFillStyle(C.panel);
          c.setAlpha(0.5);
          return;
        }
        const b = BUILDINGS[id];
        c.sprite.setVisible(true).setTexture(`bld_${id}`);
        c.name.setText(b.name);
        const extra = surcharge(st, i);
        if (restoring) {
          c.price.setText(`£${extra}`);
          c.info.setText('to discard');
        } else {
          c.price.setText(`£${b.cost + extra}`);
          c.info.setText(`GDP ${gdpLabel(id)}\n${foodLabel(id) ? `Food ${foodLabel(id)}, ` : b.residents ? `Homes ${b.residents}, ` : ''}waste ${b.waste}`);
        }
        const choice = restoring ? { type: 'restore', restoration: 'plantWoodland', slot: i } : { type: 'build', slot: i };
        const affordable = s.canAfford(choice);
        const selected = restoring ? s.restoreSlot === i : s.choice?.slot === i;
        c.setAlpha(affordable ? 1 : 0.45);
        c.bg.setFillStyle(selected ? 0x3d4f2e : C.panel);
        c.bg.setStrokeStyle(selected ? 3 : 2, selected ? 0xe8b53a : 0x000000);
      });
    } else {
      this.marketTitle.setText('Menu: pick any unlocked tile');
      const unlocked = menuUnlocked(st);
      this.cards.forEach((c) => {
        const open = unlocked.includes(c.building);
        const affordable = open && s.canAfford({ type: 'build', building: c.building });
        const selected = s.choice?.building === c.building;
        c.setAlpha(affordable ? 1 : open ? 0.5 : 0.22);
        c.bg.setFillStyle(selected ? 0x3d4f2e : C.panel);
        c.bg.setStrokeStyle(selected ? 3 : 2, selected ? 0xe8b53a : 0x000000);
        c.price.setText(open ? `£${BUILDINGS[c.building].cost}` : 'later');
      });
    }
  }

  // ---------------- build / restore / pass ----------------

  buildActions() {
    const s = this.session;
    const y = s.market ? 280 : 262;
    this.buildBtn = button(this, RIGHT_X, y, 100, 32, 'Build', () => { if (!s.busy) s.setMode('build'); }, { bold: true });
    this.restoreBtn = button(this, RIGHT_X + 106, y, 100, 32, 'Restore', () => { if (!s.busy) s.setMode('restore'); }, { bold: true });
    this.passBtn = button(this, RIGHT_X + RIGHT_W - 130, y, 130, 32, 'Pass turn (P)', () => s.pass(), { fill: 0x3a3a4c });
    this.modeHint = text(this, RIGHT_X + 220, y + 8, '', { size: 13, color: C.dim });
    this.restBtns = RESTORATION_KEYS.map((id, i) => {
      const r = RESTORATIONS[id];
      const b = button(this, RIGHT_X + i * 140, y + 38, 134, 36, r.short, () => { if (!s.busy) s.selectRestoration(id); }, {
        size: 13, bold: true,
        onHover: (on) => (on ? this.showTip(`${r.name}\n${r.tip}\nWorks on: ${this.restoreTargetsText(id)}`) : this.hideTip())
      });
      b.add(this.add.image(20, 18, r.icon).setScale(0.875));
      b.label.setX(78);
      b.restoration = id;
      return b;
    });
  }

  restoreTargetsText(id) {
    const r = RESTORATIONS[id];
    const names = [...r.habitats.map((h) => habitatName(h).toLowerCase()), ...r.buildings.map((b) => BUILDINGS[b].name.toLowerCase())];
    return names.join(', ') + (r.nextToWater ? ' (next to a river or lake)' : '');
  }

  refreshActions() {
    const s = this.session;
    const restoring = s.mode === 'restore';
    this.buildBtn.setActive(!restoring);
    this.restoreBtn.setActive(restoring);
    this.passBtn.setEnabled(!s.state.gameOver);
    for (const b of this.restBtns) {
      b.setVisible(restoring);
      b.setActive(s.restoration === b.restoration);
    }
    let hint = '';
    if (restoring) {
      if (!s.restoration) hint = 'Pick a restoration action below.';
      else if (s.choice && s.targets.length === 0) hint = s.canAfford(s.choice) ? 'Nowhere to do that right now.' : 'You cannot afford that.';
      else if (s.choice) hint = `Click a gold square. Cost £${s.cost(s.choice)}.`;
      else hint = 'Pick a card to discard.';
    } else if (s.choice) {
      if (!s.canAfford(s.choice)) hint = 'You cannot afford that yet.';
      else hint = s.targets.length ? 'Click a gold square to build. Esc to cancel.' : 'Nowhere to build that right now.';
    } else {
      hint = 'Pick a tile, or switch to Restore.';
    }
    this.modeHint.setText(hint);
  }

  // ---------------- inspector ----------------

  buildInspector() {
    const s = this.session;
    const y = s.market ? 358 : 346;
    this.inspY = y;
    panel(this, RIGHT_X, y, RIGHT_W, BOTTOM_Y - y - 8);
    this.inspTitle = text(this, RIGHT_X + 16, y + 10, '', { size: 18, bold: true, color: C.gold });
    this.inspSprite = this.add.image(RIGHT_X + RIGHT_W - 40, y + 36, 'px').setScale(1.5);
    this.inspBody = text(this, RIGHT_X + 16, y + 40, '', { size: 14, lineSpacing: 4, wrap: RIGHT_W - 110 });
    this.inspSvcLabel = text(this, RIGHT_X + 16, y + 158, '', { size: 13, color: C.dim });
    this.inspSvc = SERVICE_KEYS.map((k, i) => {
      const x = RIGHT_X + 16 + i * 132;
      const icon = this.add.image(x + 16, y + 198, SERVICES[k].icon).setScale(1);
      const val = text(this, x + 36, y + 186, '', { size: 16, bold: true });
      const name = text(this, x, y + 218, SERVICES[k].short, { size: 11, color: C.dim });
      const z = this.add.zone(x, y + 178, 126, 56).setOrigin(0).setInteractive();
      z.on('pointerover', () => this.showTip(serviceTooltip(k)));
      z.on('pointerout', () => this.hideTip());
      return { icon, val, name, key: k };
    });
    this.inspFoot = text(this, RIGHT_X + 16, y + 240, '', { size: 13, color: C.bad, wrap: RIGHT_W - 32, lineSpacing: 3 });
  }

  setServices(label, values) {
    this.inspSvcLabel.setText(label);
    for (const sv of this.inspSvc) {
      const on = values != null;
      sv.icon.setVisible(on);
      sv.name.setVisible(on);
      sv.val.setVisible(on);
      if (on) {
        const v = values[sv.key] ?? 0;
        sv.val.setText(fmt1(v));
        sv.val.setColor(v >= 3 ? C.good : v > 0 ? C.text : C.dim);
      }
    }
  }

  refreshInspector() {
    const s = this.session;
    const st = s.state;
    const pv = s.currentPreview;
    const h = s.hover;
    this.inspFoot.setText('');
    if (pv && h) {
      const cell = cellAt(st, h.row, h.col);
      const building = s.choice.type === 'build' ? (s.market ? st.market.slots[s.choice.slot] : s.choice.building) : null;
      if (building) {
        this.inspTitle.setText(`Build ${BUILDINGS[building].name} here: £${pv.cost}`);
        this.inspSprite.setTexture(`bld_${building}`).setVisible(true);
      } else {
        const r = RESTORATIONS[s.choice.restoration];
        this.inspTitle.setText(`${r.name} here: £${pv.cost}`);
        this.inspSprite.setTexture(r.icon).setVisible(true);
      }
      const lines = [];
      lines.push(`On: ${habitatName(cell.habitat)}${cell.kind === 'built' ? ` (${BUILDINGS[cell.building].name})` : ''}`);
      if (building) lines.push(`Projected GDP: £${pv.gdp} a turn, after its waste bill`);
      const d = pv.gdpDelta;
      lines.push(`Change in region's GDP per turn: ${d >= 0 ? '+' : ''}£${fmt1(d)}`);
      const hd = pv.happinessDelta;
      lines.push(`Change in happiness: ${hd >= 0 ? '+' : ''}${fmt1(hd)}`);
      if (pv.intensityChanges.length) lines.push(`Nature under more pressure: ${pv.intensityChanges.length} square${pv.intensityChanges.length > 1 ? 's' : ''} (red outline)`);
      this.inspBody.setText(lines.join('\n'));
      this.setServices(building ? 'Services it would receive (3+ is strong):' : '', building ? pv.received : null);
      this.inspFoot.setText(pv.warnings.map((w) => `⚠ ${w}`).join('\n'));
      return;
    }
    const target = s.inspected ?? h;
    if (!target) {
      this.inspTitle.setText('Inspector');
      this.inspSprite.setVisible(false);
      this.inspBody.setText('Hover over or click a square to see what it is, how healthy it is, and what it gives you.\n\n' + OTHER_NCP_NOTE);
      this.setServices('', null);
      return;
    }
    const cell = cellAt(st, target.row, target.col);
    const lines = [];
    if (cell.kind === 'built') {
      const b = BUILDINGS[cell.building];
      this.inspTitle.setText(`${b.name} (${b.role})`);
      this.inspSprite.setTexture(`bld_${cell.building}`).setVisible(true);
      lines.push(`${landUseText(cell)}. Biodiversity B ${cell.B.toFixed(2)}`);
      lines.push(`On former ${habitatName(cell.habitat).toLowerCase()}. Waste here: ${wasteTokensAt(st, cell)}`);
      const made = b.food ? `.  Food: ${tileFood(cell)}` : '';
      lines.push(`GDP last turn: £${cell.gdp} after its waste bill${made}${cell.wellbeing != null ? `.  Wellbeing: ${fmt1(cell.wellbeing)} / 10` : ''}`);
      if (cell.soil != null) {
        const cost = (st.config.soilMax - cell.soil) * st.config.fertiliserPerPoint;
        lines.push(`Soil ${cell.soil}/${st.config.soilMax}${cost ? `: fertiliser costs £${cost} a turn` : ': healthy'}. Water-holding nature touching it keeps soil healthy.`);
      }
      lines.push(b.tip);
      this.setServices('Services received from nearby nature:', cell.received);
    } else {
      this.inspTitle.setText(`${habitatName(cell.habitat)}${cell.landUse === 'primary' ? ' (ancient)' : ''}${cell.reserve ? ' (marine reserve)' : ''}`);
      this.inspSprite.setTexture(`hab_${cell.habitat}_${cell.intensity}_n`).setVisible(true);
      lines.push(`${landUseText(cell)}. Biodiversity B ${cell.B.toFixed(2)}`);
      lines.push(`Pressure ${cell.pressure}.  Waste here: ${wasteTokensAt(st, cell)}.  Height ${cell.elevation}`);
      if (cell.habitat === 'bare') lines.push('Bare ground: compacted and worn out. Restore it, or build on it.');
      if (cell.restored) lines.push(`Restored ${cell.age} turn${cell.age === 1 ? '' : 's'} ago.`);
      if (cell.landUse === 'primary') lines.push('Ancient habitat: if it is built on or worn out, it can never come back.');
      this.setServices('Services it supplies to tiles nearby:', cell.supply);
    }
    this.inspBody.setText(lines.join('\n'));
  }

  // ---------------- bottom bar ----------------

  buildBottomBar() {
    const s = this.session;
    panel(this, 0, BOTTOM_Y, W, H - BOTTOM_Y, 0x20202c);
    text(this, 16, BOTTOM_Y + 18, 'Map view:', { size: 14, color: C.dim });
    const items = [['none', 'None', null], ...SERVICE_KEYS.map((k) => [k, SERVICES[k].short, SERVICES[k].icon]), ['BIO', 'Biodiversity', 'icon_BIO'], ['WASTE', 'Waste', 'waste']];
    let x = 100;
    this.ovBtns = items.map(([key, label, icon]) => {
      const w = icon ? 140 : 70;
      const b = button(this, x, BOTTOM_Y + 8, w, 40, icon ? `     ${label}` : label, () => s.setOverlay(key), {
        size: 13,
        onHover: (on) => {
          if (!on) return this.hideTip();
          if (SERVICES[key]) this.showTip(serviceTooltip(key) + '\n\nBrighter squares supply more. Numbers show what built tiles receive.');
          else if (key === 'BIO') this.showTip('Biodiversity value B (0 to 1) from the PREDICTS land-use table.\nHigher is better. Built tiles and heavy use lower it.');
          else if (key === 'WASTE') this.showTip('Waste tokens and which way they flow (downhill).');
        }
      });
      if (icon) b.add(this.add.image(20, 20, icon).setScale(1));
      b.key = key;
      x += w + 6;
      return b;
    });
    this.buildFullscreenButton(W - 80, BOTTOM_Y + 8);
    this.refreshBottom();
  }

  // Full screen: a button where the browser supports it (desktop, Android).
  // iPhones do not allow it for web pages; there, "Add to Home Screen" opens the game without browser bars.
  buildFullscreenButton(x, y) {
    if (!this.scale.fullscreen.available) {
      text(this, W - 16, BOTTOM_Y + 18, 'N: animations · D: debug', { size: 11, color: C.dim, origin: [1, 0] });
      return;
    }
    const b = button(this, x, y, 64, 40, '', () => this.scale.toggleFullscreen(), {
      onUp: true,
      onHover: (on) => (on ? this.showTip('Full screen on or off.\nN: nature at work animations on or off.\nD: debug view.') : this.hideTip())
    });
    b.add(this.add.image(32, 20, 'icon_fullscreen').setScale(0.75));
  }

  refreshBottom() {
    for (const b of this.ovBtns) b.setActive(this.session.overlay === b.key);
  }

  // ---------------- toasts, tooltip, hints ----------------

  buildToasts() {
    this.toasts = [];
    this.toastY = 586;
  }

  toast(msg, colour = C.text) {
    const t = text(this, BOARD_X - 6, 0, msg, { size: 12, color: colour, wrap: 492 });
    t.setBackgroundColor('#262633').setPadding(6, 3, 6, 3);
    this.toasts.push(t);
    while (this.toasts.length > 3) this.toasts.shift().destroy();
    // Keep the stack above the bottom bar.
    while (this.toasts.length > 1 && this.toasts.reduce((h, x) => h + x.height + 2, this.toastY) > BOTTOM_Y - 2) {
      this.toasts.shift().destroy();
    }
    this.layoutToasts();
    this.time.delayedCall(5500, () => {
      this.tweens.add({
        targets: t, alpha: 0, duration: 400,
        onComplete: () => { this.toasts = this.toasts.filter((x) => x !== t); t.destroy(); this.layoutToasts(); }
      });
    });
  }

  layoutToasts() {
    let y = this.toastY;
    for (const t of this.toasts) {
      t.setY(y);
      y += t.height + 2;
    }
  }

  // First-play hints: at most one new hint per turn.
  showHint(id) {
    if (!this.firstGame || hintsSeen().includes(id)) return;
    if (this.hintTurn === this.session.state.turn) return;
    this.hintTurn = this.session.state.turn;
    markHintSeen(id);
    this.toast(`Hint: ${HINTS[id]}`, C.gold);
  }

  buildTooltip() {
    this.tip = text(this, 0, 0, '', { size: 13, wrap: 360, lineSpacing: 3 }).setDepth(100).setVisible(false);
    this.tip.setBackgroundColor('#111118f0').setPadding(8, 6, 8, 6);
    this.input.on('pointermove', (p) => {
      if (!this.tip.visible) return;
      this.positionTip(p);
    });
  }

  showTip(str) {
    if (!str) return;
    this.tip.setText(str).setVisible(true);
    this.positionTip(this.input.activePointer);
  }

  positionTip(pointer) {
    const p = logicalPointer(this, pointer);
    const x = Math.min(p.x + 16, W - this.tip.width - 4);
    const y = p.y + 20 + this.tip.height > H ? p.y - this.tip.height - 10 : p.y + 20;
    this.tip.setPosition(x, Math.max(0, y));
  }

  hideTip() {
    this.tip.setVisible(false);
  }

  // ---------------- turn results ----------------

  afterTurn(log) {
    const st = this.session.state;
    for (const l of log) {
      if (l.type === 'primaryLost') this.toast(l.message, C.bad);
      if (l.type === 'succession') this.toast(l.message, C.good);
      if (l.type === 'stage') this.toast(`Stage ${l.stage} begins: new kinds of tile arrive.`, C.accent);
      if (l.type === 'build' && log.length) this.showHint('overlays');
    }
    const w = log.find((l) => l.type === 'waste');
    if (st.turn >= 2 && st.food?.bought > 0) this.showHint('food');
    if (st.turn >= 3 && w && w.produced > 0) this.showHint('waste');
    if (st.turn >= 5) this.showHint('restore');

    const now = evaluateObjectives(st);
    now.forEach((o, i) => {
      if (o.met !== this.prevObjectives[i]) {
        this.toast(o.met ? `Objective on track: ${o.name}.` : `Objective slipping: ${o.name}.`, o.met ? C.good : C.bad);
      }
    });
    this.prevObjectives = now.map((o) => o.met);

    const ev = log.find((l) => l.type === 'event');
    const over = log.some((l) => l.type === 'gameOver');
    const done = () => {
      if (over) this.finish();
      else {
        const next = upcomingEvent(st);
        if (ev && next) this.toast(`Coming up: ${next.name} at the end of turn ${next.turn}.`, C.accent);
      }
    };
    if (ev) this.eventModal(ev, done);
    else done();
    this.refresh();
  }

  eventModal(ev, onClose) {
    this.session.busy = true;
    const layer = this.add.container(0, 0).setDepth(50);
    const shade = this.add.rectangle(0, 0, W, H, 0x000000, 0.6).setOrigin(0).setInteractive();
    const bx = 290;
    const by = 130;
    const bw = 700;
    const bh = 440;
    const box = panel(this, bx, by, bw, bh, 0x262633).setStrokeStyle(3, 0xe8b53a);
    const title = text(this, bx + 24, by + 18, `${ev.name}!`, { size: 28, bold: true, color: C.gold });
    const blurb = text(this, bx + 24, by + 60, EVENTS[ev.id].blurb, { size: 14, wrap: bw - 48, color: C.dim });
    const lines = [];
    if (ev.potential === 0) {
      lines.push('Nothing was at risk this time. Lucky!');
    } else {
      lines.push(`${ev.hit.length} tile${ev.hit.length === 1 ? ' was' : 's were'} hit, costing ${money(ev.damage)}.`);
      if (ev.hit.length) {
        const names = {};
        ev.hit.forEach((h) => { names[h.name] = (names[h.name] ?? 0) + 1; });
        lines.push('Hit: ' + Object.entries(names).map(([n, c]) => `${n}${c > 1 ? ` x${c}` : ''}`).join(', '));
      }
      if (ev.destroyed?.length) {
        const n = ev.destroyed.length;
        lines.push(`Wrecked: ${ev.destroyed.map((d) => d.name).join(', ')}. ${n === 1 ? 'It is' : 'They are'} bare ground now: rebuild, or put nature there instead.`);
      }
      lines.push('');
      lines.push(`${ev.protected.length} tile${ev.protected.length === 1 ? ' was' : 's were'} protected by nature.`);
      ev.messages.slice(0, 4).forEach((m) => lines.push(m));
      lines.push('');
      lines.push(ev.avoided > 0 ? `Nature saved you ${money(ev.avoided)} of damage.` : 'Nature could not protect anything this time.');
    }
    const body = text(this, bx + 24, by + 110, lines.join('\n'), { size: 16, wrap: bw - 48, lineSpacing: 5 });
    const ok = button(this, bx + bw / 2 - 90, by + bh - 62, 180, 42, 'Carry on', () => { layer.destroy(); this.session.busy = false; onClose(); }, { bold: true, size: 16, fill: 0x4d6a3a });
    layer.add([shade, box, title, blurb, body, ok]);
  }

  finish() {
    if (this.finished) return;
    this.finished = true;
    this.time.delayedCall(400, () => {
      this.scene.stop('UI');
      this.scene.stop('Game');
      this.scene.start('End', { state: this.session.state });
    });
  }

  refresh() {
    this.refreshTopBar();
    this.refreshMarket();
    this.refreshActions();
    this.refreshInspector();
  }
}
