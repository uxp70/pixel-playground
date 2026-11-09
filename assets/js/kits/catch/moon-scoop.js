/* Moon Scoop — low gravity and a floor that bounces. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, clamp = K.clamp, rr = K.roundRect;
  var MODE = { name: "Moon Scoop", level: 9, hudA: "Scooped", hudB: "Time", pattern: "stars" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var bx = W / 2, bw = 96, score = 0, clock = 0, spawn = 0.5;
      var items = [], LIMIT = 30;

      function add() {
        items.push({
          x: rand(40, W - 40), y: -24, r: Math.random() < 0.08 ? 17 : rand(12, 17),
          vy: 68 * rand(0.85, 1.2), bomb: Math.random() < 0.08, bounce: 0,
        });
      }

      function update(dt) {
        clock += dt;
        bx = clamp(bx, bw / 2 + 4, W - bw / 2 - 4);
        spawn -= dt;
        if (spawn <= 0) { spawn = Math.max(0.3, 0.65 * rand(0.8, 1.2)); add(); }
        for (var i = items.length - 1; i >= 0; i--) {
          var it = items[i];
          it.vy += 8 * dt;
          it.y += it.vy * dt;
          if (it.y > H - 22 && it.bounce < 2) {
            it.y = H - 22;
            it.vy = -Math.abs(it.vy) * 0.55;
            it.bounce++;
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
          if (it.y > H + 40) items.splice(i, 1);
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
            ctx.fillStyle = "#e2e8f0";
            ctx.beginPath(); ctx.arc(it.x, it.y, it.r, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "rgba(148,163,184,0.5)";
            ctx.beginPath(); ctx.arc(it.x - it.r * 0.3, it.y - it.r * 0.2, it.r * 0.28, 0, Math.PI * 2); ctx.fill();
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
