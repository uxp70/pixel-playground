/* Track Sprint — five narrow lanes at speed. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, clamp = K.clamp, rr = K.roundRect;

  var MODE = { name: "Track Sprint", level: 3, hudA: "Distance", hudB: "Lane", pattern: "bands" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var LANES = 5, laneW = W / LANES;
      var target = 2, laneFloat = 2;
      var distance = 0, speed = 285;
      var cars = [], spawn = 0.5;
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
        api.shake(15);
        api.haptic([30, 60, 40]);
        api.finish(Math.round(distance));
      }

      function update(dt) {
        distance += speed * dt / 14;
        laneFloat += (target - laneFloat) * Math.min(1, dt * 15);
        spawn -= dt;
        if (spawn <= 0) {
          spawn = rand(0.34, 0.58);
          cars.push({ lane: Math.floor(rand(0, LANES)), y: -86, v: speed * rand(0.9, 1.18) });
        }
        for (var i = cars.length - 1; i >= 0; i--) {
          var c = cars[i];
          c.y += c.v * dt;
          if (c.y > H + 90) { cars.splice(i, 1); continue; }
          if (c.lane === target && c.y + 86 > playerY && c.y < playerY + 70) { crash(); return; }
        }
        api.hud(Math.round(distance) + " m", (target + 1) + " / " + LANES);
      }

      function draw() {
        api.bg();
        var i;
        for (i = 0; i < LANES; i++) {
          ctx.fillStyle = "rgba(255,255,255,0.02)";
          ctx.fillRect(i * laneW, 0, laneW, H);
        }
        ctx.strokeStyle = "rgba(255,255,255,0.2)";
        ctx.lineWidth = 1;
        for (i = 1; i < LANES; i++) {
          ctx.beginPath();
          ctx.moveTo(i * laneW, 0);
          ctx.lineTo(i * laneW, H);
          ctx.stroke();
        }
        for (i = 0; i < cars.length; i++) {
          var c = cars[i];
          var x = c.lane * laneW + laneW / 2;
          ctx.fillStyle = "#f97316";
          rr(ctx, x - laneW * 0.32, c.y, laneW * 0.64, 86, 6); ctx.fill();
          ctx.fillStyle = "rgba(0,0,0,0.32)";
          ctx.fillRect(x - laneW * 0.22, c.y + 16, laneW * 0.44, 22);
        }
        var px = laneFloat * laneW + laneW / 2;
        ctx.fillStyle = "#f8fafc";
        ctx.beginPath();
        ctx.moveTo(px, playerY);
        ctx.lineTo(px + laneW * 0.28, playerY + 74);
        ctx.lineTo(px - laneW * 0.28, playerY + 74);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = api.accent;
        ctx.beginPath();
        ctx.arc(px, playerY + 34, 9, 0, Math.PI * 2);
        ctx.fill();
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
