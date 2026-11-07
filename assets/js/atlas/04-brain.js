/* Atlas engines 31–40: brain, memory, rhythm, reflex and the shooter. */
(function () {
  "use strict";
  var A = window.PP_ATLAS;
  var W = A.W, H = A.H;
  var clamp = A.clamp, near = A.near, rr = A.rr, dist = A.dist;
  var TAU = Math.PI * 2;

  function uniqueOptions(answer, make) {
    var values = [answer], guard = 0;
    while (values.length < 4 && guard++ < 80) {
      var v = make();
      if (values.indexOf(v) === -1) values.push(v);
    }
    while (values.length < 4) values.push(answer + values.length);
    for (var i = values.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = values[i]; values[i] = values[j]; values[j] = t;
    }
    return values;
  }

  /* 31. Math --------------------------------------------------------------- */
  A.register("math", function (api) {
    var S = A.begin(api);
    var question = "", answer = 0, options = [], feedback = 0;
    function make() {
      var level = Math.min(3, Math.floor(S.score / 5));
      var a = Math.floor(S.rand(1, 12 + level * 8));
      var b = Math.floor(S.rand(1, 12 + level * 6));
      var op = S.pick(level === 0 ? ["+", "-"] : ["+", "-", "×"]);
      if (op === "+") { answer = a + b; question = a + " + " + b; }
      else if (op === "-") { if (b > a) { var t = a; a = b; b = t; } answer = a - b; question = a + " − " + b; }
      else { a = Math.floor(S.rand(2, 9 + level)); b = Math.floor(S.rand(2, 9)); answer = a * b; question = a + " × " + b; }
      options = uniqueOptions(answer, function () { return Math.max(1, answer + Math.floor(S.rand(-12, 13))); });
      feedback = 0;
    }
    make();
    return {
      update: function (dt) {
        if (!S.update(dt)) return;
        feedback = Math.max(0, feedback - dt);
      },
      draw: function () {
        S.frame(function () {
          var ctx = api.ctx;
          api.text(question, W / 2, 230, 76, "#f8fafc");
          options.forEach(function (value, i) {
            var x = 30 + (i % 2) * 285, y = 350 + Math.floor(i / 2) * 92;
            ctx.fillStyle = "rgba(255,255,255,0.075)";
            rr(ctx, x, y, 255, 70, 16); ctx.fill();
            ctx.strokeStyle = "rgba(255,255,255,0.16)"; ctx.lineWidth = 2; ctx.stroke();
            api.text(String(value), x + 127, y + 35, 30, "#f8fafc");
          });
          if (feedback > 0) api.text("NEXT", W / 2, 548, 22, api.accent);
        });
      },
      tap: function (px, py) {
        var p = S.input(px, py); if (!p || feedback > 0) return;
        for (var i = 0; i < options.length; i++) {
          var x = 30 + (i % 2) * 285, y = 350 + Math.floor(i / 2) * 92;
          if (p.x >= x && p.x <= x + 255 && p.y >= y && p.y <= y + 70) {
            if (options[i] === answer) {
              S.add(1); feedback = 0.24; api.sfx("good"); S.spark(p.x, p.y, api.accent, 6); make();
            } else {
              S.fail(1); feedback = 0.24; make();
            }
            return;
          }
        }
      },
    };
  });

  /* 32. Sequence ----------------------------------------------------------- */
  A.register("sequence", function (api) {
    var S = A.begin(api);
    var question = "", answer = 0, options = [], feedback = 0;
    function make() {
      var kind = Math.floor(S.rand(0, 4));
      var a = Math.floor(S.rand(2, 12)), d = Math.floor(S.rand(2, 9));
      var terms = [];
      if (kind === 0) {
        for (var i = 0; i < 4; i++) terms.push(a + i * d);
        answer = a + 4 * d;
      } else if (kind === 1) {
        for (var j = 0; j < 4; j++) terms.push(a * Math.pow(2, j));
        answer = a * 16;
      } else if (kind === 2) {
        for (var k = 0; k < 4; k++) terms.push((k + 1) * (k + 1));
        answer = 25;
      } else {
        terms = [a, a + d, a + d * 3, a + d * 6];
        answer = a + d * 10;
      }
      question = terms.join(", ") + ", ?";
      options = uniqueOptions(answer, function () { return Math.max(1, answer + Math.floor(S.rand(-15, 16))); });
      feedback = 0;
    }
    make();
    return {
      update: function (dt) { if (!S.update(dt)) return; feedback = Math.max(0, feedback - dt); },
      draw: function () {
        S.frame(function () {
          var ctx = api.ctx;
          api.text(question, W / 2, 220, 54, "#f8fafc");
          api.text("WHAT COMES NEXT?", W / 2, 288, 16, "rgba(255,255,255,0.38)");
          options.forEach(function (value, i) {
            var x = 30 + (i % 2) * 285, y = 350 + Math.floor(i / 2) * 92;
            ctx.fillStyle = "rgba(255,255,255,0.075)";
            rr(ctx, x, y, 255, 70, 16); ctx.fill();
            api.text(String(value), x + 127, y + 35, 30, "#f8fafc");
          });
        });
      },
      tap: function (px, py) {
        var p = S.input(px, py); if (!p || feedback > 0) return;
        for (var i = 0; i < options.length; i++) {
          var x = 30 + (i % 2) * 285, y = 350 + Math.floor(i / 2) * 92;
          if (p.x >= x && p.x <= x + 255 && p.y >= y && p.y <= y + 70) {
            if (options[i] === answer) { S.add(1); feedback = 0.22; api.sfx("good"); make(); }
            else { S.fail(1); feedback = 0.22; make(); }
            return;
          }
        }
      },
    };
  });

  /* 33. Odd ---------------------------------------------------------------- */
  A.register("odd", function (api) {
    var S = A.begin(api);
    var cells = [], odd = 0, feedback = 0;
    var shapes = ["circle", "square", "triangle", "diamond"];
    function drawShape(ctx, x, y, size, shape, color) {
      ctx.fillStyle = color;
      ctx.beginPath();
      if (shape === 0) ctx.arc(x, y, size, 0, TAU);
      else if (shape === 1) ctx.rect(x - size, y - size, size * 2, size * 2);
      else if (shape === 2) { ctx.moveTo(x, y - size); ctx.lineTo(x + size, y + size); ctx.lineTo(x - size, y + size); ctx.closePath(); }
      else { ctx.moveTo(x, y - size); ctx.lineTo(x + size, y); ctx.lineTo(x, y + size); ctx.lineTo(x - size, y); ctx.closePath(); }
      ctx.fill();
    }
    function make() {
      cells = [];
      var base = Math.floor(S.rand(0, 4));
      odd = Math.floor(S.rand(0, 9));
      var oddShape = (base + 1 + Math.floor(S.rand(0, 3))) % 4;
      for (var i = 0; i < 9; i++) cells.push({ shape: i === odd ? oddShape : base });
      feedback = 0;
    }
    make();
    return {
      update: function (dt) { if (!S.update(dt)) return; feedback = Math.max(0, feedback - dt); },
      draw: function () {
        S.frame(function () {
          var ctx = api.ctx;
          for (var i = 0; i < 9; i++) {
            var x = 165 + (i % 3) * 135, y = 150 + Math.floor(i / 3) * 135;
            drawShape(ctx, x, y, 31, cells[i].shape, i === odd ? api.accent : "rgba(255,255,255,0.72)");
          }
          api.text("FIND THE ODD ONE", W / 2, 72, 18, "rgba(255,255,255,0.42)");
        });
      },
      tap: function (px, py) {
        var p = S.input(px, py); if (!p || feedback > 0) return;
        for (var i = 0; i < 9; i++) {
          var x = 165 + (i % 3) * 135, y = 150 + Math.floor(i / 3) * 135;
          if (dist(p.x, p.y, x, y) < 54) {
            if (i === odd) { S.add(2); S.spark(x, y, api.accent, 8); api.sfx("good"); feedback = 0.18; make(); }
            else { S.fail(1); feedback = 0.18; make(); }
            return;
          }
        }
      },
    };
  });

  /* 34. Pairs -------------------------------------------------------------- */
  A.register("pairs", function (api) {
    var S = A.begin(api);
    var symbols = ["◆", "●", "▲", "■", "✦", "✚", "☾", "☀"];
    var deck = [], open = [], lock = 0, found = 0;
    function make() {
      deck = [];
      symbols.forEach(function (s) { deck.push(s, s); });
      for (var i = deck.length - 1; i > 0; i--) {
        var j = Math.floor(S.rand(0, i + 1));
        var t = deck[i]; deck[i] = deck[j]; deck[j] = t;
      }
      open = []; lock = 0; found = 0;
    }
    make();
    function check() {
      if (open.length !== 2) return;
      if (deck[open[0]] === deck[open[1]]) {
        found++; S.add(1); S.spark(120 + (open[0] % 4) * 120 + 50, 110 + Math.floor(open[0] / 4) * 110 + 50, api.accent, 7);
        api.sfx("good"); open = []; lock = 0;
        if (found === symbols.length) { S.add(2); api.sfx("win"); make(); }
      } else {
        S.fail(1); lock = 0.55;
      }
    }
    return {
      update: function (dt) {
        if (!S.update(dt)) return;
        if (lock > 0) {
          lock -= dt;
          if (lock <= 0) open = [];
        }
      },
      draw: function () {
        S.frame(function () {
          var ctx = api.ctx;
          for (var i = 0; i < 16; i++) {
            var x = 85 + (i % 4) * 110, y = 108 + Math.floor(i / 4) * 110;
            var shown = open.indexOf(i) !== -1;
            ctx.fillStyle = shown ? api.accent : "rgba(255,255,255,0.075)";
            rr(ctx, x, y, 96, 96, 13); ctx.fill();
            ctx.strokeStyle = "rgba(255,255,255,0.14)"; ctx.lineWidth = 2; ctx.stroke();
            if (shown) api.text(deck[i], x + 48, y + 48, 38, "#07111f");
            else api.text("?", x + 48, y + 48, 25, "rgba(255,255,255,0.28)");
          }
          api.text(found + " / " + symbols.length, W / 2, 54, 18, "rgba(255,255,255,0.38)");
        });
      },
      tap: function (px, py) {
        var p = S.input(px, py); if (!p || lock > 0) return;
        for (var i = 0; i < 16; i++) {
          var x = 85 + (i % 4) * 110, y = 108 + Math.floor(i / 4) * 110;
          if (p.x >= x && p.x <= x + 96 && p.y >= y && p.y <= y + 96) {
            if (open.indexOf(i) !== -1) return;
            open.push(i); api.sfx("pick");
            if (open.length === 2) { lock = 0.32; setTimeout(check, 240); }
            return;
          }
        }
      },
    };
  });

  /* 35. Simon -------------------------------------------------------------- */
  A.register("simon", function (api) {
    var S = A.begin(api);
    var pads = [
      { x: 300, y: 210, color: "#f87171" }, { x: 420, y: 300, color: "#60a5fa" },
      { x: 300, y: 390, color: "#a3e635" }, { x: 180, y: 300, color: "#fbbf24" },
    ];
    var seq = [], at = 0, showing = false, showAt = 0, showClock = 0, flash = -1, flashClock = 0;
    function startRound() {
      seq = [Math.floor(S.rand(0, 4))];
      for (var i = 0; i < Math.min(3, S.score); i++) seq.push(Math.floor(S.rand(0, 4)));
      at = 0; showing = true; showAt = 0; showClock = 0.55;
    }
    startRound();
    return {
      update: function (dt) {
        if (!S.update(dt)) return;
        flashClock = Math.max(0, flashClock - dt);
        if (flash >= 0 && flashClock <= 0) flash = -1;
        if (showing) {
          showClock -= dt;
          if (showClock <= 0) {
            showAt++;
            showClock = Math.max(0.34, 0.62 - S.score * 0.02);
            if (showAt >= seq.length) { showing = false; showAt = -1; }
          }
        }
      },
      draw: function () {
        S.frame(function () {
          var ctx = api.ctx;
          pads.forEach(function (p, i) {
            var active = (showing && showAt === i) || flash === i;
            ctx.fillStyle = active ? p.color : "rgba(255,255,255,0.08)";
            ctx.beginPath(); ctx.arc(p.x, p.y, 52, 0, TAU); ctx.fill();
            ctx.strokeStyle = p.color; ctx.lineWidth = active ? 5 : 2;
            ctx.beginPath(); ctx.arc(p.x, p.y, 52, 0, TAU); ctx.stroke();
          });
          api.text(showing ? "WATCH" : "YOUR TURN", W / 2, H - 52, 20, showing ? "rgba(255,255,255,0.45)" : api.accent);
          api.text(String(seq.length), 50, 50, 22, "rgba(255,255,255,0.34)");
        });
      },
      tap: function (px, py) {
        var p = S.input(px, py); if (!p || showing) return;
        for (var i = 0; i < pads.length; i++) {
          if (dist(p.x, p.y, pads[i].x, pads[i].y) < 58) {
            flash = i; flashClock = 0.16;
            if (seq[at] === i) {
              at++;
              api.sfx("pick");
              if (at >= seq.length) {
                S.add(1);
                seq.push(Math.floor(S.rand(0, 4)));
                at = 0; showing = true; showAt = 0; showClock = 0.55;
              }
            } else {
              S.fail(1); startRound();
            }
            return;
          }
        }
      },
    };
  });

  /* 36. Rhythm ------------------------------------------------------------- */
  A.register("rhythm", function (api) {
    var S = A.begin(api);
    var notes = [], spawn = 0.4, flash = [0, 0, 0, 0];
    var laneX = function (i) { return 120 + i * 120; };
    var hitY = 474;
    function spawnNote() {
      notes.push({ lane: Math.floor(S.rand(0, 4)), y: 78, speed: (215 + S.score * 4) * S.speed });
    }
    return {
      update: function (dt) {
        if (!S.update(dt)) return;
        spawn -= dt;
        if (spawn <= 0) { spawnNote(); spawn = Math.max(0.34, 0.75 - S.score * 0.012); }
        for (var i = 0; i < 4; i++) flash[i] = Math.max(0, flash[i] - dt * 4);
        for (var j = notes.length - 1; j >= 0; j--) {
          notes[j].y += notes[j].speed * dt;
          if (notes[j].y > H - 28) { notes.splice(j, 1); S.fail(1); }
        }
      },
      draw: function () {
        S.frame(function () {
          var ctx = api.ctx;
          for (var i = 0; i < 4; i++) {
            ctx.fillStyle = "rgba(255,255,255,0.035)";
            ctx.fillRect(78 + i * 120, 74, 84, H - 118);
            ctx.fillStyle = "rgba(255,255,255,0.08)";
            ctx.fillRect(78 + i * 120, hitY, 84, 4);
            if (flash[i] > 0) {
              ctx.fillStyle = "rgba(255,255,255," + (flash[i] * 0.18) + ")";
              ctx.fillRect(78 + i * 120, 74, 84, H - 118);
            }
          }
          notes.forEach(function (n) {
            ctx.fillStyle = api.accent;
            rr(ctx, laneX(n.lane) - 28, n.y - 14, 56, 28, 9); ctx.fill();
          });
          api.text("D  F  J  K", W / 2, 44, 18, "rgba(255,255,255,0.38)");
        });
      },
      tap: function (px, py) {
        var p = S.input(px, py); if (!p) return;
        var lane = Math.floor((p.x - 78) / 120);
        if (lane < 0 || lane > 3) return;
        var best = -1, bestD = 50;
        notes.forEach(function (n, i) {
          if (n.lane === lane && Math.abs(n.y - hitY) < bestD) { best = i; bestD = Math.abs(n.y - hitY); }
        });
        if (best >= 0) {
          notes.splice(best, 1); flash[lane] = 1; S.add(1); S.spark(laneX(lane), hitY, api.accent, 6); api.sfx("pick");
        } else {
          S.fail(1);
        }
      },
      key: function (code) {
        var lane = code === "KeyD" ? 0 : code === "KeyF" ? 1 : code === "KeyJ" ? 2 : code === "KeyK" ? 3 : -1;
        if (lane < 0) return;
        var best = -1, bestD = 50;
        notes.forEach(function (n, i) {
          if (n.lane === lane && Math.abs(n.y - hitY) < bestD) { best = i; bestD = Math.abs(n.y - hitY); }
        });
        if (best >= 0) { notes.splice(best, 1); flash[lane] = 1; S.add(1); S.spark(laneX(lane), hitY, api.accent, 6); }
        else S.fail(1);
      },
    };
  });

  /* 37. Whack -------------------------------------------------------------- */
  A.register("whack", function (api) {
    var S = A.begin(api);
    var holes = [], spawn = 0.3, flash = 0;
    for (var i = 0; i < 9; i++) holes.push({ x: 165 + (i % 3) * 135, y: 165 + Math.floor(i / 3) * 135, active: 0, dud: false, life: 0 });
    return {
      update: function (dt) {
        if (!S.update(dt)) return;
        spawn -= dt; flash = Math.max(0, flash - dt);
        if (spawn <= 0) {
          spawn = Math.max(0.24, 0.62 - S.score * 0.012);
          var free = holes.filter(function (h) { return !h.active; });
          if (free.length) {
            var h = free[Math.floor(S.rand(0, free.length))];
            h.active = 1; h.dud = S.rand() < 0.24; h.life = Math.max(0.55, 1.2 - S.score * 0.02);
          }
        }
        holes.forEach(function (h) {
          if (!h.active) return;
          h.life -= dt;
          if (h.life <= 0) h.active = 0;
        });
      },
      draw: function () {
        S.frame(function () {
          var ctx = api.ctx;
          holes.forEach(function (h) {
            ctx.fillStyle = "rgba(255,255,255,0.065)";
            ctx.beginPath(); ctx.ellipse(h.x, h.y, 47, 29, 0, 0, TAU); ctx.fill();
            if (h.active) {
              ctx.fillStyle = h.dud ? "#475569" : api.accent;
              ctx.beginPath(); ctx.arc(h.x, h.y - 15, 25, 0, TAU); ctx.fill();
              ctx.fillStyle = "rgba(0,0,0,0.45)";
              ctx.beginPath(); ctx.arc(h.x - 8, h.y - 21, 3, 0, TAU); ctx.fill();
              ctx.beginPath(); ctx.arc(h.x + 8, h.y - 21, 3, 0, TAU); ctx.fill();
            }
          });
          if (flash > 0) api.text("HIT", W / 2, 74, 24, api.accent);
          api.text("AVOID THE GREY", W / 2, 44, 15, "rgba(255,255,255,0.32)");
        });
      },
      tap: function (px, py) {
        var p = S.input(px, py); if (!p) return;
        for (var i = 0; i < holes.length; i++) {
          var h = holes[i];
          if (!h.active) continue;
          if (dist(p.x, p.y, h.x, h.y - 15) < 38) {
            h.active = 0;
            if (h.dud) S.fail(1);
            else { S.add(1); flash = 0.2; S.spark(h.x, h.y, api.accent, 8); api.sfx("good"); }
            return;
          }
        }
        S.fail(1);
      },
    };
  });

  /* 38. Bubble ------------------------------------------------------------- */
  A.register("bubble", function (api) {
    var S = A.begin(api);
    var cols = 6, rows = 7, r = 33, off = (W - cols * r * 2) / 2;
    var colors = ["#f87171", "#60a5fa", "#a3e635", "#fbbf24"];
    var grid = [], descend = 4;
    function make() {
      grid = [];
      for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) {
        grid.push(y < 3 ? Math.floor(S.rand(0, 4)) : -1);
      }
    }
    make();
    function cellX(i) { return off + (i % cols) * r * 2 + r; }
    function cellY(i) { return 78 + Math.floor(i / cols) * r * 2 + r; }
    function groupAt(i) {
      var color = grid[i];
      if (color < 0) return [];
      var seen = {}, queue = [i], out = [];
      seen[i] = 1;
      while (queue.length) {
        var cur = queue.pop(); out.push(cur);
        var x = cur % cols, y = Math.floor(cur / cols);
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
          var nx = x + d[0], ny = y + d[1];
          if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) return;
          var ni = ny * cols + nx;
          if (!seen[ni] && grid[ni] === color) { seen[ni] = 1; queue.push(ni); }
        });
      }
      return out;
    }
    function pushRow() {
      var row = [];
      for (var x = 0; x < cols; x++) row.push(Math.floor(S.rand(0, 4)));
      for (var y = rows - 1; y > 0; y--) for (var x2 = 0; x2 < cols; x2++) grid[y * cols + x2] = grid[(y - 1) * cols + x2];
      for (var x3 = 0; x3 < cols; x3++) grid[x3] = row[x3];
      if (grid.slice((rows - 1) * cols).some(function (v) { return v >= 0; })) {
        S.fail(1); make();
      }
    }
    return {
      update: function (dt) {
        if (!S.update(dt)) return;
        descend -= dt;
        if (descend <= 0) { descend = Math.max(2.4, 5.5 - S.score * 0.05); pushRow(); }
      },
      draw: function () {
        S.frame(function () {
          var ctx = api.ctx;
          for (var i = 0; i < grid.length; i++) {
            if (grid[i] < 0) continue;
            ctx.fillStyle = colors[grid[i]];
            ctx.beginPath(); ctx.arc(cellX(i), cellY(i), r - 3, 0, TAU); ctx.fill();
            ctx.strokeStyle = "rgba(255,255,255,0.22)"; ctx.lineWidth = 2; ctx.stroke();
            ctx.fillStyle = "rgba(255,255,255,0.32)";
            ctx.beginPath(); ctx.arc(cellX(i) - 9, cellY(i) - 10, 7, 0, TAU); ctx.fill();
          }
        });
      },
      tap: function (px, py) {
        var p = S.input(px, py); if (!p) return;
        var x = Math.floor((p.x - off) / (r * 2));
        var y = Math.floor((p.y - 78) / (r * 2));
        if (x < 0 || y < 0 || x >= cols || y >= rows) return;
        var idx = y * cols + x;
        if (grid[idx] < 0) return;
        var group = groupAt(idx);
        if (group.length < 2) { S.fail(1); return; }
        var gain = group.length;
        group.forEach(function (g) { grid[g] = -1; });
        S.add(gain); S.spark(p.x, p.y, colors[idx], 9); api.sfx("good");
      },
    };
  });

  /* 39. Slice -------------------------------------------------------------- */
  A.register("slice", function (api) {
    var S = A.begin(api);
    var items = [], spawn = 0.35, down = false;
    function spawnItem() {
      var bomb = S.rand() < 0.18;
      items.push({
        x: S.rand(70, W - 70), y: H + 40,
        vx: S.rand(-80, 80), vy: -S.rand(430, 600),
        r: bomb ? 20 : 25, bomb: bomb,
        color: bomb ? "#475569" : S.pick(["#f87171", "#fbbf24", "#a3e635", "#60a5fa"]),
      });
    }
    return {
      update: function (dt) {
        if (!S.update(dt)) return;
        spawn -= dt;
        if (spawn <= 0) { spawnItem(); spawn = Math.max(0.24, 0.62 - S.score * 0.012); }
        for (var i = items.length - 1; i >= 0; i--) {
          var it = items[i];
          it.vy += 430 * dt; it.x += it.vx * dt; it.y += it.vy * dt;
          if (it.y > H + 80) { items.splice(i, 1); if (!it.bomb) S.fail(1); }
        }
      },
      draw: function () {
        S.frame(function () {
          var ctx = api.ctx;
          items.forEach(function (it) {
            ctx.fillStyle = it.color;
            ctx.beginPath(); ctx.arc(it.x, it.y, it.r, 0, TAU); ctx.fill();
            if (it.bomb) {
              ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 3;
              ctx.beginPath(); ctx.moveTo(it.x, it.y - it.r); ctx.lineTo(it.x + 7, it.y - it.r - 14); ctx.stroke();
              ctx.beginPath(); ctx.arc(it.x + 7, it.y - it.r - 18, 5, 0, TAU); ctx.stroke();
            } else {
              ctx.fillStyle = "rgba(255,255,255,0.28)";
              ctx.beginPath(); ctx.arc(it.x - 8, it.y - 8, 6, 0, TAU); ctx.fill();
            }
          });
          api.text("SLICE FRUIT · DODGE BOMBS", W / 2, 44, 15, "rgba(255,255,255,0.34)");
        });
      },
      down: function (px, py) { S.input(px, py); down = true; },
      move: function (px, py) {
        if (!down) return;
        var p = S.input(px, py); if (!p) return;
        for (var i = items.length - 1; i >= 0; i--) {
          var it = items[i];
          if (dist(p.x, p.y, it.x, it.y) < it.r + 14) {
            items.splice(i, 1);
            if (it.bomb) S.fail(1);
            else { S.add(1); S.spark(it.x, it.y, it.color, 8); api.sfx("good"); }
          }
        }
      },
      release: function () { down = false; },
    };
  });

  /* 40. Invaders ----------------------------------------------------------- */
  A.register("invaders", function (api) {
    var S = A.begin(api);
    var player = { x: W / 2, y: H - 56 }, enemies = [], bullets = [], enemyDir = 1, fire = 0, wave = 0;
    function makeWave() {
      enemies = [];
      var rows = 3, cols = 6;
      for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
        enemies.push({ x: 100 + c * 68, y: 120 + r * 56, alive: true });
      }
      wave++;
    }
    makeWave();
    return {
      update: function (dt) {
        if (!S.update(dt)) return;
        var speed = (40 + wave * 10) * S.speed;
        var edge = false;
        enemies.forEach(function (e) {
          if (!e.alive) return;
          e.x += enemyDir * speed * dt;
          if (e.x < 55 || e.x > W - 55) edge = true;
        });
        if (edge) {
          enemyDir *= -1;
          enemies.forEach(function (e) { if (e.alive) e.y += 24; });
        }
        var bottom = 0;
        enemies.forEach(function (e) { if (e.alive) bottom = Math.max(bottom, e.y); });
        if (bottom > H - 120) { S.fail(1); makeWave(); return; }
        fire -= dt;
        if (fire <= 0) { fire = 0.42; bullets.push({ x: player.x, y: player.y - 20 }); }
        for (var i = bullets.length - 1; i >= 0; i--) {
          var b = bullets[i]; b.y -= 520 * dt;
          if (b.y < -20) { bullets.splice(i, 1); continue; }
          for (var j = 0; j < enemies.length; j++) {
            var e = enemies[j];
            if (e.alive && Math.abs(b.x - e.x) < 24 && Math.abs(b.y - e.y) < 20) {
              e.alive = false; bullets.splice(i, 1); S.add(1); S.spark(e.x, e.y, api.accent, 7); api.sfx("good");
              break;
            }
          }
        }
        if (enemies.every(function (e) { return !e.alive; })) { S.add(3); makeWave(); }
      },
      draw: function () {
        S.frame(function () {
          var ctx = api.ctx;
          enemies.forEach(function (e) {
            if (!e.alive) return;
            ctx.fillStyle = api.accent;
            ctx.beginPath(); ctx.arc(e.x, e.y, 19, 0, TAU); ctx.fill();
            ctx.fillStyle = "rgba(0,0,0,0.55)";
            ctx.beginPath(); ctx.arc(e.x - 7, e.y - 3, 4, 0, TAU); ctx.fill();
            ctx.beginPath(); ctx.arc(e.x + 7, e.y - 3, 4, 0, TAU); ctx.fill();
          });
          bullets.forEach(function (b) {
            ctx.fillStyle = "#fff"; ctx.fillRect(b.x - 2, b.y, 4, 16);
          });
          ctx.fillStyle = "#f8fafc";
          ctx.beginPath(); ctx.moveTo(player.x, player.y - 22); ctx.lineTo(player.x + 22, player.y + 18); ctx.lineTo(player.x - 22, player.y + 18); ctx.closePath(); ctx.fill();
          api.text("WAVE " + wave, W / 2, 48, 17, "rgba(255,255,255,0.38)");
        });
      },
      down: function (px, py) {
        var p = S.input(px, py); if (!p) return;
        player.x = clamp(p.x, 45, W - 45);
      },
      move: function (px, py) {
        var p = S.input(px, py); if (!p) return;
        player.x = clamp(p.x, 45, W - 45);
      },
      key: function (code) {
        var d = S.dir(code);
        if (d) player.x = clamp(player.x + d * 34, 45, W - 45);
      },
    };
  });
})();
