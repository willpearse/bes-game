// The grown-up's mute switch, remembered on this device when storage is allowed.
const KEY = 'littleGreen.muted';

function load() {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
}

export const prefs = { muted: load() };

export function setMuted(on) {
  prefs.muted = on;
  try { localStorage.setItem(KEY, on ? '1' : '0'); } catch { /* storage blocked: still muted for now */ }
}
