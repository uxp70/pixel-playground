/* Coil — the arena closes in every fourth meal. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, rr = K.roundRect;
  var MODE = { name: "Coil", level: 7, hudA: "Score", hudB: "Arena", pattern: "bands" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var cols = 15, rows = 15, cell = W / cols, stepTime = 0.2;
      var snake = [{ x: 7, y: 7 }, { x: 6, y: 7 }, { x: 5, y: 7 }];
      var dir = { x: 1, y: 0 }, queued = [], food = { x: 11, y: 7 };
      var walls = [], score = 0, acc = 0, eaten = 0, ring = 0;

      function occupied(x, y) {
        for (var i = 0; i < snake.length; i++) if (snake[i].x === x && snake[i].y === y) return true;
        for (var w = 0; w < walls.length; w++) if (walls[w].x === x && walls[w].y === y) return true;
        return food.x === x && food.y === y;
      }

      function place() {
        var guard = 0;
        do { food = { x: Math.floor(rand(1, cols - 1)), y: Math.floor(rand(1, rows - 1)) }; }
        while (occupied(food.x, food.y) && guard++ < 250);
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

      function shrink() {
        var edge = ring % 4;
        for (var e = 0; e < cols; e++) {
          if (edge === 0) walls.push({ x: e, y: ring });
          if (edge === 1) walls.push({ x: e, y: rows - 1 - ring });
          if (edge === 2) walls.push({ x: ring, y: e });
          if (edge === 3) walls.push({ x: cols - 1 - ring, y: e });
        }
        ring++;
      }

      function tick() {
        if (queued.length) dir = queued.shift();
        var head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
        if (head.x < 0 || head.y < 0 || head.x >= cols || head.y >= rows) { die(); return; }
        for (var w = 0; w < walls.length; w++) {
          if (walls[w].x === head.x && walls[w].y === head.y) { die(); return; }
        }
        for (var i = 0; i < snake.length - 1; i++) {
          if (snake[i].x === head.x && snake[i].y === head.y) { die(); return; }
        }
        var ate = head.x === food.x && head.y === food.y;
        snake.unshift(head);
        if (ate) {
          score += 10;
          eaten++;
          api.sfx("good");
          api.burst(head.x * cell + cell / 2, head.y * cell + cell / 2, api.accent, 7);
          place();
          if (eaten % 4 === 0) shrink();
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
        api.hud(score, Math.max(1, 15 - ring * 2) + " wide");
      }

      function draw() {
        api.bg();
        var i;
        ctx.fillStyle = "rgba(255,255,255,0.15)";
        for (i = 0; i < walls.length; i++) {
          rr(ctx, walls[i].x * cell + 1, walls[i].y * cell + 1, cell - 2, cell - 2, 3);
          ctx.fill();
        }
        ctx.fillStyle = "#f87171";
        ctx.beginPath();
        ctx.arc(food.x * cell + cell / 2, food.y * cell + cell / 2, cell * 0.28, 0, Math.PI * 2);
        ctx.fill();
        for (i = snake.length - 1; i >= 0; i--) {
          ctx.globalAlpha = i === 0 ? 1 : Math.max(0.25, 1 - i / (snake.length + 4));
          ctx.fillStyle = i === 0 ? "#f8fafc" : "#fb923c";
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
