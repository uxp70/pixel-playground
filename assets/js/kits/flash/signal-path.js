/* Signal Path — each cue must be next to the last one. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, rr = K.roundRect;
  var MODE = { name: "Signal Path", level: 4, hudA: "Rounds", hudB: "Step", pattern: "grid" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var size = 4, cell = 112, gap = 10;
      var board = size * cell + (size - 1) * gap;
      var bx = (W - board) / 2, by = 110;
      var seq = [], phase = "show", shown = 0, lit = -1, litFor = 0, wait = 0.6, rounds = 0, inputAt = 0;

      function pad(i) {
        return { x: bx + (i % size) * (cell + gap), y: by + Math.floor(i / size) * (cell + gap), w: cell, h: cell };
      }
      function push() {
        if (!seq.length) { seq.push(Math.floor(rand(0, size * size))); return; }
        var last = seq[seq.length - 1];
        var x = last % size, y = Math.floor(last / size), options = [];
        if (x > 0) options.push(last - 1);
        if (x < size - 1) options.push(last + 1);
        if (y > 0) options.push(last - size);
        if (y < size - 1) options.push(last + size);
        seq.push(options[Math.floor(rand(0, options.length))]);
      }
      function reset() { phase = "show"; shown = 0; wait = 0.55; lit = -1; inputAt = 0; }
      function lose() { api.sfx("bad"); api.shake(9); api.finish(rounds); }

      push(); push(); push();

      function update(dt) {
        if (litFor > 0) {
          litFor -= dt;
          if (litFor <= 0) { lit = -1; wait = 0.28; }
          api.hud(rounds, "Watch");
          return;
        }
        if (phase !== "show") { api.hud(rounds, "Your turn"); return; }
        if (wait > 0) { wait -= dt; api.hud(rounds, "Watch"); return; }
        if (shown < seq.length) {
          lit = seq[shown++];
          litFor = 0.3;
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
          ctx.fillStyle = on ? api.accent : "rgba(255,255,255,0.05)";
          rr(ctx, r.x, r.y, r.w, r.h, 12); ctx.fill();
          if (on) {
            ctx.strokeStyle = "rgba(255,255,255,0.8)";
            ctx.lineWidth = 3;
            ctx.stroke();
          }
        }
        api.text(phase === "show" ? "TRACE THE PATH" : "FOLLOW IT", W / 2, 66, 18, "rgba(255,255,255,0.5)");
      }

      function tap(x, y) {
        if (phase !== "input" || litFor > 0) return;
        for (var i = 0; i < size * size; i++) {
          var r = pad(i);
          if (x < r.x || x > r.x + r.w || y < r.y || y > r.y + r.h) continue;
          if (seq[inputAt] !== i) { lose(); return; }
          lit = i; litFor = 0.12; inputAt++;
          api.sfx("pick");
          if (inputAt >= seq.length) { rounds++; push(); reset(); }
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
          inputAt++; lit = i; litFor = 0.12;
          if (inputAt >= seq.length) { rounds++; push(); reset(); }
        },
      };
    },
  });
})();
