/* Drift Zone — the arena drags you sideways while shards fall. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, clamp = K.clamp, near = K.near;
  var MODE = { name: "Drift Zone", level: 8, hudA: "Time", hudB: "Dodged", pattern: "dots" };

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
        px += Math.sin(clock * 0.9) * 40 * dt;
        px = clamp(px, pr + 6, W - pr - 6);

        spawn -= dt;
        if (spawn <= 0) {
          spawn = Math.max(0.22, 0.55 * rand(0.8, 1.22));
          var r = rand(10, 19);
          hazards.push({ x: rand(24, W - 24), y: -r - 10, r: r, vy: 165 * rand(0.85, 1.2) });
        }
        for (var i = hazards.length - 1; i >= 0; i--) {
          var h = hazards[i];
          h.y += h.vy * dt;
          if (h.y > H + 40) { hazards.splice(i, 1); dodged++; continue; }
          if (near(px, py, pr * 0.8, h.x, h.y, h.r)) {
            api.sfx("bad"); api.shake(14); api.haptic([30, 60, 40]);
            api.finish(Math.floor(clock));
            return;
          }
        }
        api.hud(Math.floor(clock) + "s", dodged + " dodged");
      }

      function draw() {
        api.bg();
        var drift = Math.sin(clock * 0.9) * 40;
        ctx.strokeStyle = "rgba(255,255,255,0.1)";
        ctx.lineWidth = 2;
        for (var i = 0; i < 6; i++) {
          var y = 80 + i * 90;
          ctx.beginPath();
          ctx.moveTo(30, y);
          ctx.lineTo(W - 30, y + drift);
          ctx.stroke();
        }
        for (var j = 0; j < hazards.length; j++) {
          var h = hazards[j];
          ctx.fillStyle = "#c084fc";
          ctx.beginPath();
          ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = "#f8fafc";
        ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = api.accent; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(px, py, pr + 5, 0, Math.PI * 2); ctx.stroke();
        api.text("DRIFT", W / 2, 34, 13, "rgba(255,255,255,0.3)");
      }

      return {
        update: update, draw: draw,
        move: function (x) { px = clamp(x, pr + 6, W - pr - 6); },
        key: function () {},
      };
    },
  });
})();
