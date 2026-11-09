/* Wall Cracker — break every loose brick around the solid ones. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, clamp = K.clamp, rr = K.roundRect;

  var MODE = { name: "Wall Cracker", level: 6, hudA: "Score", hudB: "Cracked", pattern: "rain" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var padW = 118, px = W / 2 - padW / 2;
      var bricks = [], balls = [], lives = 3, score = 0, cracked = 0, launched = false;

      function wall() {
        bricks = [];
        cracked = 0;
        var bw = (W - 32) / 6, bh = 24;
        for (var r = 0; r < 4; r++) {
          for (var c = 0; c < 6; c++) {
            if ((r + c) % 3 === 0) continue;
            var solid = (r + c) % 4 === 0;
            bricks.push({
              x: 16 + c * bw + 3, y: 76 + r * (bh + 8), w: bw - 6, h: bh,
              hp: solid ? Infinity : 1, solid: solid,
            });
          }
        }
      }

      function park() {
        launched = false;
        balls = [{ x: px + padW / 2, y: H - 118, vx: 0, vy: 0, r: 9 }];
      }

      function launch() {
        if (launched) return;
        launched = true;
        balls = [{ x: px + padW / 2, y: H - 118, vx: rand(-70, 70), vy: -255, r: 9 }];
        api.sfx("pick");
      }

      function lose() {
        lives--;
        api.sfx("bad");
        api.shake(9);
        api.haptic(24);
        if (lives <= 0) { api.finish(score); return; }
        park();
      }

      function step(dt) {
        if (!launched) return;
        for (var b = balls.length - 1; b >= 0; b--) {
          var ball = balls[b];
          ball.x += ball.vx * dt;
          ball.y += ball.vy * dt;
          if (ball.x < ball.r + 10) { ball.x = ball.r + 10; ball.vx = Math.abs(ball.vx); api.sfx("pick"); }
          if (ball.x > W - ball.r - 10) { ball.x = W - ball.r - 10; ball.vx = -Math.abs(ball.vx); api.sfx("pick"); }
          if (ball.y < ball.r + 10) { ball.y = ball.r + 10; ball.vy = Math.abs(ball.vy); api.sfx("pick"); }
          if (ball.vy > 0 && ball.y > H - 76 && ball.y < H - 44 && Math.abs(ball.x - (px + padW / 2)) < padW / 2 + 10) {
            ball.y = H - 76;
            var off = clamp((ball.x - (px + padW / 2)) / (padW / 2), -1, 1);
            ball.vx = off * 238;
            ball.vy = -Math.sqrt(Math.max(255 * 255 - ball.vx * ball.vx, 90));
            api.sfx("pick");
          }
          for (var i = bricks.length - 1; i >= 0; i--) {
            var br = bricks[i];
            if (ball.x < br.x || ball.x > br.x + br.w || ball.y < br.y || ball.y > br.y + br.h) continue;
            var gapX = Math.min(ball.x - br.x, br.x + br.w - ball.x);
            var gapY = Math.min(ball.y - br.y, br.y + br.h - ball.y);
            if (gapX < gapY) ball.vx *= -1; else ball.vy *= -1;
            if (!br.solid) {
              bricks.splice(i, 1);
              cracked++;
              score += 10;
              api.burst(ball.x, ball.y, api.accent, 6);
              api.sfx("good");
            }
            break;
          }
          if (ball.y > H + 30) {
            balls.splice(b, 1);
            if (!balls.length) { lose(); if (api.ended) return; }
          }
        }
        var breakable = 0;
        for (var k = 0; k < bricks.length; k++) if (!bricks[k].solid) breakable++;
        if (!breakable) {
          api.finish(score + 60);
        }
      }

      function update(dt) {
        if (api.keys.ArrowLeft || api.keys.KeyA) px = clamp(px - 420 * dt, 8, W - padW - 8);
        if (api.keys.ArrowRight || api.keys.KeyD) px = clamp(px + 420 * dt, 8, W - padW - 8);
        if (!launched) balls[0].x = px + padW / 2;
        step(dt / 2);
        if (api.ended) return;
        step(dt / 2);
        if (api.ended) return;
        api.hud(score, cracked + " cracked");
      }

      function draw() {
        api.bg();
        for (var i = 0; i < bricks.length; i++) {
          var br = bricks[i];
          if (br.solid) {
            ctx.fillStyle = "rgba(148,163,184,0.3)";
            rr(ctx, br.x, br.y, br.w, br.h, 5); ctx.fill();
            ctx.strokeStyle = "rgba(255,255,255,0.16)";
            ctx.lineWidth = 2;
            ctx.stroke();
          } else {
            ctx.fillStyle = "rgba(244,114,182,0.6)";
            rr(ctx, br.x, br.y, br.w, br.h, 5); ctx.fill();
          }
        }
        ctx.fillStyle = "#f8fafc";
        rr(ctx, px, H - 62, padW, 14, 7); ctx.fill();
        for (var j = 0; j < balls.length; j++) {
          ctx.fillStyle = api.accent;
          ctx.beginPath(); ctx.arc(balls[j].x, balls[j].y, balls[j].r, 0, Math.PI * 2); ctx.fill();
        }
        if (!launched) api.text("GREY BRICKS NEVER BREAK", W / 2, H - 150, 18, "rgba(255,255,255,0.5)");
      }

      wall();
      park();

      return {
        update: update,
        draw: draw,
        tap: launch,
        move: function (x) { px = clamp(x - padW / 2, 8, W - padW - 8); },
        key: function (code) { if (code === "Space" || code === "Enter") launch(); },
        swipe: function (dx) { px = clamp(px + dx * 46, 8, W - padW - 8); },
      };
    },
  });
})();
