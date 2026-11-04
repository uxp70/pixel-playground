/* 2048 — 4x4 merge puzzle with keyboard and swipe support. */
(function () {
  "use strict";

  var SIZE = 4;
  var COUNT = SIZE * SIZE;

  var boardEl = document.getElementById("board2048");
  var overlay = document.getElementById("overlay");
  var scoreEl = document.getElementById("score");
  var topEl = document.getElementById("topTile");
  var bestEl = document.getElementById("best");

  var cells = [];
  for (var i = 0; i < COUNT; i++) {
    var cell = document.createElement("div");
    cell.className = "cell2048";
    boardEl.appendChild(cell);
    cells.push(cell);
  }

  var grid = new Array(COUNT).fill(0);
  var score = 0;
  var won = false;
  var winShown = false;
  var over = false;
  var best = PP.scores.get("2048") || 0;

  function paintHud() {
    scoreEl.textContent = PP.formatNumber(score);
    topEl.textContent = PP.formatNumber(Math.max.apply(null, grid.concat([0])));
    bestEl.textContent = PP.formatNumber(best);
  }

  function render(newIndex, merged) {
    for (var i = 0; i < COUNT; i++) {
      var value = grid[i];
      var cell = cells[i];
      cell.textContent = value ? String(value) : "";
      if (value) {
        cell.setAttribute("data-v", value <= 2048 ? String(value) : "super");
        cell.setAttribute("data-digits", String(value).length);
      } else {
        cell.removeAttribute("data-v");
        cell.removeAttribute("data-digits");
      }
      cell.classList.remove("tile-new", "tile-merged");
    }
    if (typeof newIndex === "number" && newIndex >= 0) {
      cells[newIndex].classList.add("tile-new");
    }
    if (merged) {
      merged.forEach(function (item) {
        if (cells[item.index]) cells[item.index].classList.add("tile-merged");
      });
    }
  }

  function tileColor(value) {
    if (value >= 1024) return "#818cf8";
    if (value >= 128) return "#f472b6";
    if (value >= 16) return "#34d399";
    return "#22d3ee";
  }

  function spawn() {
    var empty = [];
    for (var i = 0; i < COUNT; i++) if (!grid[i]) empty.push(i);
    if (!empty.length) return -1;
    var index = empty[Math.floor(Math.random() * empty.length)];
    grid[index] = Math.random() < 0.9 ? 2 : 4;
    return index;
  }

  function start() {
    grid = new Array(COUNT).fill(0);
    score = 0;
    won = false;
    winShown = false;
    over = false;
    PP.hideOverlay(overlay);
    spawn();
    var second = spawn();
    render(second);
    paintHud();
  }

  function lineIndices(dir) {
    var lines = [];
    for (var i = 0; i < SIZE; i++) {
      var line = [];
      for (var j = 0; j < SIZE; j++) {
        var r, c;
        if (dir === "left") { r = i; c = j; }
        else if (dir === "right") { r = i; c = SIZE - 1 - j; }
        else if (dir === "up") { r = j; c = i; }
        else { r = SIZE - 1 - j; c = i; }
        line.push(r * SIZE + c);
      }
      lines.push(line);
    }
    return lines;
  }

  function collapse(values) {
    var packed = values.filter(Boolean);
    var out = [];
    var gained = 0;
    var mergedAt = [];
    for (var i = 0; i < packed.length; i++) {
      if (packed[i] === packed[i + 1]) {
        var merged = packed[i] * 2;
        mergedAt.push(out.length);
        out.push(merged);
        gained += merged;
        if (merged === 2048) won = true;
        i++;
      } else {
        out.push(packed[i]);
      }
    }
    while (out.length < SIZE) out.push(0);
    return { out: out, gained: gained, mergedAt: mergedAt };
  }

  function stuck() {
    for (var i = 0; i < COUNT; i++) if (!grid[i]) return false;
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        var v = grid[r * SIZE + c];
        if (c + 1 < SIZE && grid[r * SIZE + c + 1] === v) return false;
        if (r + 1 < SIZE && grid[(r + 1) * SIZE + c] === v) return false;
      }
    }
    return true;
  }

  function move(dir) {
    if (over) return;

    var changed = false;
    var gainedTotal = 0;
    var merges = [];

    lineIndices(dir).forEach(function (line) {
      var values = line.map(function (idx) { return grid[idx]; });
      var result = collapse(values);
      for (var k = 0; k < SIZE; k++) {
        if (grid[line[k]] !== result.out[k]) changed = true;
        grid[line[k]] = result.out[k];
      }
      gainedTotal += result.gained;
      result.mergedAt.forEach(function (pos) {
        merges.push({ index: line[pos], value: result.out[pos] });
      });
    });

    if (!changed) return;

    score += gainedTotal;
    if (gainedTotal) PP.sfx("pick");

    render(spawn(), merges);
    best = PP.scores.save("2048", score, "high");
    paintHud();

    if (merges.length) {
      PP.juice.bump(scoreEl);
      PP.juice.haptic(8);
      PP.juice.shake(document.querySelector(".stage"), Math.min(7, 2 + merges.length));
      merges.forEach(function (item) {
        PP.juice.burstAt(cells[item.index], tileColor(item.value), 8, 44);
      });
    }

    if (won && !winShown) {
      winShown = true;
      PP.sfx("win");
      PP.showOverlay(
        overlay,
        '<p class="kicker">You did it</p><h2>2048!</h2>' +
          '<div class="score-big">' + PP.formatNumber(score) + "</div>" +
          "<p>You built the magic tile. Keep sliding for a bigger score?</p>" +
          '<div class="actions"><button class="btn" type="button" id="keep">Keep going</button>' +
          '<button class="btn ghost" type="button" id="restart">New game</button></div>'
      );
      overlay.querySelector("#keep").addEventListener("click", function () {
        PP.hideOverlay(overlay);
      });
      overlay.querySelector("#restart").addEventListener("click", start);
      return;
    }

    if (stuck()) {
      over = true;
      PP.sfx("bad");
      PP.showOverlay(
        overlay,
        '<p class="kicker">No moves left</p><h2>Board full</h2>' +
          '<div class="score-big">' + PP.formatNumber(score) + "</div>" +
          "<p>Best score: " + PP.formatNumber(best) + "</p>" +
          '<div class="actions"><button class="btn" type="button" id="again">Try again</button></div>'
      );
      overlay.querySelector("#again").addEventListener("click", start);
    }
  }

  var KEYMAP = {
    ArrowLeft: "left", KeyA: "left",
    ArrowRight: "right", KeyD: "right",
    ArrowUp: "up", KeyW: "up",
    ArrowDown: "down", KeyS: "down",
  };

  document.addEventListener("keydown", function (event) {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    var dir = KEYMAP[event.code];
    if (!dir) return;
    event.preventDefault();
    move(dir);
  });

  PP.onSwipe(boardEl, function (x, y) {
    move(x === 1 ? "right" : x === -1 ? "left" : y === 1 ? "down" : "up");
  });

  document.getElementById("newGame").addEventListener("click", start);

  start();
})();
