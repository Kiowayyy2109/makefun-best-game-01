// Aurora Harvest — every pixel the player sees, drawn on one 2D canvas.
// Sky, aurora, stars, mountains, ground, drops, the keeper, particles, HUD
// and the title / pause / win / game-over overlays. No images, no fonts from
// the network: shapes, gradients and the system font stack only.

import { VIEW_W, VIEW_H, GROUND_Y, WIN_SCORE, PLAYER, COLORS } from './config.js';
import { comboMult } from './world.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function star4(ctx, x, y, r, rot) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = rot + (i * Math.PI) / 4;
    const rr = i % 2 === 0 ? r : r * 0.38;
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawSky(ctx, world) {
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, COLORS.skyTop);
  g.addColorStop(0.55, COLORS.skyMid);
  g.addColorStop(1, COLORS.skyLow);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // Moon, top right, with a soft halo.
  const mg = ctx.createRadialGradient(1120, 96, 8, 1120, 96, 130);
  mg.addColorStop(0, 'rgba(255,238,196,0.9)');
  mg.addColorStop(0.25, 'rgba(255,238,196,0.28)');
  mg.addColorStop(1, 'rgba(255,238,196,0)');
  ctx.fillStyle = mg;
  ctx.fillRect(960, -40, 320, 280);
  ctx.fillStyle = COLORS.moon;
  ctx.beginPath();
  ctx.arc(1120, 96, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(214,186,120,0.55)';
  ctx.beginPath();
  ctx.arc(1108, 88, 7, 0, Math.PI * 2);
  ctx.arc(1130, 106, 5, 0, Math.PI * 2);
  ctx.fill();

  // Twinkling stars.
  for (const s of world.stars) {
    const tw = 0.45 + 0.55 * Math.abs(Math.sin(world.time * s.speed + s.phase));
    ctx.globalAlpha = tw;
    ctx.fillStyle = '#dfe9ff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Aurora ribbons: three sine bands, additive glow, slow drift.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const bands = [
    { color: COLORS.auroraA, amp: 42, base: 150, speed: 0.24, width: 90, alpha: 0.5 },
    { color: COLORS.auroraB, amp: 56, base: 210, speed: 0.17, width: 120, alpha: 0.38 },
    { color: COLORS.auroraC, amp: 34, base: 110, speed: 0.31, width: 70, alpha: 0.3 },
  ];
  for (const b of bands) {
    const grad = ctx.createLinearGradient(0, b.base - b.amp, 0, b.base + b.amp + b.width);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.5, b.color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = b.alpha * (0.75 + 0.25 * Math.sin(world.time * 0.5 + b.base));
    ctx.strokeStyle = grad;
    ctx.lineWidth = b.width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let x = -20; x <= VIEW_W + 20; x += 16) {
      const y =
        b.base +
        Math.sin(x * 0.006 + world.time * b.speed) * b.amp +
        Math.sin(x * 0.013 - world.time * b.speed * 1.6) * b.amp * 0.4;
      if (x === -20) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
  ctx.globalAlpha = 1;

  // Mountain ridges, far then near.
  const ridgeColors = ['rgba(16,28,58,0.85)', 'rgba(9,18,40,0.95)'];
  world.ridges.forEach((ridge, i) => {
    ctx.fillStyle = ridgeColors[i];
    ctx.beginPath();
    ctx.moveTo(-20, VIEW_H);
    for (const pt of ridge.pts) ctx.lineTo(pt.x, pt.y + (i === 0 ? 60 : 30));
    ctx.lineTo(VIEW_W + 20, VIEW_H);
    ctx.closePath();
    ctx.fill();
  });

  // Ground: a dark hill band with a glowing aurora edge.
  const gg = ctx.createLinearGradient(0, GROUND_Y, 0, VIEW_H);
  gg.addColorStop(0, '#0d2733');
  gg.addColorStop(1, COLORS.ground);
  ctx.fillStyle = gg;
  ctx.fillRect(0, GROUND_Y, VIEW_W, VIEW_H - GROUND_Y);
  ctx.strokeStyle = COLORS.groundGlow;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = 3;
  ctx.shadowColor = COLORS.groundGlow;
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  ctx.lineTo(VIEW_W, GROUND_Y);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

function drawDrop(ctx, d, t) {
  ctx.save();
  ctx.translate(d.x, d.y);
  if (d.type === 'shard') {
    ctx.rotate(d.rot * 0.4);
    ctx.shadowColor = COLORS.shard;
    ctx.shadowBlur = 16;
    ctx.fillStyle = COLORS.shard;
    star4(ctx, 0, 0, d.size + 3, 0);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff7d6';
    star4(ctx, 0, 0, d.size * 0.45, 0);
    ctx.fill();
  } else if (d.type === 'pearl') {
    ctx.shadowColor = COLORS.pearl;
    ctx.shadowBlur = 18;
    const g = ctx.createRadialGradient(-4, -5, 2, 0, 0, d.size + 4);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.55, COLORS.pearl);
    g.addColorStop(1, '#1d7ea8');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, d.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, d.size + 5, t * 1.2, t * 1.2 + Math.PI * 1.4);
    ctx.stroke();
  } else if (d.type === 'void') {
    const wob = 1 + 0.12 * Math.sin(t * 6 + d.sway);
    ctx.scale(wob, 1 / wob);
    ctx.shadowColor = COLORS.voidOrb;
    ctx.shadowBlur = 18;
    const g = ctx.createRadialGradient(-5, -6, 2, 0, 0, d.size + 4);
    g.addColorStop(0, '#c9a7ff');
    g.addColorStop(0.5, COLORS.voidOrb);
    g.addColorStop(1, '#1c0b33');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, d.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#2a1150';
    ctx.beginPath();
    ctx.arc(-4, -2, 3.4, 0, Math.PI * 2);
    ctx.arc(5, 3, 2.6, 0, Math.PI * 2);
    ctx.fill();
  } else if (d.type === 'heart') {
    ctx.shadowColor = COLORS.heart;
    ctx.shadowBlur = 16;
    ctx.fillStyle = COLORS.heart;
    const s = d.size / 14;
    ctx.scale(s, s);
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.bezierCurveTo(-14, -2, -10, -14, 0, -6);
    ctx.bezierCurveTo(10, -14, 14, -2, 0, 10);
    ctx.fill();
    ctx.shadowBlur = 0;
  } else if (d.type === 'power') {
    const colors = { magnet: '#37f2c3', shield: '#8be9ff', slow: '#e58cff' };
    const c = colors[d.powerKind] ?? '#ffffff';
    ctx.shadowColor = c;
    ctx.shadowBlur = 16;
    ctx.fillStyle = 'rgba(10,20,40,0.85)';
    ctx.strokeStyle = c;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 19, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = c;
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const glyph = d.powerKind === 'magnet' ? 'U' : d.powerKind === 'shield' ? '⬡' : '◷';
    ctx.fillText(glyph, 0, 1);
  }
  ctx.restore();
}

