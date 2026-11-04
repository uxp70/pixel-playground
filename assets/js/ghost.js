/*
  Ghost Protocol — grid stealth.

  Three floors. Guards walk waypoint loops and see in a 42-degree cone; being
  seen fills an alarm that empties again if you break line of sight. Lift three
  cores, then reach the lift. Every step costs points, being caught costs a lot
  more, so the game is about waiting for the right moment rather than rushing.
*/
(function () {
  "use strict";

  var ID = "ghost";
  var W = 760;
  var H = 560;
  var CELL = 44;
  var COLS = 15;
  var ROWS = 11;
  var OX = (W - COLS * CELL) / 2;
  var OY = (H - ROWS * CELL) / 2;
  var FLOORS = 3;
  var STEP_TIME = 0.12;
  var CONE_RANGE = 4.4;
  var CONE_ANGLE = 0.72;

  var canvas = document.getElementById("board");
  var overlay = document.getElementById("overlay");
  var bestEl = document.getElementById("best");
  var hudA = document.getElementById("hudA");
  var hudB = document.getElementById("hudB");
  var hudC = document.getElementById("hudC");
  var ctx = PP.fitCanvas(canvas, W, H);

  var floor = 1;
  var score = 0;
  var moves = 0;
  var caught = 0;
  var cores = [];
  var coresTaken = 0;
  var exitCell = { c: COLS - 2, r: 1 };
  var guards = [];
  var player = { c: 1, r: ROWS - 2, x: 1, y: ROWS - 2, tx: 1, ty: ROWS - 2, moving: 0 };
  var alert = 0;
  var flash = 0;
  var banner = "";
  var bannerTone = "#e2e8f0";
  var bannerT = 0;
  var state = "intro";
  var last = 0;
  var raf = 0;
  var hudTick = 0;
  var keys = {};

  function rand(min, max) { return min + Math.random() * (max - min); }
  function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
  function px(c) { return OX + c * CELL + CELL / 2; }
  function py(r) { return OY + r * CELL + CELL / 2; }

  /* ------------------------------------------------------------------ floor */

  function freeCell(taken, minDistanceFrom) {
    for (var attempt = 0; attempt < 60; attempt++) {
      var c = randInt(1, COLS - 2);
      var r = randInt(1, ROWS - 2);
      if (taken.some(function (cell) { return cell.c === c && cell.r === r; })) continue;
      if (minDistanceFrom && Math.hypot(c - minDistanceFrom.c, r - minDistanceFrom.r) < 3) continue;
      return { c: c, r: r };
    }
    return { c: randInt(1, COLS - 2), r: randInt(1, ROWS - 2) };
  }

  function makeRoute() {
    var points = [];
    for (var i = 0; i < 4; i++) {
      points.push({ c: randInt(2, COLS - 3), r: randInt(2, ROWS - 3) });
    }
    return points;
  }

  function buildFloor() {
    player = { c: 1, r: ROWS - 2, x: 1, y: ROWS - 2, tx: 1, ty: ROWS - 2, moving: 0 };
    coresTaken = 0;
    alert = 0;

    var used = [{ c: player.c, r: player.r }];
    cores = [];
    for (var i = 0; i < 3; i++) {
      var cell = freeCell(used, player);
      used.push(cell);
      cores.push({ c: cell.c, r: cell.r, taken: false, pulse: Math.random() * 6 });
    }

    exitCell = freeCell(used, player);
    used.push(exitCell);

    var count = 1 + floor;
    guards = [];
    for (var g = 0; g < count; g++) {
      var route = makeRoute();
      guards.push({
        route: route, leg: 0, c: route[0].c, r: route[0].r,
        facing: rand(-Math.PI, Math.PI), pause: rand(0.2, 1.1),
        speed: 2.1 + floor * 0.22,
      });
    }
  }

  /* ---------------------------------------------------------------- movement */

  function tryStep(dc, dr) {
    if (state !== "play" || player.moving > 0) return;
    var nc = player.c + dc;
    var nr = player.r + dr;
    if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS) return;
    player.c = nc;
    player.r = nr;
    player.tx = nc;
    player.ty = nr;
    player.moving = STEP_TIME;
    moves += 1;
    PP.sfx("tick");
  }

  function caughtByGuard() {
    caught += 1;
    alert = 0;
    flash = 1;
    banner = "Spotted — back to the start";
    bannerTone = "#ff5d73";
    bannerT = 1.6;
    PP.sfx("bad");
    PP.juice && PP.juice.haptic && PP.juice.haptic("heavy");

    player = { c: 1, r: ROWS - 2, x: 1, y: ROWS - 2, tx: 1, ty: ROWS - 2, moving: 0 };
    guardScatter();
  }

  function guardScatter() {
    for (var i = 0; i < guards.length; i++) {
      var g = guards[i];
      g.c = g.route[0].c;
      g.r = g.route[0].r;
      g.leg = 0;
      g.pause = rand(0.3, 1.0);
    }
  }

  /* ----------------------------------------------------------------- update */

  function updateGuards(dt) {
    var seen = false;

    for (var i = 0; i < guards.length; i++) {
      var g = guards[i];
      var target = g.route[(g.leg + 1) % g.route.length];

      if (g.pause > 0) {
        g.pause -= dt;
      } else {
        var dx = target.c - g.c;
        var dy = target.r - g.r;
        var len = Math.hypot(dx, dy);
        if (len > 0.001) g.facing = Math.atan2(dy, dx);
        if (len < 0.06) {
          g.leg = (g.leg + 1) % g.route.length;
          g.pause = 0.42;
        } else {
          var step = Math.min(len, g.speed * dt);
          g.c += (dx / len) * step;
          g.r += (dy / len) * step;
        }
      }

      var toC = player.c - g.c;
      var toR = player.r - g.r;
      var distance = Math.hypot(toC, toR);
      if (distance <= CONE_RANGE && distance > 0.2) {
        var angle = Math.atan2(toR, toC);
        var diff = Math.abs(Math.atan2(Math.sin(angle - g.facing), Math.cos(angle - g.facing)));
        if (diff <= CONE_ANGLE) seen = true;
      }
    }

    if (seen) {
      alert = Math.min(1, alert + dt * 1.35);
    } else {
      alert = Math.max(0, alert - dt * 0.85);
    }

    if (alert >= 1) caughtByGuard();
  }

  function updatePlayer(dt) {
    if (player.moving > 0) {
      player.moving = Math.max(0, player.moving - dt);
      var t = 1 - player.moving / STEP_TIME;
      player.x = player.x + (player.tx - player.x) * Math.min(1, dt * 14 + t * 0.2);
      player.y = player.y + (player.ty - player.y) * Math.min(1, dt * 14 + t * 0.2);
    } else {
      player.x += (player.tx - player.x) * Math.min(1, dt * 18);
      player.y += (player.ty - player.y) * Math.min(1, dt * 18);
    }

    for (var i = 0; i < cores.length; i++) {
      var core = cores[i];
      if (core.taken) continue;
      if (core.c === player.c && core.r === player.r) {
        core.taken = true;
        coresTaken += 1;
        score += 150;
        PP.sfx("good");
        banner = "Core lifted (" + coresTaken + "/3)";
        bannerTone = "#5eead4";
        bannerT = 1.2;
      }
    }

    if (coresTaken >= 3 && player.c === exitCell.c && player.r === exitCell.r && player.moving === 0) {
      completeFloor();
    }
  }

  function completeFloor() {
    var gained = Math.max(100, 1000 - moves * 8 - caught * 200);
    score += gained;
    banner = "Floor " + floor + " cleared +" + gained;
    bannerTone = "#4ade80";
    bannerT = 1.6;
    PP.sfx("win");

    if (floor >= FLOORS) {
      state = "done";
      finish();
      return;
    }
    floor += 1;
    moves = 0;
    caught = 0;
    buildFloor();
    paintHud();
  }

  function update(dt) {
    if (bannerT > 0) bannerT -= dt;
    if (flash > 0) flash = Math.max(0, flash - dt * 2.2);
    if (state !== "play") return;
    updatePlayer(dt);
    updateGuards(dt);
  }

  /* ------------------------------------------------------------------- draw */

  function drawFloor() {
    ctx.fillStyle = "#05070f";
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#0b1120";
    ctx.fillRect(OX, OY, COLS * CELL, ROWS * CELL);

    ctx.strokeStyle = "rgba(94,234,212,0.07)";
    ctx.lineWidth = 1;
    for (var c = 0; c <= COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(OX + c * CELL, OY);
      ctx.lineTo(OX + c * CELL, OY + ROWS * CELL);
      ctx.stroke();
    }
    for (var r = 0; r <= ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(OX, OY + r * CELL);
      ctx.lineTo(OX + COLS * CELL, OY + r * CELL);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(94,234,212,0.3)";
    ctx.lineWidth = 2;
    ctx.strokeRect(OX, OY, COLS * CELL, ROWS * CELL);
  }

  function drawCores() {
    for (var i = 0; i < cores.length; i++) {
      var core = cores[i];
      core.pulse += 0.03;
      var cx = px(core.c);
      var cy = py(core.r) + Math.sin(core.pulse) * 2;
      if (core.taken) {
        ctx.strokeStyle = "rgba(94,234,212,0.25)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, 9, 0, Math.PI * 2);
        ctx.stroke();
        continue;
      }
      ctx.fillStyle = "#5eead4";
      ctx.beginPath();
      ctx.moveTo(cx, cy - 10);
      ctx.lineTo(cx + 7, cy);
      ctx.lineTo(cx, cy + 10);
      ctx.lineTo(cx - 7, cy);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      ctx.arc(cx, cy, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function drawExit() {
    var cx = px(exitCell.c);
    var cy = py(exitCell.r);
    var ready = coresTaken >= 3;
    ctx.strokeStyle = ready ? "#4ade80" : "rgba(74,222,128,0.35)";
    ctx.lineWidth = ready ? 3 : 2;
    ctx.strokeRect(cx - 11, cy - 11, 22, 22);
    ctx.fillStyle = ready ? "rgba(74,222,128,0.35)" : "rgba(74,222,128,0.08)";
    ctx.fillRect(cx - 9, cy - 9, 18, 18);
  }

  function drawGuards() {
    for (var i = 0; i < guards.length; i++) {
      var g = guards[i];
      var gx = px(g.c);
      var gy = py(g.r);

      var cone = ctx.createRadialGradient(gx, gy, 4, gx, gy, CONE_RANGE * CELL);
      cone.addColorStop(0, alert > 0.15 ? "rgba(255,93,115,0.34)" : "rgba(255,93,115,0.2)");
      cone.addColorStop(1, "rgba(255,93,115,0)");
      ctx.fillStyle = cone;
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.arc(gx, gy, CONE_RANGE * CELL, g.facing - CONE_ANGLE, g.facing + CONE_ANGLE);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#ff5d73";
      ctx.beginPath();
      ctx.arc(gx, gy, 11, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#2a1120";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.lineTo(gx + Math.cos(g.facing) * 15, gy + Math.sin(g.facing) * 15);
      ctx.stroke();
    }
  }

  function drawPlayer() {
    var cx = px(player.x);
    var cy = py(player.y);
    ctx.fillStyle = "#7dd3fc";
    ctx.beginPath();
    ctx.arc(cx, cy, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(125,211,252,0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 14 + Math.sin(performance.now() / 260) * 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawAlarm() {
    var label = alert > 0.6 ? "SPOTTED" : alert > 0.2 ? "suspicious" : "unseen";
    ctx.fillStyle = "rgba(148,163,184,0.85)";
    ctx.font = "600 13px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(label.toUpperCase(), OX, OY - 12);

    ctx.fillStyle = "rgba(148,163,184,0.2)";
    ctx.fillRect(OX, OY - 6, COLS * CELL, 4);
    ctx.fillStyle = alert > 0.6 ? "#ff5d73" : alert > 0.2 ? "#fbbf24" : "#5eead4";
    ctx.fillRect(OX, OY - 6, COLS * CELL * alert, 4);
  }

  function draw() {
    drawFloor();
    drawExit();
    drawCores();
    drawGuards();
    drawPlayer();
    drawAlarm();

    if (bannerT > 0 && banner) {
      ctx.globalAlpha = Math.min(1, bannerT);
      ctx.fillStyle = bannerTone;
      ctx.font = "700 24px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(banner, W / 2, OY + ROWS * CELL + 34);
      ctx.globalAlpha = 1;
    }

    if (flash > 0) {
      ctx.fillStyle = "rgba(255,93,115," + flash * 0.22 + ")";
      ctx.fillRect(0, 0, W, H);
    }
  }

  function paintHud() {
    if (hudA) hudA.textContent = Math.min(floor, FLOORS) + " / " + FLOORS;
    if (hudB) hudB.textContent = coresTaken + " / 3";
    if (hudC) hudC.textContent = PP.formatNumber(score);
    if (bestEl) bestEl.textContent = PP.formatNumber(PP.scores.get(ID) || 0);
  }

  /* ------------------------------------------------------------------ flow */

  function finish() {
    var best = PP.scores.save(ID, score, "high");
    var result = PP.leaderboard.submit(ID, score);
    paintHud();

    var note = result
      ? "<p>" + (result.rank === 1 ? "Top of this device's board." : "#" + result.rank + " of " + result.total + " here.") + "</p>"
      : "";

    PP.showOverlay(overlay,
      "<h2>Exfiltration complete</h2>" +
      "<p class=\"big-score\">" + PP.formatNumber(score) + "</p>" +
      "<p>Three floors · " + caught + " times spotted · best " + PP.formatNumber(best) + "</p>" + note +
      "<button class=\"btn\" type=\"button\" data-start>New operation</button>");
    bindStart();
  }

  function start() {
    floor = 1;
    score = 0;
    moves = 0;
    caught = 0;
    banner = "";
    bannerT = 0;
    flash = 0;
    state = "play";
    last = 0;
    buildFloor();
    PP.hideOverlay(overlay);
    PP.sfx("pick");
    paintHud();
    draw();
  }

  function panel() {
    PP.showOverlay(overlay,
      "<h2>Ghost Protocol</h2>" +
      "<p>Three floors, three data cores each. Guards only see straight ahead — " +
      "read the cone, step when it points away, and the alarm drains back to nothing.</p>" +
      "<p class=\"hint\">Every step costs points · being spotted costs far more</p>" +
      "<button class=\"btn\" type=\"button\" data-start>Infiltrate</button>");
    bindStart();
  }

  function bindStart() {
    var button = overlay.querySelector("[data-start]");
    if (button) {
      button.addEventListener("click", start);
      if (button.focus) button.focus();
    }
  }

  /* ------------------------------------------------------------------ input */

  var MOVE = {
    ArrowUp: [0, -1], KeyW: [0, -1],
    ArrowDown: [0, 1], KeyS: [0, 1],
    ArrowLeft: [-1, 0], KeyA: [-1, 0],
    ArrowRight: [1, 0], KeyD: [1, 0],
  };

  window.addEventListener("keydown", function (event) {
    var code = event.code || event.key;
    if (code === "Space" && state !== "play") { start(); event.preventDefault(); return; }
    var move = MOVE[code];
    if (!move) return;
    event.preventDefault();
    tryStep(move[0], move[1]);
  });

  var dirMap = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  Array.prototype.forEach.call(document.querySelectorAll("[data-dir]"), function (button) {
    var move = dirMap[button.getAttribute("data-dir")];
    button.addEventListener("pointerdown", function (event) {
      event.preventDefault();
      tryStep(move[0], move[1]);
    });
  });

  canvas.addEventListener("pointerdown", function (event) {
    if (state !== "play") return;
    var rect = canvas.getBoundingClientRect();
    var x = ((event.clientX - rect.left) / rect.width) * W;
    var y = ((event.clientY - rect.top) / rect.height) * H;
    var c = Math.floor((x - OX) / CELL);
    var r = Math.floor((y - OY) / CELL);
    if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return;
    var dc = c - player.c;
    var dr = r - player.r;
    if (Math.abs(dc) + Math.abs(dr) !== 1) return;
    tryStep(dc, dr);
  });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden && state === "play") {
      state = "paused";
      panel();
    }
  });

  /* ------------------------------------------------------------------- boot */

  function frame(now) {
    raf = window.requestAnimationFrame(frame);
    var dt = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60;
    last = now;
    update(dt);
    draw();
    hudTick += 1;
    if (hudTick % 6 === 0) paintHud();
  }

  buildFloor();
  paintHud();
  draw();
  panel();
  raf = window.requestAnimationFrame(frame);
})();
