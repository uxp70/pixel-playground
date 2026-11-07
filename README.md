# 🎮 Pixel Playground

A pocket arcade of **1,026 playable entries**: 16 hand-built cabinets, 110 kit
challenges from ten reusable engines, and 900 Atlas modes made from 50 engine
families × 18 rule editions. Every Atlas entry has its own title; the family and
edition are shown only as play-page context. Plain HTML, CSS and JavaScript — no
frameworks, no build step, no trackers and no network calls after the page loads.

Every entry has a stable id, a card in the searchable hub, a local best score and
a leaderboard entry. Atlas editions change real rules through a shared session
layer: timers, lives, speed ramps, mirror, fog, scale, combo, boss phases,
relic pickups, seeded daily layouts and the combined finale. They are rule
editions of their families, not 900 separate engine implementations.

## Play

- Tap or drag the canvas; swipe where the cabinet calls for it.
- Keyboard: arrows, WASD, Space and Enter.
- Fullscreen: the ⛶ button or <kbd>F</kbd>; <kbd>Esc</kbd> exits.
- Best scores and up to 50 runs per game live in `localStorage`; the account
  page keeps separate device profiles.

## Run locally

Any static file server works — nothing to build or install:

```bash
python3 -m http.server 3000
# open http://localhost:3000
```

## Deploy

The site is served from the repository root on the `main` branch of GitHub
Pages. The empty `.nojekyll` file keeps asset paths exactly as written.

## Layout

```
index.html                   1,026-entry hub
games/play.html              runner for kit games and Atlas modes
games/<name>.html            bespoke cabinets
assets/css/style.css         shared design system
assets/css/refresh.css       refreshed palette
assets/js/common.js          scores, board, accounts, sound, input
assets/js/games-data.js      11 bespoke + 110 kit entries
assets/js/atlas-data.js      50 families + 900 Atlas entries
assets/js/atlas-titles.js    unique title layer for those 900 entries
assets/js/atlas.js           Atlas session layer and kit
assets/js/atlas/0*.js        five files, ten families each
assets/js/kit.js             runner for the 1,010 runner games
assets/js/kits/*.js          the ten original kit engines
assets/js/originals.js       the five later bespoke entries
```
