/* Neon Dive — horizontal beams sweep a two-axis arena. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, clamp = K.clamp;
  var MODE = { name: "Neon Dive", level: 6, hudA: "Time", hudB: "Lives", pattern: "scan" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var px = W / 2, py = H / 2, pr = 15;
      var clock = 0, lives = 3, invuln = 0, beams = [], timer = 0.7;

      function hurt() {
        if (invuln > 0) return;
        if (lives > 1) {
          lives--;
          invuln = 1.4;
          beams.length = 0;
          api.sfx("bad"); api.shake(12); api.haptic([30, 50, 30]);
          return;
        }
        api.sfx("bad"); api.shake(15); api.haptic([30, 60, 40]);
        api.finish(Math.floor(clock));
      }

      function update(dt) {
        clock += dt;
        invuln = Math.max(0, invuln - dt);
        var speed = 300;
        if (api.keys.ArrowLeft || api.keys.KeyA) px -= speed * dt;
        if (api.keys.ArrowRight || api.keys.KeyD) px += speed * dt;
        if (api.keys.ArrowUp || api.keys.KeyW) py -= speed * dt;
        if (api.keys.ArrowDown || api.keys.KeyS) py += speed * dt;
        px = clamp(px, pr + 6, W - pr - 6);
        py = clamp(py, 100, H - pr - 6);

        timer -= dt;
        if (timer <= 0) {
          timer = Math.max(0.55, 1.3 - clock * 0.03);
          beams.push({ x: -160, y: rand(120, H - 90), w: rand(110, 220), h: 16, v: rand(180, 300) });
        }
        for (var i = beams.length - 1; i >= 0; i--) {
          var beam = beams[i];
          beam.x += beam.v * dt;
          if (beam.x > W + 40) { beams.splice(i, 1); continue; }
          if (py + pr > beam.y && py - pr < beam.y + beam.h &&
              px + pr > beam.x && px - pr < beam.x + beam.w) { hurt(); return; }
        }
        api.hud(Math.floor(clock) + "s", lives + " lives");
      }

      function draw() {
        api.bg();
        for (var i = 0; i < beams.length; i++) {
          var beam = beams[i];
          var g = ctx.createLinearGradient(beam.x, 0, beam.x + beam.w, 0);
          g.addColorStop(0, "rgba(255,255,255,0)");
          g.addColorStop(0.5, api.accent);
          g.addColorStop(1, "rgba(255,255,255,0)");
          ctx.fillStyle = g;
          ctx.fillRect(beam.x, beam.y, beam.w, beam.h);
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
        move: function (x, y) { px = clamp(x, pr + 6, W - pr - 6); py = clamp(y, 100, H - pr - 6); },
        key: function () {},
      };
    },
  });
})();
