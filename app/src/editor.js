// editor.js — the Vice Hour studio: controls, state, history, export.
//
// Everything on the page is wired here. One state object describes the
// cover; every control edits it and calls refresh(), which repaints the
// preview canvas through render.js. Exports call the same painter on a
// full-size offscreen canvas, so the PNG is the preview, only bigger.

import { GRADE_CATALOG, findGrade, produceGradedPhoto } from './palette.js';
import { LAYOUT_CATALOG, computeLayout, pointInsidePanel } from './geometry.js';
import { TITLE_TREATMENTS, paintCover } from './render.js';
import { parseShotQuery, applyShotToState, installExportProbe } from './shotmode.js';

const EXPORT_SIZES = [
  { key: '1080x1080', w: 1080, h: 1080, label: 'Square 1080 × 1080' },
  { key: '1080x1350', w: 1080, h: 1350, label: 'Portrait 1080 × 1350' },
  { key: '1920x1080', w: 1920, h: 1080, label: 'Wide 1920 × 1080' },
  { key: '1080x1920', w: 1080, h: 1920, label: 'Story 1080 × 1920' },
];

const DECO_DEFS = [
  { key: 'badge', label: 'Starburst badge' },
  { key: 'stars', label: 'Heat stars' },
  { key: 'issue', label: 'Issue line' },
  { key: 'barcode', label: 'Barcode chip' },
  { key: 'leak', label: 'Light leaks' },
  { key: 'grain', label: 'Film grain' },
  { key: 'vignette', label: 'Vignette' },
  { key: 'halftone', label: 'Halftone shade' },
];

const PRESET_LOOKS = [
  {
    name: 'Sunset Strip', layout: 'hero-and-three', grade: 'sunset', treatment: 'gradient',
    caption: 'VICE HOUR', subtitle: 'one last ride', ink: false,
    deco: { badge: true, stars: true, issue: true, barcode: true, leak: true, grain: true, vignette: true, halftone: false },
  },
  {
    name: 'Neon Nights', layout: 'grid-4', grade: 'neon', treatment: 'outline-chrome',
    caption: 'NEON NIGHTS', subtitle: 'the city never sleeps', ink: false,
    deco: { badge: true, stars: true, issue: false, barcode: false, leak: true, grain: false, vignette: true, halftone: true },
  },
  {
    name: 'Golden Poster', layout: 'masthead', grade: 'gold-hour', treatment: 'gradient',
    caption: 'GOLDEN HOUR', subtitle: 'chasing daylight', ink: false,
    deco: { badge: false, stars: true, issue: true, barcode: true, leak: false, grain: true, vignette: false, halftone: false },
  },
  {
    name: 'Noir Drive', layout: 'duo-split', grade: 'noir', treatment: 'halftone-block',
    caption: 'NIGHT DRIVE', subtitle: 'no way back', ink: true,
    deco: { badge: false, stars: false, issue: true, barcode: true, leak: false, grain: true, vignette: true, halftone: false },
  },
  {
    name: 'Heat Wall', layout: 'poster-wall', grade: 'miami-heat', treatment: 'gradient',
    caption: 'MIAMI HEAT', subtitle: 'feel the burn', ink: true,
    deco: { badge: true, stars: true, issue: true, barcode: false, leak: true, grain: true, vignette: true, halftone: false },
  },
];

function freshState() {
  return {
    layout: 'hero-and-three',
    grade: 'sunset',
    treatment: 'gradient',
    caption: 'VICE HOUR',
    subtitle: 'one last ride',
    badgeText: 'HOT',
    ink: false,
    sizeKey: '1080x1080',
    deco: { badge: true, stars: true, issue: true, barcode: false, leak: true, grain: true, vignette: true, halftone: false },
    panels: Array.from({ length: 9 }, (_, i) => ({ photo: i % 2, zoom: 1, ox: 0, oy: 0 })),
  };
}

const state = freshState();
const photos = []; // { img, name }
const gradedCache = new Map();
let activePanel = 0;
let undoStack = [];
let redoStack = [];
let historyTimer = null;

const el = (id) => document.getElementById(id);
const canvas = el('stageCanvas');
const pen = canvas.getContext('2d');

function currentSize() {
  return EXPORT_SIZES.find((s) => s.key === state.sizeKey) || EXPORT_SIZES[0];
}

function gradedFor(photoIndex) {
  const photo = photos[photoIndex];
  if (!photo) return null;
  const key = `${photoIndex}|${state.grade}|${state.ink ? 'ink' : 'plain'}`;
  if (!gradedCache.has(key)) {
    gradedCache.set(key, produceGradedPhoto(photo.img, findGrade(state.grade), state.ink));
  }
  return gradedCache.get(key);
}

