/*
  Iron Hive — a fixed-path tower defence.

  One lane of waypoints with three switchbacks, so a well-placed turret covers
  two legs of the road. Four turret archetypes (single target, splash, control,
  long range) and twelve waves whose health grows geometrically while the
  player's income only buys one or two upgrades per wave.
*/
(function () {
  "use strict";

  var ID = "hive";
  var W = 880;
  var H = 560;
  var CELL = 52;
  var COLS = 16;
  var ROWS = 10;
  var OX = 24;
  var OY = 20;
  var MAX_WAVE = 12;

  var canvas = document.getElementById("board");
  var overlay = document.getElementById("overlay");
  var bestEl = document.getElementById("best");
  var hudA = document.getElementById("hudA");
  var hudB = document.getElementById("hudB");
  var hudC = document.getElementById("hudC");
  var shop = document.getElementById("shop");
  var ctx = PP.fitCanvas(canvas, W, H);

  var ROUTE = [[0, 4], [3, 4], [3, 1], [6, 1], [6, 8], [9, 8], [9, 3], [12, 3], [12, 6], [15, 6]];

  var TOWERS = {
    dart: { name: "Dart", cost: 50, dmg: 8, rate: 1.5, range: 2.6, color: "#7dd3fc", splash: 0, slow: 0 },
    cannon: { name: "Cannon", cost: 90, dmg: 22, rate: 0.8, range: 2.1, color: "#fbbf24", splash: 1.15, slow: 0 },
    frost: { name: "Frost", cost: 60, dmg: 3, rate: 1.0, range: 2.4, color: "#5eead4", splash: 0, slow: 1.5 },
    sniper: { name: "Sniper", cost: 130, dmg: 40, rate: 0.5, range: 5.2, color: "#c084fc", splash: 0, slow: 0 },
  };

  var pathCells = {};
  var waypoints = [];
  var towers = [];
  var enemies = [];
  var shots = [];
  var gold = 150;
  var lives = 20;
  var wave = 0;
  var wavesCleared = 0;
  var spawned = 0;
  var waveCount = 0;
  var spawnTimer = 0;
  var intermission = 0;
  var kills = 0;
  var phase = "build";
  var selected = "dart";
  var toast = "";
  var toastT = 0;
  var hover = null;
  var last = 0;
  var raf = 0;
  var hudTick = 0;

  /* ------------------------------------------------------------------ setup */

  function cellCenter(c, r) {
    return { x: OX + c * CELL + CELL / 2, y: OY + r * CELL + CELL / 2 };
  }

  function buildMap() {
    pathCells = {};
    waypoints = [];

    for (var i = 0; i < ROUTE.length; i++) {
      var from = ROUTE[i];
      var to = ROUTE[i + 1] || from;
      if (i === ROUTE.length - 1) {
        waypoints.push(cellCenter(from[0], from[1]));
        pathCells[from[0] + "," + from[1]] = true;
        continue;
      }
      var stepC = Math.sign(to[0] - from[0]);
      var stepR = Math.sign(to[1] - from[1]);
      var c = from[0];
      var r = from[1];
      while (true) {
        pathCells[c + "," + r] = true;
        if (c === to[0] && r === to[1]) break;
        c += stepC;
        r += stepR;
      }
      waypoints.push(cellCenter(from[0], from[1]));
    }
  }

  function towerAt(c, r) {
    for (var i = 0; i < towers.length; i++) {
      if (towers[i].c === c && towers[i].r === r) return towers[i];
    }
    return null;
  }

  function canBuild(c, r) {
    if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return false;
    if (pathCells[c + "," + r]) return false;
    return !towerAt(c, r);
  }

  function say(text) {
    toast = text;
    toastT = 1.5;
  }

  /* ----------------------------------------------------------------- economy */

  function stats(tower) {
    var def = TOWERS[tower.type];
    var mult = Math.pow(1.55, tower.level - 1);
    return {
      dmg: def.dmg * mult,
      rate: def.rate,
      range: def.range * (1 + (tower.level - 1) * 0.08) * CELL,
      splash: def.splash * CELL,
      slow: def.slow,
      color: def.color,
    };
  }

  function upgradeCost(tower) {
    return Math.round(TOWERS[tower.type].cost * 0.8 * tower.level);
  }

  function build(c, r) {
    var def = TOWERS[selected];
    var cost = def.cost;
    if (gold < cost) { say("Not enough scrap"); PP.sfx("bad"); return; }
    gold -= cost;
    towers.push({
      c: c, r: r, type: selected, level: 1, cd: 0,
      x: OX + c * CELL + CELL / 2, y: OY + r * CELL + CELL / 2,
    });
    PP.sfx("pick");
  }

  function upgrade(tower) {
    if (tower.level >= 3) { say("Fully upgraded"); PP.sfx("bad"); return; }
    var cost = upgradeCost(tower);
    if (gold < cost) { say("Need " + cost + " scrap"); PP.sfx("bad"); return; }
    gold -= cost;
    tower.level += 1;
    PP.sfx("good");
  }

  /* ------------------------------------------------------------------ waves */

  function spawnEnemy() {
    var hpBase = 40 * Math.pow(1.2, wave - 1);
    var kind = "crawler";
    var hp = hpBase;
    var speed = 1.35;

    if (wave >= 4 && spawned % 5 === 4) {
      kind = "tank";
      hp = hpBase * 4;
      speed = 0.82;
    }
    if (wave === MAX_WAVE && spawned === waveCount - 1) {
      kind = "hive tyrant";
      hp = hpBase * 9;
      speed = 0.7;
    }

    var start = cellCenter(ROUTE[0][0], ROUTE[0][1]);
    enemies.push({
      x: start.x, y: start.y, wp: 1, hp: hp, maxHp: hp,
      speed: speed, slowT: 0, progress: 0, kind: kind,
      reward: Math.round(7 + wave * 0.8) * (kind === "tank" ? 3 : kind === "hive tyrant" ? 8 : 1),
      r: kind === "crawler" ? 11 : kind === "tank" ? 15 : 20,
    });
    spawned += 1;
  }

  function startWave() {
    wave += 1;
    waveCount = Math.min(6 + wave, 22);
    spawned = 0;
    spawnTimer = 0.6;
    phase = "wave";
    say("Wave " + wave);
    PP.sfx("pick");
  }

  function leak(enemy) {
    lives -= 1;
    PP.sfx("bad");
    if (lives <= 0) {
      lives = 0;
      finish(false);
    }
  }

  /* ----------------------------------------------------------------- update */

  function moveEnemies(dt) {
    for (var i = enemies.length - 1; i >= 0; i--) {
      var e = enemies[i];
      if (e.slowT > 0) e.slowT -= dt;
      var modifier = e.slowT > 0 ? 0.5 : 1;
      var step = e.speed * CELL * modifier * dt;
      var target = waypoints[e.wp];
      if (!target) { enemies.splice(i, 1); leak(e); continue; }
      var dx = target.x - e.x;
      var dy = target.y - e.y;
      var len = Math.hypot(dx, dy) || 1;

      if (len <= step) {
        e.x = target.x;
        e.y = target.y;
        e.wp += 1;
        if (e.wp >= waypoints.length) {
          enemies.splice(i, 1);
          leak(e);
          continue;
        }
      } else {
        e.x += (dx / len) * step;
        e.y += (dy / len) * step;
      }
      e.progress += step;
    }
  }

  function hurtEnemy(e, amount) {
    e.hp -= amount;
    if (e.hp > 0) return;
    var index = enemies.indexOf(e);
    if (index !== -1) enemies.splice(index, 1);
    gold += e.reward;
    kills += 1;
    PP.sfx("pick");
  }

  function updateTowers(dt) {
    for (var i = 0; i < towers.length; i++) {
      var tower = towers[i];
      var s = stats(tower);
      tower.cd -= dt;
      if (tower.cd > 0) continue;

      var best = null;
      for (var j = 0; j < enemies.length; j++) {
        var e = enemies[j];
        if (Math.hypot(e.x - tower.x, e.y - tower.y) > s.range) continue;
        if (!best || e.progress > best.progress) best = e;
      }
      if (!best) continue;

      tower.cd = 1 / s.rate;
      shots.push({
        x: tower.x, y: tower.y, target: best, dmg: s.dmg,
        splash: s.splash, slow: s.slow, color: s.color, life: 2.2,
      });
    }
  }

  function updateShots(dt) {
    for (var i = shots.length - 1; i >= 0; i--) {
      var shot = shots[i];
      shot.life -= dt;
      var alive = shot.target && enemies.indexOf(shot.target) !== -1;
      if (!alive || shot.life <= 0) { shots.splice(i, 1); continue; }

      var dx = shot.target.x - shot.x;
      var dy = shot.target.y - shot.y;
      var len = Math.hypot(dx, dy) || 1;
      var step = 520 * dt;

      if (len <= step + 4) {
        shots.splice(i, 1);
        hurtEnemy(shot.target, shot.dmg);
        if (shot.slow > 0) shot.target.slowT = Math.max(shot.target.slowT, shot.slow);
        if (shot.splash > 0) {
          for (var k = enemies.length - 1; k >= 0; k--) {
            var near = enemies[k];
            if (near === shot.target) continue;
            if (Math.hypot(near.x - shot.target.x, near.y - shot.target.y) <= shot.splash) {
              hurtEnemy(near, shot.dmg * 0.55);
            }
          }
        }
      } else {
        shot.x += (dx / len) * step;
        shot.y += (dy / len) * step;
      }
    }
  }

  function update(dt) {
    if (phase === "over" || phase === "won") return;

    if (phase === "wave") {
      if (spawned < waveCount) {
        spawnTimer -= dt;
        if (spawnTimer <= 0) {
          spawnEnemy();
          spawnTimer = 0.74;
        }
      }
      moveEnemies(dt);
      if (phase !== "wave") return;
      if (spawned >= waveCount && !enemies.length) {
        wavesCleared = wave;
        gold += 30 + wave * 6;
        phase = "build";
        intermission = 2.6;
        say("Wave " + wave + " cleared · +" + (30 + wave * 6) + " scrap");
      }
    } else if (phase === "build") {
      intermission -= dt;
      if (intermission <= 0) {
        if (wavesCleared >= MAX_WAVE) finish(true);
        else startWave();
      }
    }

    updateTowers(dt);
    updateShots(dt);
    if (toastT > 0) toastT -= dt;
  }

  /* -------------------------------------------------------------------- draw */

  function drawBoard() {
    ctx.fillStyle = "#070a13";
    ctx.fillRect(0, 0, W, H);

    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var x = OX + c * CELL;
        var y = OY + r * CELL;
        var isPath = !!pathCells[c + "," + r];
        ctx.fillStyle = isPath ? "#161d33" : ((c + r) % 2 ? "#0b1120" : "#0a0f1c");
        ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
        if (!isPath) {
          ctx.strokeStyle = "rgba(125,211,252,0.07)";
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 1.5, y + 1.5, CELL - 3, CELL - 3);
        }
      }
    }

    // The lane itself, drawn as a thick polyline through the waypoints.
    ctx.strokeStyle = "rgba(255,93,115,0.16)";
    ctx.lineWidth = CELL * 0.78;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    for (var i = 0; i < waypoints.length; i++) {
      if (i === 0) ctx.moveTo(waypoints[i].x, waypoints[i].y);
      else ctx.lineTo(waypoints[i].x, waypoints[i].y);
    }
    ctx.stroke();

    ctx.strokeStyle = "rgba(255,93,115,0.35)";
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 12]);
    ctx.beginPath();
    for (var k = 0; k < waypoints.length; k++) {
      if (k === 0) ctx.moveTo(waypoints[k].x, waypoints[k].y);
      else ctx.lineTo(waypoints[k].x, waypoints[k].y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Entry and hive markers.
    var first = waypoints[0];
    var lastPoint = waypoints[waypoints.length - 1];
    ctx.fillStyle = "#ff5d73";
    ctx.beginPath();
    ctx.arc(first.x, first.y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#7dd3fc";
    ctx.beginPath();
    ctx.arc(lastPoint.x, lastPoint.y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#e0f2fe";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(lastPoint.x, lastPoint.y, 18, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawTowers() {
    for (var i = 0; i < towers.length; i++) {
      var tower = towers[i];
      var s = stats(tower);
      ctx.fillStyle = "rgba(255,255,255,0.05)";
      ctx.beginPath();
      ctx.arc(tower.x, tower.y, CELL * 0.42, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(tower.x, tower.y, CELL * 0.27, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#0a0f1c";
      ctx.beginPath();
      ctx.arc(tower.x, tower.y, CELL * 0.14, 0, Math.PI * 2);
      ctx.fill();

      for (var l = 0; l < tower.level; l++) {
        ctx.fillStyle = "#f8fafc";
        ctx.fillRect(tower.x - 9 + l * 8, tower.y + CELL * 0.3, 5, 4);
      }
    }

    if (hover && phase !== "over" && phase !== "won") {
      if (canBuild(hover.c, hover.r)) {
        var center = cellCenter(hover.c, hover.r);
        var def = TOWERS[selected];
        ctx.strokeStyle = gold >= def.cost ? "rgba(125,211,252,0.8)" : "rgba(255,93,115,0.7)";
        ctx.lineWidth = 2;
        ctx.strokeRect(OX + hover.c * CELL + 4, OY + hover.r * CELL + 4, CELL - 8, CELL - 8);
        ctx.fillStyle = "rgba(125,211,252,0.1)";
        ctx.beginPath();
        ctx.arc(center.x, center.y, def.range * CELL, 0, Math.PI * 2);
        ctx.fill();
      } else {
        var tower = towerAt(hover.c, hover.r);
        if (tower) {
          ctx.strokeStyle = "rgba(248,250,252,0.7)";
          ctx.lineWidth = 2;
          ctx.strokeRect(OX + hover.c * CELL + 4, OY + hover.r * CELL + 4, CELL - 8, CELL - 8);
          ctx.fillStyle = "rgba(248,250,252,0.07)";
          ctx.beginPath();
          ctx.arc(tower.x, tower.y, stats(tower).range, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  function drawEnemies() {
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      ctx.fillStyle = e.kind === "crawler" ? "#ff8fa3" : e.kind === "tank" ? "#ffd166" : "#fb7185";
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
      ctx.fill();

      if (e.slowT > 0) {
        ctx.strokeStyle = "rgba(94,234,212,0.9)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r + 4, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (e.hp < e.maxHp) {
        var w = e.r * 2.2;
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(e.x - w / 2, e.y - e.r - 9, w, 4);
        ctx.fillStyle = "#4ade80";
        ctx.fillRect(e.x - w / 2, e.y - e.r - 9, w * Math.max(0, e.hp / e.maxHp), 4);
      }
    }
  }

  function drawShots() {
    for (var i = 0; i < shots.length; i++) {
      var shot = shots[i];
      ctx.fillStyle = shot.color;
      ctx.beginPath();
      ctx.arc(shot.x, shot.y, 3.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.arc(shot.x, shot.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function draw() {
    drawBoard();
    drawTowers();
    drawEnemies();
    drawShots();

    if (toastT > 0) {
      ctx.globalAlpha = Math.min(1, toastT);
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "700 24px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(toast, W / 2, 46);
      ctx.globalAlpha = 1;
    }
  }

  function paintHud() {
    if (hudA) hudA.textContent = String(gold);
    if (hudB) hudB.textContent = String(lives);
    if (hudC) hudC.textContent = wavesCleared + " / " + MAX_WAVE;
    if (bestEl) bestEl.textContent = PP.formatNumber(PP.scores.get(ID) || 0);
    if (shop) {
      Array.prototype.forEach.call(shop.querySelectorAll("[data-tower]"), function (button) {
        var type = button.getAttribute("data-tower");
        button.setAttribute("aria-pressed", type === selected ? "true" : "false");
        button.disabled = gold < TOWERS[type].cost;
        button.style.opacity = gold < TOWERS[type].cost ? "0.45" : "1";
      });
    }
  }

  /* -------------------------------------------------------------------- flow */

  function score() {
    return kills * 10 + wavesCleared * 200 + lives * 60;
  }

  function finish(won) {
    phase = won ? "won" : "over";
    var value = score();
    var best = PP.scores.save(ID, value, "high");
    var result = PP.leaderboard.submit(ID, value);
    PP.sfx(won ? "win" : "bad");
    paintHud();

    var note = result
      ? "<p>" + (result.rank === 1 ? "Top of this device's board." : "#" + result.rank + " of " + result.total + " here.") + "</p>"
      : "";

    PP.showOverlay(overlay,
      "<h2>" + (won ? "The hive holds" : "The hive fell") + "</h2>" +
      "<p class=\"big-score\">" + PP.formatNumber(value) + "</p>" +
      "<p>Wave " + wavesCleared + " of " + MAX_WAVE + " · " + kills + " crawlers destroyed · best " +
      PP.formatNumber(best) + "</p>" + note +
      "<button class=\"btn\" type=\"button\" data-start>New run</button>");
    bindStart();
  }

  function reset() {
    towers = [];
    enemies = [];
    shots = [];
    gold = 150;
    lives = 20;
    wave = 0;
    wavesCleared = 0;
    spawned = 0;
    waveCount = 0;
    spawnTimer = 0;
    intermission = 0;
    kills = 0;
    phase = "build";
    selected = "dart";
    toast = "";
    toastT = 0;
    hover = null;
    buildMap();
  }

  function start() {
    reset();
    PP.hideOverlay(overlay);
    phase = "build";
    intermission = 1.2;
    wave = 0;
    paintHud();
    draw();
    PP.sfx("pick");
  }

  function panel() {
    PP.showOverlay(overlay,
      "<h2>Iron Hive</h2>" +
      "<p>Crawlers follow one lane to your core. Build turrets beside it — a tile " +
      "that touches two legs of the path is worth three of a straightaway.</p>" +
      "<p class=\"hint\">Dart is cheap and fast · Cannon splashes · Frost slows · Sniper reaches</p>" +
      "<button class=\"btn\" type=\"button\" data-start>Build the defence</button>");
    bindStart();
  }

  function bindStart() {
    var button = overlay.querySelector("[data-start]");
    if (button) {
      button.addEventListener("click", start);
      if (button.focus) button.focus();
    }
  }

  /* ------------------------------------------------------------------- input */

  function cellAt(event) {
    var rect = canvas.getBoundingClientRect();
    var x = ((event.clientX - rect.left) / rect.width) * W;
    var y = ((event.clientY - rect.top) / rect.height) * H;
    var c = Math.floor((x - OX) / CELL);
    var r = Math.floor((y - OY) / CELL);
    if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return null;
    return { c: c, r: r };
  }

  function tap(event) {
    if (phase === "over" || phase === "won") return;
    var cell = cellAt(event);
    if (!cell) return;
    var tower = towerAt(cell.c, cell.r);
    if (tower) upgrade(tower);
    else if (canBuild(cell.c, cell.r)) build(cell.c, cell.r);
    else PP.sfx("bad");
    paintHud();
  }

  canvas.addEventListener("pointerdown", tap);
  canvas.addEventListener("pointermove", function (event) {
    var cell = cellAt(event);
    hover = cell;
  });
  canvas.addEventListener("pointerleave", function () { hover = null; });

  if (shop) {
    Array.prototype.forEach.call(shop.querySelectorAll("[data-tower]"), function (button) {
      button.addEventListener("click", function () {
        selected = button.getAttribute("data-tower");
        PP.sfx("pick");
        paintHud();
      });
    });
  }

  window.addEventListener("keydown", function (event) {
    var code = event.code || event.key;
    if (code === "Space") {
      if (phase === "over" || phase === "won") start();
      event.preventDefault();
      return;
    }
    var map = { Digit1: "dart", Digit2: "cannon", Digit3: "frost", Digit4: "sniper" };
    if (map[code]) {
      selected = map[code];
      paintHud();
    }
  });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden && (phase === "wave" || phase === "build")) {
      phase = "paused";
      panel();
    }
  });

  /* -------------------------------------------------------------------- boot */

  function frame(now) {
    raf = window.requestAnimationFrame(frame);
    var dt = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60;
    last = now;
    update(dt);
    draw();
    hudTick += 1;
    if (hudTick % 6 === 0) paintHud();
  }

  buildMap();
  paintHud();
  draw();
  panel();
  raf = window.requestAnimationFrame(frame);
})();
