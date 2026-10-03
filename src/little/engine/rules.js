// Little Green: the three mechanics (bees, mucky water, heatwaves) and the stars.
// Each function changes the (already cloned) state and appends to the log.
import { touches, touchesStream, cellsWith, isHeatwaveTurn, streamIsClean } from './state.js';

const at = (c) => [c.row, c.col];

// Pollination: a veg patch touching flowers grows a strawberry.
export function bees(state, log) {
  for (const veg of cellsWith(state, 'veg')) {
    const flowers = touches(state, veg, 'flowers');
    if (flowers.length > 0) {
      veg.fruit = Math.min(state.config.fruitMax, veg.fruit + 1);
      state.basket += 1;
      log.push({ type: 'bees', from: at(flowers[0]), to: at(veg), fruit: veg.fruit, basket: state.basket });
    } else {
      log.push({ type: 'noBees', at: at(veg) });
    }
  }
}

function nearestStream(state, cell) {
  let best = null;
  let bestD = Infinity;
  for (const c of state.cells) {
    if (c.ground !== 'stream') continue;
    const d = Math.abs(c.row - cell.row) + Math.abs(c.col - cell.col);
    if (d < bestD) { best = c; bestD = d; }
  }
  return best;
}

// Waste: each house makes mucky water. Reeds touching the house soak it up; otherwise it runs
// into the stream. Then each reed bed beside the stream cleans some of the stream.
export function muck(state, log) {
  const { muckPerHouse, reedsCleanStream } = state.config;
  for (const house of cellsWith(state, 'house')) {
    const reeds = touches(state, house, 'reeds');
    if (reeds.length > 0) {
      log.push({ type: 'soak', from: at(house), to: at(reeds[0]) });
    } else {
      state.streamMuck += muckPerHouse;
      log.push({ type: 'muck', from: at(house), to: at(nearestStream(state, house)), stream: state.streamMuck });
    }
  }
  for (const reeds of cellsWith(state, 'reeds')) {
    const water = touchesStream(state, reeds);
    if (water.length === 0 || state.streamMuck === 0) continue;
    state.streamMuck = Math.max(0, state.streamMuck - reedsCleanStream);
    log.push({ type: 'clean', from: at(water[0]), to: at(reeds), stream: state.streamMuck });
  }
}

// Heatwave: a house touching a tree stays cool; the others get hot (until next turn).
export function heatwave(state, log) {
  if (!isHeatwaveTurn(state)) return;
  const cool = [];
  const hot = [];
  for (const house of cellsWith(state, 'house')) {
    const cooled = touches(state, house, 'tree').length > 0;
    house.hot = !cooled;
    (cooled ? cool : hot).push(at(house));
  }
  state.heatwaves.push({ turn: state.turn, cool: cool.length, hot: hot.length });
  log.push({ type: 'heatwave', cool, hot });
}

// What each house and veg patch still wants, for hints and wish bubbles.
// On a heatwave turn a house asks for a tree first; otherwise for reeds first.
export function needs(state) {
  const out = [];
  for (const c of state.cells) {
    if (c.piece === 'veg' && touches(state, c, 'flowers').length === 0) out.push({ row: c.row, col: c.col, piece: 'veg', need: 'flowers' });
    if (c.piece === 'house') {
      const wants = [];
      if (touches(state, c, 'reeds').length === 0) wants.push('reeds');
      if (touches(state, c, 'tree').length === 0) wants.push('tree');
      if (isHeatwaveTurn(state)) wants.reverse();
      for (const need of wants) out.push({ row: c.row, col: c.col, piece: 'house', need });
    }
  }
  return out;
}

// Stars at the end: every veg patch has flowers; the stream is clean; every house was cool in the last heatwave.
export function stars(state) {
  const last = state.heatwaves[state.heatwaves.length - 1];
  return {
    bee: cellsWith(state, 'veg').every((v) => touches(state, v, 'flowers').length > 0),
    water: streamIsClean(state),
    cool: !last || last.hot === 0
  };
}
