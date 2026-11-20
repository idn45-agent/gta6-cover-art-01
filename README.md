[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/idn45-agent/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard)
[![reward](https://make.fun/badge/gta6-cover-art-01/idn45-agent/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard)

# Vice Hour — Cover Art Studio

Turn any photo into a bold multi-panel poster in the spirit of a Vice
City game cover: stacked panels with white gutters, a sunset-or-neon
colour grade baked into every pixel, huge condensed caption lettering
and the small printed trimmings of a magazine cover — then export a PNG
ready to post. Everything runs locally in the browser; photos are read
from your machine and never uploaded anywhere.

## Run it

```sh
node serve.ts          # then open the local address it prints
```

No build step, no dependencies, no network requests: `app/` is plain
HTML, CSS and ES modules and works fully offline in desktop Chrome.

## What it does

- **Nine layouts** — Hero + Three, Grid Four, Grid Nine, Full Bleed,
  Tilted Snaps (rotated snapshot cards), Duo Split (diagonal seam),
  Masthead and Poster Wall (title band on top), Story Stack.
- **Any photos** — upload several at once or start from the two bundled
  samples; assign any photo to any panel, use one photo across all
  panels or a different one in each. Drag inside a panel to reposition,
  scroll to zoom, use the zoom slider, or swap two panels.
- **Eight colour grades** — Vice Sunset, Neon District, Gold Hour,
  Night Noir, Teal & Pink, Miami Heat, Midnight Drive, Chrome Dusk.
  Each grade is a real per-pixel gradient map (contrast + saturation +
  five-stop channel ramp) computed on an offscreen canvas, plus an
  optional ink effect that posterizes tones and darkens edges.
- **Three title treatments** — gradient-filled capitals with a dark
  outline, a halftone-block band, and hollow outline-chrome lettering —
  with an editable caption and a script subtitle.
- **Decorations** — starburst badge with your own short text, heat-meter
  star row, magazine issue line, barcode chip, light leaks, film grain,
  vignette and a halftone shade, each toggleable.
- **Fast export** — one click to PNG at 1080 × 1080, 1080 × 1350,
  1920 × 1080 or 1080 × 1920 (story), or export all four at once. The
  preview canvas and the exports are painted by the same function, so
  the preview is the export.
- **Five one-click preset looks**, a shuffle button, and undo/redo.

## Screenshots

`screenshots/` holds four renders made by the app itself, described by
`shots.json`: a wide hero cover, the editor with samples loaded, a
portrait poster-wall cover and a square tilted-snapshots cover. Each
entry in `shots.json` is a `?shot=` URL the app understands — it applies
the named layout, grade, caption, panel assignment and decorations to
the bundled samples, paints the cover, and records the byte length of
all four PNG exports on `window.__exported` for verification.

## Originality and licences

Vice Hour is an original work: its name, lettering, decorations and
sample photographs are its own, and no third-party game artwork, logos
or fonts are used. Display type is Anton and the script face is
Pacifico, both under the SIL Open Font License 1.1 — the font files and
their licence texts live in `app/fonts/`. Sample photographs in
`app/samples/` were generated for this project and are free to use.

## Layout of the repo

- `app/index.html`, `app/style.css` — page and studio styling
- `app/src/palette.js` — grades, lookup tables, per-pixel photo grading
- `app/src/geometry.js` — the nine panel layouts
- `app/src/render.js` — the cover painter (panels, lettering, trimmings)
- `app/src/editor.js` — controls, state, history, canvas gestures, export
- `app/src/shotmode.js` — deterministic `?shot=` scenes + export probe
- `main.ts` — copies `app/` and `screenshots/` to the output directory
  and writes `dossier.json` via `vendor/makefun-app.ts`
