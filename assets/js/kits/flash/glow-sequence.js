/* Glow Sequence — catch each glow before it fades. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, rr = K.roundRect;
  var MODE = { name: "Glow Sequence", level: 2, hudA: "Hits", hudB: "Lives", pattern: "stars" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var size = 4, cell = 104, gap = 10;
      var board = size * cell + (size - 1) * gap;
      var bx = (W - board) / 2, by = 122;
      var lit = -1, life = 0, maxLife = 1, wait = 0.35;
      var hits = 0, lives = 3, flash = -1, flashFor = 0;

      function pad(i) {
        return { x: bx + (i % size) * (cell + gap), y: by + Math.floor(i / size) * (cell + gap), w: cell, h: cell };
      }

      function choose() {
        var next = lit, guard = 0;
        while (next === lit && guard++ < 30) next = Math.floor(rand(0, size * size));
        lit = next;
        maxLife = Math.max(0.55, 1.3 - hits * 0.025);
        life = maxLife;
        wait = 0;
        api.sfx("pick");
      }

      function miss() {
        lives--;
        lit = -1;
        flash = -1;
        api.sfx("bad");
        api.shake(7);
        api.haptic(18);
        if (lives <= 0) { api.finish(hits); return; }
        wait = 0.55;
      }

      function update(dt) {
        if (flashFor > 0) flashFor -= dt;
        if (lit < 0) {
          wait -= dt;
          if (wait <= 0) choose();
        } else {
          life -= dt;
          if (life <= 0) miss();
        }
        if (lives <= 0) return;
        api.hud(hits, lives + " lives");
      }

      function draw() {
        api.bg();
        for (var i = 0; i < size * size; i++) {
          var r = pad(i);
          var on = lit === i;
          var pop = flash === i && flashFor > 0;
          ctx.globalAlpha = on ? 0.72 + 0.28 * Math.sin(api.elapsed * 14) : 1;
          ctx.fillStyle = on ? api.accent : pop ? "#22c55e" : "rgba(255,255,255,0.06)";
          rr(ctx, r.x, r.y, r.w, r.h, 14); ctx.fill();
          ctx.globalAlpha = 1;
          if (on) {
            ctx.strokeStyle = "rgba(255,255,255,0.7)";
            ctx.lineWidth = 3;
            ctx.stroke();
          }
        }
        if (lit >= 0) {
          var ratio = Math.max(0, life / maxLife);
          ctx.fillStyle = "rgba(255,255,255,0.08)";
          rr(ctx, bx, 86, board, 10, 5); ctx.fill();
          ctx.fillStyle = ratio < 0.35 ? "#f87171" : api.accent;
          rr(ctx, bx, 86, board * ratio, 10, 5); ctx.fill();
        }
        api.text("TAP THE LIT PAD", W / 2, 62, 20, "rgba(255,255,255,0.5)");
        api.text("STREAK " + hits, W / 2, H - 40, 15, "rgba(255,255,255,0.35)");
      }

      function tap(x, y) {
        if (lit < 0) return;
        for (var i = 0; i < size * size; i++) {
          var r = pad(i);
          if (x < r.x || x > r.x + r.w || y < r.y || y > r.y + r.h) continue;
          if (i !== lit) { miss(); return; }
          hits++;
          flash = i;
          flashFor = 0.16;
          lit = -1;
          wait = 0.12;
          api.sfx("good");
          api.burst(r.x + r.w / 2, r.y + r.h / 2, api.accent, 8);
          api.haptic(4);
          return;
        }
      }

      return { update: update, draw: draw, tap: tap };
    },
  });
})();
