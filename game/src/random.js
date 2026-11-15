// Aurora Harvest — small deterministic RNG (mulberry32) plus helpers.
// The game takes a seed from the URL (?seed=) for screenshots; live play uses
// a seed drawn from crypto randomness, so every run is its own night.

export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function range(rng, lo, hi) {
  return lo + rng() * (hi - lo);
}

export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

export function chance(rng, p) {
  return rng() < p;
}

// Weighted pick: entries are [weight, value]; returns a value.
export function weighted(rng, entries) {
  let total = 0;
  for (const [w] of entries) total += w;
  let roll = rng() * total;
  for (const [w, v] of entries) {
    roll -= w;
    if (roll <= 0) return v;
  }
  return entries[entries.length - 1][1];
}
