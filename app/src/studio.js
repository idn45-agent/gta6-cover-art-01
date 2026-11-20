// studio.js — the Vice Hour editor: state, history, controls and export.
// Everything the visitor touches lives here; all drawing is delegated to
// painter.js so the preview and the downloaded PNG can never drift apart.

import { paintCover } from './painter.js';
import { GRADE_BOOK, GRADE_IDS, seededRandom } from './tones.js';
import { LAYOUT_IDS, LAYOUT_LABELS, layoutFor, panelCount } from './frames.js';
import { runShotMode } from './shotmode.js';

const $ = (id) => document.getElementById(id);
const canvas = $('stage-canvas');
const ctx = canvas.getContext('2d');

const PREVIEW_W = 1080;
const PREVIEW_H = 1080;

export const LOOK_RECIPES = [
  {
    name: 'Sunset Heist',
    layout: 'hero-and-three', grade: 'sunset', treatment: 'gradient', ink: false,
    decos: { badge: true, stars: true, issue: true, barcode: false, leak: true, grain: false, vignette: true, halftone: false },
  },
  {
    name: 'Neon Nights',
    layout: 'grid-4', grade: 'neon', treatment: 'outline-chrome', ink: true,
    decos: { badge: true, stars: false, issue: true, barcode: true, leak: false, grain: true, vignette: true, halftone: true },
  },
  {
    name: 'Magazine Cover',
    layout: 'masthead', grade: 'gold-hour', treatment: 'halftone-block', ink: false,
    decos: { badge: false, stars: true, issue: true, barcode: true, leak: false, grain: false, vignette: false, halftone: false },
  },
  {
    name: 'Poster Wall',
    layout: 'poster-wall', grade: 'miami-heat', treatment: 'gradient', ink: true,
    decos: { badge: true, stars: false, issue: true, barcode: false, leak: true, grain: true, vignette: true, halftone: false },
  },
  {
    name: 'Midnight Run',
    layout: 'story-stack', grade: 'midnight-drive', treatment: 'outline-chrome', ink: false,
    decos: { badge: false, stars: true, issue: false, barcode: false, leak: true, grain: true, vignette: true, halftone: false },
  },
];

function blankPanels(count) {
  const out = [];
  for (let i = 0; i < count; i++) out.push({ img: -1, zoom: 1, ox: 0, oy: 0 });
  return out;
}

function freshState() {
  return {
    layout: 'hero-and-three',
    grade: 'sunset',
    treatment: 'gradient',
    caption: 'VICE HOUR',
    subtitle: 'one last ride',
    badgeText: 'VICE HOUR',
    issueText: 'VOL. 06 — LEONIDA',
    ink: false,
    panels: blankPanels(9),
    decos: { badge: true, stars: true, issue: true, barcode: false, leak: true, grain: false, vignette: true, halftone: false },
  };
}

let state = freshState();
let photos = []; // { img: HTMLImageElement, name: string }
let selectedPanel = 0;
let undoStack = [];
let redoStack = [];

function snapshot() {
  return JSON.stringify(state);
}

function commit() {
  undoStack.push(snapshot());
  if (undoStack.length > 60) undoStack.shift();
  redoStack = [];
}

function restore(json) {
  state = JSON.parse(json);
  syncControls();
  redraw();
}

function redraw() {
  canvas.width = PREVIEW_W;
  canvas.height = PREVIEW_H;
  paintCover(ctx, PREVIEW_W, PREVIEW_H, state, photos.map((p) => p.img));
}

// ---------- photo loading ----------

function loadImageFromUrl(url, name) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ img, name });
    img.onerror = reject;
    img.src = url;
  });
}

async function addSample(which) {
  const entry = await loadImageFromUrl(`samples/${which}.jpg`, `Sample ${which}`);
  photos.push(entry);
  const idx = photos.length - 1;
  // Fill the first empty panels with the new photo.
  state.panels.forEach((p) => { if (p.img < 0) p.img = idx; });
  if (state.panels[0].img < 0) state.panels[0].img = idx;
  refreshPhotoUi();
  redraw();
}

