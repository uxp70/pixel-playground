/* Brain Bolt — true or false against a fast clock. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, rr = K.roundRect;

  var MODE = { name: "Brain Bolt", level: 10, hudA: "Correct", hudB: "Time", pattern: "scan" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var TOTAL = 10, LIMIT = 6;
      var index = 0, correct = 0, picked = -1, wasRight = false, paused = 0;
      var timeLeft = LIMIT, q = null;

      function ask() {
        var a = 2 + Math.floor(rand(0, 14));
        var b = 2 + Math.floor(rand(0, 14));
        var sum = a + b;
        var wrong = Math.random() < 0.5;
        var shown = wrong ? sum + (Math.random() < 0.5 ? 1 : -1) : sum;
        q = {
          text: a + " + " + b + " = " + shown,
          answer: wrong ? 0 : 1,
          options: [0, 1],
          labels: ["FALSE", "TRUE"],
        };
        picked = -1;
        wasRight = false;
        paused = 0;
        timeLeft = LIMIT;
      }

      function advance() {
        index++;
        if (index >= TOTAL) { api.finish(correct); return; }
        ask();
      }

      function rect(i) {
        return { x: 60 + i * (W / 2 - 30), y: 400, w: W / 2 - 90, h: 100 };
      }

      ask();

      function update(dt) {
        if (paused > 0) {
          paused -= dt;
          if (paused <= 0) advance();
          return;
        }
        timeLeft -= dt;
        if (timeLeft <= 0) {
          api.sfx("bad");
          api.shake(6);
          picked = -1;
          paused = 0.4;
          return;
        }
        api.hud(correct, timeLeft.toFixed(1) + "s");
      }

      function draw() {
        api.bg();
        api.text(q.text, W / 2, 210, 54, "#f8fafc");
        api.text("TRUE OR FALSE?", W / 2, 290, 18, "rgba(255,255,255,0.42)");
        for (var i = 0; i < 2; i++) {
          var r = rect(i);
          var tone = i === 0 ? "#f87171" : "#4ade80";
          ctx.fillStyle = picked === i ? (wasRight ? "#22c55e" : "#ef4444") : tone;
          ctx.globalAlpha = picked === i || paused > 0 ? 1 : 0.28;
          rr(ctx, r.x, r.y, r.w, r.h, 18); ctx.fill();
          ctx.globalAlpha = 1;
          api.text(q.labels[i], r.x + r.w / 2, r.y + r.h / 2 + 2, 28, "#f8fafc");
        }
        api.text((index + 1) + " / " + TOTAL, W / 2, 552, 16, "rgba(255,255,255,0.35)");
      }

      function tap(x, y) {
        if (paused > 0) return;
        for (var i = 0; i < 2; i++) {
          var r = rect(i);
          if (x < r.x || x > r.x + r.w || y < r.y || y > r.y + r.h) continue;
          picked = i;
          wasRight = i === q.answer;
          if (wasRight) {
            correct++;
            api.sfx("good");
            api.burst(x, y, "#22c55e", 8);
            api.haptic(6);
          } else {
            api.sfx("bad");
            api.shake(8);
            api.haptic(14);
          }
          paused = 0.4;
          return;
        }
      }

      return { update: update, draw: draw, tap: tap };
    },
  });
})();
