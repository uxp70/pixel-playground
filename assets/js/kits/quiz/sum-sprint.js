/* Sum Sprint — ten additions on a six-second clock. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, rr = K.roundRect;

  var MODE = { name: "Sum Sprint", level: 3, hudA: "Correct", hudB: "Time", pattern: "bands" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var TOTAL = 10, LIMIT = 6;
      var index = 0, correct = 0, picked = -1, wasRight = false, paused = 0;
      var timeLeft = LIMIT, q = null;

      function optionsFor(answer) {
        var list = [answer], guard = 0;
        while (list.length < 4 && guard++ < 80) {
          var n = answer + Math.round(rand(-7, 7));
          if (n !== answer && list.indexOf(n) === -1) list.push(n);
        }
        while (list.length < 4) list.push(answer + list.length);
        return list.sort(function () { return Math.random() - 0.5; });
      }

      function ask() {
        var a = 2 + Math.floor(rand(0, 14 + api.level));
        var b = 2 + Math.floor(rand(0, 14 + api.level));
        var answer = a + b;
        q = { text: a + " + " + b, answer: answer, options: optionsFor(answer) };
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
        var w = 118, h = 104;
        var cols = 2;
        var x = 88 + (i % cols) * (w + 188);
        var y = 300 + Math.floor(i / cols) * (h + 18);
        return { x: x, y: y, w: w, h: h };
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
          paused = 0.45;
          return;
        }
        api.hud(correct, timeLeft.toFixed(1) + "s");
      }

      function draw() {
        api.bg();
        api.text(q.text, W / 2, 160, 62, "#f8fafc");
        api.text("= ?", W / 2, 228, 26, "rgba(255,255,255,0.45)");
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        rr(ctx, 60, 258, W - 120, 8, 4); ctx.fill();
        ctx.fillStyle = api.accent;
        rr(ctx, 60, 258, (W - 120) * Math.max(0, timeLeft / LIMIT), 8, 4); ctx.fill();
        for (var i = 0; i < q.options.length; i++) {
          var r = rect(i);
          ctx.fillStyle = picked === i ? (wasRight ? "#22c55e" : "#ef4444") : "rgba(255,255,255,0.1)";
          if (paused > 0 && q.options[i] === q.answer) ctx.fillStyle = "#22c55e";
          rr(ctx, r.x, r.y, r.w, r.h, 18); ctx.fill();
          api.text(String(q.options[i]), r.x + r.w / 2, r.y + r.h / 2 + 2, 34, "#f8fafc");
        }
        api.text(index + " / " + TOTAL, W / 2, 560, 16, "rgba(255,255,255,0.35)");
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
            api.burst(x, y, "#22c55e", 9);
            api.haptic(6);
          } else {
            api.sfx("bad");
            api.shake(8);
            api.haptic(16);
          }
          paused = 0.42;
          return;
        }
      }

      return { update: update, draw: draw, tap: tap };
    },
  });
})();
