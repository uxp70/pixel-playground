/* Corridor Dash — a narrow three-lane corridor with hard blocks. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, rr = K.roundRect;

  var MODE = { name: "Corridor Dash", level: 7, hudA: "Distance", hudB: "Lane", pattern: "scan" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var LANES = 3, laneW = W / LANES;
      var target = 1, laneFloat = 1;
      var distance = 0, speed = 295;
      var cars = [], blocks = [], spawn = 0.52;
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
        api.shake(16);
        api.haptic([30, 60, 40]);
        api.finish(Math.round(distance));
      }

      function update(dt) {
        distance += speed * dt / 14;
        laneFloat += (target - laneFloat) * Math.min(1, dt * 16);
        spawn -= dt;
        if (spawn <= 0) {
          spawn = rand(0.38, 0.64);
          var lanePick = Math.floor(rand(0, LANES));
          if (Math.random() < 0.42) blocks.push({ lane: lanePick, y: -70, h: 46 });
          else cars.push({ lane: lanePick, y: -86, v: speed * rand(0.88, 1.18) });
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
        api.hud(Math.round(distance) + " m", "lane " + (target + 1));
      }

      function draw() {
        api.bg();
        var i;
        ctx.fillStyle = "rgba(0,0,0,0.18)";
        ctx.fillRect(0, 0, 20, H);
        ctx.fillRect(W - 20, 0, 20, H);
        ctx.strokeStyle = "rgba(255,255,255,0.16)";
        ctx.setLineDash([30, 24]);
        for (i = 1; i < LANES; i++) {
          ctx.beginPath();
          ctx.moveTo(i * laneW, 0);
          ctx.lineTo(i * laneW, H);
          ctx.stroke();
        }
        ctx.setLineDash([]);
        for (i = 0; i < cars.length; i++) {
          var c = cars[i];
          var x = c.lane * laneW + laneW / 2;
          ctx.fillStyle = "#fb7185";
          rr(ctx, x - laneW * 0.28, c.y, laneW * 0.56, 86, 6); ctx.fill();
        }
        for (i = 0; i < blocks.length; i++) {
          var b = blocks[i];
          ctx.fillStyle = "#f59e0b";
          rr(ctx, b.lane * laneW + 8, b.y, laneW - 16, b.h, 4); ctx.fill();
        }
        var px = laneFloat * laneW + laneW / 2;
        ctx.fillStyle = api.accent;
        rr(ctx, px - laneW * 0.24, playerY, laneW * 0.48, 74, 8); ctx.fill();
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.fillRect(px - laneW * 0.14, playerY + 18, laneW * 0.28, 22);
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
