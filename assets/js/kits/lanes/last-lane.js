/* Last Lane — five lanes, hurdle rows, and a closing fog. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, clamp = K.clamp, rr = K.roundRect;

  var MODE = { name: "Last Lane", level: 11, hudA: "Distance", hudB: "Lane", pattern: "rain" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var LANES = 5, laneW = W / LANES;
      var target = 2, laneFloat = 2;
      var distance = 0, speed = 310;
      var hurdles = [], spawn = 0.62;
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
        api.shake(17);
        api.haptic([30, 60, 40]);
        api.finish(Math.round(distance));
      }

      function update(dt) {
        distance += speed * dt / 14;
        laneFloat += (target - laneFloat) * Math.min(1, dt * 16);
        spawn -= dt;
        if (spawn <= 0) {
          spawn = Math.max(0.32, 0.62 * rand(0.78, 1.2));
          var lanePick = Math.floor(rand(0, LANES));
          hurdles.push({ lane: lanePick, y: -70, h: 44 });
          var second = (lanePick + 2) % LANES;
          hurdles.push({ lane: second, y: -70, h: 44 });
        }
        for (var i = hurdles.length - 1; i >= 0; i--) {
          var h = hurdles[i];
          h.y += speed * dt * 0.95;
          if (h.y > H + 90) { hurdles.splice(i, 1); continue; }
          if (h.lane === target && h.y + h.h > playerY && h.y < playerY + 70) { crash(); return; }
        }
        api.hud(Math.round(distance) + " m", (target + 1) + " / " + LANES);
      }

      function draw() {
        api.bg();
        var i;
        for (i = 1; i < LANES; i++) {
          ctx.strokeStyle = "rgba(255,255,255,0.14)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(i * laneW, 0);
          ctx.lineTo(i * laneW, H);
          ctx.stroke();
        }
        for (i = 0; i < hurdles.length; i++) {
          var h = hurdles[i];
          ctx.fillStyle = "#fbbf24";
          rr(ctx, h.lane * laneW + 4, h.y, laneW - 8, h.h, 5); ctx.fill();
          ctx.fillStyle = "rgba(0,0,0,0.3)";
          ctx.fillRect(h.lane * laneW + 9, h.y + 8, laneW - 18, h.h - 16);
        }
        var px = laneFloat * laneW + laneW / 2;
        ctx.fillStyle = "#f8fafc";
        rr(ctx, px - laneW * 0.26, playerY, laneW * 0.52, 74, 12); ctx.fill();
        ctx.fillStyle = api.accent;
        rr(ctx, px - laneW * 0.18, playerY + 10, laneW * 0.36, 8, 4); ctx.fill();

        var fog = ctx.createLinearGradient(0, 0, 0, H);
        fog.addColorStop(0, "rgba(4,7,14,0.9)");
        fog.addColorStop(0.55, "rgba(4,7,14,0.5)");
        fog.addColorStop(1, "rgba(4,7,14,0.04)");
        ctx.fillStyle = fog;
        ctx.fillRect(0, 0, W, H);
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
