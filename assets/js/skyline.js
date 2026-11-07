/*
  Skyline — stack sliding floors into a tower that climbs from the street to
  orbit. Perfect drops rebuild lost width, gusts of wind shove the floor, and
  every district changes both the sky and the architecture of the block.
*/
(function () {
  "use strict";

  var W = 560;
  var H = 640;
  var BLOCK_H = 34;
  var START_W = 220;
  var GROUND_Y = H - 84;
  var PERFECT = 6;
  var DEPTH = 11;
  var DY = DEPTH * 0.45;
  var FOCUS = 0.56;
  var TAU = Math.PI * 2;

  var canvas = document.getElementById("board");
  var ctx = PP.fitCanvas(canvas, W, H);
  var stageEl = document.querySelector(".stage");
  var overlay = document.getElementById("overlay");
  var floorsEl = document.getElementById("floors");
  var streakEl = document.getElementById("streak");
  var bestEl = document.getElementById("best");
  var zoneEl = document.getElementById("zone");

  var best = PP.scores.get("skyline") || 0;
  bestEl.textContent = PP.formatNumber(best);

  /* ------------------------------------------------------------- districts */

  /*
   * Height is the difficulty curve and the scenery at once: each district has
   * its own sky, its own light and its own stock of facades. Palettes blend
   * over the four floors before a boundary so the climb feels continuous.
   */
  var ZONES = [
    {
      from: 0, name: "Street",
      sky: ["#0c1026", "#151d42", "#3a2354"], haze: "#ff7aa8",
      stars: 0.35, cloud: 0.08, planet: 0,
    },
    {
      from: 8, name: "Midtown",
      sky: ["#070b20", "#0d1534", "#1d2452"], haze: "#6ea8ff",
      stars: 0.55, cloud: 0.18, planet: 0,
    },
    {
      from: 18, name: "Cloudline",
      sky: ["#0a1330", "#1b2a5c", "#4a4f8a"], haze: "#a5c8ff",
      stars: 0.4, cloud: 0.9, planet: 0,
    },
    {
      from: 30, name: "Stratosphere",
      sky: ["#02040f", "#070c22", "#121a3f"], haze: "#7dd3fc",
      stars: 0.85, cloud: 0.22, planet: 0.25,
    },
    {
      from: 42, name: "Orbit",
      sky: ["#010206", "#03050e", "#0a0f22"], haze: "#c084fc",
      stars: 1, cloud: 0, planet: 1,
    },
  ];

  /*
   * Five facade models. Each is drawn as a box: a shaded right wall, a front
   * with its own detailing, and window bands placed on a global grid so the
   * lit windows line up from floor to floor like a real elevation.
   */
  var STYLES = {
    brick: {
      face: ["#6d3b32", "#41221e"], side: "#2f1714", slab: "#2a1512",
      win: "#1b1010", lit: ["#ffd08a", "#ffb877", "#ffe7b8"],
      accent: "#ff8a5c", detail: "rows",
    },
    panel: {
      face: ["#3c4d63", "#212d3d"], side: "#18222e", slab: "#141c26",
      win: "#0f1a24", lit: ["#b9e4ff", "#8cc9ff", "#e2f4ff"],
      accent: "#7dd3fc", detail: "bays",
    },
    deco: {
      face: ["#5b5373", "#332c4a"], side: "#241f34", slab: "#1d1829",
      win: "#1f1829", lit: ["#ffe1a8", "#ffcf8a", "#fff1cf"],
      accent: "#c084fc", detail: "flutes",
    },
    glass: {
      face: ["#2a5d85", "#12314a"], side: "#0d2233", slab: "#0b1c2a",
      win: "#0c2231", lit: ["#9fdcff", "#c9f1ff", "#73b9e6"],
      accent: "#22d3ee", detail: "curtain",
    },
    neon: {
      face: ["#3b2452", "#1d1230"], side: "#150c22", slab: "#120a1c",
      win: "#1b0f27", lit: ["#ff9ad5", "#ffd0ec", "#a48cff"],
      accent: "#f472b6", detail: "signs",
    },
  };

  var ZONE_STYLES = [
    ["brick", "brick", "panel", "neon"],
    ["glass", "panel", "deco", "neon"],
    ["glass", "glass", "deco", "panel"],
    ["glass", "deco", "panel", "glass"],
    ["glass", "neon", "deco", "glass"],
  ];

  /* ---------------------------------------------------------------- helpers */

  function clamp(value, lo, hi) {
    return value < lo ? lo : value > hi ? hi : value;
  }

  function hash(a, b) {
    var h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }

  function hexRgb(hex) {
    return [
      parseInt(hex.slice(1, 3), 16),
      parseInt(hex.slice(3, 5), 16),
      parseInt(hex.slice(5, 7), 16),
    ];
  }

  function mixRgb(a, b, t) {
    return [
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t,
      a[2] + (b[2] - a[2]) * t,
    ];
  }

  function css(color, alpha) {
    var r = Math.round(color[0]);
    var g = Math.round(color[1]);
    var b = Math.round(color[2]);
    return alpha === undefined
      ? "rgb(" + r + "," + g + "," + b + ")"
      : "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
  }

  function roundRect(x, y, w, h, r) {
    var radius = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function zoneIndex(floors) {
    var index = 0;
    for (var i = 0; i < ZONES.length; i++) {
      if (floors >= ZONES[i].from) index = i;
    }
    return index;
  }

  function paletteFor(floors) {
    var index = zoneIndex(floors);
    var zone = ZONES[index];
    var next = ZONES[index + 1] || zone;
    var t = 0;
    if (ZONES[index + 1]) {
      t = clamp((floors - (next.from - 4)) / 4, 0, 1);
    }
    return {
      index: index,
      top: mixRgb(hexRgb(zone.sky[0]), hexRgb(next.sky[0]), t),
      mid: mixRgb(hexRgb(zone.sky[1]), hexRgb(next.sky[1]), t),
      bottom: mixRgb(hexRgb(zone.sky[2]), hexRgb(next.sky[2]), t),
      haze: mixRgb(hexRgb(zone.haze), hexRgb(next.haze), t),
      stars: zone.stars + (next.stars - zone.stars) * t,
      cloud: zone.cloud + (next.cloud - zone.cloud) * t,
      planet: zone.planet + (next.planet - zone.planet) * t,
    };
  }

  function styleFor(index) {
    var pool = ZONE_STYLES[zoneIndex(index)];
    // Facades come in three-floor bands so the tower reads as a building with
    // storeys rather than a different house on every level.
    var band = Math.floor((index + 2) / 3);
    var pick = Math.floor(hash(band, 99) * pool.length) % pool.length;
    return pool[pick];
  }

  function projectY(y) {
    return H * FOCUS + (y - camY) * camZoom;
  }

  /* ------------------------------------------------------------------ state */

  var game = null;
  var camY = H * FOCUS;
  var camZoom = 1;
  var clock = 0;
  var particles = [];
  var floaters = [];
  var rings = [];
  var fragments = [];
  var banner = null;
  var lastTime = 0;
  var wind = { left: 0, dur: 1, dir: 1, power: 0, strength: 0, next: 360 };

  var stars = [];
  var clouds = [];
  var skyline = [];
  var cars = [];

  (function seedScene() {
    for (var i = 0; i < 90; i++) {
      stars.push({
        x: hash(i, 1) * W,
        y: hash(i, 2) * (H + 60),
        r: 0.4 + hash(i, 3) * 1.4,
        a: 0.15 + hash(i, 4) * 0.6,
        phase: hash(i, 5) * TAU,
        speed: 0.4 + hash(i, 6) * 1.2,
        warm: hash(i, 7) > 0.82,
      });
    }

    for (var c = 0; c < 7; c++) {
      clouds.push({
        x: hash(c, 11) * W,
        y: 40 + hash(c, 12) * H * 1.2,
        par: 0.12 + hash(c, 13) * 0.16,
        size: 0.7 + hash(c, 14) * 0.8,
        phase: hash(c, 15) * TAU,
      });
    }

    for (var b = 0; b < 18; b++) {
      skyline.push({
        x: hash(b, 21) * (W + 80) - 40,
        w: 26 + hash(b, 22) * 48,
        h: 50 + hash(b, 23) * 170,
        crown: hash(b, 24) > 0.72,
      });
    }

    cars = [
      { x: 70, y: GROUND_Y + 34, speed: 0.75, dir: 1, color: "#ff5d8f" },
      { x: 330, y: GROUND_Y + 56, speed: 0.55, dir: -1, color: "#38bdf8" },
      { x: 210, y: GROUND_Y + 70, speed: 0.9, dir: 1, color: "#fbbf24" },
    ];
  })();

  /* --------------------------------------------------------------- building */

  function makeBlock(x, w, y, index) {
    return {
      x: x,
      w: w,
      y: y,
      index: index,
      style: styleFor(index),
      dir: index % 2 === 1 ? 1 : -1,
      speed: Math.min(2.4 + index * 0.15, 8.4),
    };
  }

  function baseBlock() {
    var base = makeBlock((W - START_W) / 2, START_W, GROUND_Y - BLOCK_H, 0);
    base.style = "brick";
    return base;
  }

  function spawn(prev, index) {
    var fromLeft = index % 2 === 1;
    return makeBlock(
      fromLeft ? 0 : W - prev.w,
      prev.w,
      prev.y - BLOCK_H,
      index
    );
  }

  function reset() {
    var base = baseBlock();
    game = {
      blocks: [base],
      moving: spawn(base, 1),
      floors: 0,
      streak: 0,
      bestStreak: 0,
      zone: 0,
      running: false,
      over: false,
    };
    camY = H * FOCUS;
    camZoom = 1;
    particles = [];
    floaters = [];
    rings = [];
    fragments = [];
    banner = null;
    wind = { left: 0, dur: 1, dir: 1, power: 0, strength: 0, next: 360 };
    paintHud();
  }

  function paintHud() {
    floorsEl.textContent = game.floors;
    streakEl.textContent = game.streak;
    bestEl.textContent = PP.formatNumber(best);
    if (zoneEl) zoneEl.textContent = ZONES[game.zone].name;
  }

  /* ------------------------------------------------------------------- play */

  function keepInBounds(block) {
    if (block.x < 0) {
      block.x = 0;
      block.dir = 1;
    } else if (block.x + block.w > W) {
      block.x = W - block.w;
      block.dir = -1;
    }
  }

  function burst(x, y, color, count, power) {
    var total = count || 12;
    for (var i = 0; i < total; i++) {
      var angle = Math.random() * TAU;
      var speed = (0.6 + Math.random() * 1.6) * (power || 1);
      particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.6,
        size: 1.5 + Math.random() * 2.5,
        life: 1,
        decay: 0.016 + Math.random() * 0.02,
        color: color,
      });
    }
  }

  function drop() {
    if (!game || !game.running || !game.moving) return;

    var moving = game.moving;
    var top = game.blocks[game.blocks.length - 1];
    var left = Math.max(moving.x, top.x);
    var right = Math.min(moving.x + moving.w, top.x + top.w);
    var overlap = right - left;

    if (overlap <= 4) {
      game.moving = null;
      endGame();
      return;
    }

    var perfect = Math.abs(moving.x - top.x) <= PERFECT;
    var placed;

    if (perfect) {
      // Perfect drops rebuild the tower: 3, 6, 9 px, up to the original width.
      var grow = Math.min(9, 3 + game.streak * 3);
      var width = Math.min(START_W, moving.w + grow);
      var px = clamp(top.x + top.w / 2 - width / 2, 0, W - width);
      placed = makeBlock(px, width, moving.y, moving.index);
      game.streak++;
      game.bestStreak = Math.max(game.bestStreak, game.streak);

      PP.sfx("good");
      PP.tone(520 + Math.min(game.floors, 30) * 14, 90, "triangle", 0.04);
      PP.juice.haptic(12);
      PP.juice.bump(streakEl);
      PP.juice.shake(stageEl, 2);

      var cx = placed.x + placed.w / 2;
      burst(cx, placed.y + BLOCK_H / 2, "#ffd166", 18, 1.4);
      rings.push({ x: cx, y: placed.y + BLOCK_H / 2, r: 6, life: 1, color: "255,209,102" });
      floaters.push({
        x: cx,
        y: placed.y - 4,
        text: game.streak > 1 ? "PERFECT x" + game.streak : "PERFECT",
        life: 1,
        color: "#ffe6a8",
      });
    } else {
      placed = makeBlock(left, overlap, moving.y, moving.index);
      game.streak = 0;

      PP.sfx("pick");
      PP.tone(240 + Math.min(game.floors, 40) * 8, 70, "sine", 0.035);
      PP.juice.haptic(6);
      PP.juice.shake(stageEl, 4);

      var style = STYLES[moving.style];
      if (moving.x < top.x) {
        fragments.push({
          x: moving.x, y: moving.y, w: top.x - moving.x, h: BLOCK_H,
          vx: -0.7, vy: -1.1, rot: 0, vr: -0.02, life: 1, style: moving.style,
        });
      }
      if (moving.x + moving.w > top.x + top.w) {
        fragments.push({
          x: top.x + top.w, y: moving.y,
          w: moving.x + moving.w - (top.x + top.w), h: BLOCK_H,
          vx: 0.7, vy: -1.1, rot: 0, vr: 0.02, life: 1, style: moving.style,
        });
      }
      burst(placed.x + placed.w / 2, placed.y + BLOCK_H, style.accent, 8, 0.7);
    }

    game.blocks.push(placed);
    game.floors = game.blocks.length - 1;
    game.moving = spawn(placed, game.floors + 1);
    paintHud();

    // Milestones and district changes both announce themselves.
    var floors = game.floors;
    var zone = zoneIndex(floors);
    if (floors > 0 && floors % 10 === 0) {
      PP.sfx("win");
      banner = {
        title: floors + " floors",
        sub: ZONES[zone].name + " — the tower keeps climbing",
        life: 1,
      };
      PP.juice.burstOn(canvas, W / 2, H * 0.28, "#ffd166", 14, 80);
    }
    if (zone !== game.zone) {
      game.zone = zone;
      if (!banner) {
        banner = { title: ZONES[zone].name, sub: "New district, new architecture", life: 1 };
        PP.sfx("win");
      }
      if (zoneEl) PP.juice.bump(zoneEl);
    }
    paintHud();
  }

  function update(dt) {
    var moving = game.moving;

    if (moving) {
      moving.x += moving.dir * moving.speed * dt;
      keepInBounds(moving);

      // Wind starts once the tower is worth pushing. The envelope swells in and
      // out so the shove is a gust rather than a constant drift.
      if (wind.left > 0) {
        wind.left -= dt;
        var progress = 1 - wind.left / wind.dur;
        wind.strength = Math.sin(Math.PI * clamp(progress, 0, 1));
        moving.x += wind.dir * wind.power * wind.strength * 1.15 * dt;
        keepInBounds(moving);
        if (wind.left <= 0) {
          wind.left = 0;
          wind.strength = 0;
          wind.next = 380 + Math.random() * 420;
        }
      } else {
        wind.strength = 0;
        if (game.floors >= 10) {
          wind.next -= dt;
          if (wind.next <= 0) {
            wind.dur = 120 + Math.random() * 90;
            wind.left = wind.dur;
            wind.dir = Math.random() < 0.5 ? -1 : 1;
            wind.power = 0.5 + Math.random() * 0.6;
          }
        }
      }
    } else {
      wind.strength = 0;
    }

    // Camera: follow the working floor, then pull back as the tower grows.
    var focusBlock = moving || game.blocks[game.blocks.length - 1];
    var targetY = Math.min(H * FOCUS, focusBlock.y + BLOCK_H / 2);
    camY += (targetY - camY) * Math.min(1, 0.1 * dt);
    var targetZoom = Math.max(0.76, 1 - game.floors * 0.0045);
    camZoom += (targetZoom - camZoom) * Math.min(1, 0.08 * dt);

    updateEffects(dt);

    if (banner) {
      banner.life -= 0.012 * dt;
      if (banner.life <= 0) banner = null;
    }
  }

  function updateEffects(dt) {
    var i;

    for (i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.x += p.vx * dt * 2;
      p.y += p.vy * dt * 2;
      p.vy += 0.12 * dt;
      p.life -= p.decay * dt;
      if (p.life <= 0) particles.splice(i, 1);
    }

    for (i = fragments.length - 1; i >= 0; i--) {
      var f = fragments[i];
      f.x += f.vx * dt * 3;
      f.y += f.vy * dt * 3;
      f.vy += 0.16 * dt;
      f.rot += f.vr * dt;
      f.life -= 0.012 * dt;
      if (f.life <= 0) fragments.splice(i, 1);
    }

    for (i = floaters.length - 1; i >= 0; i--) {
      var t = floaters[i];
      t.y -= 0.5 * dt;
      t.life -= 0.018 * dt;
      if (t.life <= 0) floaters.splice(i, 1);
    }

    for (i = rings.length - 1; i >= 0; i--) {
      var r = rings[i];
      r.r += 2.2 * dt;
      r.life -= 0.03 * dt;
      if (r.life <= 0) rings.splice(i, 1);
    }
  }

  function ambient(dt) {
    for (var i = 0; i < cars.length; i++) {
      var car = cars[i];
      car.x += car.speed * car.dir * dt * 0.55;
      if (car.x > W + 50) car.x = -50;
      if (car.x < -50) car.x = W + 50;
    }
  }

  /* ---------------------------------------------------------------- drawing */

  function drawSky(pal) {
    var sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, css(pal.top));
    sky.addColorStop(0.58, css(pal.mid));
    sky.addColorStop(1, css(pal.bottom));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    var glow = ctx.createRadialGradient(W / 2, H * 0.72, 20, W / 2, H * 0.72, W);
    glow.addColorStop(0, css(pal.haze, 0.2));
    glow.addColorStop(0.55, css(pal.haze, 0.06));
    glow.addColorStop(1, css(pal.haze, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
  }

  function drawStars(pal) {
    var drift = H * FOCUS - camY;
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var span = H + 60;
      var sy = ((s.y + drift * 0.05 * s.speed) % span + span) % span - 30;
      var twinkle = 0.75 + 0.25 * Math.sin(clock * 0.04 + s.phase);
      var alpha = s.a * pal.stars * twinkle;
      if (alpha <= 0.02) continue;
      ctx.globalAlpha = Math.min(1, alpha);
      ctx.fillStyle = s.warm ? "#ffe9c4" : "#dbeafe";
      ctx.beginPath();
      ctx.arc(s.x, sy, s.r, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawPlanet(pal) {
    if (pal.planet < 0.02) return;
    var cx = W * 0.76;
    var cy = H * 0.17 - (H * FOCUS - camY) * 0.04;
    ctx.globalAlpha = pal.planet * 0.9;
    var body = ctx.createRadialGradient(cx - 18, cy - 20, 6, cx, cy, 58);
    body.addColorStop(0, "#c7b6ff");
    body.addColorStop(0.45, "#7c6bd6");
    body.addColorStop(1, "#2b2350");
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(cx, cy, 54, 0, TAU);
    ctx.fill();

    ctx.strokeStyle = "rgba(200,180,255,0.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 82, 20, -0.35, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function drawClouds(pal) {
    if (pal.cloud < 0.03) return;
    var shift = (H * FOCUS - camY) * 0.2;
    ctx.fillStyle = css(pal.haze, pal.cloud * 0.16);
    for (var i = 0; i < clouds.length; i++) {
      var c = clouds[i];
      var sy = c.y + shift * c.par;
      if (sy < -90 || sy > H + 90) continue;
      var cx = c.x + Math.sin(clock * 0.002 + c.phase) * 26;
      var size = c.size;
      ctx.beginPath();
      ctx.ellipse(cx, sy, 74 * size, 22 * size, 0, 0, TAU);
      ctx.ellipse(cx + 62 * size, sy + 7 * size, 50 * size, 17 * size, 0, 0, TAU);
      ctx.ellipse(cx - 58 * size, sy + 9 * size, 44 * size, 15 * size, 0, 0, TAU);
      ctx.fill();
    }
  }

  function drawSkyline() {
    for (var i = 0; i < skyline.length; i++) {
      var b = skyline[i];
      var top = GROUND_Y + 6 - b.h;
      if (projectY(top) > H + 40 || projectY(GROUND_Y) < -60) continue;

      ctx.fillStyle = "rgba(8,11,22,0.62)";
      ctx.fillRect(b.x, top, b.w, b.h);

      if (b.crown) {
        ctx.fillStyle = "rgba(8,11,22,0.62)";
        ctx.fillRect(b.x + b.w / 2 - 1, top - 16, 2, 16);
      }

      ctx.fillStyle = "rgba(255,206,140,0.34)";
      for (var y = top + 9; y < GROUND_Y - 6; y += 12) {
        for (var x = b.x + 6; x < b.x + b.w - 6; x += 10) {
          if (hash(x * 3 + i, y * 5) < 0.26) ctx.fillRect(x, y, 2, 3);
        }
      }
    }
  }

  function drawLamp(x) {
    var base = GROUND_Y + 5;
    ctx.strokeStyle = "#2b3452";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, base);
    ctx.lineTo(x, base - 54);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, base - 54);
    ctx.lineTo(x + 16, base - 54);
    ctx.stroke();

    var glow = ctx.createRadialGradient(x + 16, base - 51, 1, x + 16, base - 51, 28);
    glow.addColorStop(0, "rgba(255,214,150,0.46)");
    glow.addColorStop(1, "rgba(255,214,150,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x + 16, base - 51, 28, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#ffd694";
    ctx.fillRect(x + 13, base - 55, 6, 3);
  }

  function drawCar(car) {
    var x = car.x;
    var y = car.y;
    ctx.fillStyle = car.color;
    roundRect(x, y, 34, 10, 3);
    ctx.fill();
    ctx.fillStyle = "rgba(10,14,24,0.75)";
    roundRect(x + 7, y - 5, 20, 7, 2);
    ctx.fill();
    ctx.fillStyle = "#fff3c4";
    ctx.fillRect(car.dir > 0 ? x + 32 : x, y + 3, 2, 3);
  }

  function drawStreet() {
    var y = GROUND_Y;
    ctx.fillStyle = "#151a2b";
    ctx.fillRect(-200, y, W + 400, 13);
    ctx.fillStyle = "#28304d";
    ctx.fillRect(-200, y, W + 400, 2);
    ctx.fillStyle = "#0a0c16";
    ctx.fillRect(-200, y + 13, W + 400, H - y + 200);

    ctx.fillStyle = "#343b58";
    for (var x = -40; x < W + 60; x += 72) ctx.fillRect(x, y + 44, 34, 3);

    drawLamp(38);
    drawLamp(W - 38);
    for (var i = 0; i < cars.length; i++) drawCar(cars[i]);
  }

  function drawWindows(block) {
    var s = STYLES[block.style];
    var x = block.x;
    var y = block.y;
    var w = block.w;

    if (w < 20) {
      ctx.fillStyle = s.lit[0];
      ctx.globalAlpha = 0.5;
      ctx.fillRect(x + w / 2 - 1, y + 9, 2, BLOCK_H - 16);
      ctx.globalAlpha = 1;
      return;
    }

    var colW;
    var gap;
    var rowH;
    var rows;
    if (s.detail === "curtain") {
      colW = 13; gap = 2; rowH = 11; rows = [y + 7, y + 21];
    } else if (s.detail === "flutes") {
      colW = 10; gap = 8; rowH = 12; rows = [y + 9];
    } else if (s.detail === "signs") {
      colW = 11; gap = 7; rowH = 9; rows = [y + 17];
    } else {
      colW = 9; gap = 7; rowH = 8; rows = [y + 10, y + 23];
    }

    var mod = colW + gap;
    var first = Math.floor((x + 4) / mod);
    var last = Math.ceil((x + w - 4) / mod);
    var cols = s.lit.length;

    for (var c = first; c <= last; c++) {
      var wx = c * mod;
      if (wx < x + 3 || wx + colW > x + w - 3) continue;
      for (var r = 0; r < rows.length; r++) {
        var lit = hash(c * 17 + r * 5, block.index * 13) < 0.58;
        ctx.globalAlpha = lit ? 0.95 : 1;
        ctx.fillStyle = lit ? s.lit[(c + r + block.index) % cols] : s.win;
        ctx.fillRect(wx, rows[r], colW, rowH);
        if (lit) {
          ctx.fillStyle = "rgba(0,0,0,0.2)";
          ctx.fillRect(wx, rows[r] + rowH - 2, colW, 2);
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawFacade(block) {
    var s = STYLES[block.style];
    var x = block.x;
    var y = block.y;
    var w = block.w;
    var i;

    ctx.fillStyle = s.face[0];
    ctx.fillRect(x, y, w, BLOCK_H);
    ctx.fillStyle = "rgba(0,0,0,0.16)";
    ctx.fillRect(x, y + BLOCK_H - 6, w, 6);
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fillRect(x, y, w, 2);

    if (s.detail === "flutes") {
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      for (i = x + 8; i < x + w - 4; i += 14) ctx.fillRect(i, y + 5, 2, BLOCK_H - 11);
    } else if (s.detail === "rows") {
      ctx.fillStyle = "rgba(0,0,0,0.12)";
      for (i = y + 12; i < y + BLOCK_H - 4; i += 8) ctx.fillRect(x, i, w, 1);
    } else if (s.detail === "bays") {
      ctx.fillStyle = "rgba(0,0,0,0.16)";
      for (i = x + 6; i < x + w - 6; i += 42) ctx.fillRect(i, y + 4, 2, BLOCK_H - 8);
    }

    drawWindows(block);

    if (s.detail === "bays" && block.index % 3 === 0) {
      ctx.fillStyle = "rgba(225,240,255,0.22)";
      ctx.fillRect(x + 4, y + BLOCK_H - 9, Math.max(0, w - 8), 2);
      ctx.fillStyle = "rgba(0,0,0,0.22)";
      ctx.fillRect(x + 4, y + BLOCK_H - 7, Math.max(0, w - 8), 2);
    }

    if (s.detail === "signs") {
      ctx.fillStyle = s.accent;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(x + 3, y + 8, Math.max(0, w - 6), 2);
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = s.slab;
    ctx.fillRect(x, y, w, 4);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(x, y + 4, w, 1);
  }

  function drawBlock(block) {
    var s = STYLES[block.style];
    var x = block.x;
    var y = block.y;
    var w = block.w;

    // Right wall, pushed back and up for a box-like read.
    ctx.beginPath();
    ctx.moveTo(x + w, y);
    ctx.lineTo(x + w + DEPTH, y - DY);
    ctx.lineTo(x + w + DEPTH, y + BLOCK_H - DY);
    ctx.lineTo(x + w, y + BLOCK_H);
    ctx.closePath();
    ctx.fillStyle = s.side;
    ctx.fill();

    if (w > 28) {
      ctx.fillStyle = "rgba(255, 220, 170, 0.2)";
      for (var sy = y - DY + 8; sy < y + BLOCK_H - 12; sy += 12) {
        ctx.fillRect(x + w + 5, sy, 2, 5);
      }
    }

    if (s.detail === "signs" && block.index % 4 === 1) {
      ctx.fillStyle = s.accent;
      ctx.globalAlpha = 0.75;
      ctx.fillRect(x + w + DEPTH - 5, y + 6, 3, 18);
      ctx.globalAlpha = 1;
    }

    drawFacade(block);

    if (block.index === 0) drawShopfront(block);
  }

  function drawShopfront(block) {
    var x = block.x;
    var y = block.y;
    var w = block.w;

    ctx.fillStyle = "rgba(255,225,170,0.85)";
    ctx.fillRect(x + 14, y + 10, 34, 16);
    ctx.fillRect(x + w - 48, y + 10, 34, 16);
    ctx.fillStyle = "rgba(255,225,170,0.5)";
    ctx.fillRect(x + w / 2 - 14, y + 8, 28, 18);

    // Awning
    ctx.fillStyle = "#e2436a";
    ctx.fillRect(x + 8, y + 2, w - 16, 6);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    for (var i = x + 10; i < x + w - 10; i += 16) ctx.fillRect(i, y + 2, 7, 6);

    // Door
    ctx.fillStyle = "#10202c";
    ctx.fillRect(x + w / 2 - 8, y + 18, 16, 14);
    ctx.fillStyle = "#ffd694";
    ctx.fillRect(x + w / 2 - 3, y + 22, 6, 10);
  }

  function drawMoving(block) {
    var x = block.x;
    var y = block.y;
    var w = block.w;

    ctx.beginPath();
    ctx.moveTo(x + w, y + 2);
    ctx.lineTo(x + w + DEPTH, y + 2 - DY);
    ctx.lineTo(x + w + DEPTH, y + BLOCK_H - DY);
    ctx.lineTo(x + w, y + BLOCK_H);
    ctx.closePath();
    ctx.fillStyle = "#0e5d74";
    ctx.fill();

    ctx.fillStyle = "#e8f6ff";
    ctx.fillRect(x, y + 2, w, BLOCK_H - 2);

    // Roof face.
    ctx.beginPath();
    ctx.moveTo(x, y + 2);
    ctx.lineTo(x + w, y + 2);
    ctx.lineTo(x + w + DEPTH, y + 2 - DY);
    ctx.lineTo(x + DEPTH, y + 2 - DY);
    ctx.closePath();
    ctx.fillStyle = "#f7fdff";
    ctx.fill();

    ctx.fillStyle = "rgba(34,211,238,0.55)";
    ctx.fillRect(x + 4, y + 10, Math.max(0, w - 8), 3);
    ctx.fillRect(x + 4, y + 22, Math.max(0, w - 8), 3);

    ctx.strokeStyle = "rgba(34,211,238,0.8)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 2.5, Math.max(0, w - 1), BLOCK_H - 3);

    ctx.fillStyle = "#22d3ee";
    ctx.fillRect(x + w / 2 - 1, y + BLOCK_H - 4, 2, 4);
    ctx.fillRect(x + w / 2 - 3, y + 2, 6, 2);
  }

  function drawCrown(block) {
    var cx = block.x + block.w / 2;
    var y = block.y;

    ctx.fillStyle = "#1a2138";
    ctx.fillRect(block.x + 4, y - 8, block.w - 8, 8);
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.fillRect(block.x + 4, y - 8, block.w - 8, 1);

    ctx.strokeStyle = "#5a6a8a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, y - 8);
    ctx.lineTo(cx, y - 38);
    ctx.stroke();

    var blink = 0.5 + 0.5 * Math.sin(clock * 0.08);
    ctx.fillStyle = "rgba(255,90,120," + (0.35 + blink * 0.65) + ")";
    ctx.beginPath();
    ctx.arc(cx, y - 40, 3, 0, TAU);
    ctx.fill();
  }

  function drawFragments() {
    for (var i = 0; i < fragments.length; i++) {
      var f = fragments[i];
      var s = STYLES[f.style];
      ctx.save();
      ctx.translate(f.x + f.w / 2, f.y + f.h / 2);
      ctx.rotate(f.rot);
      ctx.globalAlpha = Math.max(0, f.life) * 0.9;
      ctx.fillStyle = s.face[0];
      ctx.fillRect(-f.w / 2, -f.h / 2, f.w, f.h);
      ctx.fillStyle = "rgba(255,255,255,0.14)";
      ctx.fillRect(-f.w / 2, -f.h / 2, f.w, 3);
      ctx.fillStyle = s.win;
      for (var w = -f.w / 2 + 5; w < f.w / 2 - 6; w += 12) {
        ctx.fillRect(w, -f.h / 2 + 8, 6, 6);
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  function drawParticles() {
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      if (p.life <= 0) continue;
      ctx.globalAlpha = Math.min(1, p.life * 1.4);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  function drawRings() {
    for (var i = 0; i < rings.length; i++) {
      var r = rings[i];
      ctx.strokeStyle = "rgba(" + r.color + "," + Math.max(0, r.life) * 0.7 + ")";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, TAU);
      ctx.stroke();
    }
  }

  function drawFloaters() {
    ctx.textAlign = "center";
    for (var i = 0; i < floaters.length; i++) {
      var t = floaters[i];
      var sy = projectY(t.y);
      if (sy < -30 || sy > H + 30) continue;
      ctx.globalAlpha = Math.min(1, t.life * 1.5);
      ctx.fillStyle = t.color;
      ctx.font = "800 15px system-ui, -apple-system, Segoe UI, sans-serif";
      ctx.fillText(t.text, W / 2 + (t.x - W / 2) * camZoom, sy);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = "left";
  }

  function drawWind() {
    if (!game || !game.running || wind.strength < 0.04) return;
    var alpha = wind.strength * 0.28;
    ctx.strokeStyle = "rgba(190,225,255," + alpha + ")";
    ctx.lineWidth = 1;
    for (var i = 0; i < 10; i++) {
      var y = H * 0.1 + i * H * 0.052;
      var x = ((clock * 8 * wind.dir + i * 91) % W + W) % W;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 42 * wind.dir, y);
      ctx.stroke();
    }
    ctx.textAlign = "right";
    ctx.font = "700 11px system-ui, sans-serif";
    ctx.fillStyle = "rgba(200,230,255," + (wind.strength * 0.75) + ")";
    ctx.fillText(wind.dir > 0 ? "GUST \u2192" : "\u2190 GUST", W - 18, H * 0.09);
    ctx.textAlign = "left";
  }

  function drawBanner() {
    if (!banner) return;
    var alpha = Math.min(1, banner.life * 2.4);
    ctx.globalAlpha = alpha;
    ctx.textAlign = "center";
    ctx.fillStyle = "#eaf2ff";
    ctx.font = "800 26px system-ui, -apple-system, Segoe UI, sans-serif";
    ctx.fillText(banner.title, W / 2, H * 0.19);
    ctx.font = "600 13px system-ui, sans-serif";
    ctx.fillStyle = "rgba(190,215,255,0.82)";
    ctx.fillText(banner.sub, W / 2, H * 0.19 + 21);
    ctx.globalAlpha = 1;
    ctx.textAlign = "left";
  }

  function draw() {
    var floors = game ? game.floors : 0;
    var pal = paletteFor(floors);

    drawSky(pal);
    drawStars(pal);
    drawPlanet(pal);
    drawClouds(pal);

    ctx.save();
    ctx.translate(W / 2, H * FOCUS);
    ctx.scale(camZoom, camZoom);
    ctx.translate(-W / 2, -camY);

    drawSkyline();
    drawStreet();

    if (game) {
      var blocks = game.blocks;
      for (var i = 0; i < blocks.length; i++) {
        var sy = projectY(blocks[i].y + BLOCK_H / 2);
        if (sy < -90 || sy > H + 110) continue;
        drawBlock(blocks[i]);
      }

      if (game.over) drawCrown(blocks[blocks.length - 1]);

      drawFragments();
      drawParticles();
      drawRings();

      if (game.moving) drawMoving(game.moving);
    }

    ctx.restore();

    if (game) drawFloaters();
    drawWind();
    drawBanner();

    if (game && game.running && game.floors === 0) {
      ctx.fillStyle = "rgba(238,240,255,0.45)";
      ctx.font = "600 15px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Tap to drop the floor", W / 2, H * 0.93);
      ctx.textAlign = "left";
    }

    if (game) paintHudIfChanged();
  }

  var hudCache = "";
  function paintHudIfChanged() {
    var key = game.floors + "|" + game.streak + "|" + game.bestStreak + "|" + game.zone;
    if (key === hudCache) return;
    hudCache = key;
    paintHud();
  }

  /* ----------------------------------------------------------------- states */

  function start() {
    PP.hideOverlay(overlay);
    if (!game || game.over) reset();
    game.running = true;
    game.over = false;
    PP.sfx("pick");
  }

  function endGame() {
    game.running = false;
    game.over = true;
    var previous = best;

    best = PP.scores.save("skyline", game.floors, "high");
    paintHud();

    PP.sfx("bad");
    PP.juice.shake(stageEl, 10);
    PP.juice.haptic([40, 70, 60]);
    PP.leaderboard.submit("skyline", game.floors);

    PP.showOverlay(
      overlay,
      '<p class="kicker">Tower down</p>' +
        "<h2>" + (game.floors > previous ? "New best skyline" : "Nice stack") + "</h2>" +
        '<div class="score-big">' + game.floors + " floor" + (game.floors === 1 ? "" : "s") + "</div>" +
        "<p>Best streak " + game.bestStreak + " · reached " + ZONES[game.zone].name + ".</p>" +
        "<p>Tallest so far: " + PP.formatNumber(best) + " floors.</p>" +
        '<div class="actions"><button class="btn" type="button" id="again">Build again</button></div>'
    );
    overlay.querySelector("#again").addEventListener("click", start);
  }

  function showStart() {
    PP.showOverlay(
      overlay,
      '<p class="kicker">One tap</p><h2>Skyline</h2>' +
        "<p>Drop each sliding floor on the last. Perfect drops rebuild lost width; " +
        "from the tenth floor gusts start pushing the floor sideways.</p>" +
        "<p>Climb from the street to orbit — every district builds differently.</p>" +
        '<div class="actions"><button class="btn" type="button" id="play">Start building</button></div>'
    );
    overlay.querySelector("#play").addEventListener("click", start);
  }

  /* ------------------------------------------------------------------ input */

  canvas.addEventListener("pointerdown", function (event) {
    if (!game || !game.running) return;
    event.preventDefault();
    drop();
  });

  document.addEventListener("keydown", function (event) {
    if (!game || !game.running) return;
    if (event.code !== "Space" && event.code !== "ArrowDown" && event.code !== "Enter") return;
    event.preventDefault();
    drop();
  });

  /* ------------------------------------------------------------------- loop */

  function frame(time) {
    requestAnimationFrame(frame);
    if (!lastTime) lastTime = time;
    var dt = Math.min((time - lastTime) / 16.667, 2.2);
    lastTime = time;
    clock += dt;

    ambient(dt);
    if (game && game.running) update(dt);

    draw();
  }

  reset();
  showStart();
  requestAnimationFrame(frame);
})();
