/* Shard Smash — aim the cannon, fire a shard, and every brick splits it. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, clamp = K.clamp, rr = K.roundRect;

  var MODE = {
    name: "Shard Smash", level: 10, hudA: "Score", hudB: "Shards", pattern: "rain",
    controls: "Aim with the pointer, tap or press space to fire",
  };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var CX = W / 2, CY = H - 46, BARREL = 42;
      var angle = -Math.PI / 2;
      var bricks = [], shards = [], ammo = 5, score = 0, over = false, glow = 0;

      function wall() {
        bricks = [];
        var bw = 88, bh = 26, gx = 12, gy = 12;
        var x0 = (W - (6 * bw + 5 * gx)) / 2;
        for (var r = 0; r < 4; r++) {
          for (var c = 0; c < 6; c++) {
            bricks.push({
              x: x0 + c * (bw + gx), y: 74 + r * (bh + gy),
              w: bw, h: bh, hp: r === 0 ? 2 : 1,
            });
          }
        }
      }

      function end() {
        if (over) return;
        over = true;
        api.finish(score);
      }

      function aimAt(x, y) {
        angle = Math.atan2(y - CY, x - CX);
        if (angle > -0.42) angle = -0.42;
        if (angle < -Math.PI + 0.42) angle = -Math.PI + 0.42;
      }

      function fire() {
        if (over) return;
        if (ammo <= 0) {
          api.sfx("bad");
          api.shake(4);
          return;
        }
        ammo--;
        shards.push({
          x: CX + Math.cos(angle) * BARREL,
          y: CY + Math.sin(angle) * BARREL,
          vx: Math.cos(angle) * 395,
          vy: Math.sin(angle) * 395,
          r: 7,
        });
        glow = 0.18;
        api.sfx("pick");
        api.haptic(3);
      }

      function step(dt) {
        for (var s = shards.length - 1; s >= 0; s--) {
          var ball = shards[s];
          ball.x += ball.vx * dt;
          ball.y += ball.vy * dt;
          if (ball.x < ball.r + 8) { ball.x = ball.r + 8; ball.vx = Math.abs(ball.vx); }
          if (ball.x > W - ball.r - 8) { ball.x = W - ball.r - 8; ball.vx = -Math.abs(ball.vx); }
          if (ball.y < ball.r + 8) { ball.y = ball.r + 8; ball.vy = Math.abs(ball.vy); }

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
              api.burst(ball.x, ball.y, api.accent, 6);
              if (shards.length < 6) {
                var spin = rand(0.4, 0.9) * (Math.random() < 0.5 ? -1 : 1);
                var cos = Math.cos(spin), sin = Math.sin(spin);
                shards.push({
                  x: ball.x, y: ball.y,
                  vx: (ball.vx * cos - ball.vy * sin) * 0.92,
                  vy: (ball.vx * sin + ball.vy * cos) * 0.92,
                  r: 5,
                });
                api.sfx("good");
              }
            }
            break;
          }

          if (ball.y > H + 24) {
            shards.splice(s, 1);
          }
        }

        if (!bricks.length && !over) {
          score += 80;
          ammo = Math.min(6, ammo + 3);
          wall();
          api.sfx("win");
        }
        if (!shards.length && ammo <= 0 && !over) end();
      }

      function update(dt) {
        if (over) return;
        glow = Math.max(0, glow - dt);
        if (api.keys.ArrowLeft || api.keys.KeyA) aimAt(CX - 100, CY - 220);
        if (api.keys.ArrowRight || api.keys.KeyD) aimAt(CX + 100, CY - 220);
        step(dt / 2);
        if (over) return;
        step(dt / 2);
        if (over) return;
        api.hud(score, shards.length + " live · " + ammo + " ammo");
      }

      function draw() {
        api.bg();
        for (var i = 0; i < bricks.length; i++) {
          var br = bricks[i];
          ctx.fillStyle = br.hp > 1 ? "rgba(56,189,248,0.85)" : "rgba(56,189,248,0.45)";
          ctx.beginPath();
          ctx.moveTo(br.x + br.w / 2, br.y);
          ctx.lineTo(br.x + br.w, br.y + br.h / 2);
          ctx.lineTo(br.x + br.w / 2, br.y + br.h);
          ctx.lineTo(br.x, br.y + br.h / 2);
          ctx.closePath();
          ctx.fill();
        }

        ctx.strokeStyle = "rgba(248,250,252,0.28)";
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 9]);
        ctx.beginPath();
        ctx.moveTo(CX + Math.cos(angle) * BARREL, CY + Math.sin(angle) * BARREL);
        ctx.lineTo(CX + Math.cos(angle) * (BARREL + 70), CY + Math.sin(angle) * (BARREL + 70));
        ctx.stroke();
        ctx.setLineDash([]);

        for (var j = 0; j < shards.length; j++) {
          ctx.fillStyle = j % 2 ? "#fbbf24" : api.accent;
          ctx.beginPath();
          ctx.arc(shards[j].x, shards[j].y, shards[j].r, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = glow > 0 ? "#f8fafc" : "rgba(255,255,255,0.75)";
        ctx.save();
        ctx.translate(CX, CY);
        ctx.rotate(angle);
        rr(ctx, 0, -8, BARREL + 8, 16, 7);
        ctx.fill();
        ctx.restore();
        ctx.beginPath();
        ctx.arc(CX, CY, 20, 0, Math.PI * 2);
        ctx.fill();

        for (var k = 0; k < ammo; k++) {
          ctx.fillStyle = api.accent;
          ctx.beginPath();
          ctx.arc(26 + k * 18, H - 24, 5, 0, Math.PI * 2);
          ctx.fill();
        }
        api.text("EVERY BRICK SPLITS THE SHARD", W / 2, 44, 15, "rgba(255,255,255,0.42)");
      }

      wall();

      return {
        update: update,
        draw: draw,
        move: function (x, y) { aimAt(x, y); },
        down: function (x, y) { aimAt(x, y); fire(); },
        key: function (code) {
          if (code === "Space" || code === "Enter") fire();
        },
      };
    },
  });
})();
