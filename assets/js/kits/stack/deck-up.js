/* Deck Up — perfect drops extend the deck and build a streak. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rr = K.roundRect;

  var MODE = { name: "Deck Up", level: 4, hudA: "Floors", hudB: "Streak", pattern: "bands" };

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
      var streak = 0;
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
        var w, x;
        if (perfect) {
          w = Math.min(startW + 40, moving.w + 12);
          x = top.x + top.w / 2 - w / 2;
          streak++;
          api.sfx("good");
          api.burst(x + w / 2, moving.y, api.accent, 14);
          api.haptic(10);
        } else {
          w = overlap;
          x = left;
          streak = 0;
          api.sfx("pick");
          api.shake(2);
        }
        blocks.push({ x: x, w: w, y: moving.y });
        floors++;
        moving = next({ x: x, w: w, y: moving.y });
      }

      function update(dt) {
        moving.x += moving.dir * speed * dt;
        if (moving.x < 0) { moving.x = 0; moving.dir = 1; }
        if (moving.x + moving.w > W) { moving.x = W - moving.w; moving.dir = -1; }
        cam -= (Math.min(0, moving.y - H * 0.46) - cam) * Math.min(1, dt * 6);
        api.hud(floors, "x" + streak);
      }

      function draw() {
        api.bg();
        ctx.save();
        ctx.translate(0, -cam);
        for (var i = 0; i < blocks.length; i++) {
          var b = blocks[i];
          ctx.fillStyle = i === blocks.length - 1
            ? api.accent
            : (i % 2 ? "rgba(96,165,250,0.45)" : "rgba(167,139,250,0.4)");
          rr(ctx, b.x, b.y, b.w, blockH - 3, 5);
          ctx.fill();
        }
        ctx.fillStyle = "#f8fafc";
        rr(ctx, moving.x, moving.y, moving.w, blockH - 3, 5);
        ctx.fill();
        ctx.restore();
        if (streak > 1) api.text("STREAK x" + streak, W / 2, H - 50, 16, "rgba(255,255,255,0.4)");
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
