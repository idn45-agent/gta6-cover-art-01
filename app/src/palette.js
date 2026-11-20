// palette.js — colour science for Vice Hour.
//
// Every grade is a five-stop ramp. A photo pixel is first pushed through a
// contrast and saturation adjustment, then its three channels are remapped
// through the ramp and blended back with the adjusted pixel, so faces and
// clothes keep their shape while the light turns into sunset or neon.
// The remap runs once per photo per grade on a small offscreen canvas and
// the result is cached by the editor; painting a cover afterwards is just
// drawImage calls, which keeps the preview at sixty frames a second.

const RAMP_STOPS = 5;

function rampFromHexStops(hexStops, contrast, saturation, blend, titleA, titleB, paper) {
  const stops = hexStops.map((hex) => {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  });
  return { stops, contrast, saturation, blend, titleA, titleB, paper };
}

export const GRADE_CATALOG = [
  {
    id: 'sunset', label: 'Vice Sunset',
    ...rampFromHexStops(['#1b1035', '#7a1f4d', '#e0492f', '#ff9a3d', '#ffe9a8'], 1.1, 1.28, 0.52, '#ffd23f', '#ff5e7d', '#fff3d6'),
  },
  {
    id: 'neon', label: 'Neon District',
    ...rampFromHexStops(['#070b2e', '#3b1163', '#c2187a', '#ff2e88', '#7df9ff'], 1.14, 1.3, 0.5, '#7df9ff', '#ff2e88', '#e8fbff'),
  },
  {
    id: 'gold-hour', label: 'Gold Hour',
    ...rampFromHexStops(['#241203', '#6e3410', '#c97b1e', '#f2b544', '#fff0bf'], 1.06, 1.18, 0.46, '#ffe08a', '#ff8c42', '#fff6da'),
  },
  {
    id: 'noir', label: 'Night Noir',
    ...rampFromHexStops(['#050505', '#232323', '#5c5c5c', '#a8a8a8', '#f4f4f4'], 1.24, 0.32, 0.62, '#f5f5f5', '#8f9bb0', '#ffffff'),
  },
  {
    id: 'teal-pink', label: 'Teal & Pink',
    ...rampFromHexStops(['#04222b', '#0b5563', '#2aa198', '#ff7bac', '#ffd9e8'], 1.1, 1.3, 0.5, '#8ef6ff', '#ff7bac', '#eafffb'),
  },
  {
    id: 'miami-heat', label: 'Miami Heat',
    ...rampFromHexStops(['#2b0603', '#8f1d04', '#e8490f', '#ff8b2d', '#ffe66d'], 1.16, 1.38, 0.56, '#ffe66d', '#ff4d00', '#fff2cf'),
  },
  {
    id: 'midnight-drive', label: 'Midnight Drive',
    ...rampFromHexStops(['#020617', '#0f2440', '#1d4e6b', '#3d8fa8', '#c9f2ff'], 1.12, 1.12, 0.5, '#bdefff', '#3d8fa8', '#e6f7ff'),
  },
  {
    id: 'chrome-dusk', label: 'Chrome Dusk',
    ...rampFromHexStops(['#171226', '#453a6b', '#8a6fb8', '#e0a458', '#fdf3d8'], 1.08, 1.16, 0.48, '#f6d9a0', '#b48ce0', '#fbf4e2'),
  },
];

export function findGrade(gradeId) {
  for (const grade of GRADE_CATALOG) {
    if (grade.id === gradeId) return grade;
  }
  return GRADE_CATALOG[0];
}

// Builds one 256-entry lookup table per channel by walking the five stops
// with smooth interpolation between neighbouring ramp points.
export function buildLookupTables(grade) {
  const tables = [new Uint8ClampedArray(256), new Uint8ClampedArray(256), new Uint8ClampedArray(256)];
  const segment = 256 / (RAMP_STOPS - 1);
  for (let value = 0; value < 256; value += 1) {
    const at = Math.min(RAMP_STOPS - 1.001, value / segment);
    const low = Math.floor(at);
    const frac = at - low;
    const smooth = frac * frac * (3 - 2 * frac);
    for (let channel = 0; channel < 3; channel += 1) {
      const a = grade.stops[low][channel];
      const b = grade.stops[low + 1][channel];
      tables[channel][value] = a + (b - a) * smooth;
    }
  }
  return tables;
}

