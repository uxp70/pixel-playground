/* Loot Fall — bombs only reveal themselves near the net. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, clamp = K.clamp, rr = K.roundRect;
  var MODE = { name: "Loot Fall", level: 10, hudA: "Loot", hudB: "Time", pattern: "bricks" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var bx = W / 2, bw = 96, score = 0, clock = 0, spawn = 0.38;
      var items = [], LIMIT = 30;

      function add() {
        items.push({
          x: rand(34, W - 34), y: -24, r: rand(11, 16),
          vy: 150 * rand(0.84, 1.2), bomb: Math.random() < 0.22,
        });
      }

      function update(dt) {
        clock += dt;
        bx = clamp(bx, bw / 2 + 4, W - bw / 2 - 4);
        spawn -= dt;
        if (spawn <= 0) { spawn = Math.max(0.22, 0.56 * rand(0.78, 1.25)); add(); }
        for (var i = items.length - 1; i >= 0; i--) {
          var it = items[i];
          it.y += it.vy * dt;
          if (it.y > H - 82 && it.y < H - 22 && Math.abs(it.x - bx) < bw / 2 + it.r * 0.35) {
            items.splice(i, 1);
            if (it.bomb) {
              score = Math.max(0, score - 2);
              api.sfx("bad"); api.shake(10); api.haptic(22);
            } else {
              score++;
              api.sfx("good");
              api.burst(it.x, it.y, "#fbbf24", 8);
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
          var revealed = it.y > H - 230;
          if (!revealed) {
            ctx.fillStyle = "#475569";
            ctx.beginPath(); ctx.arc(it.x, it.y, it.r, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = "rgba(255,255,255,0.2)"; ctx.lineWidth = 2; ctx.stroke();
          } else if (it.bomb) {
            ctx.fillStyle = "#64748b";
            ctx.beginPath(); ctx.arc(it.x, it.y, it.r, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = "#f87171"; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(it.x - 6, it.y - 6); ctx.lineTo(it.x + 6, it.y + 6);
            ctx.moveTo(it.x + 6, it.y - 6); ctx.lineTo(it.x - 6, it.y + 6); ctx.stroke();
          } else {
            ctx.fillStyle = "#fbbf24";
            rr(ctx, it.x - it.r, it.y - it.r * 0.7, it.r * 2, it.r * 1.4, 4); ctx.fill();
            ctx.fillStyle = "rgba(0,0,0,0.25)";
            ctx.fillRect(it.x - it.r * 0.6, it.y - 3, it.r * 1.2, 3);
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
