/* Slip Lane — oil slicks drag the car out of its lane. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, clamp = K.clamp, rr = K.roundRect;

  var MODE = { name: "Slip Lane", level: 9, hudA: "Distance", hudB: "Lane", pattern: "dots" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var LANES = 3, laneW = W / LANES;
      var target = 1, laneFloat = 1;
      var distance = 0, speed = 255;
      var cars = [], oils = [], spawn = 0.55, oilTimer = 2.2;
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
        laneFloat += (target - laneFloat) * Math.min(1, dt * 12);

        oilTimer -= dt;
        if (oilTimer <= 0) {
          oilTimer = rand(1.8, 3.2);
          oils.push({ lane: Math.floor(rand(0, LANES)), ttl: 2.2 });
        }
        for (var o = oils.length - 1; o >= 0; o--) {
          oils[o].ttl -= dt;
          if (oils[o].ttl <= 0) oils.splice(o, 1);
        }
        if (oils.length && Math.random() < dt * 0.9) {
          target = clamp(target + (Math.random() < 0.5 ? -1 : 1), 0, LANES - 1);
        }

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
        for (i = 1; i < LANES; i++) {
          ctx.strokeStyle = "rgba(255,255,255,0.13)";
          ctx.setLineDash([22, 20]);
          ctx.beginPath();
          ctx.moveTo(i * laneW, 0);
          ctx.lineTo(i * laneW, H);
          ctx.stroke();
        }
        ctx.setLineDash([]);
        for (i = 0; i < oils.length; i++) {
          ctx.fillStyle = "rgba(250,204,21,0.16)";
          rr(ctx, oils[i].lane * laneW + 6, 0, laneW - 12, H, 0); ctx.fill();
          ctx.fillStyle = "rgba(250,204,21,0.5)";
          ctx.beginPath();
          ctx.ellipse(oils[i].lane * laneW + laneW / 2, H - 300, laneW * 0.3, 12, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        for (i = 0; i < cars.length; i++) {
          var c = cars[i];
          var x = c.lane * laneW + laneW / 2;
          ctx.fillStyle = "#f87171";
          rr(ctx, x - laneW * 0.26, c.y, laneW * 0.52, 86, 10); ctx.fill();
        }
        var px = laneFloat * laneW + laneW / 2;
        ctx.fillStyle = api.accent;
        rr(ctx, px - laneW * 0.26, playerY, laneW * 0.52, 74, 10); ctx.fill();
        ctx.fillStyle = "#f8fafc";
        rr(ctx, px - laneW * 0.15, playerY + 12, laneW * 0.3, 12, 6); ctx.fill();
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
