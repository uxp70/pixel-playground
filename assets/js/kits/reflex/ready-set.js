/* Ready Set — a false start costs a full second. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rr = K.roundRect;
  var MODE = { name: "Ready Set", level: 9, hudA: "Round", hudB: "Last", pattern: "rain" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var ROUNDS = 5, PENALTY = 1000, times = [], state = "wait", wait = 1, cueAt = 0, last = 0;

      function arm() { state = "wait"; wait = 0.9 + Math.random() * 2.1; }

      function record(ms) {
        last = Math.max(1, Math.round(ms));
        times.push(last);
        api.sfx("good");
        if (times.length >= ROUNDS) {
          var sum = 0;
          for (var i = 0; i < times.length; i++) sum += times[i];
          api.finish(Math.round(sum / times.length));
          return;
        }
        arm();
      }

      function strike() {
        if (state === "wait") {
          last = PENALTY;
          times.push(last);
          api.sfx("bad"); api.shake(10); api.haptic([20, 40, 20]);
          if (times.length >= ROUNDS) {
            var s = 0;
            for (var i = 0; i < times.length; i++) s += times[i];
            api.finish(Math.round(s / times.length));
            return;
          }
          arm();
          return;
        }
        record((api.elapsed - cueAt) * 1000);
      }

      function update(dt) {
        if (state === "wait") {
          wait -= dt;
          if (wait <= 0) { state = "go"; cueAt = api.elapsed; api.sfx("pick"); api.haptic(10); }
        } else if (state === "go" && api.elapsed - cueAt > 2) {
          last = 999;
          times.push(last);
          api.sfx("bad");
          if (times.length >= ROUNDS) {
            var s = 0;
            for (var i = 0; i < times.length; i++) s += times[i];
            api.finish(Math.round(s / times.length));
            return;
          }
          arm();
        }
        api.hud(Math.min(times.length + 1, ROUNDS) + " / " + ROUNDS, times.length ? last + " ms" : "ready");
      }

      function draw() {
        api.bg();
        ctx.fillStyle = state === "go" ? api.accent : "rgba(255,255,255,0.08)";
        rr(ctx, 60, 150, W - 120, H - 300, 26); ctx.fill();
        api.text(state === "go" ? "GO" : "NOT YET", W / 2, H / 2 - 20, 56,
          state === "go" ? "#05130b" : "rgba(255,255,255,0.55)");
        api.text("FALSE START = 1000 ms", W / 2, H - 60, 15, "rgba(255,255,255,0.35)");
        if (times.length) api.text(last + " ms", W / 2, H - 30, 20, "rgba(255,255,255,0.4)");
      }

      arm();

      return { update: update, draw: draw, down: strike, key: function (code) { if (code === "Space" || code === "Enter") strike(); } };
    },
  });
})();
