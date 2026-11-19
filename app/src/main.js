// Vice Hour editor: wires the controls to the cover engine. Photos live in
// `photos` (Image objects, loaded from the user's machine or the bundled
// samples); `state` is the whole cover description and every change pushes a
// snapshot onto the undo stack, so the cover is always one Ctrl+Z away from
// its previous look. A `?shot=` query sets up a fixed scene for a
// screenshot instead (./shots.js).
import { drawCover, defaultState, defaultPanel, LAYOUTS, GRADES, panelRects } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const statusEl = document.getElementById('status');
const captionInput = document.getElementById('caption');
const subtitleInput = document.getElementById('subtitle');
const layoutSelect = document.getElementById('layout');
const gradeSelect = document.getElementById('grade');
const grainInput = document.getElementById('grain');
const vignetteInput = document.getElementById('vignette');
const halftoneInput = document.getElementById('halftone');
const panelPhotoSelect = document.getElementById('panel-photo');
const zoomInput = document.getElementById('zoom');
const sizeSelect = document.getElementById('size');

export const SAMPLES = [
  { name: 'Boulevard', url: 'samples/boulevard.jpg' },
  { name: 'Pier', url: 'samples/pier.jpg' },
];

let photos = [null, null];
let photoNames = ['Boulevard', 'Pier'];
let state = defaultState();
let selectedPanel = 0;
let undoStack = [];
let redoStack = [];

