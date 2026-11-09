/* Pattern Sum — extend a number sequence. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, rr = K.roundRect;

  var MODE = { name: "Pattern Sum", level: 9, hudA: "Correct", hudB: "Time", pattern: "beams" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var TOTAL = 8, LIMIT = 12;
      var index = 0, correct = 0, picked = -1, wasRight = false, paused = 0;
      var timeLeft = LIMIT, q = null;

      function optionsFor(answer) {
        var list = [answer], guard = 0;
        while (list.length < 4 && guard++ < 80) {
          var n = answer + Math.round(rand(-8, 8));
          if (n > 0 && n !== answer && list.indexOf(n) === -1) list.push(n);
        }
        while (list.length < 4) list.push(answer + list.length + 2);
        return list.sort(function () { return Math.random() - 0.5; });
      }

      function ask() {
        var a = 2 + Math.floor(rand(0, 9));
        var b = 2 + Math.floor(rand(0, 7));
        var seq = [a, a + b, a + b * 2, a + b * 3];
        var answer = a + b * 4;
        q = { text: seq.join("  ·  "), hint: "what comes next?", answer: answer, options: optionsFor(answer) };
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
        var w = (W - 130) / 2, h = 82;
        return { x: 47 + (i % 2) * (w + 36), y: 370 + Math.floor(i / 2) * (h + 18), w: w, h: h };
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
        api.text(q.hint, W / 2, 100, 17, "rgba(255,255,255,0.45)");
        api.text(q.text, W / 2, 208, 38, "#f8fafc");
        api.text("?", W / 2, 280, 40, api.accent);
        for (var i = 0; i < q.options.length; i++) {
          var r = rect(i);
          ctx.fillStyle = picked === i ? (wasRight ? "#22c55e" : "#ef4444") : "rgba(255,255,255,0.09)";
          if (paused > 0 && q.options[i] === q.answer) ctx.fillStyle = "#22c55e";
          rr(ctx, r.x, r.y, r.w, r.h, 16); ctx.fill();
          api.text(String(q.options[i]), r.x + r.w / 2, r.y + r.h / 2 + 2, 32, "#f8fafc");
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
          paused = 0.55;
          return;
        }
      }

      return { update: update, draw: draw, tap: tap };
    },
  });
})();
