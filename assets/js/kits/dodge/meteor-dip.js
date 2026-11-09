/* Meteor Dip — the meteors lean toward you as they fall. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, clamp = K.clamp, near = K.near;
  var MODE = { name: "Meteor Dip", level: 1, hudA: "Time", hudB: "Dodged", pattern: "stars" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var px = W / 2, py = H - 48, pr = 16;
      var clock = 0, dodged = 0, spawn = 0.5, invuln = 0, hazards = [];

      function hurt() {
        api.sfx("bad"); api.shake(14); api.haptic([30, 60, 40]);
        api.finish(Math.floor(clock));
      }

      function update(dt) {
        clock += dt;
        invuln = Math.max(0, invuln - dt);
        if (api.keys.ArrowLeft || api.keys.KeyA) px -= 340 * dt;
        if (api.keys.ArrowRight || api.keys.KeyD) px += 340 * dt;
        px = clamp(px, pr + 6, W - pr - 6);
        spawn -= dt;
        if (spawn <= 0) {
          spawn = Math.max(0.2, 0.55 * rand(0.78, 1.25));
          var r = rand(10, 20);
          hazards.push({ x: rand(20, W - 20), y: -r - 10, r: r, vx: rand(-1, 1) * 20, vy: 160 * rand(0.8, 1.25) });
        }
        for (var i = hazards.length - 1; i >= 0; i--) {
          var h = hazards[i];
          h.vx += clamp(px - h.x, -30, 30) * dt * 2.2;
          h.x += h.vx * dt;
          h.y += h.vy * dt;
          if (h.y > H + 40) { hazards.splice(i, 1); dodged++; continue; }
          if (near(px, py, pr * 0.8, h.x, h.y, h.r)) { hurt(); return; }
        }
        api.hud(Math.floor(clock) + "s", dodged + " dodged");
      }

      function draw() {
        api.bg();
        for (var i = 0; i < hazards.length; i++) {
          var h = hazards[i];
          var grad = ctx.createLinearGradient(h.x - h.r, h.y - h.r, h.x + h.r, h.y + h.r);
          grad.addColorStop(0, "#fbbf24");
          grad.addColorStop(1, "#ef8a5a");
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "rgba(0,0,0,0.25)";
          ctx.beginPath();
          ctx.arc(h.x - h.r * 0.25, h.y - h.r * 0.25, h.r * 0.22, 0, Math.PI * 2);
          ctx.fill();
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
