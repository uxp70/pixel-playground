/* Neon Snake — canvas, fixed grid, keyboard + swipe + on-screen d-pad. */
(function () {
  "use strict";

  var COLS = 20;
  var ROWS = 20;
  var CELL = 30;

  var canvas = document.getElementById("board");
  var ctx = PP.fitCanvas(canvas, COLS * CELL, ROWS * CELL);
  var overlay = document.getElementById("overlay");
  var scoreEl = document.getElementById("score");
  var lengthEl = document.getElementById("length");
  var levelEl = document.getElementById("level");
  var bestEl = document.getElementById("best");

  var BASE_STEP = 150;
  var MIN_STEP = 72;
  var STEP_DECAY = 5;

  var best = PP.scores.get("snake") || 0;
  bestEl.textContent = PP.formatNumber(best);

  var game = null;

  function paintHud() {
    scoreEl.textContent = PP.formatNumber(game.score);
    lengthEl.textContent = game.snake.length;
    levelEl.textContent = 1 + Math.round((BASE_STEP - game.step) / (STEP_DECAY * 6));
    bestEl.textContent = PP.formatNumber(best);
  }

  function placeFood() {
    var free = [];
    for (var y = 0; y < ROWS; y++) {
      for (var x = 0; x < COLS; x++) {
        var hit = game.snake.some(function (s) { return s.x === x && s.y === y; });
        if (!hit) free.push({ x: x, y: y });
      }
    }
    game.food = free.length ? free[Math.floor(Math.random() * free.length)] : null;
  }

  function reset() {
    game = {
      snake: [{ x: 9, y: 10 }, { x: 8, y: 10 }, { x: 7, y: 10 }],
      dir: { x: 1, y: 0 },
      queue: [],
      food: null,
      score: 0,
      step: BASE_STEP,
      acc: 0,
      running: false,
      paused: false,
      over: false,
      started: false,
    };
    placeFood();
    paintHud();
    draw(performance.now());
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

  function draw(time) {
    var w = COLS * CELL;
    var h = ROWS * CELL;

    var bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, "#0a0d1a");
    bg.addColorStop(1, "#10142a");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = "rgba(255,255,255,0.035)";
    ctx.lineWidth = 1;
    for (var i = 1; i < COLS; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL, 0);
      ctx.lineTo(i * CELL, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * CELL);
      ctx.lineTo(w, i * CELL);
      ctx.stroke();
    }

    if (!game) return;

    // Food
    if (game.food) {
      var pulse = 1 + Math.sin(time / 220) * 0.09;
      var fx = game.food.x * CELL + CELL / 2;
      var fy = game.food.y * CELL + CELL / 2;
      ctx.save();
      ctx.shadowColor = "#f472b6";
      ctx.shadowBlur = 22;
      ctx.fillStyle = "#f472b6";
      ctx.beginPath();
      ctx.arc(fx, fy, CELL * 0.32 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.beginPath();
      ctx.arc(fx - CELL * 0.1, fy - CELL * 0.1, CELL * 0.07, 0, Math.PI * 2);
      ctx.fill();
    }

    // Snake, tail darker than head
    var len = game.snake.length;
    for (var s = len - 1; s >= 0; s--) {
      var seg = game.snake[s];
      var t = len === 1 ? 0 : s / (len - 1);
      var hue = 158 + t * 105;
      var light = 62 - t * 16;
      var pad = s === 0 ? 1.5 : 2.5;
      ctx.fillStyle = "hsl(" + hue + " 82% " + light + "%)";
      if (s === 0) {
        ctx.save();
        ctx.shadowColor = "rgba(52,211,153,0.85)";
        ctx.shadowBlur = 18;
      }
      roundRect(
        seg.x * CELL + pad,
        seg.y * CELL + pad,
        CELL - pad * 2,
        CELL - pad * 2,
        s === 0 ? 9 : 7
      );
      ctx.fill();
      if (s === 0) ctx.restore();
    }

    // Eyes
    var head = game.snake[0];
    var cx = head.x * CELL + CELL / 2;
    var cy = head.y * CELL + CELL / 2;
    var ex = game.dir.y !== 0 ? CELL * 0.2 : 0;
    var ey = game.dir.x !== 0 ? CELL * 0.2 : 0;
    var fwd = 4;
    ctx.fillStyle = "#04150f";
    ctx.beginPath();
    ctx.arc(cx + game.dir.x * fwd + ex, cy + game.dir.y * fwd + ey, CELL * 0.09, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + game.dir.x * fwd - ex, cy + game.dir.y * fwd - ey, CELL * 0.09, 0, Math.PI * 2);
    ctx.fill();
  }

  /* ------------------------------------------------------------- game logic */

  function queueDir(x, y) {
    if (!game.running || game.over) return;
    var last = game.queue.length ? game.queue[game.queue.length - 1] : game.dir;
    if (last.x === -x && last.y === -y) return; // no instant reversal
    if (last.x === x && last.y === y) return;
    if (game.queue.length < 2) game.queue.push({ x: x, y: y });
  }

  function stepGame() {
    if (game.queue.length) {
      var next = game.queue.shift();
      if (!(next.x === -game.dir.x && next.y === -game.dir.y)) game.dir = next;
    }

    var head = {
      x: game.snake[0].x + game.dir.x,
      y: game.snake[0].y + game.dir.y,
    };

    if (head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS) {
      endGame();
      return;
    }

    var eating = game.food && head.x === game.food.x && head.y === game.food.y;
    var body = eating ? game.snake : game.snake.slice(0, game.snake.length - 1);
    var bitten = body.some(function (s) { return s.x === head.x && s.y === head.y; });
    if (bitten) {
      endGame();
      return;
    }

    game.snake.unshift(head);
    if (eating) {
      game.score += 10;
      game.step = Math.max(MIN_STEP, game.step - STEP_DECAY);
      PP.sfx("good");
      PP.juice.burstOn(canvas, head.x * CELL + CELL / 2, head.y * CELL + CELL / 2,
        "#f472b6", 12, CELL * 1.8);
      PP.juice.bump(scoreEl);
      PP.juice.haptic(10);
      placeFood();
    } else {
      game.snake.pop();
    }
    paintHud();
  }

  /* ---------------------------------------------------------------- states */

  function start() {
    PP.hideOverlay(overlay);
    if (game.over) reset();
    game.running = true;
    game.paused = false;
    game.started = true;
    game.acc = 0;
  }

  function togglePause() {
    if (!game.running || game.over) return;
    game.paused = !game.paused;
    if (game.paused) {
      PP.showOverlay(
        overlay,
        '<p class="kicker">Paused</p><h2>Take a breath</h2>' +
          '<p>Your snake is waiting exactly where you left it.</p>' +
          '<div class="actions"><button class="btn" type="button" id="resume">Resume</button></div>'
      );
      overlay.querySelector("#resume").addEventListener("click", togglePause);
    } else {
      PP.hideOverlay(overlay);
    }
  }

  function endGame() {
    game.over = true;
    game.running = false;
    PP.sfx("bad");
    PP.juice.shake(document.querySelector(".stage"), 9);
    PP.juice.haptic([30, 60, 40]);
    var previousBest = best;
    best = PP.scores.save("snake", game.score, "high");
    paintHud();
    var record = game.score > previousBest ? "New personal best!" : "Personal best: " + PP.formatNumber(best);
    PP.showOverlay(
      overlay,
      '<p class="kicker">Game over</p>' +
        '<h2>' + (game.score > previousBest ? "Record run" : "Nice try") + "</h2>" +
        '<div class="score-big">' + PP.formatNumber(game.score) + "</div>" +
        "<p>" + record + " · length " + game.snake.length + "</p>" +
        '<div class="actions"><button class="btn" type="button" id="again">Play again</button></div>'
    );
    overlay.querySelector("#again").addEventListener("click", start);
  }

  function showStart() {
    PP.showOverlay(
      overlay,
      '<p class="kicker">Ready</p><h2>Neon Snake</h2>' +
        "<p>Eat the glowing dots to grow. Walls and your own tail end the run.</p>" +
        '<div class="actions"><button class="btn" type="button" id="play">Start playing</button></div>'
    );
    overlay.querySelector("#play").addEventListener("click", start);
  }

  /* ------------------------------------------------------------------ input */

  var DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

  PP.onDirectionalKeys(function (x, y) {
    if (!game.running && !game.over) {
      start();
      queueDir(x, y);
      return;
    }
    queueDir(x, y);
  });

  PP.onSwipe(canvas, function (x, y) {
    if (!game.running && !game.over) start();
    queueDir(x, y);
  });

  Array.prototype.forEach.call(document.querySelectorAll("[data-dir]"), function (btn) {
    btn.addEventListener("click", function () {
      var dir = DIRS[btn.getAttribute("data-dir")];
      if (!game.running && !game.over) start();
      if (!game.paused) queueDir(dir[0], dir[1]);
    });
  });

  document.addEventListener("keydown", function (event) {
    if (event.code === "Space" || event.code === "KeyP") {
      event.preventDefault();
      togglePause();
    }
  });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden && game.running && !game.paused) togglePause();
  });

  /* ------------------------------------------------------------------- loop */

  var last = 0;
  function frame(time) {
    requestAnimationFrame(frame);
    if (!last) last = time;
    var dt = Math.min(time - last, 120);
    last = time;

    if (game && game.running && !game.paused && !game.over) {
      game.acc += dt;
      while (game.acc >= game.step) {
        game.acc -= game.step;
        stepGame();
        if (game.over) break;
      }
    }
    draw(time);
  }

  reset();
  showStart();
  requestAnimationFrame(frame);
})();
