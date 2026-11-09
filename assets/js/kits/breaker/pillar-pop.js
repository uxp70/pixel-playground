/* Pillar Pop — six tall pillars instead of a brick wall. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, clamp = K.clamp, rr = K.roundRect;

  var MODE = { name: "Pillar Pop", level: 9, hudA: "Score", hudB: "Lives", pattern: "scan" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var padW = 118, px = W / 2 - padW / 2;
      var pillars = [], balls = [], lives = 3, score = 0, launched = false;

      function wall() {
        pillars = [];
        var bw = (W - 32) / 6;
        for (var c = 0; c < 6; c++) {
          pillars.push({ x: 16 + c * bw + 3, y: 76, w: bw - 6, h: 92, hp: 1 });
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
          for (var i = pillars.length - 1; i >= 0; i--) {
            var p = pillars[i];
            if (ball.x < p.x || ball.x > p.x + p.w || ball.y < p.y || ball.y > p.y + p.h) continue;
            var gapX = Math.min(ball.x - p.x, p.x + p.w - ball.x);
            var gapY = Math.min(ball.y - p.y, p.y + p.h - ball.y);
            if (gapX < gapY) ball.vx *= -1; else ball.vy *= -1;
            pillars.splice(i, 1);
            score += 15;
            api.burst(ball.x, ball.y, api.accent, 8);
            api.sfx("good");
            break;
          }
          if (ball.y > H + 30) {
            balls.splice(b, 1);
            if (!balls.length) { lose(); if (api.ended) return; }
          }
        }
        if (!pillars.length) {
          score += 80;
          wall();
          park();
          api.sfx("win");
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
        api.hud(score, lives + " lives");
      }

      function draw() {
        api.bg();
        for (var i = 0; i < pillars.length; i++) {
          var p = pillars[i];
          ctx.fillStyle = "rgba(251,191,36,0.55)";
          rr(ctx, p.x, p.y, p.w, p.h, 6); ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,0.18)";
          for (var s = 0; s < 4; s++) ctx.fillRect(p.x + 8, p.y + 12 + s * 20, p.w - 16, 5);
        }
        ctx.fillStyle = "#f8fafc";
        rr(ctx, px, H - 62, padW, 14, 7); ctx.fill();
        for (var j = 0; j < balls.length; j++) {
          ctx.fillStyle = api.accent;
          ctx.beginPath(); ctx.arc(balls[j].x, balls[j].y, balls[j].r, 0, Math.PI * 2); ctx.fill();
        }
        if (!launched) api.text("SIX PILLARS", W / 2, H - 150, 20, "rgba(255,255,255,0.5)");
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
