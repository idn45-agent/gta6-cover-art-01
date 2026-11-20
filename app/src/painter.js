// painter.js — draws a complete Vice Hour cover onto any 2D context.
// The same entry point paints the live preview and every export size, so
// what the editor shows is byte-for-byte the composition that downloads.

import { applyGrade, seededRandom } from './tones.js';
import { layoutFor } from './frames.js';

const scratch = document.createElement('canvas');
const scratchCtx = scratch.getContext('2d', { willReadFrequently: true });

// Paint one photograph into a panel rect with cover-fit, zoom and pan,
// grade it on the scratch canvas, then stamp it onto the target.
function stampPhoto(ctx, img, px, py, pw, ph, view, gradeId, inkOn) {
  const cap = 900;
  const scaleDown = Math.min(1, cap / Math.max(pw, ph));
  const sw = Math.max(2, Math.round(pw * scaleDown));
  const sh = Math.max(2, Math.round(ph * scaleDown));
  scratch.width = sw;
  scratch.height = sh;
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const base = Math.max(sw / iw, sh / ih);
  const zoom = view && view.zoom ? view.zoom : 1;
  const drawW = iw * base * zoom;
  const drawH = ih * base * zoom;
  const ox = (view && view.ox ? view.ox : 0) * sw;
  const oy = (view && view.oy ? view.oy : 0) * sh;
  scratchCtx.fillStyle = '#241433';
  scratchCtx.fillRect(0, 0, sw, sh);
  scratchCtx.drawImage(img, (sw - drawW) / 2 + ox, (sh - drawH) / 2 + oy, drawW, drawH);
  const data = scratchCtx.getImageData(0, 0, sw, sh);
  applyGrade(data, gradeId, inkOn);
  scratchCtx.putImageData(data, 0, 0);
  ctx.drawImage(scratch, px, py, pw, ph);
}

// Placeholder art for an empty panel: a painted sunset with a palm-free
// skyline silhouette, so a fresh cover already looks finished.
function stampPlaceholder(ctx, px, py, pw, ph, gradeId, inkOn, hueShift) {
  const sw = Math.max(2, Math.round(pw / 2));
  const sh = Math.max(2, Math.round(ph / 2));
  scratch.width = sw;
  scratch.height = sh;
  const sky = scratchCtx.createLinearGradient(0, 0, 0, sh);
  sky.addColorStop(0, '#2a1a5e');
  sky.addColorStop(0.55, '#b13a6b');
  sky.addColorStop(0.8, '#f2762e');
  sky.addColorStop(1, '#f7b733');
  scratchCtx.fillStyle = sky;
  scratchCtx.fillRect(0, 0, sw, sh);
  // Sun disc.
  scratchCtx.fillStyle = '#ffe9a8';
  scratchCtx.beginPath();
  scratchCtx.arc(sw * (0.3 + hueShift * 0.35), sh * 0.62, sh * 0.16, 0, Math.PI * 2);
  scratchCtx.fill();
  // Skyline.
  scratchCtx.fillStyle = '#160b26';
  const rand = seededRandom(40 + hueShift * 17);
  let bx = 0;
  while (bx < sw) {
    const bw = sw * (0.05 + rand() * 0.09);
    const bh = sh * (0.14 + rand() * 0.3);
    scratchCtx.fillRect(bx, sh - bh, bw, bh);
    bx += bw + sw * 0.012;
  }
  scratchCtx.fillRect(0, sh * 0.94, sw, sh * 0.06);
  const data = scratchCtx.getImageData(0, 0, sw, sh);
  applyGrade(data, gradeId, inkOn);
  scratchCtx.putImageData(data, 0, 0);
  ctx.drawImage(scratch, px, py, pw, ph);
}

