/* Flash Tap — ten quick cues, one tap each. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rr = K.roundRect;
  var MODE = { name: "Flash Tap", level: 11, hudA: "Cue", hudB: "Last", pattern: "beams" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var ROUNDS = 10, times = [], state = "wait", wait = 0.4, cueAt = 0, last = 0, flash = 0;

      function arm() { state = "wait"; wait = 0.35 + Math.random() * 0.9; }

      function record(ms) {
        last = Math.max(1, Math.round(ms));
        times.push(last);
        flash = 0.18;
        api.sfx("good"); api.haptic(4);
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
          last = 900;
          times.push(last);
          api.sfx("bad"); api.shake(6); api.haptic(14);
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
        flash = Math.max(0, flash - dt);
        if (state === "wait") {
          wait -= dt;
          if (wait <= 0) { state = "go"; cueAt = api.elapsed; api.sfx("pick"); }
        } else if (api.elapsed - cueAt > 1.1) {
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
        ctx.fillStyle = state === "go" ? (flash > 0 ? "#f8fafc" : api.accent) : "rgba(255,255,255,0.08)";
        rr(ctx, 90, 180, W - 180, 220, 28); ctx.fill();
        api.text(state === "go" ? "TAP" : "NEXT", W / 2, 290, 54,
          state === "go" ? "#06121a" : "rgba(255,255,255,0.5)");
        if (times.length) api.text(last + " ms", W / 2, H - 70, 26, "rgba(255,255,255,0.45)");
        api.text("TEN CUES", W / 2, 120, 15, "rgba(255,255,255,0.35)");
      }

      arm();

      return { update: update, draw: draw, down: strike, key: function (code) { if (code === "Space" || code === "Enter") strike(); } };
    },
  });
})();
