/*
  Lunar Descent — gravity, one throttle, five pads.

  Semi-implicit Euler at a clamped step, thrust along the nose, fuel burned per
  second of burn. Terrain is a uniform-x height grid, so ground lookup and
  collision are O(1); the pad is stamped flat *after* the hills are generated,
  which guarantees a level surface without checking whether the noise may have
  produced one. Landing tiers follow the 1979 cabinet: clean, hard, crash.
*/
(function () {
  "use strict";

  var ID = "descent";
  var W = 900;
  var H = 520;

  var canvas = document.getElementById("board");
  var overlay = document.getElementById("overlay");
  var bestEl = document.getElementById("best");
  var hudA = document.getElementById("hudA");
  var hudB = document.getElementById("hudB");
  var hudC = document.getElementById("hudC");
  var ctx = PP.fitCanvas(canvas, W, H);

  var GRAVITY = 62;
  var THRUST = 178;
  var ROTATE = 1.65;
  var FUEL_DRAIN = 15;
  var FUEL_MAX = 100;
  var SAFE_VY = 34;
  var SAFE_VX = 24;
  var SAFE_ANGLE = 0.22;
  var ROUNDS = 5;
  var COL_W = 30;
  var COLS = Math.ceil(W / COL_W) + 1;
  var TIERS = [
    { width: 112, mult: 1 },
    { width: 112, mult: 1 },
    { width: 76, mult: 2 },
    { width: 76, mult: 2 },
    { width: 48, mult: 3 },
  ];

  var ground = [];
  var pad = { x1: 0, x2: 0, y: 0, mult: 1 };
  var lander = null;
  var round = 1;
  var score = 0;
  var landed = false;
  var message = "";
  var messageTone = "#e2e8f0";
  var messageT = 0;
  var running = false;
  var last = 0;
  var raf = 0;
  var hudTick = 0;
  var flash = 0;
  var keys = {};
  var stars = [];

  function rand(min, max) { return min + Math.random() * (max - min); }
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  /* -------------------------------------------------------------- terrain */

  function groundAt(x) {
    var raw = clamp(x, 0, W) / COL_W;
    var i = Math.floor(raw);
    var t = raw - i;
    var a = ground[Math.min(i, ground.length - 1)];
    var b = ground[Math.min(i + 1, ground.length - 1)];
    return a + (b - a) * t;
  }

  function newTerrain() {
    var base = H - 78;
    var amplitude = 46 + (round - 1) * 16;
    ground = [];
    var prev = base - rand(0, amplitude * 0.5);
    for (var i = 0; i < COLS; i++) {
      var target = base - rand(0.1, 1) * amplitude;
      prev = prev + (target - prev) * 0.5;
      prev = clamp(prev, H - 240, base);
      ground.push(prev);
    }

    // Pad first, then carve the surface around it: flat by construction.
    var tier = TIERS[Math.min(TIERS.length - 1, round - 1)];
    var padWidth = Math.min(tier.width, W * 0.22);
    var padX = rand(padWidth * 0.9, W - padWidth * 0.9);
    pad.x1 = padX - padWidth / 2;
    pad.x2 = padX + padWidth / 2;
    pad.mult = tier.mult;

    var start = Math.max(0, Math.floor(pad.x1 / COL_W));
    var end = Math.min(ground.length - 1, Math.ceil(pad.x2 / COL_W));
    var padY = clamp(base - amplitude * 0.35, H - 210, base);
    pad.y = padY;

    for (var c = start; c <= end; c++) ground[c] = padY;

    // Soft shoulders so the approach is a ramp, never a wall.
    for (var s = 1; s <= 3; s++) {
      if (start - s >= 0) ground[start - s] = padY + s * 16;
      if (end + s < ground.length) ground[end + s] = padY + s * 16;
    }
  }

  function buildStars() {
    stars = [];
    for (var i = 0; i < 70; i++) {
      stars.push({ x: Math.random() * W, y: Math.random() * H * 0.55, r: rand(0.5, 1.6), a: rand(0.2, 0.8) });
    }
  }

  /* --------------------------------------------------------------- lander */

  function resetLander() {
    lander = {
      x: rand(W * 0.2, W * 0.8),
      y: 64,
      vx: rand(-18, 18),
      vy: rand(6, 16),
      angle: rand(-0.12, 0.12),
      fuel: FUEL_MAX,
      thrusting: false,
      alive: true,
    };
    landed = false;
    message = "";
    messageT = 0;
  }

  function rotatePoint(px, py, angle) {
    return {
      x: px * Math.cos(angle) - py * Math.sin(angle),
      y: px * Math.sin(angle) + py * Math.cos(angle),
    };
  }

  function hullPoints() {
    var gearL = rotatePoint(-12, 12, lander.angle);
    var gearR = rotatePoint(12, 12, lander.angle);
    var belly = rotatePoint(0, 10, lander.angle);
    return [
      { x: lander.x + gearL.x, y: lander.y + gearL.y, gear: true, x0: gearL.x },
      { x: lander.x + gearR.x, y: lander.y + gearR.y, gear: true, x0: gearR.x },
      { x: lander.x + belly.x, y: lander.y + belly.y, gear: false, x0: belly.x },
    ];
  }

  function touchdown(point) {
    if (landed) return;
    landed = true;
    lander.alive = false;

    var hull = hullPoints();
    var gearL = hull[0];
    var gearR = hull[1];
    var onPad = gearL.x > pad.x1 + 2 && gearR.x < pad.x2 - 2 &&
      Math.abs(point.y - pad.y) < 8;

    var angleOk = Math.abs(lander.angle) < SAFE_ANGLE;
    var vyOk = lander.vy < SAFE_VY;
    var vxOk = Math.abs(lander.vx) < SAFE_VX;
    var soft = lander.vy < SAFE_VY * 0.55 && Math.abs(lander.vx) < SAFE_VX * 0.6;

    if (point.gear && onPad && angleOk && vyOk && vxOk) {
      var gained = (soft ? 100 : 40) * pad.mult + Math.round(lander.fuel * pad.mult * 0.5);
      score += gained;
      message = (soft ? "Clean landing" : "Hard landing") + " +" + gained;
      messageTone = soft ? "#4ade80" : "#fbbf24";
      PP.sfx("win");
    } else {
      var penalty = 10 * pad.mult;
      score += penalty;
      message = "Crashed +" + penalty;
      messageTone = "#ff5d73";
      flash = 1;
      PP.sfx("bad");
      PP.juice && PP.juice.haptic && PP.juice.haptic("heavy");
    }

    messageT = 1.7;
    paintHud();
  }

  function update(dt) {
    if (!running) {
      if (messageT > 0) messageT -= dt;
      return;
    }
    if (landed) {
      messageT -= dt;
      if (messageT <= 0) nextRound();
      return;
    }
    if (messageT > 0) messageT -= dt;

    var turn = 0;
    if (keys.ArrowLeft || keys.KeyA) turn -= 1;
    if (keys.ArrowRight || keys.KeyD) turn += 1;
    lander.angle = clamp(lander.angle + turn * ROTATE * dt, -0.75, 0.75);

    var burning = (keys.ArrowUp || keys.KeyW || keys.Space) && lander.fuel > 0;
    lander.thrusting = burning;
    if (burning) {
      lander.vx += Math.sin(lander.angle) * THRUST * dt;
      lander.vy -= Math.cos(lander.angle) * THRUST * dt;
      lander.fuel = Math.max(0, lander.fuel - FUEL_DRAIN * dt);
    }

    lander.vy += GRAVITY * dt;
    lander.x += lander.vx * dt;
    lander.y += lander.vy * dt;

    if (lander.x < 14) { lander.x = 14; lander.vx = Math.abs(lander.vx) * 0.35; }
    if (lander.x > W - 14) { lander.x = W - 14; lander.vx = -Math.abs(lander.vx) * 0.35; }

    var hull = hullPoints();
    for (var i = 0; i < hull.length; i++) {
      if (hull[i].y >= groundAt(hull[i].x)) {
        touchdown(hull[i]);
        break;
      }
    }

    if (flash > 0) flash = Math.max(0, flash - dt * 2.2);
  }

  function nextRound() {
    round += 1;
    if (round > ROUNDS) {
      finish();
      return;
    }
    newTerrain();
    resetLander();
    paintHud();
  }

  /* ----------------------------------------------------------------- draw */

  function drawSky() {
    var sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#04060f");
    sky.addColorStop(0.6, "#0b1024");
    sky.addColorStop(1, "#141a35");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    for (var i = 0; i < stars.length; i++) {
      ctx.globalAlpha = stars[i].a;
      ctx.fillStyle = "#e2e8f0";
      ctx.fillRect(stars[i].x, stars[i].y, stars[i].r, stars[i].r);
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = "rgba(125,211,252,0.12)";
    ctx.beginPath();
    ctx.arc(W - 110, 84, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(10,14,28,0.85)";
    ctx.beginPath();
    ctx.arc(W - 96, 74, 30, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawGround() {
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (var i = 0; i < ground.length; i++) {
      ctx.lineTo(i * COL_W, ground[i]);
    }
    ctx.lineTo(W, H);
    ctx.closePath();

    var fill = ctx.createLinearGradient(0, H - 240, 0, H);
    fill.addColorStop(0, "#243052");
    fill.addColorStop(1, "#0a0e1c");
    ctx.fillStyle = fill;
    ctx.fill();

    ctx.strokeStyle = "#7dd3fc";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (var k = 0; k < ground.length; k++) {
      if (k === 0) ctx.moveTo(k * COL_W, ground[k]);
      else ctx.lineTo(k * COL_W, ground[k]);
    }
    ctx.stroke();

    // The pad, punched bright with its multiplier.
    ctx.fillStyle = "rgba(74,222,128,0.9)";
    ctx.fillRect(pad.x1, pad.y - 3, pad.x2 - pad.x1, 5);
    ctx.fillStyle = "rgba(74,222,128,0.25)";
    ctx.fillRect(pad.x1, pad.y - 3, pad.x2 - pad.x1, 12);

    ctx.fillStyle = "#bbf7d0";
    ctx.font = "700 15px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("×" + pad.mult, (pad.x1 + pad.x2) / 2, pad.y - 12);
  }

  function drawLander() {
    if (!lander || !lander.alive) return;
    ctx.save();
    ctx.translate(lander.x, lander.y);
    ctx.rotate(lander.angle);

    if (lander.thrusting) {
      var flame = ctx.createLinearGradient(0, 10, 0, 40);
      flame.addColorStop(0, "rgba(255,238,170,0.95)");
      flame.addColorStop(1, "rgba(255,93,115,0)");
      ctx.fillStyle = flame;
      ctx.beginPath();
      ctx.moveTo(-6, 10);
      ctx.lineTo(6, 10);
      ctx.lineTo(0, 34 + Math.random() * 10);
      ctx.closePath();
      ctx.fill();
    }

    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-12, 12);
    ctx.lineTo(-8, -2);
    ctx.moveTo(12, 12);
    ctx.lineTo(8, -2);
    ctx.moveTo(-12, 12);
    ctx.lineTo(12, 12);
    ctx.stroke();

    ctx.fillStyle = "#e2e8f0";
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(10, 4);
    ctx.lineTo(-10, 4);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#38bdf8";
    ctx.beginPath();
    ctx.arc(0, -1, 3.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawReadouts() {
    var altitude = Math.max(0, Math.round(pad.y - lander.y));
    var vspeed = Math.round(lander.vy);
    var fuel = Math.round(lander.fuel);

    ctx.textAlign = "left";
    ctx.font = "600 15px ui-monospace, monospace";
    ctx.fillStyle = "rgba(226,232,240,0.85)";
    ctx.fillText("ALT " + altitude + "   V/S " + vspeed + "   FUEL " + fuel, 20, 30);

    var limit = SAFE_VY;
    ctx.fillStyle = vspeed > limit ? "#ff5d73" : "#4ade80";
    ctx.fillText(vspeed > limit ? "TOO FAST" : "descent rate ok", 20, 52);

    if (lander.fuel <= 0 && lander.alive) {
      ctx.fillStyle = "#ff5d73";
      ctx.fillText("NO FUEL — falling", 20, 74);
    }

    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(148,163,184,0.85)";
    ctx.font = "600 14px system-ui, sans-serif";
    ctx.fillText("PAD " + round + " OF " + ROUNDS, W / 2, 30);
  }

  function draw() {
    drawSky();
    drawGround();
    drawLander();
    drawReadouts();

    if (messageT > 0 && message) {
      ctx.globalAlpha = Math.min(1, messageT);
      ctx.fillStyle = messageTone;
      ctx.font = "700 30px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(message, W / 2, H / 2 - 40);
      ctx.globalAlpha = 1;
    }

    if (flash > 0) {
      ctx.fillStyle = "rgba(255,93,115," + flash * 0.25 + ")";
      ctx.fillRect(0, 0, W, H);
    }
  }

  function paintHud() {
    if (hudA) hudA.textContent = PP.formatNumber(score);
    if (hudB) hudB.textContent = String(lander ? Math.round(lander.fuel) : FUEL_MAX);
    if (hudC) hudC.textContent = String(lander && lander.alive ? Math.max(0, Math.round(pad.y - lander.y)) : 0);
    if (bestEl) bestEl.textContent = PP.formatNumber(PP.scores.get(ID) || 0);
  }

  /* ----------------------------------------------------------------- flow */

  function finish() {
    running = false;
    var best = PP.scores.save(ID, score, "high");
    var result = PP.leaderboard.submit(ID, score);
    PP.sfx("win");
    paintHud();

    var note = result
      ? "<p>" + (result.rank === 1 ? "Top of this device's board." : "#" + result.rank + " of " + result.total + " here.") + "</p>"
      : "";

    PP.showOverlay(overlay,
      "<h2>Mission complete</h2>" +
      "<p class=\"big-score\">" + PP.formatNumber(score) + "</p>" +
      "<p>Five pads attempted · best " + PP.formatNumber(best) + "</p>" + note +
      "<button class=\"btn\" type=\"button\" data-start>Fly again</button>");
    bindStart();
  }

  function start() {
    round = 1;
    score = 0;
    flash = 0;
    newTerrain();
    resetLander();
    running = true;
    last = 0;
    PP.hideOverlay(overlay);
    PP.sfx("pick");
    paintHud();
    draw();
  }

  function panel() {
    PP.showOverlay(overlay,
      "<h2>Lunar Descent</h2>" +
      "<p>Five pads, each narrower than the last. Touch down slowly, almost upright, " +
      "with both legs on the flat.</p>" +
      "<p class=\"hint\">← → rotate · ↑ or Space thrust · watch the descent rate</p>" +
      "<button class=\"btn\" type=\"button\" data-start>Begin descent</button>");
    bindStart();
  }

  function bindStart() {
    var button = overlay.querySelector("[data-start]");
    if (button) {
      button.addEventListener("click", start);
      if (button.focus) button.focus();
    }
  }

  /* ---------------------------------------------------------------- input */

  window.addEventListener("keydown", function (event) {
    var code = event.code || event.key;
    if (code === "Space" && !running) { start(); event.preventDefault(); return; }
    keys[code] = true;
    if (/^(Arrow|Space)/.test(code)) event.preventDefault();
  });

  window.addEventListener("keyup", function (event) {
    keys[event.code || event.key] = false;
  });

  var dirMap = { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight" };
  Array.prototype.forEach.call(document.querySelectorAll("[data-dir]"), function (button) {
    var code = dirMap[button.getAttribute("data-dir")];
    button.addEventListener("pointerdown", function (event) { event.preventDefault(); keys[code] = true; });
    button.addEventListener("pointerup", function () { keys[code] = false; });
    button.addEventListener("pointerleave", function () { keys[code] = false; });
    button.addEventListener("pointercancel", function () { keys[code] = false; });
  });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden && running) {
      running = false;
      panel();
    }
  });

  /* ----------------------------------------------------------------- boot */

  function frame(now) {
    raf = window.requestAnimationFrame(frame);
    var dt = last ? Math.min((now - last) / 1000, 0.033) : 1 / 60;
    last = now;
    update(dt);
    draw();
    hudTick += 1;
    if (hudTick % 6 === 0) paintHud();
  }

  buildStars();
  newTerrain();
  resetLander();
  paintHud();
  draw();
  panel();
  raf = window.requestAnimationFrame(frame);
})();
