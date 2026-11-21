/* Brick Wall — break the wall before it reaches the crush line. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, clamp = K.clamp, rr = K.roundRect;

  var MODE = { name: "Brick Wall", level: 1, hudA: "Score", hudB: "Lives", pattern: "bricks" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var padW = 118, px = W / 2 - padW / 2;
      var bricks = [], balls = [], lives = 3, score = 0, launched = false, over = false;
      var LINE = H - 86;

      function wall() {
        bricks = [];
        var bw = (W - 32) / 6, bh = 24;
        for (var r = 0; r < 4; r++) {
          for (var c = 0; c < 6; c++) {
            bricks.push({ x: 16 + c * bw + 3, y: 62 + r * (bh + 8), w: bw - 6, h: bh, hp: r === 0 ? 2 : 1 });
          }
        }
      }

      function park() {
        launched = false;
        balls = [{ x: px + padW / 2, y: H - 118, vx: 0, vy: 0, r: 9 }];
      }

      function launch() {
        if (launched || over) return;
        launched = true;
        balls = [{ x: px + padW / 2, y: H - 118, vx: rand(-70, 70), vy: -255, r: 9 }];
        api.sfx("pick");
      }

      function end() {
        if (over) return;
        over = true;
        api.finish(score);
      }

      function hitLife() {
        lives--;
        api.sfx("bad");
        api.shake(10);
        api.haptic(24);
        if (lives <= 0) end();
      }

      function step(dt) {
        if (!launched || over) return;
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
            api.haptic(5);
          }
          for (var i = bricks.length - 1; i >= 0; i--) {
            var br = bricks[i];
            if (ball.x < br.x || ball.x > br.x + br.w || ball.y < br.y || ball.y > br.y + br.h) continue;
            var gapX = Math.min(ball.x - br.x, br.x + br.w - ball.x);
            var gapY = Math.min(ball.y - br.y, br.y + br.h - ball.y);
            if (gapX < gapY) ball.vx *= -1; else ball.vy *= -1;
            br.hp--;
            if (br.hp <= 0) {
              bricks.splice(i, 1);
              score += 10;
              api.burst(ball.x, ball.y, api.accent, 5);
            }
            break;
          }
          if (ball.y > H + 30) {
            balls.splice(b, 1);
            if (!balls.length) {
              hitLife();
              if (over) return;
              park();
            }
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
        if (api.keys.ArrowLeft || api.keys.KeyA) px = clamp(px - 420 * dt, 8, W - padW - 8);
        if (api.keys.ArrowRight || api.keys.KeyD) px = clamp(px + 420 * dt, 8, W - padW - 8);
        if (!launched) balls[0].x = px + padW / 2;

        var fall = 7 + score * 0.025;
        for (var i = bricks.length - 1; i >= 0; i--) {
          bricks[i].y += fall * dt;
          if (bricks[i].y + bricks[i].h >= LINE) {
            bricks.splice(i, 1);
            hitLife();
            if (over) return;
          }
        }

        step(dt / 2);
        if (over) return;
        step(dt / 2);
        if (over) return;
        api.hud(score, lives + " lives");
      }

      function draw() {
        api.bg();
        ctx.strokeStyle = "rgba(248,113,113,0.55)";
        ctx.lineWidth = 2;
        ctx.setLineDash([12, 10]);
        ctx.beginPath(); ctx.moveTo(0, LINE); ctx.lineTo(W, LINE); ctx.stroke();
        ctx.setLineDash([]);
        for (var i = 0; i < bricks.length; i++) {
          var br = bricks[i];
          ctx.fillStyle = br.hp > 1 ? "rgba(244,114,182,0.9)" : "rgba(244,114,182,0.55)";
          rr(ctx, br.x, br.y, br.w, br.h, 5); ctx.fill();
        }
        ctx.fillStyle = "#f8fafc";
        rr(ctx, px, H - 62, padW, 14, 7); ctx.fill();
        for (var j = 0; j < balls.length; j++) {
          ctx.fillStyle = api.accent;
          ctx.beginPath(); ctx.arc(balls[j].x, balls[j].y, balls[j].r, 0, Math.PI * 2); ctx.fill();
        }
        if (!launched) api.text("THE WALL IS COMING DOWN", W / 2, H - 150, 20, "rgba(255,255,255,0.5)");
        else api.text("KEEP IT ABOVE THE LINE", W / 2, LINE - 14, 13, "rgba(248,113,113,0.5)");
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