function refreshPhotoUi() {
  const strip = $('photo-strip');
  strip.innerHTML = '';
  photos.forEach((p, i) => {
    const thumb = document.createElement('img');
    thumb.src = p.img.src;
    thumb.alt = p.name;
    thumb.title = p.name;
    thumb.addEventListener('click', () => {
      commit();
      state.panels[selectedPanel].img = i;
      refreshPhotoUi();
      redraw();
    });
    strip.appendChild(thumb);
  });
  const picker = $('panel-photo');
  picker.innerHTML = '';
  const none = document.createElement('option');
  none.value = '-1';
  none.textContent = 'Painted sunset (none)';
  picker.appendChild(none);
  photos.forEach((p, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = p.name;
    picker.appendChild(opt);
  });
  const view = state.panels[selectedPanel];
  if (view) picker.value = String(view.img);
  const zoom = $('panel-zoom');
  if (view) zoom.value = String(view.zoom);
}

function refreshPanelPicker() {
  const sel = $('panel-select');
  sel.innerHTML = '';
  const n = panelCount(state.layout);
  for (let i = 0; i < n; i++) {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = `Panel ${i + 1}`;
    sel.appendChild(opt);
  }
  if (selectedPanel >= n) selectedPanel = 0;
  sel.value = String(selectedPanel);
}

// ---------- control wiring ----------

function syncControls() {
  $('layout-select').value = state.layout;
  $('grade-select').value = state.grade;
  $('treatment-select').value = state.treatment;
  $('caption-input').value = state.caption;
  $('subtitle-input').value = state.subtitle;
  $('badge-input').value = state.badgeText;
  $('issue-input').value = state.issueText;
  $('ink-toggle').checked = state.ink;
  document.querySelectorAll('[data-deco]').forEach((box) => {
    box.checked = !!state.decos[box.dataset.deco];
  });
  refreshPanelPicker();
  refreshPhotoUi();
}

function wireControls() {
  const layoutSel = $('layout-select');
  LAYOUT_IDS.forEach((id) => {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = LAYOUT_LABELS[id];
    layoutSel.appendChild(opt);
  });
  const gradeSel = $('grade-select');
  GRADE_IDS.forEach((id) => {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = GRADE_BOOK[id].label;
    gradeSel.appendChild(opt);
  });
  const grid = $('preset-grid');
  LOOK_RECIPES.forEach((recipe) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = recipe.name;
    btn.addEventListener('click', () => {
      commit();
      state.layout = recipe.layout;
      state.grade = recipe.grade;
      state.treatment = recipe.treatment;
      state.ink = recipe.ink;
      state.decos = { ...recipe.decos };
      syncControls();
      redraw();
    });
    grid.appendChild(btn);
  });

  layoutSel.addEventListener('change', () => { commit(); state.layout = layoutSel.value; refreshPanelPicker(); redraw(); });
  gradeSel.addEventListener('change', () => { commit(); state.grade = gradeSel.value; redraw(); });
  $('treatment-select').addEventListener('change', (e) => { commit(); state.treatment = e.target.value; redraw(); });
  $('caption-input').addEventListener('input', (e) => { state.caption = e.target.value; redraw(); });
  $('subtitle-input').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
  $('badge-input').addEventListener('input', (e) => { state.badgeText = e.target.value; redraw(); });
  $('issue-input').addEventListener('input', (e) => { state.issueText = e.target.value; redraw(); });
  $('ink-toggle').addEventListener('change', (e) => { commit(); state.ink = e.target.checked; redraw(); });
  document.querySelectorAll('[data-deco]').forEach((box) => {
    box.addEventListener('change', () => { commit(); state.decos[box.dataset.deco] = box.checked; redraw(); });
  });

  $('file-input').addEventListener('change', async (e) => {
    const files = [...e.target.files];
    for (const file of files) {
      const url = URL.createObjectURL(file);
      const entry = await loadImageFromUrl(url, file.name);
      photos.push(entry);
      const idx = photos.length - 1;
      state.panels.forEach((p) => { if (p.img < 0) p.img = idx; });
    }
    refreshPhotoUi();
    redraw();
  });
  $('btn-sample-pier').addEventListener('click', () => addSample('pier'));
  $('btn-sample-boulevard').addEventListener('click', () => addSample('boulevard'));

  $('panel-select').addEventListener('change', (e) => {
    selectedPanel = Number(e.target.value);
    refreshPhotoUi();
  });
  $('panel-photo').addEventListener('change', (e) => {
    commit();
    state.panels[selectedPanel].img = Number(e.target.value);
    redraw();
  });
  $('panel-zoom').addEventListener('input', (e) => {
    state.panels[selectedPanel].zoom = Number(e.target.value);
    redraw();
  });
  $('btn-swap').addEventListener('click', () => {
    commit();
    const a = state.panels[0];
    state.panels[0] = state.panels[1];
    state.panels[1] = a;
    refreshPhotoUi();
    redraw();
  });

  $('btn-undo').addEventListener('click', () => {
    if (!undoStack.length) return;
    redoStack.push(snapshot());
    restore(undoStack.pop());
  });
  $('btn-redo').addEventListener('click', () => {
    if (!redoStack.length) return;
    undoStack.push(snapshot());
    restore(redoStack.pop());
  });
  $('btn-shuffle').addEventListener('click', () => {
    commit();
    const rand = seededRandom(Date.now() % 100000);
    const pick = (arr) => arr[Math.floor(rand() * arr.length)];
    state.layout = pick(LAYOUT_IDS);
    state.grade = pick(GRADE_IDS);
    state.treatment = pick(['gradient', 'halftone-block', 'outline-chrome']);
    state.ink = rand() > 0.55;
    Object.keys(state.decos).forEach((k) => { state.decos[k] = rand() > 0.45; });
    if (photos.length) {
      state.panels.forEach((p) => { p.img = Math.floor(rand() * photos.length); p.zoom = 1 + rand() * 0.5; });
    }
    syncControls();
    redraw();
  });

  document.querySelectorAll('[data-export]').forEach((btn) => {
    btn.addEventListener('click', () => exportSize(btn.dataset.export));
  });
  $('btn-export-all').addEventListener('click', () => {
    ['1080x1080', '1080x1350', '1920x1080', '1080x1920'].forEach((s, i) => {
      setTimeout(() => exportSize(s), i * 350);
    });
  });
}

