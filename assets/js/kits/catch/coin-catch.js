/* Coin Catch — pegs bounce the coins on the way down. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, clamp = K.clamp, near = K.near, rr = K.roundRect;
  var MODE = { name: "Coin Catch", level: 3, hudA: "Coins", hudB: "Time", pattern: "grid" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var bx = W / 2, bw = 96, score = 0, clock = 0, spawn = 0.4;
      var items = [], pegs = [], LIMIT = 30;

      for (var i = 0; i < 5; i++) pegs.push({ x: 80 + i * 110, y: 180 + (i % 2) * 110, r: 13 });

      function add() {
        var bomb = Math.random() < 0.08;
        items.push({
          x: rand(34, W - 34), y: -24, r: bomb ? 17 : rand(12, 16),
          vy: 155 * rand(0.85, 1.2), bomb: bomb, spin: 0,
        });
      }

      function update(dt) {
        clock += dt;
        bx = clamp(bx, bw / 2 + 4, W - bw / 2 - 4);
        spawn -= dt;
        if (spawn <= 0) { spawn = Math.max(0.24, 0.58 * rand(0.78, 1.24)); add(); }
        for (var i = items.length - 1; i >= 0; i--) {
          var it = items[i];
          it.y += it.vy * dt;
          it.spin += dt * 4;
          for (var p = 0; p < pegs.length; p++) {
            if (near(it.x, it.y, it.r, pegs[p].x, pegs[p].y, pegs[p].r) && it.vy > 0) {
              it.vy = -Math.abs(it.vy) * 0.85;
              it.x += rand(-18, 18);
              api.sfx("pick");
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
              api.burst(it.x, it.y, "#fbbf24", 7);
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
        ctx.fillStyle = "rgba(255,255,255,0.16)";
        for (var p = 0; p < pegs.length; p++) {
          ctx.beginPath(); ctx.arc(pegs[p].x, pegs[p].y, pegs[p].r, 0, Math.PI * 2); ctx.fill();
        }
        for (var i = 0; i < items.length; i++) {
          var it = items[i];
          ctx.save();
          ctx.translate(it.x, it.y);
          ctx.rotate(it.spin);
          if (it.bomb) {
            ctx.fillStyle = "#64748b";
            ctx.beginPath(); ctx.arc(0, 0, it.r, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = "#f87171"; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(-6, -6); ctx.lineTo(6, 6); ctx.moveTo(6, -6); ctx.lineTo(-6, 6); ctx.stroke();
          } else {
            ctx.fillStyle = "#fbbf24";
            ctx.beginPath(); ctx.ellipse(0, 0, it.r * 0.7, it.r, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "rgba(0,0,0,0.25)";
            ctx.fillRect(-2, -it.r * 0.6, 4, it.r * 1.2);
          }
          ctx.restore();
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
