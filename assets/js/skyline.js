/* Skyline — stack the sliding floors and build the tallest tower you can. */
(function () {
  "use strict";

  var W = 560;
  var H = 640;
  var BLOCK_H = 34;
  var START_W = 220;
  var GROUND_Y = H - 84;
  var PERFECT = 6;
  var COLORS = ["#22d3ee", "#38bdf8", "#818cf8", "#a78bfa", "#c084fc",
    "#f472b6", "#fb7185", "#fbbf24", "#34d399"];

  var canvas = document.getElementById("board");
  var ctx = PP.fitCanvas(canvas, W, H);
  var stageEl = document.querySelector(".stage");
  var overlay = document.getElementById("overlay");
  var floorsEl = document.getElementById("floors");
  var streakEl = document.getElementById("streak");
  var bestEl = document.getElementById("best");

  var best = PP.scores.get("skyline") || 0;
  bestEl.textContent = PP.formatNumber(best);

  var game = null;
  var camera = 0;
  var targetCamera = 0;
  var fragments = [];
  var stars = [];
  var lastTime = 0;

  for (var s = 0; s < 64; s++) {
    stars.push({
      x: Math.random() * W,
      y: Math.random() * H * 3,
      r: 0.5 + Math.random() * 1.4,
      a: 0.12 + Math.random() * 0.4,
    });
  }

  function paintHud() {
    floorsEl.textContent = game.floors;
    streakEl.textContent = game.streak;
    bestEl.textContent = PP.formatNumber(best);
  }

  function baseBlock() {
    return { x: (W - START_W) / 2, w: START_W, y: GROUND_Y - BLOCK_H };
  }

  function spawn(prev) {
    var fromLeft = game.blocks.length % 2 === 1;
    return {
      x: fromLeft ? 0 : W - prev.w,
      w: prev.w,
      y: prev.y - BLOCK_H,
      dir: fromLeft ? 1 : -1,
      speed: Math.min(2.4 + game.blocks.length * 0.15, 8.4),
    };
  }

  function reset() {
    var pad = baseBlock();
    game = { blocks: [pad], moving: null, floors: 0, streak: 0, running: false, over: false };
    game.moving = spawn(pad);
    camera = 0;
    targetCamera = 0;
    fragments = [];
    paintHud();
    draw();
  }

  /* ------------------------------------------------------------------ play */

  function drop() {
    if (!game || !game.running || !game.moving) return;

    var moving = game.moving;
    var top = game.blocks[game.blocks.length - 1];
    var left = Math.max(moving.x, top.x);
    var right = Math.min(moving.x + moving.w, top.x + top.w);
    var overlap = right - left;

    if (overlap <= 4) {
      game.moving = null;
      endGame();
      return;
    }

    var perfect = Math.abs(moving.x - top.x) <= PERFECT;
    var placed;

    if (perfect) {
      var grew = Math.min(START_W, moving.w + 7);
      placed = { x: top.x + top.w / 2 - grew / 2, w: grew, y: moving.y };
      game.streak++;
      PP.sfx("good");
      PP.juice.haptic(12);
      PP.juice.bump(streakEl);
      PP.juice.burstOn(canvas, placed.x + placed.w / 2, placed.y + BLOCK_H / 2,
        "#fbbf24", 14, 54);
    } else {
      placed = { x: left, w: overlap, y: moving.y };
      game.streak = 0;
      PP.sfx("pick");
      PP.juice.haptic(6);

      if (moving.x < top.x) {
        fragments.push({
          x: moving.x, y: moving.y, w: top.x - moving.x, h: BLOCK_H,
          vx: -0.5, vy: -0.8, life: 1,
        });
      }
      if (moving.x + moving.w > top.x + top.w) {
        fragments.push({
          x: top.x + top.w, y: moving.y,
          w: moving.x + moving.w - (top.x + top.w), h: BLOCK_H,
          vx: 0.5, vy: -0.8, life: 1,
        });
      }
      PP.juice.shake(stageEl, 2);
    }

    game.blocks.push(placed);
    game.floors = game.blocks.length - 1;
    game.moving = spawn(placed);
    targetCamera = Math.min(0, game.moving.y - H * 0.55);
    paintHud();
  }

  function update(dt) {
    if (game.moving) {
      var moving = game.moving;
      moving.x += moving.dir * moving.speed * dt;
      if (moving.x <= 0) {
        moving.x = 0;
        moving.dir = 1;
      } else if (moving.x + moving.w >= W) {
        moving.x = W - moving.w;
        moving.dir = -1;
      }
    }

    camera += (targetCamera - camera) * Math.min(1, 0.16 * dt);

    for (var i = fragments.length - 1; i >= 0; i--) {
      var f = fragments[i];
      f.x += f.vx * dt * 4;
      f.y += f.vy * dt * 4;
      f.vy += 0.5 * dt;
      f.life -= 0.02 * dt;
      if (f.life <= 0) fragments.splice(i, 1);
    }
  }

  /* ---------------------------------------------------------------- drawing */

  function roundRect(x, y, w, h, r) {
    var radius = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function draw() {
    var sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#0a0f24");
    sky.addColorStop(0.62, "#0b1020");
    sky.addColorStop(1, "#151129");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Stars, drifting slowly against the camera.
    for (var i = 0; i < stars.length; i++) {
      var star = stars[i];
      var span = H * 3;
      var sy = ((star.y - camera * 0.35) % span + span) % span - H;
      if (sy < -8 || sy > H + 8) continue;
      ctx.globalAlpha = star.a;
      ctx.fillStyle = "#dbeafe";
      ctx.beginPath();
      ctx.arc(star.x, sy, star.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (!game) return;

    ctx.save();
    ctx.translate(0, -camera);

    for (var b = 0; b < game.blocks.length; b++) {
      var block = game.blocks[b];
      ctx.fillStyle = COLORS[b % COLORS.length];
      ctx.globalAlpha = 0.92;
      roundRect(block.x, block.y, block.w, BLOCK_H, 7);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.fillStyle = "rgba(255,255,255,0.3)";
      roundRect(block.x + 4, block.y + 4, Math.max(0, block.w - 8), 5, 3);
      ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      roundRect(block.x + 4, block.y + BLOCK_H - 6, Math.max(0, block.w - 8), 3, 2);
      ctx.fill();
    }

    for (var f = 0; f < fragments.length; f++) {
      var frag = fragments[f];
      ctx.globalAlpha = Math.max(0, frag.life) * 0.75;
      ctx.fillStyle = "#94a3b8";
      roundRect(frag.x, frag.y, Math.max(1, frag.w), frag.h, 5);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (game.moving) {
      var live = game.moving;
      ctx.save();
      ctx.shadowColor = "#22d3ee";
      ctx.shadowBlur = 26;
      ctx.fillStyle = "#e6edff";
      roundRect(live.x, live.y, live.w, BLOCK_H, 7);
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = "rgba(34,211,238,0.85)";
      roundRect(live.x + 4, live.y + 4, Math.max(0, live.w - 8), 4, 2);
      ctx.fill();
    }

    ctx.restore();

    if (game.floors === 0 && game.running) {
      ctx.fillStyle = "rgba(238,240,255,0.45)";
      ctx.font = "600 18px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Tap to drop the floor", W / 2, H - 30);
    }
  }

  /* ----------------------------------------------------------------- states */

  function start() {
    PP.hideOverlay(overlay);
    if (!game || game.over) reset();
    game.running = true;
    game.over = false;
    PP.sfx("pick");
  }

  function endGame() {
    game.running = false;
    game.over = true;
    var previous = best;

    best = PP.scores.save("skyline", game.floors, "high");
    paintHud();

    PP.sfx("bad");
    PP.juice.shake(stageEl, 10);
    PP.juice.haptic([40, 70, 60]);
    PP.leaderboard.submit("skyline", game.floors);

    PP.showOverlay(
      overlay,
      '<p class="kicker">Tower down</p>' +
        "<h2>" + (game.floors > previous ? "New best skyline" : "Nice stack") + "</h2>" +
        '<div class="score-big">' + game.floors + " floor" + (game.floors === 1 ? "" : "s") + "</div>" +
        "<p>Tallest so far: " + PP.formatNumber(best) + " floors.</p>" +
        '<div class="actions"><button class="btn" type="button" id="again">Build again</button></div>'
    );
    overlay.querySelector("#again").addEventListener("click", start);
  }

  function showStart() {
    PP.showOverlay(
      overlay,
      '<p class="kicker">One tap</p><h2>Skyline</h2>' +
        "<p>Drop each sliding floor on top of the last. Dead-centre drops keep the " +
        "full width; off-centre drops shave it down.</p>" +
        '<div class="actions"><button class="btn" type="button" id="play">Start building</button></div>'
    );
    overlay.querySelector("#play").addEventListener("click", start);
  }

  /* ------------------------------------------------------------------ input */

  canvas.addEventListener("pointerdown", function (event) {
    if (!game || !game.running) return;
    event.preventDefault();
    drop();
  });

  document.addEventListener("keydown", function (event) {
    if (!game || !game.running) return;
    if (event.code !== "Space" && event.code !== "ArrowDown" && event.code !== "Enter") return;
    event.preventDefault();
    drop();
  });

  /* ------------------------------------------------------------------- loop */

  function frame(time) {
    requestAnimationFrame(frame);
    if (!lastTime) lastTime = time;
    var dt = Math.min((time - lastTime) / 16.667, 2.2);
    lastTime = time;

    if (game && game.running) update(dt);
    draw();
  }

  reset();
  showStart();
  requestAnimationFrame(frame);
})();
