# 🎮 Pixel Playground

A pocket arcade of **1,026 browser games** — 16 hand-built cabinets, 110 kit
games and 900 Atlas modes across 50 new engine families. Plain HTML, CSS and
JavaScript: no frameworks, no build step, no trackers and no network calls after
the page loads.

## The catalogue

| Part | Count | What it is |
| --- | ---: | --- |
| Hand-built cabinets | 16 | Eleven bespoke games plus five later originals, each with its own page and rules. |
| Kit games | 110 | Eleven games from each of ten reusable engines, all launched through `games/play.html?g=<id>`. |
| Atlas modes | 900 | 50 new engine families × 18 rule editions, launched through the same play page. |

Every game has a stable id, its own card in the hub, a local best score and a
leaderboard entry. The Atlas editions are real rule variants handled by a shared
session layer: timer, lives, speed ramp, mirror, fog, scale, combo, boss phases,
relic pickups, seeded daily layouts and the combined finale.

## Play

- **Touch and keyboard.** Tap and drag on the canvas, swipe where the cabinet
  calls for it, or use arrows/WASD. Atlas games map the same input through their
  edition modifiers.
- **Fullscreen.** The ⛶ button or <kbd>F</kbd> fills the screen. <kbd>Esc</kbd>
  or the floating ✕ exits.
- **Scores stay local.** Personal bests and up to 50 runs per game live in
  `localStorage`; the account page keeps separate device profiles.
| -**No dependencies.** The music is generated with the Web Audio API and every
  visual is drawn on a canvas or built from the shared stylesheet.

## Run it locally

Any static file server works — there is nothing to build or install:

```bash
python3 -m http.server 3000
# then open http://localhost:3000
```

## Deploy to GitHub Pages

The site is served straight from the repository root, so Pages needs no build
step. Set **Settings → Pages → Deploy from a branch**, choose `main` and
`/ (root)`. The live URL is `https://<user>.github.io/<repo>/`.

The empty `.nojekyll` file stops Jekyll from processing the site, which keeps
every asset path exactly as written. Pushing to `main` republishes automatically.

## Layout

```
index.html                   searchable 1,026-game hub
games/play.html              runner for kit games and all Atlas modes
games/<name>.html            bespoke cabinet pages
assets/css/style.css         shared design system
assets/css/refresh.css       refreshed arcade palette
assets/js/common.js          scores, leaderboard, accounts, sound, input helpers
assets/js/games-data.js      11 bespoke + 110 kit catalogue entries
assets/js/atlas-data.js      50 families and 900 Atlas catalogue entries
assets/js/atlas.js           shared Atlas session layer and Atlas kit
assets/js/atlas/01-timing.js   10 Atlas families
assets/js/atlas/02-aim.js      10 Atlas families
assets/js/atlas/03-puzzles.js  10 Atlas families
assets/js/atlas/04-brain.js    10 Atlas families
assets/js/atlas/05-action.js   10 Atlas families
assets/js/kit.js              cabinet runner for all 1,010 runner games
assets/js/kits/*.js          the ten original kit engines
assets/js/originals.js       the five later bespoke entries
```

## Adding a game

1. Add a catalogue record and a page or kit mode. The hub, leaderboard, account
   page and play page all read the same `PP_GAMES` array.
2. For a stand-alone cabinet, copy a `games/*.html` page and use `PP` from
   `common.js`: `scores.get/save`, `sfx`/`tone`, `fitCanvas`,
   `onDirectionalKeys`, `onSwipe` and `showOverlay`/`hideOverlay`.
3. For a family of games, register a kit with `PP_KIT.register(id, { modes,
   make(api) })`. The runner supplies the canvas, pointer and keyboard input,
   HUD, pause/finish overlays, best-score saving and leaderboard submission.

The catalogue is client-side data only, so adding entries does not require a
key.
