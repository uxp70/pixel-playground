/* Neon Worm — the old trail fades, so you can cut back through it. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, rr = K.roundRect;
  var MODE = { name: "Neon Worm", level: 6, hudA: "Score", hudB: "Length", pattern: "rain" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var cols = 15, rows = 15, cell = W / cols, stepTime = 0.19;
      var trailLife = 2.2;
      var snake = [
        { x: 7, y: 7, age: 0 },
        { x: 6, y: 7, age: stepTime },
        { x: 5, y: 7, age: stepTime * 2 },
      ];
      var dir = { x: 1, y: 0 }, queued = [];
      var food = { x: 11, y: 7 };
      var score = 0, acc = 0, done = false;

      function occupied(x, y) {
        for (var i = 0; i < snake.length; i++) if (snake[i].x === x && snake[i].y === y) return true;
        return food.x === x && food.y === y;
      }

      function place() {
        var guard = 0;
        do {
          food = { x: Math.floor(rand(0, cols)), y: Math.floor(rand(0, rows)) };
        } while (occupied(food.x, food.y) && guard++ < 220);
      }

      function turn(x, y) {
        var last = queued.length ? queued[queued.length - 1] : dir;
        if (last.x === -x && last.y === -y) return;
        if (last.x === x && last.y === y) return;
        if (queued.length < 2) queued.push({ x: x, y: y });
      }

      function die() {
        if (done) return;
        done = true;
        api.sfx("bad");
        api.shake(10);
        api.haptic([25, 50, 35]);
        api.finish(score);
      }

      function tick() {
        if (queued.length) dir = queued.shift();
        for (var a = 0; a < snake.length; a++) snake[a].age += stepTime;
        var head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
        if (head.x < 0 || head.y < 0 || head.x >= cols || head.y >= rows) { die(); return; }
        for (var i = 0; i < snake.length; i++) {
          if (snake[i].age < trailLife && snake[i].x === head.x && snake[i].y === head.y) { die(); return; }
        }
        var ate = head.x === food.x && head.y === food.y;
        snake.unshift({ x: head.x, y: head.y, age: 0 });
        if (ate) {
          score += 10;
          api.sfx("good");
          api.burst(head.x * cell + cell / 2, head.y * cell + cell / 2, api.accent, 8);
          place();
        } else snake.pop();
      }

      function update(dt) {
        if (done) return;
        acc += dt;
        var guard = 0;
        while (acc >= stepTime && guard < 3) {
          acc -= stepTime;
          tick();
          guard++;
          if (done) return;
        }
        api.hud(score, snake.length + " long");
      }

      function draw() {
        api.bg();
        ctx.fillStyle = "#f87171";
        ctx.beginPath();
        ctx.arc(food.x * cell + cell / 2, food.y * cell + cell / 2, cell * 0.28, 0, Math.PI * 2);
        ctx.fill();
        for (var i = snake.length - 1; i >= 0; i--) {
          var seg = snake[i];
          var solid = seg.age < trailLife;
          ctx.globalAlpha = i === 0 ? 1 : solid ? Math.max(0.35, 0.9 - seg.age * 0.18) : 0.14;
          ctx.fillStyle = i === 0 ? "#f8fafc" : solid ? "#22d3ee" : "#0e7490";
          rr(ctx, seg.x * cell + 2, seg.y * cell + 2, cell - 4, cell - 4, 5);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        api.text("OLD TRAIL FADES — CUT THROUGH IT", W / 2, H - 22, 12, "rgba(255,255,255,0.3)");
      }

      function key(code) {
        if (code === "ArrowUp" || code === "KeyW") turn(0, -1);
        if (code === "ArrowDown" || code === "KeyS") turn(0, 1);
        if (code === "ArrowLeft" || code === "KeyA") turn(-1, 0);
        if (code === "ArrowRight" || code === "KeyD") turn(1, 0);
      }

      return { update: update, draw: draw, key: key, swipe: function (dx, dy) { turn(dx, dy); } };
    },
  });
})();
