// Tiny sound effects made with Web Audio (no files, no library).
import { prefs } from './prefs.js';

let ctx = null;

// Must be called from a tap, so browsers allow sound.
export function unlockAudio() {
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  } catch {
    ctx = null;
  }
}

function tone(freq, start, dur, { type = 'sine', vol = 0.18, slide = 0 } = {}) {
  const t = ctx.currentTime + start;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

const SOUNDS = {
  pop: () => { tone(520, 0, 0.12, { slide: 300 }); tone(880, 0.06, 0.1, { vol: 0.1 }); },
  pick: () => tone(660, 0, 0.12, { type: 'triangle', slide: 200 }),
  wobble: () => { tone(220, 0, 0.12, { type: 'triangle' }); tone(196, 0.12, 0.14, { type: 'triangle' }); },
  buzz: () => tone(180, 0, 0.5, { type: 'sawtooth', vol: 0.05, slide: 40 }),
  grow: () => { tone(660, 0, 0.1); tone(990, 0.08, 0.14); },
  splash: () => tone(300, 0, 0.3, { type: 'triangle', slide: -200, vol: 0.14 }),
  sparkle: () => { [1320, 1760, 2093].forEach((f, i) => tone(f, i * 0.06, 0.12, { vol: 0.06 })); },
  hot: () => tone(140, 0, 0.6, { type: 'triangle', vol: 0.12, slide: 80 }),
  cool: () => tone(990, 0, 0.25, { vol: 0.08, slide: -300 }),
  star: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.08, 0.2, { type: 'triangle', vol: 0.12 })); },
  fanfare: () => { [523, 523, 784, 659, 1047].forEach((f, i) => tone(f, i * 0.14, 0.24, { type: 'square', vol: 0.06 })); }
};

export function play(name) {
  if (!ctx || prefs.muted || !SOUNDS[name]) return;
  try { SOUNDS[name](); } catch { /* sound is optional */ }
}
