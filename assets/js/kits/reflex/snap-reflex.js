/* Snap Reflex — hit the target the moment it appears. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, near = K.near;
  var MODE = { name: "Snap Reflex", level: 3, hudA: "Round", hudB: "Last", pattern: "dots" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var ROUNDS = 8, times = [], state = "wait", wait = 1, cueAt = 0, last = 0;
      var target = { x: W / 2, y: H / 2, r: 44 };

      function arm() { state = "wait"; wait = 0.7 + Math.random() * 1.5; }

      function fire() {
        state = "go";
        cueAt = api.elapsed;
        target.x = rand(120, W - 120);
        target.y = rand(160, H - 160);
        api.sfx("pick"); api.haptic(8);
      }

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
        api.sfx("bad"); api.shake(6); api.haptic(16);
        if (times.length >= ROUNDS) {
          var sum = 0;
          for (var i = 0; i < times.length; i++) sum += times[i];
          api.finish(Math.round(sum / times.length));
          return;
        }
        arm();
      }

      function strike(x, y) {
        if (state === "wait") { miss(600); return; }
        if (state !== "go") return;
        if (!near(x, y, 2, target.x, target.y, target.r)) { miss(600); return; }
        record((api.elapsed - cueAt) * 1000);
      }

      function update(dt) {
        if (state === "wait") {
          wait -= dt;
          if (wait <= 0) fire();
        } else if (state === "go" && api.elapsed - cueAt > 1.8) {
          miss(900);
        }
        api.hud(Math.min(times.length + 1, ROUNDS) + " / " + ROUNDS, times.length ? last + " ms" : "ready");
      }

      function draw() {
        api.bg();
        if (state === "go") {
          ctx.fillStyle = api.accent;
          ctx.beginPath(); ctx.arc(target.x, target.y, target.r, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.lineWidth = 3; ctx.stroke();
        } else {
          api.text("WAIT FOR IT", W / 2, H / 2, 34, "rgba(255,255,255,0.4)");
        }
        if (times.length) api.text(last + " ms", W / 2, H - 70, 26, "rgba(255,255,255,0.5)");
      }

      arm();

      return { update: update, draw: draw, down: strike, key: function (code) { if (code === "Space" || code === "Enter") strike(W / 2, H / 2); } };
    },
  });
})();
