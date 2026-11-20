// shotmode.js — deterministic rendering for the screenshot harness.
// A ?shot= URL pins the whole cover: which bundled photos fill the panels,
// which layout and grade apply, and the exact canvas size. The same state
// also powers the export probe: window.__exported records the byte length
// of a real exported PNG so a driver can prove export works end to end.

import { paintCover } from './painter.js';

const SCENES = {
  cover: {
    layout: 'hero-and-three', grade: 'miami-heat', treatment: 'gradient',
    subtitle: 'one last ride', ink: false, panels: [0, 1, 0, 1], panY: [0, 0.55, 0.2, 0.55],
    decos: { badge: true, stars: true, issue: true, barcode: true, leak: true, grain: true, vignette: true, halftone: false },
  },
  portrait: {
    layout: 'story-stack', grade: 'neon', treatment: 'outline-chrome',
    subtitle: 'neon confessions', ink: true, panels: [1, 0, 1], panY: [0.7, 0.65, 0.7],
    decos: { badge: true, stars: true, issue: true, barcode: false, leak: false, grain: true, vignette: true, halftone: true },
  },
  square: {
    layout: 'poster-wall', grade: 'gold-hour', treatment: 'halftone-block',
    subtitle: 'golden hour, dirty deeds', ink: false, panels: [0, 1, 0, 1, 0, 1],
    decos: { badge: false, stars: true, issue: true, barcode: true, leak: false, grain: false, vignette: true, halftone: false },
  },
  editor: {
    layout: 'hero-and-three', grade: 'sunset', treatment: 'gradient',
    subtitle: 'one last ride', ink: false, panels: [0, 1, 0, 1],
    decos: { badge: true, stars: true, issue: true, barcode: false, leak: true, grain: false, vignette: true, halftone: false },
  },
};

export async function runShotMode(env) {
  const q = new URLSearchParams(location.search);
  const sceneName = q.get('shot') || 'cover';
  const scene = SCENES[sceneName] || SCENES.cover;
  document.body.classList.add(sceneName === 'editor' ? 'shot-editor' : 'shot-mode');

  const w = Number(q.get('w')) || 1080;
  const h = Number(q.get('h')) || 1080;

  // Load the two bundled photographs in a fixed order: 0 = pier, 1 = boulevard.
  const pier = await env.loadImageFromUrl('samples/pier.jpg', 'Sample pier');
  const boulevard = await env.loadImageFromUrl('samples/boulevard.jpg', 'Sample boulevard');
  const pool = [pier, boulevard];
  const wanted = (q.get('photo') || '').split(',').map((s) => s.trim()).filter(Boolean);
  const ordered = wanted
    .map((name) => pool.find((p) => p.name.toLowerCase().includes(name.toLowerCase())))
    .filter(Boolean);
  const usePool = ordered.length ? ordered : pool;
  env.photos.length = 0;
  usePool.forEach((p) => env.photos.push(p));

  const st = env.state;
  st.layout = q.get('layout') || scene.layout;
  st.grade = q.get('grade') || scene.grade;
  st.treatment = q.get('treatment') || scene.treatment;
  st.caption = q.get('caption') || 'VICE HOUR';
  st.subtitle = q.get('subtitle') || scene.subtitle;
  st.ink = q.get('ink') === '1' ? true : scene.ink;
  st.decos = { ...scene.decos };
  const assign = (q.get('panels') || scene.panels.join(',')).split(',').map((n) => Number(n));
  st.panels.forEach((p, i) => {
    p.img = assign[i % assign.length] || 0;
    p.zoom = 1;
    p.ox = 0;
    p.oy = scene.panY ? scene.panY[i % scene.panY.length] || 0 : 0;
  });

  if (document.fonts && document.fonts.ready) await document.fonts.ready;

  env.canvas.width = w;
  env.canvas.height = h;
  paintCover(env.ctx, w, h, st, env.photos.map((p) => p.img));

  // Export probe: render all four delivery sizes offscreen and record the
  // PNG byte length of each, plus the headline size on window.__exported.
  const sizes = [[1080, 1080], [1080, 1350], [1920, 1080], [1080, 1920]];
  const probe = {};
  for (const [pw, ph] of sizes) {
    const off = env.renderToCanvas(pw, ph, st, env.photos);
    const blob = await new Promise((res) => off.toBlob(res, 'image/png'));
    probe[`${pw}x${ph}`] = blob ? blob.size : 0;
  }
  window.__exportProbe = probe;
  window.__exported = probe['1080x1080'];
  window.__shotReady = true;
}
