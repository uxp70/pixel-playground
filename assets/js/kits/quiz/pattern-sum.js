/* Pattern Sum — tap the tiles that add up to the target. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, rr = K.roundRect;
  var MODE = { name: "Pattern Sum", level: 9, hudA: "Sums", hudB: "Time", pattern: "beams" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var cols = 4, rows = 3, cw = 116, ch = 88, gx = 12, gy = 12;
      var boardW = cols * cw + (cols - 1) * gx;
      var bx = (W - boardW) / 2, by = 250;
      var tiles = [], target = 0, selected = [], score = 0, timeLeft = 30, done = false;

      function cell(i) {
        return { x: bx + (i % cols) * (cw + gx), y: by + Math.floor(i / cols) * (ch + gy), w: cw, h: ch };
      }

      function deal() {
        tiles = [];
        for (var i = 0; i < cols * rows; i++) tiles.push(1 + Math.floor(rand(0, 9)));
        var order = [];
        for (var j = 0; j < tiles.length; j++) order.push(j);
        order.sort(function () { return Math.random() - 0.5; });
        var count = 2 + Math.floor(rand(0, 3));
        var picks = order.slice(0, count);
        target = 0;
        for (var k = 0; k < picks.length; k++) target += tiles[picks[k]];
        selected = [];
      }

      function sum() {
        var total = 0;
        for (var i = 0; i < selected.length; i++) total += tiles[selected[i]];
        return total;
      }

      function end() {
        if (done) return;
        done = true;
        api.finish(score);
      }

      function update(dt) {
        if (done) return;
        timeLeft -= dt;
        if (timeLeft <= 0) { end(); return; }
        api.hud(score, Math.ceil(timeLeft) + "s");
      }

      function draw() {
        api.bg();
        api.text("TARGET " + target, W / 2, 96, 38, api.accent);
        api.text("TAP TILES UNTIL THEY ADD UP", W / 2, 142, 15, "rgba(255,255,255,0.45)");
        var running = sum();
        api.text(running + " / " + target, W / 2, 190, 24,
          running > target ? "#f87171" : "rgba(255,255,255,0.5)");
        for (var i = 0; i < tiles.length; i++) {
          var r = cell(i);
          var on = selected.indexOf(i) >= 0;
          ctx.fillStyle = on ? "rgba(251,191,36,0.62)" : "rgba(255,255,255,0.08)";
          rr(ctx, r.x, r.y, r.w, r.h, 14); ctx.fill();
          if (on) {
            ctx.strokeStyle = "rgba(255,255,255,0.7)";
            ctx.lineWidth = 3;
            ctx.stroke();
          }
          api.text(String(tiles[i]), r.x + r.w / 2, r.y + r.h / 2 + 2, 32, "#f8fafc");
        }
      }

      function tap(x, y) {
        if (done) return;
        for (var i = 0; i < tiles.length; i++) {
          var r = cell(i);
          if (x < r.x || x > r.x + r.w || y < r.y || y > r.y + r.h) continue;
          var at = selected.indexOf(i);
          if (at >= 0) selected.splice(at, 1);
          else selected.push(i);
          var total = sum();
          if (total > target) {
            timeLeft -= 2;
            selected = [];
            api.sfx("bad");
            api.shake(5);
            api.haptic(12);
          } else if (total === target && selected.length >= 2) {
            score++;
            timeLeft = Math.min(45, timeLeft + 1.5);
            api.sfx("good");
            api.burst(r.x + r.w / 2, r.y + r.h / 2, "#fbbf24", 10);
            api.haptic(5);
            deal();
          } else {
            api.sfx("pick");
          }
          return;
        }
      }

      deal();

      return { update: update, draw: draw, tap: tap };
    },
  });
})();
