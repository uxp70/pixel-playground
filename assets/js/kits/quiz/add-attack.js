/* Add Attack — fifteen additions, five seconds each. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, rr = K.roundRect;

  var MODE = { name: "Add Attack", level: 6, hudA: "Correct", hudB: "Time", pattern: "rain" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var TOTAL = 15, LIMIT = 5;
      var index = 0, correct = 0, picked = -1, wasRight = false, paused = 0;
      var timeLeft = LIMIT, q = null;

      function optionsFor(answer) {
        var list = [answer], guard = 0;
        while (list.length < 4 && guard++ < 80) {
          var n = answer + Math.round(rand(-6, 6));
          if (n !== answer && list.indexOf(n) === -1) list.push(n);
        }
        while (list.length < 4) list.push(answer + list.length);
        return list.sort(function () { return Math.random() - 0.5; });
      }

      function ask() {
        var a = 3 + Math.floor(rand(0, 16));
        var b = 3 + Math.floor(rand(0, 16));
        var answer = a + b;
        q = { text: a + " + " + b + " = ?", answer: answer, options: optionsFor(answer) };
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
        var w = 122, h = 92;
        var x = 54 + i * (w + 16);
        return { x: x, y: 430, w: w, h: h };
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
          paused = 0.38;
          return;
        }
        api.hud(correct, Math.ceil(timeLeft) + "s");
      }

      function draw() {
        api.bg();
        ctx.fillStyle = "rgba(248,113,113,0.12)";
        rr(ctx, 30, 90, W - 60, 260, 26); ctx.fill();
        api.text(q.text, W / 2, 220, 62, "#f8fafc");
        api.text(Math.ceil(timeLeft) + "s", W / 2, 300, 26, timeLeft < 2 ? "#f87171" : api.accent);
        for (var i = 0; i < q.options.length; i++) {
          var r = rect(i);
          ctx.fillStyle = picked === i ? (wasRight ? "#22c55e" : "#ef4444") : "rgba(255,255,255,0.11)";
          if (paused > 0 && q.options[i] === q.answer) ctx.fillStyle = "#22c55e";
          rr(ctx, r.x, r.y, r.w, r.h, 12); ctx.fill();
          api.text(String(q.options[i]), r.x + r.w / 2, r.y + r.h / 2 + 2, 30, "#f8fafc");
        }
        api.text((index + 1) + " / " + TOTAL, W / 2, 560, 16, "rgba(255,255,255,0.35)");
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
            api.haptic(5);
          } else {
            api.sfx("bad");
            api.shake(8);
            api.haptic(14);
          }
          paused = 0.36;
          return;
        }
      }

      return { update: update, draw: draw, tap: tap };
    },
  });
})();
