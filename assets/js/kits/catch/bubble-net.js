/* Bubble Net — the net swings on its own; time the catch. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, rr = K.roundRect;
  var MODE = { name: "Bubble Net", level: 7, hudA: "Bubbles", hudB: "Time", pattern: "rain" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var bx = W / 2, bw = 96, score = 0, clock = 0, spawn = 0.4;
      var items = [], LIMIT = 30;

      function add() {
        var bomb = Math.random() < 0.06;
        items.push({
          x: rand(34, W - 34), y: -24, r: bomb ? 17 : rand(12, 18),
          vy: 150 * rand(0.84, 1.2), bomb: bomb, phase: rand(0, Math.PI * 2),
        });
      }

      function update(dt) {
        clock += dt;
        bx = W / 2 + Math.sin(clock * 1.25) * 190;
        spawn -= dt;
        if (spawn <= 0) { spawn = Math.max(0.24, 0.6 * rand(0.78, 1.24)); add(); }
        for (var i = items.length - 1; i >= 0; i--) {
          var it = items[i];
          it.y += it.vy * dt;
          if (it.y > H - 82 && it.y < H - 22 && Math.abs(it.x - bx) < bw / 2 + it.r * 0.35) {
            items.splice(i, 1);
            if (it.bomb) {
              score = Math.max(0, score - 2);
              api.sfx("bad"); api.shake(9); api.haptic(20);
            } else {
              score++;
              api.sfx("good");
              api.burst(it.x, it.y, "#60a5fa", 7);
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
            ctx.strokeStyle = "rgba(147,197,253,0.75)";
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(it.x, it.y, it.r, 0, Math.PI * 2); ctx.stroke();
            ctx.fillStyle = "rgba(96,165,250,0.22)";
            ctx.fill();
            ctx.fillStyle = "rgba(255,255,255,0.7)";
            ctx.beginPath(); ctx.arc(it.x - it.r * 0.3, it.y - it.r * 0.3, it.r * 0.22, 0, Math.PI * 2); ctx.fill();
          }
        }
        ctx.strokeStyle = "rgba(255,255,255,0.18)";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(bx, H - 90); ctx.stroke();
        ctx.fillStyle = "#f8fafc";
        rr(ctx, bx - bw / 2, H - 78, bw, 52, 12); ctx.fill();
        ctx.fillStyle = api.accent;
        rr(ctx, bx - bw / 2 + 6, H - 72, bw - 12, 12, 6); ctx.fill();
      }

      return { update: update, draw: draw, move: function () {} };
    },
  });
})();
