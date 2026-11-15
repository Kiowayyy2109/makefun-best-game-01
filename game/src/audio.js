// Aurora Harvest — synthesized WebAudio sound. No audio assets: every effect
// is an oscillator (or two) shaped by a gain envelope. The context is created
// lazily on the first user gesture, so the page never autoplays.

import { PENTA } from './config.js';

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return true;
    }
    const AC = window.AudioContext ?? window.webkitAudioContext;
    if (!AC) return false;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.32;
    this.master.connect(this.ctx.destination);
    return true;
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.32;
    return this.muted;
  }

  tone(freq, dur, type = 'sine', vol = 0.5, when = 0, slideTo = null) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  // A catch chime: the pitch climbs the pentatonic ladder with the combo.
  catch(combo) {
    const idx = Math.min(PENTA.length - 1, Math.floor(combo / 2));
    const f = PENTA[idx];
    this.tone(f, 0.28, 'sine', 0.5);
    this.tone(f * 2, 0.18, 'triangle', 0.16);
  }

  pearl() {
    this.tone(1318.5, 0.32, 'sine', 0.45);
    this.tone(1975.5, 0.4, 'sine', 0.22, 0.06);
  }

  voidHit() {
    this.tone(160, 0.35, 'sawtooth', 0.5, 0, 55);
    this.tone(90, 0.3, 'square', 0.28, 0, 45);
  }

  shieldBlock() {
    this.tone(440, 0.16, 'triangle', 0.4);
    this.tone(660, 0.22, 'triangle', 0.35, 0.07);
  }

  powerUp() {
    this.tone(880, 0.16, 'sine', 0.4);
    this.tone(1174.66, 0.16, 'sine', 0.4, 0.08);
    this.tone(1567.98, 0.3, 'sine', 0.4, 0.16);
  }

  levelUp() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.42, i * 0.09));
  }

  rush() {
    this.tone(392, 0.2, 'square', 0.22);
    this.tone(523.25, 0.2, 'square', 0.22, 0.1);
    this.tone(783.99, 0.34, 'square', 0.24, 0.2);
  }

  win() {
    [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((f, i) =>
      this.tone(f, 0.5, 'sine', 0.4, i * 0.11),
    );
    this.tone(261.63, 1.1, 'triangle', 0.3, 0.1);
  }

  gameOver() {
    [392, 349.23, 311.13, 261.63].forEach((f, i) => this.tone(f, 0.42, 'triangle', 0.38, i * 0.16));
  }

  click() {
    this.tone(700, 0.07, 'square', 0.18);
  }
}
