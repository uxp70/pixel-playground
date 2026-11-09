/* Grid Echo — watch the left board, repeat on the right. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, rr = K.roundRect;
  var MODE = { name: "Grid Echo", level: 10, hudA: "Rounds", hudB: "Step", pattern: "bricks" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var size = 3, cell = 72, gap = 8;
      var board = size * cell + (size - 1) * gap;
      var leftX = 30, rightX = W - 30 - board, by = 160;
      var seq = [], phase = "show", shown = 0, lit = -1, litFor = 0, wait = 0.6, rounds = 0, inputAt = 0;

      function pad(i, x0) {
        return { x: x0 + (i % size) * (cell + gap), y: by + Math.floor(i / size) * (cell + gap), w: cell, h: cell };
      }
      function push() { seq.push(Math.floor(rand(0, size * size))); }
      function reset() { phase = "show"; shown = 0; wait = 0.55; lit = -1; inputAt = 0; }
      function lose() { api.sfx("bad"); api.shake(9); api.finish(rounds); }

      push(); push(); push();

      function update(dt) {
        if (litFor > 0) {
          litFor -= dt;
          if (litFor <= 0) { lit = -1; wait = 0.3; }
          api.hud(rounds, "Watch");
          return;
        }
        if (phase !== "show") { api.hud(rounds, "Your turn"); return; }
        if (wait > 0) { wait -= dt; api.hud(rounds, "Watch"); return; }
        if (shown < seq.length) {
          lit = seq[shown++];
          litFor = 0.34;
          api.sfx("pick");
          api.hud(rounds, "Watch");
          return;
        }
        phase = "input";
        inputAt = 0;
        api.hud(rounds, "Your turn");
      }

      function draw() {
        api.bg();
        ctx.fillStyle = "rgba(255,255,255,0.04)";
        rr(ctx, leftX - 10, by - 10, board + 20, board + 20, 18); ctx.fill();
        rr(ctx, rightX - 10, by - 10, board + 20, board + 20, 18); ctx.fill();
        for (var i = 0; i < size * size; i++) {
          var l = pad(i, leftX), r = pad(i, rightX);
          ctx.fillStyle = lit === i ? api.accent : "rgba(255,255,255,0.07)";
          rr(ctx, l.x, l.y, l.w, l.h, 10); ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,0.06)";
          rr(ctx, r.x, r.y, r.w, r.h, 10); ctx.fill();
        }
        api.text("WATCH LEFT", leftX + board / 2, 130, 15, "rgba(255,255,255,0.5)");
        api.text("TAP RIGHT", rightX + board / 2, 130, 15, "rgba(255,255,255,0.5)");
      }

      function tap(x, y) {
        if (phase !== "input" || litFor > 0) return;
        for (var i = 0; i < size * size; i++) {
          var r = pad(i, rightX);
          if (x < r.x || x > r.x + r.w || y < r.y || y > r.y + r.h) continue;
          if (seq[inputAt] !== i) { lose(); return; }
          inputAt++;
          api.sfx("pick");
          api.haptic(5);
          if (inputAt >= seq.length) { rounds++; push(); reset(); api.sfx("good"); }
          return;
        }
      }

      return { update: update, draw: draw, tap: tap };
    },
  });
})();
