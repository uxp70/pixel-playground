/* Jump Cue — a tight green window and eight rounds. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, clamp = K.clamp, rr = K.roundRect;
  var MODE = { name: "Jump Cue", level: 8, hudA: "Round", hudB: "Error", pattern: "waves" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var ROUNDS = 8, ZONE = 0.16, times = [], state = "wait", wait = 0.5, cueAt = 0, last = 0;

      function arm() { state = "wait"; wait = 0.5 + Math.random() * 1.1; }

      function record(ms) {
        last = Math.max(1, Math.round(ms));
        times.push(last);
        api.sfx("good"); api.haptic(5);
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
        var phase = clamp((api.elapsed - cueAt) / 0.75, 0, 1);
        if (Math.abs(phase - 0.5) > ZONE / 2) { record(700); return; }
        record(Math.abs(phase - 0.5) * 800 + 25);
      }

      function update(dt) {
        if (state === "wait") {
          wait -= dt;
          if (wait <= 0) { state = "go"; cueAt = api.elapsed; api.sfx("pick"); }
        } else if (state === "go" && api.elapsed - cueAt > 0.75) {
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
        rr(ctx, 70, 250, W - 140, 54, 27); ctx.fill();
        var zw = ZONE * (W - 140);
        ctx.fillStyle = "rgba(34,197,94,0.4)";
        rr(ctx, W / 2 - zw / 2, 250, zw, 54, 27); ctx.fill();
        var phase = state === "go" ? clamp((api.elapsed - cueAt) / 0.75, 0, 1) : 0;
        var mx = 70 + phase * (W - 140);
        ctx.fillStyle = api.accent;
        ctx.beginPath(); ctx.arc(mx, 277, 18, 0, Math.PI * 2); ctx.fill();
        api.text("JUMP IN THE GREEN", W / 2, 210, 18, "rgba(255,255,255,0.5)");
        if (times.length) api.text(last + " ms", W / 2, H - 70, 26, "rgba(255,255,255,0.45)");
      }

      arm();

      return { update: update, draw: draw, down: strike, key: function (code) { if (code === "Space" || code === "Enter") strike(); } };
    },
  });
})();
