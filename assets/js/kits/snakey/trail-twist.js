/* Trail Twist — the controls mirror every third meal, and crossing your trail cuts the tail off. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rr = K.roundRect;

  var MODE = {
    name: "Trail Twist", level: 4, hudA: "Score", hudB: "Length", pattern: "dots",
    controls: "Arrows, WASD or swipe — controls mirror every third meal",
  };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var N = 15, CELL = W / N;
      var body = [112, 111, 110];
      var dir = { x: 1, y: 0 };
      var pending = null;
      var food = 116;
      var score = 0, cuts = 0, meals = 0, twist = false, acc = 0, step = 0.19;
      var done = false, flash = 0;

      function xOf(i) { return i % N; }
      function yOf(i) { return Math.floor(i / N); }

      function occupied(i) {
        for (var k = 0; k < body.length; k++) if (body[k] === i) return true;
        return false;
      }

      function place() {
        var free = [];
        for (var i = 0; i < N * N; i++) if (i !== food && !occupied(i)) free.push(i);
        if (free.length) food = free[Math.floor(Math.random() * free.length)];
      }

      function end() {
        if (done) return;
        done = true;
        api.sfx("bad");
        api.shake(10);
        api.haptic([24, 45, 30]);
        api.finish(score);
      }

      function turn(dx, dy) {
        if (pending) return;
        if (twist) dx = -dx;
        if (dx === -dir.x && dy === -dir.y) return;
        if (dx === dir.x && dy === dir.y) return;
        pending = { x: dx, y: dy };
      }

      function tick() {
        if (pending) { dir = pending; pending = null; }
        var hx = xOf(body[0]) + dir.x;
        var hy = yOf(body[0]) + dir.y;
        if (hx < 0 || hy < 0 || hx >= N || hy >= N) { end(); return; }

        var next = hy * N + hx;
        var ate = next === food;
        var limit = body.length - (ate ? 0 : 1);
        var hit = -1;
        for (var k = 1; k < limit; k++) if (body[k] === next) { hit = k; break; }

        if (hit > 0) {
          body = [next].concat(body.slice(0, hit));
          cuts++;
          score = Math.max(0, score - 5);
          flash = 0.45;
          api.sfx("bad");
          api.shake(6);
          api.haptic(14);
          if (body.length < 4) { end(); return; }
          return;
        }

        body.unshift(next);
        if (ate) {
          score += 10;
          meals++;
          if (meals % 3 === 0) {
            twist = !twist;
            api.sfx("win");
          } else {
            api.sfx("good");
          }
          api.haptic(4);
          api.burst(hx * CELL + CELL / 2, hy * CELL + CELL / 2, api.accent, 8);
          place();
        } else {
          body.pop();
        }
      }

      function update(dt) {
        if (done) return;
        flash = Math.max(0, flash - dt);
        acc += dt;
        var moved = 0;
        while (acc >= step && moved < 3) {
          acc -= step;
          tick();
          moved++;
          if (done) return;
        }
        api.hud(score, body.length + " long");
      }

      function draw() {
        api.bg();
        ctx.strokeStyle = "rgba(255,255,255,0.045)";
        ctx.lineWidth = 1;
        for (var g = 1; g < N; g++) {
          ctx.beginPath(); ctx.moveTo(g * CELL, 0); ctx.lineTo(g * CELL, H); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(0, g * CELL); ctx.lineTo(W, g * CELL); ctx.stroke();
        }

        var fx = xOf(food) * CELL + CELL / 2;
        var fy = yOf(food) * CELL + CELL / 2;
        ctx.fillStyle = "rgba(251,191,36,0.32)";
        ctx.beginPath(); ctx.arc(fx, fy, CELL * 0.28, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#fbbf24";
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(fx, fy, CELL * 0.28, 0, Math.PI * 2); ctx.stroke();

        for (var i = body.length - 1; i >= 0; i--) {
          var t = i / Math.max(1, body.length);
          ctx.globalAlpha = i === 0 ? 1 : Math.max(0.28, 0.95 - 0.6 * t);
          ctx.fillStyle = i === 0 ? "#f8fafc" : (twist ? "#c084fc" : "#2dd4bf");
          rr(ctx, xOf(body[i]) * CELL + 2, yOf(body[i]) * CELL + 2, CELL - 4, CELL - 4, i === 0 ? 8 : 5);
          ctx.fill();
        }
        ctx.globalAlpha = 1;

        if (flash > 0) {
          ctx.globalAlpha = Math.min(1, flash * 2);
          api.text("CUT!", W / 2, H / 2, 44, "#f87171");
          ctx.globalAlpha = 1;
        }
        api.text(twist ? "CONTROLS MIRRORED" : "CONTROLS NORMAL", W / 2, 34, 13,
          twist ? "rgba(192,132,252,0.85)" : "rgba(255,255,255,0.3)");
        api.text(cuts + " cuts", W / 2, H - 18, 12, "rgba(255,255,255,0.26)");
      }

      function key(code) {
        if (code === "ArrowUp" || code === "KeyW") turn(0, -1);
        if (code === "ArrowDown" || code === "KeyS") turn(0, 1);
        if (code === "ArrowLeft" || code === "KeyA") turn(-1, 0);
        if (code === "ArrowRight" || code === "KeyD") turn(1, 0);
      }

      return {
        update: update,
        draw: draw,
        key: key,
        swipe: function (dx, dy) { turn(dx, dy); },
      };
    },
  });
})();
