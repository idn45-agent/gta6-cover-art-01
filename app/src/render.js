// render.js — paints a finished cover onto any 2D context.
//
// paintCover is the single road from state to pixels: the on-screen
// preview and every exported PNG call it with a different canvas size,
// so what a person sees is exactly what they download. Painting order is
// backdrop, photographs, frame lines, light effects, title block, then
// the small printed decorations (badge, stars, issue line, barcode).

import { computeLayout, panelBounds } from './geometry.js';
import { findGrade, seededRandom } from './palette.js';

export const TITLE_TREATMENTS = [
  { id: 'gradient', label: 'Sunset Gradient' },
  { id: 'halftone-block', label: 'Halftone Block' },
  { id: 'outline-chrome', label: 'Outline Chrome' },
];

const TITLE_FONT = 'Anton';
const SCRIPT_FONT = 'Pacifico';

// Cover-fits one graded photo into a rectangle. zoom multiplies the fit
// scale; ox and oy shift the crop centre as fractions of the overflow.
function drawPhotoFitted(pen, image, rect, placement) {
  const iw = image.width;
  const ih = image.height;
  const fit = Math.max(rect.w / iw, rect.h / ih) * (placement ? placement.zoom : 1);
  const shownW = rect.w / fit;
  const shownH = rect.h / fit;
  const freeX = Math.max(0, iw - shownW);
  const freeY = Math.max(0, ih - shownH);
  const ox = placement ? placement.ox : 0;
  const oy = placement ? placement.oy : 0;
  const sx = freeX * Math.max(0, Math.min(1, 0.5 + ox));
  // Vertical crops lean toward the top of the photo, where faces live,
  // so a short wide panel keeps heads instead of cutting at the chin.
  const sy = freeY * Math.max(0, Math.min(1, 0.22 + oy));
  pen.drawImage(image, sx, sy, shownW, shownH, rect.x, rect.y, rect.w, rect.h);
}

function tracePanelPath(pen, panel) {
  pen.beginPath();
  if (panel.kind === 'poly') {
    panel.points.forEach(([px, py], index) => {
      if (index === 0) pen.moveTo(px, py);
      else pen.lineTo(px, py);
    });
    pen.closePath();
    return;
  }
  const b = panelBounds(panel);
  pen.rect(b.x, b.y, b.w, b.h);
}

function paintOnePanel(pen, panel, image, placement) {
  if (panel.kind === 'card') {
    pen.save();
    pen.translate(panel.cx, panel.cy);
    pen.rotate(panel.rot);
    const frame = Math.max(6, panel.w * 0.035);
    pen.fillStyle = '#ffffff';
    pen.fillRect(-panel.w / 2 - frame, -panel.h / 2 - frame, panel.w + frame * 2, panel.h + frame * 2 + frame * 1.6);
    pen.shadowColor = 'rgba(0,0,0,0.45)';
    pen.shadowBlur = 24;
    pen.fillRect(-panel.w / 2 - frame, -panel.h / 2 - frame, panel.w + frame * 2, panel.h + frame * 2);
    pen.shadowBlur = 0;
    pen.beginPath();
    pen.rect(-panel.w / 2, -panel.h / 2, panel.w, panel.h);
    pen.clip();
    drawPhotoFitted(pen, image, { x: -panel.w / 2, y: -panel.h / 2, w: panel.w, h: panel.h }, placement);
    pen.restore();
    return;
  }
  pen.save();
  tracePanelPath(pen, panel);
  pen.clip();
  drawPhotoFitted(pen, image, panelBounds(panel), placement);
  pen.restore();
}

