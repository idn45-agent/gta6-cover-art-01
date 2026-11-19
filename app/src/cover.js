// Vice Hour cover engine: draws a multi-panel GTA-poster-style cover onto a
// 2D canvas. Pure canvas, no network: photos are Image objects the caller
// loaded from local files or the bundled samples, fonts are vendored OFL
// files under app/fonts/. Every layout is a set of panel rectangles in
// normalised cover coordinates; every grade is a gradient-map style overlay
// stack applied per panel, so the same engine renders the live preview and
// the exported PNG at any size.

// Six layouts. Each panel: x, y, w, h in 0..1 of the cover, plus an optional
// tilt (degrees) for the snapshot layout and a titleZone the lettering sits in.
export const LAYOUTS = {
  'hero-and-three': {
    label: 'Hero + Three',
    panels: [
      { x: 0.0, y: 0.0, w: 0.62, h: 1.0 },
      { x: 0.63, y: 0.0, w: 0.37, h: 0.32 },
      { x: 0.63, y: 0.34, w: 0.37, h: 0.32 },
      { x: 0.63, y: 0.68, w: 0.37, h: 0.32 },
    ],
    titleZone: { x: 0.03, y: 0.78, w: 0.58, h: 0.2 },
  },
  'grid-4': {
    label: 'Grid 4',
    panels: [
      { x: 0.0, y: 0.0, w: 0.495, h: 0.495 },
      { x: 0.505, y: 0.0, w: 0.495, h: 0.495 },
      { x: 0.0, y: 0.505, w: 0.495, h: 0.495 },
      { x: 0.505, y: 0.505, w: 0.495, h: 0.495 },
    ],
    titleZone: { x: 0.04, y: 0.4, w: 0.92, h: 0.2 },
  },
  'full-bleed': {
    label: 'Full Bleed',
    panels: [{ x: 0.0, y: 0.0, w: 1.0, h: 1.0 }],
    titleZone: { x: 0.04, y: 0.74, w: 0.92, h: 0.22 },
  },
  'tilted-snapshot': {
    label: 'Tilted Snapshots',
    panels: [
      { x: 0.05, y: 0.17, w: 0.52, h: 0.48, tilt: -1.5 },
      { x: 0.61, y: 0.17, w: 0.34, h: 0.48, tilt: 1.5 },
      { x: 0.05, y: 0.69, w: 0.9, h: 0.23, tilt: -1 },
    ],
    titleZone: { x: 0.05, y: 0.02, w: 0.9, h: 0.12 },
    backdrop: true,
  },
  'grid-9': {
    label: 'Grid 9',
    panels: [
      { x: 0.0, y: 0.0, w: 0.326, h: 0.326 },
      { x: 0.337, y: 0.0, w: 0.326, h: 0.326 },
      { x: 0.674, y: 0.0, w: 0.326, h: 0.326 },
      { x: 0.0, y: 0.337, w: 0.326, h: 0.326 },
      { x: 0.337, y: 0.337, w: 0.326, h: 0.326 },
      { x: 0.674, y: 0.337, w: 0.326, h: 0.326 },
      { x: 0.0, y: 0.674, w: 0.326, h: 0.326 },
      { x: 0.337, y: 0.674, w: 0.326, h: 0.326 },
      { x: 0.674, y: 0.674, w: 0.326, h: 0.326 },
    ],
    titleZone: { x: 0.04, y: 0.42, w: 0.92, h: 0.16 },
  },
  story: {
    label: 'Story',
    panels: [
      { x: 0.0, y: 0.0, w: 1.0, h: 0.55 },
      { x: 0.0, y: 0.56, w: 0.49, h: 0.42 },
      { x: 0.51, y: 0.56, w: 0.49, h: 0.42 },
    ],
    titleZone: { x: 0.04, y: 0.4, w: 0.92, h: 0.14 },
  },
};

