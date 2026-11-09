/* Pattern Loop — spot which cell moved after the board dims. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, rr = K.roundRect;
  var MODE = { name: "Pattern Loop", level: 8, hudA: "Spots", hudB: "Time", pattern: "waves" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var size = 4, cell = 112, gap = 10;
      var board = size * cell + (size - 1) * gap;
      var bx = (W - board) / 2, by = 110;
      var seq = [], phase = "show", timer = 1.8, target = -1, rounds = 0;

      function pad(i) {
        return { x: bx + (i % size) * (cell + gap), y: by + Math.floor(i / size) * (cell + gap), w: cell, h: cell };
      }
      function reset() {
        seq = [];
        while (seq.length < 5) {
          var pick = Math.floor(rand(0, size * size));
          if (seq.indexOf(pick) === -1) seq.push(pick);
        }
        phase = "show";
        timer = 1.8;
        target = -1;
      }
      function lose() { api.sfx("bad"); api.shake(10); api.finish(rounds); }

      reset();

      function update(dt) {
        if (phase === "show") {
          timer -= dt;
          if (timer <= 0) {
            phase = "input";
            target = Math.floor(rand(0, size * size));
            if (seq.indexOf(target) === -1) {
              var swap = seq[Math.floor(rand(0, seq.length))];
              seq[seq.indexOf(swap)] = target;
            }
            api.hud(rounds, "Spot it");
          } else {
            api.hud(rounds, "Memorise");
          }
          return;
        }
        timer -= dt;
        if (timer < -2.2) { lose(); return; }
        api.hud(rounds, Math.max(0, Math.ceil(timer + 2.2)) + "s");
      }

      function draw() {
        api.bg();
        for (var i = 0; i < size * size; i++) {
          var r = pad(i);
          var active = seq.indexOf(i) !== -1;
          ctx.fillStyle = active ? (phase === "input" && i === target ? api.accent : "rgba(255,255,255,0.45)") : "rgba(255,255,255,0.05)";
          rr(ctx, r.x, r.y, r.w, r.h, 12); ctx.fill();
        }
        api.text(phase === "show" ? "MEMORISE" : "TAP THE CHANGED CELL", W / 2, 66, 16, "rgba(255,255,255,0.5)");
      }

      function tap(x, y) {
        if (phase !== "input") return;
        for (var i = 0; i < size * size; i++) {
          var r = pad(i);
          if (x < r.x || x > r.x + r.w || y < r.y || y > r.y + r.h) continue;
          if (i === target) {
            rounds++;
            api.sfx("good");
            api.haptic(8);
            reset();
          } else {
            api.sfx("bad");
            api.shake(6);
            timer = -2.5;
          }
          return;
        }
      }

      return { update: update, draw: draw, tap: tap };
    },
  });
})();
