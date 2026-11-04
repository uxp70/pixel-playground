# 🎮 Pixel Playground

A tiny arcade of eight browser games. Plain HTML, CSS and JavaScript — no frameworks,
no build step, no trackers, no network calls after the page loads.

| Game | What it is | Record kept |
| --- | --- | --- |
| **Snake** | Neon snake on a 20×20 grid. Speed ramps up as you eat. | highest score |
| **2048** | Slide-and-merge puzzle on a 4×4 board. | highest score |
| **Breakout** | Paddle, ball, 40 bricks, three lives. | highest score |
| **Pong** | First to seven against the computer. | longest rally |
| **Memory Match** | Eight emoji pairs, scored by fewest moves. | fewest moves |
| **Simon** | Repeat a growing colour-and-tone sequence. | most rounds cleared |
| **Minesweeper** | 9×9, ten mines, first tap always safe. | fastest clear |
| **Reaction Test** | Five rounds, average reaction time in milliseconds. | best average |

## Play

Every game is built for phones first:

- **Touch controls** — on-screen d-pad for Snake, swipe for Snake/2048, drag for
  Breakout and Pong, long-press or flag mode for Minesweeper.
- **Fullscreen** — the `⛶` button (or <kbd>F</kbd>) fills the screen. It uses the
  Fullscreen API where available and a full-viewport layout on iPhone, where element
  fullscreen is not supported. <kbd>Esc</kbd> or the floating ✕ exits.
- **Nothing is selectable** — text selection, long-press callouts and the context menu
  on play surfaces are disabled, so dragging a paddle never highlights the page.
- **Boards own their gestures** — `touch-action: none` stops a swipe from scrolling,
  and `overscroll-behavior: none` kills pull-to-refresh mid-game.

Personal bests live in `localStorage`, so they stay on the device you play on.

## Run it locally

Any static file server works — there is nothing to build or install:

```bash
python3 -m http.server 3000
# then open http://localhost:3000
```

## Deploy to GitHub Pages

The site is served straight from the repository root, so Pages needs no build step.

1. Push this repository to GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to *Deploy from a branch*,
   the branch to `main`, and the folder to `/ (root)`.
4. Save. The site goes live at `https://<user>.github.io/<repo>/` within a minute or two.

The empty `.nojekyll` file stops Jekyll from processing the site, which keeps every
asset path exactly as written. Pushing to `main` republishes automatically.

## Layout

```
index.html               hub page with the game cards
games/*.html             one page per game
assets/css/style.css     the whole design system
assets/js/common.js      scores, sound, fullscreen, canvas + input helpers
assets/js/hub.js         fills in the records on the hub cards
assets/js/<game>.js      one script per game
favicon.svg
```

## Adding a game

1. Copy any `games/*.html` page and change the title, HUD and script tag. The
   fullscreen button is injected into the header automatically by `common.js`.
2. Add an `assets/js/<name>.js` script. `PP` from `common.js` gives you:
   - `scores.get/save(id, value, "high" | "low")`
   - `sfx("pick" | "good" | "bad" | "win")` and `tone(freq, ms)`
   - `fitCanvas`, `onDirectionalKeys`, `onSwipe`, `showOverlay` / `hideOverlay`
3. Add a `<a class="card">` to `index.html` with an accent colour and a
   `data-best="<name>"` badge (plus a label for it in `hub.js`).
