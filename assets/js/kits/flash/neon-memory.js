/* Neon Memory — the board turns a quarter each round. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, rr = K.roundRect;
  var MODE = { name: "Neon Memory", level: 7, hudA: "Rounds", hudB: "Turn", pattern: "dots" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var size = 4, cell = 112, gap = 10;
      var board = size * cell + (size - 1) * gap;
      var bx = (W - board) / 2, by = 110;
      var seq = [], phase = "show", shown = 0, lit = -1, litFor = 0, wait = 0.6, rounds = 0, inputAt = 0, rotation = 0;

      function pad(i) {
        return { x: bx + (i % size) * (cell + gap), y: by + Math.floor(i / size) * (cell + gap), w: cell, h: cell };
      }
      function map(i) {
        if (rotation === 0) return i;
        var x = i % size, y = Math.floor(i / size);
        var nx = size - 1 - y, ny = x;
        for (var r = 1; r < rotation; r++) { var t = size - 1 - ny; ny = nx; nx = t; }
        return ny * size + nx;
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
        if (phase !== "show") { api.hud(rounds, "Turn " + rotation); return; }
        if (wait > 0) { wait -= dt; api.hud(rounds, "Watch"); return; }
        if (shown < seq.length) {
          lit = map(seq[shown++]);
          litFor = 0.3;
          api.sfx("pick");
          api.hud(rounds, "Watch");
          return;
        }
        phase = "input";
        inputAt = 0;
        api.hud(rounds, "Turn " + rotation);
      }

      function draw() {
        api.bg();
        for (var i = 0; i < size * size; i++) {
          var r = pad(i), on = lit === i;
          ctx.fillStyle = on ? api.accent : "rgba(255,255,255,0.05)";
          rr(ctx, r.x, r.y, r.w, r.h, 12); ctx.fill();
          ctx.strokeStyle = on ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.06)";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        api.text(phase === "show" ? "WATCH" : "REPEAT", W / 2, 66, 20, "rgba(255,255,255,0.5)");
        api.text("ROTATION " + rotation * 90 + "°", W / 2, H - 42, 14, "rgba(255,255,255,0.3)");
      }

      function tap(x, y) {
        if (phase !== "input" || litFor > 0) return;
        for (var i = 0; i < size * size; i++) {
          var r = pad(i);
          if (x < r.x || x > r.x + r.w || y < r.y || y > r.y + r.h) continue;
          if (map(seq[inputAt]) !== i) { lose(); return; }
          lit = i; litFor = 0.12; inputAt++;
          api.sfx("pick");
          if (inputAt >= seq.length) {
            rounds++;
            rotation = (rotation + 1) % 4;
            push();
            reset();
          }
          return;
        }
      }

      return { update: update, draw: draw, tap: tap };
    },
  });
})();