// Five grades. Each grade tints the photo with a vertical gradient-map
// overlay (blend mode + opacity), a warm/cool wash, and a lettering palette.
export const GRADES = {
  sunset: {
    label: 'Sunset',
    top: '#ff9a3d', mid: '#ff5e7a', bottom: '#7b2fbe',
    overlay: 'overlay', overlayAlpha: 0.55, wash: 'rgba(255, 110, 60, 0.12)',
    saturate: 1.35, contrast: 1.06, title: ['#ffd76a', '#ff7a3d', '#ff3d7e'],
    titleStroke: '#2b0a3d', sub: '#ffe9a8',
  },
  neon: {
    label: 'Neon',
    top: '#00e5ff', mid: '#ff2fb3', bottom: '#3b0a6e',
    overlay: 'overlay', overlayAlpha: 0.6, wash: 'rgba(255, 47, 179, 0.14)',
    saturate: 1.45, contrast: 1.08, title: ['#7df9ff', '#ff5ce1', '#ff2fb3'],
    titleStroke: '#0a1030', sub: '#7df9ff',
  },
  'gold-hour': {
    label: 'Gold Hour',
    top: '#ffe08a', mid: '#ff9e2c', bottom: '#8a3b12',
    overlay: 'soft-light', overlayAlpha: 0.7, wash: 'rgba(255, 180, 60, 0.16)',
    saturate: 1.3, contrast: 1.05, title: ['#fff3c4', '#ffc93d', '#ff8a2c'],
    titleStroke: '#3d1c05', sub: '#fff3c4',
  },
  noir: {
    label: 'Noir',
    top: '#c8c8d8', mid: '#5a5a72', bottom: '#0c0c16',
    overlay: 'overlay', overlayAlpha: 0.5, wash: 'rgba(20, 20, 40, 0.18)',
    saturate: 0.55, contrast: 1.18, title: ['#ffffff', '#d8d8e8', '#9a9ab8'],
    titleStroke: '#000000', sub: '#e8e8f2',
  },
  'teal-pink': {
    label: 'Teal Pink',
    top: '#2ee6c8', mid: '#ff6fa5', bottom: '#1c2a6e',
    overlay: 'overlay', overlayAlpha: 0.55, wash: 'rgba(46, 230, 200, 0.10)',
    saturate: 1.4, contrast: 1.06, title: ['#a8fff0', '#ff8ac2', '#ff4d9d'],
    titleStroke: '#0a1a3d', sub: '#a8fff0',
  },
};

// One panel's photo placement. photo: index into the photos array (or -1
// for an empty slot). zoom 1 = cover-fit; ox/oy shift the photo in panel
// fractions of the panel size.
export function defaultPanel(photo) {
  return { photo, zoom: 1, ox: 0, oy: 0 };
}

export function defaultState() {
  return {
    layout: 'hero-and-three',
    grade: 'sunset',
    caption: 'VICE HOUR',
    subtitle: 'neon nights on the coast',
    grain: 0.35,
    vignette: 0.55,
    halftone: false,
    // Short wide side panels crop portrait photos hard; the bundled samples
    // keep their faces near the top, so the defaults pan those panels down
    // until the faces show. The user can drag any panel to re-frame it.
    panels: [
      defaultPanel(0),
      { ...defaultPanel(1), oy: 0.5 },
      { ...defaultPanel(0), oy: 0.7 },
      { ...defaultPanel(1), oy: 0.5 },
    ],
  };
}

