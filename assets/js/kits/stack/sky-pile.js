/* Sky Pile — the moving slab drifts on a sine wave. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rr = K.roundRect;

  var MODE = { name: "Sky Pile", level: 5, hudA: "Floors", hudB: "Drift", pattern: "dots" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var blockH = 28;
      var startW = 250;
      var speed = 145;
      var blocks = [{ x: (W - startW) / 2, w: startW, y: H - 150 }];
      var cam = 0;
      var floors = 0;
      var clock = 0;
      var drift = 0;
      var moving = next(blocks[0]);

      function next(prev) {
        var fromLeft = blocks.length % 2 === 1;
        return { x: fromLeft ? 0 : W - prev.w, w: prev.w, y: prev.y - blockH, dir: fromLeft ? 1 : -1 };
      }

      function drop() {
        var top = blocks[blocks.length - 1];
        var left = Math.max(moving.x, top.x);
        var right = Math.min(moving.x + moving.w, top.x + top.w);
        var overlap = right - left;
        if (overlap <= 5) {
          api.sfx("bad");
          api.shake(11);
          api.haptic([20, 50, 30]);
          api.finish(floors);
          return;
        }
        var perfect = Math.abs(moving.x - top.x) <= 8;
        var w = perfect ? Math.min(startW + 40, moving.w + 6) : overlap;
        var placed = { x: perfect ? top.x + top.w / 2 - w / 2 : left, w: w, y: moving.y };
        if (perfect) {
          api.sfx("good");
          api.burst(placed.x + w / 2, placed.y, api.accent, 12);
          api.haptic(10);
        } else {
          api.sfx("pick");
          api.shake(2);
        }
        blocks.push(placed);
        floors++;
        moving = next(placed);
      }

      function update(dt) {
        clock += dt;
        drift = Math.sin(clock * 1.4) * 46;
        moving.x += moving.dir * speed * dt + drift * dt;
        if (moving.x < 0) { moving.x = 0; moving.dir = 1; }
        if (moving.x + moving.w > W) { moving.x = W - moving.w; moving.dir = -1; }
        cam -= (Math.min(0, moving.y - H * 0.46) - cam) * Math.min(1, dt * 6);
        api.hud(floors, Math.round(drift) + " px");
      }

      function draw() {
        api.bg();
        ctx.save();
        ctx.translate(0, -cam);
        for (var i = 0; i < blocks.length; i++) {
          var b = blocks[i];
          ctx.fillStyle = i === blocks.length - 1
            ? api.accent
            : (i % 2 ? "rgba(45,212,191,0.4)" : "rgba(148,163,184,0.3)");
          rr(ctx, b.x, b.y, b.w, blockH - 3, 5);
          ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,0.18)";
          ctx.fillRect(b.x + 6, b.y + 5, b.w - 12, 3);
        }
        ctx.fillStyle = "#f8fafc";
        rr(ctx, moving.x, moving.y, moving.w, blockH - 3, 5);
        ctx.fill();
        ctx.restore();
      }

      return {
        update: update,
        draw: draw,
        tap: drop,
        key: function (code) { if (code === "Space" || code === "Enter") drop(); },
      };
    },
  });
})();
