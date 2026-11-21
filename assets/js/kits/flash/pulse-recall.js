/* Pulse Recall — tap the lit pad while the sweep is crossing it. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rr = K.roundRect;
  var MODE = { name: "Pulse Recall", level: 5, hudA: "Hits", hudB: "Misses", pattern: "beams" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var BX = 50, BW = 500, BY = 252, BH = 104, PADS = 8;
      var padW = BW / PADS, HALF = 0.5 / PADS;
      var sweep = 0.05, dir = 1, speed = 0.34;
      var target = 4, hits = 0, misses = 0, cooldown = 0.35, dud = 0, done = false;

      function center(i) { return (i + 0.5) / PADS; }

      function choose() {
        var ahead = [];
        for (var i = 0; i < PADS; i++) {
          var d = (center(i) - sweep) * dir;
          if (d > 0.16 && d < 0.62) ahead.push(i);
        }
        var pool = ahead.length ? ahead : [0, 1, 2, 3, 4, 5, 6, 7];
        target = pool[Math.floor(Math.random() * pool.length)];
      }

      function end() {
        if (done) return;
        done = true;
        api.finish(hits);
      }

      function miss() {
        misses++;
        api.sfx("bad");
        api.shake(6);
        api.haptic(16);
        cooldown = 0.4;
        if (misses >= 3) { end(); return; }
        choose();
      }

      function hit() {
        hits++;
        speed = Math.min(1.05, speed + 0.04);
        api.sfx("good");
        api.burst(BX + center(target) * BW, BY + BH / 2, api.accent, 9);
        api.haptic(4);
        cooldown = 0.12;
        choose();
      }

      function update(dt) {
        if (done) return;
        cooldown = Math.max(0, cooldown - dt);
        dud = Math.max(0, dud - dt);
        var prev = sweep;
        sweep += dir * speed * dt;
        if (sweep > 1) { sweep = 1; dir = -1; }
        if (sweep < 0) { sweep = 0; dir = 1; }
        if (cooldown <= 0) {
          var c = center(target);
          var was = Math.abs(prev - c) <= HALF;
          var now = Math.abs(sweep - c) <= HALF;
          if (was && !now) { miss(); if (done) return; }
        }
        api.hud(hits, misses + " / 3");
      }

      function draw() {
        api.bg();
        ctx.fillStyle = "rgba(255,255,255,0.06)";
        rr(ctx, BX - 8, BY - 8, BW + 16, BH + 16, 26); ctx.fill();
        for (var i = 0; i < PADS; i++) {
          var x = BX + i * padW;
          var on = i === target;
          ctx.fillStyle = on ? api.accent : "rgba(255,255,255,0.07)";
          rr(ctx, x + 4, BY + 8, padW - 8, BH - 16, 14); ctx.fill();
          if (on) {
            ctx.strokeStyle = dud > 0 ? "#f87171" : "rgba(255,255,255,0.7)";
            ctx.lineWidth = 3;
            ctx.stroke();
          }
        }
        var sx = BX + sweep * BW;
        ctx.fillStyle = "#f8fafc";
        ctx.fillRect(sx - 2, BY - 24, 4, BH + 48);
        ctx.beginPath();
        ctx.arc(sx, BY - 28, 8, 0, Math.PI * 2); ctx.fill();
        api.text("TAP THE LIT PAD AS THE SWEEP CROSSES", W / 2, 82, 17, "rgba(255,255,255,0.5)");
        api.text("MISSES " + misses + " / 3", W / 2, H - 44, 16, "rgba(255,255,255,0.38)");
      }

      function strike(i) {
        if (done || i < 0 || i >= PADS) return;
        if (i !== target) { api.sfx("pick"); return; }
        if (Math.abs(sweep - center(i)) <= HALF + 0.015) hit();
        else { dud = 0.16; api.sfx("pick"); }
      }

      function tap(x, y) {
        if (done || y < BY - 30 || y > BY + BH + 30) return;
        strike(Math.floor((x - BX) / padW));
      }

      choose();

      return {
        update: update, draw: draw, tap: tap,
        key: function (code) {
          var m = /^Digit([1-9])$/.exec(code);
          if (m) strike(Number(m[1]) - 1);
        },
      };
    },
  });
})();
