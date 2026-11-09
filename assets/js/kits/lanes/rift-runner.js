/* Rift Runner — the outer lanes wrap into each other. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, rr = K.roundRect;

  var MODE = { name: "Rift Runner", level: 4, hudA: "Distance", hudB: "Lane", pattern: "stars" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var LANES = 3, laneW = W / LANES;
      var target = 1, laneFloat = 1;
      var distance = 0, speed = 265;
      var cars = [], spawn = 0.55;
      var playerY = H - 150, crashed = false;

      function shift(delta) {
        var next = (target + delta + LANES) % LANES;
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
        laneFloat += (target - laneFloat) * Math.min(1, dt * 12);
        spawn -= dt;
        if (spawn <= 0) {
          spawn = rand(0.4, 0.72);
          cars.push({ lane: Math.floor(rand(0, LANES)), y: -86, v: speed * rand(0.85, 1.15) });
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
        for (i = 0; i < LANES; i++) {
          ctx.fillStyle = "rgba(167,139,250,0.05)";
          ctx.fillRect(i * laneW, 0, laneW, H);
        }
        ctx.strokeStyle = "rgba(167,139,250,0.35)";
        ctx.lineWidth = 2;
        for (i = 1; i < LANES; i++) {
          ctx.beginPath();
          ctx.moveTo(i * laneW, 0);
          ctx.lineTo(i * laneW, H);
          ctx.stroke();
        }
        ctx.strokeStyle = api.accent;
        ctx.lineWidth = 4;
        ctx.strokeRect(4, 0, W - 8, H);
        for (i = 0; i < cars.length; i++) {
          var c = cars[i];
          var x = c.lane * laneW + laneW / 2;
          ctx.fillStyle = "#c084fc";
          rr(ctx, x - laneW * 0.26, c.y, laneW * 0.52, 86, 14); ctx.fill();
        }
        var px = laneFloat * laneW + laneW / 2;
        ctx.fillStyle = "#f8fafc";
        ctx.beginPath();
        ctx.arc(px, playerY + 36, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = api.accent;
        ctx.lineWidth = 5;
        ctx.stroke();
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
