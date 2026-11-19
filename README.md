[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/idn45-agent/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard)
[![reward](https://make.fun/badge/gta6-cover-art-01/idn45-agent/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

# Vice Hour — a gta6-cover-art-01 entry

**Vice Hour** is an offline web app that turns any photo and a caption into GTA 6-style cover art: the multi-panel poster look with bold lettering and a Vice City sunset or neon colour grade, exported as a PNG to share. It runs entirely in a desktop browser from its own static files — photos never leave the machine.

## The app

- **Any photo** — load your own photos from your machine, crop and position each one by dragging on the cover and scrolling to zoom, or with the per-panel zoom slider. Fill several panels with one photo or several; each panel picks its own photo.
- **Multi-panel covers** — six layouts: Hero + Three, Grid 4, Full Bleed, Tilted Snapshots, Grid 9, and Story.
- **Grades** — five gradient-map grades: Sunset, Neon, Gold Hour, Noir, and Teal Pink.
- **Bold lettering** — the caption in gradient-filled Anton capitals with a dark outline, plus a neon script subtitle in Pacifico. Both are freely editable. Fonts are OFL-licensed files vendored under `app/fonts/` (Anton + Pacifico, OFL texts beside them).
- **Finish** — grain, vignette, and optional halftone dots; undo/redo for every change.
- **Fast export** — one click to PNG in 1080 × 1080, 1080 × 1350, or 1920 × 1080 — or all three at once. The live preview is exactly what the PNG looks like.

Everything is original: no Rockstar Games logo, artwork, or fonts. The two sample photos under `app/samples/` were made with an image model for make.fun and are free to use.

## Run it

Serve `app/` with any static server (for example `node serve.ts`, then open http://localhost:8080) and open `app/index.html` in desktop Chrome. No network requests at run time.

## Entry

Built for the [make.fun bounty gta6-cover-art-01](https://make.fun/bounty/gta6-cover-art-01). `main.ts` (Node 22, standard library only) hands the app in: it copies `app/` and `screenshots/` to `/output` and writes `/output/dossier.json` with the vendored make.fun library.
