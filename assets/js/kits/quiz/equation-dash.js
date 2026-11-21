/* Equation Dash — tap the number line to fill the missing operand. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, clamp = K.clamp, rr = K.roundRect;
  var MODE = { name: "Equation Dash", level: 4, hudA: "Solved", hudB: "Time", pattern: "scan" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var TOTAL = 8, LIMIT = 9, MAX = 20;
      var X0 = 54, X1 = W - 54, LY = 340;
      var index = 0, solved = 0, a = 0, b = 0, choice = -1, timeLeft = LIMIT, done = false;

      function ask() {
        a = 3 + Math.floor(rand(0, 15));
        b = 1 + Math.floor(rand(0, Math.min(18, MAX - a)));
        choice = -1;
        timeLeft = LIMIT;
      }

      function end() {
        if (done) return;
        done = true;
        api.finish(solved);
      }

      function advance() {
        index++;
        if (index >= TOTAL) { end(); return; }
        ask();
      }

      function update(dt) {
        if (done) return;
        timeLeft -= dt;
        if (timeLeft <= 0) {
          api.sfx("bad");
          api.shake(5);
          advance();
          if (done) return;
        }
        api.hud(solved, Math.ceil(timeLeft) + "s");
      }

      function draw() {
        api.bg();
        api.text(a + " + ? = " + (a + b), W / 2, 150, 46, "#f8fafc");
        api.text("TAP THE NUMBER LINE", W / 2, 210, 16, "rgba(255,255,255,0.45)");
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        rr(ctx, X0 - 18, LY - 8, X1 - X0 + 36, 64, 20); ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.28)";
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(X0, LY); ctx.lineTo(X1, LY); ctx.stroke();
        for (var n = 0; n <= MAX; n++) {
          var x = X0 + (n / MAX) * (X1 - X0);
          var big = n % 5 === 0;
          ctx.strokeStyle = big ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.18)";
          ctx.lineWidth = big ? 2 : 1;
          ctx.beginPath(); ctx.moveTo(x, LY - (big ? 14 : 8)); ctx.lineTo(x, LY + (big ? 14 : 8)); ctx.stroke();
          if (big) api.text(String(n), x, LY + 38, 13, "rgba(255,255,255,0.4)");
        }
        if (choice >= 0) {
          var cx = X0 + (choice / MAX) * (X1 - X0);
          ctx.fillStyle = choice === b ? "#22c55e" : "#ef4444";
          ctx.beginPath(); ctx.arc(cx, LY, 11, 0, Math.PI * 2); ctx.fill();
          api.text(String(choice), cx, LY - 30, 22, "#f8fafc");
        }
        api.text((index + 1) + " / " + TOTAL, W / 2, H - 56, 16, "rgba(255,255,255,0.35)");
      }

      function tap(x, y) {
        if (done || y < LY - 42 || y > LY + 46 || x < X0 - 20 || x > X1 + 20) return;
        choice = clamp(Math.round(((x - X0) / (X1 - X0)) * MAX), 0, MAX);
        if (choice === b) {
          solved++;
          api.sfx("good");
          api.burst(x, LY - 20, "#22c55e", 8);
          api.haptic(5);
          advance();
        } else {
          timeLeft = Math.max(0.4, timeLeft - 2);
          api.sfx("bad");
          api.shake(5);
          api.haptic(12);
        }
      }

      ask();
      return { update: update, draw: draw, tap: tap };
    },
  });
})();
