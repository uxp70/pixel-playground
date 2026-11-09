/* Beat Clock — tap on the pulse for twelve beats. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H;
  var MODE = { name: "Beat Clock", level: 10, hudA: "Beat", hudB: "Error", pattern: "dots" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var ROUNDS = 12, BEAT = 0.62, times = [], beats = [], beatAt = 0, last = 0, started = false;

      function schedule() {
        beats = [];
        var start = api.elapsed + 1.6;
        for (var i = 0; i < ROUNDS; i++) beats.push(start + i * BEAT);
        beatAt = beats[0];
        started = true;
      }

      function record(err) {
        last = Math.max(1, Math.round(err + 20));
        times.push(last);
        api.sfx("good"); api.haptic(5);
        if (times.length >= ROUNDS) {
          var sum = 0;
          for (var i = 0; i < times.length; i++) sum += times[i];
          api.finish(Math.round(sum / times.length));
        }
      }

      function strike() {
        if (!started) return;
        var err = 9999;
        for (var i = 0; i < beats.length; i++) err = Math.min(err, Math.abs(api.elapsed - beats[i]) * 1000);
        record(err);
      }

      function update(dt) {
        if (!started) { schedule(); return; }
        var next = beats[Math.min(times.length, beats.length - 1)];
        if (times.length < ROUNDS && api.elapsed > next + 0.5) {
          last = 900;
          times.push(last);
          api.sfx("bad");
          if (times.length >= ROUNDS) {
            var sum = 0;
            for (var i = 0; i < times.length; i++) sum += times[i];
            api.finish(Math.round(sum / times.length));
            return;
          }
        }
        api.hud(Math.min(times.length + 1, ROUNDS) + " / " + ROUNDS, times.length ? last + " ms" : "listen");
      }

      function draw() {
        api.bg();
        var pulse = 0.5 + 0.5 * Math.sin(api.elapsed * (Math.PI * 2 / BEAT));
        ctx.strokeStyle = "rgba(255,255,255,0.16)";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(W / 2, H / 2, 130, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = api.accent;
        ctx.globalAlpha = 0.45 + pulse * 0.55;
        ctx.beginPath(); ctx.arc(W / 2, H / 2, 72, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        api.text("TAP ON THE BEAT", W / 2, H / 2 + 160, 18, "rgba(255,255,255,0.5)");
        if (times.length) api.text(last + " ms", W / 2, H - 60, 24, "rgba(255,255,255,0.4)");
      }

      return { update: update, draw: draw, down: strike, key: function (code) { if (code === "Space" || code === "Enter") strike(); } };
    },
  });
})();
