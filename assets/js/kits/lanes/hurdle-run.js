/* Hurdle Run — leap between lanes as hurdle rows arrive. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, clamp = K.clamp, rr = K.roundRect;

  var MODE = { name: "Hurdle Run", level: 8, hudA: "Distance", hudB: "Lane", pattern: "waves" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var LANES = 4, laneW = W / LANES;
      var target = 1, laneFloat = 1;
      var distance = 0, speed = 260;
      var hurdles = [], spawn = 0.7;
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
          spawn = Math.max(0.34, 0.7 * rand(0.82, 1.18));
          var lanePick = Math.floor(rand(0, LANES));
          hurdles.push({ lane: lanePick, y: -70, h: 44 });
        }
        for (var i = hurdles.length - 1; i >= 0; i--) {
          var h = hurdles[i];
          h.y += speed * dt * 0.95;
          if (h.y > H + 90) { hurdles.splice(i, 1); continue; }
          if (h.lane === target && h.y + h.h > playerY && h.y < playerY + 70) { crash(); return; }
        }
        api.hud(Math.round(distance) + " m", "lane " + (target + 1) + " / " + LANES);
      }

      function draw() {
        api.bg();
        var i;
        for (i = 1; i < LANES; i++) {
          ctx.strokeStyle = "rgba(255,255,255,0.12)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(i * laneW, 0);
          ctx.lineTo(i * laneW, H);
          ctx.stroke();
        }
        for (i = 0; i < hurdles.length; i++) {
          var h = hurdles[i];
          ctx.fillStyle = "#fbbf24";
          rr(ctx, h.lane * laneW + 6, h.y, laneW - 12, h.h, 5); ctx.fill();
          ctx.fillStyle = "rgba(0,0,0,0.28)";
          for (var s = 0; s < 4; s++) {
            ctx.fillRect(h.lane * laneW + 10 + s * 18, h.y + 8, 8, h.h - 16);
          }
        }
        var px = laneFloat * laneW + laneW / 2;
        ctx.fillStyle = api.accent;
        ctx.beginPath();
        ctx.arc(px, playerY + 38, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.beginPath();
        ctx.arc(px, playerY + 38, 9, 0, Math.PI * 2);
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