function imagesForPaint() {
  return photos.map((_, i) => gradedFor(i));
}

function previewDims() {
  const size = currentSize();
  const scale = Math.min(1, 1150 / Math.max(size.w, size.h));
  return { w: Math.round(size.w * scale), h: Math.round(size.h * scale) };
}

function refresh() {
  const dims = previewDims();
  if (canvas.width !== dims.w || canvas.height !== dims.h) {
    canvas.width = dims.w;
    canvas.height = dims.h;
  }
  paintCover(pen, dims.w, dims.h, state, imagesForPaint());
  markActiveButtons();
  el('statusLine').textContent = `${LAYOUT_CATALOG.find((l) => l.id === state.layout).label} · ${findGrade(state.grade).label} · ${state.sizeKey}`;
}

// ---------- history ----------

function snapshot() {
  return JSON.stringify({
    layout: state.layout, grade: state.grade, treatment: state.treatment,
    caption: state.caption, subtitle: state.subtitle, badgeText: state.badgeText,
    ink: state.ink, sizeKey: state.sizeKey, deco: state.deco, panels: state.panels,
  });
}

function queueHistory() {
  if (historyTimer) clearTimeout(historyTimer);
  historyTimer = setTimeout(() => {
    const snap = snapshot();
    if (undoStack[undoStack.length - 1] !== snap) {
      undoStack.push(snap);
      if (undoStack.length > 60) undoStack.shift();
      redoStack = [];
    }
    syncHistoryButtons();
  }, 250);
}

function restore(snap) {
  const data = JSON.parse(snap);
  Object.assign(state, data);
  state.deco = { ...data.deco };
  state.panels = data.panels.map((p) => ({ ...p }));
  syncControls();
  refresh();
}

function syncHistoryButtons() {
  el('undoBtn').disabled = undoStack.length <= 1;
  el('redoBtn').disabled = redoStack.length === 0;
}

function undo() {
  if (undoStack.length <= 1) return;
  redoStack.push(undoStack.pop());
  restore(undoStack[undoStack.length - 1]);
  syncHistoryButtons();
}

function redo() {
  if (redoStack.length === 0) return;
  const snap = redoStack.pop();
  undoStack.push(snap);
  restore(snap);
  syncHistoryButtons();
}

// ---------- photos ----------

function loadPhotoSource(src, name) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ img, name });
    img.onerror = reject;
    img.src = src;
  });
}

async function addPhoto(src, name) {
  const photo = await loadPhotoSource(src, name);
  photos.push(photo);
  gradedCache.clear();
  buildPhotoStrip();
  buildPanelPhotoPick();
  refresh();
  return photo;
}

function buildPhotoStrip() {
  const strip = el('photoStrip');
  strip.textContent = '';
  photos.forEach((photo, i) => {
    const thumb = document.createElement('button');
    thumb.type = 'button';
    thumb.className = 'thumb';
    thumb.title = photo.name;
    const img = document.createElement('img');
    img.src = photo.img.src;
    img.alt = photo.name;
    thumb.appendChild(img);
    const tag = document.createElement('span');
    tag.textContent = `P${i + 1}`;
    thumb.appendChild(tag);
    thumb.addEventListener('click', () => {
      state.panels[activePanel].photo = i;
      queueHistory();
      refresh();
      buildPanelPhotoPick();
    });
    strip.appendChild(thumb);
  });
}

// ---------- control builders ----------

function buttonGrid(container, items, isActive, onPick) {
  container.textContent = '';
  items.forEach((item) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pick' + (isActive(item) ? ' on' : '');
    btn.textContent = item.label || item.name;
    btn.dataset.pickId = item.id || item.name;
    btn.addEventListener('click', () => onPick(item));
    container.appendChild(btn);
  });
}

function markActiveButtons() {
  document.querySelectorAll('#layoutGrid .pick').forEach((b) => b.classList.toggle('on', b.dataset.pickId === state.layout));
  document.querySelectorAll('#gradeGrid .pick').forEach((b) => b.classList.toggle('on', b.dataset.pickId === state.grade));
  document.querySelectorAll('#treatmentGrid .pick').forEach((b) => b.classList.toggle('on', b.dataset.pickId === state.treatment));
}

