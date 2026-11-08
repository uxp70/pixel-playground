# 🎮 Pixel Playground

A pocket arcade of **176 playable entries**: 16 hand-built cabinets, 110 kit
cabinets and 50 standalone Atlas cabinets. Every catalogue entry is a standalone
unit: the bespoke pages are self-contained, and the 160 runner games each have
their own one-mode engine registration and unique engine id. The ten kit family
files are mode libraries behind the 110 kit registrations, not catalogue engines.
The Atlas has no Classic/Rapid editions, no family variants and no repeated rule
sets. Plain HTML, CSS and JavaScript — no frameworks, no build step, no trackers
and no network calls after the page loads.

Every entry has a stable id, a card in the searchable hub, a local best score and
a leaderboard entry. The Atlas cabinets are one screen each, with their own verb,
scoring rule and failure state. They share the frame loop, input plumbing and
visual language, not a family difficulty ladder.

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
index.html                   176-entry hub
games/play.html              runner for kit games and Atlas cabinets
games/<name>.html            bespoke cabinets
assets/css/style.css         shared design system
assets/css/refresh.css       refreshed palette
assets/js/common.js          scores, board, accounts, sound, input
assets/js/games-data.js      11 core + 110 kit entries
assets/js/atlas-data.js      50 standalone Atlas cabinets
assets/js/atlas.js           Atlas frame loop and input plumbing
assets/js/atlas/0*.js        five files, ten mechanics each
assets/js/kit.js             runner for the 160 kit and Atlas engines
assets/js/kit-engines.js     splits the kit libraries into 110 engines
assets/js/kits/*.js          the ten mode libraries behind 110 kit engines
assets/js/originals.js       the five later bespoke entries
```

## The 50 Atlas mechanics

The Atlas is no longer a 50 × 18 variant matrix. The 900 edition entries were
removed and replaced by one standalone cabinet for each of the 50 mechanics:
timing stops, ring matching, hold-and-release, tether control, balance, juggling,
catching, dodging, lane switching, flapping, landing, orbit switching, slinging,
putting, moving-reticle darts, hoop shots, cannon timing, pool, maze routing,
freehand paths, pipe rotation, laser mirrors, cross-flips, tile merging, sliding
tiles, crate pushing, nonograms, mines, word finds, falling-word typing,
arithmetic, number sequences, odd-one-out, pair matching, sequence memory,
rhythm, whack targets, bubble grouping, fruit slicing, invaders, endless running,
traffic crossing, fishing timing, patrol stealth, lockpicking, wire cutting,
parcel sorting, parking, Connect Four and push-your-luck dice.
