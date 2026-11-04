# 🎮 Pixel Playground

A tiny arcade of five browser games. Plain HTML, CSS and JavaScript — no frameworks,
no build step, no trackers, no network calls after the page loads.

| Game | What it is |
| --- | --- |
| **Snake** | Neon snake on a 20×20 grid. Speed ramps up as you eat. |
| **2048** | Slide-and-merge puzzle on a 4×4 board. |
| **Memory Match** | Eight emoji pairs, scored by fewest moves. |
| **Breakout** | Paddle, ball, 40 bricks, three lives. |
| **Reaction Test** | Five rounds, average reaction time in milliseconds. |

Every game works with a keyboard, a mouse and touch. Personal bests are stored in
`localStorage`, so they stay on the device you play on.

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
asset path exactly as written.

## Layout

```
index.html            hub page with the game cards
games/*.html          one page per game
assets/css/style.css  the whole design system
assets/js/common.js   scores, sound, canvas + input helpers
assets/js/*.js        one script per game (plus hub.js)
favicon.svg
```

## Adding a game

1. Copy any `games/*.html` page and change the title, HUD and script tag.
2. Add an `assets/js/<name>.js` script. `PP` from `common.js` gives you
   `scores.get/save`, `sfx`, `fitCanvas`, `onDirectionalKeys`, `onSwipe` and the
   overlay helpers.
3. Add a `<a class="card">` to `index.html` with an accent colour and a
   `data-best="<name>"` badge.