function buildPickers() {
  buttonGrid(el('layoutGrid'), LAYOUT_CATALOG, (i) => i.id === state.layout, (item) => {
    state.layout = item.id;
    queueHistory();
    refresh();
  });
  buttonGrid(el('gradeGrid'), GRADE_CATALOG, (i) => i.id === state.grade, (item) => {
    state.grade = item.id;
    queueHistory();
    refresh();
  });
  buttonGrid(el('treatmentGrid'), TITLE_TREATMENTS, (i) => i.id === state.treatment, (item) => {
    state.treatment = item.id;
    queueHistory();
    refresh();
  });
  const decoList = el('decoList');
  decoList.textContent = '';
  DECO_DEFS.forEach((def) => {
    const label = document.createElement('label');
    label.className = 'check';
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = state.deco[def.key];
    box.dataset.decoKey = def.key;
    box.addEventListener('change', () => {
      state.deco[def.key] = box.checked;
      queueHistory();
      refresh();
    });
    label.appendChild(box);
    label.appendChild(document.createTextNode(def.label));
    decoList.appendChild(label);
  });
  const sizePick = el('sizePick');
  sizePick.textContent = '';
  EXPORT_SIZES.forEach((size) => {
    const opt = document.createElement('option');
    opt.value = size.key;
    opt.textContent = size.label;
    sizePick.appendChild(opt);
  });
  sizePick.value = state.sizeKey;
}

function buildPanelEditor() {
  const pick = el('panelPick');
  pick.textContent = '';
  for (let i = 0; i < 9; i += 1) {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = `Panel ${i + 1}`;
    pick.appendChild(opt);
  }
  pick.value = String(activePanel);
  buildPanelPhotoPick();
  el('zoomRange').value = String(Math.round((state.panels[activePanel].zoom || 1) * 100));
}

function buildPanelPhotoPick() {
  const holder = el('panelPhotoPick');
  holder.textContent = '';
  photos.forEach((photo, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pick small' + (state.panels[activePanel].photo === i ? ' on' : '');
    btn.textContent = `Photo ${i + 1}`;
    btn.addEventListener('click', () => {
      state.panels[activePanel].photo = i;
      queueHistory();
      refresh();
      buildPanelPhotoPick();
    });
    holder.appendChild(btn);
  });
  const swap = el('swapBtn');
  swap.disabled = photos.length < 2;
}

function syncControls() {
  el('captionInput').value = state.caption;
  el('subtitleInput').value = state.subtitle;
  el('badgeInput').value = state.badgeText;
  el('inkToggle').checked = state.ink;
  el('sizePick').value = state.sizeKey;
  document.querySelectorAll('#decoList input[type="checkbox"]').forEach((box) => {
    box.checked = Boolean(state.deco[box.dataset.decoKey]);
  });
  buildPanelEditor();
  markActiveButtons();
}

// ---------- export ----------

function renderPngBlob(w, h) {
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  paintCover(off.getContext('2d'), w, h, state, imagesForPaint());
  return new Promise((resolve) => off.toBlob(resolve, 'image/png'));
}

async function downloadPng(w, h) {
  const blob = await renderPngBlob(w, h);
  if (!blob) return;
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `vice-hour-${w}x${h}.png`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 4000);
  el('statusLine').textContent = `Exported PNG ${w} × ${h} (${Math.round(blob.size / 1024)} KiB)`;
}

// ---------- canvas interaction ----------

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (canvas.width / rect.width),
    y: (event.clientY - rect.top) * (canvas.height / rect.height),
  };
}

function panelAt(x, y) {
  const layout = computeLayout(state.layout, canvas.width, canvas.height);
  for (let i = layout.panels.length - 1; i >= 0; i -= 1) {
    if (pointInsidePanel(layout.panels[i], x, y)) return i;
  }
  return -1;
}

let drag = null;

function wireCanvas() {
  canvas.addEventListener('pointerdown', (event) => {
    const point = canvasPoint(event);
    const index = panelAt(point.x, point.y);
    if (index < 0) return;
    activePanel = index;
    buildPanelEditor();
    drag = { index, startX: point.x, startY: point.y, ox: state.panels[index].ox, oy: state.panels[index].oy };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const point = canvasPoint(event);
    const panel = state.panels[drag.index];
    panel.ox = Math.max(-0.5, Math.min(0.5, drag.ox + (point.x - drag.startX) / canvas.width));
    panel.oy = Math.max(-0.5, Math.min(0.5, drag.oy + (point.y - drag.startY) / canvas.height));
    refresh();
  });
  canvas.addEventListener('pointerup', () => {
    if (drag) queueHistory();
    drag = null;
  });
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    const point = canvasPoint(event);
    const index = panelAt(point.x, point.y);
    if (index < 0) return;
    activePanel = index;
    const panel = state.panels[index];
    panel.zoom = Math.max(1, Math.min(3.2, panel.zoom * (event.deltaY < 0 ? 1.08 : 0.93)));
    buildPanelEditor();
    queueHistory();
    refresh();
  }, { passive: false });
}

// ---------- wiring ----------

