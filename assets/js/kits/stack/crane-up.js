/* Crane Up — the slab swings across the site on a cable. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rr = K.roundRect;

  var MODE = { name: "Crane Up", level: 8, hudA: "Floors", hudB: "Swing", pattern: "beams" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var blockH = 28;
      var startW = 250;
      var blocks = [{ x: (W - startW) / 2, w: startW, y: H - 150 }];
      var cam = 0;
      var floors = 0;
      var clock = 0;
      var swing = 0;
      var moving = next(blocks[0]);

      function next(prev) {
        return { x: W / 2 - prev.w / 2, w: prev.w, y: prev.y - blockH, dir: 0 };
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
        swing = Math.sin(clock * 1.5) * 220;
        moving.x = W / 2 - moving.w / 2 + swing;
        cam -= (Math.min(0, moving.y - H * 0.46) - cam) * Math.min(1, dt * 6);
        api.hud(floors, Math.round(swing) + " px");
      }

      function draw() {
        api.bg();
        ctx.save();
        ctx.translate(0, -cam);
        for (var i = 0; i < blocks.length; i++) {
          var b = blocks[i];
          ctx.fillStyle = i === blocks.length - 1 ? api.accent : "rgba(148,163,184,0.4)";
          rr(ctx, b.x, b.y, b.w, blockH - 3, 4);
          ctx.fill();
        }
        var cableX = W / 2;
        ctx.strokeStyle = "rgba(255,255,255,0.28)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cableX, -cam);
        ctx.lineTo(moving.x + moving.w / 2, moving.y);
        ctx.stroke();
        ctx.fillStyle = "#f8fafc";
        rr(ctx, moving.x, moving.y, moving.w, blockH - 3, 4);
        ctx.fill();
        ctx.restore();
        api.text("TAP WHEN CENTRED", W / 2, H - 40, 16, "rgba(255,255,255,0.35)");
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
