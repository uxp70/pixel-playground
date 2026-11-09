/* Final Wall — one armoured boss instead of a brick field. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, clamp = K.clamp, rr = K.roundRect;

  var MODE = { name: "Final Wall", level: 11, hudA: "Score", hudB: "Boss", pattern: "beams" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var padW = 118, px = W / 2 - padW / 2;
      var balls = [], lives = 3, score = 0, launched = false;
      var boss = { x: 80, y: 90, w: W - 160, h: 120, hp: 26, max: 26 };

      function park() {
        launched = false;
        balls = [{ x: px + padW / 2, y: H - 118, vx: 0, vy: 0, r: 9 }];
      }

      function launch() {
        if (launched) return;
        launched = true;
        balls = [{ x: px + padW / 2, y: H - 118, vx: rand(-70, 70), vy: -265, r: 9 }];
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
            ball.vx = off * 245;
            ball.vy = -Math.sqrt(Math.max(270 * 270 - ball.vx * ball.vx, 90));
            api.sfx("pick");
          }
          if (ball.x > boss.x && ball.x < boss.x + boss.w && ball.y > boss.y && ball.y < boss.y + boss.h) {
            boss.hp--;
            score += 8;
            ball.vy = -Math.abs(ball.vy);
            api.sfx("good");
            api.burst(ball.x, ball.y, api.accent, 6);
            if (boss.hp <= 0) { api.finish(score + 100); return; }
          }
          if (ball.y > H + 30) {
            balls.splice(b, 1);
            if (!balls.length) { lose(); if (api.ended) return; }
          }
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
        api.hud(score, boss.hp + " / " + boss.max);
      }

      function draw() {
        api.bg();
        ctx.fillStyle = api.accent;
        rr(ctx, boss.x, boss.y, boss.w, boss.h, 16); ctx.fill();
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        rr(ctx, boss.x + 16, boss.y + 24, boss.w - 32, boss.h - 48, 8); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.75)";
        for (var e = 0; e < 3; e++) {
          for (var f = 0; f < 4; f++) {
            ctx.fillRect(boss.x + 42 + f * 34, boss.y + 40 + e * 18, 16, 8);
          }
        }
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        rr(ctx, W / 2 - 150, boss.y + boss.h + 10, 300, 10, 5); ctx.fill();
        ctx.fillStyle = "#f8fafc";
        rr(ctx, W / 2 - 150, boss.y + boss.h + 10, 300 * (boss.hp / boss.max), 10, 5); ctx.fill();

        ctx.fillStyle = "#f8fafc";
        rr(ctx, px, H - 62, padW, 14, 7); ctx.fill();
        for (var j = 0; j < balls.length; j++) {
          ctx.fillStyle = api.accent;
          ctx.beginPath(); ctx.arc(balls[j].x, balls[j].y, balls[j].r, 0, Math.PI * 2); ctx.fill();
        }
        if (!launched) api.text("BREAK THE FINAL WALL", W / 2, H - 150, 19, "rgba(255,255,255,0.5)");
      }

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