function drawPlayer(ctx, world) {
  const p = world.player;
  const x = p.x;
  const y = PLAYER.y + p.bob;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(p.tilt);

  // Warm light pool on the ground.
  const pool = ctx.createRadialGradient(0, 52, 4, 0, 52, 92);
  pool.addColorStop(0, 'rgba(255,214,120,0.35)');
  pool.addColorStop(1, 'rgba(255,214,120,0)');
  ctx.fillStyle = pool;
  ctx.beginPath();
  ctx.ellipse(0, 52, 92, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  // The woven catch basket, held high.
  ctx.strokeStyle = '#c98f4e';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(0, -26, 30, Math.PI * 1.08, Math.PI * 1.92);
  ctx.stroke();
  ctx.strokeStyle = '#8a5a2b';
  ctx.lineWidth = 2;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 11, -54);
    ctx.lineTo(i * 11, -30);
    ctx.stroke();
  }

  // Shield ring when protected.
  if (world.shield) {
    ctx.strokeStyle = 'rgba(139,233,255,0.85)';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#8be9ff';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(0, 0, 44, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // The keeper: a little lantern spirit, teal glow, warm face.
  const flick = 0.9 + 0.1 * Math.sin(world.time * 7 + p.x * 0.05);
  ctx.shadowColor = '#37f2c3';
  ctx.shadowBlur = 26 * flick;
  const body = ctx.createRadialGradient(-8, -10, 4, 0, 0, 32);
  body.addColorStop(0, '#c8fff2');
  body.addColorStop(0.5, '#37f2c3');
  body.addColorStop(1, '#0f7a6a');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(0, 0, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  // Face.
  ctx.fillStyle = '#06281f';
  ctx.beginPath();
  ctx.arc(-9, -3, 3.4, 0, Math.PI * 2);
  ctx.arc(9, -3, 3.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#06281f';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 4, 7, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  // Little lantern hanging at its side.
  ctx.fillStyle = '#ffd94d';
  ctx.shadowColor = '#ffd94d';
  ctx.shadowBlur = 12;
  roundRect(ctx, 22, 12, 12, 16, 4);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#8a5a2b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(28, 12);
  ctx.lineTo(24, 2);
  ctx.stroke();
  ctx.restore();
}

function drawParticles(ctx, world) {
  for (const p of world.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawPopups(ctx, world) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const p of world.popups) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillStyle = p.color;
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 6;
    ctx.fillText(p.text, p.x, p.y);
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

function drawHud(ctx, world) {
  ctx.textBaseline = 'alphabetic';
  // Score, top left.
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(6,12,28,0.55)';
  roundRect(ctx, 18, 14, 250, 64, 12);
  ctx.fill();
  ctx.fillStyle = '#9fb3c8';
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.fillText('SCORE', 34, 36);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.fillText(String(world.score), 34, 66);
  // Combo meter under the score.
  const mult = comboMult(world);
  if (world.combo > 1) {
    ctx.fillStyle = mult >= 4 ? '#ffd94d' : '#7fe7ff';
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillText(`COMBO ${world.combo}  ×${mult}`, 34, 96);
  }
  // Progress to the win, top centre.
  const pw = 380;
  const px = (VIEW_W - pw) / 2;
  ctx.fillStyle = 'rgba(6,12,28,0.55)';
  roundRect(ctx, px - 10, 14, pw + 20, 44, 12);
  ctx.fill();
  ctx.fillStyle = '#9fb3c8';
  ctx.font = '600 12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`AURORA  ${Math.min(WIN_SCORE, world.score)} / ${WIN_SCORE}`, VIEW_W / 2, 32);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  roundRect(ctx, px, 38, pw, 10, 5);
  ctx.fill();
  const frac = Math.min(1, world.score / WIN_SCORE);
  const pg = ctx.createLinearGradient(px, 0, px + pw, 0);
  pg.addColorStop(0, '#37f2c3');
  pg.addColorStop(1, '#ffd94d');
  ctx.fillStyle = pg;
  if (frac > 0) {
    roundRect(ctx, px, 38, Math.max(10, pw * frac), 10, 5);
    ctx.fill();
  }
  // Lives + level, top right.
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(6,12,28,0.55)';
  roundRect(ctx, VIEW_W - 268, 14, 250, 64, 12);
  ctx.fill();
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.fillStyle = '#9fb3c8';
  ctx.fillText(`LEVEL ${world.level}`, VIEW_W - 34, 36);
  let hx = VIEW_W - 34;
  for (let i = 0; i < world.lives; i++) {
    ctx.fillStyle = '#ff5d7a';
    ctx.beginPath();
    ctx.moveTo(hx, 66);
    ctx.bezierCurveTo(hx - 11, 56, hx - 8, 48, hx, 54);
    ctx.bezierCurveTo(hx + 8, 48, hx + 11, 56, hx, 66);
    ctx.fill();
    hx -= 26;
  }
  // Active power-ups.
  ctx.textAlign = 'left';
  let chipY = 116;
  if (world.magnetT > 0) {
    ctx.fillStyle = 'rgba(55,242,195,0.9)';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText(`◉ MAGNET ${Math.ceil(world.magnetT)}s`, 34, chipY);
    chipY += 24;
  }
  if (world.slowT > 0) {
    ctx.fillStyle = 'rgba(229,140,255,0.9)';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText(`◷ SLOW ${Math.ceil(world.slowT)}s`, 34, chipY);
    chipY += 24;
  }
  if (world.shield) {
    ctx.fillStyle = 'rgba(139,233,255,0.9)';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText('⬡ SHIELD', 34, chipY);
  }
  if (world.rushT > 0) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff9d5c';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText(`☄ ECLIPSE RUSH — ${Math.ceil(world.rushT)}s`, VIEW_W / 2, 84);
  }
  // Banner (level ups).
  if (world.banner && world.bannerT > 0) {
    ctx.globalAlpha = Math.min(1, world.bannerT);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px system-ui, sans-serif';
    ctx.shadowColor = 'rgba(55,242,195,0.8)';
    ctx.shadowBlur = 24;
    ctx.fillText(world.banner.text, VIEW_W / 2, 250);
    ctx.shadowBlur = 0;
    if (world.banner.sub) {
      ctx.fillStyle = '#cfe8ff';
      ctx.font = '600 19px system-ui, sans-serif';
      ctx.fillText(world.banner.sub, VIEW_W / 2, 284);
    }
    ctx.globalAlpha = 1;
  }
  // Controls hint, bottom right.
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(207,232,255,0.6)';
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.fillText('← → / mouse move · P pause · M sound', VIEW_W - 20, VIEW_H - 14);
}

function overlay(ctx, title, lines, accent, button) {
  ctx.fillStyle = 'rgba(4,8,22,0.62)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.shadowColor = accent;
  ctx.shadowBlur = 30;
  ctx.fillText(title, VIEW_W / 2, 252);
  ctx.shadowBlur = 0;
  let y = 306;
  ctx.fillStyle = '#e8f2ff';
  ctx.font = '600 21px system-ui, sans-serif';
  for (const line of lines) {
    ctx.fillText(line, VIEW_W / 2, y);
    y += 34;
  }
  if (button) {
    ctx.font = 'bold 20px system-ui, sans-serif';
    const bw = Math.min(VIEW_W - 80, ctx.measureText(button).width + 56);
    ctx.fillStyle = accent;
    roundRect(ctx, VIEW_W / 2 - bw / 2, y + 22, bw, 56, 14);
    ctx.fill();
    ctx.fillStyle = '#081120';
    ctx.fillText(button, VIEW_W / 2, y + 59);
  }
}

export function render(ctx, world) {
  ctx.save();
  if (world.shake > 0) {
    ctx.translate((Math.random() - 0.5) * world.shake, (Math.random() - 0.5) * world.shake);
  }
  drawSky(ctx, world);
  for (const d of world.drops) drawDrop(ctx, d, world.time);
  drawPlayer(ctx, world);
  drawParticles(ctx, world);
  drawPopups(ctx, world);
  if (world.state !== 'title') drawHud(ctx, world);
  if (world.state === 'title') {
    overlay(
      ctx,
      'AURORA HARVEST',
      [
        'You are the keeper of the last lantern. Catch the falling star-shards,',
        'gather moon pearls, and dodge the void orbs that drink the light.',
        'Reach 1,000 points before your 3 lives run out to restore the aurora.',
        '',
        'Move:  ← →  or  A / D  or  mouse      Catch: walk under a falling shard',
        'Pearls are worth 25 · combos multiply your score · hearts heal · U magnet, ⬡ shield, ◷ slow',
      ],
      '#37f2c3',
      '▶  PRESS ENTER OR CLICK TO PLAY',
    );
  } else if (world.state === 'paused') {
    overlay(ctx, 'PAUSED', ['The night waits for you.', 'P or click to resume · R to restart'], '#8be9ff', null);
  } else if (world.state === 'won') {
    overlay(
      ctx,
      'AURORA RESTORED!',
      [
        `Score ${world.score}  ·  Level ${world.level}  ·  Best combo ×${comboMult({ combo: world.bestCombo })} (${world.bestCombo} catches)`,
        'The sky burns green and gold again — the keeper did it.',
      ],
      '#ffd94d',
      '↻  PRESS R OR CLICK TO PLAY AGAIN',
    );
  } else if (world.state === 'over') {
    overlay(
      ctx,
      'THE NIGHT FADES',
      [
        `Score ${world.score}  ·  Level ${world.level}  ·  Best combo ${world.bestCombo} catches`,
        `The aurora needed ${WIN_SCORE} points — you gathered ${world.score}.`,
        'The void keeps the shards… for now.',
      ],
      '#ff5d7a',
      '↻  PRESS R OR CLICK TO TRY AGAIN',
    );
  }
  ctx.restore();
  if (world.flash > 0) {
    ctx.fillStyle = `rgba(255,40,80,${world.flash * 0.35})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
}
