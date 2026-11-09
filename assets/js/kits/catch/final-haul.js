/* Final Haul — catch the bouncing crate three times while dodging bombs. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, clamp = K.clamp, rr = K.roundRect;
  var MODE = { name: "Final Haul", level: 11, hudA: "Crate", hudB: "Time", pattern: "scan" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var bx = W / 2, bw = 96, score = 0, clock = 0, spawn = 0.55;
      var hits = 0, items = [], LIMIT = 30;
      var boss = { x: W / 2, y: -80, r: 54, vy: 46 };

      function update(dt) {
        clock += dt;
        bx = clamp(bx, bw / 2 + 4, W - bw / 2 - 4);
        boss.y += boss.vy * dt;

        if (boss.y > H - 96) {
          if (Math.abs(boss.x - bx) < bw / 2 + boss.r * 0.6) {
            hits++;
            score += 5;
            api.sfx("good");
            api.burst(boss.x, boss.y, api.accent, 12);
            api.haptic(10);
            boss.vy = -150;
            if (hits >= 3) { api.finish(score + 15); return; }
          } else {
            boss.vy = -90;
            api.sfx("bad");
            api.shake(6);
          }
        }
        if (boss.y < -90) { boss.y = -90; boss.vy = Math.abs(boss.vy); }

        spawn -= dt;
        if (spawn <= 0) {
          spawn = 0.55;
          items.push({ x: rand(34, W - 34), y: -24, r: 16, vy: 190 * rand(0.9, 1.2), bomb: true });
        }
        for (var i = items.length - 1; i >= 0; i--) {
          var it = items[i];
          it.y += it.vy * dt;
          if (it.y > H - 82 && it.y < H - 22 && Math.abs(it.x - bx) < bw / 2 + 8) {
            items.splice(i, 1);
            score = Math.max(0, score - 2);
            api.sfx("bad");
            api.shake(8);
            api.haptic(18);
            continue;
          }
          if (it.y > H + 30) items.splice(i, 1);
        }
        api.hud(hits + " / 3", Math.max(0, Math.ceil(LIMIT - clock)) + "s");
        if (clock >= LIMIT) api.finish(score);
      }

      function draw() {
        api.bg();
        for (var i = 0; i < items.length; i++) {
          var it = items[i];
          ctx.fillStyle = "#64748b";
          ctx.beginPath(); ctx.arc(it.x, it.y, it.r, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = "#f87171"; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(it.x - 6, it.y - 6); ctx.lineTo(it.x + 6, it.y + 6);
          ctx.moveTo(it.x + 6, it.y - 6); ctx.lineTo(it.x - 6, it.y + 6); ctx.stroke();
        }
        ctx.fillStyle = api.accent;
        rr(ctx, boss.x - boss.r, boss.y - boss.r * 0.8, boss.r * 2, boss.r * 1.6, 14); ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.4)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(boss.x - boss.r * 0.7, boss.y);
        ctx.lineTo(boss.x + boss.r * 0.7, boss.y);
        ctx.stroke();
        api.text("HITS " + hits, W / 2, 80, 20, "rgba(255,255,255,0.6)");

        ctx.fillStyle = "#f8fafc";
        rr(ctx, bx - bw / 2, H - 78, bw, 52, 12); ctx.fill();
        ctx.fillStyle = api.accent;
        rr(ctx, bx - bw / 2 + 6, H - 72, bw - 12, 12, 6); ctx.fill();
      }

      return { update: update, draw: draw, move: function (x) { bx = x; } };
    },
  });
})();
