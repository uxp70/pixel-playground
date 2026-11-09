/* Neon Lanes — headlights cut a little way into the dark. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, rr = K.roundRect;

  var MODE = { name: "Neon Lanes", level: 6, hudA: "Distance", hudB: "Lane", pattern: "rain" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var LANES = 3, laneW = W / LANES;
      var target = 1, laneFloat = 1;
      var distance = 0, speed = 275;
      var cars = [], spawn = 0.5;
      var playerY = H - 150, crashed = false;

      function shift(delta) {
        var next = target + delta;
        if (next < 0 || next >= LANES) return;
        target = next;
        api.sfx("pick");
        api.haptic(4);
      }

      function crash() {
        if (crashed) return;
        crashed = true;
        api.sfx("bad");
        api.shake(14);
        api.haptic([30, 60, 40]);
        api.finish(Math.round(distance));
      }

      function update(dt) {
        distance += speed * dt / 14;
        laneFloat += (target - laneFloat) * Math.min(1, dt * 12);
        spawn -= dt;
        if (spawn <= 0) {
          spawn = rand(0.36, 0.62);
          cars.push({ lane: Math.floor(rand(0, LANES)), y: -86, v: speed * rand(0.9, 1.2) });
        }
        for (var i = cars.length - 1; i >= 0; i--) {
          var c = cars[i];
          c.y += c.v * dt;
          if (c.y > H + 90) { cars.splice(i, 1); continue; }
          if (c.lane === target && c.y + 86 > playerY && c.y < playerY + 70) { crash(); return; }
        }
        api.hud(Math.round(distance) + " m", "lane " + (target + 1));
      }

      function draw() {
        api.bg();
        var i;
        ctx.strokeStyle = "rgba(34,211,238,0.25)";
        ctx.lineWidth = 2;
        for (i = 1; i < LANES; i++) {
          ctx.beginPath();
          ctx.moveTo(i * laneW, 0);
          ctx.lineTo(i * laneW, H);
          ctx.stroke();
        }
        for (i = 0; i < cars.length; i++) {
          var c = cars[i];
          var x = c.lane * laneW + laneW / 2;
          ctx.fillStyle = "#f87171";
          rr(ctx, x - laneW * 0.26, c.y, laneW * 0.52, 86, 12); ctx.fill();
          ctx.fillStyle = "#fca5a5";
          ctx.fillRect(x - laneW * 0.18, c.y + 6, laneW * 0.36, 6);
        }
        var px = laneFloat * laneW + laneW / 2;
        ctx.fillStyle = api.accent;
        rr(ctx, px - laneW * 0.26, playerY, laneW * 0.52, 74, 12); ctx.fill();
        ctx.fillStyle = "#f8fafc";
        rr(ctx, px - laneW * 0.14, playerY + 8, laneW * 0.28, 6, 3); ctx.fill();

        var fog = ctx.createLinearGradient(0, 0, 0, H);
        fog.addColorStop(0, "rgba(4,7,14,0.92)");
        fog.addColorStop(0.58, "rgba(4,7,14,0.55)");
        fog.addColorStop(1, "rgba(4,7,14,0.05)");
        ctx.fillStyle = fog;
        ctx.fillRect(0, 0, W, H);
        api.text("THE ROAD FADES", W / 2, 40, 14, "rgba(255,255,255,0.32)");
      }

      function tap(x) { shift(x < W / 2 ? -1 : 1); }

      return {
        update: update,
        draw: draw,
        tap: tap,
        key: function (code) {
          if (code === "ArrowLeft" || code === "KeyA") shift(-1);
          if (code === "ArrowRight" || code === "KeyD") shift(1);
        },
        swipe: function (dx) { shift(dx < 0 ? -1 : 1); },
      };
    },
  });
})();
