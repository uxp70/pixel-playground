/* Breakout — paddle, ball, 40 bricks, three lives. */
(function () {
  "use strict";

  var W = 800;
  var H = 600;
  var PADDLE_W = 118;
  var PADDLE_H = 14;
  var PADDLE_Y = H - 44;
  var BALL_R = 9;
  var ROWS = 5;
  var COLS = 8;
  var PAD = 44;
  var GAP = 10;
  var TOP = 76;
  var BRICK_H = 26;
  var COLORS = ["#f472b6", "#c084fc", "#818cf8", "#22d3ee", "#34d399"];

  var canvas = document.getElementById("board");
  var ctx = PP.fitCanvas(canvas, W, H);
  var stageEl = document.querySelector(".stage");
  var overlay = document.getElementById("overlay");
  var scoreEl = document.getElementById("score");
  var remainingEl = document.getElementById("remaining");
  var livesEl = document.getElementById("lives");
  var bestEl = document.getElementById("best");

  var best = PP.scores.get("breakout") || 0;

  var game;

  function buildBricks() {
    var brickW = (W - PAD * 2 - GAP * (COLS - 1)) / COLS;
    var bricks = [];
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        bricks.push({
          x: PAD + c * (brickW + GAP),
          y: TOP + r * (BRICK_H + GAP),
          w: brickW,
          h: BRICK_H,
          color: COLORS[r],
          alive: true,
        });
      }
    }
    return bricks;
  }

  function resetBall() {
    game.ball.x = game.paddleX + PADDLE_W / 2;
    game.ball.y = PADDLE_Y - BALL_R - 4;
    game.ball.dx = 0;
    game.ball.dy = 0;
    game.pending = true;
  }

  function launch() {
    if (!game.pending) return;
    var angle = -Math.PI / 2 + (Math.random() * 0.6 - 0.3);
    game.ball.dx = Math.cos(angle) * game.speed;
    game.ball.dy = Math.sin(angle) * game.speed;
    game.pending = false;
    PP.sfx("pick");
  }

  function paintHud() {
    var left = game.bricks.filter(function (b) { return b.alive; }).length;
    scoreEl.textContent = PP.formatNumber(game.score);
    remainingEl.textContent = left;
    livesEl.textContent = game.lives > 0 ? "♥".repeat(game.lives) : "—";
    bestEl.textContent = PP.formatNumber(best);
  }

  function reset() {
    game = {
      paddleX: W / 2 - PADDLE_W / 2,
      ball: { x: W / 2, y: PADDLE_Y - BALL_R - 4, dx: 0, dy: 0 },
      bricks: buildBricks(),
      score: 0,
      lives: 3,
      speed: 6.2,
      running: false,
      over: false,
      pending: true,
      keys: { left: false, right: false },
    };
    paintHud();
    draw();
  }

  /* ---------------------------------------------------------------- physics */

  function loseLife() {
    game.lives--;
    paintHud();
    PP.sfx("bad");
    PP.juice.shake(stageEl, 9);
    PP.juice.haptic([25, 50, 25]);
    if (game.lives <= 0) {
      endGame(false);
      return;
    }
    resetBall();
  }

  function collide() {
    var b = game.ball;

    if (b.x - BALL_R < 0) {
      b.x = BALL_R;
      b.dx = Math.abs(b.dx);
      PP.sfx("pick");
    } else if (b.x + BALL_R > W) {
      b.x = W - BALL_R;
      b.dx = -Math.abs(b.dx);
      PP.sfx("pick");
    }
    if (b.y - BALL_R < 0) {
      b.y = BALL_R;
      b.dy = Math.abs(b.dy);
      PP.sfx("pick");
    }

    // Paddle
    if (
      b.dy > 0 &&
      b.y + BALL_R >= PADDLE_Y &&
      b.y - BALL_R <= PADDLE_Y + PADDLE_H &&
      b.x >= game.paddleX - BALL_R &&
      b.x <= game.paddleX + PADDLE_W + BALL_R
    ) {
      var offset = (b.x - (game.paddleX + PADDLE_W / 2)) / (PADDLE_W / 2);
      offset = Math.max(-1, Math.min(1, offset));
      var angle = offset * (Math.PI / 3);
      var speed = Math.hypot(b.dx, b.dy) || game.speed;
      b.dx = Math.sin(angle) * speed;
      b.dy = -Math.cos(angle) * speed;
      b.y = PADDLE_Y - BALL_R - 0.5;
      PP.sfx("pick");
    }

    // Floor
    if (b.y - BALL_R > H) {
      loseLife();
      return;
    }

    // Bricks
    for (var i = 0; i < game.bricks.length; i++) {
      var brick = game.bricks[i];
      if (!brick.alive) continue;
      if (
        b.x + BALL_R < brick.x ||
        b.x - BALL_R > brick.x + brick.w ||
        b.y + BALL_R < brick.y ||
        b.y - BALL_R > brick.y + brick.h
      ) continue;

      var cx = brick.x + brick.w / 2;
      var cy = brick.y + brick.h / 2;
      var penX = brick.w / 2 + BALL_R - Math.abs(b.x - cx);
      var penY = brick.h / 2 + BALL_R - Math.abs(b.y - cy);

      if (penX < penY) {
        b.x += b.x < cx ? -penX : penX;
        b.dx = -b.dx;
      } else {
        b.y += b.y < cy ? -penY : penY;
        b.dy = -b.dy;
      }

      brick.alive = false;
      game.score += 10;
      paintHud();
      PP.sfx("good");
      PP.juice.burstOn(canvas, cx, cy, brick.color, 9, 44);
      PP.juice.shake(stageEl, 2.5);
      PP.juice.bump(scoreEl);
      PP.juice.haptic(6);
      break;
    }

    if (game.bricks.every(function (brick) { return !brick.alive; })) {
      endGame(true);
    }
  }

  function update(dt) {
    if (game.keys.left) game.paddleX -= 10 * dt;
    if (game.keys.right) game.paddleX += 10 * dt;
    game.paddleX = Math.max(0, Math.min(W - PADDLE_W, game.paddleX));

    if (game.pending) {
      game.ball.x = game.paddleX + PADDLE_W / 2;
      game.ball.y = PADDLE_Y - BALL_R - 4;
      return;
    }

    var b = game.ball;
    var distance = Math.hypot(b.dx, b.dy) * dt;
    var steps = Math.max(1, Math.ceil(distance / (BALL_R * 0.7)));
    for (var s = 0; s < steps; s++) {
      b.x += (b.dx * dt) / steps;
      b.y += (b.dy * dt) / steps;
      collide();
      if (!game.running) return;
    }
  }

  /* ---------------------------------------------------------------- drawing */

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function draw() {
    var bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#0c1024");
    bg.addColorStop(1, "#070a15");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, W - 2, H - 2);

    if (!game) return;

    game.bricks.forEach(function (brick) {
      if (!brick.alive) return;
      ctx.save();
      ctx.shadowColor = brick.color;
      ctx.shadowBlur = 12;
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = brick.color;
      roundRect(brick.x, brick.y, brick.w, brick.h, 7);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = "rgba(255,255,255,0.22)";
      roundRect(brick.x + 5, brick.y + 5, brick.w - 10, 5, 3);
      ctx.fill();
    });

    // Paddle
    var paddleGradient = ctx.createLinearGradient(game.paddleX, 0, game.paddleX + PADDLE_W, 0);
    paddleGradient.addColorStop(0, "#22d3ee");
    paddleGradient.addColorStop(1, "#8b5cf6");
    ctx.save();
    ctx.shadowColor = "#22d3ee";
    ctx.shadowBlur = 22;
    ctx.fillStyle = paddleGradient;
    roundRect(game.paddleX, PADDLE_Y, PADDLE_W, PADDLE_H, 7);
    ctx.fill();
    ctx.restore();

    // Motion trail
    for (var t = 4; t >= 1; t--) {
      ctx.globalAlpha = 0.085 * (5 - t);
      ctx.fillStyle = "#a5f3fc";
      ctx.beginPath();
      ctx.arc(
        game.ball.x - game.ball.dx * t * 0.6,
        game.ball.y - game.ball.dy * t * 0.6,
        BALL_R * (1 - t * 0.13),
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Ball
    ctx.save();
    ctx.shadowColor = "#f472b6";
    ctx.shadowBlur = 24;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(game.ball.x, game.ball.y, BALL_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (game.pending) {
      ctx.fillStyle = "rgba(238,240,255,0.55)";
      ctx.font = "600 20px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Click, tap or press space to launch", W / 2, PADDLE_Y - 62);
    }
  }

  /* ----------------------------------------------------------------- states */

  function start() {
    PP.hideOverlay(overlay);
    if (game.over) reset();
    game.running = true;
    game.over = false;
    game.pending = true;
    launch();
  }

  function endGame(won) {
    var previous = best;
    game.running = false;
    game.over = true;
    game.pending = true;
    best = PP.scores.save("breakout", game.score, "high");
    paintHud();
    PP.sfx(won ? "win" : "bad");

    PP.showOverlay(
      overlay,
      '<p class="kicker">' + (won ? "Wall cleared" : "Out of lives") + "</p>" +
        "<h2>" + (won ? "You broke it all" : "Game over") + "</h2>" +
        '<div class="score-big">' + PP.formatNumber(game.score) + "</div>" +
        "<p>" + (game.score > previous ? "New personal best!" : "Personal best: " + PP.formatNumber(best)) + "</p>" +
        '<div class="actions"><button class="btn" type="button" id="again">Play again</button></div>'
    );
    overlay.querySelector("#again").addEventListener("click", function () {
      reset();
      start();
    });
  }

  function showStart() {
    PP.showOverlay(
      overlay,
      '<p class="kicker">Ready</p><h2>Breakout</h2>' +
        "<p>Clear all 40 bricks. You get three lives and a paddle that follows your pointer.</p>" +
        '<div class="actions"><button class="btn" type="button" id="play">Start playing</button></div>'
    );
    overlay.querySelector("#play").addEventListener("click", start);
  }

  /* ------------------------------------------------------------------ input */

  function movePaddleTo(clientX) {
    var rect = canvas.getBoundingClientRect();
    var logicalX = ((clientX - rect.left) / rect.width) * W;
    game.paddleX = Math.max(0, Math.min(W - PADDLE_W, logicalX - PADDLE_W / 2));
    if (game.pending) {
      game.ball.x = game.paddleX + PADDLE_W / 2;
    }
  }

  canvas.addEventListener("pointermove", function (event) {
    if (!game.running) return;
    movePaddleTo(event.clientX);
  });

  canvas.addEventListener("pointerdown", function (event) {
    if (!game.running) return;
    movePaddleTo(event.clientX);
    launch();
  });

  document.addEventListener("keydown", function (event) {
    if (event.code === "ArrowLeft" || event.code === "KeyA") {
      game.keys.left = true;
      event.preventDefault();
    } else if (event.code === "ArrowRight" || event.code === "KeyD") {
      game.keys.right = true;
      event.preventDefault();
    } else if (event.code === "Space") {
      event.preventDefault();
      if (game.running && game.pending) launch();
    }
  });

  document.addEventListener("keyup", function (event) {
    if (event.code === "ArrowLeft" || event.code === "KeyA") game.keys.left = false;
    if (event.code === "ArrowRight" || event.code === "KeyD") game.keys.right = false;
  });

  /* ------------------------------------------------------------------- loop */

  var last = 0;
  function frame(time) {
    requestAnimationFrame(frame);
    if (!last) last = time;
    var dt = Math.min((time - last) / 16.667, 2.2);
    last = time;

    if (game && game.running && !game.over) update(dt);
    draw();
  }

  reset();
  showStart();
  requestAnimationFrame(frame);
})();
