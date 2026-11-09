/* Twitch — six rounds, shorter fuse than Quickdraw. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rr = K.roundRect;
  var MODE = { name: "Twitch", level: 5, hudA: "Round", hudB: "Last", pattern: "stars" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var ROUNDS = 6, times = [], state = "wait", wait = 1, cueAt = 0, last = 0;

      function arm() { state = "wait"; wait = 0.45 + Math.random() * 1.2; }

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
          api.sfx("bad"); api.shake(7); api.haptic(18);
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
        } else if (state === "go" && api.elapsed - cueAt > 0.65) {
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
        ctx.strokeStyle = state === "go" ? api.accent : "rgba(255,255,255,0.2)";
        ctx.lineWidth = 12;
        ctx.beginPath(); ctx.arc(W / 2, H / 2, 120, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = state === "go" ? api.accent : "rgba(255,255,255,0.08)";
        ctx.beginPath(); ctx.arc(W / 2, H / 2, 92, 0, Math.PI * 2); ctx.fill();
        api.text(state === "go" ? "TAP" : "HOLD", W / 2, H / 2, 38, state === "go" ? "#05130b" : "rgba(255,255,255,0.5)");
        if (times.length) api.text(last + " ms", W / 2, H - 70, 26, "rgba(255,255,255,0.45)");
      }

      arm();

      return { update: update, draw: draw, down: strike, key: function (code) { if (code === "Space" || code === "Enter") strike(); } };
    },
  });
})();
