/* Minesweeper — 9x9, 10 mines, first tap always safe, fastest clear is the record. */
(function () {
  "use strict";

  var COLS = 9;
  var ROWS = 9;
  var MINES = 10;
  var TOTAL = COLS * ROWS;

  var boardEl = document.getElementById("board");
  var overlay = document.getElementById("overlay");
  var minesEl = document.getElementById("mines");
  var timeEl = document.getElementById("time");
  var clearedEl = document.getElementById("cleared");
  var bestEl = document.getElementById("best");
  var flagBtn = document.getElementById("flagMode");

  var cells = [];
  var placed = false;
  var flags = 0;
  var revealedCount = 0;
  var over = false;
  var startedAt = 0;
  var ticker = null;
  var flagMode = false;
  var longPressTimer = null;
  var longFired = false;

  var best = PP.scores.get("minesweeper"); // seconds, lower is better

  function paintBest() {
    bestEl.textContent = best === null ? "—" : best + "s";
  }

  function formatTime(ms) {
    var total = Math.floor(ms / 1000);
    var mins = Math.floor(total / 60);
    var secs = total % 60;
    return mins + ":" + (secs < 10 ? "0" : "") + secs;
  }

  function paintHud() {
    minesEl.textContent = Math.max(0, MINES - flags);
    clearedEl.textContent = revealedCount + " / " + (TOTAL - MINES);
    paintBest();
  }

  function neighbors(index) {
    var r = Math.floor(index / COLS);
    var c = index % COLS;
    var out = [];
    for (var dr = -1; dr <= 1; dr++) {
      for (var dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        var nr = r + dr;
        var nc = c + dc;
        if (nr < 0 || nc < 0 || nr >= ROWS || nc >= COLS) continue;
        out.push(nr * COLS + nc);
      }
    }
    return out;
  }

  function startTimer() {
    if (ticker) return;
    startedAt = Date.now();
    ticker = setInterval(function () {
      timeEl.textContent = formatTime(Date.now() - startedAt);
    }, 250);
  }

  function stopTimer() {
    if (ticker) clearInterval(ticker);
    ticker = null;
  }

  function placeMines(safeIndex) {
    var banned = {};
    banned[safeIndex] = true;
    neighbors(safeIndex).forEach(function (i) { banned[i] = true; });

    var pool = [];
    for (var i = 0; i < TOTAL; i++) if (!banned[i]) pool.push(i);

    // Shuffle and take the first MINES
    for (var k = pool.length - 1; k > 0; k--) {
      var j = Math.floor(Math.random() * (k + 1));
      var tmp = pool[k];
      pool[k] = pool[j];
      pool[j] = tmp;
    }
    pool.slice(0, MINES).forEach(function (index) { cells[index].mine = true; });

    for (var n = 0; n < TOTAL; n++) {
      cells[n].adj = neighbors(n).filter(function (m) { return cells[m].mine; }).length;
    }
    placed = true;
  }

  function paintTile(index) {
    var cell = cells[index];
    var el = cell.el;
    if (!el) return;
    if (cell.revealed) {
      if (el.getAttribute("data-state") !== "revealed" && !cell.mine) {
        el.classList.add("just-revealed");
      }
      el.setAttribute("data-state", "revealed");
      el.textContent = cell.mine ? "💣" : cell.adj ? String(cell.adj) : "";
      if (cell.adj) el.setAttribute("data-n", String(cell.adj));
      else el.removeAttribute("data-n");
    } else if (cell.flagged) {
      el.setAttribute("data-state", "flagged");
      el.textContent = "🚩";
      el.removeAttribute("data-n");
    } else {
      el.setAttribute("data-state", "hidden");
      el.textContent = "";
      el.removeAttribute("data-n");
    }
  }

  function flood(start) {
    var stack = [start];
    while (stack.length) {
      var index = stack.pop();
      var cell = cells[index];
      if (cell.revealed || cell.flagged) continue;
      cell.revealed = true;
      revealedCount++;
      paintTile(index);
      if (cell.adj === 0 && !cell.mine) {
        neighbors(index).forEach(function (n) {
          if (!cells[n].revealed && !cells[n].flagged) stack.push(n);
        });
      }
    }
  }

  function toggleFlag(index) {
    var cell = cells[index];
    if (over || cell.revealed) return;
    cell.flagged = !cell.flagged;
    flags += cell.flagged ? 1 : -1;
    paintTile(index);
    paintHud();
    PP.sfx("pick");
    PP.juice.haptic(8);
    PP.juice.bump(minesEl);
  }

  function reveal(index) {
    if (over) return;
    var cell = cells[index];
    if (cell.revealed || cell.flagged) return;

    if (!placed) {
      placeMines(index);
      startTimer();
    }

    if (cell.mine) {
      boom(index);
      return;
    }

    flood(index);
    PP.sfx("good");
    paintHud();
    checkWin();
  }

  function boom(index) {
    over = true;
    stopTimer();
    PP.sfx("bad");
    cells.forEach(function (cell, i) {
      if (cell.mine && !cell.flagged) {
        cell.revealed = true;
        paintTile(i);
        if (i === index) cell.el.setAttribute("data-state", "mine");
      } else if (!cell.mine && cell.flagged) {
        cell.el.setAttribute("data-state", "wrong");
        cell.el.textContent = "✕";
      }
    });
    cell_markMine(index);

    PP.juice.shake(document.querySelector(".stage"), 12);
    PP.juice.haptic([40, 60, 90]);
    PP.juice.burstAt(cells[index].el, "#ef4444", 18, 90);

    PP.showOverlay(
      overlay,
      '<p class="kicker">Boom</p><h2>That was a mine</h2>' +
        "<p>You cleared " + revealedCount + " of " + (TOTAL - MINES) + " safe squares.</p>" +
        '<div class="actions"><button class="btn" type="button" id="again">New board</button></div>'
    );
    overlay.querySelector("#again").addEventListener("click", reset);
  }

  function cell_markMine(index) {
    if (cells[index] && cells[index].el) {
      cells[index].el.setAttribute("data-state", "mine");
      cells[index].el.textContent = "💥";
    }
  }

  function checkWin() {
    if (revealedCount !== TOTAL - MINES) return;
    over = true;
    stopTimer();
    PP.sfx("win");
    PP.juice.shake(document.querySelector(".stage"), 5);
    PP.juice.haptic([20, 40, 20]);
    var seconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    var previous = best;
    best = PP.scores.save("minesweeper", seconds, "low");
    paintBest();
    PP.leaderboard.submit("minesweeper", seconds);

    cells.forEach(function (cell, i) {
      if (cell.mine && !cell.flagged) {
        cell.flagged = true;
        flags++;
        paintTile(i);
      }
    });
    paintHud();

    PP.showOverlay(
      overlay,
      '<p class="kicker">Board cleared</p><h2>All safe squares</h2>' +
        '<div class="score-big">' + seconds + "s</div>" +
        "<p>" + (previous === null || seconds < previous
          ? "New fastest clear!"
          : "Fastest clear: " + best + "s.") + "</p>" +
        '<div class="actions"><button class="btn" type="button" id="again">Play again</button></div>'
    );
    overlay.querySelector("#again").addEventListener("click", reset);
  }

  function setFlagMode(on) {
    flagMode = on;
    flagBtn.setAttribute("aria-pressed", on ? "true" : "false");
    flagBtn.textContent = on ? "🚩 Flag mode on" : "🚩 Flag mode off";
  }

  function reset() {
    PP.hideOverlay(overlay);
    stopTimer();
    cells = [];
    flags = 0;
    revealedCount = 0;
    over = false;
    placed = false;
    startedAt = 0;
    boardEl.innerHTML = "";
    timeEl.textContent = "0:00";

    for (var i = 0; i < TOTAL; i++) {
      var el = document.createElement("button");
      el.type = "button";
      el.className = "mine-tile";
      el.setAttribute("data-state", "hidden");
      el.setAttribute("aria-label", "Square " + (i + 1) + ", hidden");

      var cell = { mine: false, adj: 0, revealed: false, flagged: false, el: el };
      cells.push(cell);

      bindTile(el, i);
      boardEl.appendChild(el);
    }

    paintHud();
  }

  function bindTile(el, index) {
    el.addEventListener("pointerdown", function (event) {
      if (event.button !== 0) return;
      event.preventDefault();
      longFired = false;
      clearTimeout(longPressTimer);
      longPressTimer = setTimeout(function () {
        longFired = true;
        toggleFlag(index);
      }, 380);
    });

    el.addEventListener("pointerup", function () {
      clearTimeout(longPressTimer);
      if (longFired) {
        longFired = false;
        return;
      }
      if (flagMode) toggleFlag(index);
      else reveal(index);
    });

    el.addEventListener("pointercancel", function () {
      clearTimeout(longPressTimer);
      longFired = false;
    });
    el.addEventListener("pointerleave", function () {
      clearTimeout(longPressTimer);
    });

    el.addEventListener("contextmenu", function (event) {
      event.preventDefault();
      if (!longFired) toggleFlag(index);
    });
  }

  flagBtn.addEventListener("click", function () {
    setFlagMode(!flagMode);
    PP.sfx("pick");
  });
  document.getElementById("newGame").addEventListener("click", reset);

  setFlagMode(false);
  reset();
})();
