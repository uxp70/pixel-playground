/* Pulse Tap — only targets at the bright peak score. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, near = K.near;
  var MODE = { name: "Pulse Tap", level: 10, hudA: "Pulses", hudB: "Time", pattern: "bands" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var score = 0, clock = 0, next = 0.25, targets = [], LIMIT = 20;

      function add() {
        var r = rand(24, 34);
        targets.push({
          x: rand(r + 18, W - r - 18), y: rand(r + 72, H - r - 18), r: r,
          life: 2.4 * rand(0.85, 1.15), age: 0, phase: rand(0, Math.PI * 2),
        });
      }

      function update(dt) {
        clock += dt;
        next -= dt;
        if (next <= 0) { add(); next = 0.62; }
        for (var i = targets.length - 1; i >= 0; i--) {
          targets[i].age += dt;
          if (targets[i].age > targets[i].life) targets.splice(i, 1);
        }
        api.hud(score, Math.max(0, Math.ceil(LIMIT - clock)) + "s");
        if (clock >= LIMIT) api.finish(score);
      }

      function draw() {
        api.bg();
        for (var i = 0; i < targets.length; i++) {
          var t = targets[i];
          var wave = 0.5 + 0.5 * Math.sin(clock * 5 + t.phase);
          ctx.globalAlpha = 0.45 + wave * 0.55;
          ctx.fillStyle = api.accent;
          ctx.beginPath(); ctx.arc(t.x, t.y, t.r * (0.72 + wave * 0.4), 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 1;
        }
        api.text("TAP AT THE PEAK", W / 2, H - 36, 14, "rgba(255,255,255,0.3)");
      }

      function tap(x, y) {
        for (var i = targets.length - 1; i >= 0; i--) {
          var t = targets[i];
          if (!near(x, y, 2, t.x, t.y, t.r * 1.15)) continue;
          var bright = Math.sin(clock * 5 + t.phase) > 0.55;
          targets.splice(i, 1);
          if (bright) {
            score += 2;
            api.sfx("pick");
            api.burst(t.x, t.y, api.accent, 8);
          } else {
            score = Math.max(0, score - 1);
            api.sfx("bad");
            api.haptic(10);
          }
          return;
        }
      }

      return { update: update, draw: draw, tap: tap };
    },
  });
})();
