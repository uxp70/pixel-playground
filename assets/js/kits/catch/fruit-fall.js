/* Fruit Fall — only the announced colour scores. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, clamp = K.clamp, rr = K.roundRect;
  var MODE = { name: "Fruit Fall", level: 2, hudA: "Matching", hudB: "Time", pattern: "dots" };
  var COLORS = ["#f87171", "#4ade80", "#60a5fa", "#fbbf24"];

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var bx = W / 2, bw = 96, score = 0, clock = 0, spawn = 0.4;
      var items = [], target = 0, colorClock = 0, LIMIT = 30, used = 0;

      function add() {
        items.push({
          x: rand(34, W - 34), y: -24, r: rand(13, 18),
          vy: 150 * rand(0.84, 1.2), color: Math.floor(rand(0, 4)),
        });
      }

      function update(dt) {
        clock += dt;
        colorClock += dt;
        if (colorClock > 4.5) { colorClock = 0; target = (target + 1) % 4; }
        bx = clamp(bx, bw / 2 + 4, W - bw / 2 - 4);
        spawn -= dt;
        if (spawn <= 0) { spawn = Math.max(0.24, 0.6 * rand(0.78, 1.24)); add(); }
        for (var i = items.length - 1; i >= 0; i--) {
          var it = items[i];
          it.y += it.vy * dt;
          if (it.y > H - 82 && it.y < H - 22 && Math.abs(it.x - bx) < bw / 2 + it.r * 0.35) {
            items.splice(i, 1);
            if (it.color === target) {
              score++;
              used++;
              api.sfx("good");
              api.burst(it.x, it.y, COLORS[it.color], 8);
              api.haptic(5);
            } else {
              score = Math.max(0, score - 1);
              api.sfx("bad");
              api.shake(5);
              api.haptic(12);
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
          ctx.fillStyle = COLORS[it.color];
          ctx.beginPath(); ctx.arc(it.x, it.y, it.r, 0, Math.PI * 2); ctx.fill();
          if (it.color === target) {
            ctx.strokeStyle = "rgba(255,255,255,0.85)";
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(it.x, it.y, it.r + 5, 0, Math.PI * 2); ctx.stroke();
          }
        }
        ctx.fillStyle = "#f8fafc";
        rr(ctx, bx - bw / 2, H - 78, bw, 52, 12); ctx.fill();
        ctx.fillStyle = COLORS[target];
        rr(ctx, bx - bw / 2 + 6, H - 72, bw - 12, 12, 6); ctx.fill();
        ctx.fillStyle = COLORS[target];
        ctx.beginPath(); ctx.arc(W / 2, 58, 13, 0, Math.PI * 2); ctx.fill();
        api.text("CATCH THIS COLOUR", W / 2, 90, 15, "rgba(255,255,255,0.55)");
        if (used) api.text("x" + used, W - 46, 58, 20, "rgba(255,255,255,0.55)");
      }

      return { update: update, draw: draw, move: function (x) { bx = x; } };
    },
  });
})();