/** Loads an image from a URL, resolving to the image once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function snapshot() {
  return JSON.stringify(state);
}

function pushUndo() {
  undoStack.push(snapshot());
  if (undoStack.length > 60) undoStack.shift();
  redoStack = [];
  syncUndoButtons();
}

function restore(json) {
  state = JSON.parse(json);
  syncControls();
  redraw();
}

function syncUndoButtons() {
  document.getElementById('undo').disabled = undoStack.length === 0;
  document.getElementById('redo').disabled = redoStack.length === 0;
}

function redraw() {
  drawCover(canvas, state, photos);
  highlightSelectedPanel();
}

function highlightSelectedPanel() {
  const rects = panelRects(canvas, state);
  const r = rects[selectedPanel];
  if (!r) return;
  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.strokeStyle = '#ffd76a';
  ctx.lineWidth = Math.max(3, canvas.width * 0.005);
  ctx.setLineDash([18, 10]);
  ctx.strokeRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
  ctx.restore();
}

function syncControls() {
  captionInput.value = state.caption;
  subtitleInput.value = state.subtitle;
  layoutSelect.value = state.layout;
  gradeSelect.value = state.grade;
  grainInput.value = state.grain;
  vignetteInput.value = state.vignette;
  halftoneInput.checked = state.halftone;
  syncPanelControls();
}

function syncPanelControls() {
  const layout = LAYOUTS[state.layout];
  const p = state.panels[selectedPanel] || defaultPanel(0);
  panelPhotoSelect.innerHTML = photoNames
    .map((n, i) => `<option value="${i}"${p.photo === i ? ' selected' : ''}>${n}</option>`)
    .join('') + '<option value="-1">Empty</option>';
  if (p.photo === -1) panelPhotoSelect.value = '-1';
  zoomInput.value = p.zoom;
  document.getElementById('panel-label').textContent =
    `Panel ${selectedPanel + 1} of ${layout.panels.length} — drag on the cover to move, scroll to zoom`;
}

function ensurePanels() {
  const n = LAYOUTS[state.layout].panels.length;
  while (state.panels.length < n) state.panels.push(defaultPanel(state.panels.length % 2));
  state.panels.length = n;
  if (selectedPanel >= n) selectedPanel = 0;
}

function setStatus(text) {
  statusEl.textContent = text;
}

// --- photo loading -------------------------------------------------------
async function addPhotoFile(file) {
  const img = await loadImage(URL.createObjectURL(file));
  photos.push(img);
  photoNames.push(file.name.replace(/\.[^.]+$/, '').slice(0, 24) || 'Photo');
  const p = state.panels[selectedPanel];
  if (p) p.photo = photos.length - 1;
  pushUndo();
  syncPanelControls();
  redraw();
  setStatus(`Loaded ${file.name} into panel ${selectedPanel + 1}.`);
}

async function loadSample(i) {
  const img = await loadImage(SAMPLES[i].url);
  photos[i] = img;
  photoNames[i] = SAMPLES[i].name;
}

document.getElementById('photo').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    await addPhotoFile(file);
  } catch {
    setStatus('That file could not be read as a photo.');
  }
  e.target.value = '';
});
document.getElementById('sample-boulevard').addEventListener('click', async () => {
  await loadSample(0);
  state.panels[selectedPanel].photo = 0;
  pushUndo();
  redraw();
  setStatus('Boulevard sample loaded.');
});
document.getElementById('sample-pier').addEventListener('click', async () => {
  await loadSample(1);
  state.panels[selectedPanel].photo = 1;
  pushUndo();
  redraw();
  setStatus('Pier sample loaded.');
});

// --- text, layout, grade, effects ----------------------------------------
captionInput.addEventListener('input', () => { state.caption = captionInput.value; redraw(); });
captionInput.addEventListener('change', pushUndo);
subtitleInput.addEventListener('input', () => { state.subtitle = subtitleInput.value; redraw(); });
subtitleInput.addEventListener('change', pushUndo);
layoutSelect.addEventListener('change', () => {
  pushUndo();
  state.layout = layoutSelect.value;
  ensurePanels();
  syncPanelControls();
  redraw();
});
gradeSelect.addEventListener('change', () => {
  pushUndo();
  state.grade = gradeSelect.value;
  redraw();
});
grainInput.addEventListener('input', () => { state.grain = Number(grainInput.value); redraw(); });
grainInput.addEventListener('change', pushUndo);
vignetteInput.addEventListener('input', () => { state.vignette = Number(vignetteInput.value); redraw(); });
vignetteInput.addEventListener('change', pushUndo);
halftoneInput.addEventListener('change', () => {
  pushUndo();
  state.halftone = halftoneInput.checked;
  redraw();
});

// --- selected panel -------------------------------------------------------
panelPhotoSelect.addEventListener('change', () => {
  pushUndo();
  state.panels[selectedPanel].photo = Number(panelPhotoSelect.value);
  redraw();
});
zoomInput.addEventListener('input', () => {
  state.panels[selectedPanel].zoom = Number(zoomInput.value);
  redraw();
});
zoomInput.addEventListener('change', pushUndo);

// Drag a panel's photo to pan it; scroll over it to zoom; click to select.
let drag = null;
function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width) * canvas.width,
    y: ((e.clientY - r.top) / r.height) * canvas.height,
  };
}
canvas.addEventListener('pointerdown', (e) => {
  const pt = canvasPoint(e);
  const rects = panelRects(canvas, state);
  for (let i = rects.length - 1; i >= 0; i--) {
    const r = rects[i];
    if (pt.x >= r.x && pt.x <= r.x + r.w && pt.y >= r.y && pt.y <= r.y + r.h) {
      selectedPanel = i;
      syncPanelControls();
      const p = state.panels[i];
      drag = { i, startX: pt.x, startY: pt.y, ox: p.ox, oy: p.oy, moved: false };
      canvas.setPointerCapture(e.pointerId);
      redraw();
      return;
    }
  }
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const pt = canvasPoint(e);
  const rects = panelRects(canvas, state);
  const r = rects[drag.i];
  const p = state.panels[drag.i];
  const dx = (pt.x - drag.startX) / r.w;
  const dy = (pt.y - drag.startY) / r.h;
  if (Math.abs(dx) + Math.abs(dy) > 0.002) drag.moved = true;
  p.ox = drag.ox + dx;
  p.oy = drag.oy + dy;
  redraw();
});
canvas.addEventListener('pointerup', () => {
  if (drag && drag.moved) pushUndo();
  drag = null;
});
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const pt = canvasPoint(e);
  const rects = panelRects(canvas, state);
  for (let i = rects.length - 1; i >= 0; i--) {
    const r = rects[i];
    if (pt.x >= r.x && pt.x <= r.x + r.w && pt.y >= r.y && pt.y <= r.y + r.h) {
      selectedPanel = i;
      const p = state.panels[i];
      p.zoom = Math.min(4, Math.max(1, p.zoom * (e.deltaY < 0 ? 1.08 : 0.92)));
      syncPanelControls();
      redraw();
      return;
    }
  }
}, { passive: false });

// --- undo / redo ----------------------------------------------------------
document.getElementById('undo').addEventListener('click', () => {
  if (!undoStack.length) return;
  redoStack.push(snapshot());
  restore(undoStack.pop());
  syncUndoButtons();
});
document.getElementById('redo').addEventListener('click', () => {
  if (!redoStack.length) return;
  undoStack.push(snapshot());
  restore(redoStack.pop());
  syncUndoButtons();
});

// --- export ---------------------------------------------------------------
const SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

export function exportCover(w, h) {
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawCover(off, state, photos);
  return new Promise((resolve) => {
    off.toBlob((blob) => resolve(blob), 'image/png');
  });
}

async function downloadCover(w, h) {
  const blob = await exportCover(w, h);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `vice-hour-${w}x${h}.png`;
  a.click();
  setStatus(`Saved vice-hour-${w}x${h}.png`);
  return blob;
}

document.getElementById('export').addEventListener('click', async () => {
  const [w, h] = SIZES[sizeSelect.value];
  await downloadCover(w, h);
});
document.getElementById('export-all').addEventListener('click', async () => {
  for (const [w, h] of Object.values(SIZES)) await downloadCover(w, h);
  setStatus('Saved all three sizes.');
});

// --- boot -----------------------------------------------------------------
for (const [key, g] of Object.entries(GRADES)) {
  const o = document.createElement('option');
  o.value = key;
  o.textContent = g.label;
  gradeSelect.appendChild(o);
}
for (const [key, l] of Object.entries(LAYOUTS)) {
  const o = document.createElement('option');
  o.value = key;
  o.textContent = l.label;
  layoutSelect.appendChild(o);
}

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), {
    loadImage,
    loadSample,
    setState(next) { state = next; ensurePanels(); syncControls(); },
    getState: () => state,
    getPhotos: () => photos,
    setPhotos(next) { photos = next; },
    redraw,
    canvas,
  });
} else {
  syncControls();
  syncUndoButtons();
  // Load the bundled samples so the first paint already shows a cover.
  Promise.all([loadSample(0), loadSample(1)])
    .then(() => redraw())
    .catch(() => redraw());
  redraw();
}