// Placeholder art for a panel with no photograph yet: a graded sky with a
// low sun and a palm-free skyline silhouette, drawn from plain shapes so
// the studio still shows a poster before any photo is added.
function paintPlaceholderPanel(pen, rect, grade, variant) {
  const sky = pen.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
  sky.addColorStop(0, grade.titleB);
  sky.addColorStop(0.55, grade.stops[2] ? rgbOf(grade.stops[2]) : '#e0492f');
  sky.addColorStop(1, grade.titleA);
  pen.fillStyle = sky;
  pen.fillRect(rect.x, rect.y, rect.w, rect.h);
  const sunR = rect.w * 0.2;
  const sunX = rect.x + rect.w * (0.3 + 0.18 * variant);
  const sunY = rect.y + rect.h * 0.52;
  pen.fillStyle = 'rgba(255,244,200,0.92)';
  pen.beginPath();
  pen.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  pen.fill();
  pen.fillStyle = 'rgba(12,8,28,0.88)';
  const base = rect.y + rect.h;
  let bx = rect.x;
  const rand = seededRandom(400 + variant * 77);
  while (bx < rect.x + rect.w) {
    const bw = rect.w * (0.06 + rand() * 0.1);
    const bh = rect.h * (0.12 + rand() * 0.26);
    pen.fillRect(bx, base - bh, bw, bh);
    bx += bw + rect.w * 0.012;
  }
  pen.fillRect(rect.x, base - rect.h * 0.05, rect.w, rect.h * 0.05);
}

function rgbOf([r, g, b]) {
  return `rgb(${r},${g},${b})`;
}

function paintBackdrop(pen, W, H, grade, firstImage) {
  const wash = pen.createLinearGradient(0, 0, W * 0.4, H);
  wash.addColorStop(0, rgbOf(grade.stops[1]));
  wash.addColorStop(0.6, rgbOf(grade.stops[2]));
  wash.addColorStop(1, rgbOf(grade.stops[0]));
  pen.fillStyle = wash;
  pen.fillRect(0, 0, W, H);
  if (firstImage) {
    pen.save();
    pen.globalAlpha = 0.34;
    drawPhotoFitted(pen, firstImage, { x: 0, y: 0, w: W, h: H }, { zoom: 1.15, ox: 0, oy: 0 });
    pen.restore();
  }
}

// Splits a caption into at most two lines that fit the given width at the
// given font size, breaking on word boundaries where it can.
export function wrapCaptionLines(pen, caption, maxWidth) {
  const words = caption.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return ['VICE HOUR'];
  if (words.length === 1) return words;
  let best = null;
  for (let cut = 1; cut < words.length; cut += 1) {
    const first = words.slice(0, cut).join(' ');
    const second = words.slice(cut).join(' ');
    const width = Math.max(pen.measureText(first).width, pen.measureText(second).width);
    if (best === null || width < best.width) best = { lines: [first, second], width };
    if (width <= maxWidth) return [first, second];
  }
  return best.lines;
}

// Finds the largest title size whose wrapped lines fit the box, then hands
// the lines and size back so every treatment draws the same lettering.
function planTitle(pen, caption, boxW, boxH) {
  let size = Math.min(boxH * 0.62, boxW * 0.3);
  let lines = [caption];
  for (let attempt = 0; attempt < 26; attempt += 1) {
    pen.font = `${size}px ${TITLE_FONT}, sans-serif`;
    lines = wrapCaptionLines(pen, caption, boxW);
    const widest = Math.max(...lines.map((line) => pen.measureText(line).width));
    const totalH = lines.length * size * 1.04;
    if (widest <= boxW && totalH <= boxH) break;
    size *= 0.92;
  }
  return { lines, size };
}

function paintTitleGradient(pen, lines, size, cx, topY, grade) {
  pen.textAlign = 'center';
  pen.textBaseline = 'top';
  lines.forEach((line, i) => {
    const y = topY + i * size * 1.04;
    pen.font = `${size}px ${TITLE_FONT}, sans-serif`;
    pen.lineJoin = 'round';
    pen.strokeStyle = '#14081f';
    pen.lineWidth = size * 0.16;
    pen.shadowColor = 'rgba(10,2,20,0.55)';
    pen.shadowBlur = 0;
    pen.shadowOffsetY = size * 0.07;
    pen.strokeText(line, cx, y);
    pen.shadowOffsetY = 0;
    const fill = pen.createLinearGradient(0, y, 0, y + size);
    fill.addColorStop(0, '#ffffff');
    fill.addColorStop(0.34, grade.titleA);
    fill.addColorStop(0.72, grade.titleB);
    fill.addColorStop(1, grade.titleB);
    pen.fillStyle = fill;
    pen.fillText(line, cx, y);
  });
  return lines.length * size * 1.04;
}

