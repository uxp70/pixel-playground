/* High Rise — hold to lift the block, release to drop it through the wind. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, clamp = K.clamp, rr = K.roundRect;

  var MODE = {
    name: "High Rise", level: 10, hudA: "Floors", hudB: "Wind", pattern: "scan",
    controls: "Hold to lift, drag to aim, release to drop",
  };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var BLOCK = 26, BASE = H - 140, LIFT = 250, START = 200;
      var blocks = [{ x: (W - START) / 2, w: START, y: BASE }];
      var floors = 0, lives = 3, cam = 0, over = false;
      var wind = 0, windIn = 3, aimX = null, holding = false;
      var cur = spawnOnTop(blocks[0]);

      function spawnOnTop(t) {
        return { x: t.x, w: t.w, y: t.y - BLOCK, vy: 0, state: "rest" };
      }
      function top() { return blocks[blocks.length - 1]; }
      function restY() { return top().y - BLOCK; }

      function end() {
        if (over) return;
        over = true;
        api.finish(floors);
      }

      function land() {
        var t = top();
        var left = Math.max(cur.x, t.x);
        var right = Math.min(cur.x + cur.w, t.x + t.w);
        var overlap = right - left;
        cur.state = "rest";
        cur.vy = 0;
        if (overlap <= 6) {
          lives--;
          api.sfx("bad");
          api.shake(9);
          api.haptic([20, 45, 28]);
          if (lives <= 0) { end(); return; }
          cur = spawnOnTop(t);
          aimX = null;
          return;
        }
        var perfect = Math.abs(cur.x - t.x) <= 10;
        var w = perfect ? Math.min(270, t.w + 8) : overlap;
        var placed = { x: perfect ? t.x + t.w / 2 - w / 2 : left, w: w, y: restY() };
        blocks.push(placed);
        floors++;
        if (perfect) {
          api.sfx("good");
          api.burst(placed.x + w / 2, placed.y, api.accent, 12);
          api.haptic(9);
        } else {
          api.sfx("pick");
          api.shake(2);
          api.haptic(4);
        }
        cur = spawnOnTop(placed);
        aimX = null;
        if (w < 50) end();
      }

      function update(dt) {
        if (over) return;

        windIn -= dt;
        if (windIn <= 0) {
          windIn = 3.5 + rand(0, 2.5);
          var mag = 40 + Math.min(110, floors * 8);
          wind = (Math.random() < 0.5 ? -1 : 1) * Math.round(mag * rand(0.7, 1));
        }

        var held = holding || api.keys.Space || api.keys.Enter || api.keys.ArrowUp || api.keys.KeyW;
        if (cur.state === "rest" && held) {
          cur.state = "lift";
          cur.vy = 0;
          api.sfx("pick");
        }

        if (cur.state === "lift") {
          cur.y -= 250 * dt;
          if (cur.y < restY() - LIFT) cur.y = restY() - LIFT;
          if (api.keys.ArrowLeft || api.keys.KeyA) { cur.x -= 300 * dt; aimX = null; }
          if (api.keys.ArrowRight || api.keys.KeyD) { cur.x += 300 * dt; aimX = null; }
          if (aimX !== null) cur.x += clamp(aimX - cur.x, -320 * dt, 320 * dt);
          cur.x = clamp(cur.x, 8, W - cur.w - 8);
          if (!held) { cur.state = "fall"; cur.vy = 0; }
        } else if (cur.state === "fall") {
          cur.vy += 1250 * dt;
          cur.y += cur.vy * dt;
          cur.x += wind * dt;
          if (cur.y >= restY()) {
            cur.y = restY();
            land();
            if (over) return;
          }
        }

        cam -= (Math.min(0, restY() - H * 0.52) - cam) * Math.min(1, dt * 5);
        api.hud(floors, (wind < 0 ? "← " : "→ ") + Math.abs(wind));
      }

      function draw() {
        api.bg();
        ctx.save();
        ctx.translate(0, -cam);
        var t = top(), base = restY();

        ctx.strokeStyle = "rgba(255,255,255,0.16)";
        ctx.lineWidth = 2;
        ctx.setLineDash([7, 9]);
        ctx.beginPath(); ctx.moveTo(t.x + t.w / 2, base - LIFT); ctx.lineTo(t.x + t.w / 2, base); ctx.stroke();
        ctx.setLineDash([]);

        for (var i = 0; i < blocks.length; i++) {
          var b = blocks[i];
          ctx.fillStyle = i === blocks.length - 1
            ? api.accent
            : (i % 2 ? "rgba(148,163,184,0.5)" : "rgba(148,163,184,0.3)");
          rr(ctx, b.x, b.y, b.w, BLOCK - 3, 4);
          ctx.fill();
        }

        ctx.fillStyle = cur.state === "fall" ? "#fbbf24" : "#f8fafc";
        rr(ctx, cur.x, cur.y, cur.w, BLOCK - 3, 4);
        ctx.fill();

        if (cur.state !== "rest") {
          ctx.strokeStyle = "rgba(250,204,21,0.55)";
          ctx.lineWidth = 2;
          var arrow = wind === 0 ? 0 : (wind > 0 ? 1 : -1);
          for (var k = 0; k < 3; k++) {
            var ax = cur.x + cur.w / 2 + arrow * (18 + k * 16);
            ctx.beginPath();
            ctx.moveTo(ax - arrow * 8, cur.y + 4);
            ctx.lineTo(ax, cur.y + BLOCK / 3);
            ctx.lineTo(ax - arrow * 8, cur.y + BLOCK * 0.66);
            ctx.stroke();
          }
        }
        ctx.restore();
        api.text("HOLD TO LIFT · RELEASE INTO THE WIND", W / 2, 54, 15, "rgba(255,255,255,0.4)");
        api.text("WIND " + (wind < 0 ? "← " : "→ ") + Math.abs(wind), W / 2, H - 26, 14, "rgba(255,255,255,0.34)");
      }

      return {
        update: update,
        draw: draw,
        down: function () { holding = true; },
        move: function (x) { aimX = clamp(x - cur.w / 2, 8, W - cur.w - 8); },
        release: function () { holding = false; },
        key: function (code) {
          if (code === "ArrowLeft" || code === "KeyA") aimX = null;
          if (code === "ArrowRight" || code === "KeyD") aimX = null;
        },
      };
    },
  });
})();
