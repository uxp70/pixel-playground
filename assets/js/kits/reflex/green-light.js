/* Green Light — only the green window is safe. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rr = K.roundRect;
  var MODE = { name: "Green Light", level: 2, hudA: "Round", hudB: "Last", pattern: "grid" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var ROUNDS = 6, times = [], last = 0, greenAt = 0, armedAt = 0;

      function arm() { armedAt = api.elapsed; greenAt = api.elapsed + 1.1 + Math.random() * 1.3; }

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

      function miss(ms) {
        last = ms;
        times.push(ms);
        api.sfx("bad"); api.shake(8); api.haptic(18);
        if (times.length >= ROUNDS) {
          var sum = 0;
          for (var i = 0; i < times.length; i++) sum += times[i];
          api.finish(Math.round(sum / times.length));
          return;
        }
        arm();
      }

      function strike() {
        var since = (api.elapsed - armedAt) * 1000;
        if (api.elapsed < greenAt) { miss(650); return; }
        record(since);
      }

      function update(dt) {
        if (times.length < ROUNDS && api.elapsed - greenAt > 0.8) miss(800);
        var state = api.elapsed < greenAt ? "wait" : "go";
        api.hud(Math.min(times.length + 1, ROUNDS) + " / " + ROUNDS, times.length ? last + " ms" : "ready");
        api.mode.state = state;
      }

      function draw() {
        api.bg();
        var go = api.elapsed >= greenAt;
        ctx.fillStyle = go ? "#22c55e" : "#ef4444";
        rr(ctx, 60, 150, W - 120, H - 300, 26); ctx.fill();
        api.text(go ? "GO" : "STOP", W / 2, H / 2 - 20, 62, go ? "#05130b" : "rgba(255,255,255,0.8)");
        if (times.length) api.text(last + " ms", W / 2, H - 70, 26, "rgba(255,255,255,0.5)");
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
