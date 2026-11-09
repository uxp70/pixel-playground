/* Rapid Grid — hit the one lit cell before it moves. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, rr = K.roundRect;
  var MODE = { name: "Rapid Grid", level: 2, hudA: "Cells", hudB: "Time", pattern: "grid" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var size = 4, cell = 118, gap = 12;
      var x0 = (W - (size * cell + (size - 1) * gap)) / 2;
      var y0 = (H - (size * cell + (size - 1) * gap)) / 2;
      var lit = 0, litFor = 0.7, score = 0, clock = 0, LIMIT = 20;

      function pad(i) {
        return { x: x0 + (i % size) * (cell + gap), y: y0 + Math.floor(i / size) * (cell + gap), w: cell, h: cell };
      }
      function next() {
        var pick = Math.floor(rand(0, size * size));
        if (pick === lit) pick = (pick + 1) % (size * size);
        lit = pick;
        litFor = 0.7;
      }

      function update(dt) {
        clock += dt;
        litFor -= dt;
        if (litFor <= 0) next();
        api.hud(score, Math.max(0, Math.ceil(LIMIT - clock)) + "s");
        if (clock >= LIMIT) api.finish(score);
      }

      function draw() {
        api.bg();
        for (var i = 0; i < size * size; i++) {
          var r = pad(i), on = i === lit;
          ctx.fillStyle = on ? api.accent : "rgba(255,255,255,0.06)";
          rr(ctx, r.x, r.y, r.w, r.h, 18); ctx.fill();
          if (on) {
            ctx.strokeStyle = "rgba(255,255,255,0.7)";
            ctx.lineWidth = 3;
            ctx.stroke();
          }
        }
      }

      function tap(x, y) {
        for (var i = 0; i < size * size; i++) {
          var r = pad(i);
          if (x < r.x || x > r.x + r.w || y < r.y || y > r.y + r.h) continue;
          if (i === lit) {
            score++;
            next();
            api.sfx("pick");
            api.burst(x, y, api.accent, 5);
          } else {
            score = Math.max(0, score - 1);
            api.sfx("bad");
            api.shake(4);
          }
          return;
        }
      }

      return { update: update, draw: draw, tap: tap };
    },
  });
})();
