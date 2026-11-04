/* Prism — rotate the mirrors until the beam finds the gem. Five puzzles a run. */
(function () {
  "use strict";

  var SIZE = 7;
  var CELL = 80;
  var W = SIZE * CELL;
  var H = SIZE * CELL;
  var PUZZLES = 5;

  var canvas = document.getElementById("board");
  var ctx = PP.fitCanvas(canvas, W, H);
  var stageEl = document.querySelector(".stage");
  var overlay = document.getElementById("overlay");
  var puzzleEl = document.getElementById("puzzle");
  var movesEl = document.getElementById("moves");
  var bestEl = document.getElementById("best");

  var best = PP.scores.get("prism");
  bestEl.textContent = best === null ? "—" : PP.formatNumber(best) + " rotations";

  var game = null;

  function mirrorAt(list, x, y) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].x === x && list[i].y === y) return list[i];
    }
    return null;
  }

  /* --------------------------------------------------------------- the beam */

  /**
   * Walk the beam cell by cell. Returns the polyline to draw and whether it
   * reached the gem. Mirrors flip the direction: "/" is (dx,dy) -> (-dy,-dx),
   * "\" is (dx,dy) -> (dy,dx).
   */
  function trace(puzzle) {
    var cx = 0;
    var cy = puzzle.row;
    var dx = 1;
    var dy = 0;
    var points = [{ x: 0, y: cy * CELL + CELL / 2 }];
    var hit = false;
    var guard = 0;

    while (guard++ < 80) {
      if (cx < 0 || cy < 0 || cx >= SIZE || cy >= SIZE) break;
      points.push({ x: cx * CELL + CELL / 2, y: cy * CELL + CELL / 2 });
      if (cx === puzzle.target.x && cy === puzzle.target.y) {
        hit = true;
        break;
      }
      var mirror = mirrorAt(puzzle.mirrors, cx, cy);
      if (mirror) {
        var was = dx;
        if (mirror.orient === 0) {
          dx = -dy;
          dy = -was;
        } else {
          dx = dy;
          dy = was;
        }
      }
      cx += dx;
      cy += dy;
    }

    return { points: points, hit: hit };
  }

  /* ------------------------------------------------------------- generation */

  /**
   * Build a solvable board: a beam path is laid out from the emitter, through
   * two corners, into the gem — then every mirror is scrambled. Whatever the
   * scramble, the original orientations always solve it.
   */
  function makePuzzle(level) {
    var row = 1 + Math.floor(Math.random() * (SIZE - 2));
    var targetY = row;
    while (targetY === row) targetY = 1 + Math.floor(Math.random() * (SIZE - 2));
    var targetX = 3 + Math.floor(Math.random() * (SIZE - 3));
    var cornerX = 1 + Math.floor(Math.random() * (targetX - 1));
    var orient = targetY > row ? 1 : 0;

    var mirrors = [
      { x: cornerX, y: row, orient: orient },
      { x: cornerX, y: targetY, orient: orient },
    ];

    var path = {};
    var i;
    for (i = 0; i <= cornerX; i++) path[i + "," + row] = true;
    for (i = Math.min(row, targetY); i <= Math.max(row, targetY); i++) {
      path[cornerX + "," + i] = true;
    }
    for (i = cornerX; i <= targetX; i++) path[i + "," + targetY] = true;

    // A few decoy mirrors, always off the solution path.
    var extras = Math.min(1 + Math.floor(level / 2), 4);
    var guard = 0;
    while (extras > 0 && guard++ < 100) {
      var x = 1 + Math.floor(Math.random() * (SIZE - 1));
      var y = Math.floor(Math.random() * SIZE);
      if (path[x + "," + y]) continue;
      if (x === targetX && y === targetY) continue;
      if (mirrorAt(mirrors, x, y)) continue;
      mirrors.push({ x: x, y: y, orient: Math.random() < 0.5 ? 0 : 1 });
      extras--;
    }

    var puzzle = { row: row, target: { x: targetX, y: targetY }, mirrors: mirrors, moves: 0 };

    var tries = 0;
    do {
      puzzle.mirrors.forEach(function (m) { m.orient = Math.random() < 0.5 ? 0 : 1; });
      tries++;
    } while (trace(puzzle).hit && tries < 60);

    return puzzle;
  }

  /* ------------------------------------------------------------------- run */

  function paintHud() {
    puzzleEl.textContent = (game.index + 1) + " / " + PUZZLES;
    movesEl.textContent = game.rotations;
    bestEl.textContent = best === null ? "—" : PP.formatNumber(best) + " rotations";
  }

  function startRun() {
    PP.hideOverlay(overlay);

    var puzzles = [];
    for (var i = 0; i < PUZZLES; i++) puzzles.push(makePuzzle(i + 1));
    game = { puzzles: puzzles, index: 0, rotations: 0, solved: 0, locked: false, running: true };

    paintHud();
    draw();
    PP.sfx("pick");
  }

  function current() {
    return game ? game.puzzles[game.index] : null;
  }

  function cellFromEvent(event) {
    var rect = canvas.getBoundingClientRect();
    var x = Math.floor(((event.clientX - rect.left) / rect.width) * SIZE);
    var y = Math.floor(((event.clientY - rect.top) / rect.height) * SIZE);
    if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return null;
    return { x: x, y: y };
  }

  function solved() {
    var puzzle = current();
    game.locked = true;
    game.solved++;

    PP.sfx("win");
    PP.juice.haptic([15, 45, 15]);
    PP.juice.bump(movesEl);
    if (puzzle) {
      PP.juice.burstOn(canvas, puzzle.target.x * CELL + CELL / 2,
        puzzle.target.y * CELL + CELL / 2, "#34d399", 18, 72);
    }

    setTimeout(function () {
      if (!game || !game.running) return;
      if (game.index + 1 >= PUZZLES) {
        endRun();
        return;
      }
      game.index++;
      game.locked = false;
      paintHud();
    }, 820);
  }

  function endRun() {
    game.running = false;
    game.locked = true;

    var total = game.rotations;
    var previous = best;
    best = PP.scores.save("prism", total, "low");
    paintHud();
    PP.leaderboard.submit("prism", total);

    PP.showOverlay(
      overlay,
      '<p class="kicker">Five puzzles solved</p>' +
        "<h2>" + (previous === null || total < previous ? "Cleanest run yet" : "Puzzles cleared") + "</h2>" +
        '<div class="score-big">' + total + " rotation" + (total === 1 ? "" : "s") + "</div>" +
        "<p>Fewer rotations is better. Personal best: " +
        (best === null ? "—" : PP.formatNumber(best)) + ".</p>" +
        '<div class="actions"><button class="btn" type="button" id="again">Five more</button></div>'
    );
    overlay.querySelector("#again").addEventListener("click", startRun);
  }

  /* ---------------------------------------------------------------- drawing */

  function draw() {
    var bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#0b1020");
    bg.addColorStop(1, "#0a0d1a");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "rgba(255,255,255,0.055)";
    ctx.lineWidth = 1;
    for (var i = 0; i <= SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL, 0);
      ctx.lineTo(i * CELL, H);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * CELL);
      ctx.lineTo(W, i * CELL);
      ctx.stroke();
    }

    if (!game) return;

    var puzzle = current();
    if (!puzzle) return;
    var beam = trace(puzzle);

    // Mirror pads first, so the bar sits on top.
    puzzle.mirrors.forEach(function (m) {
      var cx = m.x * CELL + CELL / 2;
      var cy = m.y * CELL + CELL / 2;
      ctx.fillStyle = "rgba(167,139,250,0.22)";
      ctx.beginPath();
      ctx.arc(cx, cy, CELL * 0.32, 0, Math.PI * 2);
      ctx.fill();

      var pad = CELL * 0.2;
      ctx.save();
      ctx.lineCap = "round";
      ctx.shadowColor = "#a78bfa";
      ctx.shadowBlur = 14;
      ctx.strokeStyle = "#c4b5fd";
      ctx.lineWidth = 7;
      ctx.beginPath();
      if (m.orient === 0) {
        ctx.moveTo(cx - pad, cy + pad);
        ctx.lineTo(cx + pad, cy - pad);
      } else {
        ctx.moveTo(cx - pad, cy - pad);
        ctx.lineTo(cx + pad, cy + pad);
      }
      ctx.stroke();
      ctx.restore();
    });

    // The gem.
    var gx = puzzle.target.x * CELL + CELL / 2;
    var gy = puzzle.target.y * CELL + CELL / 2;
    var gem = CELL * 0.26;
    ctx.save();
    ctx.translate(gx, gy);
    ctx.rotate(Math.PI / 4);
    ctx.shadowColor = "#34d399";
    ctx.shadowBlur = beam.hit ? 34 : 16;
    ctx.fillStyle = beam.hit ? "#6ee7b7" : "rgba(52,211,153,0.4)";
    ctx.fillRect(-gem / 2, -gem / 2, gem, gem);
    ctx.restore();

    // Emitter.
    var ey = puzzle.row * CELL + CELL / 2;
    ctx.save();
    ctx.shadowColor = "#f472b6";
    ctx.shadowBlur = 22;
    ctx.fillStyle = "#f472b6";
    ctx.beginPath();
    ctx.moveTo(0, ey);
    ctx.lineTo(CELL * 0.28, ey - CELL * 0.15);
    ctx.lineTo(CELL * 0.28, ey + CELL * 0.15);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Beam: glow, then a bright core.
    var color = beam.hit ? "#6ee7b7" : "#f9a8d4";
    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
    ctx.strokeStyle = color;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(beam.points[0].x, beam.points[0].y);
    for (var p = 1; p < beam.points.length; p++) {
      ctx.lineTo(beam.points[p].x, beam.points[p].y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  /* ------------------------------------------------------------------ input */

  canvas.addEventListener("pointerdown", function (event) {
    if (!game || !game.running || game.locked) return;
    event.preventDefault();

    var puzzle = current();
    var cell = cellFromEvent(event);
    if (!puzzle || !cell) return;

    var mirror = mirrorAt(puzzle.mirrors, cell.x, cell.y);
    if (!mirror) {
      PP.sfx("bad");
      PP.juice.shake(stageEl, 2);
      return;
    }

    mirror.orient = mirror.orient === 0 ? 1 : 0;
    puzzle.moves++;
    game.rotations++;
    PP.sfx("pick");
    PP.juice.haptic(8);
    paintHud();

    if (trace(puzzle).hit) solved();
  });

  canvas.addEventListener("pointermove", function (event) {
    if (!game || !game.running) return;
    var puzzle = current();
    var cell = cellFromEvent(event);
    var over = puzzle && cell && mirrorAt(puzzle.mirrors, cell.x, cell.y);
    canvas.style.cursor = over ? "pointer" : "default";
  });

  /* ----------------------------------------------------------------- states */

  function showStart() {
    PP.showOverlay(
      overlay,
      '<p class="kicker">Five puzzles</p><h2>Prism</h2>' +
        "<p>The beam fires from the left. Tap the mirrors to flip them and steer the " +
        "light into the green gem — in as few rotations as you can.</p>" +
        '<div class="actions"><button class="btn" type="button" id="play">Start run</button></div>'
    );
    overlay.querySelector("#play").addEventListener("click", startRun);
  }

  /* ------------------------------------------------------------------- loop */

  function frame() {
    requestAnimationFrame(frame);
    draw();
  }

  showStart();
  requestAnimationFrame(frame);
})();
