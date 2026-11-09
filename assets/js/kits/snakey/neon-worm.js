/* Neon Worm — occasional gold food is worth four normal meals. Standalone cabinet. */
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
      var snake = [{ x: 7, y: 7 }, { x: 6, y: 7 }, { x: 5, y: 7 }];
      var dir = { x: 1, y: 0 }, queued = [];
      var food = { x: 11, y: 7, gold: false };
      var score = 0, acc = 0;

      function occupied(x, y) {
        for (var i = 0; i < snake.length; i++) if (snake[i].x === x && snake[i].y === y) return true;
        return food.x === x && food.y === y;
      }

      function place() {
        var guard = 0;
        do {
          food = { x: Math.floor(rand(0, cols)), y: Math.floor(rand(0, rows)), gold: Math.random() < 0.24 };
        } while (occupied(food.x, food.y) && guard++ < 220);
      }

      function turn(x, y) {
        var last = queued.length ? queued[queued.length - 1] : dir;
        if (last.x === -x && last.y === -y) return;
        if (last.x === x && last.y === y) return;
        if (queued.length < 2) queued.push({ x: x, y: y });
      }

      function die() {
        api.sfx("bad");
        api.shake(10);
        api.haptic([25, 50, 35]);
        api.finish(score);
      }

      function tick() {
        if (queued.length) dir = queued.shift();
        var head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
        if (head.x < 0 || head.y < 0 || head.x >= cols || head.y >= rows) { die(); return; }
        for (var i = 0; i < snake.length - 1; i++) {
          if (snake[i].x === head.x && snake[i].y === head.y) { die(); return; }
        }
        var ate = head.x === food.x && head.y === food.y;
        snake.unshift(head);
        if (ate) {
          score += food.gold ? 40 : 10;
          api.sfx(food.gold ? "win" : "good");
          api.burst(head.x * cell + cell / 2, head.y * cell + cell / 2, food.gold ? "#fbbf24" : api.accent, food.gold ? 12 : 7);
          place();
        } else snake.pop();
      }

      function update(dt) {
        acc += dt;
        var guard = 0;
        while (acc >= stepTime && guard < 3) {
          acc -= stepTime;
          tick();
          guard++;
          if (api.ended) return;
        }
        api.hud(score, snake.length + " long");
      }

      function draw() {
        api.bg();
        var i;
        ctx.fillStyle = food.gold ? "#fbbf24" : "#f87171";
        ctx.beginPath();
        ctx.arc(food.x * cell + cell / 2, food.y * cell + cell / 2, cell * (food.gold ? 0.36 : 0.28), 0, Math.PI * 2);
        ctx.fill();
        if (food.gold) {
          ctx.strokeStyle = "rgba(255,255,255,0.7)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(food.x * cell + cell / 2, food.y * cell + cell / 2, cell * 0.46, 0, Math.PI * 2);
          ctx.stroke();
        }
        for (i = snake.length - 1; i >= 0; i--) {
          ctx.globalAlpha = i === 0 ? 1 : Math.max(0.25, 1 - i / (snake.length + 4));
          ctx.fillStyle = i === 0 ? "#f8fafc" : "#22d3ee";
          rr(ctx, snake[i].x * cell + 2, snake[i].y * cell + 2, cell - 4, cell - 4, 5);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
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
