/* Block Tower — choose left, centre or right and keep the tower balanced. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, clamp = K.clamp, rr = K.roundRect;
  var MODE = { name: "Block Tower", level: 7, hudA: "Floors", hudB: "Lean", pattern: "bricks" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var blockH = 28, baseY = H - 120;
      var blocks = [{ x: W / 2 - 130, w: 260, y: baseY }];
      var floors = 0, lean = 0, cam = 0, over = false;

      function place(lane) {
        if (over) return;
        var w = Math.max(88, 158 - floors * 4);
        var x = clamp(W / 2 + lane * 88 - w / 2, 10, W - w - 10);
        blocks.push({ x: x, w: w, y: baseY - blocks.length * blockH });
        floors++;

        var weight = 0, moment = 0;
        for (var i = 0; i < blocks.length; i++) {
          weight += blocks[i].w;
          moment += (blocks[i].x + blocks[i].w / 2) * blocks[i].w;
        }
        lean = moment / weight - W / 2;

        api.sfx("pick");
        api.haptic(4);
        if (Math.abs(lean) > 108) {
          over = true;
          api.sfx("bad");
          api.shake(13);
          api.haptic([25, 55, 35]);
          api.finish(floors);
          return;
        }
        api.burst(x + w / 2, baseY - (blocks.length - 1) * blockH, api.accent, 6);
        api.hud(floors, Math.round(lean) + " px");
      }

      function update(dt) {
        if (over) return;
        var top = blocks[blocks.length - 1].y;
        var want = Math.min(0, top - H * 0.44);
        cam += (want - cam) * Math.min(1, dt * 5);
        api.hud(floors, Math.round(lean) + " px");
      }

      function draw() {
        api.bg();
        ctx.save();
        ctx.translate(0, -cam);
        ctx.strokeStyle = "rgba(255,255,255,0.18)";
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 10]);
        ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H + 400); ctx.stroke();
        ctx.setLineDash([]);
        for (var i = 0; i < blocks.length; i++) {
          var b = blocks[i];
          ctx.fillStyle = i === blocks.length - 1
            ? api.accent
            : (i % 2 ? "rgba(251,146,60,0.55)" : "rgba(148,163,184,0.38)");
          rr(ctx, b.x, b.y, b.w, blockH - 3, 4); ctx.fill();
        }
        ctx.restore();
        var limit = 108;
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        rr(ctx, 40, 54, W - 80, 12, 6); ctx.fill();
        var center = W / 2;
        var marker = center + clamp(lean / limit, -1, 1) * (W / 2 - 60);
        ctx.fillStyle = Math.abs(lean) > 80 ? "#f87171" : api.accent;
        ctx.beginPath(); ctx.arc(marker, 60, 9, 0, Math.PI * 2); ctx.fill();
        api.text("KEEP THE WEIGHT CENTRED", W / 2, 92, 14, "rgba(255,255,255,0.38)");
      }

      function tap(x) {
        place(x < W / 3 ? -1 : x > (W * 2) / 3 ? 1 : 0);
      }

      return {
        update: update, draw: draw, tap: tap,
        key: function (code) {
          if (code === "ArrowLeft" || code === "KeyA") place(-1);
          if (code === "ArrowRight" || code === "KeyD") place(1);
          if (code === "Space" || code === "Enter") place(0);
        },
      };
    },
  });
})();
