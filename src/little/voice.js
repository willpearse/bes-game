// Spoken lines, using the browser's built-in speech (no library). British English where the device has it.
// Speech is best effort: some devices have no voices, and iPhones and iPads only speak after a tap.
import { prefs } from './prefs.js';

const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
let voice = null;

function pickVoice() {
  if (!synth) return;
  const voices = synth.getVoices();
  voice = voices.find((v) => v.lang === 'en-GB' && /female|serena|kate|libby|sonia|martha/i.test(v.name))
    ?? voices.find((v) => v.lang === 'en-GB')
    ?? voices.find((v) => v.lang?.startsWith('en'))
    ?? null;
}
if (synth) {
  pickVoice();
  synth.addEventListener?.('voiceschanged', pickVoice);
}

// Says a line. { interrupt: true } drops anything still queued first.
export function say(line, { interrupt = false } = {}) {
  if (!synth || !line || prefs.muted) return;
  try {
    if (interrupt) synth.cancel();
    const u = new SpeechSynthesisUtterance(line);
    if (voice) u.voice = voice;
    u.lang = voice?.lang ?? 'en-GB';
    u.rate = 0.92;
    u.pitch = 1.15;
    synth.speak(u);
  } catch {
    // Speech is optional; the pictures carry the game on their own.
  }
}

export function hush() {
  try { synth?.cancel(); } catch { /* nothing to stop */ }
}

// Waits until nothing is being said (or a time limit passes), so animations can wait for a line.
export function whenQuiet(maxMs = 4000) {
  return new Promise((resolve) => {
    const start = Date.now();
    const check = () => {
      if (!synth || prefs.muted || (!synth.speaking && !synth.pending) || Date.now() - start > maxMs) resolve();
      else setTimeout(check, 120);
    };
    setTimeout(check, 150);
  });
}
