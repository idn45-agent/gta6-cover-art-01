// tones.js — colour science for Vice Hour v2.
// Each grade is a small set of anchor stops. At paint time the stops are
// expanded into a 256-entry lookup table per channel, then contrast and
// saturation are folded into the same pass so a panel costs one ImageData
// sweep no matter which grade is active.

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// stops: [position 0..1, hex] pairs, dark to light.
export const GRADE_BOOK = {
  sunset: {
    label: 'Sunset Strip',
    stops: [[0, '#1b1030'], [0.28, '#5b2140'], [0.52, '#c94f4f'], [0.76, '#f59a4e'], [1, '#ffe9b0']],
    contrast: 1.12, saturation: 1.25,
  },
  neon: {
    label: 'Neon District',
    stops: [[0, '#0a0a2e'], [0.3, '#3b1163'], [0.55, '#c2187a'], [0.8, '#22c3d6'], [1, '#e8fbff']],
    contrast: 1.18, saturation: 1.4,
  },
  'gold-hour': {
    label: 'Gold Hour',
    stops: [[0, '#241505'], [0.3, '#6e4416'], [0.55, '#c98a2e'], [0.8, '#f2c14e'], [1, '#fff3cf']],
    contrast: 1.08, saturation: 1.15,
  },
  noir: {
    label: 'Noir Alley',
    stops: [[0, '#050505'], [0.35, '#2e2e33'], [0.6, '#6f7076'], [0.82, '#b9bac0'], [1, '#f4f4f6']],
    contrast: 1.3, saturation: 0.12,
  },
  'teal-pink': {
    label: 'Teal & Pink',
    stops: [[0, '#062a30'], [0.32, '#0f5e63'], [0.58, '#7fb5a8'], [0.8, '#f2a7c3'], [1, '#ffeef5']],
    contrast: 1.1, saturation: 1.3,
  },
  'miami-heat': {
    label: 'Miami Heat',
    stops: [[0, '#2b0a1e'], [0.3, '#7a1e3f'], [0.55, '#e8546d'], [0.78, '#ff9e5e'], [1, '#fff0c9']],
    contrast: 1.15, saturation: 1.45,
  },
  'midnight-drive': {
    label: 'Midnight Drive',
    stops: [[0, '#020610'], [0.32, '#0d2440'], [0.58, '#1f5f7a'], [0.8, '#5fb8c9'], [1, '#dff7ff']],
    contrast: 1.2, saturation: 1.1,
  },
  'chrome-dusk': {
    label: 'Chrome Dusk',
    stops: [[0, '#14101c'], [0.3, '#3a3350'], [0.55, '#7d739e'], [0.78, '#c9b8d9'], [1, '#fdf6ff']],
    contrast: 1.14, saturation: 0.95,
  },
};

export const GRADE_IDS = Object.keys(GRADE_BOOK);

// Expand anchor stops into three 256-entry channel tables.
export function buildLut(gradeId) {
  const grade = GRADE_BOOK[gradeId] || GRADE_BOOK.sunset;
  const anchors = grade.stops.map(([pos, hex]) => [pos, hexToRgb(hex)]);
  const lut = [new Uint8ClampedArray(256), new Uint8ClampedArray(256), new Uint8ClampedArray(256)];
  for (let v = 0; v < 256; v++) {
    const t = v / 255;
    let a = anchors[0];
    let b = anchors[anchors.length - 1];
    for (let i = 0; i < anchors.length - 1; i++) {
      if (t >= anchors[i][0] && t <= anchors[i + 1][0]) { a = anchors[i]; b = anchors[i + 1]; break; }
    }
    const span = b[0] - a[0] || 1;
    const f = Math.min(1, Math.max(0, (t - a[0]) / span));
    for (let c = 0; c < 3; c++) lut[c][v] = Math.round(a[1][c] + (b[1][c] - a[1][c]) * f);
  }
  return { lut, contrast: grade.contrast, saturation: grade.saturation };
}

// Grade one ImageData in place: luminance drives the LUT, the original hue
// is blended back so faces keep their identity under the poster colours.
export function applyGrade(imageData, gradeId, inkOn) {
  const { lut, contrast, saturation } = buildLut(gradeId);
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i + 1], b = d[i + 2];
    const lum = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
    const mr = lut[0][lum], mg = lut[1][lum], mb = lut[2][lum];
    // Blend mapped tone with the source pixel, then push saturation.
    r = r * 0.38 + mr * 0.62;
    g = g * 0.38 + mg * 0.62;
    b = b * 0.38 + mb * 0.62;
    const grey = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    r = grey + (r - grey) * saturation;
    g = grey + (g - grey) * saturation;
    b = grey + (b - grey) * saturation;
    // Contrast around mid-grey.
    r = (r - 128) * contrast + 128;
    g = (g - 128) * contrast + 128;
    b = (b - 128) * contrast + 128;
    if (inkOn) {
      // Posterize to chunky bands and sink the darkest band toward ink black.
      const step = 52;
      r = Math.round(r / step) * step;
      g = Math.round(g / step) * step;
      b = Math.round(b / step) * step;
      const lum2 = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      if (lum2 < 46) { r *= 0.45; g *= 0.45; b *= 0.55; }
    }
    d[i] = r; d[i + 1] = g; d[i + 2] = b;
  }
  return imageData;
}

// Deterministic pseudo-random generator so grain looks identical in the
// preview, in every export size and in the screenshot runs.
export function seededRandom(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
