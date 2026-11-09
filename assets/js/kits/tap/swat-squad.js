/* Swat Squad — moving targets and a combo counter. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, clamp = K.clamp, near = K.near;
  var MODE = { name: "Swat Squad", level: 5, hudA: "Swats", hudB: "Time", pattern: "dots" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var score = 0, combo = 0, comboClock = 0, clock = 0, next = 0.25, targets = [], LIMIT = 20;

      function add() {
        var r = rand(20, 28);
        targets.push({
          x: rand(r + 18, W - r - 18), y: rand(r + 72, H - r - 18), r: r,
          life: 1.7 * rand(0.85, 1.15), age: 0,
          vx: rand(-1, 1) * 95, vy: rand(-1, 1) * 95,
        });
      }

      function update(dt) {
        clock += dt;
        comboClock = Math.max(0, comboClock - dt);
        if (!comboClock) combo = 0;
        next -= dt;
        if (next <= 0) { add(); next = 0.42; }
        for (var i = targets.length - 1; i >= 0; i--) {
          var t = targets[i];
          t.age += dt;
          t.x += t.vx * dt;
          t.y += t.vy * dt;
          if (t.x < t.r + 10 || t.x > W - t.r - 10) { t.vx *= -1; t.x = clamp(t.x, t.r + 10, W - t.r - 10); }
          if (t.y < t.r + 70 || t.y > H - t.r - 10) { t.vy *= -1; t.y = clamp(t.y, t.r + 70, H - t.r - 10); }
          if (t.age > t.life) targets.splice(i, 1);
        }
        api.hud(score, Math.max(0, Math.ceil(LIMIT - clock)) + "s");
        if (clock >= LIMIT) api.finish(score);
      }

      function draw() {
        api.bg();
        for (var i = 0; i < targets.length; i++) {
          var t = targets[i];
          var k = clamp(1 - t.age / t.life, 0.2, 1);
          ctx.fillStyle = api.accent;
          ctx.beginPath(); ctx.arc(t.x, t.y, t.r * (0.6 + k * 0.4), 0, Math.PI * 2); ctx.fill();
        }
        if (combo > 1) api.text("x" + combo, W / 2, H - 34, 20, "rgba(255,255,255,0.5)");
      }

      function tap(x, y) {
        for (var i = targets.length - 1; i >= 0; i--) {
          var t = targets[i];
          if (!near(x, y, 2, t.x, t.y, t.r)) continue;
          targets.splice(i, 1);
          combo++;
          comboClock = 1.6;
          score += 1 + Math.min(3, Math.floor(combo / 4));
          api.sfx("pick");
          api.burst(t.x, t.y, api.accent, 7);
          api.haptic(4);
          return;
        }
      }

      return { update: update, draw: draw, tap: tap };
    },
  });
})();