// ---------- canvas interaction ----------

function panelAt(fx, fy) {
  const layout = layoutFor(state.layout, PREVIEW_W, PREVIEW_H);
  for (let i = layout.panels.length - 1; i >= 0; i--) {
    const p = layout.panels[i];
    if (fx >= p.x && fx <= p.x + p.w && fy >= p.y && fy <= p.y + p.h) return i;
  }
  return 0;
}

function wireCanvas() {
  let drag = null;
  const toFraction = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  };
  canvas.addEventListener('pointerdown', (e) => {
    const f = toFraction(e);
    selectedPanel = panelAt(f.x, f.y);
    $('panel-select').value = String(selectedPanel);
    refreshPhotoUi();
    drag = { x: e.clientX, y: e.clientY, moved: false };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const view = state.panels[selectedPanel];
    const r = canvas.getBoundingClientRect();
    view.ox += (e.clientX - drag.x) / r.width;
    view.oy += (e.clientY - drag.y) / r.height;
    drag = { x: e.clientX, y: e.clientY, moved: true };
    redraw();
  });
  canvas.addEventListener('pointerup', () => {
    if (drag && drag.moved) commit();
    drag = null;
  });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const view = state.panels[selectedPanel];
    view.zoom = Math.min(3, Math.max(1, view.zoom * (e.deltaY < 0 ? 1.07 : 0.94)));
    $('panel-zoom').value = String(view.zoom);
    redraw();
  }, { passive: false });
}

// ---------- export ----------

export function renderToCanvas(w, h, forState, forPhotos) {
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  paintCover(out.getContext('2d'), w, h, forState || state, (forPhotos || photos).map((p) => p.img || p));
  return out;
}

function download(canvasEl, label) {
  canvasEl.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-hour-${label}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }, 'image/png');
}

function exportSize(spec) {
  const [w, h] = spec.split('x').map(Number);
  download(renderToCanvas(w, h), spec);
}

// ---------- boot ----------

async function boot() {
  wireControls();
  wireCanvas();
  syncControls();
  redraw();
  const shot = new URLSearchParams(location.search).get('shot');
  if (shot !== null) {
    await runShotMode({ canvas, ctx, state, photos, loadImageFromUrl, renderToCanvas, redraw });
    // Reflect the pinned scene in the sidebar too (editor screenshot).
    refreshPanelPicker();
    refreshPhotoUi();
    return;
  }
  // Friendly first paint: both bundled samples in place.
  try {
    await addSample('pier');
    await addSample('boulevard');
    state.panels[0].img = 0;
    if (state.panels[1]) state.panels[1].img = 1;
    if (state.panels[2]) state.panels[2].img = 0;
    if (state.panels[3]) state.panels[3].img = 1;
    refreshPhotoUi();
    redraw();
  } catch {
    redraw();
  }
}

if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => { redraw(); });
}
boot();
