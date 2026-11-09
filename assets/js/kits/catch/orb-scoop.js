/* Orb Scoop — orbs split in two halfway down. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, clamp = K.clamp, rr = K.roundRect;
  var MODE = { name: "Orb Scoop", level: 4, hudA: "Orbs", hudB: "Time", pattern: "bands" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var bx = W / 2, bw = 96, score = 0, clock = 0, spawn = 0.4;
      var items = [], LIMIT = 30;

      function add() {
        var bomb = Math.random() < 0.1;
        items.push({
          x: rand(40, W - 40), y: -26, r: bomb ? 17 : rand(13, 17),
          vy: 150 * rand(0.84, 1.2), bomb: bomb, split: !bomb, color: Math.floor(rand(0, 4)),
        });
      }

      function update(dt) {
        clock += dt;
        bx = clamp(bx, bw / 2 + 4, W - bw / 2 - 4);
        spawn -= dt;
        if (spawn <= 0) { spawn = Math.max(0.25, 0.6 * rand(0.8, 1.25)); add(); }
        for (var i = items.length - 1; i >= 0; i--) {
          var it = items[i];
          it.y += it.vy * dt;
          if (it.split && it.y > H * 0.54) {
            it.split = false;
            for (var s = 0; s < 2; s++) {
              items.push({
                x: it.x + (s ? 14 : -14), y: it.y, r: it.r * 0.62,
                vy: it.vy * 1.05, bomb: false, split: false, color: it.color,
              });
            }
          }
          if (it.y > H - 82 && it.y < H - 22 && Math.abs(it.x - bx) < bw / 2 + it.r * 0.35) {
            items.splice(i, 1);
            if (it.bomb) {
              score = Math.max(0, score - 2);
              api.sfx("bad"); api.shake(9); api.haptic(20);
            } else {
              score++;
              api.sfx("good");
              api.burst(it.x, it.y, api.accent, 7);
            }
            continue;
          }
          if (it.y > H + 30) items.splice(i, 1);
        }
        api.hud(score, Math.max(0, Math.ceil(LIMIT - clock)) + "s");
        if (clock >= LIMIT) api.finish(score);
      }

      function draw() {
        api.bg();
        for (var i = 0; i < items.length; i++) {
          var it = items[i];
          if (it.bomb) {
            ctx.fillStyle = "#64748b";
            ctx.beginPath(); ctx.arc(it.x, it.y, it.r, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = "#f87171"; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(it.x - 6, it.y - 6); ctx.lineTo(it.x + 6, it.y + 6);
            ctx.moveTo(it.x + 6, it.y - 6); ctx.lineTo(it.x - 6, it.y + 6); ctx.stroke();
          } else {
            var g = ctx.createRadialGradient(it.x - it.r * 0.3, it.y - it.r * 0.3, 2, it.x, it.y, it.r);
            g.addColorStop(0, "#ffffff");
            g.addColorStop(1, api.accent);
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(it.x, it.y, it.r, 0, Math.PI * 2); ctx.fill();
          }
        }
        ctx.fillStyle = "#f8fafc";
        rr(ctx, bx - bw / 2, H - 78, bw, 52, 12); ctx.fill();
        ctx.fillStyle = api.accent;
        rr(ctx, bx - bw / 2 + 6, H - 72, bw - 12, 12, 6); ctx.fill();
      }

      return { update: update, draw: draw, move: function (x) { bx = x; } };
    },
  });
})();
