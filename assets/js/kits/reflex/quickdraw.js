/* Quickdraw — five clean draws, measured in milliseconds. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rr = K.roundRect;
  var MODE = { name: "Quickdraw", level: 1, hudA: "Round", hudB: "Last", pattern: "scan" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var ROUNDS = 5, times = [], state = "wait", wait = 1, cueAt = 0, last = 0;

      function arm() { state = "wait"; wait = 0.75 + Math.random() * 1.55; }

      function fire() { state = "go"; cueAt = api.elapsed; api.sfx("pick"); api.haptic(10); }

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
          last = 600;
          times.push(last);
          api.sfx("bad"); api.shake(8); api.haptic(20);
          if (times.length >= ROUNDS) {
            var sum = 0;
            for (var i = 0; i < times.length; i++) sum += times[i];
            api.finish(Math.round(sum / times.length));
            return;
          }
          arm();
          return;
        }
        if (state !== "go") return;
        record((api.elapsed - cueAt) * 1000);
      }

      function update(dt) {
        if (state === "wait") {
          wait -= dt;
          if (wait <= 0) fire();
        } else if (state === "go" && api.elapsed - cueAt > 2.2) {
          last = 999;
          times.push(last);
          api.sfx("bad");
          if (times.length >= ROUNDS) {
            var sum = 0;
            for (var i = 0; i < times.length; i++) sum += times[i];
            api.finish(Math.round(sum / times.length));
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
        api.text(state === "go" ? "NOW" : "WAIT", W / 2, H / 2 - 20, 62,
          state === "go" ? "#05130b" : "rgba(255,255,255,0.55)");
        if (times.length) api.text(last + " ms", W / 2, H - 70, 26, "rgba(255,255,255,0.5)");
        api.text("TAP OR PRESS SPACE", W / 2, H - 40, 14, "rgba(255,255,255,0.3)");
      }

      arm();

      return {
        update: update, draw: draw,
        down: strike,
        key: function (code) { if (code === "Space" || code === "Enter") strike(); },
      };
    },
  });
})();
