/* Lane Runner — three lanes, oncoming traffic. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, clamp = K.clamp, rr = K.roundRect;

  var MODE = { name: "Lane Runner", level: 1, hudA: "Distance", hudB: "Lane", pattern: "grid" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var LANES = 3, laneW = W / LANES;
      var target = 1, laneFloat = 1;
      var distance = 0, speed = 250;
      var cars = [], spawn = 0.6;
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
        laneFloat += (target - laneFloat) * Math.min(1, dt * 13);
        spawn -= dt;
        if (spawn <= 0) {
          spawn = Math.max(0.3, rand(0.45, 0.8));
          cars.push({ lane: Math.floor(rand(0, LANES)), y: -86, v: speed * rand(0.85, 1.15) });
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
        for (i = 0; i < LANES; i++) {
          ctx.fillStyle = i === target ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.02)";
          ctx.fillRect(i * laneW, 0, laneW, H);
        }
        ctx.strokeStyle = "rgba(255,255,255,0.18)";
        ctx.lineWidth = 2;
        ctx.setLineDash([26, 26]);
        var off = (distance * 40) % 52;
        for (i = 1; i < LANES; i++) {
          ctx.beginPath();
          ctx.moveTo(i * laneW, -off);
          ctx.lineTo(i * laneW, H);
          ctx.stroke();
        }
        ctx.setLineDash([]);
        for (i = 0; i < cars.length; i++) {
          var c = cars[i];
          var x = c.lane * laneW + laneW / 2;
          ctx.fillStyle = "#f87171";
          rr(ctx, x - laneW * 0.26, c.y, laneW * 0.52, 86, 12); ctx.fill();
          ctx.fillStyle = "rgba(0,0,0,0.35)";
          rr(ctx, x - laneW * 0.18, c.y + 14, laneW * 0.36, 26, 6); ctx.fill();
        }
        var px = laneFloat * laneW + laneW / 2;
        ctx.fillStyle = api.accent;
        rr(ctx, px - laneW * 0.26, playerY, laneW * 0.52, 74, 12); ctx.fill();
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        rr(ctx, px - laneW * 0.18, playerY + 16, laneW * 0.36, 24, 6); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.fillRect(px - laneW * 0.16, playerY + 6, laneW * 0.32, 4);
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
