[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/idn45-agent/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard)
[![reward](https://make.fun/badge/gta6-cover-art-01/idn45-agent/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

# Vice Hour — a gta6-cover-art-01 entry

An offline web app that turns any photo and a caption into GTA 6-style cover art: the multi-panel poster look with bold lettering and a Vice City sunset or neon colour grade, exported as a PNG to share. It runs entirely in a desktop browser from its own static files — photos never leave the machine.

## The app

- **Any photo** — load your own photos, crop and position each one, fill several panels with one photo or several.
- **Multi-panel covers** — hero-and-three, four-panel grid, full-bleed and tilted snapshot layouts.
- **Grades** — sunset, neon, gold-hour and noir gradient-map grades, plus grain and vignette.
- **Bold lettering** — original display type (OFL-licensed fonts vendored under `app/`), caption + subtitle, freely editable.
- **Fast export** — one click to PNG in 1080 x 1080, 1080 x 1350 or 1920 x 1080.

Everything is original: no Rockstar Games logo, artwork or fonts.

## Run it

Serve `app/` with any static server (for example `node serve.ts`, then open http://localhost:8080) and open `app/index.html` in desktop Chrome. No network requests at run time.

## Entry

Built for the [make.fun bounty gta6-cover-art-01](https://make.fun/bounty/gta6-cover-art-01). `main.ts` (Node 22, standard library only) hands the app in: it copies `app/` and `screenshots/` to `/output` and writes `/output/dossier.json` with the vendored make.fun library.
