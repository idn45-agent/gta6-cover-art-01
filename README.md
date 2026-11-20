[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/idn45-agent/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard)
[![reward](https://make.fun/badge/gta6-cover-art-01/idn45-agent/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

# Vice Hour v2 — Cover Art Studio

Turn any photo into a bold multi-panel poster in the spirit of a Vice City
video-game cover: stacked scene panels with white keylines, a sunset or neon
colour grade burned into every pixel, huge display lettering for your caption
and a script subtitle underneath. Everything runs locally in the browser —
photos are read from your own machine and never uploaded anywhere.

## What is new in v2

- **9 layouts** — Hero + Three, Grid Four, Grid Nine, Full Bleed, Tilted
  Snapshots, Duo Split, Masthead (painted title band), Story Stack and
  Poster Wall (3×2 grid under a title band).
- **8 colour grades** — Sunset Strip, Neon District, Gold Hour, Noir Alley,
  Teal & Pink, Miami Heat, Midnight Drive and Chrome Dusk. Each grade is a
  real per-pixel gradient map (a 256-entry lookup table built from anchor
  stops) with its own contrast and saturation, applied on an offscreen
  canvas before the panel is stamped onto the cover.
- **Ink mode** — an optional posterize pass per cover: chunky colour bands
  plus edge darkening so photographs read as printed poster art.
- **3 title treatments** — gradient-filled capitals with a heavy outline,
  a halftone-block splash band, and hollow outline-chrome letters with an
  offset shadow. The subtitle is set in a script face under the caption.
- **Decorations** — star-burst badge with your own short text, a heat-meter
  star row, a magazine issue line, a barcode block, light leak, film grain
  (seeded, so previews and exports match), vignette and a halftone dot
  overlay. All toggleable.
- **5 one-click preset looks**, a shuffle button, and undo/redo history.

## Editor

- Add several photos at once, or start from the two bundled samples.
- Every panel picks its own photo; one photo can fill all panels or each
  panel can carry a different one. Drag on the canvas to pan the selected
  panel, scroll to zoom, use the zoom slider for fine control, or swap the
  first two panels with one click.
- Caption and subtitle are editable text; layout, grade and title treatment
  update the live preview instantly. The preview is painted by the exact
  same code path as the export, so what you see is what downloads.

## Export

One click downloads a PNG at **1080×1080**, **1080×1350**, **1920×1080** or
**1080×1920** (story), or all four sizes back to back.

## Running it

The app is static files under `app/` with no build step. Serve the folder
with any static server, for example:

```
node serve.ts
```

then open the local address it prints in desktop Chrome. It works fully
offline: every script, style, font and sample photo is a file in `app/`.

A deterministic shot mode (`?shot=cover|portrait|square|editor` plus
`caption`, `layout`, `grade`, `panels`, `w` and `h` query parameters)
renders a fixed cover from the bundled samples, and exposes an export probe
(`window.__exported`) holding the byte length of a real exported PNG.

## Originality & licences

Vice Hour is an original design: no game logos, artwork, characters or fonts
are used. Display type is Anton and the script face is Pacifico, both under
the SIL Open Font License (licence texts ship in `app/fonts/`). The two
sample photographs in `app/samples/` were generated for this project.