function wireControls() {
  el('photoFiles').addEventListener('change', async (event) => {
    const files = Array.from(event.target.files || []);
    for (const file of files) {
      await addPhoto(URL.createObjectURL(file), file.name);
    }
    queueHistory();
  });
  el('sampleBoulevard').addEventListener('click', () => addPhoto('samples/boulevard.jpg', 'Boulevard sample'));
  el('samplePier').addEventListener('click', () => addPhoto('samples/pier.jpg', 'Pier sample'));
  el('captionInput').addEventListener('input', (event) => { state.caption = event.target.value; queueHistory(); refresh(); });
  el('subtitleInput').addEventListener('input', (event) => { state.subtitle = event.target.value; queueHistory(); refresh(); });
  el('badgeInput').addEventListener('input', (event) => { state.badgeText = event.target.value; queueHistory(); refresh(); });
  el('inkToggle').addEventListener('change', (event) => { state.ink = event.target.checked; queueHistory(); refresh(); });
  el('sizePick').addEventListener('change', (event) => { state.sizeKey = event.target.value; queueHistory(); refresh(); });
  el('panelPick').addEventListener('change', (event) => { activePanel = parseInt(event.target.value, 10); buildPanelEditor(); });
  el('zoomRange').addEventListener('input', (event) => {
    state.panels[activePanel].zoom = parseInt(event.target.value, 10) / 100;
    queueHistory();
    refresh();
  });
  el('swapBtn').addEventListener('click', () => {
    const layout = computeLayout(state.layout, canvas.width, canvas.height);
    const count = Math.max(2, layout.panels.length);
    const other = (activePanel + 1) % count;
    const held = state.panels[activePanel];
    state.panels[activePanel] = state.panels[other];
    state.panels[other] = held;
    queueHistory();
    buildPanelPhotoPick();
    refresh();
  });
  el('undoBtn').addEventListener('click', undo);
  el('redoBtn').addEventListener('click', redo);
  el('shuffleBtn').addEventListener('click', () => {
    const pick = (list) => list[Math.floor(Math.random() * list.length)];
    state.layout = pick(LAYOUT_CATALOG).id;
    state.grade = pick(GRADE_CATALOG).id;
    state.treatment = pick(TITLE_TREATMENTS).id;
    state.ink = Math.random() > 0.6;
    for (const key of Object.keys(state.deco)) state.deco[key] = Math.random() > 0.35;
    state.panels.forEach((panel) => { panel.photo = Math.floor(Math.random() * Math.max(1, photos.length)); });
    syncControls();
    queueHistory();
    refresh();
  });
  el('exportBtn').addEventListener('click', () => {
    const size = currentSize();
    downloadPng(size.w, size.h);
  });
  el('exportAllBtn').addEventListener('click', async () => {
    for (const size of EXPORT_SIZES) {
      await downloadPng(size.w, size.h);
    }
  });
  const presetRow = el('presetRow');
  PRESET_LOOKS.forEach((preset) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pick preset';
    btn.textContent = preset.name;
    btn.addEventListener('click', () => {
      state.layout = preset.layout;
      state.grade = preset.grade;
      state.treatment = preset.treatment;
      state.caption = preset.caption;
      state.subtitle = preset.subtitle;
      state.ink = preset.ink;
      state.deco = { ...preset.deco };
      syncControls();
      queueHistory();
      refresh();
    });
    presetRow.appendChild(btn);
  });
}

// ---------- boot ----------

async function boot() {
  buildPickers();
  wireControls();
  wireCanvas();
  installExportProbe(renderPngBlob);
  const request = parseShotQuery(window.location.search);
  await addPhoto('samples/boulevard.jpg', 'Boulevard sample');
  await addPhoto('samples/pier.jpg', 'Pier sample');
  try {
    await Promise.all([
      document.fonts.load('90px Anton'),
      document.fonts.load('40px Pacifico'),
    ]);
    await document.fonts.ready;
  } catch (err) {
    void err;
  }
  if (request) {
    applyShotToState(state, request);
    if (request.size) {
      const match = EXPORT_SIZES.find((s) => s.w === request.size.w && s.h === request.size.h);
      if (match) state.sizeKey = match.key;
      else {
        EXPORT_SIZES.push({ key: `${request.size.w}x${request.size.h}`, w: request.size.w, h: request.size.h, label: 'Shot size' });
        state.sizeKey = `${request.size.w}x${request.size.h}`;
      }
    }
    if (request.shot === 'cover') document.body.classList.add('shot-cover');
    syncControls();
  }
  undoStack = [snapshot()];
  syncHistoryButtons();
  refresh();
  if (request) {
    await window.__runExportProbe();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      window.__shotReady = true;
    }));
  }
}

boot();
