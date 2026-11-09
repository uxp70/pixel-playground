/* Tap Tide — targets rise from the bottom; three escapes end it. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, near = K.near;
  var MODE = { name: "Tap Tide", level: 7, hudA: "Caught", hudB: "Lives", pattern: "waves" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var score = 0, clock = 0, next = 0.3, lives = 3, targets = [], LIMIT = 30;

      function add() {
        var r = rand(22, 30);
        targets.push({
          x: rand(r + 18, W - r - 18), y: H + r, r: r,
          vy: -rand(64, 96) - api.level * 3,
        });
      }

      function update(dt) {
        clock += dt;
        next -= dt;
        if (next <= 0) { add(); next = 0.6; }
        for (var i = targets.length - 1; i >= 0; i--) {
          var t = targets[i];
          t.y += t.vy * dt;
          if (t.y < 78) {
            targets.splice(i, 1);
            lives--;
            api.sfx("bad");
            api.shake(8);
            api.haptic(20);
            if (lives <= 0) { api.finish(score); return; }
          }
        }
        api.hud(score, lives + " lives");
        if (clock >= LIMIT) api.finish(score);
      }

      function draw() {
        api.bg();
        ctx.strokeStyle = "rgba(248,113,113,0.55)";
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(0, 78); ctx.lineTo(W, 78); ctx.stroke();
        for (var i = 0; i < targets.length; i++) {
          var t = targets[i];
          ctx.fillStyle = api.accent;
          ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = "rgba(255,255,255,0.5)";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      function tap(x, y) {
        for (var i = targets.length - 1; i >= 0; i--) {
          var t = targets[i];
          if (!near(x, y, 2, t.x, t.y, t.r)) continue;
          targets.splice(i, 1);
          score++;
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
