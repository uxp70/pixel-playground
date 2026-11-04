/* Pong — you on the left, a beatable CPU on the right. First to seven. */
(function () {
  "use strict";

  var W = 800;
  var H = 600;
  var PADDLE_W = 14;
  var PADDLE_H = 88;
  var PADDLE_X = 30;
  var BALL_R = 8;
  var WIN_SCORE = 7;

  var canvas = document.getElementById("board");
  var ctx = PP.fitCanvas(canvas, W, H);
  var overlay = document.getElementById("overlay");
  var youEl = document.getElementById("you");
  var cpuEl = document.getElementById("cpu");
  var rallyEl = document.getElementById("rally");
  var bestEl = document.getElementById("best");

  var bestRally = PP.scores.get("pong") || 0;
  bestEl.textContent = PP.formatNumber(bestRally);

  var game = null;

  function paintHud() {
    youEl.textContent = game.score.you;
    cpuEl.textContent = game.score.cpu;
    rallyEl.textContent = game.rally;
    bestEl.textContent = PP.formatNumber(bestRally);
  }

  function reset() {
    game = {
      player: { y: H / 2 - PADDLE_H / 2, target: H / 2 - PADDLE_H / 2 },
      cpu: { y: H / 2 - PADDLE_H / 2 },
      ball: { x: W / 2, y: H / 2, dx: 0, dy: 0 },
      baseSpeed: 7,
      speed: 7,
      score: { you: 0, cpu: 0 },
      rally: 0,
      serveIn: 800,
      serveTo: Math.random() < 0.5 ? -1 : 1,
      running: false,
      over: false,
      keys: { up: false, down: false },
    };
    paintHud();
    draw();
  }

  function serve() {
    var angle = (Math.random() * 0.5 - 0.25);
    var dirX = game.serveTo;
    game.ball.x = W / 2;
    game.ball.y = H / 2;
    game.ball.dx = Math.cos(angle) * game.speed * dirX;
    game.ball.dy = Math.sin(angle) * game.speed;
    game.serveIn = 0;
  }

  function countRally() {
    game.rally++;
    if (game.rally > bestRally) {
      bestRally = PP.scores.save("pong", game.rally, "high");
    }
    paintHud();
  }

  function bounce(paddleY, direction) {
    var ball = game.ball;
    var center = paddleY + PADDLE_H / 2;
    var offset = (ball.y - center) / (PADDLE_H / 2);
    offset = Math.max(-1, Math.min(1, offset));
    var angle = offset * (Math.PI / 3.2);
    var speed = Math.min(game.baseSpeed + game.rally * 0.22, 15);
    ball.dx = Math.cos(angle) * speed * direction;
    ball.dy = Math.sin(angle) * speed;
  }

  function point(who) {
    game.score[who]++;
    game.rally = 0;
    game.speed = game.baseSpeed;
    game.serveTo = who === "you" ? 1 : -1;
    game.serveIn = 900;
    game.ball.dx = 0;
    game.ball.dy = 0;
    game.ball.x = W / 2;
    game.ball.y = H / 2;
    PP.sfx(who === "you" ? "good" : "bad");
    paintHud();
    if (game.score[who] >= WIN_SCORE) endGame(who === "you");
  }

  function collide() {
    var ball = game.ball;

    if (ball.y - BALL_R < 0) {
      ball.y = BALL_R;
      ball.dy = Math.abs(ball.dy);
      PP.sfx("pick");
    } else if (ball.y + BALL_R > H) {
      ball.y = H - BALL_R;
      ball.dy = -Math.abs(ball.dy);
      PP.sfx("pick");
    }

    var left = PADDLE_X;
    if (
      ball.dx < 0 &&
      ball.x - BALL_R <= left + PADDLE_W &&
      ball.x - BALL_R >= left - 24 &&
      ball.y + BALL_R >= game.player.y &&
      ball.y - BALL_R <= game.player.y + PADDLE_H
    ) {
      ball.x = left + PADDLE_W + BALL_R;
      bounce(game.player.y, 1);
      countRally();
      PP.sfx("pick");
    }

    var right = W - PADDLE_X - PADDLE_W;
    if (
      ball.dx > 0 &&
      ball.x + BALL_R >= right &&
      ball.x + BALL_R <= right + PADDLE_W + 24 &&
      ball.y + BALL_R >= game.cpu.y &&
      ball.y - BALL_R <= game.cpu.y + PADDLE_H
    ) {
      ball.x = right - BALL_R;
      bounce(game.cpu.y, -1);
      countRally();
      PP.sfx("pick");
    }
  }

  function update(dt) {
    var step = dt * 16.667;

    // Player paddle: pointer target wins, otherwise keyboard
    if (game.keys.up) game.player.target -= 11 * dt;
    if (game.keys.down) game.player.target += 11 * dt;
    game.player.target = Math.max(0, Math.min(H - PADDLE_H, game.player.target));
    game.player.y += (game.player.target - game.player.y) * Math.min(1, 0.32 * dt);

    // CPU: tracks the ball only while it is coming at it, with a little lag
    var wantsCenter = game.ball.dx <= 0;
    var targetY = wantsCenter ? H / 2 - PADDLE_H / 2 : game.ball.y - PADDLE_H / 2;
    var speed = 4.6 + Math.min(game.rally * 0.14, 2.4);
    var diff = targetY - game.cpu.y;
    game.cpu.y += Math.max(-speed * dt, Math.min(speed * dt, diff));
    game.cpu.y = Math.max(0, Math.min(H - PADDLE_H, game.cpu.y));

    if (game.serveIn > 0) {
      game.serveIn -= step;
      return;
    }
    if (!game.ball.dx && !game.ball.dy) serve();

    var distance = Math.hypot(game.ball.dx, game.ball.dy) * dt;
    var steps = Math.max(1, Math.ceil(distance / (BALL_R * 0.8)));
    for (var s = 0; s < steps; s++) {
      game.ball.x += (game.ball.dx * dt) / steps;
      game.ball.y += (game.ball.dy * dt) / steps;
      collide();
      if (game.over) return;
    }

    if (game.ball.x < -30) point("cpu");
    else if (game.ball.x > W + 30) point("you");
  }

  /* ---------------------------------------------------------------- drawing */

  function draw() {
    var bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#0b1020");
    bg.addColorStop(1, "#080a15");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Centre line
    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.lineWidth = 4;
    ctx.setLineDash([16, 22]);
    ctx.beginPath();
    ctx.moveTo(W / 2, 20);
    ctx.lineTo(W / 2, H - 20);
    ctx.stroke();
    ctx.setLineDash([]);

    if (!game) return;

    // Scoreboard
    ctx.fillStyle = "rgba(238,240,255,0.22)";
    ctx.font = "800 92px ui-rounded, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(game.score.you), W / 2 - 120, 118);
    ctx.fillText(String(game.score.cpu), W / 2 + 120, 118);

    // Paddles
    var grad = ctx.createLinearGradient(0, 0, 0, PADDLE_H);
    grad.addColorStop(0, "#22d3ee");
    grad.addColorStop(1, "#8b5cf6");
    ctx.save();
    ctx.shadowColor = "#22d3ee";
    ctx.shadowBlur = 22;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(PADDLE_X, game.player.y, PADDLE_W, PADDLE_H, 7) : ctx.rect(PADDLE_X, game.player.y, PADDLE_W, PADDLE_H);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.shadowColor = "#f472b6";
    ctx.shadowBlur = 22;
    ctx.fillStyle = "#f472b6";
    ctx.beginPath();
    var rightX = W - PADDLE_X - PADDLE_W;
    if (ctx.roundRect) ctx.roundRect(rightX, game.cpu.y, PADDLE_W, PADDLE_H, 7);
    else ctx.rect(rightX, game.cpu.y, PADDLE_W, PADDLE_H);
    ctx.fill();
    ctx.restore();

    // Ball
    ctx.save();
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 24;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(game.ball.x, game.ball.y, BALL_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (game.running && game.serveIn > 0) {
      ctx.fillStyle = "rgba(238,240,255,0.5)";
      ctx.font = "600 20px system-ui, sans-serif";
      ctx.fillText("Get ready…", W / 2, H / 2 + 64);
    }
  }

  /* ----------------------------------------------------------------- states */

  function start() {
    PP.hideOverlay(overlay);
    if (game.over) reset();
    game.running = true;
    game.over = false;
    game.serveIn = 700;
    game.ball.dx = 0;
    game.ball.dy = 0;
  }

  function endGame(youWon) {
    game.running = false;
    game.over = true;
    PP.sfx(youWon ? "win" : "bad");
    PP.showOverlay(
      overlay,
      '<p class="kicker">' + (youWon ? "Match won" : "Match lost") + "</p>" +
        "<h2>" + (youWon ? "You win!" : "CPU takes it") + "</h2>" +
        '<div class="score-big">' + game.score.you + " – " + game.score.cpu + "</div>" +
        "<p>Longest rally this session: " + bestRally + " hits.</p>" +
        '<div class="actions"><button class="btn" type="button" id="again">Play again</button></div>'
    );
    overlay.querySelector("#again").addEventListener("click", start);
  }

  function showStart() {
    PP.showOverlay(
      overlay,
      '<p class="kicker">Ready</p><h2>Pong</h2>' +
        "<p>First to seven. Move your paddle by dragging on the court, or with the arrow keys.</p>" +
        '<div class="actions"><button class="btn" type="button" id="play">Start match</button></div>'
    );
    overlay.querySelector("#play").addEventListener("click", start);
  }

  /* ------------------------------------------------------------------ input */

  function moveTo(clientY) {
    var rect = canvas.getBoundingClientRect();
    var logicalY = ((clientY - rect.top) / rect.height) * H;
    game.player.target = logicalY - PADDLE_H / 2;
  }

  canvas.addEventListener("pointerdown", function (event) {
    if (!game.running) return;
    moveTo(event.clientY);
  });
  canvas.addEventListener("pointermove", function (event) {
    if (!game.running) return;
    if (event.pointerType === "mouse" || event.buttons) moveTo(event.clientY);
  });

  document.addEventListener("keydown", function (event) {
    if (event.code === "ArrowUp" || event.code === "KeyW") {
      game.keys.up = true;
      event.preventDefault();
    } else if (event.code === "ArrowDown" || event.code === "KeyS") {
      game.keys.down = true;
      event.preventDefault();
    }
  });
  document.addEventListener("keyup", function (event) {
    if (event.code === "ArrowUp" || event.code === "KeyW") game.keys.up = false;
    if (event.code === "ArrowDown" || event.code === "KeyS") game.keys.down = false;
  });

  /* ------------------------------------------------------------------- loop */

  var last = 0;
  function frame(time) {
    requestAnimationFrame(frame);
    if (!last) last = time;
    var dt = Math.min((time - last) / 16.667, 2.2);
    last = time;

    if (game.running && !game.over) update(dt);
    draw();
  }

  reset();
  showStart();
  requestAnimationFrame(frame);
})();
