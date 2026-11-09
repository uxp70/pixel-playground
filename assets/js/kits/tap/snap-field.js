/* Snap Field — only taps inside the moving ring score. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, clamp = K.clamp, near = K.near;
  var MODE = { name: "Snap Field", level: 9, hudA: "In ring", hudB: "Time", pattern: "grid" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var score = 0, clock = 0, next = 0.25, targets = [], ringR = 210, LIMIT = 20;

      function add() {
        var r = rand(20, 30);
        targets.push({
          x: rand(r + 18, W - r - 18), y: rand(r + 72, H - r - 18), r: r,
          life: 1.1 * rand(0.85, 1.15), age: 0,
        });
      }

      function update(dt) {
        clock += dt;
        ringR = 168 + Math.sin(clock * 1.4) * 52;
        next -= dt;
        if (next <= 0) { add(); next = 0.5; }
        for (var i = targets.length - 1; i >= 0; i--) {
          targets[i].age += dt;
          if (targets[i].age > targets[i].life) targets.splice(i, 1);
        }
        api.hud(score, Math.max(0, Math.ceil(LIMIT - clock)) + "s");
        if (clock >= LIMIT) api.finish(score);
      }

      function draw() {
        api.bg();
        ctx.strokeStyle = "rgba(255,255,255,0.28)";
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 12]);
        ctx.beginPath(); ctx.arc(W / 2, H / 2, ringR, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        for (var i = 0; i < targets.length; i++) {
          var t = targets[i];
          var k = clamp(1 - t.age / t.life, 0.15, 1);
          ctx.globalAlpha = 0.35 + k * 0.65;
          ctx.fillStyle = api.accent;
          ctx.beginPath(); ctx.arc(t.x, t.y, t.r * (0.55 + k * 0.45), 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 1;
        }
      }

      function tap(x, y) {
        for (var i = targets.length - 1; i >= 0; i--) {
          var t = targets[i];
          if (!near(x, y, 2, t.x, t.y, t.r)) continue;
          var dx = t.x - W / 2, dy = t.y - H / 2;
          var inRing = Math.sqrt(dx * dx + dy * dy) + t.r * 0.5 <= ringR;
          targets.splice(i, 1);
          if (inRing) {
            score++;
            api.sfx("pick");
            api.burst(t.x, t.y, api.accent, 6);
          } else {
            score = Math.max(0, score - 1);
            api.sfx("bad");
            api.shake(4);
          }
          return;
        }
      }

      return { update: update, draw: draw, tap: tap };
    },
  });
})();
