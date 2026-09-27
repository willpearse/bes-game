// Seeded RNG (mulberry32). The RNG state lives inside the game state as an integer,
// so games are fully deterministic and serialisable.

export function seedToInt(seed) {
  if (typeof seed === 'number' && Number.isFinite(seed)) return seed >>> 0;
  const s = String(seed);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Returns [value in 0..1, nextState].
export function mulberry32(a) {
  let t = (a + 0x6d2b79f5) >>> 0;
  const next = t;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next];
}

// Draws a random number using and advancing state.rng.
export function random(state) {
  const [value, next] = mulberry32(state.rng);
  state.rng = next;
  return value;
}

export function randomInt(state, n) {
  return Math.floor(random(state) * n);
}

// Fisher-Yates shuffle, returns a new array.
export function shuffle(state, array) {
  const a = array.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(state, i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Draws n items without replacement.
export function sample(state, array, n) {
  return shuffle(state, array).slice(0, n);
}

export function randomSeed() {
  return Math.floor(Math.random() * 1e9);
}
