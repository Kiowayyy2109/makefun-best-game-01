// Aurora Harvest — the game world: state machine, spawning, physics, scoring.
// Pure logic, no drawing and no audio: it emits events the shell turns into
// sound, and the renderer reads its fields. A seeded RNG makes a run
// reproducible from its seed (screenshots use ?seed=).

import {
  VIEW_W,
  VIEW_H,
  GROUND_Y,
  WIN_SCORE,
  START_LIVES,
  MAX_LIVES,
  PLAYER,
  FALL,
  SPAWN,
  SCORE,
  POWER,
  RUSH,
} from './config.js';
import { makeRng, range, weighted, chance } from './random.js';

export const STATES = ['title', 'playing', 'paused', 'won', 'over'];

export function createWorld(seed) {
  const rng = makeRng(seed);
  const stars = [];
  for (let i = 0; i < 130; i++) {
    stars.push({
      x: rng() * VIEW_W,
      y: rng() * 420,
      r: range(rng, 0.6, 2.1),
      phase: rng() * Math.PI * 2,
      speed: range(rng, 0.4, 1.4),
    });
  }
  // Two mountain ridges, pre-rolled once so the skyline never changes.
  const ridges = [0.62, 0.8].map((base, layer) => {
    const pts = [];
    const step = 64;
    let y = base;
    for (let x = -step; x <= VIEW_W + step; x += step) {
      y += range(rng, -26, 26);
      y = Math.max(0.52, Math.min(0.88, y));
      pts.push({ x, y: y * VIEW_H });
    }
    return { pts, layer };
  });
  return {
    rng,
    seed,
    state: 'title',
    time: 0,
    stars,
    ridges,
    player: { x: VIEW_W / 2, vx: 0, tilt: 0, bob: 0 },
    drops: [],
    particles: [],
    popups: [],
    events: [],
    score: 0,
    bestCombo: 0,
    combo: 0,
    catches: 0,
    lives: START_LIVES,
    level: 1,
    spawnTimer: 0.6,
    magnetT: 0,
    slowT: 0,
    shield: false,
    rushT: 0,
    rushAnnounced: false,
    banner: null,
    bannerT: 0,
    shake: 0,
    flash: 0,
    best: 0,
  };
}

export function comboMult(world) {
  return Math.min(SCORE.comboCap, 1 + Math.floor(world.combo / SCORE.comboStep));
}

function spawnInterval(world) {
  let iv = SPAWN.baseInterval * Math.pow(SPAWN.perLevel, world.level - 1);
  iv = Math.max(SPAWN.minInterval, iv);
  if (world.rushT > 0) iv *= RUSH.intervalFactor;
  return iv;
}

function spawnDrop(world, kind = null, x = null, y = null) {
  const rng = world.rng;
  const type =
    kind ??
    weighted(rng, [
      [SPAWN.shard, 'shard'],
      [SPAWN.pearl, 'pearl'],
      [SPAWN.voidOrb, 'void'],
      [SPAWN.heart, 'heart'],
      [SPAWN.power, 'power'],
    ]);
  const powerKind = type === 'power' ? (chance(rng, 0.4) ? 'magnet' : chance(rng, 0.5) ? 'shield' : 'slow') : null;
  const speed = (FALL.baseSpeed + FALL.speedPerLevel * (world.level - 1)) * range(rng, 0.85, 1.25);
  world.drops.push({
    type,
    powerKind,
    x: x ?? range(rng, 30, VIEW_W - 30),
    y: y ?? -30,
    vy: speed,
    sway: range(rng, 0, Math.PI * 2),
    swayAmp: range(rng, 8, FALL.swayAmp),
    rot: range(rng, 0, Math.PI * 2),
    rotSpeed: range(rng, -1.6, 1.6),
    size: type === 'pearl' ? 15 : type === 'void' ? 17 : 14,
    caught: false,
  });
}

function burst(world, x, y, color, n, speed = 180) {
  for (let i = 0; i < n; i++) {
    const a = world.rng() * Math.PI * 2;
    const v = range(world.rng, speed * 0.3, speed);
    world.particles.push({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v - 40,
      life: range(world.rng, 0.4, 0.9),
      maxLife: 0.9,
      size: range(world.rng, 2, 5),
      color,
    });
  }
}

function popup(world, x, y, text, color) {
  world.popups.push({ x, y, text, color, life: 1.1, maxLife: 1.1 });
}

