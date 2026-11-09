/* Wire Snake — three loose sparks roam the board. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, rr = K.roundRect;
  var MODE = { name: "Wire Snake", level: 9, hudA: "Score", hudB: "Length", pattern: "scan" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var cols = 15, rows = 15, cell = W / cols, stepTime = 0.2;
      var snake = [{ x: 7, y: 7 }, { x: 6, y: 7 }, { x: 5, y: 7 }];
      var dir = { x: 1, y: 0 }, queued = [], food = { x: 11, y: 7 };
      var sparks = [], score = 0, acc = 0;

      function occupied(x, y) {
        for (var i = 0; i < snake.length; i++) if (snake[i].x === x && snake[i].y === y) return true;
        return food.x === x && food.y === y;
      }

      function place() {
        var guard = 0;
        do { food = { x: Math.floor(rand(0, cols)), y: Math.floor(rand(0, rows)) }; }
        while (occupied(food.x, food.y) && guard++ < 220);
      }

      for (var i = 0; i < 3; i++) {
        sparks.push({ x: Math.floor(rand(2, cols - 2)), y: Math.floor(rand(2, rows - 2)), vx: Math.random() < 0.5 ? -1 : 1, vy: 0 });
      }

      function turn(x, y) {
        var last = queued.length ? queued[queued.length - 1] : dir;
        if (last.x === -x && last.y === -y) return;
        if (last.x === x && last.y === y) return;
        if (queued.length < 2) queued.push({ x: x, y: y });
      }

      function die() {
        api.sfx("bad");
        api.shake(11);
        api.haptic([25, 50, 35]);
        api.finish(score);
      }

      function tick() {
        if (queued.length) dir = queued.shift();
        var head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
        if (head.x < 0 || head.y < 0 || head.x >= cols || head.y >= rows) { die(); return; }
        for (var s = 0; s < sparks.length; s++) {
          if (sparks[s].x === head.x && sparks[s].y === head.y) { die(); return; }
        }
        for (var i = 0; i < snake.length - 1; i++) {
          if (snake[i].x === head.x && snake[i].y === head.y) { die(); return; }
        }
        var ate = head.x === food.x && head.y === food.y;
        snake.unshift(head);
        if (ate) {
          score += 10;
          api.sfx("good");
          api.burst(head.x * cell + cell / 2, head.y * cell + cell / 2, api.accent, 7);
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
        for (var s = 0; s < sparks.length; s++) {
          var spark = sparks[s];
          if (Math.random() < dt * 1.5) {
            spark.x = Math.max(1, Math.min(cols - 2, spark.x + (Math.random() < 0.5 ? -1 : 1)));
            spark.y = Math.max(1, Math.min(rows - 2, spark.y + (Math.random() < 0.5 ? -1 : 1)));
          }
          if (spark.x === snake[0].x && spark.y === snake[0].y) { die(); return; }
        }
        api.hud(score, snake.length + " long");
      }

      function draw() {
        api.bg();
        var i;
        for (i = 0; i < sparks.length; i++) {
          ctx.fillStyle = "#ef4444";
          ctx.beginPath();
          ctx.arc(sparks[i].x * cell + cell / 2, sparks[i].y * cell + cell / 2, cell * 0.3, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "rgba(255,255,255,0.5)";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        ctx.fillStyle = "#fbbf24";
        ctx.beginPath();
        ctx.arc(food.x * cell + cell / 2, food.y * cell + cell / 2, cell * 0.28, 0, Math.PI * 2);
        ctx.fill();
        for (i = snake.length - 1; i >= 0; i--) {
          ctx.globalAlpha = i === 0 ? 1 : Math.max(0.25, 1 - i / (snake.length + 4));
          ctx.fillStyle = i === 0 ? "#f8fafc" : "#4ade80";
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
