/* Void Sway — the falling shapes sway across the lane. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, clamp = K.clamp, near = K.near;
  var MODE = { name: "Void Sway", level: 10, hudA: "Time", hudB: "Dodged", pattern: "beams" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var px = W / 2, py = H - 48, pr = 16;
      var clock = 0, dodged = 0, spawn = 0.5, hazards = [];

      function update(dt) {
        clock += dt;
        if (api.keys.ArrowLeft || api.keys.KeyA) px -= 340 * dt;
        if (api.keys.ArrowRight || api.keys.KeyD) px += 340 * dt;
        px = clamp(px, pr + 6, W - pr - 6);
        spawn -= dt;
        if (spawn <= 0) {
          spawn = Math.max(0.22, 0.52 * rand(0.8, 1.2));
          var r = rand(10, 20);
          hazards.push({ x: rand(24, W - 24), y: -r - 10, r: r, vy: 170 * rand(0.85, 1.2) });
        }
        for (var i = hazards.length - 1; i >= 0; i--) {
          var h = hazards[i];
          h.y += h.vy * dt;
          if (h.y > H + 40) { hazards.splice(i, 1); dodged++; continue; }
          var sway = Math.sin(clock * 0.7) * 70;
          if (near(px, py, pr * 0.8, h.x + sway, h.y, h.r)) {
            api.sfx("bad"); api.shake(14); api.haptic([30, 60, 40]);
            api.finish(Math.floor(clock));
            return;
          }
        }
        api.hud(Math.floor(clock) + "s", dodged + " dodged");
      }

      function draw() {
        api.bg();
        var sway = Math.sin(clock * 0.7) * 70;
        for (var i = 0; i < hazards.length; i++) {
          var h = hazards[i];
          ctx.fillStyle = "#a78bfa";
          ctx.beginPath();
          ctx.arc(h.x + sway, h.y, h.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "rgba(255,255,255,0.3)";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
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
