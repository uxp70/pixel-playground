/* Memory Tide — turn over pairs before the tide turns. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rr = K.roundRect;
  var MODE = { name: "Memory Tide", level: 11, hudA: "Rounds", hudB: "Lives", pattern: "waves" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var size = 4, cell = 108, gap = 10;
      var board = size * cell + (size - 1) * gap;
      var bx = (W - board) / 2, by = 112;
      var glyphs = ["●", "▲", "■", "◆", "✦", "✚", "◐", "▣"];
      var cards = [], first = -1, second = -1, lock = 0;
      var rounds = 0, lives = 3, timeLeft = 50, done = false;

      function pad(i) {
        return { x: bx + (i % size) * (cell + gap), y: by + Math.floor(i / size) * (cell + gap), w: cell, h: cell };
      }

      function deal() {
        cards = [];
        for (var k = 0; k < 8; k++) {
          cards.push({ kind: k, up: false, done: false });
          cards.push({ kind: k, up: false, done: false });
        }
        for (var i = cards.length - 1; i > 0; i--) {
          var j = Math.floor(Math.random() * (i + 1));
          var tmp = cards[i]; cards[i] = cards[j]; cards[j] = tmp;
        }
        first = -1;
        second = -1;
        lock = 0;
      }

      function remaining() {
        var n = 0;
        for (var i = 0; i < cards.length; i++) if (!cards[i].done) n++;
        return n;
      }

      function end() {
        if (done) return;
        done = true;
        api.finish(rounds);
      }

      function update(dt) {
        if (done) return;
        if (lock > 0) {
          lock -= dt;
          if (lock <= 0) {
            if (first >= 0 && second >= 0 && cards[first].kind !== cards[second].kind) {
              cards[first].up = false;
              cards[second].up = false;
            }
            first = -1;
            second = -1;
          }
        }
        timeLeft -= dt;
        if (timeLeft <= 0) { end(); return; }
        api.hud(rounds, lives + " lives");
      }

      function draw() {
        api.bg();
        for (var i = 0; i < cards.length; i++) {
          var r = pad(i), c = cards[i];
          if (c.up || c.done) {
            ctx.fillStyle = c.done ? "rgba(255,255,255,0.09)" : api.accent;
            rr(ctx, r.x, r.y, r.w, r.h, 14); ctx.fill();
            api.text(glyphs[c.kind], r.x + r.w / 2, r.y + r.h / 2 + 2, 46,
              c.done ? "rgba(255,255,255,0.28)" : "#06121a");
          } else {
            ctx.fillStyle = "rgba(255,255,255,0.07)";
            rr(ctx, r.x, r.y, r.w, r.h, 14); ctx.fill();
            ctx.strokeStyle = "rgba(255,255,255,0.12)";
            ctx.lineWidth = 2;
            ctx.stroke();
            api.text("?", r.x + r.w / 2, r.y + r.h / 2 + 2, 34, "rgba(255,255,255,0.35)");
          }
        }
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        rr(ctx, bx, 88, board, 8, 4); ctx.fill();
        ctx.fillStyle = timeLeft < 12 ? "#f87171" : api.accent;
        rr(ctx, bx, 88, board * Math.max(0, timeLeft / 50), 8, 4); ctx.fill();
        api.text("MATCH THE PAIRS", W / 2, 62, 18, "rgba(255,255,255,0.5)");
        api.text("TIDE " + Math.ceil(timeLeft) + "s", W / 2, H - 42, 16, "rgba(255,255,255,0.38)");
      }

      function flip(i) {
        if (lock > 0 || cards[i].up || cards[i].done) return;
        cards[i].up = true;
        api.sfx("pick");
        api.haptic(3);
        if (first < 0) { first = i; return; }
        second = i;
        if (cards[first].kind === cards[second].kind) {
          cards[first].done = true;
          cards[second].done = true;
          first = -1;
          second = -1;
          api.sfx("good");
          api.burst(pad(i).x + cell / 2, pad(i).y + cell / 2, api.accent, 8);
          if (remaining() === 0) {
            rounds++;
            timeLeft = Math.min(80, timeLeft + 10);
            api.sfx("win");
            deal();
          }
        } else {
          lives--;
          api.sfx("bad");
          api.shake(4);
          lock = 0.75;
          if (lives <= 0) end();
        }
      }

      function tap(x, y) {
        for (var i = 0; i < cards.length; i++) {
          var r = pad(i);
          if (x < r.x || x > r.x + r.w || y < r.y || y > r.y + r.h) continue;
          flip(i);
          return;
        }
      }

      deal();

      return { update: update, draw: draw, tap: tap };
    },
  });
})();
