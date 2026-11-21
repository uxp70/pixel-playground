/* Ready Set — three lights cycle; only green is safe. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rr = K.roundRect;
  var MODE = { name: "Ready Set", level: 9, hudA: "Round", hudB: "Last", pattern: "rain" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var ROUNDS = 6, DUR = [0.6, 0.35, 0.62];
      var idx = 0, elapsed = 0, greenAt = 0, state = "cycle", wait = 0;
      var times = [], last = 0, done = false;

      function record(ms) {
        if (done) return;
        last = Math.max(1, Math.round(ms));
        times.push(last);
        api.sfx(ms > 500 ? "bad" : "good");
        if (ms > 500) { api.shake(7); api.haptic(18); }
        else api.haptic(5);
        if (times.length >= ROUNDS) {
          var sum = 0;
          for (var i = 0; i < times.length; i++) sum += times[i];
          done = true;
          api.finish(Math.round(sum / times.length));
          return;
        }
        state = "pause";
        wait = 0.45;
        idx = 0;
        elapsed = 0;
      }

      function strike() {
        if (done || state !== "cycle") return;
        if (idx === 2) record((api.elapsed - greenAt) * 1000);
        else record(800);
      }

      function update(dt) {
        if (done) return;
        if (state === "pause") {
          wait -= dt;
          if (wait <= 0) state = "cycle";
        } else {
          elapsed += dt;
          if (elapsed >= DUR[idx]) {
            if (idx === 2) { record(999); return; }
            idx++;
            elapsed = 0;
            if (idx === 2) { greenAt = api.elapsed; api.sfx("pick"); }
          }
        }
        if (done) return;
        api.hud(Math.min(times.length + 1, ROUNDS) + " / " + ROUNDS, times.length ? last + " ms" : "ready");
      }

      function draw() {
        api.bg();
        var names = ["STOP", "SET", "GO"];
        var colors = ["#ef4444", "#f59e0b", "#22c55e"];
        for (var i = 0; i < 3; i++) {
          var on = state === "cycle" && idx === i;
          var y = 130 + i * 116;
          ctx.fillStyle = "rgba(255,255,255,0.05)";
          rr(ctx, W / 2 - 58, y, 116, 92, 46); ctx.fill();
          ctx.fillStyle = on ? colors[i] : "rgba(255,255,255,0.08)";
          rr(ctx, W / 2 - 48, y + 8, 96, 76, 38); ctx.fill();
          api.text(names[i], W / 2, y + 48, 20,
            on ? "#05130b" : "rgba(255,255,255,0.32)");
        }
        api.text("TAP ONLY ON GREEN", W / 2, 70, 18, "rgba(255,255,255,0.5)");
        if (times.length) api.text(last + " ms", W / 2, H - 42, 20, "rgba(255,255,255,0.4)");
      }

      return { update: update, draw: draw, down: strike, key: function (code) { if (code === "Space" || code === "Enter") strike(); } };
    },
  });
})();
