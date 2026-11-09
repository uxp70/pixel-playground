/* Ball Bash — a heavy ball ploughs through bricks without bouncing. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, clamp = K.clamp, rr = K.roundRect;

  var MODE = { name: "Ball Bash", level: 3, hudA: "Score", hudB: "Lives", pattern: "bands" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var padW = 150, px = W / 2 - padW / 2;
      var bricks = [], balls = [], lives = 3, score = 0, launched = false;

      function wall() {
        bricks = [];
        var bw = (W - 32) / 6, bh = 26;
        for (var r = 0; r < 3; r++) {
          for (var c = 0; c < 6; c++) {
            bricks.push({ x: 16 + c * bw + 3, y: 78 + r * (bh + 8), w: bw - 6, h: bh, hp: 1 });
          }
        }
      }

      function park() {
        launched = false;
        balls = [{ x: px + padW / 2, y: H - 122, vx: 0, vy: 0, r: 14 }];
      }

      function launch() {
        if (launched) return;
        launched = true;
        balls = [{ x: px + padW / 2, y: H - 122, vx: rand(-60, 60), vy: -230, r: 14 }];
        api.sfx("pick");
      }

      function lose() {
        lives--;
        api.sfx("bad");
        api.shake(11);
        api.haptic(26);
        if (lives <= 0) { api.finish(score); return; }
        park();
      }

      function step(dt) {
        if (!launched) return;
        for (var b = balls.length - 1; b >= 0; b--) {
          var ball = balls[b];
          ball.x += ball.vx * dt;
          ball.y += ball.vy * dt;
          if (ball.x < ball.r + 10) { ball.x = ball.r + 10; ball.vx = Math.abs(ball.vx); }
          if (ball.x > W - ball.r - 10) { ball.x = W - ball.r - 10; ball.vx = -Math.abs(ball.vx); }
          if (ball.y < ball.r + 10) { ball.y = ball.r + 10; ball.vy = Math.abs(ball.vy); }
          if (ball.vy > 0 && ball.y > H - 80 && ball.y < H - 42 && Math.abs(ball.x - (px + padW / 2)) < padW / 2 + 14) {
            ball.y = H - 80;
            var off = clamp((ball.x - (px + padW / 2)) / (padW / 2), -1, 1);
            ball.vx = off * 210;
            ball.vy = -Math.sqrt(Math.max(230 * 230 - ball.vx * ball.vx, 80));
            api.sfx("pick");
          }
          for (var i = bricks.length - 1; i >= 0; i--) {
            var br = bricks[i];
            if (ball.x < br.x || ball.x > br.x + br.w || ball.y < br.y || ball.y > br.y + br.h) continue;
            bricks.splice(i, 1);
            score += 10;
            api.burst(ball.x, ball.y, "#fb923c", 6);
            api.sfx("good");
          }
          if (ball.y > H + 40) {
            balls.splice(b, 1);
            if (!balls.length) { lose(); if (api.ended) return; }
          }
        }
        if (!bricks.length) {
          score += 80;
          wall();
          park();
          api.sfx("win");
        }
      }

      function update(dt) {
        if (api.keys.ArrowLeft || api.keys.KeyA) px = clamp(px - 430 * dt, 8, W - padW - 8);
        if (api.keys.ArrowRight || api.keys.KeyD) px = clamp(px + 430 * dt, 8, W - padW - 8);
        if (!launched) balls[0].x = px + padW / 2;
        step(dt / 2);
        if (api.ended) return;
        step(dt / 2);
        if (api.ended) return;
        api.hud(score, lives + " lives");
      }

      function draw() {
        api.bg();
        for (var i = 0; i < bricks.length; i++) {
          var br = bricks[i];
          ctx.fillStyle = "rgba(251,146,60,0.7)";
          rr(ctx, br.x, br.y, br.w, br.h, 4); ctx.fill();
        }
        ctx.fillStyle = "#f8fafc";
        rr(ctx, px, H - 66, padW, 18, 9); ctx.fill();
        for (var j = 0; j < balls.length; j++) {
          var ball = balls[j];
          ctx.fillStyle = "#fbbf24";
          ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = "rgba(255,255,255,0.6)";
          ctx.lineWidth = 3;
          ctx.stroke();
        }
        if (!launched) api.text("HEAVY BALL — TAP TO SERVE", W / 2, H - 154, 18, "rgba(255,255,255,0.5)");
      }

      wall();
      park();

      return {
        update: update,
        draw: draw,
        tap: launch,
        move: function (x) { px = clamp(x - padW / 2, 8, W - padW - 8); },
        key: function (code) { if (code === "Space" || code === "Enter") launch(); },
        swipe: function (dx) { px = clamp(px + dx * 50, 8, W - padW - 8); },
      };
    },
  });
})();
