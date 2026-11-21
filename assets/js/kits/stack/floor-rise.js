/* Floor Rise — stop each rising floor level with the tower. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, clamp = K.clamp, rr = K.roundRect;

  var MODE = {
    name: "Floor Rise", level: 6, hudA: "Floors", hudB: "Width",
    pattern: "grid", controls: "Tap to stop the rising floor",
  };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var BLOCK = 26, BASE = H - 140, TOL = 26, BAD = 88, START = 250;
      var blocks = [{ x: (W - START) / 2, w: START, y: BASE }];
      var floors = 0, lives = 3, cam = 0, over = false, lift = null, gap = 0;

      function top() { return blocks[blocks.length - 1]; }
      function targetY() { return top().y - BLOCK; }

      function end() {
        if (over) return;
        over = true;
        api.finish(floors);
      }

      function arm() {
        lift = { x: top().x, w: top().w, y: targetY() + 190, vy: -(168 + Math.min(130, floors * 7)) };
        gap = 0.2;
      }

      function place(w, err) {
        var t = top(), y = targetY();
        var x = clamp(t.x + t.w / 2 - w / 2, 8, W - w - 8);
        blocks.push({ x: x, w: w, y: y });
        floors++;
        if (err <= TOL) {
          api.sfx("good");
          api.burst(x + w / 2, y, api.accent, 12);
          api.haptic(9);
        } else {
          api.sfx("pick");
          api.shake(3);
          api.haptic(4);
        }
        if (w < 56) { end(); return; }
        arm();
      }

      function slip() {
        lives--;
        api.sfx("bad");
        api.shake(9);
        api.haptic([18, 45, 28]);
        if (lives <= 0) { end(); return; }
        arm();
      }

      function stopLift() {
        if (over || !lift || gap > 0) return;
        if (lift.y > targetY() + BAD) return;
        var err = Math.abs(lift.y - targetY());
        if (err > BAD) { slip(); return; }
        var w = err <= TOL ? Math.min(290, lift.w + 6) : Math.max(64, lift.w - err * 0.5);
        place(w, err);
      }

      function update(dt) {
        if (over) return;
        gap = Math.max(0, gap - dt);
        if (!lift) arm();
        lift.y += lift.vy * dt;
        if (lift.y < targetY() - 96) { slip(); if (over) return; }
        cam -= (Math.min(0, targetY() - H * 0.5) - cam) * Math.min(1, dt * 6);
        api.hud(floors, top().w + " px");
      }

      function draw() {
        api.bg();
        ctx.save();
        ctx.translate(0, -cam);
        var t = top(), ty = targetY();
        ctx.fillStyle = "rgba(52,211,153,0.1)";
        ctx.fillRect(t.x, ty - TOL, t.w, TOL * 2);
        ctx.strokeStyle = "rgba(52,211,153,0.65)";
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 8]);
        ctx.beginPath(); ctx.moveTo(t.x - 22, ty); ctx.lineTo(t.x + t.w + 22, ty); ctx.stroke();
        ctx.setLineDash([]);
        for (var i = 0; i < blocks.length; i++) {
          var b = blocks[i];
          ctx.fillStyle = i === blocks.length - 1 ? api.accent : "rgba(148,163,184,0.35)";
          rr(ctx, b.x, b.y, b.w, BLOCK - 3, 3);
          ctx.fill();
        }
        if (lift) {
          ctx.fillStyle = "#fbbf24";
          rr(ctx, lift.x, lift.y, lift.w, BLOCK - 3, 4);
          ctx.fill();
          ctx.strokeStyle = "rgba(255,255,255,0.7)";
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.strokeStyle = "rgba(255,255,255,0.5)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(lift.x + lift.w / 2, lift.y + BLOCK + 8);
          ctx.lineTo(lift.x + lift.w / 2 - 9, lift.y + BLOCK + 24);
          ctx.lineTo(lift.x + lift.w / 2 + 9, lift.y + BLOCK + 24);
          ctx.closePath();
          ctx.stroke();
        }
        ctx.restore();
        api.text("STOP THE FLOOR LEVEL", W / 2, 54, 17, "rgba(255,255,255,0.4)");
        api.text(lives + " cranes left", W / 2, H - 26, 14, "rgba(255,255,255,0.32)");
      }

      return {
        update: update,
        draw: draw,
        tap: stopLift,
        key: function (code) { if (code === "Space" || code === "Enter") stopLift(); },
      };
    },
  });
})();
