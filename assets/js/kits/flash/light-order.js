/* Light Order — switch the grid dark again. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rr = K.roundRect;
  var MODE = { name: "Light Order", level: 3, hudA: "Rounds", hudB: "Moves", pattern: "bands" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var size = 3, cell = 132, gap = 14;
      var board = size * cell + (size - 1) * gap;
      var bx = (W - board) / 2, by = 140;
      var grid = [], rounds = 0, moves = 0, timeLeft = 40, flash = 0;

      function pad(i) {
        return { x: bx + (i % size) * (cell + gap), y: by + Math.floor(i / size) * (cell + gap), w: cell, h: cell };
      }

      function toggle(i) {
        var row = Math.floor(i / size), col = i % size;
        function flip(r, c) {
          if (r < 0 || r >= size || c < 0 || c >= size) return;
          var k = r * size + c;
          grid[k] = !grid[k];
        }
        flip(row, col);
        flip(row - 1, col);
        flip(row + 1, col);
        flip(row, col - 1);
        flip(row, col + 1);
      }

      function litCount() {
        var n = 0;
        for (var i = 0; i < grid.length; i++) if (grid[i]) n++;
        return n;
      }

      function deal() {
        var guard = 0;
        do {
          grid = [];
          for (var i = 0; i < size * size; i++) grid.push(false);
          var flips = 3 + rounds;
          for (var j = 0; j < flips; j++) toggle(Math.floor(Math.random() * size * size));
        } while (litCount() === 0 && guard++ < 30);
        moves = 0;
      }

      function solved() {
        for (var i = 0; i < grid.length; i++) if (grid[i]) return false;
        return true;
      }

      function update(dt) {
        timeLeft -= dt;
        flash = Math.max(0, flash - dt);
        if (timeLeft <= 0) { api.finish(rounds); return; }
        api.hud(rounds, moves + " moves");
      }

      function draw() {
        api.bg();
        for (var i = 0; i < size * size; i++) {
          var r = pad(i), on = grid[i];
          ctx.fillStyle = on ? (flash > 0 ? "#fde68a" : "#fbbf24") : "rgba(255,255,255,0.06)";
          rr(ctx, r.x, r.y, r.w, r.h, 18); ctx.fill();
          if (on) {
            ctx.strokeStyle = "rgba(255,255,255,0.65)";
            ctx.lineWidth = 3;
            ctx.stroke();
          } else {
            ctx.strokeStyle = "rgba(255,255,255,0.1)";
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        }
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        rr(ctx, bx, 92, board, 8, 4); ctx.fill();
        ctx.fillStyle = timeLeft < 10 ? "#f87171" : api.accent;
        rr(ctx, bx, 92, board * Math.max(0, timeLeft / 40), 8, 4); ctx.fill();
        api.text("TAP A LIGHT TO FLIP ITS CROSS", W / 2, 62, 18, "rgba(255,255,255,0.5)");
        api.text("CLEAR THE GRID", W / 2, H - 42, 16, "rgba(255,255,255,0.38)");
      }

      function press(i) {
        toggle(i);
        moves++;
        flash = 0.12;
        if (solved()) {
          rounds++;
          timeLeft = Math.min(70, timeLeft + 6);
          api.sfx("win");
          api.burst(W / 2, H / 2, "#fbbf24", 14);
          deal();
        } else {
          api.sfx("pick");
          api.haptic(3);
        }
      }

      function tap(x, y) {
        for (var i = 0; i < size * size; i++) {
          var r = pad(i);
          if (x < r.x || x > r.x + r.w || y < r.y || y > r.y + r.h) continue;
          press(i);
          return;
        }
      }

      deal();

      return {
        update: update, draw: draw, tap: tap,
        key: function (code) {
          var m = /^Digit([1-9])$/.exec(code);
          if (m) press(Number(m[1]) - 1);
        },
      };
    },
  });
})();
