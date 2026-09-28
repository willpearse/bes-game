// Variant settings from the URL, high scores and first-play hints (localStorage).
import { CONFIG } from '../data/config.js';
import { MAPS } from '../data/maps/index.js';

const store = {
  get(key, fallback) {
    try {
      const v = window.localStorage.getItem(key);
      return v == null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage may be unavailable (private mode); the game still works.
    }
  }
};

// ?map=millValley&market=menu&waste=simple&happiness=endGame&seed=42
export function configFromUrl(search = window.location.search) {
  const q = new URLSearchParams(search);
  const cfg = {};
  if (q.has('market')) cfg.marketMode = q.get('market') === 'menu' ? 'menu' : 'market';
  if (q.has('waste')) cfg.wasteMode = q.get('waste') === 'simple' ? 'simple' : 'tokens';
  if (q.has('happiness')) cfg.happinessMode = q.get('happiness') === 'endGame' ? 'endGame' : 'perTurn';
  if (q.has('map') && MAPS[q.get('map')]) cfg.mapId = q.get('map');
  if (q.has('seed')) {
    const s = q.get('seed');
    cfg.seed = /^\d+$/.test(s) ? Number(s) : s;
  }
  return cfg;
}

export function variantKey(cfg) {
  const c = { ...CONFIG, ...cfg };
  return [c.mapId, c.marketMode, c.wasteMode, c.happinessMode].join('-');
}

export function variantLabel(cfg) {
  const c = { ...CONFIG, ...cfg };
  return [
    MAPS[c.mapId]?.name ?? c.mapId,
    c.marketMode === 'market' ? 'Market' : 'Menu',
    c.wasteMode === 'tokens' ? 'Flowing waste' : 'Simple waste',
    c.happinessMode === 'perTurn' ? 'Happiness each turn' : 'Happiness at end'
  ].join(' · ');
}

export function highScores(cfg) {
  return store.get(`gp_scores_${variantKey(cfg)}`, []);
}

// Adds a score; returns the new list and the rank (0-based) or -1 if it did not place.
export function addHighScore(cfg, entry) {
  const list = highScores(cfg).concat([entry]).sort((a, b) => b.score - a.score).slice(0, 10);
  store.set(`gp_scores_${variantKey(cfg)}`, list);
  return { list, rank: list.indexOf(list.find((e) => e === entry || (e.score === entry.score && e.date === entry.date))) };
}

export function hintsSeen() {
  return store.get('gp_hints_seen', []);
}

export function markHintSeen(id) {
  const seen = hintsSeen();
  if (!seen.includes(id)) store.set('gp_hints_seen', seen.concat([id]));
}

export function isFirstGame() {
  return !store.get('gp_played', false);
}

export function markPlayed() {
  store.set('gp_played', true);
}

export function savedSettings() {
  return store.get('gp_settings', {});
}

export function saveSettings(cfg) {
  store.set('gp_settings', cfg);
}

// "Nature at work" delivery animations (on by default).
export function natureAnimations() {
  return store.get('gp_nature_anim', true) !== false;
}

export function setNatureAnimations(on) {
  store.set('gp_nature_anim', !!on);
}
