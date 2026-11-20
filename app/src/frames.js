// frames.js — the nine panel arrangements of Vice Hour v2.
// A layout is a pure function of the canvas size: it returns the photo
// panels (normalised rects plus an optional tilt in degrees) and the band
// where the title block lives. Keeping layouts pure means the editor
// preview and every export size share exactly the same composition.

function rect(x, y, w, h, tilt = 0) {
  return { x, y, w, h, tilt };
}

const LAYOUT_BUILDERS = {
  // One tall hero on the left, three stacked scenes on the right.
  'hero-and-three': (W, H) => {
    const third = 1 / 3;
    return {
      panels: [
        rect(0, 0, 0.58, 1),
        rect(0.58, 0, 0.42, third),
        rect(0.58, third, 0.42, third),
        rect(0.58, third * 2, 0.42, third),
      ],
      title: { x: 0.04, y: 0.66, w: 0.62, align: 'left' },
    };
  },
  // Clean two-by-two grid.
  'grid-4': () => ({
    panels: [
      rect(0, 0, 0.5, 0.5), rect(0.5, 0, 0.5, 0.5),
      rect(0, 0.5, 0.5, 0.5), rect(0.5, 0.5, 0.5, 0.5),
    ],
    title: { x: 0.5, y: 0.78, w: 0.9, align: 'center' },
  }),
  // Dense three-by-three contact sheet.
  'grid-9': () => {
    const panels = [];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) panels.push(rect(col / 3, row / 3, 1 / 3, 1 / 3));
    }
    return { panels, title: { x: 0.5, y: 0.4, w: 0.92, align: 'center' } };
  },
  // A single photograph edge to edge, title riding the lower third.
  'full-bleed': () => ({
    panels: [rect(0, 0, 1, 1)],
    title: { x: 0.5, y: 0.72, w: 0.92, align: 'center' },
  }),
  // Loose snapshots tossed on a dark table, each slightly rotated.
  'tilted-snapshots': (W, H) => {
    const wide = W >= H;
    if (wide) {
      return {
        panels: [
          rect(0.03, 0.1, 0.44, 0.72, -4),
          rect(0.3, 0.04, 0.42, 0.66, 3),
          rect(0.58, 0.14, 0.4, 0.7, -2),
        ],
        title: { x: 0.5, y: 0.82, w: 0.9, align: 'center' },
        backdrop: '#17102a',
      };
    }
    return {
      panels: [
        rect(0.06, 0.04, 0.62, 0.4, -4),
        rect(0.3, 0.32, 0.64, 0.4, 3),
        rect(0.05, 0.6, 0.62, 0.36, -2),
      ],
      title: { x: 0.5, y: 0.86, w: 0.9, align: 'center' },
      backdrop: '#17102a',
    };
  },
  // Two halves split by a hard diagonal seam.
  'duo-split': () => ({
    panels: [rect(0, 0, 0.52, 1), rect(0.48, 0, 0.52, 1)],
    title: { x: 0.5, y: 0.44, w: 0.9, align: 'center' },
  }),
  // Magazine masthead: a solid title band across the top, photos below.
  masthead: () => ({
    panels: [
      rect(0, 0.24, 0.62, 0.76),
      rect(0.62, 0.24, 0.38, 0.38),
      rect(0.62, 0.62, 0.38, 0.38),
    ],
    title: { x: 0.5, y: 0.015, w: 0.94, align: 'center', band: 0.24 },
  }),
  // A vertical film strip of three scenes for portrait and story sizes.
  'story-stack': () => ({
    panels: [
      rect(0, 0, 1, 0.36),
      rect(0, 0.36, 1, 0.32),
      rect(0, 0.68, 1, 0.32),
    ],
    title: { x: 0.5, y: 0.3, w: 0.92, align: 'center' },
  }),
  // Three-by-two poster wall under a slim title band.
  'poster-wall': () => {
    const panels = [];
    const top = 0.2;
    const rows = 2, cols = 3;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        panels.push(rect(c / cols, top + (r * (1 - top)) / rows, 1 / cols, (1 - top) / rows));
      }
    }
    return { panels, title: { x: 0.5, y: 0.01, w: 0.94, align: 'center', band: top } };
  },
};

export const LAYOUT_IDS = Object.keys(LAYOUT_BUILDERS);

export const LAYOUT_LABELS = {
  'hero-and-three': 'Hero + Three',
  'grid-4': 'Grid Four',
  'grid-9': 'Grid Nine',
  'full-bleed': 'Full Bleed',
  'tilted-snapshots': 'Tilted Snapshots',
  'duo-split': 'Duo Split',
  masthead: 'Masthead',
  'story-stack': 'Story Stack',
  'poster-wall': 'Poster Wall',
};

export function layoutFor(layoutId, W, H) {
  const build = LAYOUT_BUILDERS[layoutId] || LAYOUT_BUILDERS['hero-and-three'];
  return build(W, H);
}

export function panelCount(layoutId) {
  return layoutFor(layoutId, 1000, 1000).panels.length;
}
