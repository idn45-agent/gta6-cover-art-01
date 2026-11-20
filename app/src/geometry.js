// geometry.js — where the panels sit for each of the nine layouts.
//
// Rectangles come back in plain pixels for a canvas of width W and height
// H. A layout may also reserve a band: a strip with no photo in it where
// the masthead title lives. Tilted snapshots return cards with a centre,
// a size and a rotation in radians; the duo split returns polygons so the
// seam between its two photographs runs on a diagonal.

export const LAYOUT_CATALOG = [
  { id: 'hero-and-three', label: 'Hero + Three' },
  { id: 'grid-4', label: 'Grid Four' },
  { id: 'grid-9', label: 'Grid Nine' },
  { id: 'full-bleed', label: 'Full Bleed' },
  { id: 'tilted-snapshots', label: 'Tilted Snaps' },
  { id: 'duo-split', label: 'Duo Split' },
  { id: 'masthead', label: 'Masthead' },
  { id: 'story-stack', label: 'Story Stack' },
  { id: 'poster-wall', label: 'Poster Wall' },
];

export function findLayout(layoutId) {
  for (const layout of LAYOUT_CATALOG) {
    if (layout.id === layoutId) return layout;
  }
  return LAYOUT_CATALOG[0];
}

function box(x, y, w, h) {
  return { kind: 'box', x, y, w, h };
}

function gridBoxes(cols, rows, x0, y0, totalW, totalH, gap) {
  const cellW = (totalW - gap * (cols - 1)) / cols;
  const cellH = (totalH - gap * (rows - 1)) / rows;
  const out = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      out.push(box(x0 + col * (cellW + gap), y0 + row * (cellH + gap), cellW, cellH));
    }
  }
  return out;
}

// Returns { panels, band, backdrop } for a layout at a given canvas size.
// `margin` is the white poster gutter kept around and between panels.
export function computeLayout(layoutId, W, H) {
  const margin = Math.round(Math.min(W, H) * 0.018);
  const gap = Math.round(Math.min(W, H) * 0.014);
  const innerW = W - margin * 2;
  const innerH = H - margin * 2;
  switch (layoutId) {
    case 'grid-4':
      return { panels: gridBoxes(2, 2, margin, margin, innerW, innerH, gap), band: null, backdrop: false };
    case 'grid-9':
      return { panels: gridBoxes(3, 3, margin, margin, innerW, innerH, gap), band: null, backdrop: false };
    case 'full-bleed':
      return { panels: [box(0, 0, W, H)], band: null, backdrop: false };
    case 'story-stack': {
      const rowH = (innerH - gap * 2) / 3;
      return {
        panels: [0, 1, 2].map((i) => box(margin, margin + i * (rowH + gap), innerW, rowH)),
        band: null, backdrop: false,
      };
    }
    case 'duo-split': {
      const lean = W * 0.09;
      const left = {
        kind: 'poly',
        points: [[0, 0], [W * 0.58, 0], [W * 0.58 - lean, H], [0, H]],
      };
      const right = {
        kind: 'poly',
        points: [[W * 0.58 + gap, 0], [W, 0], [W, H], [W * 0.58 - lean + gap, H]],
      };
      return { panels: [left, right], band: null, backdrop: false };
    }
    case 'tilted-snapshots': {
      const cardW = W * 0.44;
      const cardH = H * 0.52;
      const cards = [
        { kind: 'card', cx: W * 0.3, cy: H * 0.44, w: cardW, h: cardH, rot: -0.1 },
        { kind: 'card', cx: W * 0.68, cy: H * 0.4, w: cardW, h: cardH, rot: 0.08 },
        { kind: 'card', cx: W * 0.5, cy: H * 0.62, w: cardW * 0.94, h: cardH * 0.94, rot: -0.03 },
      ];
      return { panels: cards, band: null, backdrop: true };
    }
    case 'masthead': {
      const bandH = Math.round(H * 0.21);
      const belowH = H - bandH - margin - gap;
      const wideH = belowH * 0.58;
      const smallH = belowH - wideH - gap;
      const smallW = (innerW - gap) / 2;
      return {
        panels: [
          box(margin, bandH + gap, innerW, wideH),
          box(margin, bandH + gap + wideH + gap, smallW, smallH),
          box(margin + smallW + gap, bandH + gap + wideH + gap, smallW, smallH),
        ],
        band: box(0, 0, W, bandH),
        backdrop: false,
      };
    }
    case 'poster-wall': {
      const bandH = Math.round(H * 0.17);
      const gridH = H - bandH - margin - gap;
      return {
        panels: gridBoxes(3, 2, margin, bandH + gap, innerW, gridH, gap),
        band: box(0, 0, W, bandH),
        backdrop: false,
      };
    }
    case 'hero-and-three':
    default: {
      const heroW = innerW * 0.6;
      const railW = innerW - heroW - gap;
      const railH = (innerH - gap * 2) / 3;
      return {
        panels: [
          box(margin, margin, heroW, innerH),
          box(margin + heroW + gap, margin, railW, railH),
          box(margin + heroW + gap, margin + railH + gap, railW, railH),
          box(margin + heroW + gap, margin + (railH + gap) * 2, railW, railH),
        ],
        band: null, backdrop: false,
      };
    }
  }
}

// Bounding box of any panel shape, used for hit-testing and photo fitting.
export function panelBounds(panel) {
  if (panel.kind === 'card') {
    return { x: panel.cx - panel.w / 2, y: panel.cy - panel.h / 2, w: panel.w, h: panel.h };
  }
  if (panel.kind === 'poly') {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const [px, py] of panel.points) {
      minX = Math.min(minX, px);
      minY = Math.min(minY, py);
      maxX = Math.max(maxX, px);
      maxY = Math.max(maxY, py);
    }
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }
  return { x: panel.x, y: panel.y, w: panel.w, h: panel.h };
}

export function pointInsidePanel(panel, px, py) {
  if (panel.kind === 'card') {
    const dx = px - panel.cx;
    const dy = py - panel.cy;
    const cos = Math.cos(-panel.rot);
    const sin = Math.sin(-panel.rot);
    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;
    return Math.abs(localX) <= panel.w / 2 && Math.abs(localY) <= panel.h / 2;
  }
  const b = panelBounds(panel);
  return px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h;
}
