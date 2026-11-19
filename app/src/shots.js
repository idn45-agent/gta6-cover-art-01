// Fixed scenes for screenshots: ?shot=editor shows the editor with sample
// photos loaded; ?shot=cover shows one exported cover full-frame, at the
// size the `size` query names (1920x1080, 1080x1350 or 1080x1080); ?shot=export
// renders the cover off-screen at a size and records its PNG byte length in
// window.__exported, so a headless check can prove the export works.
// window.__shotReady is set once the scene is painted.
import { drawCover, defaultState, defaultPanel } from './cover.js';

async function waitFonts() {
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('100px Anton'),
        document.fonts.load('40px Pacifico'),
      ]),
      new Promise((r) => setTimeout(r, 3000)),
    ]);
    await document.fonts.ready;
  } catch {
    // Fallback fonts still draw; the scene is usable either way.
  }
}

function shotState(query) {
  const state = defaultState();
  state.layout = query.get('layout') || 'hero-and-three';
  state.grade = query.get('grade') || 'sunset';
  state.caption = query.get('caption') || 'VICE HOUR';
  state.subtitle = query.get('subtitle') || 'neon nights on the coast';
  state.halftone = query.get('halftone') === '1';
  const n = { 'hero-and-three': 4, 'grid-4': 4, 'full-bleed': 1, 'tilted-snapshot': 3, 'grid-9': 9, story: 3 }[state.layout] || 4;
  state.panels = Array.from({ length: n }, (_, i) => defaultPanel(i % 2));
  if (state.layout === 'hero-and-three') {
    // Same face-framing pans as the editor's defaults (see cover.js).
    const d = defaultState().panels;
    state.panels = state.panels.map((p, i) => ({ ...p, oy: d[i] ? d[i].oy : 0 }));
  }
  if (state.layout === 'grid-9') {
    // A single photo across the nine panels reads as one big poster.
    state.panels = state.panels.map(() => defaultPanel(0));
    state.panels[4].photo = 1;
    // Pan the centre face down so it sits just under the title, not behind it.
    state.panels[4].oy = 0.5;
  }
  if (state.layout === 'tilted-snapshot') {
    // The wide bottom strip crops a portrait photo hard, so it takes the
    // square pier photo, zoomed out a little and panned down to its face.
    state.panels[2] = { photo: 1, zoom: 0.8, ox: 0, oy: 1.0 };
  }
  if (state.layout === 'full-bleed') state.panels = [defaultPanel(0)];
  return state;
}

export async function runShot(shot, query, api) {
  const { loadImage, loadSample, setState, getPhotos, setPhotos, redraw, canvas } = api;
  await waitFonts();
  await Promise.all([loadSample(0), loadSample(1)]);
  const photos = getPhotos();

  if (shot === 'editor') {
    document.body.classList.add('shot-editor');
    setState(shotState(query));
    redraw();
  } else if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    const size = query.get('size') || '1920x1080';
    const [w, h] = size.split('x').map(Number);
    canvas.width = w;
    canvas.height = h;
    setState(shotState(query));
    drawCover(canvas, api.getState(), photos);
  } else if (shot === 'export') {
    const size = query.get('size') || '1080x1080';
    const [w, h] = size.split('x').map(Number);
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    setState(shotState(query));
    drawCover(off, api.getState(), photos);
    const blob = await new Promise((resolve) => off.toBlob(resolve, 'image/png'));
    const dataUrl = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
    window.__exported = { w, h, bytes: blob.size, dataUrlLength: dataUrl.length };
    setState(shotState(query));
    redraw();
  }
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
