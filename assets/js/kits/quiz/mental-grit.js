/* Mental Grit — no clock, but one wrong answer ends the run. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, rr = K.roundRect;

  var MODE = { name: "Mental Grit", level: 5, hudA: "Correct", hudB: "Question", pattern: "stars" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var TOTAL = 10;
      var index = 0, correct = 0, picked = -1, wasRight = false, paused = 0;
      var q = null;

      function optionsFor(answer) {
        var list = [answer], guard = 0;
        while (list.length < 4 && guard++ < 80) {
          var n = answer + Math.round(rand(-9, 9));
          if (n !== answer && list.indexOf(n) === -1) list.push(n);
        }
        while (list.length < 4) list.push(answer + list.length);
        return list.sort(function () { return Math.random() - 0.5; });
      }

      function ask() {
        var a = 4 + Math.floor(rand(0, 22));
        var b = 3 + Math.floor(rand(0, 18));
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
      }

      function rect(i) {
        var w = (W - 110) / 2, h = 76;
        return { x: 36 + (i % 2) * (w + 38), y: 350 + Math.floor(i / 2) * (h + 20), w: w, h: h };
      }

      ask();

      function update(dt) {
        if (paused > 0) {
          paused -= dt;
          if (paused <= 0) {
            index++;
            if (index >= TOTAL) { api.finish(correct); return; }
            ask();
          }
        }
      }

      function draw() {
        api.bg();
        api.text("NO CLOCK — ONE MISS ENDS IT", W / 2, 84, 15, "rgba(255,255,255,0.42)");
        ctx.fillStyle = "rgba(255,255,255,0.06)";
        rr(ctx, 36, 106, W - 72, 200, 24); ctx.fill();
        api.text(q.text, W / 2, 206, 54, "#f8fafc");
        for (var i = 0; i < q.options.length; i++) {
          var r = rect(i);
          ctx.fillStyle = picked === i ? (wasRight ? "#22c55e" : "#ef4444") : "rgba(255,255,255,0.1)";
          if (paused > 0 && q.options[i] === q.answer) ctx.fillStyle = "#22c55e";
          rr(ctx, r.x, r.y, r.w, r.h, 16); ctx.fill();
          api.text(String(q.options[i]), r.x + r.w / 2, r.y + r.h / 2 + 2, 32, "#f8fafc");
        }
        api.text("question " + Math.min(index + 1, TOTAL) + " / " + TOTAL, W / 2, 552, 16, "rgba(255,255,255,0.38)");
      }

      function tap(x, y) {
        if (paused > 0 || index >= TOTAL) return;
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
            paused = 0.4;
          } else {
            api.sfx("bad");
            api.shake(10);
            api.haptic([20, 40, 20]);
            api.finish(correct);
          }
          return;
        }
      }

      return { update: update, draw: draw, tap: tap };
    },
  });
})();