function paintTitleHalftoneBlock(pen, lines, size, cx, topY, W, grade) {
  const blockH = lines.length * size * 1.04 + size * 0.72;
  const blockY = topY - size * 0.3;
  pen.save();
  pen.fillStyle = '#160a24';
  pen.fillRect(0, blockY, W, blockH);
  const rand = seededRandom(20240);
  const dotGap = Math.max(9, W * 0.012);
  pen.fillStyle = grade.titleB;
  for (let y = blockY + dotGap * 0.4; y < blockY + blockH; y += dotGap) {
    for (let x = dotGap * 0.4; x < W; x += dotGap) {
      const wave = 0.5 + 0.5 * Math.sin(x * 0.012 + y * 0.02);
      pen.globalAlpha = 0.14 + wave * 0.3;
      pen.beginPath();
      pen.arc(x + rand() * 1.5, y, dotGap * (0.14 + wave * 0.13), 0, Math.PI * 2);
      pen.fill();
    }
  }
  pen.restore();
  pen.textAlign = 'center';
  pen.textBaseline = 'top';
  lines.forEach((line, i) => {
    const y = topY + i * size * 1.04;
    pen.font = `${size}px ${TITLE_FONT}, sans-serif`;
    pen.lineJoin = 'round';
    pen.strokeStyle = grade.titleB;
    pen.lineWidth = size * 0.05;
    pen.strokeText(line, cx, y);
    pen.fillStyle = grade.paper;
    pen.fillText(line, cx, y);
  });
  return blockH;
}

function paintTitleOutlineChrome(pen, lines, size, cx, topY, grade) {
  pen.textAlign = 'center';
  pen.textBaseline = 'top';
  lines.forEach((line, i) => {
    const y = topY + i * size * 1.04;
    pen.font = `${size}px ${TITLE_FONT}, sans-serif`;
    pen.lineJoin = 'round';
    pen.strokeStyle = '#160a24';
    pen.lineWidth = size * 0.14;
    pen.strokeText(line, cx, y);
    pen.strokeStyle = grade.titleB;
    pen.lineWidth = size * 0.045;
    pen.strokeText(line, cx + size * 0.055, y + size * 0.055);
    pen.strokeStyle = '#7df9ff';
    pen.strokeText(line, cx - size * 0.045, y - size * 0.03);
    const stroke = pen.createLinearGradient(0, y, 0, y + size);
    stroke.addColorStop(0, '#ffffff');
    stroke.addColorStop(0.5, grade.titleA);
    stroke.addColorStop(0.52, '#5b4a86');
    stroke.addColorStop(1, grade.paper);
    pen.strokeStyle = stroke;
    pen.lineWidth = size * 0.088;
    pen.strokeText(line, cx, y);
  });
  return lines.length * size * 1.04;
}

// The whole lettering group: optional issue line above, the caption in its
// treatment, and the script subtitle tucked under it at a slight tilt.
function paintLettering(pen, W, H, state, grade, band) {
  const caption = (state.caption || 'VICE HOUR').toUpperCase();
  let zone;
  if (band) {
    zone = { x: W * 0.04, y: band.y + H * 0.018, w: W * 0.92, h: band.h * 0.64 };
  } else {
    const zoneH = H * (state.treatment === 'halftone-block' ? 0.34 : 0.3);
    zone = { x: W * 0.045, y: H - zoneH - H * 0.015, w: W * 0.91, h: zoneH * 0.72 };
    if (state.treatment !== 'halftone-block') {
      const scrim = pen.createLinearGradient(0, zone.y - H * 0.05, 0, H);
      scrim.addColorStop(0, 'rgba(8,3,18,0)');
      scrim.addColorStop(0.45, 'rgba(8,3,18,0.42)');
      scrim.addColorStop(1, 'rgba(8,3,18,0.78)');
      pen.fillStyle = scrim;
      pen.fillRect(0, zone.y - H * 0.05, W, H - zone.y + H * 0.05);
    }
  }
  const plan = planTitle(pen, caption, zone.w, zone.h);
  let usedH;
  if (state.treatment === 'halftone-block') {
    usedH = paintTitleHalftoneBlock(pen, plan.lines, plan.size, W / 2, zone.y + plan.size * 0.28, W, grade);
  } else if (state.treatment === 'outline-chrome') {
    usedH = paintTitleOutlineChrome(pen, plan.lines, plan.size, W / 2, zone.y, grade);
  } else {
    usedH = paintTitleGradient(pen, plan.lines, plan.size, W / 2, zone.y, grade);
  }
  const subtitle = (state.subtitle || '').trim();
  if (subtitle) {
    const subSize = Math.max(15, plan.size * 0.34);
    pen.save();
    pen.font = `${subSize}px ${SCRIPT_FONT}, cursive`;
    pen.textAlign = 'center';
    pen.textBaseline = 'top';
    const subY = band ? zone.y + usedH + subSize * 0.18 : zone.y + usedH + subSize * 0.12;
    pen.translate(W / 2, subY);
    pen.rotate(-0.028);
    pen.shadowColor = 'rgba(8,2,16,0.7)';
    pen.shadowBlur = 6;
    pen.fillStyle = band ? grade.titleB : '#ffd9e8';
    pen.fillText(subtitle, 0, 0);
    pen.restore();
  }
}

