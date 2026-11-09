/* Hailstorm — dense, small hail and four lives. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, clamp = K.clamp, near = K.near;
  var MODE = { name: "Hailstorm", level: 9, hudA: "Time", hudB: "Lives", pattern: "rain" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var px = W / 2, py = H - 48, pr = 16;
      var clock = 0, lives = 4, invuln = 0, spawn = 0.15, hazards = [];

      function hurt() {
        if (invuln > 0) return;
        if (lives > 1) {
          lives--;
          invuln = 1.2;
          hazards.length = 0;
          api.sfx("bad"); api.shake(11); api.haptic([25, 45, 30]);
          return;
        }
        api.sfx("bad"); api.shake(15); api.haptic([30, 60, 40]);
        api.finish(Math.floor(clock));
      }

      function update(dt) {
        clock += dt;
        invuln = Math.max(0, invuln - dt);
        if (api.keys.ArrowLeft || api.keys.KeyA) px -= 360 * dt;
        if (api.keys.ArrowRight || api.keys.KeyD) px += 360 * dt;
        px = clamp(px, pr + 6, W - pr - 6);
        spawn -= dt;
        if (spawn <= 0) {
          spawn = Math.max(0.08, 0.15 * rand(0.7, 1.3));
          var r = rand(6, 11);
          hazards.push({ x: rand(20, W - 20), y: -r - 10, r: r, vy: 140 * rand(0.85, 1.2) });
        }
        for (var i = hazards.length - 1; i >= 0; i--) {
          var h = hazards[i];
          h.y += h.vy * dt;
          if (h.y > H + 30) { hazards.splice(i, 1); continue; }
          if (near(px, py, pr * 0.8, h.x, h.y, h.r)) { hurt(); return; }
        }
        api.hud(Math.floor(clock) + "s", lives + " lives");
      }

      function draw() {
        api.bg();
        for (var i = 0; i < hazards.length; i++) {
          var h = hazards[i];
          ctx.fillStyle = "#bfdbfe";
          ctx.beginPath();
          ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = invuln > 0 ? 0.35 + 0.35 * Math.sin(clock * 22) : 1;
        ctx.fillStyle = "#f8fafc";
        ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = api.accent; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(px, py, pr + 5, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
      }

      return {
        update: update, draw: draw,
        move: function (x) { px = clamp(x, pr + 6, W - pr - 6); },
        key: function () {},
      };
    },
  });
})();
