/* Pixel Panic — grey decoys punish a careless tap. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, clamp = K.clamp, near = K.near;
  var MODE = { name: "Pixel Panic", level: 8, hudA: "Clean", hudB: "Time", pattern: "bricks" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var score = 0, clock = 0, next = 0.25, targets = [], LIMIT = 20;

      function add() {
        var r = rand(17, 26);
        targets.push({
          x: rand(r + 18, W - r - 18), y: rand(r + 72, H - r - 18), r: r,
          life: 1.25 * rand(0.85, 1.15), age: 0, dud: Math.random() < 0.35,
        });
      }

      function update(dt) {
        clock += dt;
        next -= dt;
        if (next <= 0) { add(); next = 0.38; }
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
          var k = clamp(1 - t.age / t.life, 0.15, 1);
          ctx.globalAlpha = 0.35 + k * 0.65;
          ctx.fillStyle = t.dud ? "#475569" : api.accent;
          ctx.fillRect(t.x - t.r, t.y - t.r, t.r * 2, t.r * 2);
          ctx.globalAlpha = 1;
          if (t.dud) {
            ctx.strokeStyle = "rgba(255,255,255,0.35)";
            ctx.lineWidth = 2;
            ctx.strokeRect(t.x - t.r, t.y - t.r, t.r * 2, t.r * 2);
          }
        }
      }

      function tap(x, y) {
        for (var i = targets.length - 1; i >= 0; i--) {
          var t = targets[i];
          if (!near(x, y, 2, t.x, t.y, t.r)) continue;
          targets.splice(i, 1);
          if (t.dud) {
            score = Math.max(0, score - 2);
            api.sfx("bad");
            api.shake(7);
            api.haptic(16);
          } else {
            score++;
            api.sfx("pick");
            api.burst(t.x, t.y, api.accent, 6);
          }
          return;
        }
      }

      return { update: update, draw: draw, tap: tap };
    },
  });
})();
