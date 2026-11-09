/* Icefall — the floor is ice, so you slide past your target. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, clamp = K.clamp, near = K.near;
  var MODE = { name: "Icefall", level: 7, hudA: "Time", hudB: "Dodged", pattern: "waves" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var px = W / 2, py = H - 48, pr = 16, vx = 0;
      var clock = 0, dodged = 0, spawn = 0.5, hazards = [];

      function update(dt) {
        clock += dt;
        var accel = 900, maxV = 320;
        if (api.keys.ArrowLeft || api.keys.KeyA) vx -= accel * dt;
        if (api.keys.ArrowRight || api.keys.KeyD) vx += accel * dt;
        vx = clamp(vx, -maxV, maxV);
        px += vx * dt;
        vx *= Math.pow(0.985, dt * 60);
        if (px < pr + 6) { px = pr + 6; vx = 0; }
        if (px > W - pr - 6) { px = W - pr - 6; vx = 0; }

        spawn -= dt;
        if (spawn <= 0) {
          spawn = Math.max(0.22, 0.58 * rand(0.8, 1.2));
          var r = rand(10, 19);
          hazards.push({ x: rand(24, W - 24), y: -r - 10, r: r, vy: 180 * rand(0.85, 1.2) });
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
        for (var i = 0; i < hazards.length; i++) {
          var h = hazards[i];
          ctx.fillStyle = "#93c5fd";
          ctx.beginPath();
          ctx.moveTo(h.x, h.y - h.r);
          ctx.lineTo(h.x + h.r * 0.8, h.y);
          ctx.lineTo(h.x, h.y + h.r);
          ctx.lineTo(h.x - h.r * 0.8, h.y);
          ctx.closePath(); ctx.fill();
        }
        ctx.fillStyle = "rgba(255,255,255,0.1)";
        ctx.fillRect(0, H - 12, W, 12);
        ctx.fillStyle = "#f8fafc";
        ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = api.accent; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(px, py, pr + 5, 0, Math.PI * 2); ctx.stroke();
      }

      return {
        update: update, draw: draw,
        move: function (x) { vx += clamp((x - px) * 6, -140, 140); },
        key: function () {},
      };
    },
  });
})();
