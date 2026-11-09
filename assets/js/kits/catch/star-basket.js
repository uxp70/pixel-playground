/* Star Basket — catch stars, dodge the occasional bomb. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, clamp = K.clamp, rr = K.roundRect;
  var MODE = { name: "Star Basket", level: 1, hudA: "Caught", hudB: "Time", pattern: "stars" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var bx = W / 2, bw = 96, score = 0, clock = 0, spawn = 0.4;
      var items = [], LIMIT = 30;

      function add() {
        var bomb = Math.random() < 0.12;
        items.push({
          x: rand(34, W - 34), y: -24, r: bomb ? 17 : rand(12, 17),
          vy: 150 * rand(0.82, 1.22), bomb: bomb, spin: rand(0, Math.PI * 2),
        });
      }

      function update(dt) {
        clock += dt;
        bx = clamp(bx, bw / 2 + 4, W - bw / 2 - 4);
        spawn -= dt;
        if (spawn <= 0) { spawn = Math.max(0.22, 0.58 * rand(0.75, 1.25)); add(); }
        for (var i = items.length - 1; i >= 0; i--) {
          var it = items[i];
          it.y += it.vy * dt;
          it.spin += dt * 2;
          if (it.y > H - 82 && it.y < H - 22 && Math.abs(it.x - bx) < bw / 2 + it.r * 0.35) {
            items.splice(i, 1);
            if (it.bomb) {
              score = Math.max(0, score - 2);
              api.sfx("bad"); api.shake(9); api.haptic(20);
            } else {
              score++;
              api.sfx("good");
              api.burst(it.x, it.y, api.accent, 7);
              api.haptic(5);
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
            ctx.strokeStyle = "#f87171";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(it.x - 6, it.y - 6); ctx.lineTo(it.x + 6, it.y + 6);
            ctx.moveTo(it.x + 6, it.y - 6); ctx.lineTo(it.x - 6, it.y + 6);
            ctx.stroke();
          } else {
            ctx.save();
            ctx.translate(it.x, it.y);
            ctx.rotate(it.spin);
            ctx.fillStyle = "#fbbf24";
            ctx.beginPath();
            for (var p = 0; p < 10; p++) {
              var r = p % 2 ? it.r * 0.45 : it.r;
              var a = -Math.PI / 2 + (p / 10) * Math.PI * 2;
              if (p === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
              else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
            }
            ctx.closePath(); ctx.fill();
            ctx.restore();
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