// A twelve-point starburst with a ribbon tail, the classic corner badge.
function paintStarburstBadge(pen, W, H, state, grade) {
  const cx = W * 0.865;
  const cy = H * 0.135;
  const radius = Math.min(W, H) * 0.105;
  const rand = seededRandom(777);
  pen.save();
  pen.translate(cx, cy);
  pen.rotate(-0.16);
  pen.beginPath();
  const points = 14;
  for (let i = 0; i < points * 2; i += 1) {
    const r = i % 2 === 0 ? radius : radius * 0.78;
    const a = (i / (points * 2)) * Math.PI * 2;
    if (i === 0) pen.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else pen.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  pen.closePath();
  const fill = pen.createLinearGradient(0, -radius, 0, radius);
  fill.addColorStop(0, grade.titleA);
  fill.addColorStop(1, grade.titleB);
  pen.fillStyle = fill;
  pen.shadowColor = 'rgba(0,0,0,0.4)';
  pen.shadowBlur = 10;
  pen.fill();
  pen.shadowBlur = 0;
  pen.lineWidth = radius * 0.05;
  pen.strokeStyle = '#160a24';
  pen.stroke();
  pen.fillStyle = grade.titleB;
  pen.beginPath();
  pen.moveTo(-radius * 0.42, radius * 0.82);
  pen.lineTo(-radius * 0.1, radius * 0.86);
  pen.lineTo(-radius * 0.3, radius * 1.28);
  pen.closePath();
  pen.fill();
  pen.beginPath();
  pen.moveTo(radius * 0.42, radius * 0.82);
  pen.lineTo(radius * 0.1, radius * 0.86);
  pen.lineTo(radius * 0.3, radius * 1.28);
  pen.closePath();
  pen.fill();
  const label = (state.badgeText || 'HOT').toUpperCase().slice(0, 10);
  let size = radius * 0.52;
  pen.font = `${size}px ${TITLE_FONT}, sans-serif`;
  while (pen.measureText(label).width > radius * 1.25 && size > 8) {
    size *= 0.9;
    pen.font = `${size}px ${TITLE_FONT}, sans-serif`;
  }
  pen.textAlign = 'center';
  pen.textBaseline = 'middle';
  pen.fillStyle = '#160a24';
  pen.fillText(label, 0, radius * 0.05);
  void rand;
  pen.restore();
}

// Five little stars in a row with some filled: the heat meter.
function paintHeatStars(pen, W, H, grade) {
  const size = Math.min(W, H) * 0.026;
  const startX = W * 0.045;
  const y = H * 0.078;
  const lit = 4;
  for (let s = 0; s < 5; s += 1) {
    const cx = startX + s * size * 2.5;
    pen.beginPath();
    for (let i = 0; i < 10; i += 1) {
      const r = i % 2 === 0 ? size : size * 0.45;
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      if (i === 0) pen.moveTo(cx + Math.cos(a) * r, y + Math.sin(a) * r);
      else pen.lineTo(cx + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    pen.closePath();
    if (s < lit) {
      pen.fillStyle = grade.titleA;
      pen.fill();
    }
    pen.lineWidth = size * 0.14;
    pen.strokeStyle = 'rgba(10,4,20,0.85)';
    pen.stroke();
  }
}

function paintIssueLine(pen, W, H, grade, band, badgeOn) {
  const size = Math.max(12, Math.min(W, H) * 0.021);
  pen.font = `600 ${size}px system-ui, sans-serif`;
  pen.textBaseline = 'top';
  pen.fillStyle = grade.paper;
  pen.globalAlpha = 0.94;
  pen.shadowColor = 'rgba(8,2,16,0.65)';
  pen.shadowBlur = 5;
  pen.textAlign = 'left';
  pen.fillText('VOL. 06 — LEONIDA', W * 0.045, H * 0.02);
  // The badge owns the top-right corner when it is on; the right-hand
  // line steps aside instead of disappearing underneath it.
  if (!badgeOn) {
    pen.textAlign = 'right';
    pen.fillText('EST. 2026 · SHORELINE CITY', W * 0.955, H * 0.02);
  }
  void band;
  pen.shadowBlur = 0;
  pen.globalAlpha = 1;
}

// A fake magazine barcode: seeded bars of uneven width over a white chip.
function paintBarcodeChip(pen, W, H) {
  const chipW = W * 0.115;
  const chipH = H * 0.055;
  const x = W - chipW - W * 0.03;
  const y = H - chipH - H * 0.028;
  pen.fillStyle = '#ffffff';
  pen.fillRect(x, y, chipW, chipH);
  const rand = seededRandom(4242);
  let bx = x + chipW * 0.07;
  pen.fillStyle = '#111111';
  while (bx < x + chipW * 0.93) {
    const bw = chipW * (0.012 + rand() * 0.035);
    if (rand() > 0.3) pen.fillRect(bx, y + chipH * 0.12, bw, chipH * 0.58);
    bx += bw + chipW * 0.016;
  }
  pen.font = `${Math.max(9, chipH * 0.2)}px system-ui, sans-serif`;
  pen.textAlign = 'center';
  pen.textBaseline = 'alphabetic';
  pen.fillText('06 2026 001', x + chipW / 2, y + chipH * 0.92);
}

function paintLightLeaks(pen, W, H) {
  pen.save();
  pen.globalCompositeOperation = 'screen';
  const leakA = pen.createRadialGradient(W * 0.06, H * 0.02, 0, W * 0.06, H * 0.02, W * 0.55);
  leakA.addColorStop(0, 'rgba(255,120,60,0.5)');
  leakA.addColorStop(1, 'rgba(255,120,60,0)');
  pen.fillStyle = leakA;
  pen.fillRect(0, 0, W, H);
  const leakB = pen.createRadialGradient(W * 0.98, H * 0.3, 0, W * 0.98, H * 0.3, W * 0.45);
  leakB.addColorStop(0, 'rgba(255,60,140,0.34)');
  leakB.addColorStop(1, 'rgba(255,60,140,0)');
  pen.fillStyle = leakB;
  pen.fillRect(0, 0, W, H);
  pen.restore();
}

function paintFilmGrain(pen, W, H) {
  const tile = 128;
  const grainCanvas = paintFilmGrain.tile || (paintFilmGrain.tile = document.createElement('canvas'));
  if (grainCanvas.width !== tile) {
    grainCanvas.width = tile;
    grainCanvas.height = tile;
    const g = grainCanvas.getContext('2d');
    const data = g.createImageData(tile, tile);
    const rand = seededRandom(99);
    for (let i = 0; i < data.data.length; i += 4) {
      const v = Math.floor(rand() * 255);
      data.data[i] = v;
      data.data[i + 1] = v;
      data.data[i + 2] = v;
      data.data[i + 3] = 255;
    }
    g.putImageData(data, 0, 0);
  }
  pen.save();
  pen.globalAlpha = 0.07;
  const pattern = pen.createPattern(grainCanvas, 'repeat');
  pen.fillStyle = pattern;
  pen.fillRect(0, 0, W, H);
  pen.restore();
}

function paintVignette(pen, W, H) {
  const r = Math.hypot(W, H) * 0.62;
  const shade = pen.createRadialGradient(W / 2, H / 2, r * 0.42, W / 2, H / 2, r);
  shade.addColorStop(0, 'rgba(5,2,12,0)');
  shade.addColorStop(1, 'rgba(5,2,12,0.5)');
  pen.fillStyle = shade;
  pen.fillRect(0, 0, W, H);
}

function paintHalftoneShade(pen, W, H, grade) {
  const gap = Math.max(10, W * 0.014);
  pen.save();
  pen.fillStyle = grade.stops[0] ? rgbOf(grade.stops[0]) : '#160a24';
  for (let y = H * 0.55; y < H; y += gap) {
    const depth = (y - H * 0.55) / (H * 0.45);
    for (let x = gap * 0.5; x < W; x += gap) {
      pen.globalAlpha = 0.05 + depth * 0.16;
      pen.beginPath();
      pen.arc(x, y, gap * 0.16 * (0.5 + depth), 0, Math.PI * 2);
      pen.fill();
    }
  }
  pen.restore();
}

// The one entry point. `images` holds one graded canvas (or raw photo)
// per photo slot; state.panels say which slot each panel shows and how
// it is cropped.
export function paintCover(pen, W, H, state, images) {
  const grade = findGrade(state.grade);
  const layout = computeLayout(state.layout, W, H);
  pen.fillStyle = '#ffffff';
  pen.fillRect(0, 0, W, H);
  if (layout.backdrop) {
    paintBackdrop(pen, W, H, grade, images[state.panels[0] ? state.panels[0].photo : 0] || null);
  }
  if (layout.band) {
    // A deep plum band: every title treatment stays legible on it, the
    // way a masthead sits on a dark header bar.
    const bandFill = pen.createLinearGradient(0, 0, W, layout.band.h);
    bandFill.addColorStop(0, rgbOf(grade.stops[0]));
    bandFill.addColorStop(0.6, rgbOf(grade.stops[1]));
    bandFill.addColorStop(1, rgbOf(grade.stops[0]));
    pen.fillStyle = bandFill;
    pen.fillRect(layout.band.x, layout.band.y, layout.band.w, layout.band.h);
    pen.fillStyle = grade.titleA;
    pen.fillRect(layout.band.x, layout.band.y + layout.band.h - Math.max(3, H * 0.006), layout.band.w, Math.max(3, H * 0.006));
  }
  layout.panels.forEach((panel, index) => {
    const placement = state.panels[index] || { photo: 0, zoom: 1, ox: 0, oy: 0 };
    const image = images[placement.photo];
    pen.save();
    if (panel.kind !== 'card') tracePanelPath(pen, panel), pen.clip();
    if (image) {
      if (panel.kind === 'card') paintOnePanel(pen, panel, image, placement);
      else drawPhotoFitted(pen, image, panelBounds(panel), placement);
    } else {
      paintPlaceholderPanel(pen, panelBounds(panel), grade, index);
    }
    pen.restore();
    if (panel.kind === 'box') {
      pen.strokeStyle = 'rgba(255,255,255,0.95)';
      pen.lineWidth = Math.max(2, Math.min(W, H) * 0.004);
      pen.strokeRect(panel.x, panel.y, panel.w, panel.h);
    }
  });
  const deco = state.deco;
  if (deco.halftone) paintHalftoneShade(pen, W, H, grade);
  if (deco.leak) paintLightLeaks(pen, W, H);
  paintLettering(pen, W, H, state, grade, layout.band);
  if (deco.issue) paintIssueLine(pen, W, H, grade, layout.band, deco.badge);
  if (deco.stars) paintHeatStars(pen, W, H, grade);
  if (deco.badge) paintStarburstBadge(pen, W, H, state, grade);
  if (deco.barcode) paintBarcodeChip(pen, W, H);
  if (deco.grain) paintFilmGrain(pen, W, H);
  if (deco.vignette) paintVignette(pen, W, H);
  pen.strokeStyle = '#160a24';
  pen.lineWidth = Math.max(3, Math.min(W, H) * 0.008);
  pen.strokeRect(0, 0, W, H);
}
