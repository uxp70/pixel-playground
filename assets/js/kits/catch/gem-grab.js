/* Gem Grab — fast gems, a narrow basket and a combo multiplier. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, clamp = K.clamp, rr = K.roundRect;
  var MODE = { name: "Gem Grab", level: 6, hudA: "Gems", hudB: "Time", pattern: "beams" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var bx = W / 2, bw = 72, score = 0, clock = 0, spawn = 0.4;
      var items = [], combo = 0, comboClock = 0, LIMIT = 25;

      function add() {
        items.push({
          x: rand(44, W - 44), y: -24, r: rand(10, 14),
          vy: 230 * rand(0.86, 1.16), color: Math.floor(rand(0, 3)),
        });
      }

      function update(dt) {
        clock += dt;
        comboClock = Math.max(0, comboClock - dt);
        if (!comboClock) combo = 0;
        bx = clamp(bx, bw / 2 + 4, W - bw / 2 - 4);
        spawn -= dt;
        if (spawn <= 0) { spawn = Math.max(0.22, 0.55 * rand(0.8, 1.25)); add(); }
        for (var i = items.length - 1; i >= 0; i--) {
          var it = items[i];
          it.y += it.vy * dt;
          if (it.y > H - 82 && it.y < H - 22 && Math.abs(it.x - bx) < bw / 2 + it.r * 0.35) {
            items.splice(i, 1);
            combo++;
            comboClock = 1.4;
            var gain = 1 + Math.min(3, Math.floor(combo / 5));
            score += gain;
            api.sfx("good");
            api.burst(it.x, it.y, "#fbbf24", 7);
            api.haptic(5);
            continue;
          }
          if (it.y > H + 30) { items.splice(i, 1); combo = 0; }
        }
        api.hud(score, Math.max(0, Math.ceil(LIMIT - clock)) + "s");
        if (clock >= LIMIT) api.finish(score);
      }

      function draw() {
        api.bg();
        var crystals = ["#22d3ee", "#f472b6", "#a3e635"];
        for (var i = 0; i < items.length; i++) {
          var it = items[i];
          ctx.fillStyle = crystals[it.color];
          ctx.beginPath();
          ctx.moveTo(it.x, it.y - it.r);
          ctx.lineTo(it.x + it.r * 0.8, it.y);
          ctx.lineTo(it.x, it.y + it.r);
          ctx.lineTo(it.x - it.r * 0.8, it.y);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = "rgba(255,255,255,0.6)";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        ctx.fillStyle = "#f8fafc";
        rr(ctx, bx - bw / 2, H - 78, bw, 52, 12); ctx.fill();
        ctx.fillStyle = api.accent;
        rr(ctx, bx - bw / 2 + 6, H - 72, bw - 12, 12, 6); ctx.fill();
        if (combo > 1) api.text("x" + combo, W - 46, 58, 20, "rgba(255,255,255,0.6)");
      }

      return { update: update, draw: draw, move: function (x) { bx = x; } };
    },
  });
})();
