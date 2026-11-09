/* Charge Line — the car keeps accelerating until the run ends. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, rr = K.roundRect;

  var MODE = { name: "Charge Line", level: 10, hudA: "Distance", hudB: "Lane", pattern: "beams" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var LANES = 3, laneW = W / LANES;
      var target = 1, laneFloat = 1;
      var distance = 0, speed = 330;
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
        api.shake(18);
        api.haptic([30, 60, 40]);
        api.finish(Math.round(distance));
      }

      function update(dt) {
        speed = Math.min(460, speed + dt * 9);
        distance += speed * 1.4 * dt / 14;
        laneFloat += (target - laneFloat) * Math.min(1, dt * 18);
        spawn -= dt;
        if (spawn <= 0) {
          spawn = Math.max(0.26, 0.5 * rand(0.75, 1.2));
          cars.push({ lane: Math.floor(rand(0, LANES)), y: -86, v: speed * rand(0.8, 1.1) });
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
        ctx.strokeStyle = "rgba(255,255,255,0.16)";
        ctx.lineWidth = 3;
        for (i = 1; i < LANES; i++) {
          ctx.beginPath();
          ctx.moveTo(i * laneW, 0);
          ctx.lineTo(i * laneW, H);
          ctx.stroke();
        }
        ctx.globalAlpha = 0.25;
        ctx.strokeStyle = api.accent;
        ctx.lineWidth = 1;
        for (i = 0; i < 12; i++) {
          var y = ((api.elapsed * speed * 0.9 + i * 60) % (H + 120)) - 60;
          ctx.beginPath();
          ctx.moveTo(10, y);
          ctx.lineTo(W - 10, y);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        for (i = 0; i < cars.length; i++) {
          var c = cars[i];
          var x = c.lane * laneW + laneW / 2;
          ctx.fillStyle = "#f87171";
          rr(ctx, x - laneW * 0.28, c.y, laneW * 0.56, 86, 8); ctx.fill();
        }
        var px = laneFloat * laneW + laneW / 2;
        ctx.fillStyle = api.accent;
        rr(ctx, px - laneW * 0.26, playerY, laneW * 0.52, 74, 8); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        for (i = 0; i < 3; i++) ctx.fillRect(px - 10, playerY + 54 + i * 6, 20, 3);
        api.text("BOOST", W / 2, 38, 15, "rgba(255,255,255,0.4)");
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
