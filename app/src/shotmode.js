// shotmode.js — deterministic scenes for screenshots and export checks.
//
// A URL like ?shot=cover&layout=grid-4&grade=neon&caption=NEON%20NIGHTS
// &size=1920x1080&panels=0,1,1,0&ink=1&deco=badge,stars,grain describes
// one fixed cover built from the bundled sample photographs. The editor
// applies it verbatim, paints, runs the export probe (which renders all
// four PNG sizes offscreen and stores each byte length on
// window.__exported), and only then raises window.__shotReady.

export function parseShotQuery(searchText) {
  const query = new URLSearchParams(searchText);
  const shot = query.get('shot');
  if (!shot) return null;
  const sizeText = query.get('size') || '';
  const sizeParts = sizeText.split('x').map((part) => parseInt(part, 10));
  const decoText = query.get('deco');
  return {
    shot,
    layout: query.get('layout') || null,
    grade: query.get('grade') || null,
    treatment: query.get('treatment') || null,
    caption: query.get('caption') || null,
    subtitle: query.get('subtitle'),
    badgeText: query.get('badge') || null,
    ink: query.get('ink') === '1',
    size: sizeParts.length === 2 && sizeParts.every((n) => Number.isFinite(n) && n > 0)
      ? { w: sizeParts[0], h: sizeParts[1] }
      : null,
    panels: (query.get('panels') || '')
      .split(',')
      .map((part) => parseInt(part, 10))
      .filter((n) => Number.isFinite(n) && n >= 0),
    deco: decoText === null ? null : decoText.split(',').map((name) => name.trim()).filter(Boolean),
  };
}

// Applies a parsed shot request onto a fresh editor state object.
export function applyShotToState(state, request) {
  if (request.layout) state.layout = request.layout;
  if (request.grade) state.grade = request.grade;
  if (request.treatment) state.treatment = request.treatment;
  if (request.caption !== null) state.caption = request.caption;
  if (request.subtitle !== null) state.subtitle = request.subtitle;
  if (request.badgeText !== null) state.badgeText = request.badgeText;
  state.ink = request.ink;
  request.panels.forEach((photoIndex, panelIndex) => {
    if (state.panels[panelIndex]) state.panels[panelIndex].photo = photoIndex;
  });
  if (request.deco !== null) {
    for (const key of Object.keys(state.deco)) {
      state.deco[key] = request.deco.includes(key);
    }
  }
}

// Renders every export size through the caller's renderer and records
// the PNG byte length of each, so a screenshot driver can prove the
// exports are real without downloading anything.
export function installExportProbe(renderPngBlob) {
  window.__exported = {};
  window.__runExportProbe = async function runExportProbe() {
    const sizes = [[1080, 1080], [1080, 1350], [1920, 1080], [1080, 1920]];
    const found = {};
    for (const [w, h] of sizes) {
      const blob = await renderPngBlob(w, h);
      found[`${w}x${h}`] = blob ? blob.size : 0;
    }
    window.__exported = found;
    return found;
  };
}
