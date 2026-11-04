/*
  Redline Rally — a pseudo-3D road racer.

  The road is a flat array of segments, each carrying a curve amount and the
  world height of its far edge. Every frame the segments ahead are projected to
  the screen (scale = cameraDepth / z) and filled as trapezoids, front to back,
  with a "maxy" high-water mark so crests hide the road behind them. Curves are
  faked by accumulating a horizontal offset (x += dx; dx += curve), hills are
  real projected heights. Traffic lives on the segments and is drawn back to
  front afterwards so cars overlap correctly.

  Projection formula and constants follow Jake Gordon's javascript-racer and
  Lou's Pseudo 3D Page, re-tuned for a 900x520 night course.
*/
(function () {
  "use strict";

  var ID = "redline";
  var W = 900;
  var H = 520;
  var RUN_TIME = 90;

  var canvas = document.getElementById("board");
  var overlay = document.getElementById("overlay");
  var bestEl = document.getElementById("best");
  var hudA = document.getElementById("hudA");
  var hudB = document.getElementById("hudB");
  var hudC = document.getElementById("hudC");
  var ctx = PP.fitCanvas(canvas, W, H);

  /* ---------------------------------------------------------- road geometry */

  var SEG = 200;                                   // length of one segment
  var RUMBLE = 3;                                  // segments per rumble stripe
  var ROAD_W = 2000;                               // half width of the road
  var DRAW = 190;                                  // segments drawn ahead
  var CAM_H = 1000;                                // camera height
  var CAM_DEPTH = 1 / Math.tan((100 / 2) * Math.PI / 180);
  var PLAYER_Z = CAM_H * CAM_DEPTH;                // player's z ahead of camera
  var MAX_SPEED = SEG * 60;                        // one segment per frame
  var ACCEL = MAX_SPEED / 4.5;
  var BRAKE = -MAX_SPEED;
  var DECEL = -MAX_SPEED / 6;
  var OFF_DECEL = -MAX_SPEED / 2;
  var OFF_LIMIT = MAX_SPEED / 4;
  var CENTRIFUGAL = 0.32;
  var METRE = 0.0028;                              // world units -> metres
  var LANES = 3;

  var LIGHT = { road: "#2b3352", grass: "#070b18", rumble: "#e9edff", lane: "#7f96ff" };
  var DARK = { road: "#232a45", grass: "#050812", rumble: "#ff2e63" };
  var CAR_COLORS = ["#ff3b6b", "#ffd166", "#5eead4", "#a78bfa", "#fb923c", "#60a5fa"];

  var segments = [];
  var trackLength = 0;
  var cars = [];
  var stars = [];

  var position = 0;
  var speed = 0;
  var playerX = 0;
  var distance = 0;
  var timeLeft = RUN_TIME;
  var running = false;
  var finished = false;
  var last = 0;
  var raf = 0;
  var steer = 0;
  var touchGas = false;
  var keys = {};
  var shake = 0;
  var hudTick = 0;

  /* -------------------------------------------------------------- utilities */

  function limit(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function interpolate(a, b, p) { return a + (b - a) * p; }
  function percentRemaining(n, total) { return (n % total) / total; }
  function easeInOut(a, b, p) { return a + (b - a) * (-Math.cos(p * Math.PI) / 2 + 0.5); }

  function increase(start, amount, max) {
    var result = start + amount;
    while (result >= max) result -= max;
    while (result < 0) result += max;
    return result;
  }

  function findSegment(z) {
    return segments[Math.floor(z / SEG) % segments.length];
  }

  function overlap(x1, w1, x2, w2, percent) {
    var half = (percent || 1) / 2;
    return !(x1 - (w1 * half) > x2 + (w2 * half) || x1 + (w1 * half) < x2 - (w2 * half));
  }

  /* ---------------------------------------------------------- track building */

  function lastY() {
    return segments.length ? segments[segments.length - 1].p2.world.y : 0;
  }

  function addSegment(curve, y) {
    var n = segments.length;
    segments.push({
      index: n,
      curve: curve,
      p1: { world: { y: lastY(), z: n * SEG }, camera: {}, screen: {} },
      p2: { world: { y: y, z: (n + 1) * SEG }, camera: {}, screen: {} },
      cars: [],
      fog: 1,
      clip: H,
      color: Math.floor(n / RUMBLE) % 2 ? DARK : LIGHT,
    });
  }

  function addRoad(enter, hold, leave, curve, y) {
    var startY = lastY();
    var endY = startY + y * SEG;
    var total = enter + hold + leave;
    var n;
    for (n = 0; n < enter; n++) addSegment(easeInOut(0, curve, n / enter), easeInOut(startY, endY, n / total));
    for (n = 0; n < hold; n++) addSegment(curve, easeInOut(startY, endY, (enter + n) / total));
    for (n = 0; n < leave; n++) addSegment(easeInOut(curve, 0, n / leave), easeInOut(startY, endY, (enter + hold + n) / total));
  }

  function addStraight(num) { addRoad(num, num, num, 0, 0); }
  function addCurve(num, curve, height) { addRoad(num, num, num, curve, height || 0); }
  function addHill(num, height) { addRoad(num, num, num, 0, height); }

  function addSCurves() {
    addRoad(20, 20, 20, -1.6, 6);
    addRoad(20, 20, 20, 2.2, -4);
    addRoad(20, 20, 20, 1.4, 3);
    addRoad(20, 20, 20, -2.1, -2);
  }

  function buildTrack() {
    segments = [];
    addStraight(40);
    for (var i = 0; i < 9; i++) {
      var roll = Math.random();
      if (roll < 0.28) addCurve(30, (Math.random() < 0.5 ? -1 : 1) * (2 + Math.random() * 4), 0);
      else if (roll < 0.5) addSCurves();
      else if (roll < 0.72) addHill(30, 18 + Math.random() * 42);
      else addStraight(30 + Math.floor(Math.random() * 40));
    }
    // Bring the course back down to its starting height so the loop is seamless.
    addRoad(80, 80, 80, -1.4, -lastY() / SEG);
    trackLength = segments.length * SEG;
    buildStars();
  }

  function buildStars() {
    stars = [];
    for (var i = 0; i < 90; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * (H * 0.42),
        r: Math.random() * 1.4 + 0.4,
        a: Math.random() * 0.6 + 0.25,
      });
    }
  }

  /* ----------------------------------------------------------------- traffic */

  function buildCars() {
    cars = [];
    for (var i = 0; i < 46; i++) {
      cars.push({
        offset: Math.random() * 1.5 - 0.75,
        z: Math.random() * trackLength,
        speed: MAX_SPEED * (0.28 + Math.random() * 0.24),
        color: CAR_COLORS[i % CAR_COLORS.length],
        percent: 0,
        drift: (Math.random() - 0.5) * 0.16,
      });
    }
  }

  function moveCars(dt) {
    for (var s = 0; s < segments.length; s++) segments[s].cars.length = 0;
    for (var i = 0; i < cars.length; i++) {
      var car = cars[i];
      car.z = increase(car.z + car.speed * dt, trackLength);
      car.offset = limit(car.offset + car.drift * dt, -0.78, 0.78);
      if (Math.abs(car.offset) >= 0.779) car.drift = -car.drift;
      car.percent = percentRemaining(car.z, SEG);
      findSegment(car.z).cars.push(car);
    }
  }

  /* ------------------------------------------------------------ projection */

  function project(p, camX, camY, camZ) {
    var cz = p.world.z - camZ;
    if (cz < 1) cz = 1;
    var scale = CAM_DEPTH / cz;
    p.camera.z = cz;
    p.screen.scale = scale;
    p.screen.x = Math.round(W / 2 - scale * camX * (W / 2));
    p.screen.y = Math.round(H / 2 - scale * (p.world.y - camY) * (H / 2));
    p.screen.w = Math.round(scale * ROAD_W * (W / 2));
  }

  function poly(x1, y1, x2, y2, x3, y3, x4, y4, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.lineTo(x4, y4);
    ctx.closePath();
    ctx.fill();
  }

  /* ------------------------------------------------------------------ render */

  function drawSky() {
    var sky = ctx.createLinearGradient(0, 0, 0, H * 0.62);
    sky.addColorStop(0, "#05060f");
    sky.addColorStop(0.55, "#12102c");
    sky.addColorStop(1, "#3a1740");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    for (var i = 0; i < stars.length; i++) {
      var star = stars[i];
      ctx.globalAlpha = star.a;
      ctx.fillStyle = "#dfe6ff";
      ctx.fillRect(star.x, star.y, star.r, star.r);
    }
    ctx.globalAlpha = 1;

    // Horizon glow and a city skyline silhouette behind the road.
    var glow = ctx.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, W * 0.55);
    glow.addColorStop(0, "rgba(255,90,160,0.35)");
    glow.addColorStop(1, "rgba(255,90,160,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H * 0.6);

    ctx.fillStyle = "#0b0d21";
    for (var b = 0; b < 26; b++) {
      var bw = 18 + ((b * 37) % 30);
      var bh = 26 + ((b * 53) % 70);
      ctx.fillRect(b * 36 - 8, H / 2 - bh, bw, bh);
    }
  }

  function drawSegment(seg) {
    var p1 = seg.p1.screen;
    var p2 = seg.p2.screen;
    var col = seg.color;
    var r1 = p1.w / Math.max(6, 2 * LANES);
    var r2 = p2.w / Math.max(6, 2 * LANES);
    var l1 = p1.w / 40;
    var l2 = p2.w / 40;

    ctx.fillStyle = col.grass;
    ctx.fillRect(0, p2.y, W, Math.max(0, p1.y - p2.y));

    poly(p1.x - p1.w - r1, p1.y, p1.x - p1.w, p1.y, p2.x - p2.w, p2.y, p2.x - p2.w - r2, p2.y, col.rumble);
    poly(p1.x + p1.w + r1, p1.y, p1.x + p1.w, p1.y, p2.x + p2.w, p2.y, p2.x + p2.w + r2, p2.y, col.rumble);
    poly(p1.x - p1.w, p1.y, p1.x + p1.w, p1.y, p2.x + p2.w, p2.y, p2.x - p2.w, p2.y, col.road);

    if (col.lane) {
      var lanew1 = (p1.w * 2) / LANES;
      var lanew2 = (p2.w * 2) / LANES;
      var lanex1 = p1.x - p1.w + lanew1;
      var lanex2 = p2.x - p2.w + lanew2;
      for (var lane = 1; lane < LANES; lanex1 += lanew1, lanex2 += lanew2, lane++) {
        poly(lanex1 - l1 / 2, p1.y, lanex1 + l1 / 2, p1.y,
             lanex2 + l2 / 2, p2.y, lanex2 - l2 / 2, p2.y, col.lane);
      }
    }

    if (seg.fog < 1) {
      ctx.globalAlpha = (1 - seg.fog) * 0.92;
      ctx.fillStyle = "#0a0c1c";
      ctx.fillRect(0, p2.y, W, Math.max(0, p1.y - p2.y));
      ctx.globalAlpha = 1;
    }
  }

  function drawCar(x, baseY, scale, color, clip) {
    var w = scale * 820 * (W / 2);
    if (w < 3) return;
    var h = w * 0.58;
    var top = baseY - h;
    if (top >= clip) return;
    var height = h;
    if (baseY > clip) height = Math.max(2, clip - top);
    if (height <= 1) return;

    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.beginPath();
    ctx.ellipse(x, baseY, w * 0.5, h * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = color;
    roundRect(x - w / 2, top, w, height, Math.min(10, w * 0.14));
    ctx.fill();

    ctx.fillStyle = "rgba(8,10,24,0.75)";
    roundRect(x - w * 0.33, top + height * 0.16, w * 0.66, height * 0.34, Math.max(2, w * 0.06));
    ctx.fill();

    if (w > 18) {
      ctx.fillStyle = "#ff4d6d";
      ctx.fillRect(x - w * 0.42, baseY - Math.min(height, h * 0.26), w * 0.14, Math.max(2, h * 0.1));
      ctx.fillRect(x + w * 0.28, baseY - Math.min(height, h * 0.26), w * 0.14, Math.max(2, h * 0.1));
    }
  }

  function roundRect(x, y, w, h, r) {
    var radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  function drawPlayer(segment, percent) {
    var bounce = (speed / MAX_SPEED) * 2.4;
    var baseY = H - 46 + Math.sin(performance.now() / 90) * bounce;
    var w = 128;
    var h = 66;
    var tilt = (playerX - 0) * 0.06 + steerFromInput() * 0.05;

    ctx.save();
    ctx.translate(W / 2, baseY);

    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.beginPath();
    ctx.ellipse(0, 4, w * 0.5, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.rotate(tilt);

    var body = ctx.createLinearGradient(0, -h, 0, 0);
    body.addColorStop(0, "#e6ecff");
    body.addColorStop(1, "#8b8bff");
    ctx.fillStyle = body;
    roundRect(-w / 2, -h, w, h, 12);
    ctx.fill();

    ctx.fillStyle = "#0b0e20";
    ctx.beginPath();
    ctx.moveTo(-w * 0.34, -h);
    ctx.lineTo(w * 0.34, -h);
    ctx.lineTo(w * 0.26, -h * 0.55);
    ctx.lineTo(-w * 0.26, -h * 0.55);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#ff2e63";
    ctx.fillRect(-w * 0.44, -h * 0.36, w * 0.16, 7);
    ctx.fillRect(w * 0.28, -h * 0.36, w * 0.16, 7);

    ctx.fillStyle = "rgba(10,12,28,0.85)";
    ctx.fillRect(-w * 0.56, -h * 0.5, 10, h * 0.42);
    ctx.fillRect(w * 0.5, -h * 0.5, 10, h * 0.42);

    ctx.restore();
  }

  function render() {
    var baseSegment = findSegment(position);
    var basePercent = percentRemaining(position, SEG);
    var playerSegment = findSegment(position + PLAYER_Z);
    var playerPercent = percentRemaining(position + PLAYER_Z, SEG);
    var playerY = interpolate(playerSegment.p1.world.y, playerSegment.p2.world.y, playerPercent);
    var maxy = H;
    var x = 0;
    var dx = -(baseSegment.curve * basePercent);

    drawSky();

    for (var n = 0; n < DRAW; n++) {
      var seg = segments[(baseSegment.index + n) % segments.length];
      seg.looped = seg.index < baseSegment.index;
      seg.fog = 1 / Math.pow(Math.E, Math.pow(n / DRAW, 2) * 6);
      seg.clip = maxy;

      var camZ = position - (seg.looped ? trackLength : 0);
      project(seg.p1, playerX * ROAD_W - x, playerY + CAM_H, camZ);
      project(seg.p2, playerX * ROAD_W - x - dx, playerY + CAM_H, camZ);

      x += dx;
      dx += seg.curve;

      if (seg.p1.camera.z <= CAM_DEPTH) continue;
      if (seg.p2.screen.y >= seg.p1.screen.y) continue;
      if (seg.p2.screen.y >= maxy) continue;

      drawSegment(seg);
      maxy = seg.p1.screen.y;
    }

    // Traffic, far to near, so nearer cars cover the ones behind them.
    for (var m = DRAW - 1; m > 0; m--) {
      var s = segments[(baseSegment.index + m) % segments.length];
      for (var i = 0; i < s.cars.length; i++) {
        var car = s.cars[i];
        var scale = interpolate(s.p1.screen.scale, s.p2.screen.scale, car.percent);
        var cx = interpolate(s.p1.screen.x, s.p2.screen.x, car.percent) +
          scale * car.offset * ROAD_W * (W / 2);
        var cy = interpolate(s.p1.screen.y, s.p2.screen.y, car.percent);
        drawCar(cx, cy, scale, car.color, s.clip);
      }
    }

    drawPlayer(playerSegment, playerPercent);

    if (shake > 0) {
      var hit = ctx.createRadialGradient(W / 2, H / 2, H * 0.18, W / 2, H / 2, H * 0.8);
      hit.addColorStop(0, "rgba(255,46,99,0)");
      hit.addColorStop(1, "rgba(255,46,99,0.85)");
      ctx.globalAlpha = Math.min(0.4, shake * 0.4);
      ctx.fillStyle = hit;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  }

  /* ------------------------------------------------------------------ update */

  function steerFromInput() {
    var left = keys.ArrowLeft || keys.KeyA;
    var right = keys.ArrowRight || keys.KeyD;
    if (left && !right) return -1;
    if (right && !left) return 1;
    return steer;
  }

  function update(dt) {
    var playerSegment = findSegment(position + PLAYER_Z);
    var speedPercent = speed / MAX_SPEED;
    var dx = dt * 2 * speedPercent;
    var dir = steerFromInput();

    if (dir !== 0) playerX += dx * dir;

    // Centrifugal drift: the faster you take a bend, the harder it pushes out.
    playerX -= dx * speedPercent * playerSegment.curve * CENTRIFUGAL;
    playerX = limit(playerX, -1.7, 1.7);

    var gas = keys.ArrowUp || keys.KeyW || touchGas;
    var brake = keys.ArrowDown || keys.KeyS;

    if (brake) speed += BRAKE * dt;
    else if (gas) speed += ACCEL * dt;
    else speed += DECEL * dt;

    if (playerX < -1 || playerX > 1) {
      if (speed > OFF_LIMIT) speed += OFF_DECEL * dt;
    }

    speed = limit(speed, 0, MAX_SPEED);
    position = increase(position + speed * dt, trackLength);
    distance += speed * dt;
    timeLeft -= dt;

    moveCars(dt);
    collide(playerSegment);

    if (shake > 0) shake = Math.max(0, shake - dt * 1.8);

    if (timeLeft <= 0) finish();
  }

  function collide(playerSegment) {
    var carW = 0.42;
    for (var i = 0; i < playerSegment.cars.length; i++) {
      var car = playerSegment.cars[i];
      if (speed <= car.speed) continue;
      if (!overlap(playerX, 0.3, car.offset, carW, 0.85)) continue;
      speed = car.speed * 0.45;
      position = increase(car.z - PLAYER_Z, trackLength);
      shake = 1;
      PP.sfx("bad");
      PP.juice && PP.juice.haptic && PP.juice.haptic("heavy");
      return;
    }
  }

  /* -------------------------------------------------------------------- HUD */

  function paintHud() {
    var metres = Math.floor(distance * METRE);
    if (hudA) hudA.textContent = PP.formatNumber(metres) + " m";
    if (hudB) hudB.textContent = String(Math.round(speed / 100));
    if (hudC) hudC.textContent = String(Math.max(0, Math.ceil(timeLeft)));
    if (bestEl) bestEl.textContent = PP.formatNumber(PP.scores.get(ID) || 0);
  }

  function frame(now) {
    raf = window.requestAnimationFrame(frame);
    if (!running) return;
    var dt = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60;
    last = now;
    update(dt);
    if (finished) return;
    render();
    hudTick += 1;
    if (hudTick % 5 === 0) paintHud();
  }

  /* ---------------------------------------------------------------- run flow */

  function start() {
    buildTrack();
    buildCars();
    position = 0;
    speed = MAX_SPEED * 0.28;
    playerX = 0;
    distance = 0;
    timeLeft = RUN_TIME;
    steer = 0;
    running = true;
    finished = false;
    last = 0;
    PP.hideOverlay(overlay);
    PP.sfx("pick");
    paintHud();
  }

  function finish() {
    running = false;
    finished = true;
    var metres = Math.floor(distance * METRE);
    var best = PP.scores.save(ID, metres, "high");
    var result = PP.leaderboard.submit(ID, metres);
    PP.sfx("win");
    paintHud();

    var note = result
      ? "<p>" + (result.rank === 1 ? "Top of this device's board." : "#" + result.rank + " of " + result.total + " here.") + "</p>"
      : "";
    PP.showOverlay(overlay,
      "<h2>Chequered flag</h2>" +
      "<p class=\"big-score\">" + PP.formatNumber(metres) + " m</p>" +
      "<p>Best on this device: " + PP.formatNumber(best) + " m</p>" + note +
      "<button class=\"btn\" type=\"button\" data-start>Race again</button>");
    bindStart();
  }

  function panel() {
    PP.showOverlay(overlay,
      "<h2>Redline Rally</h2>" +
      "<p>Ninety seconds. Curves, crests and traffic. Brake before the bend, " +
      "or the centrifugal pull will put you in the grass.</p>" +
      "<p class=\"hint\">↑ throttle · ↓ brake · ← → steer · drag the road on touch</p>" +
      "<button class=\"btn\" type=\"button\" data-start>Start engine</button>");
    bindStart();
  }

  function bindStart() {
    var button = overlay.querySelector("[data-start]");
    if (button) {
      button.addEventListener("click", function () { start(); });
      button.focus && button.focus();
    }
  }

  /* ----------------------------------------------------------------- input */

  function keyName(event) {
    return event.code || event.key;
  }

  window.addEventListener("keydown", function (event) {
    var code = keyName(event);
    if (code === "Space" && !running) { start(); event.preventDefault(); return; }
    keys[code] = true;
    if (/^(Arrow|Space)/.test(code)) event.preventDefault();
  });

  window.addEventListener("keyup", function (event) {
    keys[keyName(event)] = false;
  });

  var dirButtons = document.querySelectorAll("[data-dir]");
  Array.prototype.forEach.call(dirButtons, function (button) {
    var map = { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight" };
    var code = map[button.getAttribute("data-dir")];
    function on(event) { event.preventDefault(); keys[code] = true; }
    function off() { keys[code] = false; }
    button.addEventListener("pointerdown", on);
    button.addEventListener("pointerup", off);
    button.addEventListener("pointerleave", off);
    button.addEventListener("pointercancel", off);
  });

  var dragging = false;
  var dragStartX = 0;

  canvas.addEventListener("pointerdown", function (event) {
    if (!running) return;
    dragging = true;
    dragStartX = event.clientX;
    touchGas = true;
    canvas.setPointerCapture && canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener("pointermove", function (event) {
    if (!dragging) return;
    var rect = canvas.getBoundingClientRect();
    var offset = (event.clientX - dragStartX) / Math.max(80, rect.width * 0.18);
    steer = limit(offset, -1, 1);
  });

  function endDrag() {
    dragging = false;
    steer = 0;
    touchGas = false;
  }

  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);
  canvas.addEventListener("pointerleave", endDrag);

  document.addEventListener("visibilitychange", function () {
    if (document.hidden && running) {
      running = false;
      panel();
    }
  });

  /* ------------------------------------------------------------------ boot */

  buildTrack();
  buildCars();
  paintHud();
  render();
  panel();
  raf = window.requestAnimationFrame(frame);
})();
