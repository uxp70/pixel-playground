/* Number Crunch — addition and subtraction mixed together. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, rr = K.roundRect;

  var MODE = { name: "Number Crunch", level: 2, hudA: "Correct", hudB: "Time", pattern: "dots" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var TOTAL = 8, LIMIT = 10;
      var index = 0, correct = 0, picked = -1, wasRight = false, paused = 0;
      var timeLeft = LIMIT, q = null;

      function optionsFor(answer) {
        var list = [answer], guard = 0;
        while (list.length < 4 && guard++ < 80) {
          var n = answer + Math.round(rand(-8, 8));
          if (n !== answer && list.indexOf(n) === -1) list.push(n);
        }
        while (list.length < 4) list.push(answer + list.length);
        return list.sort(function () { return Math.random() - 0.5; });
      }

      function ask() {
        var a = 2 + Math.floor(rand(0, 18));
        var b = 2 + Math.floor(rand(0, 14));
        var text, answer;
        if (Math.random() < 0.5) {
          answer = a + b;
          text = a + " + " + b + " = ?";
        } else {
          if (b > a) { var t = a; a = b; b = t; }
          answer = a - b;
          text = a + " − " + b + " = ?";
        }
        q = { text: text, answer: answer, options: optionsFor(answer) };
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
        var h = 72;
        return { x: 46, y: 336 + i * (h + 14), w: W - 92, h: h };
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
          api.shake(5);
          picked = -1;
          paused = 0.5;
          return;
        }
        api.hud(correct, Math.ceil(timeLeft) + "s");
      }

      function draw() {
        api.bg();
        ctx.fillStyle = "rgba(255,255,255,0.06)";
        rr(ctx, 36, 66, W - 72, 226, 22); ctx.fill();
        api.text(q.text, W / 2, 160, 48, "#f8fafc");
        ctx.fillStyle = "rgba(255,255,255,0.1)";
        rr(ctx, W / 2 - 110, 222, 220, 12, 6); ctx.fill();
        ctx.fillStyle = api.accent;
        rr(ctx, W / 2 - 110, 222, 220 * Math.max(0, timeLeft / LIMIT), 12, 6); ctx.fill();
        for (var i = 0; i < q.options.length; i++) {
          var r = rect(i);
          ctx.fillStyle = picked === i ? (wasRight ? "#22c55e" : "#ef4444") : "rgba(255,255,255,0.09)";
          if (paused > 0 && q.options[i] === q.answer) ctx.fillStyle = "#22c55e";
          rr(ctx, r.x, r.y, r.w, r.h, 12); ctx.fill();
          api.text(String(q.options[i]), r.x + r.w / 2, r.y + r.h / 2 + 2, 30, "#f8fafc");
        }
      }

      function tap(x, y) {
        if (paused > 0) return;
        for (var i = 0; i < q.options.length; i++) {
          var r = rect(i);
          if (x < r.x || x > r.x + r.w || y < r.y || y > r.y + r.h) continue;
          picked = i;
          wasRight = q.options[i] === q.answer;
          if (wasRight) {
            correct++;
            api.sfx("good");
            api.burst(x, y, "#22c55e", 8);
            api.haptic(6);
          } else {
            api.sfx("bad");
            api.shake(7);
            api.haptic(14);
          }
          paused = 0.48;
          return;
        }
      }

      return { update: update, draw: draw, tap: tap };
    },
  });
})();
