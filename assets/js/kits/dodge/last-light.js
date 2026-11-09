/* Last Light — you only see what your glow reaches. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, clamp = K.clamp, near = K.near;
  var MODE = { name: "Last Light", level: 11, hudA: "Time", hudB: "Lives", pattern: "stars" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var px = W / 2, py = H - 48, pr = 16;
      var clock = 0, lives = 3, invuln = 0, spawn = 0.5, hazards = [];

      function hurt() {
        if (invuln > 0) return;
        if (lives > 1) {
          lives--;
          invuln = 1.4;
          hazards.length = 0;
          api.sfx("bad"); api.shake(12); api.haptic([30, 50, 30]);
          return;
        }
        api.sfx("bad"); api.shake(15); api.haptic([30, 60, 40]);
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
          spawn = Math.max(0.2, 0.5 * rand(0.8, 1.22));
          var r = rand(11, 20);
          hazards.push({ x: rand(24, W - 24), y: -r - 10, r: r, vy: 185 * rand(0.85, 1.2) });
        }
        for (var i = hazards.length - 1; i >= 0; i--) {
          var h = hazards[i];
          h.y += h.vy * dt;
          if (h.y > H + 40) { hazards.splice(i, 1); continue; }
          if (near(px, py, pr * 0.8, h.x, h.y, h.r)) { hurt(); return; }
        }
        api.hud(Math.floor(clock) + "s", lives + " lives");
      }

      function draw() {
        api.bg();
        for (var i = 0; i < hazards.length; i++) {
          var h = hazards[i];
          ctx.fillStyle = "#f87171";
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

        var dark = ctx.createRadialGradient(px, py, 30, px, py, 190);
        dark.addColorStop(0, "rgba(3,5,10,0)");
        dark.addColorStop(1, "rgba(3,5,10,0.94)");
        ctx.fillStyle = dark;
        ctx.fillRect(0, 0, W, H);
        if (invuln > 0) api.text("SHIELD", W / 2, 70, 18, "rgba(255,255,255,0.5)");
      }

      return {
        update: update, draw: draw,
        move: function (x) { px = clamp(x, pr + 6, W - pr - 6); },
        key: function () {},
      };
    },
  });
})();
