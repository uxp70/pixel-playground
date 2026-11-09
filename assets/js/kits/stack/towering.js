/* Towering — a classic skyline stacker. Standalone cabinet, own implementation. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rr = K.roundRect;

  var MODE = { name: "Towering", level: 1, hudA: "Floors", hudB: "Best", pattern: "stars" };

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
          api.haptic(5);
        }
        blocks.push(placed);
        floors++;
        moving = next(placed);
      }

      function update(dt) {
        moving.x += moving.dir * speed * dt;
        if (moving.x < 0) { moving.x = 0; moving.dir = 1; }
        if (moving.x + moving.w > W) { moving.x = W - moving.w; moving.dir = -1; }
        cam -= (Math.min(0, moving.y - H * 0.46) - cam) * Math.min(1, dt * 6);
        api.hud(floors, Math.round(moving.w) + " px");
      }

      function draw() {
        api.bg();
        ctx.save();
        ctx.translate(0, -cam);
        for (var i = 0; i < blocks.length; i++) {
          var b = blocks[i];
          ctx.fillStyle = i === blocks.length - 1
            ? api.accent
            : (i % 2 ? "rgba(148,163,184,0.5)" : "rgba(148,163,184,0.32)");
          rr(ctx, b.x, b.y, b.w, blockH - 3, 5);
          ctx.fill();
        }
        ctx.fillStyle = "#f8fafc";
        rr(ctx, moving.x, moving.y, moving.w, blockH - 3, 5);
        ctx.fill();
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.fillRect(moving.x + 4, moving.y + blockH - 8, moving.w - 8, 2);
        ctx.restore();
        api.text("TAP TO DROP", W / 2, H - 40, 16, "rgba(255,255,255,0.35)");
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
