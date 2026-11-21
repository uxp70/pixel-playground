/* Last Light — the lamp shrinks while shards close in from every edge. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, clamp = K.clamp, near = K.near;

  var MODE = {
    name: "Last Light", level: 11, hudA: "Time", hudB: "Lives", pattern: "stars",
    controls: "Drag anywhere or use arrows",
  };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var px = W / 2, py = H / 2, pr = 14;
      var clock = 0, lives = 3, invuln = 0, spawn = 0.7, hazards = [], light = 244;
      var aimX = null, aimY = null, done = false;

      function hurt() {
        if (invuln > 0 || done) return;
        lives--;
        invuln = 1.6;
        light = Math.min(260, light + 34);
        hazards.length = 0;
        api.sfx("bad");
        api.shake(12);
        api.haptic([28, 50, 32]);
        if (lives <= 0) {
          done = true;
          api.finish(Math.floor(clock));
        }
      }

      function spawnOne() {
        var r = rand(7, 16);
        var speed = rand(95, 175) + Math.min(70, clock * 1.1);
        var edge = Math.floor(rand(0, 4));
        var x, y, vx, vy;
        if (edge === 0) { x = rand(10, W - 10); y = -r - 6; vx = rand(-30, 30); vy = speed; }
        else if (edge === 1) { x = W + r + 6; y = rand(40, H - 40); vx = -speed; vy = rand(-30, 30); }
        else if (edge === 2) { x = rand(10, W - 10); y = H + r + 6; vx = rand(-30, 30); vy = -speed; }
        else { x = -r - 6; y = rand(40, H - 40); vx = speed; vy = rand(-30, 30); }
        hazards.push({ x: x, y: y, r: r, vx: vx, vy: vy, wob: rand(0, 6) });
      }

      function update(dt) {
        if (done) return;
        clock += dt;
        invuln = Math.max(0, invuln - dt);
        light = Math.max(96, 244 - clock * 2.2);

        var step = 330 * dt;
        if (api.keys.ArrowLeft || api.keys.KeyA) { px -= step; aimX = null; }
        if (api.keys.ArrowRight || api.keys.KeyD) { px += step; aimX = null; }
        if (api.keys.ArrowUp || api.keys.KeyW) { py -= step; aimY = null; }
        if (api.keys.ArrowDown || api.keys.KeyS) { py += step; aimY = null; }
        if (aimX !== null) px += clamp(aimX - px, -460 * dt, 460 * dt);
        if (aimY !== null) py += clamp(aimY - py, -460 * dt, 460 * dt);
        px = clamp(px, pr + 10, W - pr - 10);
        py = clamp(py, pr + 10, H - pr - 10);

        spawn -= dt;
        if (spawn <= 0) {
          spawnOne();
          spawn = Math.max(0.2, 0.62 - clock * 0.006) * rand(0.75, 1.25);
        }

        for (var i = hazards.length - 1; i >= 0; i--) {
          var h = hazards[i];
          h.x += h.vx * dt;
          h.y += h.vy * dt;
          if (h.x < -80 || h.x > W + 80 || h.y < -80 || h.y > H + 80) {
            hazards.splice(i, 1);
            continue;
          }
          if (near(px, py, pr * 0.7, h.x, h.y, h.r * 0.9)) { hurt(); return; }
        }

        api.hud(Math.floor(clock) + "s", lives + " lives");
      }

      function draw() {
        api.bg();
        for (var i = 0; i < hazards.length; i++) {
          var h = hazards[i];
          ctx.fillStyle = "rgba(248,113,113,0.92)";
          ctx.beginPath();
          ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2);
          ctx.fill();
        }

        var dark = ctx.createRadialGradient(px, py, light * 0.28, px, py, light);
        dark.addColorStop(0, "rgba(3,5,10,0)");
        dark.addColorStop(0.62, "rgba(3,5,10,0.5)");
        dark.addColorStop(1, "rgba(3,5,10,0.97)");
        ctx.fillStyle = dark;
        ctx.fillRect(0, 0, W, H);

        ctx.globalAlpha = invuln > 0 ? 0.38 + 0.38 * Math.sin(clock * 22) : 1;
        ctx.fillStyle = "#f8fafc";
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = api.accent;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(px, py, pr + 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;

        api.text("STAY IN THE LIGHT", W / 2, 58, 16, "rgba(255,255,255,0.42)");
        if (invuln > 0) api.text("SHIELD", W / 2, H - 40, 16, "rgba(255,255,255,0.4)");
      }

      return {
        update: update,
        draw: draw,
        down: function (x, y) { aimX = x; aimY = y; },
        move: function (x, y) { aimX = x; aimY = y; },
        key: function () {},
      };
    },
  });
})();
