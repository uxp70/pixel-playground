/* Bounce Break — vertical paddle, sideways ball, a wall on the right. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, clamp = K.clamp, rr = K.roundRect;

  var MODE = { name: "Bounce Break", level: 5, hudA: "Score", hudB: "Lives", pattern: "waves" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var PX = 48, PW = 18, PH = 112;
      var py = H / 2 - PH / 2;
      var bricks = [], balls = [], lives = 3, score = 0, launched = false, over = false;

      function wall() {
        bricks = [];
        var cols = 4, rows = 7, bw = 52, bh = 28, gx = 8, gy = 8;
        var x0 = W - 34 - (cols * (bw + gx) - gx);
        for (var r = 0; r < rows; r++) {
          for (var c = 0; c < cols; c++) {
            bricks.push({ x: x0 + c * (bw + gx), y: 64 + r * (bh + gy), w: bw, h: bh, hp: 1 });
          }
        }
      }

      function park() {
        launched = false;
        balls = [{ x: PX + PW + 12, y: py + PH / 2, vx: 0, vy: 0, r: 9 }];
      }

      function launch() {
        if (launched || over) return;
        launched = true;
        var vy = rand(-90, 90);
        balls = [{ x: PX + PW + 12, y: py + PH / 2, vx: Math.sqrt(330 * 330 - vy * vy), vy: vy, r: 9 }];
        api.sfx("pick");
      }

      function end() {
        if (over) return;
        over = true;
        api.finish(score);
      }

      function loseBall() {
        lives--;
        api.sfx("bad");
        api.shake(9);
        api.haptic(24);
        if (lives <= 0) { end(); return; }
        park();
      }

      function step(dt) {
        if (!launched || over) return;
        for (var b = balls.length - 1; b >= 0; b--) {
          var ball = balls[b];
          ball.x += ball.vx * dt;
          ball.y += ball.vy * dt;
          if (ball.y < ball.r + 10) { ball.y = ball.r + 10; ball.vy = Math.abs(ball.vy); api.sfx("pick"); }
          if (ball.y > H - ball.r - 10) { ball.y = H - ball.r - 10; ball.vy = -Math.abs(ball.vy); api.sfx("pick"); }
          if (ball.x > W - ball.r - 10) { ball.x = W - ball.r - 10; ball.vx = -Math.abs(ball.vx); api.sfx("pick"); }

          if (ball.vx < 0 && ball.x - ball.r <= PX + PW && ball.x - ball.r >= PX - 14 &&
              ball.y > py - 10 && ball.y < py + PH + 10) {
            ball.x = PX + PW + ball.r;
            var off = clamp((ball.y - (py + PH / 2)) / (PH / 2), -1, 1);
            ball.vy = off * 232;
            ball.vx = Math.sqrt(Math.max(330 * 330 - ball.vy * ball.vy, 110));
            api.sfx("pick");
            api.haptic(4);
          }

          for (var i = bricks.length - 1; i >= 0; i--) {
            var br = bricks[i];
            if (ball.x < br.x || ball.x > br.x + br.w || ball.y < br.y || ball.y > br.y + br.h) continue;
            var gapX = Math.min(ball.x - br.x, br.x + br.w - ball.x);
            var gapY = Math.min(ball.y - br.y, br.y + br.h - ball.y);
            if (gapX < gapY) ball.vx *= -1; else ball.vy *= -1;
            bricks.splice(i, 1);
            score += 10;
            api.burst(ball.x, ball.y, api.accent, 5);
            break;
          }

          if (ball.x < -30) {
            balls.splice(b, 1);
            if (!balls.length) { loseBall(); if (over) return; }
          }
        }
        if (!bricks.length && !over) {
          score += 80;
          wall();
          park();
          api.sfx("win");
        }
      }

      function update(dt) {
        if (over) return;
        if (api.keys.ArrowUp || api.keys.KeyW) py = clamp(py - 440 * dt, 12, H - PH - 12);
        if (api.keys.ArrowDown || api.keys.KeyS) py = clamp(py + 440 * dt, 12, H - PH - 12);
        if (!launched) { balls[0].y = py + PH / 2; balls[0].x = PX + PW + 12; }
        step(dt / 2);
        if (over) return;
        step(dt / 2);
        if (over) return;
        api.hud(score, lives + " lives");
      }

      function draw() {
        api.bg();
        for (var i = 0; i < bricks.length; i++) {
          var br = bricks[i];
          ctx.fillStyle = "rgba(34,211,238,0.55)";
          rr(ctx, br.x, br.y, br.w, br.h, 5); ctx.fill();
        }
        ctx.fillStyle = "#f8fafc";
        rr(ctx, PX, py, PW, PH, 9); ctx.fill();
        ctx.fillStyle = api.accent;
        rr(ctx, PX + 4, py + 8, PW - 8, PH - 16, 5); ctx.fill();
        for (var j = 0; j < balls.length; j++) {
          ctx.fillStyle = "#fbbf24";
          ctx.beginPath(); ctx.arc(balls[j].x, balls[j].y, balls[j].r, 0, Math.PI * 2); ctx.fill();
        }
        if (!launched) api.text("BOUNCE IT SIDEWAYS", W / 2, H - 48, 19, "rgba(255,255,255,0.5)");
      }

      wall();
      park();

      return {
        update: update,
        draw: draw,
        tap: launch,
        move: function (x, y) { py = clamp(y - PH / 2, 12, H - PH - 12); },
        key: function (code) { if (code === "Space" || code === "Enter") launch(); },
        swipe: function (dx, dy) { py = clamp(py + dy * 40, 12, H - PH - 12); },
      };
    },
  });
})();
