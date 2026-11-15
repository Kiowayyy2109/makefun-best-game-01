// Aurora Harvest — bootstrap and game loop. Fixed 60 Hz simulation steps,
// rendering on requestAnimationFrame, input edges consumed once per frame,
// audio events drained from the world. URL parameters:
//   ?shot=start|play|rush|end&seed=N  — staged screenshot mode (deterministic)
//   ?seed=N                           — a seeded live run (default: random)

import { VIEW_W, VIEW_H } from './config.js';
import { createWorld, updateWorld, startGame } from './world.js';
import { render } from './render.js';
import { Input } from './input.js';
import { AudioEngine } from './audio.js';
import { applyShot } from './shots.js';

const params = new URLSearchParams(location.search);
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isFinite(seedParam)
  ? seedParam
  : (crypto.getRandomValues(new Uint32Array(1))[0] >>> 0);
const shotName = params.get('shot');

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');
const input = new Input(canvas);
const audio = new AudioEngine();
const world = createWorld(seed);

// Best score survives in localStorage across runs in the same browser.
try {
  world.best = Number(localStorage.getItem('aurora-harvest-best') ?? 0) || 0;
} catch {
  world.best = 0;
}

function fitCanvas() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(VIEW_W * dpr);
  canvas.height = Math.round(VIEW_H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
fitCanvas();
window.addEventListener('resize', fitCanvas);

let shotReady = false;
if (shotName) {
  const ok = applyShot(world, shotName);
  if (ok) {
    // Let the staged scene render a few frames, then signal the capture.
    setTimeout(() => {
      window.__shotReady = true;
      shotReady = true;
    }, 450);
  }
}

function describeState() {
  if (world.state === 'title') return 'Aurora Harvest. Press Enter to play.';
  if (world.state === 'playing')
    return `Playing. Score ${world.score}, level ${world.level}, ${world.lives} lives.`;
  if (world.state === 'paused') return 'Paused.';
  if (world.state === 'won') return `You won with ${world.score} points. Press R to play again.`;
  return `Game over. Score ${world.score}. Press R to try again.`;
}

function drainEvents() {
  for (const ev of world.events) {
    if (ev.type === 'catch') audio.catch(ev.combo);
    else if (ev.type === 'pearl') audio.pearl();
    else if (ev.type === 'void') audio.voidHit();
    else if (ev.type === 'shield') audio.shieldBlock();
    else if (ev.type === 'power') audio.powerUp();
    else if (ev.type === 'level') audio.levelUp();
    else if (ev.type === 'rush') audio.rush();
    else if (ev.type === 'win') audio.win();
    else if (ev.type === 'over') audio.gameOver();
  }
  world.events.length = 0;
}

function handleKeys() {
  if (input.wasPressed('m', 'M')) {
    const muted = audio.toggleMute();
    status.textContent = muted ? 'Sound off.' : 'Sound on.';
  }
  if (world.state === 'title') {
    if (input.wasPressed('Enter', ' ') || input.consumeClick()) {
      audio.ensure();
      audio.click();
      startGame(world);
      status.textContent = describeState();
    }
    return;
  }
  if (world.state === 'playing') {
    if (input.wasPressed('p', 'P', 'Escape')) {
      world.state = 'paused';
      status.textContent = describeState();
    }
    return;
  }
  if (world.state === 'paused') {
    if (input.wasPressed('p', 'P', 'Escape') || input.consumeClick()) {
      world.state = 'playing';
      status.textContent = describeState();
    } else if (input.wasPressed('r', 'R')) {
      startGame(world);
      status.textContent = describeState();
    }
    return;
  }
  // won / over: R or a click restarts.
  if (input.wasPressed('r', 'R', 'Enter', ' ') || input.consumeClick()) {
    audio.ensure();
    audio.click();
    startGame(world);
    status.textContent = describeState();
  }
}

const STEP = 1 / 60;
let acc = 0;
let last = performance.now();
let announced = '';

function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  handleKeys();
  if (world.state === 'playing' || world.state === 'title') {
    acc += dt;
    while (acc >= STEP) {
      updateWorld(world, STEP, input);
      acc -= STEP;
    }
  } else if (world.state === 'won' || world.state === 'over') {
    // Keep the sky alive behind the results overlay.
    updateWorld(world, dt, input);
  }
  drainEvents();
  render(ctx, world);
  const text = describeState();
  if (text !== announced) {
    announced = text;
    status.textContent = text;
  }
  if (world.score > world.best) {
    world.best = world.score;
    try {
      localStorage.setItem('aurora-harvest-best', String(world.best));
    } catch {
      /* storage unavailable; best score is session-only */
    }
  }
  input.endFrame();
  requestAnimationFrame(frame);
}

status.textContent = describeState();
requestAnimationFrame(frame);
