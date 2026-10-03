#!/usr/bin/env node
// Headless balance check for Little Green: how many stars do random and sensible players earn?
//   node scripts/little-sim.js --games 500
import { createGame, cellAt, touches, touchesStream, cellsWith } from '../src/little/engine/state.js';
import { takeTurn, legalTargets } from '../src/little/engine/turn.js';
import { NATURE_PIECES } from '../src/little/data/pieces.js';

const args = process.argv.slice(2);
const games = Number(args[args.indexOf('--games') + 1]) || 300;

// A tiny seeded random for the bots, separate from the game's own RNG.
function botRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// How well the garden is looked after: each need met counts 1; reeds beside the stream count a half.
function goodness(s) {
  let g = 0;
  for (const v of cellsWith(s, 'veg')) if (touches(s, v, 'flowers').length) g += 1;
  for (const h of cellsWith(s, 'house')) {
    if (touches(s, h, 'reeds').length) g += 1;
    if (touches(s, h, 'tree').length) g += 1;
  }
  for (const r of cellsWith(s, 'reeds')) if (touchesStream(s, r).length) g += 0.5;
  return g;
}

function withPiece(s, row, col, piece) {
  const copy = { ...s, cells: s.cells.map((c) => ({ ...c })) };
  cellAt(copy, row, col).piece = piece;
  return copy;
}

const BOTS = {
  random(s, r) {
    const targets = legalTargets(s);
    const [row, col] = targets[Math.floor(r() * targets.length)];
    return s.step === 'visitor' ? { row, col } : { row, col, piece: NATURE_PIECES[Math.floor(r() * 3)] };
  },
  sensible(s, r) {
    const options = [];
    const pieces = s.step === 'visitor' ? [s.visitors[s.turn - 1].piece] : NATURE_PIECES;
    for (const [row, col] of legalTargets(s)) {
      for (const piece of pieces) {
        // Visitor pieces: also count what nature already nearby could give them.
        const after = withPiece(s, row, col, piece);
        options.push({ row, col, piece, score: goodness(after) + r() * 0.01 });
      }
    }
    options.sort((a, b) => b.score - a.score);
    const best = options[0];
    return s.step === 'visitor' ? { row: best.row, col: best.col } : best;
  },
  // A child who follows the wish bubbles about half the time.
  half(s, r) {
    return r() < 0.5 ? BOTS.random(s, r) : BOTS.sensible(s, r);
  }
};

for (const [name, bot] of Object.entries(BOTS)) {
  const counts = { bee: 0, water: 0, cool: 0 };
  const byTotal = [0, 0, 0, 0];
  let muck = 0;
  for (let g = 0; g < games; g++) {
    let s = createGame({ seed: g + 1 });
    const r = botRandom(g + 1000);
    while (s.step !== 'over') s = takeTurn(s, bot(s, r)).state;
    let total = 0;
    for (const k of Object.keys(counts)) if (s.stars[k]) { counts[k]++; total++; }
    byTotal[total]++;
    muck += s.streamMuck;
  }
  const pct = (n) => `${Math.round((100 * n) / games)}%`;
  console.log(`${name.padEnd(9)} bee ${pct(counts.bee)}  water ${pct(counts.water)}  cool ${pct(counts.cool)}  ` +
    `| 0/1/2/3 stars: ${byTotal.map(pct).join(' / ')}  | mean stream muck ${(muck / games).toFixed(1)}`);
}
