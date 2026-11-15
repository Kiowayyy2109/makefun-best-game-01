// Aurora Harvest — tuning constants. One place for every number the game
// balances on, so a play-test can retune without touching the logic.

export const VIEW_W = 1280;
export const VIEW_H = 720;
export const GROUND_Y = 648;

export const WIN_SCORE = 1000;
export const START_LIVES = 3;
export const MAX_LIVES = 5;

export const PLAYER = {
  y: GROUND_Y - 34,
  radius: 30,
  catchHalfWidth: 72,
  accel: 3400,
  maxSpeed: 560,
  friction: 6.5,
};

export const FALL = {
  baseSpeed: 140,
  speedPerLevel: 20,
  swayAmp: 26,
  swayFreq: 1.7,
};

export const SPAWN = {
  // Seconds between spawns at level 1; shrinks 6% per level, floor 0.34 s.
  baseInterval: 0.95,
  perLevel: 0.94,
  minInterval: 0.34,
  // Spawn weights (out of 100).
  shard: 60,
  pearl: 13,
  voidOrb: 18,
  heart: 3,
  power: 6,
};

export const SCORE = {
  shard: 10,
  pearl: 25,
  // Combo multiplier: 1 + floor(combo / 4), capped at 8.
  comboStep: 4,
  comboCap: 8,
  catchesPerLevel: 20,
};

export const POWER = {
  magnetSeconds: 8,
  slowSeconds: 6,
  slowFactor: 0.55,
  magnetPull: 420,
};

export const RUSH = {
  everyLevels: 5,
  seconds: 6,
  intervalFactor: 0.35,
};

// Pentatonic ladder for catch chimes; the note climbs with the combo.
export const PENTA = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51];

export const COLORS = {
  skyTop: '#0a0e2a',
  skyMid: '#14264f',
  skyLow: '#0f4a5c',
  auroraA: '#37f2c3',
  auroraB: '#7b8cff',
  auroraC: '#e58cff',
  moon: '#ffeec4',
  shard: '#ffd94d',
  pearl: '#7fe7ff',
  voidOrb: '#8a4dff',
  heart: '#ff5d7a',
  ground: '#0a1a24',
  groundGlow: '#2dd4bf',
};
