/* Tower Ten — only perfect drops count, and ten of them win. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rr = K.roundRect;

  var MODE = { name: "Tower Ten", level: 11, hudA: "Perfect", hudB: "Floors", pattern: "stars" };

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
      var perfects = 0;
      var moving = next(blocks[0]);

      function next(prev) {
        var fromLeft = blocks.length % 2 === 1;
        return { x: fromLeft ? 0 : W - prev.w, w: prev.w, y: prev.y - blockH, dir: fromLeft ? 1 : -1 };
      }

      function drop() {
        var top = blocks[blocks.length - 1];
        var perfect = Math.abs(moving.x - top.x) <= 8;
        if (!perfect) {
          api.sfx("bad");
          api.shake(10);
          api.haptic([20, 50, 30]);
          api.finish(perfects);
          return;
        }
        var w = Math.min(startW + 40, moving.w + 6);
        var placed = { x: top.x + top.w / 2 - w / 2, w: w, y: moving.y };
        blocks.push(placed);
        floors++;
        perfects++;
        api.sfx("good");
        api.burst(placed.x + w / 2, placed.y, api.accent, 14);
        api.haptic(10);
        if (perfects >= 10) {
          api.finish(perfects);
          return;
        }
        moving = next(placed);
      }

      function update(dt) {
        moving.x += moving.dir * speed * dt;
        if (moving.x < 0) { moving.x = 0; moving.dir = 1; }
        if (moving.x + moving.w > W) { moving.x = W - moving.w; moving.dir = -1; }
        cam -= (Math.min(0, moving.y - H * 0.46) - cam) * Math.min(1, dt * 6);
        api.hud(perfects + " / 10", floors + " floors");
      }

      function draw() {
        api.bg();
        ctx.save();
        ctx.translate(0, -cam);
        for (var i = 0; i < blocks.length; i++) {
          var b = blocks[i];
          ctx.fillStyle = i === blocks.length - 1 ? api.accent : "rgba(148,163,184,0.36)";
          rr(ctx, b.x, b.y, b.w, blockH - 3, 5);
          ctx.fill();
        }
        ctx.fillStyle = "#f8fafc";
        rr(ctx, moving.x, moving.y, moving.w, blockH - 3, 5);
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = "rgba(255,255,255,0.1)";
        rr(ctx, W / 2 - 120, 48, 240, 10, 5);
        ctx.fill();
        ctx.fillStyle = api.accent;
        rr(ctx, W / 2 - 120, 48, 240 * (perfects / 10), 10, 5);
        ctx.fill();
        api.text("PERFECT ONLY", W / 2, 84, 18, "rgba(255,255,255,0.55)");
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
