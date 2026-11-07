/* Snake family — eleven serpent games with different boards and threats. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, clamp = K.clamp, rr = K.roundRect;

  var MODES = [
    { name: "Thread Snake", kind: "classic", hudA: "Score", hudB: "Length", pattern: "grid" },
    { name: "Circuit Worm", kind: "walls", hudA: "Score", hudB: "Length", pattern: "bricks" },
    { name: "Glow Worm", kind: "wrap", hudA: "Score", hudB: "Length", pattern: "stars" },
    { name: "Trail Twist", kind: "speed", hudA: "Score", hudB: "Length", pattern: "dots" },
    { name: "Loop Snake", kind: "portals", hudA: "Score", hudB: "Length", pattern: "beams" },
    { name: "Neon Worm", kind: "food", hudA: "Score", hudB: "Length", pattern: "rain" },
    { name: "Coil", kind: "shrink", hudA: "Score", hudB: "Arena", pattern: "bands" },
    { name: "Ribbon Run", kind: "decay", hudA: "Score", hudB: "Length", pattern: "waves" },
    { name: "Wire Snake", kind: "hazards", hudA: "Score", hudB: "Length", pattern: "scan" },
    { name: "Tail Chase", kind: "chase", hudA: "Score", hudB: "Length", pattern: "dots" },
    { name: "Serpent Loop", kind: "chaos", hudA: "Score", hudB: "Length", pattern: "stars" },
  ];

  function make(api) {
    var m = api.mode;
    var kind = m.kind;
    var ctx = api.ctx;
    var cols = 15;
    var rows = 15;
    var cell = W / cols;
    var stepTime = 0.19;
    var snake = [{ x: 7, y: 7 }, { x: 6, y: 7 }, { x: 5, y: 7 }];
    var dir = { x: 1, y: 0 };
    var queued = [];
    var foods = [{ x: 11, y: 7, gold: false, ttl: 0 }];
    var score = 0;
    var acc = 0;
    var walls = [];
    var portals = [];
    var hazards = [];
    var ai = null;
    var shrinkAt = 0;
    var clock = 0;

    function occupied(x, y) {
      for (var i = 0; i < snake.length; i++) if (snake[i].x === x && snake[i].y === y) return true;
      for (var w = 0; w < walls.length; w++) if (walls[w].x === x && walls[w].y === y) return true;
      for (var f = 0; f < foods.length; f++) if (foods[f].x === x && foods[f].y === y) return true;
      return false;
    }

    function freeCell() {
      var guard = 0;
      while (guard++ < 400) {
        var x = Math.floor(rand(0, cols));
        var y = Math.floor(rand(0, rows));
        if (!occupied(x, y)) return { x: x, y: y };
      }
      return { x: 1, y: 1 };
    }

    function placeFood(gold) {
      var spot = freeCell();
      foods.push({ x: spot.x, y: spot.y, gold: !!gold, ttl: kind === "decay" ? 7 : 0 });
    }

    if (kind === "walls" || kind === "chaos") {
      for (var i = 0; i < 18; i++) {
        var wx = Math.floor(rand(1, cols - 1));
        var wy = Math.floor(rand(1, rows - 1));
        if (Math.abs(wx - 7) + Math.abs(wy - 7) > 4) walls.push({ x: wx, y: wy });
      }
    }
    if (kind === "portals" || kind === "chaos") portals = [{ x: 0, y: 4 }, { x: cols - 1, y: 10 }];
    if (kind === "hazards" || kind === "chaos") {
      for (var h = 0; h < 3; h++) hazards.push({ x: rand(2, cols - 2), y: rand(2, rows - 2), vx: Math.random() < 0.5 ? -1 : 1, vy: 0 });
    }
    if (kind === "chase") {
      ai = [{ x: 3, y: 3 }, { x: 2, y: 3 }, { x: 1, y: 3 }];
    }

    if (kind === "decay") { placeFood(true); }

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

      if (portals.length) {
        for (var p = 0; p < portals.length; p++) {
          if (head.x === portals[p].x && head.y === portals[p].y) {
            head.x = portals[1 - p].x;
            head.y = portals[1 - p].y;
            api.sfx("pick");
          }
        }
      }

      if (kind === "wrap" || kind === "chaos") {
        head.x = (head.x + cols) % cols;
        head.y = (head.y + rows) % rows;
      } else if (head.x < 0 || head.y < 0 || head.x >= cols || head.y >= rows) {
        die();
        return;
      }

      for (var w = 0; w < walls.length; w++) {
        if (walls[w].x === head.x && walls[w].y === head.y) { die(); return; }
      }
      for (var hz = 0; hz < hazards.length; hz++) {
        if (hazards[hz].x === head.x && hazards[hz].y === head.y) { die(); return; }
      }
      if (ai) {
        for (var a = 0; a < ai.length; a++) {
          if (ai[a].x === head.x && ai[a].y === head.y) { die(); return; }
        }
      }
      for (var i = 0; i < snake.length - 1; i++) {
        if (snake[i].x === head.x && snake[i].y === head.y) { die(); return; }
      }

      var ate = -1;
      for (var f = 0; f < foods.length; f++) {
        if (foods[f].x === head.x && foods[f].y === head.y) { ate = f; break; }
      }
      snake.unshift(head);
      if (ate >= 0) {
        var food = foods[ate];
        var gain = food.gold ? 30 : 10;
        if (kind === "food" && food.gold) gain = 40;
        score += gain;
        api.sfx("good");
        api.burst(head.x * cell + cell / 2, head.y * cell + cell / 2, api.accent, 8);
        api.haptic(6);
        foods.splice(ate, 1);
        if (!foods.length) placeFood(kind === "decay" ? true : Math.random() < 0.18);
        if (kind === "speed") stepTime = Math.max(0.07, stepTime - 0.006);
        if (kind === "shrink" && ++shrinkAt >= 4) {
          shrinkAt = 0;
          var edge = Math.floor(rand(0, 4));
          for (var e = 0; e < cols; e++) {
            if (edge === 0) walls.push({ x: e, y: 0 });
            if (edge === 1) walls.push({ x: e, y: rows - 1 });
            if (edge === 2) walls.push({ x: 0, y: e });
            if (edge === 3) walls.push({ x: cols - 1, y: e });
          }
        }
      } else {
        snake.pop();
      }
    }

    function update(dt) {
      clock += dt;
      acc += dt;
      var guard = 0;
      while (acc >= stepTime && guard < 3) {
        acc -= stepTime;
        tick();
        guard++;
        if (api.ended) return;
      }
      for (var f = foods.length - 1; f >= 0; f--) {
        if (foods[f].ttl) {
          foods[f].ttl -= dt;
          if (foods[f].ttl <= 0) { foods.splice(f, 1); if (!foods.length) placeFood(true); }
        }
      }
      for (var h = 0; h < hazards.length; h++) {
        if (Math.random() < dt * 1.4) {
          hazards[h].x = clamp(hazards[h].x + (Math.random() < 0.5 ? -1 : 1), 1, cols - 2);
          hazards[h].y = clamp(hazards[h].y + (Math.random() < 0.5 ? -1 : 1), 1, rows - 2);
        }
      }
      if (ai) {
        var target = foods[0] || { x: cols / 2, y: rows / 2 };
        var ah = ai[0];
        var dx = target.x - ah.x;
        var dy = target.y - ah.y;
        var nx = ah.x + (Math.abs(dx) > Math.abs(dy) ? Math.sign(dx) : 0);
        var ny = ah.y + (Math.abs(dx) > Math.abs(dy) ? 0 : Math.sign(dy));
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) { nx = ah.x; ny = ah.y; }
        ai.unshift({ x: nx, y: ny });
        ai.pop();
      }
      api.hud(score, snake.length + " long");
    }

    function draw() {
      api.bg();
      var i;
      ctx.strokeStyle = "rgba(255,255,255,0.035)";
      ctx.lineWidth = 1;
      for (i = 1; i < cols; i++) {
        ctx.beginPath(); ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, H); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i * cell); ctx.lineTo(W, i * cell); ctx.stroke();
      }
      ctx.fillStyle = "rgba(255,255,255,0.13)";
      for (i = 0; i < walls.length; i++) {
        rr(ctx, walls[i].x * cell + 2, walls[i].y * cell + 2, cell - 4, cell - 4, 4); ctx.fill();
      }
      if (portals.length) {
        for (i = 0; i < 2; i++) {
          ctx.strokeStyle = api.accent;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(portals[i].x * cell + cell / 2, portals[i].y * cell + cell / 2, cell * 0.38, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      for (i = 0; i < foods.length; i++) {
        ctx.fillStyle = foods[i].gold ? "#fbbf24" : "#f87171";
        ctx.beginPath();
        ctx.arc(foods[i].x * cell + cell / 2, foods[i].y * cell + cell / 2, cell * (foods[i].gold ? 0.36 : 0.28), 0, Math.PI * 2);
        ctx.fill();
      }
      for (i = 0; i < hazards.length; i++) {
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.arc(hazards[i].x * cell + cell / 2, hazards[i].y * cell + cell / 2, cell * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      if (ai) {
        for (i = ai.length - 1; i >= 0; i--) {
          ctx.globalAlpha = Math.max(0.25, 1 - i / (ai.length + 3));
          ctx.fillStyle = "#a78bfa";
          rr(ctx, ai[i].x * cell + 3, ai[i].y * cell + 3, cell - 6, cell - 6, 4); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      for (var s = snake.length - 1; s >= 0; s--) {
        ctx.fillStyle = s === 0 ? "#f8fafc" : api.accent;
        ctx.globalAlpha = s === 0 ? 1 : Math.max(0.3, 1 - s / (snake.length + 4));
        rr(ctx, snake[s].x * cell + 2, snake[s].y * cell + 2, cell - 4, cell - 4, 5); ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (kind === "coil") api.text("ARENA " + Math.max(1, 15 - walls.length / 15 | 0), W / 2, 36, 14, "rgba(255,255,255,0.4)");
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
  }

  K.register("snakey", { modes: MODES, make: make });
})();
