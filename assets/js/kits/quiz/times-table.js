/* Times Table — find the factor pair that makes the target product. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, rr = K.roundRect;
  var MODE = { name: "Times Table", level: 7, hudA: "Pairs", hudB: "Time", pattern: "bricks" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var size = 4, cell = 94, gap = 10;
      var board = size * cell + (size - 1) * gap;
      var bx = (W - board) / 2, by = 188;
      var grid = [], target = 0, selected = [], score = 0, timeLeft = 35, done = false;

      function pad(i) {
        return { x: bx + (i % size) * (cell + gap), y: by + Math.floor(i / size) * (cell + gap), w: cell, h: cell };
      }

      function deal() {
        var a = 2 + Math.floor(rand(0, 11));
        var b = 2 + Math.floor(rand(0, 11));
        target = a * b;
        grid = [a, b];
        while (grid.length < size * size) grid.push(2 + Math.floor(rand(0, 11)));
        for (var i = grid.length - 1; i > 0; i--) {
          var j = Math.floor(Math.random() * (i + 1));
          var tmp = grid[i]; grid[i] = grid[j]; grid[j] = tmp;
        }
        selected = [];
      }

      function end() {
        if (done) return;
        done = true;
        api.finish(score);
      }

      function check() {
        var a = grid[selected[0]], b = grid[selected[1]];
        if (a * b === target) {
          score++;
          api.sfx("good");
          api.haptic(5);
          for (var i = 0; i < selected.length; i++) {
            var r = pad(selected[i]);
            api.burst(r.x + cell / 2, r.y + cell / 2, "#22c55e", 8);
          }
          deal();
        } else {
          timeLeft -= 2;
          selected = [];
          api.sfx("bad");
          api.shake(5);
          api.haptic(12);
        }
      }

      function update(dt) {
        if (done) return;
        timeLeft -= dt;
        if (timeLeft <= 0) { end(); return; }
        api.hud(score, Math.ceil(timeLeft) + "s");
      }

      function draw() {
        api.bg();
        ctx.fillStyle = "rgba(255,255,255,0.06)";
        rr(ctx, 40, 76, W - 80, 92, 20); ctx.fill();
        api.text(target + "", W / 2, 122, 52, api.accent);
        api.text("TAP TWO NUMBERS THAT MULTIPLY TO IT", W / 2, 178, 14, "rgba(255,255,255,0.45)");
        for (var i = 0; i < grid.length; i++) {
          var r = pad(i);
          var on = selected.indexOf(i) >= 0;
          ctx.fillStyle = on ? "rgba(34,197,94,0.6)" : "rgba(255,255,255,0.08)";
          rr(ctx, r.x, r.y, r.w, r.h, 14); ctx.fill();
          if (on) {
            ctx.strokeStyle = "rgba(255,255,255,0.75)";
            ctx.lineWidth = 3;
            ctx.stroke();
          }
          api.text(String(grid[i]), r.x + r.w / 2, r.y + r.h / 2 + 2, 34, "#f8fafc");
        }
      }

      function tap(x, y) {
        if (done) return;
        for (var i = 0; i < grid.length; i++) {
          var r = pad(i);
          if (x < r.x || x > r.x + r.w || y < r.y || y > r.y + r.h) continue;
          var at = selected.indexOf(i);
          if (at >= 0) { selected.splice(at, 1); return; }
          selected.push(i);
          api.sfx("pick");
          if (selected.length === 2) check();
          return;
        }
      }

      deal();

      return { update: update, draw: draw, tap: tap };
    },
  });
})();
