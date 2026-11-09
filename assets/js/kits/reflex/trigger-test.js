/* Trigger Test — stop the marker inside the green band. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, clamp = K.clamp, rr = K.roundRect;
  var MODE = { name: "Trigger Test", level: 4, hudA: "Round", hudB: "Error", pattern: "bands" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var ROUNDS = 6, ZONE = 0.3, times = [], state = "wait", wait = 0.8, cueAt = 0, last = 0;

      function arm() { state = "wait"; wait = 0.7 + Math.random() * 1.4; }

      function record(ms) {
        last = Math.max(1, Math.round(ms));
        times.push(last);
        api.sfx("good"); api.haptic(6);
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
          last = 700;
          times.push(last);
          api.sfx("bad"); api.shake(6); api.haptic(16);
          if (times.length >= ROUNDS) {
            var s = 0;
            for (var i = 0; i < times.length; i++) s += times[i];
            api.finish(Math.round(s / times.length));
            return;
          }
          arm();
          return;
        }
        if (state !== "go") return;
        var phase = clamp((api.elapsed - cueAt) / 0.9, 0, 1);
        if (Math.abs(phase - 0.5) > ZONE / 2) { record(700); return; }
        record(Math.abs(phase - 0.5) * 900 + 30);
      }

      function update(dt) {
        if (state === "wait") {
          wait -= dt;
          if (wait <= 0) { state = "go"; cueAt = api.elapsed; api.sfx("pick"); }
        } else if (state === "go" && api.elapsed - cueAt > 0.9) {
          last = 700;
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
        ctx.fillStyle = "rgba(255,255,255,0.1)";
        rr(ctx, 70, 250, W - 140, 64, 32); ctx.fill();
        var zw = ZONE * (W - 140);
        ctx.fillStyle = "rgba(34,197,94,0.35)";
        rr(ctx, W / 2 - zw / 2, 250, zw, 64, 32); ctx.fill();
        var phase = state === "go" ? clamp((api.elapsed - cueAt) / 0.9, 0, 1) : 0;
        var mx = 70 + phase * (W - 140);
        ctx.fillStyle = api.accent;
        ctx.beginPath(); ctx.arc(mx, 282, 22, 0, Math.PI * 2); ctx.fill();
        api.text("TAP IN THE GREEN", W / 2, 210, 18, "rgba(255,255,255,0.5)");
        if (times.length) api.text(last + " ms", W / 2, H - 70, 26, "rgba(255,255,255,0.45)");
      }

      arm();

      return { update: update, draw: draw, down: strike, key: function (code) { if (code === "Space" || code === "Enter") strike(); } };
    },
  });
})();
