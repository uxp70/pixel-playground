/* Dot Frenzy — a swarm of small, short-lived dots. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, clamp = K.clamp, near = K.near;
  var MODE = { name: "Dot Frenzy", level: 6, hudA: "Dots", hudB: "Time", pattern: "stars" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var score = 0, clock = 0, next = 0.1, targets = [], LIMIT = 15;

      function add() {
        if (targets.length > 26) return;
        var r = rand(10, 16);
        targets.push({
          x: rand(r + 18, W - r - 18), y: rand(r + 72, H - r - 18), r: r,
          life: 0.72 * rand(0.85, 1.15), age: 0,
        });
      }

      function update(dt) {
        clock += dt;
        next -= dt;
        if (next <= 0) { add(); next = 0.12; }
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
          var k = clamp(1 - t.age / t.life, 0.1, 1);
          ctx.globalAlpha = k;
          ctx.fillStyle = "#f472b6";
          ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      function tap(x, y) {
        for (var i = targets.length - 1; i >= 0; i--) {
          var t = targets[i];
          if (!near(x, y, 2, t.x, t.y, t.r)) continue;
          targets.splice(i, 1);
          score++;
          api.sfx("pick");
          api.burst(t.x, t.y, "#f472b6", 4);
          return;
        }
      }

      return { update: update, draw: draw, tap: tap };
    },
  });
})();
