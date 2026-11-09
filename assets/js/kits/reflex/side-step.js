/* Side Step — tap the side the arrow points to. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H;
  var MODE = { name: "Side Step", level: 7, hudA: "Round", hudB: "Last", pattern: "grid" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var ROUNDS = 8, times = [], state = "wait", wait = 1, cueAt = 0, arrow = "left", last = 0;

      function arm() { state = "wait"; wait = 0.6 + Math.random() * 1.4; }

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

      function strike(chosen) {
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
        if (chosen !== arrow) {
          last = 700;
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
            arrow = Math.random() < 0.5 ? "left" : "right";
            api.sfx("pick"); api.haptic(8);
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
        if (state === "go") {
          api.text(arrow === "left" ? "←" : "→", W / 2, H / 2 - 20, 150, api.accent);
          api.text("TAP THAT SIDE", W / 2, H / 2 + 100, 18, "rgba(255,255,255,0.5)");
        } else {
          api.text("READY", W / 2, H / 2, 40, "rgba(255,255,255,0.35)");
        }
        if (times.length) api.text(last + " ms", W / 2, H - 60, 24, "rgba(255,255,255,0.4)");
      }

      arm();

      return {
        update: update, draw: draw,
        down: function (x) { strike(x < W / 2 ? "left" : "right"); },
        key: function (code) {
          if (code === "ArrowLeft" || code === "KeyA") strike("left");
          if (code === "ArrowRight" || code === "KeyD") strike("right");
          if (code === "Space" || code === "Enter") strike(arrow);
        },
      };
    },
  });
})();
