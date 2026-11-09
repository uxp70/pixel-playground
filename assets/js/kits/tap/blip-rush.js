/* Blip Rush — one blip, a shrinking window. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, near = K.near;
  var MODE = { name: "Blip Rush", level: 3, hudA: "Blips", hudB: "Time", pattern: "scan" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var blip = { x: W / 2, y: H / 2, r: 34, moveIn: 0.7 };
      var score = 0, clock = 0, LIMIT = 15;

      function jump(bigger) {
        blip.x = rand(50, W - 50);
        blip.y = rand(100, H - 50);
        blip.r = Math.max(22, Math.min(44, blip.r + (bigger ? 1 : -1)));
        blip.moveIn = Math.max(0.32, 0.7 - score * 0.015);
      }

      function update(dt) {
        clock += dt;
        blip.moveIn -= dt;
        if (blip.moveIn <= 0) jump(false);
        api.hud(score, Math.max(0, Math.ceil(LIMIT - clock)) + "s");
        if (clock >= LIMIT) api.finish(score);
      }

      function draw() {
        api.bg();
        ctx.strokeStyle = "rgba(255,255,255,0.12)";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(blip.x, blip.y, blip.r + 16, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = api.accent;
        ctx.beginPath(); ctx.arc(blip.x, blip.y, blip.r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.beginPath(); ctx.arc(blip.x, blip.y, blip.r * 0.35, 0, Math.PI * 2); ctx.fill();
        api.text("TAP THE BLIP", W / 2, H - 40, 15, "rgba(255,255,255,0.35)");
      }

      function tap(x, y) {
        if (!near(x, y, 2, blip.x, blip.y, blip.r)) return;
        score++;
        api.sfx("pick");
        api.burst(blip.x, blip.y, api.accent, 8);
        api.haptic(4);
        jump(true);
      }

      return { update: update, draw: draw, tap: tap };
    },
  });
})();
