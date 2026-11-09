/* Equation Dash — fill the missing addend. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, rr = K.roundRect;

  var MODE = { name: "Equation Dash", level: 4, hudA: "Solved", hudB: "Time", pattern: "scan" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var TOTAL = 8, LIMIT = 10;
      var index = 0, solved = 0, picked = -1, wasRight = false, paused = 0;
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
        var a = 2 + Math.floor(rand(0, 20));
        var b = 2 + Math.floor(rand(0, 20));
        q = {
          text: a + " + ? = " + (a + b),
          hint: "Find the missing number",
          answer: b,
          options: optionsFor(b),
        };
        picked = -1;
        wasRight = false;
        paused = 0;
        timeLeft = LIMIT;
      }

      function advance() {
        index++;
        if (index >= TOTAL) { api.finish(solved); return; }
        ask();
      }

      function rect(i) {
        var w = (W - 120) / 2, h = 82;
        return { x: 42 + (i % 2) * (w + 36), y: 356 + Math.floor(i / 2) * (h + 18), w: w, h: h };
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
        api.hud(solved, Math.ceil(timeLeft) + "s");
      }

      function draw() {
        api.bg();
        api.text(q.hint, W / 2, 90, 17, "rgba(255,255,255,0.45)");
        api.text(q.text, W / 2, 190, 52, "#f8fafc");
        ctx.strokeStyle = "rgba(255,255,255,0.16)";
        ctx.lineWidth = 2;
        ctx.strokeRect(46, 270, W - 92, 2);
        for (var i = 0; i < q.options.length; i++) {
          var r = rect(i);
          ctx.fillStyle = picked === i ? (wasRight ? "#22c55e" : "#ef4444") : "rgba(255,255,255,0.08)";
          if (paused > 0 && q.options[i] === q.answer) ctx.fillStyle = "#22c55e";
          rr(ctx, r.x, r.y, r.w, r.h, 10); ctx.fill();
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
            solved++;
            api.sfx("good");
            api.burst(x, y, "#22c55e", 8);
            api.haptic(6);
          } else {
            api.sfx("bad");
            api.shake(7);
            api.haptic(14);
          }
          paused = 0.52;
          return;
        }
      }

      return { update: update, draw: draw, tap: tap };
    },
  });
})();
