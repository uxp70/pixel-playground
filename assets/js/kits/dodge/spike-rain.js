/* Spike Rain — missed shards stick in the floor as spikes. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, clamp = K.clamp, near = K.near;
  var MODE = { name: "Spike Rain", level: 5, hudA: "Time", hudB: "Lives", pattern: "bricks" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var px = W / 2, py = H - 48, pr = 16;
      var clock = 0, lives = 3, invuln = 0, spawn = 0.5, hazards = [], spikes = [];

      function hurt() {
        if (invuln > 0) return;
        if (lives > 1) {
          lives--;
          invuln = 1.4;
          hazards.length = 0;
          api.sfx("bad"); api.shake(12); api.haptic([30, 50, 30]);
          return;
        }
        api.sfx("bad"); api.shake(14); api.haptic([30, 60, 40]);
        api.finish(Math.floor(clock));
      }

      function update(dt) {
        clock += dt;
        invuln = Math.max(0, invuln - dt);
        if (api.keys.ArrowLeft || api.keys.KeyA) px -= 350 * dt;
        if (api.keys.ArrowRight || api.keys.KeyD) px += 350 * dt;
        px = clamp(px, pr + 6, W - pr - 6);
        spawn -= dt;
        if (spawn <= 0) {
          spawn = Math.max(0.18, 0.5 * rand(0.8, 1.25));
          var r = rand(10, 18);
          hazards.push({ x: rand(24, W - 24), y: -r - 10, r: r, vy: 155 * rand(0.85, 1.2) });
        }
        for (var i = hazards.length - 1; i >= 0; i--) {
          var h = hazards[i];
          h.y += h.vy * dt;
          if (h.y > H - 34) {
            spikes.push({ x: h.x, y: H - 14, r: h.r * 0.9, ttl: 4 });
            hazards.splice(i, 1);
            continue;
          }
          if (near(px, py, pr * 0.8, h.x, h.y, h.r)) { hurt(); return; }
        }
        for (var s = spikes.length - 1; s >= 0; s--) {
          spikes[s].ttl -= dt;
          if (spikes[s].ttl <= 0) spikes.splice(s, 1);
          else if (near(px, py, pr * 0.8, spikes[s].x, spikes[s].y, spikes[s].r)) { hurt(); return; }
        }
        api.hud(Math.floor(clock) + "s", lives + " lives");
      }

      function draw() {
        api.bg();
        for (var i = 0; i < hazards.length; i++) {
          var h = hazards[i];
          ctx.fillStyle = "#fbbf24";
          ctx.beginPath();
          ctx.moveTo(h.x, h.y - h.r);
          ctx.lineTo(h.x + h.r, h.y + h.r * 0.8);
          ctx.lineTo(h.x - h.r, h.y + h.r * 0.8);
          ctx.closePath(); ctx.fill();
        }
        for (var s = 0; s < spikes.length; s++) {
          ctx.globalAlpha = Math.min(1, spikes[s].ttl);
          ctx.fillStyle = "#f59e0b";
          ctx.beginPath();
          ctx.moveTo(spikes[s].x, spikes[s].y - spikes[s].r * 1.5);
          ctx.lineTo(spikes[s].x + spikes[s].r, spikes[s].y + 6);
          ctx.lineTo(spikes[s].x - spikes[s].r, spikes[s].y + 6);
          ctx.closePath(); ctx.fill();
          ctx.globalAlpha = 1;
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
