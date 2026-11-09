/* Gap Runner — sliding walls with a single safe gap. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, clamp = K.clamp;
  var MODE = { name: "Gap Runner", level: 3, hudA: "Time", hudB: "Walls", pattern: "bands" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var px = W / 2, py = H - 48, pr = 16;
      var clock = 0, dodged = 0, wallY = -40, gap = 190, gapX = W / 2;

      function update(dt) {
        clock += dt;
        if (api.keys.ArrowLeft || api.keys.KeyA) px -= 340 * dt;
        if (api.keys.ArrowRight || api.keys.KeyD) px += 340 * dt;
        px = clamp(px, pr + 6, W - pr - 6);

        wallY += 120 * dt;
        if (wallY > H + 60) {
          wallY = -80;
          dodged++;
          gap = Math.max(118, 200 - clock * 2);
          gapX = rand(gap / 2 + 20, W - gap / 2 - 20);
          api.sfx("pick");
        }
        var close = wallY + 46 > py - pr && wallY - 46 < py + pr;
        if (close && (px < gapX - gap / 2 || px > gapX + gap / 2)) {
          api.sfx("bad"); api.shake(14); api.haptic([30, 60, 40]);
          api.finish(Math.floor(clock));
          return;
        }
        api.hud(Math.floor(clock) + "s", dodged + " walls");
      }

      function draw() {
        api.bg();
        ctx.fillStyle = "rgba(239,138,90,0.9)";
        ctx.fillRect(0, wallY, gapX - gap / 2, 46);
        ctx.fillRect(gapX + gap / 2, wallY, W - gapX - gap / 2, 46);
        ctx.fillStyle = "rgba(255,255,255,0.14)";
        ctx.fillRect(gapX - gap / 2, wallY, gap, 46);

        ctx.fillStyle = "#f8fafc";
        ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = api.accent; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(px, py, pr + 5, 0, Math.PI * 2); ctx.stroke();
      }

      return {
        update: update, draw: draw,
        move: function (x) { px = clamp(x, pr + 6, W - pr - 6); },
        key: function () {},
      };
    },
  });
})();