function showBanner(world, text, sub = '') {
  world.banner = { text, sub };
  world.bannerT = 2.2;
}

function loseLife(world, x, y) {
  if (world.shield) {
    world.shield = false;
    world.events.push({ type: 'shield' });
    popup(world, x, y - 20, 'SHIELD!', '#8be9ff');
    burst(world, x, y, '#8be9ff', 14, 150);
    return;
  }
  world.lives -= 1;
  world.combo = 0;
  world.shake = 14;
  world.flash = 0.55;
  world.events.push({ type: 'void' });
  burst(world, x, y, '#8a4dff', 22, 240);
  popup(world, x, y - 20, '-1 LIFE', '#ff5d7a');
  if (world.lives <= 0) {
    world.state = 'over';
    world.events.push({ type: 'over' });
  }
}

function catchDrop(world, d) {
  const mult = comboMult(world);
  if (d.type === 'shard') {
    world.combo += 1;
    world.catches += 1;
    world.bestCombo = Math.max(world.bestCombo, world.combo);
    const gain = SCORE.shard * mult;
    world.score += gain;
    world.events.push({ type: 'catch', combo: world.combo });
    popup(world, d.x, d.y - 14, `+${gain}${mult > 1 ? '  x' + mult : ''}`, '#ffd94d');
    burst(world, d.x, d.y, '#ffd94d', 10, 160);
  } else if (d.type === 'pearl') {
    world.combo += 1;
    world.catches += 1;
    world.bestCombo = Math.max(world.bestCombo, world.combo);
    const gain = SCORE.pearl * mult;
    world.score += gain;
    world.events.push({ type: 'pearl' });
    popup(world, d.x, d.y - 14, `+${gain}  PEARL`, '#7fe7ff');
    burst(world, d.x, d.y, '#7fe7ff', 14, 190);
  } else if (d.type === 'heart') {
    world.lives = Math.min(MAX_LIVES, world.lives + 1);
    world.events.push({ type: 'power' });
    popup(world, d.x, d.y - 14, '+1 LIFE', '#ff5d7a');
    burst(world, d.x, d.y, '#ff5d7a', 14, 170);
  } else if (d.type === 'power') {
    world.events.push({ type: 'power' });
    if (d.powerKind === 'magnet') {
      world.magnetT = POWER.magnetSeconds;
      popup(world, d.x, d.y - 14, 'MAGNET!', '#37f2c3');
      burst(world, d.x, d.y, '#37f2c3', 14, 170);
    } else if (d.powerKind === 'shield') {
      world.shield = true;
      popup(world, d.x, d.y - 14, 'SHIELD!', '#8be9ff');
      burst(world, d.x, d.y, '#8be9ff', 14, 170);
    } else {
      world.slowT = POWER.slowSeconds;
      popup(world, d.x, d.y - 14, 'SLOW TIME!', '#e58cff');
      burst(world, d.x, d.y, '#e58cff', 14, 170);
    }
  } else if (d.type === 'void') {
    loseLife(world, d.x, d.y);
    return;
  }
  const nextLevel = 1 + Math.floor(world.catches / SCORE.catchesPerLevel);
  if (nextLevel > world.level) {
    world.level = nextLevel;
    world.events.push({ type: 'level' });
    showBanner(world, `LEVEL ${world.level}`, world.level % RUSH.everyLevels === 0 ? 'ECLIPSE RUSH!' : 'The night deepens…');
    if (world.level % RUSH.everyLevels === 0) {
      world.rushT = RUSH.seconds;
      world.events.push({ type: 'rush' });
    }
  }
  if (world.score >= WIN_SCORE && world.state === 'playing') {
    world.state = 'won';
    world.events.push({ type: 'win' });
    burst(world, world.player.x, PLAYER.y - 40, '#ffd94d', 40, 320);
  }
}

export function startGame(world) {
  const seed = world.seed;
  const keep = { stars: world.stars, ridges: world.ridges, best: world.best };
  const fresh = createWorld(seed + 7919);
  Object.assign(world, fresh, keep);
  world.state = 'playing';
  world.best = keep.best;
  showBanner(world, 'CATCH THE LIGHT', 'Shards feed the aurora — dodge the void');
}