// A tiny deterministic generator so grain, barcodes and leaks paint the
// same way on every render of the same cover (screenshots stay honest).
export function seededRandom(seedStart) {
  let seed = seedStart >>> 0;
  if (seed === 0) seed = 987654321;
  return function nextRandom() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

const PHOTO_CAP = 1150;

// Draws a photo onto a fresh canvas, capped so huge phone pictures stay
// cheap to grade, then rewrites its pixels through the grade. When ink is
// on, tones are snapped to a few flat levels and edges are darkened, the
// screen-printed poster look.
export function produceGradedPhoto(photo, grade, inkOn) {
  const scale = Math.min(1, PHOTO_CAP / Math.max(photo.naturalWidth || photo.width, photo.naturalHeight || photo.height));
  const w = Math.max(2, Math.round((photo.naturalWidth || photo.width) * scale));
  const h = Math.max(2, Math.round((photo.naturalHeight || photo.height) * scale));
  const stage = document.createElement('canvas');
  stage.width = w;
  stage.height = h;
  const pen = stage.getContext('2d', { willReadFrequently: true });
  pen.drawImage(photo, 0, 0, w, h);
  const frame = pen.getImageData(0, 0, w, h);
  const px = frame.data;
  const tables = buildLookupTables(grade);
  const keep = 1 - grade.blend;
  const con = grade.contrast;
  const sat = grade.saturation;
  const levels = inkOn ? 5 : 0;
  const snap = levels > 0 ? (255 / (levels - 1)) : 0;
  for (let i = 0; i < px.length; i += 4) {
    let r = px[i];
    let g = px[i + 1];
    let b = px[i + 2];
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    r = luma + (r - luma) * sat;
    g = luma + (g - luma) * sat;
    b = luma + (b - luma) * sat;
    r = (r - 128) * con + 128;
    g = (g - 128) * con + 128;
    b = (b - 128) * con + 128;
    if (levels > 0) {
      r = Math.round(r / snap) * snap;
      g = Math.round(g / snap) * snap;
      b = Math.round(b / snap) * snap;
    }
    const cr = r < 0 ? 0 : r > 255 ? 255 : r;
    const cg = g < 0 ? 0 : g > 255 ? 255 : g;
    const cb = b < 0 ? 0 : b > 255 ? 255 : b;
    px[i] = cr * keep + tables[0][cr | 0] * grade.blend;
    px[i + 1] = cg * keep + tables[1][cg | 0] * grade.blend;
    px[i + 2] = cb * keep + tables[2][cb | 0] * grade.blend;
  }
  if (inkOn) darkenPrintedEdges(px, w, h);
  pen.putImageData(frame, 0, 0);
  return stage;
}

// Edge pass for the ink look: a pixel much brighter than its right or lower
// neighbour sits on a contour, so it is pulled toward black like a drawn
// outline in a printed poster.
function darkenPrintedEdges(px, w, h) {
  const copy = new Uint8ClampedArray(px);
  for (let y = 0; y < h - 1; y += 1) {
    for (let x = 0; x < w - 1; x += 1) {
      const i = (y * w + x) * 4;
      const here = 0.2126 * copy[i] + 0.7152 * copy[i + 1] + 0.0722 * copy[i + 2];
      const right = 0.2126 * copy[i + 4] + 0.7152 * copy[i + 5] + 0.0722 * copy[i + 6];
      const belowAt = i + w * 4;
      const below = 0.2126 * copy[belowAt] + 0.7152 * copy[belowAt + 1] + 0.0722 * copy[belowAt + 2];
      const jump = Math.max(Math.abs(here - right), Math.abs(here - below));
      if (jump > 52) {
        const cut = Math.min(0.72, (jump - 52) / 160);
        px[i] *= 1 - cut;
        px[i + 1] *= 1 - cut;
        px[i + 2] *= 1 - cut;
      }
    }
  }
}
