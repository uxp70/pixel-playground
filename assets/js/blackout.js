/* Blackout — clear every light on a 5x5 grid before the clock runs out. */
(function () {
  "use strict";

  var SIZE = 5;
  var RUN_SECONDS = 60;

  var boardEl = document.getElementById("board");
  var overlay = document.getElementById("overlay");
  var boardsEl = document.getElementById("boards");
  var timeEl = document.getElementById("time");
  var movesEl = document.getElementById("moves");
  var bestEl = document.getElementById("best");

  var best = PP.scores.get("blackout") || 0;
  bestEl.textContent = PP.formatNumber(best);

  var game = null;
  var ticker = null;

  function litCount(grid) {
    var lit = 0;
    for (var y = 0; y < SIZE; y++) {
      for (var x = 0; x < SIZE; x++) if (grid[y][x]) lit++;
    }
    return lit;
  }

  function toggleAt(grid, x, y) {
    var cross = [[x, y], [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
    cross.forEach(function (pair) {
      var cx = pair[0];
      var cy = pair[1];
      if (cx < 0 || cy < 0 || cx >= SIZE || cy >= SIZE) return;
      grid[cy][cx] = !grid[cy][cx];
    });
  }

  /** Scramble a solved board, so every board can always be solved again. */
  function makeGrid(level) {
    var grid = [];
    var x;
    var y;
    for (y = 0; y < SIZE; y++) {
      grid.push([]);
      for (x = 0; x < SIZE; x++) grid[y].push(false);
    }

    var scrambles = 3 + Math.min(level, 7);
    for (var i = 0; i < scrambles; i++) {
      toggleAt(grid, Math.floor(Math.random() * SIZE), Math.floor(Math.random() * SIZE));
    }

    if (litCount(grid) === 0) {
      toggleAt(grid, Math.floor(Math.random() * SIZE), Math.floor(Math.random() * SIZE));
    }
    return grid;
  }

  /* ------------------------------------------------------------------- view */

  function paintBoard() {
    for (var y = 0; y < SIZE; y++) {
      for (var x = 0; x < SIZE; x++) {
        var on = game.grid[y][x];
        var tile = game.tiles[y][x];
        if (!tile) continue;
        tile.setAttribute("data-on", on ? "true" : "false");
        tile.setAttribute("aria-label",
          "Row " + (y + 1) + " column " + (x + 1) + ", " + (on ? "lit" : "off"));
      }
    }
  }

  function paintHud() {
    boardsEl.textContent = game.boards;
    movesEl.textContent = game.moves;
    var left = Math.max(0, game.deadline - Date.now());
    timeEl.textContent = Math.ceil(left / 1000) + "s";
    bestEl.textContent = PP.formatNumber(best);
  }

  function buildBoard() {
    boardEl.innerHTML = "";
    game.tiles = [];

    for (var y = 0; y < SIZE; y++) {
      game.tiles.push([]);
      for (var x = 0; x < SIZE; x++) {
        var tile = document.createElement("button");
        tile.type = "button";
        tile.className = "bo-tile";
        tile.setAttribute("data-on", "false");
        tile.setAttribute("aria-label", "Row " + (y + 1) + " column " + (x + 1) + ", off");
        tile.addEventListener("click", makeTap(x, y));
        boardEl.appendChild(tile);
        game.tiles[y].push(tile);
      }
    }
  }

  function makeTap(x, y) {
    return function () { tap(x, y); };
  }

  /* ------------------------------------------------------------------- play */

  function tap(x, y) {
    if (!game || !game.running || game.locked) return;

    toggleAt(game.grid, x, y);
    game.moves++;
    PP.sfx("pick");
    PP.juice.haptic(7);
    PP.juice.burstAt(game.tiles[y][x], "#22d3ee", 7, 30);

    var tile = game.tiles[y][x];
    if (tile) {
      tile.classList.remove("just-flipped");
      void tile.offsetWidth;
      tile.classList.add("just-flipped");
    }

    paintBoard();
    paintHud();

    if (litCount(game.grid) === 0) cleared();
  }

  function cleared() {
    game.locked = true;
    game.boards++;
    game.moves = 0;

    PP.sfx("win");
    PP.juice.haptic([15, 40, 15]);
    PP.juice.bump(boardsEl);
    PP.juice.shake(boardEl, 4);
    PP.juice.burstAt(boardEl, "#34d399", 14, 90);
    paintHud();

    setTimeout(function () {
      if (!game || !game.running) return;
      game.grid = makeGrid(game.boards);
      game.locked = false;
      paintBoard();
    }, 380);
  }

  function start() {
    PP.hideOverlay(overlay);
    if (ticker) clearInterval(ticker);

    game = {
      grid: makeGrid(0),
      boards: 0,
      moves: 0,
      running: true,
      locked: false,
      tiles: [],
      deadline: Date.now() + RUN_SECONDS * 1000,
    };

    buildBoard();
    paintBoard();
    paintHud();
    PP.sfx("pick");

    ticker = setInterval(function () {
      if (!game || !game.running) return;
      var left = Math.max(0, game.deadline - Date.now());
      timeEl.textContent = Math.ceil(left / 1000) + "s";
      if (left <= 0) endRun();
    }, 100);
  }

  function endRun() {
    if (!game || !game.running) return;
    game.running = false;
    game.locked = true;
    if (ticker) clearInterval(ticker);
    ticker = null;

    var previous = best;
    best = PP.scores.save("blackout", game.boards, "high");
    paintHud();

    PP.sfx("bad");
    PP.juice.shake(boardEl, 6);
    PP.juice.haptic([30, 60, 40]);
    PP.leaderboard.submit("blackout", game.boards);

    PP.showOverlay(
      overlay,
      '<p class="kicker">Time up</p>' +
        "<h2>" + (game.boards > previous ? "New best run" : "Lights out") + "</h2>" +
        '<div class="score-big">' + game.boards + " board" + (game.boards === 1 ? "" : "s") + "</div>" +
        "<p>Best run so far: " + PP.formatNumber(best) + " boards in sixty seconds.</p>" +
        '<div class="actions"><button class="btn" type="button" id="again">Run it again</button></div>'
    );
    overlay.querySelector("#again").addEventListener("click", start);
  }

  function showStart() {
    PP.showOverlay(
      overlay,
      '<p class="kicker">Sixty seconds</p><h2>Blackout</h2>' +
        "<p>Tap a square to flip it and its four neighbours. Clear the whole grid " +
        "to score a board — the clock never stops.</p>" +
        '<div class="actions"><button class="btn" type="button" id="play">Start the clock</button></div>'
    );
    overlay.querySelector("#play").addEventListener("click", start);
  }

  showStart();
})();
