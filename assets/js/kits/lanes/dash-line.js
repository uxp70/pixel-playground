/* Dash Line — four lanes, faster traffic, direct lane picks. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, clamp = K.clamp, rr = K.roundRect;

  var MODE = { name: "Dash Line", level: 2, hudA: "Distance", hudB: "Lane", pattern: "beams" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var LANES = 4, laneW = W / LANES;
      var target = 1, laneFloat = 1;
      var distance = 0, speed = 270;
      var cars = [], spawn = 0.55;
      var playerY = H - 150, crashed = false;

      function shift(delta) {
        var next = clamp(target + delta, 0, LANES - 1);
        if (next === target) return;
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
        laneFloat += (target - laneFloat) * Math.min(1, dt * 14);
        spawn -= dt;
        if (spawn <= 0) {
          spawn = rand(0.38, 0.66);
          cars.push({ lane: Math.floor(rand(0, LANES)), y: -86, v: speed * rand(0.9, 1.2) });
          if (Math.random() < 0.22) cars.push({ lane: Math.floor(rand(0, LANES)), y: -190, v: speed * rand(0.8, 1.05) });
        }
        for (var i = cars.length - 1; i >= 0; i--) {
          var c = cars[i];
          c.y += c.v * dt;
          if (c.y > H + 90) { cars.splice(i, 1); continue; }
          if (c.lane === target && c.y + 86 > playerY && c.y < playerY + 70) { crash(); return; }
        }
        api.hud(Math.round(distance) + " m", "lane " + (target + 1) + " / " + LANES);
      }

      function draw() {
        api.bg();
        var i;
        for (i = 1; i < LANES; i++) {
          ctx.fillStyle = "rgba(255,255,255,0.06)";
          ctx.fillRect(i * laneW - 3, 0, 6, H);
        }
        for (i = 0; i < cars.length; i++) {
          var c = cars[i];
          var x = c.lane * laneW + laneW / 2;
          ctx.fillStyle = i % 2 ? "#fb923c" : "#f87171";
          rr(ctx, x - laneW * 0.28, c.y, laneW * 0.56, 86, 8); ctx.fill();
          ctx.fillStyle = "rgba(0,0,0,0.3)";
          ctx.fillRect(x - laneW * 0.2, c.y + 18, laneW * 0.4, 20);
        }
        var px = laneFloat * laneW + laneW / 2;
        ctx.fillStyle = api.accent;
        rr(ctx, px - laneW * 0.26, playerY, laneW * 0.52, 74, 10); ctx.fill();
        ctx.fillStyle = "#f8fafc";
        ctx.fillRect(px - laneW * 0.12, playerY + 10, laneW * 0.24, 8);
        api.text("PICK A LANE", W / 2, 40, 15, "rgba(255,255,255,0.35)");
      }

      function tap(x) {
        var picked = clamp(Math.floor(x / laneW), 0, LANES - 1);
        if (picked === target) return;
        shift(picked > target ? 1 : -1);
      }

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
