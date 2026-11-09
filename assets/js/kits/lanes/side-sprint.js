/* Side Sprint — cars plus solid roadblocks. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, clamp = K.clamp, rr = K.roundRect;

  var MODE = { name: "Side Sprint", level: 5, hudA: "Distance", hudB: "Lane", pattern: "dots" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var LANES = 4, laneW = W / LANES;
      var target = 1, laneFloat = 1;
      var distance = 0, speed = 250;
      var cars = [], blocks = [], spawn = 0.55;
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
        laneFloat += (target - laneFloat) * Math.min(1, dt * 14);
        spawn -= dt;
        if (spawn <= 0) {
          spawn = rand(0.4, 0.68);
          var lanePick = Math.floor(rand(0, LANES));
          if (Math.random() < 0.4) blocks.push({ lane: lanePick, y: -70, h: 44 });
          else cars.push({ lane: lanePick, y: -86, v: speed * rand(0.85, 1.15) });
        }
        for (var i = cars.length - 1; i >= 0; i--) {
          var c = cars[i];
          c.y += c.v * dt;
          if (c.y > H + 90) { cars.splice(i, 1); continue; }
          if (c.lane === target && c.y + 86 > playerY && c.y < playerY + 70) { crash(); return; }
        }
        for (var b = blocks.length - 1; b >= 0; b--) {
          var block = blocks[b];
          block.y += speed * dt * 0.95;
          if (block.y > H + 90) { blocks.splice(b, 1); continue; }
          if (block.lane === target && block.y + block.h > playerY && block.y < playerY + 70) { crash(); return; }
        }
        api.hud(Math.round(distance) + " m", "lane " + (target + 1) + " / " + LANES);
      }

      function draw() {
        api.bg();
        var i;
        for (i = 1; i < LANES; i++) {
          ctx.strokeStyle = "rgba(255,255,255,0.14)";
          ctx.setLineDash([18, 18]);
          ctx.beginPath();
          ctx.moveTo(i * laneW, 0);
          ctx.lineTo(i * laneW, H);
          ctx.stroke();
        }
        ctx.setLineDash([]);
        for (i = 0; i < cars.length; i++) {
          var c = cars[i];
          var x = c.lane * laneW + laneW / 2;
          ctx.fillStyle = "#ef8a5a";
          rr(ctx, x - laneW * 0.27, c.y, laneW * 0.54, 86, 10); ctx.fill();
        }
        for (i = 0; i < blocks.length; i++) {
          var b = blocks[i];
          ctx.fillStyle = "#fbbf24";
          rr(ctx, b.lane * laneW + 6, b.y, laneW - 12, b.h, 6); ctx.fill();
          ctx.fillStyle = "rgba(0,0,0,0.3)";
          for (var s = 0; s < 3; s++) ctx.fillRect(b.lane * laneW + 12 + s * 20, b.y + 10, 9, b.h - 20);
        }
        var px = laneFloat * laneW + laneW / 2;
        ctx.fillStyle = api.accent;
        rr(ctx, px - laneW * 0.27, playerY, laneW * 0.54, 74, 10); ctx.fill();
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
