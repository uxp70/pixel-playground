/* Quick Math — addition under a ten-second clock. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, rr = K.roundRect;

  var MODE = { name: "Quick Math", level: 1, hudA: "Correct", hudB: "Time", pattern: "grid" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var TOTAL = 8, LIMIT = 10;
      var index = 0, correct = 0, picked = -1, wasRight = false, paused = 0;
      var timeLeft = LIMIT, q = null;

      function optionsFor(answer, spread) {
        var list = [answer], guard = 0;
        while (list.length < 4 && guard++ < 80) {
          var n = answer + Math.round(rand(-spread, spread));
          if (n !== answer && list.indexOf(n) === -1) list.push(n);
        }
        while (list.length < 4) list.push(answer + list.length);
        return list.sort(function () { return Math.random() - 0.5; });
      }

      function ask() {
        var a = 2 + Math.floor(rand(0, 12 + api.level * 2));
        var b = 2 + Math.floor(rand(0, 12 + api.level * 2));
        var answer = a + b;
        q = { text: a + " + " + b + " = ?", answer: answer, options: optionsFor(answer, 9) };
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
        var w = (W - 110) / 2, h = 76;
        return { x: 36 + (i % 2) * (w + 38), y: 350 + Math.floor(i / 2) * (h + 20), w: w, h: h };
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
        ctx.fillStyle = "rgba(255,255,255,0.07)";
        rr(ctx, 36, 66, W - 72, 236, 22); ctx.fill();
        api.text(q.text, W / 2, 170, 50, "#f8fafc");
        api.text(Math.ceil(timeLeft) + "s", W / 2, 250, 24, api.accent);
        for (var i = 0; i < q.options.length; i++) {
          var r = rect(i);
          ctx.fillStyle = picked === i ? (wasRight ? "#22c55e" : "#ef4444") : "rgba(255,255,255,0.1)";
          if (paused > 0 && q.options[i] === q.answer) ctx.fillStyle = "#22c55e";
          rr(ctx, r.x, r.y, r.w, r.h, 14); ctx.fill();
          api.text(String(q.options[i]), r.x + r.w / 2, r.y + r.h / 2 + 2, 32, "#f8fafc");
        }
        api.text((index + 1) + " / " + TOTAL, W / 2, 552, 17, "rgba(255,255,255,0.4)");
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
            api.burst(r.x + r.w / 2, r.y + r.h / 2, "#22c55e", 8);
            api.haptic(6);
          } else {
            api.sfx("bad");
            api.shake(7);
            api.haptic(14);
          }
          paused = 0.5;
          return;
        }
      }

      return { update: update, draw: draw, tap: tap };
    },
  });
})();
