/* Tail Chase — a rival snake hunts the same food. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, rr = K.roundRect;
  var MODE = { name: "Tail Chase", level: 10, hudA: "Score", hudB: "Length", pattern: "dots" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var cols = 15, rows = 15, cell = W / cols, stepTime = 0.2;
      var snake = [{ x: 7, y: 7 }, { x: 6, y: 7 }, { x: 5, y: 7 }];
      var rival = [{ x: 3, y: 3 }, { x: 2, y: 3 }, { x: 1, y: 3 }];
      var dir = { x: 1, y: 0 }, queued = [], food = { x: 11, y: 7 };
      var score = 0, acc = 0;

      function occupied(x, y) {
        for (var i = 0; i < snake.length; i++) if (snake[i].x === x && snake[i].y === y) return true;
        for (var r = 0; r < rival.length; r++) if (rival[r].x === x && rival[r].y === y) return true;
        return food.x === x && food.y === y;
      }

      function place() {
        var guard = 0;
        do { food = { x: Math.floor(rand(0, cols)), y: Math.floor(rand(0, rows)) }; }
        while (occupied(food.x, food.y) && guard++ < 260);
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
        for (var r = 0; r < rival.length; r++) {
          if (rival[r].x === head.x && rival[r].y === head.y) { die(); return; }
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

      function moveRival() {
        var target = food;
        var ah = rival[0];
        var dx = target.x - ah.x;
        var dy = target.y - ah.y;
        var nx = ah.x + (Math.abs(dx) > Math.abs(dy) ? Math.sign(dx) : 0);
        var ny = ah.y + (Math.abs(dx) > Math.abs(dy) ? 0 : Math.sign(dy));
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) { nx = ah.x; ny = ah.y; }
        rival.unshift({ x: nx, y: ny });
        rival.pop();
        if (nx === food.x && ny === food.y) { place(); }
      }

      function update(dt) {
        acc += dt;
        var guard = 0;
        while (acc >= stepTime && guard < 3) {
          acc -= stepTime;
          tick();
          if (api.ended) return;
          moveRival();
          guard++;
        }
        api.hud(score, snake.length + " long");
      }

      function draw() {
        api.bg();
        var i;
        ctx.fillStyle = "#f87171";
        ctx.beginPath();
        ctx.arc(food.x * cell + cell / 2, food.y * cell + cell / 2, cell * 0.28, 0, Math.PI * 2);
        ctx.fill();
        for (i = rival.length - 1; i >= 0; i--) {
          ctx.globalAlpha = Math.max(0.3, 1 - i / (rival.length + 3));
          ctx.fillStyle = "#a78bfa";
          rr(ctx, rival[i].x * cell + 3, rival[i].y * cell + 3, cell - 6, cell - 6, 5);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        for (i = snake.length - 1; i >= 0; i--) {
          ctx.globalAlpha = i === 0 ? 1 : Math.max(0.3, 1 - i / (snake.length + 4));
          ctx.fillStyle = i === 0 ? "#f8fafc" : api.accent;
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
