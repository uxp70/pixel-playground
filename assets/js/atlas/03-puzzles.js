/* Atlas engines 21–30: the puzzle bench. */
(function () {
  "use strict";
  var A = window.PP_ATLAS;
  var W = A.W, H = A.H;
  var clamp = A.clamp, dist = A.dist, rr = A.rr;
  var TAU = Math.PI * 2;

  /* 21. Pipes -------------------------------------------------------------- */
  A.register("pipes", function (api) {
    var S = A.begin(api);
    var n = 6, cell = 78, off = (W - n * cell) / 2;
    var cells = [], path = [], exitCell = { x: 5, y: 3 };
    function idx(x, y) { return y * n + x; }
    function maskAt(c) { return ((c.mask << c.rot) | (c.mask >> (4 - c.rot))) & 15; }
    function make() {
      cells = [];
      for (var i = 0; i < n * n; i++) cells.push({ mask: 0, rot: Math.floor(S.rand(0, 4)) });
      path = [{ x: 0, y: 3 }];
      var x = 0, y = 3;
      while (x < n - 1) {
        var vertical = S.rand() < 0.34 && y > 0 && y < n - 1;
        if (vertical) {
          y += S.rand() < 0.5 ? -1 : 1;
        } else {
          x++;
        }
        if (path[path.length - 1].x !== x || path[path.length - 1].y !== y) path.push({ x: x, y: y });
      }
      exitCell = path[path.length - 1];
      for (var p = 0; p < path.length - 1; p++) {
        var a = path[p], b = path[p + 1];
        var dx = b.x - a.x, dy = b.y - a.y;
        if (dx === 1) { cells[idx(a.x, a.y)].mask |= 2; cells[idx(b.x, b.y)].mask |= 8; }
        if (dx === -1) { cells[idx(a.x, a.y)].mask |= 8; cells[idx(b.x, b.y)].mask |= 2; }
        if (dy === 1) { cells[idx(a.x, a.y)].mask |= 4; cells[idx(b.x, b.y)].mask |= 1; }
        if (dy === -1) { cells[idx(a.x, a.y)].mask |= 1; cells[idx(b.x, b.y)].mask |= 4; }
      }
      cells[idx(path[0].x, path[0].y)].mask |= 8;
      cells[idx(exitCell.x, exitCell.y)].mask |= 2;
      for (var c = 0; c < cells.length; c++) {
        if (!cells[c].mask) cells[c].rot = 0;
      }
      if (solved()) cells[idx(path[0].x, path[0].y)].rot = (cells[idx(path[0].x, path[0].y)].rot + 1) % 4;
    }
    function solved() {
      var start = idx(0, 3);
      if (!(maskAt(cells[start]) & 8)) return false;
      var seen = {}, queue = [start];
      seen[start] = true;
      var dirs = [[0, -1, 1, 4], [1, 0, 2, 8], [0, 1, 4, 1], [-1, 0, 8, 2]];
      while (queue.length) {
        var cur = queue.pop();
        var cx = cur % n, cy = Math.floor(cur / n);
        for (var d = 0; d < 4; d++) {
          var bit = dirs[d][2], opposite = dirs[d][3];
          if (!(maskAt(cells[cur]) & bit)) continue;
          var nx = cx + dirs[d][0], ny = cy + dirs[d][1];
          if (nx < 0 || ny < 0 || nx >= n || ny >= n) continue;
          var ni = idx(nx, ny);
          if (seen[ni] || !(maskAt(cells[ni]) & opposite)) continue;
          seen[ni] = true; queue.push(ni);
        }
      }
      var end = idx(exitCell.x, exitCell.y);
      return !!seen[end] && !!(maskAt(cells[end]) & 2);
    }
    make();
    return {
      update: function (dt) { S.update(dt); },
      draw: function () {
        S.frame(function () {
          var ctx = api.ctx;
          ctx.fillStyle = "rgba(255,255,255,0.035)";
          ctx.fillRect(off, off, n * cell, n * cell);
          for (var i = 0; i < cells.length; i++) {
            var c = cells[i];
            var x = off + (i % n) * cell + cell / 2;
            var y = off + Math.floor(i / n) * cell + cell / 2;
            var m = maskAt(c);
            if (!m) {
              ctx.fillStyle = "rgba(255,255,255,0.06)";
              ctx.beginPath(); ctx.arc(x, y, 4, 0, TAU); ctx.fill();
              continue;
            }
            ctx.strokeStyle = i === idx(0, 3) || i === idx(exitCell.x, exitCell.y) ? api.accent : "rgba(255,255,255,0.64)";
            ctx.lineWidth = 9; ctx.lineCap = "round";
            if (m & 1) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - cell / 2 + 3); ctx.stroke(); }
            if (m & 2) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + cell / 2 - 3, y); ctx.stroke(); }
            if (m & 4) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + cell / 2 - 3); ctx.stroke(); }
            if (m & 8) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - cell / 2 + 3, y); ctx.stroke(); }
            ctx.strokeStyle = "rgba(255,255,255,0.22)"; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(x, y, 8, 0, TAU); ctx.stroke();
          }
          api.text("CONNECT THE FLOW", W / 2, 42, 16, "rgba(255,255,255,0.34)");
        });
      },
      tap: function (px, py) {
        var p = S.input(px, py); if (!p) return;
        var cx = Math.floor((p.x - off) / cell), cy = Math.floor((p.y - off) / cell);
        if (cx < 0 || cy < 0 || cx >= n || cy >= n) return;
        var c = cells[idx(cx, cy)];
        if (!c.mask) return;
        c.rot = (c.rot + 1) % 4;
        api.sfx("pick");
        if (solved()) {
          S.add(1); S.spark(p.x, p.y, api.accent, 10); api.sfx("good"); make();
        }
      },
    };
  });

  /* 22. Mirrors ------------------------------------------------------------ */
  A.register("mirrors", function (api) {
    var S = A.begin(api);
    var n = 6, cell = 78, off = (W - n * cell) / 2;
    var mirrors = [
      { x: 2, y: 2, rot: 0 }, { x: 2, y: 0, rot: 0 }, { x: 5, y: 0, rot: 1 },
      { x: 1, y: 4, rot: 0 }, { x: 4, y: 4, rot: 1 },
    ];
    var gem = { x: 5, y: 2 }, segments = [];
    function scramble() {
      mirrors.forEach(function (m) { m.rot = Math.floor(S.rand(0, 2)); });
      if (trace().won) mirrors[0].rot = 1 - mirrors[0].rot;
    }
    function trace() {
      segments = [];
      var x = -1, y = 2, dir = 0;
      var dx = [1, 0, -1, 0], dy = [0, 1, 0, -1];
      var reflect = {
        "0": [3, 2, 1, 0],
        "1": [1, 0, 3, 2],
      };
      var prior = { x: x, y: y };
      for (var step = 0; step < 120; step++) {
        x += dx[dir]; y += dy[dir];
        segments.push([prior.x, prior.y, x, y]);
        prior = { x: x, y: y };
        if (x === gem.x && y === gem.y) return { won: true };
        if (x < 0 || y < 0 || x >= n || y >= n) return { won: false };
        var found = null;
        mirrors.forEach(function (m) { if (m.x === x && m.y === y) found = m; });
        if (found) dir = reflect[String(found.rot)][dir];
      }
      return { won: false };
    }
    scramble();
    return {
      update: function (dt) { S.update(dt); },
      draw: function () {
        S.frame(function () {
          var ctx = api.ctx;
          ctx.fillStyle = "rgba(255,255,255,0.035)";
          ctx.fillRect(off, off, n * cell, n * cell);
          ctx.strokeStyle = api.accent; ctx.lineWidth = 3;
          segments.forEach(function (s) {
            ctx.beginPath();
            ctx.moveTo(off + s[0] * cell + cell / 2, off + s[1] * cell + cell / 2);
            ctx.lineTo(off + s[2] * cell + cell / 2, off + s[3] * cell + cell / 2);
            ctx.stroke();
          });
          mirrors.forEach(function (m) {
            var x = off + m.x * cell, y = off + m.y * cell;
            ctx.fillStyle = "rgba(255,255,255,0.08)";
            ctx.fillRect(x + 8, y + 8, cell - 16, cell - 16);
            ctx.strokeStyle = "#f8fafc"; ctx.lineWidth = 5;
            ctx.beginPath();
            if (m.rot === 0) { ctx.moveTo(x + 20, y + cell - 20); ctx.lineTo(x + cell - 20, y + 20); }
            else { ctx.moveTo(x + 20, y + 20); ctx.lineTo(x + cell - 20, y + cell - 20); }
            ctx.stroke();
          });
          ctx.fillStyle = "#fde047";
          ctx.beginPath(); ctx.arc(off + gem.x * cell + cell / 2, off + gem.y * cell + cell / 2, 15, 0, TAU); ctx.fill();
          ctx.strokeStyle = "rgba(253,224,71,0.5)"; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(off + gem.x * cell + cell / 2, off + gem.y * cell + cell / 2, 23, 0, TAU); ctx.stroke();
        });
      },
      tap: function (px, py) {
        var p = S.input(px, py); if (!p) return;
        var cx = Math.floor((p.x - off) / cell), cy = Math.floor((p.y - off) / cell);
        for (var i = 0; i < mirrors.length; i++) {
          var m = mirrors[i];
          if (m.x === cx && m.y === cy) {
            m.rot = 1 - m.rot; api.sfx("pick");
            if (trace().won) { S.add(1); S.spark(p.x, p.y, api.accent, 10); api.sfx("good"); scramble(); }
            return;
          }
        }
      },
    };
  });

  /* 23. Lights ------------------------------------------------------------- */
  A.register("lights", function (api) {
    var S = A.begin(api);
    var n = 5, cell = 88, off = (W - n * cell) / 2;
    var grid = [];
    function toggle(data, x, y) {
      [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
        var nx = x + d[0], ny = y + d[1];
        if (nx >= 0 && ny >= 0 && nx < n && ny < n) data[ny * n + nx] = 1 - data[ny * n + nx];
      });
    }
    function make() {
      grid = [];
      for (var i = 0; i < n * n; i++) grid.push(0);
      var taps = 9;
      for (var t = 0; t < taps; t++) toggle(grid, Math.floor(S.rand(0, n)), Math.floor(S.rand(0, n)));
      if (grid.every(function (v) { return v === 0; })) toggle(grid, 2, 2);
    }
    make();
    return {
      update: function (dt) { S.update(dt); },
      draw: function () {
        S.frame(function () {
          var ctx = api.ctx;
          for (var i = 0; i < n * n; i++) {
            var x = off + (i % n) * cell, y = off + Math.floor(i / n) * cell;
            ctx.fillStyle = grid[i] ? api.accent : "rgba(255,255,255,0.06)";
            rr(ctx, x + 5, y + 5, cell - 10, cell - 10, 15); ctx.fill();
            ctx.strokeStyle = grid[i] ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.12)";
            ctx.lineWidth = 2; ctx.stroke();
          }
          api.text("MAKE IT DARK", W / 2, 44, 16, "rgba(255,255,255,0.36)");
        });
      },
      tap: function (px, py) {
        var p = S.input(px, py); if (!p) return;
        var x = Math.floor((p.x - off) / cell), y = Math.floor((p.y - off) / cell);
        if (x < 0 || y < 0 || x >= n || y >= n) return;
        toggle(grid, x, y); api.sfx("pick");
        if (grid.every(function (v) { return v === 0; })) {
          S.add(1); S.spark(off + x * cell + cell / 2, off + y * cell + cell / 2, api.accent, 10);
          api.sfx("good"); make();
        }
      },
    };
  });

  /* 24. Merge -------------------------------------------------------------- */
  A.register("merge", function (api) {
    var S = A.begin(api, { goal: 30 });
    var board = [];
    function add() {
      var open = [];
      for (var i = 0; i < 16; i++) if (!board[i]) open.push(i);
      if (!open.length) return;
      board[open[Math.floor(S.rand(0, open.length))]] = S.rand() < 0.88 ? 2 : 4;
    }
    function reset() {
      board = [];
      for (var i = 0; i < 16; i++) board.push(0);
      add(); add();
    }
    reset();
    function slideLine(line) {
      var vals = line.filter(function (v) { return v; });
      var out = [], gained = 0;
      for (var i = 0; i < vals.length; i++) {
        if (vals[i] === vals[i + 1]) {
          var merged = vals[i] * 2; out.push(merged); gained += merged; i++;
          if (merged >= 128) { S.add(24); api.sfx("win"); reset(); return { out: line, gained: 24, reset: true }; }
        } else out.push(vals[i]);
      }
      while (out.length < 4) out.push(0);
      return { out: out, gained: gained };
    }
    function move(dir) {
      var gained = 0, changed = false, x, y, line;
      for (var i = 0; i < 4; i++) {
        line = [];
        for (var j = 0; j < 4; j++) {
          if (dir === 0) line.push(board[i * 4 + j]);
          if (dir === 1) line.push(board[i * 4 + (3 - j)]);
          if (dir === 2) line.push(board[j * 4 + i]);
          if (dir === 3) line.push(board[(3 - j) * 4 + i]);
        }
        var result = slideLine(line);
        if (result.reset) return;
        gained += result.gained;
        for (var k = 0; k < 4; k++) {
          if (dir === 0) { if (board[i * 4 + k] !== result.out[k]) changed = true; board[i * 4 + k] = result.out[k]; }
          if (dir === 1) { if (board[i * 4 + (3 - k)] !== result.out[k]) changed = true; board[i * 4 + (3 - k)] = result.out[k]; }
          if (dir === 2) { if (board[k * 4 + i] !== result.out[k]) changed = true; board[k * 4 + i] = result.out[k]; }
          if (dir === 3) { if (board[(3 - k) * 4 + i] !== result.out[k]) changed = true; board[(3 - k) * 4 + i] = result.out[k]; }
        }
      }
      if (changed) { add(); if (gained) { S.add(gained / 2); api.sfx("pick"); } }
    }
    return {
      update: function (dt) { S.update(dt); },
      draw: function () {
        S.frame(function () {
          var ctx = api.ctx;
          var size = 420, cell = 98, gap = 9, off = (W - size) / 2;
          ctx.fillStyle = "rgba(255,255,255,0.05)";
          rr(ctx, off, off, size, size, 24); ctx.fill();
          for (var i = 0; i < 16; i++) {
            var x = off + (i % 4) * (cell + gap) + gap;
            var y = off + Math.floor(i / 4) * (cell + gap) + gap;
            ctx.fillStyle = "rgba(255,255,255,0.05)";
            rr(ctx, x, y, cell, cell, 14); ctx.fill();
            if (board[i]) {
              var shade = Math.min(0.75, 0.24 + Math.log(board[i]) * 0.075);
              ctx.fillStyle = board[i] >= 128 ? "#fbbf24" : api.accent;
              ctx.globalAlpha = shade; rr(ctx, x, y, cell, cell, 14); ctx.fill();
              ctx.globalAlpha = 1;
              api.text(String(board[i]), x + cell / 2, y + cell / 2, board[i] > 999 ? 27 : 34, "#fff");
            }
          }
          api.text("SWIPE TO MERGE", W / 2, 48, 16, "rgba(255,255,255,0.34)");
        });
      },
      key: function (code) {
        if (code === "ArrowLeft" || code === "KeyA") move(0);
        else if (code === "ArrowRight" || code === "KeyD") move(1);
        else if (code === "ArrowUp" || code === "KeyW") move(2);
        else if (code === "ArrowDown" || code === "KeyS") move(3);
      },
      swipe: function (dx, dy) {
        if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 1 : 0);
        else move(dy > 0 ? 3 : 2);
      },
      down: function (px, py) { S.input(px, py); },
    };
  });

  /* 25. Slide -------------------------------------------------------------- */
  A.register("slide", function (api) {
    var S = A.begin(api);
    var tiles = [1, 2, 3, 4, 5, 6, 7, 8, 0], blank = 8;
    function legal(i) {
      var x = i % 3, y = Math.floor(i / 3);
      var bx = blank % 3, by = Math.floor(blank / 3);
      return Math.abs(x - bx) + Math.abs(y - by) === 1;
    }
    function shuffle() {
      tiles = [1, 2, 3, 4, 5, 6, 7, 8, 0]; blank = 8;
      var last = -1;
      for (var step = 0; step < 80; step++) {
        var choices = [];
        for (var i = 0; i < 9; i++) if (legal(i) && i !== last) choices.push(i);
        var pick = choices[Math.floor(S.rand(0, choices.length))];
        tiles[blank] = tiles[pick]; tiles[pick] = 0; last = blank; blank = pick;
      }
      if (solved()) shuffle();
    }
    function solved() {
      for (var i = 0; i < 8; i++) if (tiles[i] !== i + 1) return false;
      return tiles[8] === 0;
    }
    shuffle();
    return {
      update: function (dt) { S.update(dt); },
      draw: function () {
        S.frame(function () {
          var ctx = api.ctx, size = 420, cell = 132, gap = 12, off = (W - size) / 2;
          for (var i = 0; i < 9; i++) {
            var x = off + (i % 3) * (cell + gap), y = off + Math.floor(i / 3) * (cell + gap);
            if (!tiles[i]) continue;
            ctx.fillStyle = api.accent;
            rr(ctx, x, y, cell, cell, 18); ctx.fill();
            ctx.fillStyle = "rgba(0,0,0,0.24)";
            rr(ctx, x + 6, y + 6, cell - 12, cell - 12, 14); ctx.fill();
            api.text(String(tiles[i]), x + cell / 2, y + cell / 2, 48, "#fff");
          }
          api.text("SLIDE INTO ORDER", W / 2, 44, 16, "rgba(255,255,255,0.36)");
        });
      },
      tap: function (px, py) {
        var p = S.input(px, py); if (!p) return;
        var size = 420, cell = 132, gap = 12, off = (W - size) / 2;
        var x = Math.floor((p.x - off) / (cell + gap)), y = Math.floor((p.y - off) / (cell + gap));
        if (x < 0 || y < 0 || x >= 3 || y >= 3) return;
        var i = y * 3 + x;
        if (!legal(i)) return;
        tiles[blank] = tiles[i]; tiles[i] = 0; blank = i;
        api.sfx("pick");
        if (solved()) { S.add(2); S.spark(p.x, p.y, api.accent, 10); api.sfx("good"); shuffle(); }
      },
    };
  });

  /* 26. Crates ------------------------------------------------------------- */
  A.register("crates", function (api) {
    var S = A.begin(api);
    var n = 7, cell = 72, off = (W - n * cell) / 2;
    var player = { x: 2, y: 3 }, crate = { x: 3, y: 3 }, target = { x: 4, y: 3 };
    var walls = {};
    function key(x, y) { return x + "," + y; }
    function make() {
      walls = {};
      for (var i = 0; i < n; i++) { walls[key(i, 0)] = 1; walls[key(i, n - 1)] = 1; walls[key(0, i)] = 1; walls[key(n - 1, i)] = 1; }
      var free = [];
      for (var x = 1; x < n - 1; x++) for (var y = 1; y < n - 1; y++) free.push({ x: x, y: y });
      function pick() { return free.splice(Math.floor(S.rand(0, free.length)), 1)[0]; }
      player = pick(); crate = pick(); target = pick();
      while (Math.abs(player.x - crate.x) + Math.abs(player.y - crate.y) < 2) crate = pick();
      while (crate.x === target.x && crate.y === target.y) target = pick();
    }
    make();
    function move(dx, dy) {
      var nx = player.x + dx, ny = player.y + dy;
      if (walls[key(nx, ny)]) return;
      if (crate.x === nx && crate.y === ny) {
        var cx = crate.x + dx, cy = crate.y + dy;
        if (walls[key(cx, cy)]) return;
        crate.x = cx; crate.y = cy;
      }
      player.x = nx; player.y = ny;
      if (crate.x === target.x && crate.y === target.y) {
        S.add(1); S.spark(off + target.x * cell + cell / 2, off + target.y * cell + cell / 2, api.accent, 10);
        api.sfx("good"); make();
      }
    }
    return {
      update: function (dt) { S.update(dt); },
      draw: function () {
        S.frame(function () {
          var ctx = api.ctx;
          ctx.fillStyle = "rgba(255,255,255,0.035)";
          ctx.fillRect(off, off, n * cell, n * cell);
          for (var x = 0; x < n; x++) for (var y = 0; y < n; y++) {
            if (!walls[key(x, y)]) continue;
            ctx.fillStyle = "rgba(248,113,113,0.25)";
            ctx.fillRect(off + x * cell + 2, off + y * cell + 2, cell - 4, cell - 4);
          }
          ctx.fillStyle = "rgba(255,255,255,0.1)";
          ctx.beginPath(); ctx.arc(off + target.x * cell + cell / 2, off + target.y * cell + cell / 2, 23, 0, TAU); ctx.fill();
          ctx.strokeStyle = api.accent; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(off + target.x * cell + cell / 2, off + target.y * cell + cell / 2, 23, 0, TAU); ctx.stroke();
          ctx.fillStyle = "#fbbf24";
          rr(ctx, off + crate.x * cell + 11, off + crate.y * cell + 11, cell - 22, cell - 22, 8); ctx.fill();
          ctx.strokeStyle = "rgba(0,0,0,0.25)"; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(off + crate.x * cell + 18, off + crate.y * cell + 18); ctx.lineTo(off + crate.x * cell + cell - 18, off + crate.y * cell + cell - 18); ctx.stroke();
          ctx.fillStyle = "#fff";
          ctx.beginPath(); ctx.arc(off + player.x * cell + cell / 2, off + player.y * cell + cell / 2, 17, 0, TAU); ctx.fill();
        });
      },
      key: function (code) {
        if (code === "ArrowLeft" || code === "KeyA") move(-1, 0);
        else if (code === "ArrowRight" || code === "KeyD") move(1, 0);
        else if (code === "ArrowUp" || code === "KeyW") move(0, -1);
        else if (code === "ArrowDown" || code === "KeyS") move(0, 1);
      },
      swipe: function (dx, dy) {
        if (Math.abs(dx) > Math.abs(dy)) move(dx, 0); else move(0, dy);
      },
      down: function (px, py) { S.input(px, py); },
    };
  });

  /* 27. Nonogram ----------------------------------------------------------- */
  A.register("nonogram", function (api) {
    var S = A.begin(api);
    var n = 5, cell = 72, off = 160;
    var solution = [], player = [];
    function clue(line) {
      var out = [], run = 0;
      for (var i = 0; i < line.length; i++) {
        if (line[i]) run++;
        else if (run) { out.push(run); run = 0; }
      }
      if (run) out.push(run);
      return out.length ? out : [0];
    }
    function make() {
      solution = []; player = [];
      for (var i = 0; i < n * n; i++) {
        solution.push(S.rand() < 0.45 ? 1 : 0);
        player.push(0);
      }
      if (solution.every(function (v) { return !v; })) solution[0] = 1;
    }
    make();
    function solved() {
      for (var i = 0; i < n * n; i++) if (solution[i] !== player[i]) return false;
      return true;
    }
    return {
      update: function (dt) { S.update(dt); },
      draw: function () {
        S.frame(function () {
          var ctx = api.ctx;
          for (var r = 0; r < n; r++) {
            var row = clue(solution.slice(r * n, r * n + n));
            api.text(row.join(" "), 90, off + r * cell + cell / 2, 22, "rgba(255,255,255,0.66)");
            var col = clue([0, 1, 2, 3, 4].map(function (c) { return solution[c * n + r]; }));
            api.text(col.join(" "), off + r * cell + cell / 2, 105, 18, "rgba(255,255,255,0.55)");
          }
          for (var i = 0; i < n * n; i++) {
            var x = off + (i % n) * cell, y = off + Math.floor(i / n) * cell;
            ctx.fillStyle = player[i] ? api.accent : "rgba(255,255,255,0.055)";
            rr(ctx, x + 3, y + 3, cell - 6, cell - 6, 8); ctx.fill();
            ctx.strokeStyle = "rgba(255,255,255,0.13)"; ctx.lineWidth = 1; ctx.stroke();
          }
          api.text("FILL THE CLUES", W / 2, 42, 16, "rgba(255,255,255,0.34)");
        });
      },
      tap: function (px, py) {
        var p = S.input(px, py); if (!p) return;
        var x = Math.floor((p.x - off) / cell), y = Math.floor((p.y - off) / cell);
        if (x < 0 || y < 0 || x >= n || y >= n) return;
        player[y * n + x] = 1 - player[y * n + x];
        api.sfx("pick");
        if (solved()) { S.add(2); S.spark(p.x, p.y, api.accent, 10); api.sfx("good"); make(); }
      },
    };
  });

  /* 28. Mines -------------------------------------------------------------- */
  A.register("mines", function (api) {
    var S = A.begin(api);
    var n = 6, cell = 72, off = (W - n * cell) / 2;
    var mines = [], open = [], flag = [];
    function reset() {
      mines = []; open = []; flag = [];
      for (var i = 0; i < n * n; i++) { mines.push(0); open.push(0); flag.push(0); }
      var planted = 0;
      while (planted < 6) {
        var i = Math.floor(S.rand(0, n * n));
        if (i === 0 || mines[i]) continue;
        mines[i] = 1; planted++;
      }
      reveal(0);
    }
    function around(i) {
      var x = i % n, y = Math.floor(i / n), count = 0;
      for (var yy = -1; yy <= 1; yy++) for (var xx = -1; xx <= 1; xx++) {
        if (!xx && !yy) continue;
        var nx = x + xx, ny = y + yy;
        if (nx >= 0 && ny >= 0 && nx < n && ny < n && mines[ny * n + nx]) count++;
      }
      return count;
    }
    function reveal(i) {
      if (open[i] || flag[i]) return;
      open[i] = 1;
      if (around(i) === 0) {
        var x = i % n, y = Math.floor(i / n);
        for (var yy = -1; yy <= 1; yy++) for (var xx = -1; xx <= 1; xx++) {
          var nx = x + xx, ny = y + yy;
          if (nx >= 0 && ny >= 0 && nx < n && ny < n && !open[ny * n + nx] && !mines[ny * n + nx]) reveal(ny * n + nx);
        }
      }
    }
    function complete() {
      for (var i = 0; i < n * n; i++) if (!mines[i] && !open[i]) return false;
      return true;
    }
    reset();
    return {
      update: function (dt) { S.update(dt); },
      draw: function () {
        S.frame(function () {
          var ctx = api.ctx;
          for (var i = 0; i < n * n; i++) {
            var x = off + (i % n) * cell, y = off + Math.floor(i / n) * cell;
            ctx.fillStyle = open[i] ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.12)";
            rr(ctx, x + 2, y + 2, cell - 4, cell - 4, 7); ctx.fill();
            if (open[i]) {
              var count = around(i);
              if (count) api.text(String(count), x + cell / 2, y + cell / 2, 26, count > 3 ? "#f87171" : "#f8fafc");
            }
          }
          api.text("CLEAR THE FIELD", W / 2, 44, 16, "rgba(255,255,255,0.34)");
        });
      },
      tap: function (px, py) {
        var p = S.input(px, py); if (!p) return;
        var x = Math.floor((p.x - off) / cell), y = Math.floor((p.y - off) / cell);
        if (x < 0 || y < 0 || x >= n || y >= n) return;
        var i = y * n + x;
        if (open[i]) return;
        if (mines[i]) { S.fail(1); reset(); return; }
        reveal(i); api.sfx("pick");
        if (complete()) { S.add(2); S.spark(p.x, p.y, api.accent, 10); api.sfx("good"); reset(); }
      },
    };
  });

  /* 29. Wordfind ----------------------------------------------------------- */
  A.register("wordfind", function (api) {
    var S = A.begin(api);
    var n = 6, cell = 72, off = (W - n * cell) / 2;
    var WORDS = ["NEON", "GRID", "PULSE", "BYTE", "LIGHT", "RUNE", "PIXEL", "LOOP", "STAR", "ARCADE"];
    var letters = [], placed = [], found = [], start = null, path = [];
    function cellKey(x, y) { return x + "," + y; }
    function make() {
      letters = [];
      for (var i = 0; i < n * n; i++) letters.push("");
      placed = [];
      found = [];
      start = null; path = [];
      var pool = WORDS.slice();
      var need = 4;
      for (var w = 0; w < need; w++) {
        var word = pool.splice(Math.floor(S.rand(0, pool.length)), 1)[0];
        var tries = 0, ok = false;
        while (!ok && tries++ < 80) {
          var dir = S.rand() < 0.5 ? [1, 0] : [0, 1];
          var x = Math.floor(S.rand(0, n - (dir[0] ? word.length : 1)));
          var y = Math.floor(S.rand(0, n - (dir[1] ? word.length : 1)));
          var free = true;
          for (var i = 0; i < word.length; i++) {
            var v = letters[(y + dir[1] * i) * n + x + dir[0] * i];
            if (v && v !== word[i]) free = false;
          }
          if (!free) continue;
          var cells = [];
          for (var j = 0; j < word.length; j++) {
            var cx = x + dir[0] * j, cy = y + dir[1] * j;
            letters[cy * n + cx] = word[j];
            cells.push({ x: cx, y: cy });
          }
          placed.push({ word: word, cells: cells });
          ok = true;
        }
      }
      for (var k = 0; k < n * n; k++) if (!letters[k]) letters[k] = String.fromCharCode(65 + Math.floor(S.rand(0, 26)));
    }
    make();
    function wordFor(cells) {
      var s = cells.map(function (p) { return letters[p.y * n + p.x]; }).join("");
      for (var i = 0; i < placed.length; i++) {
        if (placed[i].word === s || placed[i].word.split("").reverse().join("") === s) return placed[i];
      }
      return null;
    }
    return {
      update: function (dt) { S.update(dt); },
      draw: function () {
        S.frame(function () {
          var ctx = api.ctx;
          for (var i = 0; i < n * n; i++) {
            var x = off + (i % n) * cell, y = off + Math.floor(i / n) * cell;
            ctx.fillStyle = "rgba(255,255,255,0.045)";
            rr(ctx, x + 2, y + 2, cell - 4, cell - 4, 8); ctx.fill();
            api.text(letters[i], x + cell / 2, y + cell / 2, 28, "#f8fafc");
          }
          placed.forEach(function (p) {
            if (found.indexOf(p.word) === -1) return;
            p.cells.forEach(function (c) {
              ctx.fillStyle = "rgba(232,121,249,0.24)";
              ctx.fillRect(off + c.x * cell + 2, off + c.y * cell + 2, cell - 4, cell - 4);
            });
          });
          path.forEach(function (p) {
            ctx.fillStyle = api.accent;
            ctx.beginPath(); ctx.arc(off + p.x * cell + cell / 2, off + p.y * cell + cell / 2, 9, 0, TAU); ctx.fill();
          });
          api.text(found.length + " / " + placed.length, W / 2, 42, 18, "rgba(255,255,255,0.4)");
        });
      },
      down: function (px, py) {
        var p = S.input(px, py); if (!p) return;
        var x = Math.floor((p.x - off) / cell), y = Math.floor((p.y - off) / cell);
        if (x < 0 || y < 0 || x >= n || y >= n) return;
        start = { x: x, y: y }; path = [start];
      },
      move: function (px, py) {
        if (!start) return;
        var p = S.input(px, py); if (!p) return;
        var x = Math.floor((p.x - off) / cell), y = Math.floor((p.y - off) / cell);
        if (x < 0 || y < 0 || x >= n || y >= n) return;
        var last = path[path.length - 1];
        if (last.x === x && last.y === y) return;
        if (Math.abs(last.x - x) > 1 || Math.abs(last.y - y) > 1) return;
        path.push({ x: x, y: y });
        if (path.length > 8) path.shift();
      },
      release: function () {
        if (!start) return;
        var hit = wordFor(path);
        start = null;
        if (hit && found.indexOf(hit.word) === -1) {
          found.push(hit.word);
          S.add(1); S.spark(W / 2, H / 2, api.accent, 8); api.sfx("good");
          if (found.length === placed.length) { S.add(3); api.sfx("win"); make(); }
        }
        path = [];
      },
    };
  });

  /* 30. Typing ------------------------------------------------------------- */
  A.register("typing", function (api) {
    var S = A.begin(api);
    var WORDS = ["neon", "grid", "pulse", "byte", "light", "rune", "pixel", "loop", "star", "arcade", "spark", "glow"];
    var words = [], spawn = 0.6, typed = "";
    function spawnWord() {
      var word = WORDS[Math.floor(S.rand(0, WORDS.length))];
      words.push({ text: word, x: S.rand(80, W - 80), y: 90, speed: S.rand(22, 36) * S.speed });
    }
    return {
      update: function (dt) {
        if (!S.update(dt)) return;
        spawn -= dt;
        if (spawn <= 0 && words.length < 5) { spawnWord(); spawn = Math.max(0.8, 1.7 - S.score * 0.02); }
        for (var i = words.length - 1; i >= 0; i--) {
          words[i].y += words[i].speed * dt;
          if (words[i].y > H - 52) {
            words.splice(i, 1); S.fail(1); typed = "";
          }
        }
      },
      draw: function () {
        S.frame(function () {
          var ctx = api.ctx;
          words.forEach(function (w) {
            var matched = typed && w.text.indexOf(typed) === 0;
            api.text(w.text, w.x, w.y, 26, matched ? api.accent : "rgba(255,255,255,0.8)");
            ctx.strokeStyle = matched ? api.accent : "rgba(255,255,255,0.18)";
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(w.x - 36, w.y + 20); ctx.lineTo(w.x + 36, w.y + 20); ctx.stroke();
          });
          ctx.fillStyle = "rgba(255,255,255,0.07)";
          rr(ctx, 96, H - 44, W - 192, 32, 16); ctx.fill();
          api.text(typed || "TYPE A WORD", W / 2, H - 28, 20, typed ? api.accent : "rgba(255,255,255,0.35)");
          api.text("TYPE FAST", W / 2, 44, 16, "rgba(255,255,255,0.36)");
        });
      },
      key: function (code) {
        if (code === "Backspace") { typed = typed.slice(0, -1); return; }
        var m = /^Key([A-Z])$/.exec(code);
        if (!m) return;
        var ch = m[1].toLowerCase();
        var candidate = typed + ch;
        var possible = words.some(function (w) { return w.text.indexOf(candidate) === 0; });
        if (!possible) { typed = ""; api.sfx("bad"); return; }
        typed = candidate;
        for (var i = words.length - 1; i >= 0; i--) {
          if (words[i].text === typed) {
            words.splice(i, 1); S.add(1); S.spark(W / 2, H - 60, api.accent, 7); api.sfx("good");
            typed = ""; break;
          }
        }
      },
    };
  });
})();
