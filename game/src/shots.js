// Aurora Harvest — screenshot staging. The capture script loads the game with
// ?shot=<name>&seed=1; this module puts the world into a fixed, lively state
// for that shot and steps the simulation a little so particles, popups and
// falling drops are mid-flight when the frame is taken. Same seed, same shot:
// the same picture, every time.

import { VIEW_W, PLAYER } from './config.js';
import { comboMult } from './world.js';

function dropAt(world, type, x, y, powerKind = null) {
  const d = {
    type,
    powerKind,
    x,
    y,
    vy: 170 + ((x * 7) % 60),
    sway: (x % 10) * 0.6,
    swayAmp: 18,
    rot: (x % 6) * 0.8,
    rotSpeed: 0.8,
    size: type === 'pearl' ? 15 : type === 'void' ? 17 : 14,
    caught: false,
  };
  world.drops.push(d);
  return d;
}

function settle(world, steps = 24) {
  // Advance the world without input so the scene is alive, not posed.
  const idle = { held: () => false, mouseActive: false, mouseX: null };
  for (let i = 0; i < steps; i++) {
    world.time += 1 / 60;
    for (const d of world.drops) {
      d.y += d.vy * (1 / 60);
      d.sway += (1 / 60) * 1.7;
    }
  }
}

export function applyShot(world, name) {
  if (name === 'start') {
    // Title screen over a living sky: a few shards already falling.
    world.state = 'title';
    dropAt(world, 'shard', 300, 180);
    dropAt(world, 'shard', 640, 90);
    dropAt(world, 'pearl', 900, 220);
    dropAt(world, 'shard', 1080, 140);
    dropAt(world, 'shard', 180, 320);
    settle(world, 12);
    return true;
  }
  if (name === 'play') {
    // Mid-game: level 3, a ×4 combo running, magnet active, a rich sky.
    world.state = 'playing';
    world.score = 340;
    world.combo = 12;
    world.bestCombo = 12;
    world.catches = 44;
    world.level = 3;
    world.lives = 3;
    world.magnetT = 5.2;
    world.player.x = 620;
    world.banner = { text: 'LEVEL 3', sub: 'The night deepens…' };
    world.bannerT = 1.6;
    const xs = [180, 300, 430, 520, 640, 760, 880, 990, 1120, 240, 700, 1060];
    const ys = [90, 180, 130, 260, 70, 210, 150, 300, 110, 330, 350, 240];
    xs.forEach((x, i) => dropAt(world, i % 5 === 4 ? 'pearl' : 'shard', x, ys[i]));
    dropAt(world, 'void', 380, 200);
    dropAt(world, 'void', 940, 280);
    dropAt(world, 'power', 820, 120, 'shield');
    settle(world, 20);
    return true;
  }
  if (name === 'rush') {
    // Eclipse rush at level 5: a dense shower, slow-time on, one life lost.
    world.state = 'playing';
    world.score = 720;
    world.combo = 20;
    world.bestCombo = 24;
    world.catches = 96;
    world.level = 5;
    world.lives = 2;
    world.slowT = 4.1;
    world.rushT = 3.8;
    world.player.x = 480;
    world.banner = { text: 'ECLIPSE RUSH!', sub: 'Catch everything — the sky is falling' };
    world.bannerT = 1.4;
    for (let i = 0; i < 22; i++) {
      const x = 60 + ((i * 173) % 1160);
      const y = 40 + ((i * 97) % 340);
      dropAt(world, i % 7 === 6 ? 'void' : i % 6 === 5 ? 'pearl' : 'shard', x, y);
    }
    dropAt(world, 'power', 640, 160, 'magnet');
    dropAt(world, 'heart', 1050, 90);
    settle(world, 18);
    return true;
  }
  if (name === 'end') {
    // Game over: the results screen with the final score and restart prompt.
    world.state = 'over';
    world.score = 860;
    world.combo = 0;
    world.bestCombo = 24;
    world.catches = 88;
    world.level = 6;
    world.lives = 0;
    world.player.x = 700;
    dropAt(world, 'shard', 300, 200);
    dropAt(world, 'shard', 900, 140);
    dropAt(world, 'void', 640, 260);
    settle(world, 10);
    return true;
  }
  return false;
}

// Keep the combo multiplier honest in the win overlay even for a staged world.
export function stagedMult(world) {
  return comboMult(world);
}

export { PLAYER, VIEW_W };