function drawHalftoneDots(ctx, x, y, w, h, colour, alpha, spacing) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = colour;
  const r = spacing * 0.32;
  for (let row = 0, yy = y + spacing / 2; yy < y + h; row++, yy += spacing) {
    for (let xx = x + spacing / 2 + (row % 2 ? spacing / 2 : 0); xx < x + w; xx += spacing) {
      ctx.beginPath();
      ctx.arc(xx, yy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function fitFontSize(ctx, text, fontFamily, weight, maxWidth, startSize) {
  let size = startSize;
  while (size > 12) {
    ctx.font = `${weight} ${size}px ${fontFamily}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 4;
  }
  return size;
}

// The three caption treatments.
function paintTitle(ctx, st, titleZone, W, H) {
  const caption = (st.caption || '').trim() || 'VICE HOUR';
  const subtitle = (st.subtitle || '').trim();
  const cx = titleZone.x * W;
  const maxW = titleZone.w * W;
  const align = titleZone.align || 'center';
  const anchorX = align === 'left' ? cx : cx;
  ctx.save();
  ctx.textAlign = align === 'left' ? 'left' : 'center';
  ctx.textBaseline = 'top';

  if (st.treatment === 'halftone-block') {
    // A dotted band sits behind the words like a printed magazine splash.
    const bandH = H * 0.21;
    const bandY = titleZone.y * H - H * 0.015;
    ctx.fillStyle = '#12081f';
    ctx.globalAlpha = 0.88;
    const bandX = align === 'left' ? 0 : (W - maxW * 1.06) / 2;
    ctx.fillRect(bandX, bandY, maxW * 1.06, bandH);
    ctx.globalAlpha = 1;
    drawHalftoneDots(ctx, bandX, bandY, maxW * 1.06, bandH, '#ff5e8a', 0.5, Math.max(10, W * 0.012));
    const size = fitFontSize(ctx, caption.toUpperCase(), 'Anton, sans-serif', '400', maxW, H * 0.115);
    ctx.font = `400 ${size}px Anton, sans-serif`;
    ctx.fillStyle = '#ffd23e';
    ctx.strokeStyle = '#12081f';
    ctx.lineWidth = size * 0.09;
    const ty = bandY + bandH * 0.14;
    ctx.strokeText(caption.toUpperCase(), anchorX, ty);
    ctx.fillText(caption.toUpperCase(), anchorX, ty);
    if (subtitle) {
      ctx.font = `${Math.round(size * 0.34)}px Pacifico, cursive`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(subtitle, anchorX, ty + size * 1.02);
    }
    ctx.restore();
    return;
  }

  if (st.treatment === 'outline-chrome') {
    const size = fitFontSize(ctx, caption.toUpperCase(), 'Anton, sans-serif', '400', maxW, H * 0.125);
    ctx.font = `400 ${size}px Anton, sans-serif`;
    const ty = titleZone.y * H;
    // Offset shadow pass, then a hollow bright stroke.
    ctx.strokeStyle = '#ff2e7e';
    ctx.lineWidth = size * 0.055;
    ctx.strokeText(caption.toUpperCase(), anchorX + size * 0.07, ty + size * 0.07);
    ctx.strokeStyle = '#f4fbff';
    ctx.lineWidth = size * 0.075;
    ctx.strokeText(caption.toUpperCase(), anchorX, ty);
    ctx.fillStyle = 'rgba(10,10,24,0.35)';
    ctx.fillText(caption.toUpperCase(), anchorX, ty);
    if (subtitle) {
      ctx.font = `${Math.round(size * 0.36)}px Pacifico, cursive`;
      ctx.fillStyle = '#ffe066';
      ctx.shadowColor = 'rgba(0,0,0,0.7)';
      ctx.shadowBlur = size * 0.12;
      ctx.fillText(subtitle, anchorX, ty + size * 1.08);
    }
    ctx.restore();
    return;
  }

  // Default: gradient-filled capitals with a heavy dark outline.
  const size = fitFontSize(ctx, caption.toUpperCase(), 'Anton, sans-serif', '400', maxW, H * 0.13);
  ctx.font = `400 ${size}px Anton, sans-serif`;
  const ty = titleZone.y * H;
  const grad = ctx.createLinearGradient(0, ty, 0, ty + size);
  grad.addColorStop(0, '#fff7ae');
  grad.addColorStop(0.45, '#ffb52e');
  grad.addColorStop(0.75, '#ff5e62');
  grad.addColorStop(1, '#c81d7a');
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#160a24';
  ctx.lineWidth = size * 0.16;
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = size * 0.1;
  ctx.shadowOffsetY = size * 0.05;
  ctx.strokeText(caption.toUpperCase(), anchorX, ty);
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = grad;
  ctx.fillText(caption.toUpperCase(), anchorX, ty);
  if (subtitle) {
    ctx.font = `${Math.round(size * 0.38)}px Pacifico, cursive`;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.75)';
    ctx.shadowBlur = size * 0.14;
    ctx.fillText(subtitle, anchorX, ty + size * 1.04);
  }
  ctx.restore();
}

function paintBadge(ctx, st, W, H) {
  const text = (st.badgeText || 'VICE HOUR').toUpperCase();
  const cx = W * 0.885;
  const cy = H * 0.155;
  const R = Math.min(W, H) * 0.085;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.22);
  // Star-burst ribbon.
  ctx.beginPath();
  const spikes = 18;
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? R : R * 0.78;
    const a = (i / (spikes * 2)) * Math.PI * 2;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = '#ffd23e';
  ctx.fill();
  ctx.lineWidth = R * 0.06;
  ctx.strokeStyle = '#160a24';
  ctx.stroke();
  ctx.fillStyle = '#160a24';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const words = text.split(' ');
  const size = fitFontSize(ctx, words[0] || text, 'Anton, sans-serif', '400', R * 1.25, R * 0.42);
  ctx.font = `400 ${size}px Anton, sans-serif`;
  if (words.length > 1) {
    ctx.fillText(words[0], 0, -size * 0.55);
    ctx.fillText(words.slice(1).join(' '), 0, size * 0.5);
  } else {
    ctx.fillText(text, 0, 0);
  }
  ctx.restore();
}

function paintStars(ctx, st, W, H) {
  const n = 5;
  const s = Math.min(W, H) * 0.028;
  const x0 = W * 0.045;
  const y0 = H - s * 2.1;
  ctx.save();
  ctx.fillStyle = '#ffd23e';
  ctx.strokeStyle = '#160a24';
  for (let i = 0; i < n; i++) {
    const cx = x0 + i * s * 2.3;
    const cy = y0;
    ctx.beginPath();
    for (let k = 0; k < 10; k++) {
      const r = k % 2 === 0 ? s : s * 0.45;
      const a = (k / 10) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = s * 0.14;
    ctx.stroke();
  }
  ctx.fillStyle = '#ffffff';
  ctx.font = `400 ${Math.round(s * 0.95)}px Anton, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('HEAT METER', x0 + n * s * 2.3 + s * 0.5, y0);
  ctx.restore();
}

function paintIssueLine(ctx, st, W, H) {
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = `400 ${Math.round(Math.min(W, H) * 0.021)}px Anton, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 6;
  ctx.fillText((st.issueText || 'VOL. 06 — LEONIDA').toUpperCase(), W * 0.035, H * 0.028);
  ctx.textAlign = 'right';
  ctx.fillText('EST. 2026', W * 0.965, H * 0.028);
  ctx.restore();
}

function paintBarcode(ctx, st, W, H) {
  const bw = W * 0.13;
  const bh = H * 0.055;
  const x = W - bw - W * 0.03;
  const y = H - bh - H * 0.028;
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x, y, bw, bh);
  ctx.fillStyle = '#111111';
  const rand = seededRandom(99);
  let bx = x + bw * 0.05;
  while (bx < x + bw * 0.95) {
    const wdt = bw * (0.012 + rand() * 0.03);
    if (rand() > 0.35) ctx.fillRect(bx, y + bh * 0.08, wdt, bh * 0.52);
    bx += wdt + bw * 0.014;
  }
  ctx.font = `${Math.round(bh * 0.22)}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('06 2026 00006', x + bw / 2, y + bh * 0.8);
  ctx.restore();
}

function paintOverlays(ctx, st, W, H) {
  const d = st.decos || {};
  if (d.leak) {
    const g = ctx.createRadialGradient(W * 0.92, H * 0.05, 0, W * 0.92, H * 0.05, Math.max(W, H) * 0.75);
    g.addColorStop(0, 'rgba(255,120,60,0.5)');
    g.addColorStop(0.4, 'rgba(255,60,120,0.18)');
    g.addColorStop(1, 'rgba(255,60,120,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  if (d.halftone) drawHalftoneDots(ctx, 0, H * 0.55, W, H * 0.45, '#000000', 0.16, Math.max(12, W * 0.014));
  if (d.grain) {
    const rand = seededRandom(1234);
    const count = Math.round((W * H) / 900);
    ctx.save();
    for (let i = 0; i < count; i++) {
      const v = rand();
      ctx.fillStyle = v > 0.5 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.09)';
      ctx.fillRect(rand() * W, rand() * H, 1.6, 1.6);
    }
    ctx.restore();
  }
  if (d.vignette) {
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.36, W / 2, H / 2, Math.max(W, H) * 0.78);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(5,2,12,0.55)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
}

// Main entry: paint the whole cover described by state `st`.
// `photos` is the array of loaded image objects the panel views index into.
export function paintCover(ctx, W, H, st, photos) {
  const layout = layoutFor(st.layout, W, H);
  ctx.save();
  ctx.fillStyle = layout.backdrop || '#0d0716';
  ctx.fillRect(0, 0, W, H);

  // Masthead and poster-wall reserve a painted band behind the title.
  if (layout.title.band) {
    const bandH = layout.title.band * H;
    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, '#2b1055');
    grad.addColorStop(0.5, '#7a1e5e');
    grad.addColorStop(1, '#e8546d');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, bandH);
  }

  const seam = Math.max(3, Math.round(Math.min(W, H) * 0.006));
  layout.panels.forEach((p, idx) => {
    const px = p.x * W, py = p.y * H, pw = p.w * W, ph = p.h * H;
    ctx.save();
    if (p.tilt) {
      ctx.translate(px + pw / 2, py + ph / 2);
      ctx.rotate((p.tilt * Math.PI) / 180);
      ctx.translate(-(px + pw / 2), -(py + ph / 2));
    }
    ctx.beginPath();
    ctx.rect(px, py, pw, ph);
    ctx.clip();
    const view = (st.panels && st.panels[idx]) || { img: 0, zoom: 1, ox: 0, oy: 0 };
    const img = photos && view.img >= 0 ? photos[view.img] : null;
    if (img) stampPhoto(ctx, img, px, py, pw, ph, view, st.grade, st.ink);
    else stampPlaceholder(ctx, px, py, pw, ph, st.grade, st.ink, idx);
    ctx.restore();
    // White keyline around every panel, the classic poster seam.
    ctx.save();
    if (p.tilt) {
      ctx.translate(px + pw / 2, py + ph / 2);
      ctx.rotate((p.tilt * Math.PI) / 180);
      ctx.translate(-(px + pw / 2), -(py + ph / 2));
    }
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = seam;
    ctx.strokeRect(px, py, pw, ph);
    ctx.restore();
  });

  paintTitle(ctx, st, layout.title, W, H);
  const d = st.decos || {};
  if (d.issue) paintIssueLine(ctx, st, W, H);
  if (d.badge) paintBadge(ctx, st, W, H);
  if (d.stars) paintStars(ctx, st, W, H);
  if (d.barcode) paintBarcode(ctx, st, W, H);
  paintOverlays(ctx, st, W, H);
  ctx.restore();
}
