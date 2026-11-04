/* Ten small engines behind the 110 generated games on play.html.
   Each kit draws to a 600x600 logical canvas through one little api:
   ctx, level, accent, elapsed, keys, ended,
   hud(a, b), bg(c1, c2), text(str, x, y, size, color),
   burst(x, y, color, n), shake(px), sfx(kind), haptic(pattern), finish(score). */
(function () {
  "use strict";

  var W = 600;
  var H = 600;

  function rand(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function near(x1, y1, r1, x2, y2, r2) {
    var dx = x1 - x2;
    var dy = y1 - y2;
    var reach = r1 + r2;
    return dx * dx + dy * dy <= reach * reach;
  }

  function roundRect(ctx, x, y, w, h, r) {
    var rad = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
  }

  var KITS = {};

  /* ------------------------------------------------------------------- tap --- */
  /* Glowing targets pop up, you hit them, duds cost two. Twenty seconds. */

  KITS.tap = {
    make: function (api) {
      var level = api.level;
      var lifeSpan = Math.max(0.62, 1.5 - level * 0.075);
      var spawnGap = Math.max(0.26, 0.8 - level * 0.045);
      var dudChance = level >= 3 ? Math.min(0.32, (level - 2) * 0.04) : 0;
      var duration = 20;
      var targets = [];
      var hits = 0;
      var clock = 0;
      var next = 0.35;

      function add() {
        targets.push({
          x: rand(60, W - 60),
          y: rand(90, H - 60),
          r: rand(24, 37),
          age: 0,
          life: lifeSpan * rand(0.85, 1.25),
          dud: Math.random() < dudChance,
        });
      }

      return {
        update: function (dt) {
          clock += dt;
          if (clock >= duration) { api.finish(hits); return; }
          next -= dt;
          if (next <= 0) { next = spawnGap; add(); }
          for (var i = targets.length - 1; i >= 0; i--) {
            targets[i].age += dt;
            if (targets[i].age > targets[i].life) targets.splice(i, 1);
          }
          api.hud(hits, Math.max(0, Math.ceil(duration - clock)) + "s");
        },
        draw: function () {
          var ctx = api.ctx;
          api.bg("#1b0f2e", "#0a0d1d");
          for (var i = 0; i < targets.length; i++) {
            var t = targets[i];
            var k = 1 - t.age / t.life;
            ctx.globalAlpha = 0.25 + k * 0.75;
            ctx.fillStyle = t.dud ? "#3f4756" : api.accent;
            ctx.beginPath();
            ctx.arc(t.x, t.y, t.r * (0.55 + k * 0.45), 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
          }
          if (clock < 1) api.text("TAP", W / 2, H / 2, 46, "rgba(255,255,255,0.16)");
        },
        tap: function (x, y) {
          for (var i = targets.length - 1; i >= 0; i--) {
            var t = targets[i];
            if (!near(x, y, 2, t.x, t.y, t.r)) continue;
            targets.splice(i, 1);
            if (t.dud) {
              hits = Math.max(0, hits - 2);
              api.sfx("bad");
              api.shake(6);
              api.haptic(18);
            } else {
              hits++;
              api.sfx("pick");
              api.burst(t.x, t.y, api.accent, 8);
              api.haptic(6);
            }
            return;
          }
        },
      };
    },
  };

  /* ----------------------------------------------------------------- dodge --- */
  /* Slide along the floor, stay clear of the falling shards, last as long. */

  KITS.dodge = {
    make: function (api) {
      var keys = api.keys;
      var level = api.level;
      var px = W / 2;
      var pr = 17;
      var fall = 150 + level * 26;
      var gap = Math.max(0.2, 0.6 - level * 0.032);
      var shards = [];
      var spawn = 0.7;
      var clock = 0;
      var passed = 0;

      return {
        update: function (dt) {
          clock += dt;
          if (keys.ArrowLeft || keys.KeyA) px -= 360 * dt;
          if (keys.ArrowRight || keys.KeyD) px += 360 * dt;
          px = clamp(px, pr, W - pr);

          spawn -= dt;
          if (spawn <= 0) {
            spawn = gap * rand(0.75, 1.3);
            shards.push({ x: rand(24, W - 24), y: -26, r: rand(11, 22), v: fall * rand(0.8, 1.3) });
          }

          for (var i = shards.length - 1; i >= 0; i--) {
            var s = shards[i];
            s.y += s.v * dt;
            if (s.y > H + 30) { shards.splice(i, 1); passed++; continue; }
            if (near(px, H - 40, pr, s.x, s.y, s.r)) {
              api.sfx("bad");
              api.shake(10);
              api.haptic([30, 60, 40]);
              api.finish(Math.round(clock));
              return;
            }
          }
          api.hud(Math.round(clock) + "s", passed + " dodged");
        },
        draw: function () {
          var ctx = api.ctx;
          api.bg("#071a1f", "#0a0d1d");
          ctx.strokeStyle = "rgba(255,255,255,0.06)";
          ctx.lineWidth = 2;
          for (var y = (clock * 90) % 60; y < H; y += 60) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(W, y);
            ctx.stroke();
          }
          ctx.fillStyle = "#ef8a5a";
          for (var i = 0; i < shards.length; i++) {
            var s = shards[i];
            ctx.beginPath();
            ctx.moveTo(s.x, s.y - s.r);
            ctx.lineTo(s.x + s.r, s.y + s.r * 0.7);
            ctx.lineTo(s.x - s.r, s.y + s.r * 0.7);
            ctx.closePath();
            ctx.fill();
          }
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(px, H - 40, pr, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = api.accent;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(px, H - 40, pr + 5, 0, Math.PI * 2);
          ctx.stroke();
        },
        move: function (x) { px = clamp(x, pr, W - pr); },
      };
    },
  };

  /* ----------------------------------------------------------------- catch --- */
  /* Scoop the falling orbs, let the bombs hit the floor. Thirty seconds. */

  KITS.catch = {
    make: function (api) {
      var level = api.level;
      var bx = W / 2;
      var bw = 96;
      var duration = 30;
      var items = [];
      var clock = 0;
      var spawn = 0.5;
      var caught = 0;
      var speed = 130 + level * 24;
      var bombChance = Math.min(0.42, 0.1 + level * 0.03);

      return {
        update: function (dt) {
          clock += dt;
          if (clock >= duration) { api.finish(caught); return; }

          spawn -= dt;
          if (spawn <= 0) {
            spawn = Math.max(0.22, 0.6 - level * 0.03) * rand(0.7, 1.3);
            var bomb = Math.random() < bombChance;
            items.push({
              x: rand(30, W - 30),
              y: -22,
              r: bomb ? 17 : 13,
              v: speed * rand(0.85, 1.25),
              bomb: bomb,
            });
          }

          for (var i = items.length - 1; i >= 0; i--) {
            var it = items[i];
            it.y += it.v * dt;
            var inBasket = it.y > H - 74 && it.y < H - 20 && Math.abs(it.x - bx) < bw / 2 + 10;
            if (inBasket) {
              items.splice(i, 1);
              if (it.bomb) {
                caught = Math.max(0, caught - 2);
                api.sfx("bad");
                api.shake(8);
                api.haptic(22);
              } else {
                caught++;
                api.sfx("good");
                api.burst(it.x, it.y, api.accent, 8);
                api.haptic(6);
              }
              continue;
            }
            if (it.y > H + 24) items.splice(i, 1);
          }
          api.hud(caught, Math.max(0, Math.ceil(duration - clock)) + "s");
        },
        draw: function () {
          var ctx = api.ctx;
          api.bg("#1c1408", "#0a0d1d");
          for (var i = 0; i < items.length; i++) {
            var it = items[i];
            ctx.fillStyle = it.bomb ? "#64748b" : api.accent;
            ctx.beginPath();
            ctx.arc(it.x, it.y, it.r, 0, Math.PI * 2);
            ctx.fill();
            if (it.bomb) {
              ctx.strokeStyle = "#f87171";
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.moveTo(it.x - 6, it.y - 6);
              ctx.lineTo(it.x + 6, it.y + 6);
              ctx.moveTo(it.x + 6, it.y - 6);
              ctx.lineTo(it.x - 6, it.y + 6);
              ctx.stroke();
            }
          }
          ctx.fillStyle = "#f8fafc";
          roundRect(ctx, bx - bw / 2, H - 78, bw, 52, 12);
          ctx.fill();
          ctx.fillStyle = api.accent;
          roundRect(ctx, bx - bw / 2 + 6, H - 72, bw - 12, 12, 6);
          ctx.fill();
        },
        move: function (x) { bx = clamp(x, bw / 2, W - bw / 2); },
      };
    },
  };

  /* ----------------------------------------------------------------- flash --- */
  /* A grid flashes a pattern; play it back and it grows by one. */

  KITS.flash = {
    make: function (api) {
      var gap = Math.max(0.3, 0.62 - api.level * 0.03);
      var size = 3;
      var cell = 130;
      var space = 12;
      var boardW = size * cell + (size - 1) * space;
      var bx = (W - boardW) / 2;
      var by = 140;
      var seq = [];
      var phase = "show";
      var showIndex = 0;
      var wait = 0.7;
      var lit = -1;
      var litFor = 0;
      var rounds = 0;

      function push() { seq.push(Math.floor(rand(0, size * size))); }
      push();
      push();
      push();

      function padRect(i) {
        return {
          x: bx + (i % size) * (cell + space),
          y: by + Math.floor(i / size) * (cell + space),
          w: cell,
          h: cell,
        };
      }

      return {
        update: function (dt) {
          if (litFor > 0) {
            litFor -= dt;
            if (litFor <= 0) { lit = -1; wait = gap; }
            return;
          }
          if (phase !== "show") { api.hud(rounds, "Your turn"); return; }
          if (wait > 0) {
            wait -= dt;
            api.hud(rounds, "Watch");
            return;
          }
          if (showIndex < seq.length) {
            lit = seq[showIndex];
            showIndex++;
            litFor = 0.34;
            api.sfx("pick");
            api.hud(rounds, "Watch");
            return;
          }
          phase = "input";
          showIndex = 0;
          lit = -1;
          api.hud(rounds, "Your turn");
        },
        draw: function () {
          var ctx = api.ctx;
          api.bg("#0d1226", "#080b16");
          for (var i = 0; i < size * size; i++) {
            var r = padRect(i);
            var on = lit === i;
            ctx.fillStyle = on ? api.accent : "rgba(255,255,255,0.07)";
            roundRect(ctx, r.x, r.y, r.w, r.h, 18);
            ctx.fill();
            if (on) {
              ctx.strokeStyle = "rgba(255,255,255,0.8)";
              ctx.lineWidth = 3;
              ctx.stroke();
            }
          }
          api.text(phase === "show" ? "WATCH" : "REPEAT", W / 2, 74, 26, "rgba(255,255,255,0.55)");
        },
        tap: function (x, y) {
          if (phase !== "input" || litFor > 0) return;
          for (var i = 0; i < size * size; i++) {
            var r = padRect(i);
            if (x < r.x || x > r.x + r.w || y < r.y || y > r.y + r.h) continue;
            if (seq[showIndex] !== i) {
              api.sfx("bad");
              api.shake(9);
              api.haptic([20, 45, 30]);
              api.finish(rounds);
              return;
            }
            lit = i;
            litFor = 0.16;
            api.sfx("pick");
            api.haptic(8);
            showIndex++;
            if (showIndex >= seq.length) {
              rounds++;
              push();
              phase = "show";
              showIndex = 0;
              wait = 0.75;
            }
            return;
          }
        },
        key: function (code) {
          var digit = /^Digit([1-9])$/.exec(code);
          if (!digit) return;
          var index = Number(digit[1]) - 1;
          var r = padRect(index);
          this.tap(r.x + r.w / 2, r.y + r.h / 2);
        },
      };
    },
  };

  /* ---------------------------------------------------------------- reflex --- */
  /* Five rounds. Tap the frame the panel flips; an early tap resets the wait. */

  KITS.reflex = {
    make: function (api) {
      var level = api.level;
      var rounds = 5;
      var times = [];
      var state = "wait";
      var goAt = 0;

      function delay() { return 0.9 + Math.random() * (2.4 - level * 0.1); }

      var wait = delay();

      return {
        update: function (dt) {
          if (state === "wait") {
            wait -= dt;
            if (wait <= 0) {
              state = "go";
              goAt = api.elapsed;
              api.sfx("pick");
              api.haptic(14);
            }
          }
          api.hud(times.length + " / " + rounds, state === "go" ? "TAP" : "wait");
        },
        draw: function () {
          var ctx = api.ctx;
          var going = state === "go";
          api.bg(going ? "#04351f" : "#2b0f1f", "#080b16");
          ctx.fillStyle = going ? api.accent : "rgba(255,255,255,0.1)";
          roundRect(ctx, 60, 150, W - 120, H - 300, 26);
          ctx.fill();
          api.text(going ? "NOW" : "WAIT", W / 2, H / 2 - 30, 64, going ? "#05130b" : "rgba(255,255,255,0.6)");
          if (times.length) {
            api.text(times[times.length - 1] + " ms", W / 2, H / 2 + 60, 30, going ? "#05130b" : "rgba(255,255,255,0.5)");
          }
        },
        tap: function () {
          if (state === "go") {
            var ms = Math.max(1, Math.round((api.elapsed - goAt) * 1000));
            times.push(ms);
            api.sfx("good");
            api.haptic(10);
            if (times.length >= rounds) {
              var sum = 0;
              for (var i = 0; i < times.length; i++) sum += times[i];
              api.finish(Math.round(sum / times.length));
              return;
            }
            state = "wait";
            wait = delay();
            return;
          }
          api.sfx("bad");
          api.shake(6);
          api.haptic(18);
          wait = delay();
        },
      };
    },
  };

  /* ----------------------------------------------------------------- stack --- */
  /* Drop the sliding floor as close to dead centre as you can. */

  KITS.stack = {
    make: function (api) {
      var level = api.level;
      var blockH = 26;
      var startW = Math.max(150, 260 - level * 8);
      var speed = 150 + level * 20;
      var blocks = [{ x: (W - startW) / 2, w: startW, y: H - 130 }];
      var cam = 0;
      var moving = spawn(blocks[0]);
      var floors = 0;

      function spawn(prev) {
        var fromLeft = blocks.length % 2 === 1;
        return {
          x: fromLeft ? 0 : W - prev.w,
          w: prev.w,
          y: prev.y - blockH,
          dir: fromLeft ? 1 : -1,
        };
      }

      return {
        update: function (dt) {
          moving.x += moving.dir * speed * dt;
          if (moving.x < 0) { moving.x = 0; moving.dir = 1; }
          if (moving.x + moving.w > W) { moving.x = W - moving.w; moving.dir = -1; }
          cam -= (Math.min(0, moving.y - H * 0.5) - cam) * Math.min(1, dt * 6);
          api.hud(floors + " floors", "tap to drop");
        },
        draw: function () {
          var ctx = api.ctx;
          api.bg("#101a2e", "#070a14");
          ctx.save();
          ctx.translate(0, cam * -1);
          for (var i = 0; i < blocks.length; i++) {
            var b = blocks[i];
            ctx.fillStyle = i === blocks.length - 1 ? api.accent : "rgba(148,163,184,0.55)";
            roundRect(ctx, b.x, b.y, b.w, blockH - 3, 6);
            ctx.fill();
          }
          ctx.fillStyle = "#f8fafc";
          roundRect(ctx, moving.x, moving.y, moving.w, blockH - 3, 6);
          ctx.fill();
          ctx.restore();
          api.text(floors + "", W / 2, H - 40, 40, "rgba(255,255,255,0.35)");
        },
        tap: function () {
          var top = blocks[blocks.length - 1];
          var left = Math.max(moving.x, top.x);
          var right = Math.min(moving.x + moving.w, top.x + top.w);
          var overlap = right - left;
          if (overlap <= 4) {
            api.sfx("bad");
            api.shake(10);
            api.haptic([20, 50, 30]);
            api.finish(floors);
            return;
          }
          var placed;
          if (Math.abs(moving.x - top.x) <= 7) {
            var grew = Math.min(startW, moving.w + 6);
            placed = { x: top.x + top.w / 2 - grew / 2, w: grew, y: moving.y };
            api.sfx("good");
            api.burst(placed.x + placed.w / 2, placed.y, api.accent, 12);
            api.haptic(10);
          } else {
            placed = { x: left, w: overlap, y: moving.y };
            api.sfx("pick");
            api.shake(2);
            api.haptic(5);
          }
          blocks.push(placed);
          floors++;
          moving = spawn(placed);
        },
        key: function (code) {
          if (code === "Space" || code === "Enter") this.tap();
        },
      };
    },
  };

  /* ------------------------------------------------------------------ quiz --- */
  /* Eight quick sums against a shrinking clock. */

  KITS.quiz = {
    make: function (api) {
      var level = api.level;
      var total = 8;
      var index = 0;
      var correct = 0;
      var timeLeft = 11;
      var paused = 0;
      var question = null;
      var picked = -1;
      var wasRight = false;

      function makeQuestion() {
        var span = 9 + level * 5;
        var a = 2 + Math.floor(rand(0, span));
        var b = 2 + Math.floor(rand(0, span));
        var op = "+";
        if (level >= 3 && Math.random() < 0.34) op = "-";
        if (level >= 5 && Math.random() < 0.32) op = "×";
        if (op === "-" && b > a) { var swap = a; a = b; b = swap; }
        if (op === "×") { a = 2 + Math.floor(rand(0, 3 + level)); b = 2 + Math.floor(rand(0, 9)); }
        var answer = op === "+" ? a + b : op === "-" ? a - b : a * b;
        var options = [answer];
        while (options.length < 4) {
          var fake = answer + Math.round(rand(-9, 9));
          if (fake !== answer && options.indexOf(fake) === -1) options.push(fake);
        }
        options.sort(function () { return Math.random() - 0.5; });
        return { text: a + " " + op + " " + b + " = ?", answer: answer, options: options };
      }

      function advance() {
        index++;
        picked = -1;
        paused = 0;
        timeLeft = Math.max(6, 11 - level * 0.3);
        if (index >= total) {
          api.finish(correct);
          return;
        }
        question = makeQuestion();
        api.hud(correct, index + 1 + " / " + total);
      }

      question = makeQuestion();

      function optionRect(i) {
        var w = (W - 120) / 2;
        var h = 76;
        return {
          x: 40 + (i % 2) * (w + 40),
          y: 350 + Math.floor(i / 2) * (h + 22),
          w: w,
          h: h,
        };
      }

      return {
        update: function (dt) {
          if (paused > 0) {
            paused -= dt;
            if (paused <= 0) advance();
            return;
          }
          timeLeft -= dt;
          if (timeLeft <= 0) {
            api.sfx("bad");
            api.shake(6);
            picked = -1;
            paused = 0.5;
            return;
          }
          api.hud(correct, index + 1 + " / " + total);
        },
        draw: function () {
          var ctx = api.ctx;
          api.bg("#111033", "#080b16");
          ctx.fillStyle = "rgba(255,255,255,0.09)";
          roundRect(ctx, 40, 60, W - 80, 240, 22);
          ctx.fill();
          api.text(question.text, W / 2, 170, 54, "#f8fafc");
          api.text(Math.max(0, Math.ceil(timeLeft)) + "s", W / 2, 250, 26, api.accent);

          for (var i = 0; i < question.options.length; i++) {
            var r = optionRect(i);
            var isAnswer = question.options[i] === question.answer;
            var chosen = picked === i;
            ctx.fillStyle = chosen
              ? (wasRight ? "#22c55e" : "#ef4444")
              : i === picked
                ? "#ef4444"
                : "rgba(255,255,255,0.1)";
            if (paused > 0 && isAnswer) ctx.fillStyle = "#22c55e";
            roundRect(ctx, r.x, r.y, r.w, r.h, 16);
            ctx.fill();
            api.text(String(question.options[i]), r.x + r.w / 2, r.y + r.h / 2 + 2, 34, "#f8fafc");
          }
        },
        tap: function (x, y) {
          if (paused > 0) return;
          for (var i = 0; i < question.options.length; i++) {
            var r = optionRect(i);
            if (x < r.x || x > r.x + r.w || y < r.y || y > r.y + r.h) continue;
            picked = i;
            wasRight = question.options[i] === question.answer;
            if (wasRight) {
              correct++;
              api.sfx("good");
              api.burst(r.x + r.w / 2, r.y + r.h / 2, "#22c55e", 10);
              api.haptic(8);
            } else {
              api.sfx("bad");
              api.shake(7);
              api.haptic(18);
            }
            paused = 0.55;
            return;
          }
        },
      };
    },
  };

  /* ---------------------------------------------------------------- snakey --- */
  /* A small neon serpent, walls that bite and food that grows you. */

  KITS.snakey = {
    make: function (api) {
      var level = api.level;
      var cols = 15;
      var rows = 15;
      var cell = W / cols;
      var stepTime = Math.max(0.075, 0.19 - level * 0.011);
      var snake = [{ x: 7, y: 7 }, { x: 6, y: 7 }, { x: 5, y: 7 }];
      var dir = { x: 1, y: 0 };
      var queued = [];
      var food = { x: 11, y: 7 };
      var acc = 0;
      var score = 0;

      function placeFood() {
        var free = [];
        for (var y = 0; y < rows; y++) {
          for (var x = 0; x < cols; x++) {
            var taken = false;
            for (var i = 0; i < snake.length; i++) {
              if (snake[i].x === x && snake[i].y === y) { taken = true; break; }
            }
            if (!taken) free.push({ x: x, y: y });
          }
        }
        if (free.length) food = free[Math.floor(Math.random() * free.length)];
      }

      function turn(x, y) {
        var last = queued.length ? queued[queued.length - 1] : dir;
        if (last.x === -x && last.y === -y) return;
        if (last.x === x && last.y === y) return;
        if (queued.length < 2) queued.push({ x: x, y: y });
      }

      function tick() {
        if (queued.length) dir = queued.shift();
        var head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
        if (head.x < 0 || head.y < 0 || head.x >= cols || head.y >= rows) {
          api.sfx("bad");
          api.shake(9);
          api.haptic([25, 50, 35]);
          api.finish(score);
          return;
        }
        for (var i = 0; i < snake.length - 1; i++) {
          if (snake[i].x === head.x && snake[i].y === head.y) {
            api.sfx("bad");
            api.shake(9);
            api.haptic([25, 50, 35]);
            api.finish(score);
            return;
          }
        }
        snake.unshift(head);
        if (head.x === food.x && head.y === food.y) {
          score += 10;
          api.sfx("good");
          api.burst(head.x * cell + cell / 2, head.y * cell + cell / 2, api.accent, 8);
          api.haptic(8);
          placeFood();
        } else {
          snake.pop();
        }
      }

      return {
        update: function (dt) {
          acc += dt;
          var guard = 0;
          while (acc >= stepTime && guard < 4) {
            acc -= stepTime;
            tick();
            guard++;
            if (api.ended) return;
          }
          api.hud(score, snake.length + " long");
        },
        draw: function () {
          var ctx = api.ctx;
          api.bg("#08161a", "#080b16");
          ctx.strokeStyle = "rgba(255,255,255,0.04)";
          ctx.lineWidth = 1;
          for (var i = 1; i < cols; i++) {
            ctx.beginPath();
            ctx.moveTo(i * cell, 0);
            ctx.lineTo(i * cell, H);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, i * cell);
            ctx.lineTo(W, i * cell);
            ctx.stroke();
          }
          ctx.fillStyle = "#f87171";
          ctx.beginPath();
          ctx.arc(food.x * cell + cell / 2, food.y * cell + cell / 2, cell * 0.3, 0, Math.PI * 2);
          ctx.fill();
          for (var s = snake.length - 1; s >= 0; s--) {
            ctx.fillStyle = s === 0 ? "#f8fafc" : api.accent;
            ctx.globalAlpha = s === 0 ? 1 : Math.max(0.25, 1 - s / (snake.length + 4));
            roundRect(ctx, snake[s].x * cell + 2, snake[s].y * cell + 2, cell - 4, cell - 4, 6);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        },
        key: function (code) {
          if (code === "ArrowUp" || code === "KeyW") turn(0, -1);
          if (code === "ArrowDown" || code === "KeyS") turn(0, 1);
          if (code === "ArrowLeft" || code === "KeyA") turn(-1, 0);
          if (code === "ArrowRight" || code === "KeyD") turn(1, 0);
        },
        swipe: function (dx, dy) { turn(dx, dy); },
      };
    },
  };

  /* --------------------------------------------------------------- breaker --- */
  /* A paddle, a ball and a wall of bricks to take apart. */

  KITS.breaker = {
    make: function (api) {
      var level = api.level;
      var padW = Math.max(74, 140 - level * 5);
      var px = W / 2 - padW / 2;
      var speed = 250 + level * 16;
      var brickRows = 4;
      var brickCols = 6;
      var bw = (W - 40) / brickCols;
      var bh = 24;
      var bricks = [];
      var ball = { x: W / 2, y: H - 120, vx: 0, vy: 0 };
      var lives = 3;
      var score = 0;
      var launched = false;

      function buildWall() {
        bricks = [];
        for (var r = 0; r < brickRows; r++) {
          for (var c = 0; c < brickCols; c++) {
            bricks.push({
              x: 20 + c * bw + 3,
              y: 80 + r * (bh + 8),
              w: bw - 6,
              h: bh,
              hits: r === 0 ? 2 : 1,
            });
          }
        }
      }

      function park() {
        launched = false;
        ball.x = px + padW / 2;
        ball.y = H - 118;
        ball.vx = 0;
        ball.vy = 0;
      }

      function launch() {
        if (launched) return;
        launched = true;
        var angle = -Math.PI / 2 + rand(-0.6, 0.6);
        ball.vx = Math.cos(angle) * speed;
        ball.vy = Math.sin(angle) * speed;
      }

      buildWall();
      park();

      function step(dt) {
        if (!launched) {
          ball.x = px + padW / 2;
          ball.y = H - 118;
          return;
        }
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;

        if (ball.x < 12) { ball.x = 12; ball.vx = Math.abs(ball.vx); api.sfx("pick"); }
        if (ball.x > W - 12) { ball.x = W - 12; ball.vx = -Math.abs(ball.vx); api.sfx("pick"); }
        if (ball.y < 12) { ball.y = 12; ball.vy = Math.abs(ball.vy); api.sfx("pick"); }

        if (ball.vy > 0 && ball.y > H - 76 && ball.y < H - 46 &&
            Math.abs(ball.x - (px + padW / 2)) < padW / 2 + 12) {
          ball.y = H - 76;
          var offset = clamp((ball.x - (px + padW / 2)) / (padW / 2), -1, 1);
          ball.vx = offset * speed * 0.85;
          ball.vy = -Math.sqrt(Math.max(speed * speed - ball.vx * ball.vx, 60));
          api.sfx("pick");
          api.haptic(6);
        }

        for (var i = 0; i < bricks.length; i++) {
          var b = bricks[i];
          if (ball.x < b.x || ball.x > b.x + b.w || ball.y < b.y || ball.y > b.y + b.h) continue;
          var gapX = Math.min(ball.x - b.x, b.x + b.w - ball.x);
          var gapY = Math.min(ball.y - b.y, b.y + b.h - ball.y);
          if (gapX < gapY) ball.vx *= -1;
          else ball.vy *= -1;
          b.hits--;
          if (b.hits <= 0) {
            bricks.splice(i, 1);
            score += 10;
            api.burst(ball.x, ball.y, api.accent, 6);
          }
          api.sfx("good");
          break;
        }

        if (!bricks.length) {
          score += 80;
          speed += 22;
          buildWall();
          park();
          api.sfx("win");
          return;
        }

        if (ball.y > H + 30) {
          lives--;
          api.sfx("bad");
          api.shake(9);
          api.haptic(24);
          if (lives <= 0) { api.finish(score); return; }
          park();
        }
      }

      return {
        update: function (dt) {
          step(dt / 2);
          if (api.ended) return;
          step(dt / 2);
          if (api.ended) return;
          api.hud(score, lives + " lives");
        },
        draw: function () {
          var ctx = api.ctx;
          api.bg("#1b0d1f", "#080b16");
          for (var i = 0; i < bricks.length; i++) {
            var b = bricks[i];
            ctx.fillStyle = b.hits > 1 ? "rgba(244,114,182,0.9)" : "rgba(244,114,182,0.5)";
            roundRect(ctx, b.x, b.y, b.w, b.h, 6);
            ctx.fill();
          }
          ctx.fillStyle = "#f8fafc";
          roundRect(ctx, px, H - 62, padW, 14, 7);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, 9, 0, Math.PI * 2);
          ctx.fillStyle = api.accent;
          ctx.fill();
          if (!launched) api.text("TAP TO SERVE", W / 2, H - 150, 24, "rgba(255,255,255,0.5)");
        },
        move: function (x) { px = clamp(x - padW / 2, 6, W - padW - 6); },
        tap: launch,
        key: function (code) {
          if (code === "Space" || code === "Enter") launch();
          if (code === "ArrowLeft" || code === "KeyA") px = clamp(px - 40, 6, W - padW - 6);
          if (code === "ArrowRight" || code === "KeyD") px = clamp(px + 40, 6, W - padW - 6);
        },
        swipe: function (dx) { px = clamp(px + dx * 46, 6, W - padW - 6); },
      };
    },
  };

  /* ----------------------------------------------------------------- lanes --- */
  /* Three lanes, rising speed and a lot of oncoming traffic. */

  KITS.lanes = {
    make: function (api) {
      var level = api.level;
      var laneX = [W * 0.24, W * 0.5, W * 0.76];
      var lane = 1;
      var dist = 0;
      var speed = 250 + level * 34;
      var cars = [];
      var spawn = 0.7;
      var playerY = H - 150;

      function shift(delta) {
        var next = clamp(lane + delta, 0, 2);
        if (next === lane) return;
        lane = next;
        api.sfx("pick");
        api.haptic(6);
      }

      return {
        update: function (dt) {
          dist += (speed * dt) / 14;
          spawn -= dt;
          if (spawn <= 0) {
            spawn = Math.max(0.28, 0.72 - level * 0.03) * rand(0.8, 1.35);
            cars.push({ lane: Math.floor(rand(0, 3)), y: -90, h: 86, v: speed * rand(0.85, 1.2) });
          }
          for (var i = cars.length - 1; i >= 0; i--) {
            var c = cars[i];
            c.y += c.v * dt;
            if (c.y > H + 90) { cars.splice(i, 1); continue; }
            if (c.lane !== lane) continue;
            if (c.y + c.h > playerY && c.y < playerY + 70) {
              api.sfx("bad");
              api.shake(12);
              api.haptic([30, 60, 40]);
              api.finish(Math.round(dist));
              return;
            }
          }
          api.hud(Math.round(dist) + " m", "lane " + (lane + 1) + " / 3");
        },
        draw: function () {
          var ctx = api.ctx;
          api.bg("#0b1a24", "#070a12");
          ctx.fillStyle = "rgba(255,255,255,0.03)";
          ctx.fillRect(laneX[0] - 92, 0, 184, H);
          ctx.fillRect(laneX[1] - 92, 0, 184, H);
          ctx.fillRect(laneX[2] - 92, 0, 184, H);
          ctx.strokeStyle = "rgba(255,255,255,0.18)";
          ctx.lineWidth = 3;
          ctx.setLineDash([26, 26]);
          var shiftY = (dist * 40) % 52;
          for (var b = 0; b < 2; b++) {
            var bx = (laneX[b] + laneX[b + 1]) / 2;
            ctx.beginPath();
            ctx.moveTo(bx, -shiftY);
            ctx.lineTo(bx, H);
            ctx.stroke();
          }
          ctx.setLineDash([]);
          for (var i = 0; i < cars.length; i++) {
            var c = cars[i];
            ctx.fillStyle = "#f87171";
            roundRect(ctx, laneX[c.lane] - 34, c.y, 68, c.h, 12);
            ctx.fill();
            ctx.fillStyle = "rgba(0,0,0,0.35)";
            roundRect(ctx, laneX[c.lane] - 22, c.y + 14, 44, 26, 6);
            ctx.fill();
          }
          ctx.fillStyle = api.accent;
          roundRect(ctx, laneX[lane] - 34, playerY, 68, 74, 12);
          ctx.fill();
          ctx.fillStyle = "rgba(0,0,0,0.35)";
          roundRect(ctx, laneX[lane] - 22, playerY + 16, 44, 24, 6);
          ctx.fill();
        },
        tap: function (x) { shift(x < W / 2 ? -1 : 1); },
        key: function (code) {
          if (code === "ArrowLeft" || code === "KeyA") shift(-1);
          if (code === "ArrowRight" || code === "KeyD") shift(1);
        },
        swipe: function (dx) { shift(dx < 0 ? -1 : 1); },
      };
    },
  };

  window.PP_KITS = KITS;

  /* ---------------------------------------------------------------- harness --- */

  function boot() {
    var canvas = document.getElementById("board");
    if (!canvas) return;

    var overlay = document.getElementById("overlay");
    var stage = document.querySelector(".stage") || canvas;
    var titleEl = document.getElementById("game-title");
    var crumbEl = document.getElementById("game-crumb");
    var hintEl = document.getElementById("game-hint");
    var bestEl = document.getElementById("best");
    var hudA = document.getElementById("hudA");
    var hudB = document.getElementById("hudB");

    var match = /[?&]g=([a-z0-9-]+)/i.exec(window.location.search || "");
    var id = match ? match[1].toLowerCase() : "";
    var game = window.PP_GAME_BY_ID ? window.PP_GAME_BY_ID[id] : null;
    var kitFactory = game ? KITS[game.kit] : null;

    if (!game || !kitFactory) {
      if (titleEl) titleEl.textContent = "Not found";
      PP.showOverlay(overlay,
        '<p class="kicker">404</p><h2>No such game</h2>' +
        '<p class="overlay-copy">That id is not in the catalogue.</p>' +
        '<div class="actions"><a class="btn" href="../index.html">Back to the arcade</a></div>');
      return;
    }

    document.title = game.title + " — Pixel Playground";
    if (titleEl) titleEl.textContent = game.title;
    if (crumbEl) crumbEl.textContent = game.emoji + " " + game.category + " · level " + game.level;
    if (hintEl) hintEl.textContent = game.controls;

    var best = PP.scores.get(game.id);
    function paintBest() {
      if (bestEl) bestEl.textContent = PP.formatNumber(best === null ? 0 : best);
    }
    paintBest();

    var ctx = PP.fitCanvas(canvas, W, H);
    var kit = null;
    var running = false;
    var ended = false;

    var api = {
      ctx: ctx,
      level: game.level,
      accent: game.accent,
      elapsed: 0,
      keys: {},
      ended: false,
      hud: function (a, b) {
        if (hudA) hudA.textContent = a;
        if (hudB) hudB.textContent = b;
      },
      bg: function (c1, c2) {
        var grad = ctx.createLinearGradient(0, 0, W * 0.6, H);
        grad.addColorStop(0, c1);
        grad.addColorStop(1, c2);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
      },
      text: function (str, x, y, size, color) {
        ctx.fillStyle = color || "#f8fafc";
        ctx.font = "800 " + size + "px ui-sans-serif, system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(str, x, y);
      },
      burst: function (x, y, color, n) { PP.juice.burstOn(canvas, x, y, color, n || 10, 56); },
      shake: function (px) { PP.juice.shake(stage, px || 6); },
      sfx: function (kind) { PP.sfx(kind); },
      haptic: function (pattern) { PP.juice.haptic(pattern); },
      finish: finish,
    };

    function begin() {
      PP.hideOverlay(overlay);
      api.elapsed = 0;
      api.ended = false;
      for (var key in api.keys) delete api.keys[key];
      kit = kitFactory.make(api);
      ended = false;
      running = true;
      if (hudA) hudA.textContent = "0";
      if (hudB) hudB.textContent = "";
      if (canvas.focus) canvas.focus();
    }

    function finish(score) {
      if (ended) return;
      ended = true;
      running = false;
      api.ended = true;

      var value = Math.max(0, Math.round(score));
      best = PP.scores.save(game.id, value, game.mode);
      paintBest();

      var result = PP.leaderboard.submit(game.id, value);
      PP.sfx(game.mode === "low" ? "good" : "win");

      var note = "";
      if (result) {
        note =
          '<p class="lb-note">' +
          (result.rank === 1 ? "New #1 on this device" : "#" + result.rank + " of " + result.total + " on this device") +
          ' · <a href="../leaderboard.html?game=' + encodeURIComponent(game.id) + '">Leaderboard →</a></p>';
      }

      var bestLine = PP.formatNumber(best) + game.unit;

      PP.showOverlay(overlay,
        '<p class="kicker">' + game.title + "</p>" +
        "<h2>" + PP.formatNumber(value) + game.unit + "</h2>" +
        '<p class="overlay-copy">Best on this device: ' + bestLine + "</p>" +
        '<div class="actions">' +
        '<button class="btn" id="againBtn">Play again</button>' +
        '<a class="btn btn-ghost" href="../index.html">Arcade</a>' +
        "</div>");

      var again = document.getElementById("againBtn");
      if (again) again.addEventListener("click", begin);
    }

    function startScreen() {
      PP.showOverlay(overlay,
        '<p class="kicker">' + game.emoji + " " + game.category + " · level " + game.level + "</p>" +
        "<h2>" + game.title + "</h2>" +
        '<p class="overlay-copy">' + game.blurb + "</p>" +
        '<p class="overlay-hint">' + game.controls +
        " · best " + PP.formatNumber(best === null ? 0 : best) + game.unit + "</p>" +
        '<div class="actions">' +
        '<button class="btn" id="playBtn">Play</button>' +
        '<a class="btn btn-ghost" href="../index.html">Arcade</a>' +
        "</div>");
      var play = document.getElementById("playBtn");
      if (play) play.addEventListener("click", begin);
    }

    function logical(event) {
      var rect = canvas.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) / rect.width) * W,
        y: ((event.clientY - rect.top) / rect.height) * H,
      };
    }

    var downX = 0;
    var downY = 0;
    var pointerDown = false;

    canvas.addEventListener("pointerdown", function (event) {
      if (!running || !kit) return;
      var point = logical(event);
      downX = point.x;
      downY = point.y;
      pointerDown = true;
      if (kit.tap) kit.tap(point.x, point.y);
    });

    canvas.addEventListener("pointermove", function (event) {
      if (!running || !kit || !kit.move) return;
      if (event.pointerType === "mouse" && !pointerDown) {
        var hover = logical(event);
        kit.move(hover.x, hover.y);
        return;
      }
      var point = logical(event);
      kit.move(point.x, point.y);
    });

    canvas.addEventListener("pointerup", function (event) {
      if (!pointerDown) return;
      pointerDown = false;
      if (!running || !kit || !kit.swipe) return;
      var point = logical(event);
      var dx = point.x - downX;
      var dy = point.y - downY;
      if (Math.hypot(dx, dy) < 34) return;
      if (Math.abs(dx) > Math.abs(dy)) kit.swipe(dx > 0 ? 1 : -1, 0);
      else kit.swipe(0, dy > 0 ? 1 : -1);
    });

    canvas.addEventListener("pointercancel", function () { pointerDown = false; });

    var blocked = {
      ArrowUp: 1, ArrowDown: 1, ArrowLeft: 1, ArrowRight: 1, Space: 1,
    };

    document.addEventListener("keydown", function (event) {
      if (blocked[event.code]) event.preventDefault();
      if (!running) {
        if (event.code === "Enter" || event.code === "Space") startScreen();
        return;
      }
      api.keys[event.code] = true;
      if (!kit || !kit.key) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.repeat && event.code !== "Space") return;
      kit.key(event.code);
    });

    document.addEventListener("keyup", function (event) {
      api.keys[event.code] = false;
    });

    document.addEventListener("visibilitychange", function () {
      if (document.hidden && running) {
        running = false;
        api.ended = true;
        PP.showOverlay(overlay,
          '<p class="kicker">Paused</p><h2>' + game.title + "</h2>" +
          '<p class="overlay-copy">The tab went away, so the run is over — nothing filed.</p>' +
          '<div class="actions"><button class="btn" id="resumeBtn">Start again</button></div>');
        var resume = document.getElementById("resumeBtn");
        if (resume) resume.addEventListener("click", begin);
      }
    });

    kit = kitFactory.make(api);
    startScreen();

    var last = 0;
    function frame(time) {
      window.requestAnimationFrame(frame);
      if (!last) last = time;
      var dt = Math.min((time - last) / 1000, 0.05);
      last = time;
      if (running && !ended) {
        api.elapsed += dt;
        kit.update(dt);
        if (!ended) kit.draw();
      } else if (kit && kit.draw) {
        kit.draw();
      }
    }
    window.requestAnimationFrame(frame);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
