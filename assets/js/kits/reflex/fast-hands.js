/* Fast Hands — hit the lit side before the cue expires. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rr = K.roundRect;
  var MODE = { name: "Fast Hands", level: 6, hudA: "Round", hudB: "Last", pattern: "beams" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var ROUNDS = 8, times = [], state = "wait", wait = 1, cueAt = 0, side = 0, last = 0;

      function arm() { state = "wait"; wait = 0.6 + Math.random() * 1.4; side = 0; }

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

      function strike(x, chosen) {
        if (state === "wait") {
          last = 600;
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
        var pick = chosen || (x < W / 2 ? -1 : 1);
        if (pick !== side) {
          last = 650;
          times.push(last);
          api.sfx("bad"); api.shake(5); api.haptic(16);
          if (times.length >= ROUNDS) {
            var s2 = 0;
            for (var j = 0; j < times.length; j++) s2 += times[j];
            api.finish(Math.round(s2 / times.length));
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
          if (wait <= 0) {
            state = "go";
            cueAt = api.elapsed;
            side = Math.random() < 0.5 ? -1 : 1;
            api.sfx("pick"); api.haptic(10);
          }
        } else if (api.elapsed - cueAt > 2.2) {
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
        ctx.fillStyle = state === "go" && side < 0 ? api.accent : "rgba(255,255,255,0.12)";
        rr(ctx, 50, 180, 220, 240, 22); ctx.fill();
        ctx.fillStyle = state === "go" && side > 0 ? api.accent : "rgba(255,255,255,0.12)";
        rr(ctx, W - 270, 180, 220, 240, 22); ctx.fill();
        api.text("TAP THE LIT SIDE", W / 2, 520, 18, "rgba(255,255,255,0.5)");
        if (times.length) api.text(last + " ms", W / 2, H - 40, 22, "rgba(255,255,255,0.4)");
      }

      arm();

      return { update: update, draw: draw, down: function (x, y) { strike(x); }, key: function (code) { if (code === "Space" || code === "Enter") strike(W / 2); } };
    },
  });
})();