// Draws one photo into a panel rectangle, cover-fit, with the panel's zoom
// and pan applied. Falls back to a gradient placeholder when no photo.
function drawPanelPhoto(ctx, photo, panel, px, py, pw, ph, grade) {
  if (!photo) {
    const g = ctx.createLinearGradient(px, py, px + pw, py + ph);
    g.addColorStop(0, '#3a1c5e');
    g.addColorStop(0.55, '#c22a72');
    g.addColorStop(1, '#ff7a3d');
    ctx.fillStyle = g;
    ctx.fillRect(px, py, pw, ph);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = `700 ${Math.max(14, ph * 0.06)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('+ add a photo', px + pw / 2, py + ph / 2);
    return;
  }
  const iw = photo.naturalWidth || photo.width;
  const ih = photo.naturalHeight || photo.height;
  const zoom = panel.zoom ?? 1;
  const ox = panel.ox ?? 0;
  const oy = panel.oy ?? 0;
  const base = Math.max(pw / iw, ph / ih) * zoom;
  const dw = iw * base;
  const dh = ih * base;
  // Pan, clamped so the photo always covers the whole panel: a pan that
  // would expose the poster board behind the photo is pulled back to the
  // edge instead. (A fixed oy that frames a face on a wide cover would
  // otherwise push the photo out of a short square panel entirely.)
  const dx = Math.min(px, Math.max(px + pw - dw, px + (pw - dw) / 2 + ox * pw));
  const dy = Math.min(py, Math.max(py + ph - dh, py + (ph - dh) / 2 + oy * ph));
  ctx.save();
  ctx.filter = `saturate(${grade.saturate}) contrast(${grade.contrast})`;
  ctx.drawImage(photo, dx, dy, dw, dh);
  ctx.restore();
}

// Gradient-map grade overlay over one panel rectangle.
function gradePanel(ctx, px, py, pw, ph, grade) {
  const g = ctx.createLinearGradient(px, py, px, py + ph);
  g.addColorStop(0, grade.top);
  g.addColorStop(0.5, grade.mid);
  g.addColorStop(1, grade.bottom);
  ctx.save();
  ctx.globalCompositeOperation = grade.overlay;
  ctx.globalAlpha = grade.overlayAlpha;
  ctx.fillStyle = g;
  ctx.fillRect(px, py, pw, ph);
  ctx.restore();
  ctx.save();
  ctx.fillStyle = grade.wash;
  ctx.fillRect(px, py, pw, ph);
  ctx.restore();
}

// Deterministic grain: a seeded speckle pattern drawn over the cover.
function drawGrain(ctx, w, h, amount, seed) {
  if (amount <= 0) return;
  let s = seed;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const step = 3;
  ctx.save();
  ctx.globalAlpha = 0.16 * amount;
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const v = rnd();
      if (v > 0.72) {
        ctx.fillStyle = v > 0.86 ? '#ffffff' : '#000000';
        ctx.fillRect(x, y, 1.6, 1.6);
      }
    }
  }
  ctx.restore();
}

// Halftone dots in the top band, comic-poster style.
function drawHalftone(ctx, w, h, grade) {
  const band = h * 0.16;
  ctx.save();
  ctx.fillStyle = grade.title[2];
  for (let y = 6; y < band; y += 14) {
    for (let x = 6 + (y % 28 === 6 ? 7 : 0); x < w; x += 14) {
      const r = Math.max(0.8, 3.4 * (1 - y / band));
      ctx.globalAlpha = 0.5 * (1 - y / band) + 0.12;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawVignette(ctx, w, h, amount) {
  if (amount <= 0) return;
  const g = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.36, w / 2, h / 2, Math.max(w, h) * 0.75,
  );
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${0.5 * amount})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

// A low sun disc with rays, drawn in the backdrop of the tilted layout.
function drawSun(ctx, cx, cy, r, grade) {
  const g = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
  g.addColorStop(0, '#fff3c4');
  g.addColorStop(0.5, grade.title[1]);
  g.addColorStop(1, grade.title[2]);
  ctx.save();
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = grade.title[0];
  ctx.lineWidth = Math.max(2, r * 0.05);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r * 1.15, cy + Math.sin(a) * r * 1.15);
    ctx.lineTo(cx + Math.cos(a) * r * 1.45, cy + Math.sin(a) * r * 1.45);
    ctx.stroke();
  }
  ctx.restore();
}

// Bold poster lettering: gradient-filled Anton capitals with a dark outline,
// a soft drop shadow and a slight tilt, plus a Pacifico script subtitle.
function drawLettering(ctx, state, grade, zone, w, h) {
  const zx = zone.x * w;
  const zy = zone.y * h;
  const zw = zone.w * w;
  const zh = zone.h * h;
  const caption = (state.caption || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim();
  ctx.save();
  ctx.translate(zx + zw / 2, zy + zh / 2);
  ctx.rotate(-0.02);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (caption) {
    let size = zh * 0.62;
    ctx.font = `${size}px Anton, 'Arial Black', sans-serif`;
    while (ctx.measureText(caption).width > zw * 0.98 && size > 10) {
      size -= 2;
      ctx.font = `${size}px Anton, 'Arial Black', sans-serif`;
    }
    const grad = ctx.createLinearGradient(0, -size / 2, 0, size / 2);
    grad.addColorStop(0, grade.title[0]);
    grad.addColorStop(0.5, grade.title[1]);
    grad.addColorStop(1, grade.title[2]);
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(2, size * 0.09);
    ctx.strokeStyle = grade.titleStroke;
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = size * 0.16;
    ctx.shadowOffsetY = size * 0.05;
    ctx.strokeText(caption, 0, -zh * 0.08);
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = grad;
    ctx.fillText(caption, 0, -zh * 0.08);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }
  if (subtitle) {
    const sSize = Math.min(zh * 0.34, zw * 0.055);
    ctx.font = `${sSize}px Pacifico, cursive`;
    ctx.lineWidth = Math.max(2, sSize * 0.12);
    ctx.strokeStyle = 'rgba(20,0,30,0.85)';
    ctx.shadowColor = grade.title[2];
    ctx.shadowBlur = sSize * 0.5;
    ctx.strokeText(subtitle, 0, zh * 0.34);
    ctx.fillStyle = grade.sub;
    ctx.fillText(subtitle, 0, zh * 0.34);
  }
  ctx.restore();
}

// Draws the whole cover for `state` onto `canvas` at its own pixel size.
// photos: array of Image objects (or nulls). opts.frame: draw the cream
// poster frame and gutters (true for export, false for a bare preview).
export function drawCover(canvas, state, photos, opts = {}) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const layout = LAYOUTS[state.layout] || LAYOUTS['hero-and-three'];
  const grade = GRADES[state.grade] || GRADES.sunset;
  const frame = opts.frame !== false;
  const gap = frame ? Math.max(6, w * 0.008) : 0;
  const border = frame ? Math.max(10, w * 0.018) : 0;

  // Cream poster board.
  ctx.fillStyle = '#fff4e0';
  ctx.fillRect(0, 0, w, h);

  if (layout.backdrop) {
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, grade.top);
    bg.addColorStop(0.55, grade.mid);
    bg.addColorStop(1, grade.bottom);
    ctx.fillStyle = bg;
    ctx.fillRect(border, border, w - border * 2, h - border * 2);
    // No sun here: the title band sits at the top and the panels fill the
    // rest, so a sun would hide behind lettering or a photo.
  }

  // Panels.
  layout.panels.forEach((panel, i) => {
    const p = state.panels[i] || defaultPanel(0);
    const px = border + panel.x * (w - border * 2);
    const py = border + panel.y * (h - border * 2);
    const pw = panel.w * (w - border * 2) - (frame ? gap : 0);
    const ph = panel.h * (h - border * 2) - (frame ? gap : 0);
    ctx.save();
    if (panel.tilt) {
      ctx.translate(px + pw / 2, py + ph / 2);
      ctx.rotate((panel.tilt * Math.PI) / 180);
      ctx.translate(-pw / 2, -ph / 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-gap, -gap, pw + gap * 2, ph + gap * 2);
      ctx.beginPath();
      ctx.rect(0, 0, pw, ph);
      ctx.clip();
      drawPanelPhoto(ctx, photos[p.photo] ?? null, p, 0, 0, pw, ph, grade);
      gradePanel(ctx, 0, 0, pw, ph, grade);
      ctx.restore();
      // No extra stroke: the white mat painted behind the photo already
      // frames it, and a stroked edge would paint over neighbouring panels.
    } else {
      ctx.beginPath();
      ctx.rect(px, py, pw, ph);
      ctx.clip();
      drawPanelPhoto(ctx, photos[p.photo] ?? null, p, px, py, pw, ph, grade);
      gradePanel(ctx, px, py, pw, ph, grade);
      ctx.restore();
      if (frame) {
        ctx.strokeStyle = '#fff4e0';
        ctx.lineWidth = gap;
        ctx.strokeRect(px, py, pw, ph);
      }
    }
  });

  // A dark scrim behind the title zone so lettering reads on any photo,
  // fading out below the zone so it never ends in a hard stripe.
  const tz = layout.titleZone;
  const scrimH = Math.min(tz.h * 1.3, 1 - tz.y) * h;
  const scrim = ctx.createLinearGradient(0, tz.y * h, 0, tz.y * h + scrimH);
  scrim.addColorStop(0, 'rgba(10,0,20,0)');
  scrim.addColorStop(0.3, 'rgba(10,0,20,0.42)');
  scrim.addColorStop(0.6, 'rgba(10,0,20,0.5)');
  scrim.addColorStop(1, 'rgba(10,0,20,0)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, tz.y * h, w, scrimH);

  if (state.halftone) drawHalftone(ctx, w, h, grade);
  drawLettering(ctx, state, grade, tz, w, h);
  drawVignette(ctx, w, h, state.vignette);
  drawGrain(ctx, w, h, state.grain, 1337);

  if (frame) {
    ctx.strokeStyle = '#fff4e0';
    ctx.lineWidth = border;
    ctx.strokeRect(border / 2, border / 2, w - border, h - border);
  }
  return canvas;
}

// Panel rectangles in canvas pixels, for hit-testing drags in the editor.
export function panelRects(canvas, state) {
  const w = canvas.width;
  const h = canvas.height;
  const layout = LAYOUTS[state.layout] || LAYOUTS['hero-and-three'];
  const border = Math.max(10, w * 0.018);
  return layout.panels.map((panel) => ({
    x: border + panel.x * (w - border * 2),
    y: border + panel.y * (h - border * 2),
    w: panel.w * (w - border * 2),
    h: panel.h * (h - border * 2),
  }));
}