export function updateWorld(world, dt, input) {
  world.time += dt;
  if (world.bannerT > 0) world.bannerT -= dt;
  if (world.shake > 0) world.shake = Math.max(0, world.shake - dt * 30);
  if (world.flash > 0) world.flash = Math.max(0, world.flash - dt * 1.6);
  for (const p of world.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 260 * dt;
  }
  world.particles = world.particles.filter((p) => p.life > 0);
  for (const p of world.popups) {
    p.life -= dt;
    p.y -= 42 * dt;
  }
  world.popups = world.popups.filter((p) => p.life > 0);

  // Ambient drift behind the title screen: a few shards fall, nothing is scored.
  if (world.state === 'title') {
    world.spawnTimer -= dt;
    if (world.spawnTimer <= 0) {
      world.spawnTimer = 0.8;
      spawnDrop(world, world.rng() < 0.8 ? 'shard' : 'pearl');
    }
    stepDrops(world, dt, true);
    return;
  }
  if (world.state !== 'playing') {
    stepDrops(world, dt, true);
    return;
  }

  // Steering: pointer sets a target, keys accelerate.
  const p = world.player;
  if (input.mouseActive && input.mouseX !== null) {
    const target = Math.max(40, Math.min(VIEW_W - 40, input.mouseX));
    const dx = target - p.x;
    p.vx = Math.max(-PLAYER.maxSpeed, Math.min(PLAYER.maxSpeed, dx * 10));
    p.x += p.vx * dt;
  } else {
    let dir = 0;
    if (input.held('ArrowLeft', 'a')) dir -= 1;
    if (input.held('ArrowRight', 'd')) dir += 1;
    if (dir !== 0) p.vx += dir * PLAYER.accel * dt;
    else p.vx -= p.vx * Math.min(1, PLAYER.friction * dt);
    p.vx = Math.max(-PLAYER.maxSpeed, Math.min(PLAYER.maxSpeed, p.vx));
    p.x += p.vx * dt;
  }
  p.x = Math.max(36, Math.min(VIEW_W - 36, p.x));
  p.tilt = Math.max(-0.3, Math.min(0.3, p.vx / PLAYER.maxSpeed * 0.35));
  p.bob = Math.sin(world.time * 3.2) * 2;

  if (world.magnetT > 0) world.magnetT -= dt;
  if (world.slowT > 0) world.slowT -= dt;
  if (world.rushT > 0) world.rushT -= dt;

  world.spawnTimer -= dt;
  if (world.spawnTimer <= 0) {
    world.spawnTimer = spawnInterval(world);
    spawnDrop(world);
    if (world.rushT > 0 && chance(world.rng, 0.5)) spawnDrop(world, 'shard');
  }
  stepDrops(world, dt, false);
}

function stepDrops(world, dt, ambient) {
  const slow = world.slowT > 0 ? POWER.slowFactor : 1;
  const p = world.player;
  for (const d of world.drops) {
    d.sway += dt * FALL.swayFreq;
    d.rot += d.rotSpeed * dt;
    let vy = d.vy * slow;
    d.y += vy * dt;
    d.x += Math.sin(d.sway) * d.swayAmp * dt;
    if (world.magnetT > 0 && (d.type === 'shard' || d.type === 'pearl')) {
      const dx = p.x - d.x;
      d.x += Math.max(-POWER.magnetPull * dt, Math.min(POWER.magnetPull * dt, dx * 4 * dt));
    }
    if (ambient) continue;
    // Catch: inside the basket band under the keeper.
    if (
      world.state === 'playing' &&
      d.y > PLAYER.y - 52 &&
      d.y < PLAYER.y + 26 &&
      Math.abs(d.x - p.x) < PLAYER.catchHalfWidth
    ) {
      d.caught = true;
      catchDrop(world, d);
    }
  }
  // Missed shards break the combo; missed voids just fade away.
  const missed = world.drops.filter((d) => !d.caught && d.y > GROUND_Y + 10);
  for (const d of missed) {
    // A shard that lands far from the keeper just fades away: only a drop
    // the keeper let fall at their own feet breaks the combo.
    const nearMiss = Math.abs(d.x - world.player.x) < 260;
    if ((d.type === 'shard' || d.type === 'pearl') && world.state === 'playing' && world.combo > 0 && nearMiss) {
      world.combo = 0;
      popup(world, d.x, GROUND_Y - 24, 'COMBO LOST', '#9fb3c8');
    }
    burst(world, d.x, GROUND_Y, d.type === 'void' ? '#8a4dff' : '#5b7a99', 4, 80);
  }
  world.drops = world.drops.filter((d) => !d.caught && d.y <= GROUND_Y + 10);
}
