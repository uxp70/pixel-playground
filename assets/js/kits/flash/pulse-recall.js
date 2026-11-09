/* Pulse Recall — fast flashes and short gaps. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, rr = K.roundRect;
  var MODE = { name: "Pulse Recall", level: 5, hudA: "Rounds", hudB: "Step", pattern: "beams" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var size = 3, cell = 120, gap = 12;
      var board = size * cell + (size - 1) * gap;
      var bx = (W - board) / 2, by = 130;
      var seq = [], phase = "show", shown = 0, lit = -1, litFor = 0, wait = 0.35, rounds = 0, inputAt = 0;

      function pad(i) {
        return { x: bx + (i % size) * (cell + gap), y: by + Math.floor(i / size) * (cell + gap), w: cell, h: cell };
      }
      function push() { seq.push(Math.floor(rand(0, size * size))); }
      function reset() { phase = "show"; shown = 0; wait = 0.2; lit = -1; inputAt = 0; }
      function lose() { api.sfx("bad"); api.shake(10); api.finish(rounds); }

      push(); push(); push();

      function update(dt) {
        if (litFor > 0) {
          litFor -= dt;
          if (litFor <= 0) { lit = -1; wait = 0.1; }
          api.hud(rounds, "Watch");
          return;
        }
        if (phase !== "show") { api.hud(rounds, "Your turn"); return; }
        if (wait > 0) { wait -= dt; api.hud(rounds, "Watch"); return; }
        if (shown < seq.length) {
          lit = seq[shown++];
          litFor = 0.17;
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
        for (var i = 0; i < size * size; i++) {
          var r = pad(i), on = lit === i;
          ctx.fillStyle = on ? "#f8fafc" : "rgba(255,255,255,0.07)";
          rr(ctx, r.x, r.y, r.w, r.h, 16); ctx.fill();
          if (on) {
            ctx.strokeStyle = api.accent;
            ctx.lineWidth = 5;
            ctx.stroke();
          }
        }
        api.text(phase === "show" ? "FLASH" : "RECALL", W / 2, 72, 22, "rgba(255,255,255,0.5)");
      }

      function tap(x, y) {
        if (phase !== "input" || litFor > 0) return;
        for (var i = 0; i < size * size; i++) {
          var r = pad(i);
          if (x < r.x || x > r.x + r.w || y < r.y || y > r.y + r.h) continue;
          if (seq[inputAt] !== i) { lose(); return; }
          lit = i; litFor = 0.1; inputAt++;
          api.sfx("pick");
          if (inputAt >= seq.length) { rounds++; push(); reset(); api.sfx("good"); }
          return;
        }
      }

      return {
        update: update, draw: draw, tap: tap,
        key: function (code) {
          var m = /^Digit([1-9])$/.exec(code);
          if (!m || phase !== "input") return;
          var i = Number(m[1]) - 1;
          if (seq[inputAt] !== i) { lose(); return; }
          inputAt++;
          if (inputAt >= seq.length) { rounds++; push(); reset(); }
        },
      };
    },
  });
})();
