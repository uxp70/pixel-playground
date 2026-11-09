/* Comet Dodge — the comet tails are dangerous too. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, clamp = K.clamp, near = K.near;
  var MODE = { name: "Comet Dodge", level: 4, hudA: "Time", hudB: "Dodged", pattern: "rain" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var px = W / 2, py = H - 48, pr = 16;
      var clock = 0, dodged = 0, spawn = 0.5, hazards = [];

      function update(dt) {
        clock += dt;
        if (api.keys.ArrowLeft || api.keys.KeyA) px -= 350 * dt;
        if (api.keys.ArrowRight || api.keys.KeyD) px += 350 * dt;
        px = clamp(px, pr + 6, W - pr - 6);
        spawn -= dt;
        if (spawn <= 0) {
          spawn = Math.max(0.22, 0.7 * rand(0.8, 1.2));
          var r = rand(10, 18);
          hazards.push({ x: rand(24, W - 24), y: -r - 10, r: r, vx: rand(-20, 20), vy: 205 * rand(0.85, 1.15), trail: [] });
        }
        for (var i = hazards.length - 1; i >= 0; i--) {
          var h = hazards[i];
          h.x += h.vx * dt;
          h.y += h.vy * dt;
          h.trail.push({ x: h.x, y: h.y });
          if (h.trail.length > 7) h.trail.shift();
          if (h.y > H + 40) { hazards.splice(i, 1); dodged++; continue; }
          var hit = near(px, py, pr * 0.8, h.x, h.y, h.r);
          for (var t = 0; t < h.trail.length; t++) {
            if (near(px, py, pr * 0.7, h.trail[t].x, h.trail[t].y, h.r * 0.7)) hit = true;
          }
          if (hit) {
            api.sfx("bad"); api.shake(14); api.haptic([30, 60, 40]);
            api.finish(Math.floor(clock));
            return;
          }
        }
        api.hud(Math.floor(clock) + "s", dodged + " dodged");
      }

      function draw() {
        api.bg();
        for (var i = 0; i < hazards.length; i++) {
          var h = hazards[i];
          for (var t = 0; t < h.trail.length; t++) {
            ctx.globalAlpha = (t + 1) / (h.trail.length + 2);
            ctx.fillStyle = "#f97316";
            ctx.beginPath(); ctx.arc(h.trail[t].x, h.trail[t].y, h.r * 0.55, 0, Math.PI * 2); ctx.fill();
          }
          ctx.globalAlpha = 1;
          ctx.fillStyle = "#fbbf24";
          ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2); ctx.fill();
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
