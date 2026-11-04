/*
  Vector Vanguard — a twin-stick arena shooter with auto-aim.

  Five drone behaviours (chaser, runner, shooter, splitter, turret, spawner)
  introduced one at a time, ten waves, two dash charges that grant brief
  invulnerability. Enemies always teleport in at the rim of the arena, never on
  top of the player, and always wind up for half a second first.
*/
(function () {
  "use strict";

  var ID = "vanguard";
  var W = 960;
  var H = 560;
  var PAD = 22;

  var canvas = document.getElementById("board");
  var overlay = document.getElementById("overlay");
  var bestEl = document.getElementById("best");
  var hudA = document.getElementById("hudA");
  var hudB = document.getElementById("hudB");
  var hudC = document.getElementById("hudC");
  var ctx = PP.fitCanvas(canvas, W, H);

  var TYPES = {
    chaser: { r: 12, hp: 3, speed: 104, score: 100, color: "#ff5d73", shape: "tri" },
    runner: { r: 10, hp: 2, speed: 178, score: 130, color: "#ffd166", shape: "diamond" },
    shooter: { r: 13, hp: 6, speed: 92, score: 170, color: "#a78bfa", shape: "hex" },
    splitter: { r: 15, hp: 7, speed: 66, score: 210, color: "#5eead4", shape: "square" },
    turret: { r: 16, hp: 20, speed: 0, score: 260, color: "#fb7185", shape: "cross" },
    spawner: { r: 17, hp: 16, speed: 0, score: 300, color: "#f472b6", shape: "star" },
    spark: { r: 7, hp: 1, speed: 196, score: 40, color: "#5eead4", shape: "diamond" },
  };

  var WAVES = [
    { chaser: 6 },
    { chaser: 7, shooter: 1 },
    { chaser: 6, shooter: 2, turret: 1 },
    { runner: 6, chaser: 5 },
    { splitter: 3, chaser: 6 },
    { shooter: 3, runner: 5, splitter: 2 },
    { chaser: 8, shooter: 3, turret: 1 },
    { splitter: 4, spawner: 1, runner: 6 },
    { chaser: 10, shooter: 4, turret: 2, runner: 4 },
    { spawner: 2, splitter: 5, shooter: 4, chaser: 10 },
  ];

  var player = null;
  var enemies = [];
  var pBullets = [];
  var eBullets = [];
  var particles = [];
  var queue = [];
  var waveIndex = 0;
  var spawnTimer = 0;
  var intermission = 0;
  var score = 0;
  var kills = 0;
  var shake = 0;
  var flash = 0;
  var toast = "";
  var toastT = 0;
  var state = "idle";
  var last = 0;
  var raf = 0;
  var hudTick = 0;
  var pointer = { active: false, x: W / 2, y: H / 2 };
  var keys = {};

  /* -------------------------------------------------------------- utilities */

  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function rand(min, max) { return min + Math.random() * (max - min); }
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function near(a, b, r) { return Math.hypot(a.x - b.x, a.y - b.y) < r; }

  function makePlayer() {
    return {
      x: W / 2, y: H / 2, r: 13, hp: 5, maxHp: 5, speed: 272,
      aim: -Math.PI / 2, fire: 0, invuln: 1.4, dash: 0, dashVX: 0, dashVY: 0,
      charges: 2, chargeT: 0, trail: [],
    };
  }

  function burst(x, y, color, count, fast) {
    for (var i = 0; i < count; i++) {
      var angle = Math.random() * Math.PI * 2;
      var speed = fast ? rand(120, 460) : rand(40, 220);
      particles.push({
        x: x, y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: rand(0.22, 0.6),
        max: 0.6,
        color: color,
        size: rand(1.6, 3.6),
      });
    }
  }

  /* ------------------------------------------------------------- wave set-up */

  function shuffle(list) {
    for (var i = list.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = list[i];
      list[i] = list[j];
      list[j] = tmp;
    }
    return list;
  }

  function startWave(n) {
    waveIndex = n;
    var spec = WAVES[Math.min(n, WAVES.length) - 1];
    queue = [];
    Object.keys(spec).forEach(function (type) {
      for (var i = 0; i < spec[type]; i++) queue.push(type);
    });
    shuffle(queue);
    spawnTimer = 0.5;
    toast = "Wave " + n;
    toastT = 1.5;
    PP.sfx("pick");
  }

  function spawnPoint() {
    for (var attempt = 0; attempt < 24; attempt++) {
      var side = Math.floor(Math.random() * 4);
      var x, y;
      if (side === 0) { x = rand(PAD + 30, W - PAD - 30); y = PAD + 34; }
      else if (side === 1) { x = W - PAD - 34; y = rand(PAD + 30, H - PAD - 30); }
      else if (side === 2) { x = rand(PAD + 30, W - PAD - 30); y = H - PAD - 34; }
      else { x = PAD + 34; y = rand(PAD + 30, H - PAD - 30); }
      if (Math.hypot(x - player.x, y - player.y) > 300) return { x: x, y: y };
    }
    return { x: PAD + 40, y: PAD + 40 };
  }

  function spawnEnemy(type, at) {
    var spec = TYPES[type];
    var point = at || spawnPoint();
    var waveScale = 1 + (waveIndex - 1) * 0.07;
    enemies.push({
      type: type, x: point.x, y: point.y, r: spec.r, color: spec.color,
      shape: spec.shape, score: spec.score,
      hp: spec.hp * waveScale, maxHp: spec.hp * waveScale,
      speed: spec.speed * (1 + (waveIndex - 1) * 0.035),
      t: 0, cd: rand(0.4, 1.4), tele: 0, flash: 0, hitCd: 0,
      spawn: 0.55, vx: 0, vy: 0, wobble: Math.random() * Math.PI * 2,
    });
  }

  /* ----------------------------------------------------------------- enemy AI */

  function enemyFire(e, speed, spread, count) {
    var base = Math.atan2(player.y - e.y, player.x - e.x);
    for (var i = 0; i < count; i++) {
      var angle = base + (count === 1 ? 0 : (i - (count - 1) / 2) * spread);
      eBullets.push({
        x: e.x + Math.cos(angle) * (e.r + 4),
        y: e.y + Math.sin(angle) * (e.r + 4),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: 5, life: 3.4,
      });
    }
  }

  function chase(e, dt) {
    var angle = Math.atan2(player.y - e.y, player.x - e.x);
    e.x += Math.cos(angle) * e.speed * dt;
    e.y += Math.sin(angle) * e.speed * dt;
  }

  function tickEnemy(e, dt) {
    e.t += dt;
    if (e.flash > 0) e.flash -= dt;
    if (e.hitCd > 0) e.hitCd -= dt;
    if (e.spawn > 0) { e.spawn -= dt; return; }
    if (e.cd > 0) e.cd -= dt;

    if (e.tele > 0) {
      e.tele -= dt;
      if (e.tele <= 0) {
        if (e.type === "turret") { enemyFire(e, 210, Math.PI / 4, 8); e.cd = 2.6; }
        else if (e.type === "spawner") {
          spawnEnemy("chaser", { x: e.x + rand(-26, 26), y: e.y + rand(-26, 26) });
          e.cd = 3.2;
        } else { enemyFire(e, 236, 0.08, 1); e.cd = 1.7; }
      }
      return;
    }

    var d = Math.hypot(player.x - e.x, player.y - e.y);

    if (e.type === "chaser" || e.type === "runner" || e.type === "spark") {
      chase(e, dt);
    } else if (e.type === "splitter") {
      chase(e, dt);
      e.wobble += dt * 2.2;
    } else if (e.type === "shooter") {
      var angle = Math.atan2(player.y - e.y, player.x - e.x);
      if (d > 320) {
        e.x += Math.cos(angle) * e.speed * dt;
        e.y += Math.sin(angle) * e.speed * dt;
      } else if (d < 210) {
        e.x -= Math.cos(angle) * e.speed * dt;
        e.y -= Math.sin(angle) * e.speed * dt;
      } else {
        e.x += Math.cos(angle + Math.PI / 2) * e.speed * 0.7 * dt;
        e.y += Math.sin(angle + Math.PI / 2) * e.speed * 0.7 * dt;
      }
      if (e.cd <= 0 && d < 470) e.tele = 0.36;
    } else if (e.type === "turret") {
      if (e.cd <= 0) e.tele = 0.5;
    } else if (e.type === "spawner") {
      if (e.cd <= 0 && enemies.length < 22) e.tele = 0.5;
    }

    e.x = clamp(e.x, PAD + e.r, W - PAD - e.r);
    e.y = clamp(e.y, PAD + e.r, H - PAD - e.r);
  }

  /* ------------------------------------------------------------------ player */

  function moveVector() {
    var x = 0;
    var y = 0;
    if (keys.ArrowLeft || keys.KeyA) x -= 1;
    if (keys.ArrowRight || keys.KeyD) x += 1;
    if (keys.ArrowUp || keys.KeyW) y -= 1;
    if (keys.ArrowDown || keys.KeyS) y += 1;

    if (pointer.active) {
      var dx = pointer.x - player.x;
      var dy = pointer.y - player.y;
      var len = Math.hypot(dx, dy);
      if (len > 6) {
        x += dx / len;
        y += dy / len;
      }
    }

    var length = Math.hypot(x, y);
    if (length > 1) { x /= length; y /= length; }
    return { x: x, y: y };
  }

  function nearestEnemy() {
    var best = null;
    var bestDist = Infinity;
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (e.tele > 0 && e.spawn > 0) continue;
      var d = Math.hypot(player.x - e.x, player.y - e.y);
      if (d < bestDist) { bestDist = d; best = e; }
    }
    return best;
  }

  function fireBullet() {
    var angle = player.aim + rand(-0.035, 0.035);
    pBullets.push({
      x: player.x + Math.cos(angle) * 18,
      y: player.y + Math.sin(angle) * 18,
      vx: Math.cos(angle) * 780,
      vy: Math.sin(angle) * 780,
      r: 3.4, life: 1.5, dmg: 2,
    });
  }

  function dash() {
    if (state !== "play" || player.charges <= 0 || player.dash > 0) return;
    var mv = moveVector();
    if (mv.x === 0 && mv.y === 0) {
      mv.x = Math.cos(player.aim);
      mv.y = Math.sin(player.aim);
    }
    player.charges -= 1;
    player.chargeT = 0;
    player.dash = 0.14;
    player.invuln = Math.max(player.invuln, 0.2);
    player.dashVX = mv.x * 880;
    player.dashVY = mv.y * 880;
    burst(player.x, player.y, "#7dd3fc", 8, true);
    PP.sfx("pick");
  }

  function hurtPlayer() {
    if (player.invuln > 0 || state !== "play") return;
    player.hp -= 1;
    player.invuln = 0.95;
    shake = 1;
    flash = 1;
    burst(player.x, player.y, "#ff5d73", 16, true);
    PP.sfx("bad");
    PP.juice && PP.juice.haptic && PP.juice.haptic("heavy");
    if (player.hp <= 0) gameOver();
  }

  function updatePlayer(dt) {
    if (player.charges < 2) {
      player.chargeT += dt;
      if (player.chargeT >= 1.05) { player.charges += 1; player.chargeT = 0; }
    }
    if (player.invuln > 0) player.invuln -= dt;

    if (player.dash > 0) {
      player.dash -= dt;
      player.x += player.dashVX * dt;
      player.y += player.dashVY * dt;
      player.trail.push({ x: player.x, y: player.y, life: 0.25 });
    } else {
      var mv = moveVector();
      player.x += mv.x * player.speed * dt;
      player.y += mv.y * player.speed * dt;
    }

    player.x = clamp(player.x, PAD + player.r, W - PAD - player.r);
    player.y = clamp(player.y, PAD + player.r, H - PAD - player.r);

    var target = nearestEnemy();
    if (target) {
      var want = Math.atan2(target.y - player.y, target.x - player.x);
      var diff = Math.atan2(Math.sin(want - player.aim), Math.cos(want - player.aim));
      player.aim += diff * Math.min(1, dt * 16);
      player.fire -= dt;
      if (player.fire <= 0) {
        fireBullet();
        player.fire = 0.152;
      }
    } else {
      player.fire = 0;
    }

    for (var i = player.trail.length - 1; i >= 0; i--) {
      player.trail[i].life -= dt;
      if (player.trail[i].life <= 0) player.trail.splice(i, 1);
    }
  }

  /* ----------------------------------------------------------------- combat */

  function damageEnemy(e, amount) {
    e.hp -= amount;
    e.flash = 0.09;
    if (e.hp > 0) return;
    killEnemy(e);
  }

  function killEnemy(e) {
    var index = enemies.indexOf(e);
    if (index === -1) return;
    enemies.splice(index, 1);
    score += e.score;
    kills += 1;
    burst(e.x, e.y, e.color, 12, true);
    PP.sfx("pick");
    if (e.type === "splitter") {
      for (var i = 0; i < 3; i++) {
        var angle = (Math.PI * 2 * i) / 3 + rand(-0.4, 0.4);
        spawnEnemy("spark", { x: e.x + Math.cos(angle) * 18, y: e.y + Math.sin(angle) * 18 });
      }
    }
  }

  function updateBullets(dt) {
    var i, j;
    for (i = pBullets.length - 1; i >= 0; i--) {
      var b = pBullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0 || b.x < PAD || b.x > W - PAD || b.y < PAD || b.y > H - PAD) {
        pBullets.splice(i, 1);
        continue;
      }
      for (j = enemies.length - 1; j >= 0; j--) {
        var e = enemies[j];
        if (e.spawn > 0) continue;
        if (Math.hypot(b.x - e.x, b.y - e.y) > e.r + b.r) continue;
        pBullets.splice(i, 1);
        burst(b.x, b.y, e.color, 3, true);
        damageEnemy(e, b.dmg);
        break;
      }
    }

    for (i = eBullets.length - 1; i >= 0; i--) {
      var eb = eBullets[i];
      eb.x += eb.vx * dt;
      eb.y += eb.vy * dt;
      eb.life -= dt;
      if (eb.life <= 0 || eb.x < PAD || eb.x > W - PAD || eb.y < PAD || eb.y > H - PAD) {
        eBullets.splice(i, 1);
        continue;
      }
      if (Math.hypot(eb.x - player.x, eb.y - player.y) < player.r + eb.r) {
        eBullets.splice(i, 1);
        hurtPlayer();
      }
    }

    for (i = enemies.length - 1; i >= 0; i--) {
      var foe = enemies[i];
      if (foe.spawn > 0 || foe.hitCd > 0) continue;
      if (Math.hypot(foe.x - player.x, foe.y - player.y) < foe.r + player.r) {
        foe.hitCd = 0.9;
        hurtPlayer();
      }
    }
  }

  /* ------------------------------------------------------------------ update */

  function update(dt) {
    if (state !== "play") return;

    updatePlayer(dt);

    for (var i = enemies.length - 1; i >= 0; i--) tickEnemy(enemies[i], dt);
    updateBullets(dt);

    for (var p = particles.length - 1; p >= 0; p--) {
      var part = particles[p];
      part.x += part.vx * dt;
      part.y += part.vy * dt;
      part.vx *= 0.94;
      part.vy *= 0.94;
      part.life -= dt;
      if (part.life <= 0) particles.splice(p, 1);
    }

    if (shake > 0) shake = Math.max(0, shake - dt * 2.4);
    if (flash > 0) flash = Math.max(0, flash - dt * 2.6);
    if (toastT > 0) toastT -= dt;

    if (queue.length) {
      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        spawnEnemy(queue.shift());
        spawnTimer = rand(0.42, 0.68);
      }
    }

    if (!queue.length && !enemies.length) {
      if (intermission <= 0) {
        intermission = 2.2;
        score += 120 * waveIndex;
        toast = waveIndex >= WAVES.length ? "All waves cleared" : "Wave " + waveIndex + " clear";
        toastT = 1.6;
      } else {
        intermission -= dt;
        if (intermission <= 0) {
          if (waveIndex >= WAVES.length) victory();
          else { intermission = 0; startWave(waveIndex + 1); }
        }
      }
    }
  }

  /* -------------------------------------------------------------------- draw */

  function drawArena() {
    var bg = ctx.createRadialGradient(W / 2, H / 2, 60, W / 2, H / 2, W * 0.72);
    bg.addColorStop(0, "#111a33");
    bg.addColorStop(1, "#05070f");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "rgba(122,162,255,0.09)";
    ctx.lineWidth = 1;
    for (var x = PAD; x < W - PAD; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, PAD);
      ctx.lineTo(x, H - PAD);
      ctx.stroke();
    }
    for (var y = PAD; y < H - PAD; y += 48) {
      ctx.beginPath();
      ctx.moveTo(PAD, y);
      ctx.lineTo(W - PAD, y);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(125,211,252,0.35)";
    ctx.lineWidth = 2;
    ctx.strokeRect(PAD, PAD, W - PAD * 2, H - PAD * 2);
  }

  function shapePath(shape, r) {
    ctx.beginPath();
    if (shape === "tri") {
      ctx.moveTo(r, 0);
      ctx.lineTo(-r * 0.8, r * 0.75);
      ctx.lineTo(-r * 0.8, -r * 0.75);
      ctx.closePath();
    } else if (shape === "diamond") {
      ctx.moveTo(r, 0);
      ctx.lineTo(0, r * 0.8);
      ctx.lineTo(-r, 0);
      ctx.lineTo(0, -r * 0.8);
      ctx.closePath();
    } else if (shape === "hex") {
      for (var i = 0; i < 6; i++) {
        var a = (Math.PI / 3) * i;
        var px = Math.cos(a) * r;
        var py = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
    } else if (shape === "square") {
      ctx.rect(-r * 0.8, -r * 0.8, r * 1.6, r * 1.6);
    } else if (shape === "cross") {
      var w = r * 0.34;
      ctx.moveTo(-w, -r); ctx.lineTo(w, -r); ctx.lineTo(w, -w);
      ctx.lineTo(r, -w); ctx.lineTo(r, w); ctx.lineTo(w, w);
      ctx.lineTo(w, r); ctx.lineTo(-w, r); ctx.lineTo(-w, w);
      ctx.lineTo(-r, w); ctx.lineTo(-r, -w); ctx.lineTo(-w, -w);
      ctx.closePath();
    } else {
      for (var k = 0; k < 10; k++) {
        var rad = k % 2 ? r * 0.46 : r;
        var ang = (Math.PI / 5) * k - Math.PI / 2;
        var sx = Math.cos(ang) * rad;
        var sy = Math.sin(ang) * rad;
        if (k === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
      }
      ctx.closePath();
    }
  }

  function drawEnemies() {
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (e.spawn > 0) {
        var p = 1 - e.spawn / 0.55;
        ctx.strokeStyle = "rgba(255,120,160," + (0.25 + p * 0.6) + ")";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r + 22 * (1 - p), 0, Math.PI * 2);
        ctx.stroke();
        continue;
      }

      ctx.save();
      ctx.translate(e.x, e.y);
      if (e.type === "splitter") ctx.rotate(e.wobble);
      else if (e.type !== "turret" && e.type !== "spawner") {
        ctx.rotate(Math.atan2(player.y - e.y, player.x - e.x));
      }
      if (e.tele > 0) {
        ctx.globalAlpha = 0.45 + Math.sin(e.tele * 40) * 0.3;
      }
      ctx.fillStyle = e.flash > 0 ? "#ffffff" : e.color;
      shapePath(e.shape, e.r);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();

      if (e.tele > 0) {
        ctx.strokeStyle = "rgba(255,255,255,0.55)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r + 8 + (1 - e.tele) * 10, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (e.hp < e.maxHp) {
        var w = e.r * 2;
        ctx.fillStyle = "rgba(255,255,255,0.18)";
        ctx.fillRect(e.x - w / 2, e.y - e.r - 9, w, 3);
        ctx.fillStyle = e.color;
        ctx.fillRect(e.x - w / 2, e.y - e.r - 9, w * Math.max(0, e.hp / e.maxHp), 3);
      }
    }
  }

  function drawPlayer() {
    for (var t = 0; t < player.trail.length; t++) {
      var tr = player.trail[t];
      ctx.globalAlpha = tr.life * 1.6;
      ctx.fillStyle = "#7dd3fc";
      ctx.beginPath();
      ctx.arc(tr.x, tr.y, 9, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (player.invuln > 0 && Math.floor(player.invuln * 18) % 2 === 0) return;

    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.aim);

    ctx.shadowColor = "rgba(125,211,252,0.85)";
    ctx.shadowBlur = 16;
    ctx.fillStyle = "#e7f6ff";
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(-11, 11);
    ctx.lineTo(-5, 0);
    ctx.lineTo(-11, -11);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = "#38bdf8";
    ctx.fillRect(-9, -3, 7, 6);
    ctx.restore();

    if (player.charges < 2) {
      ctx.strokeStyle = "rgba(125,211,252,0.5)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.r + 9, -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * (player.chargeT / 1.05));
      ctx.stroke();
    }
  }

  function draw() {
    drawArena();

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    for (var b = 0; b < pBullets.length; b++) {
      var pb = pBullets[b];
      ctx.fillStyle = "#9ff2ff";
      ctx.beginPath();
      ctx.arc(pb.x, pb.y, pb.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(159,242,255,0.45)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(pb.x, pb.y);
      ctx.lineTo(pb.x - pb.vx * 0.012, pb.y - pb.vy * 0.012);
      ctx.stroke();
    }

    for (var eb = 0; eb < eBullets.length; eb++) {
      var bullet = eBullets[eb];
      ctx.fillStyle = "#ff7a9c";
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.r, 0, Math.PI * 2);
      ctx.fill();
    }

    drawEnemies();
    if (state === "play" || state === "over") drawPlayer();

    if (toastT > 0) {
      ctx.globalAlpha = Math.min(1, toastT);
      ctx.fillStyle = "#dbeafe";
      ctx.font = "700 26px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(toast, W / 2, 92);
      ctx.globalAlpha = 1;
    }

    if (shake > 0) {
      ctx.strokeStyle = "rgba(255,93,115," + shake * 0.6 + ")";
      ctx.lineWidth = 12;
      ctx.strokeRect(0, 0, W, H);
    }

    if (flash > 0) {
      ctx.fillStyle = "rgba(255,93,115," + flash * 0.18 + ")";
      ctx.fillRect(0, 0, W, H);
    }
  }

  function paintHud() {
    if (hudA) hudA.textContent = PP.formatNumber(score);
    if (hudB) hudB.textContent = String(Math.max(1, waveIndex));
    if (hudC) hudC.textContent = String(Math.max(0, player ? player.hp : 0));
    if (bestEl) bestEl.textContent = PP.formatNumber(PP.scores.get(ID) || 0);
  }

  /* ------------------------------------------------------------------- flow */

  function reset() {
    player = makePlayer();
    enemies = [];
    pBullets = [];
    eBullets = [];
    particles = [];
    queue = [];
    waveIndex = 0;
    spawnTimer = 0;
    intermission = 0;
    score = 0;
    kills = 0;
    shake = 0;
    flash = 0;
    toast = "";
    toastT = 0;
    pointer.active = false;
    startWave(1);
  }

  function start() {
    reset();
    state = "play";
    last = 0;
    PP.hideOverlay(overlay);
    paintHud();
  }

  function finish(win) {
    state = win ? "won" : "over";
    var best = PP.scores.save(ID, score, "high");
    var result = PP.leaderboard.submit(ID, score);
    PP.sfx(win ? "win" : "bad");
    paintHud();

    var note = result
      ? "<p>" + (result.rank === 1 ? "Top of this device's board." : "#" + result.rank + " of " + result.total + " here.") + "</p>"
      : "";

    PP.showOverlay(overlay,
      "<h2>" + (win ? "Arena secure" : "Hull breached") + "</h2>" +
      "<p class=\"big-score\">" + PP.formatNumber(score) + "</p>" +
      "<p>Wave " + waveIndex + " · " + kills + " drones downed · best " +
      PP.formatNumber(best) + "</p>" + note +
      "<button class=\"btn\" type=\"button\" data-start>" + (win ? "Fly again" : "Try again") + "</button>");
    bindStart();
  }

  function gameOver() { finish(false); }
  function victory() { finish(true); }

  function panel() {
    PP.showOverlay(overlay,
      "<h2>Vector Vanguard</h2>" +
      "<p>Your cannon locks on by itself — stay moving, watch the wind-up rings, " +
      "and dash through the gaps. Ten waves of drones.</p>" +
      "<p class=\"hint\">WASD / arrows fly · Space dashes · drag the arena on touch</p>" +
      "<button class=\"btn\" type=\"button\" data-start>Launch</button>");
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

  window.addEventListener("keydown", function (event) {
    var code = event.code || event.key;
    if (code === "Space") {
      if (state === "play") dash();
      else start();
      event.preventDefault();
      return;
    }
    keys[code] = true;
    if (/^Arrow/.test(code)) event.preventDefault();
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

  var dashButton = document.querySelector("[data-dash]");
  if (dashButton) {
    dashButton.addEventListener("click", function () { dash(); });
  }

  function pointerTo(event) {
    var rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * W;
    pointer.y = ((event.clientY - rect.top) / rect.height) * H;
  }

  canvas.addEventListener("pointerdown", function (event) {
    pointerTo(event);
    pointer.active = true;
    canvas.setPointerCapture && canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove", function (event) {
    if (pointer.active) pointerTo(event);
  });
  canvas.addEventListener("pointerup", function () { pointer.active = false; });
  canvas.addEventListener("pointercancel", function () { pointer.active = false; });
  canvas.addEventListener("pointerleave", function () { pointer.active = false; });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden && state === "play") {
      state = "idle";
      pointer.active = false;
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

  player = makePlayer();
  draw();
  paintHud();
  panel();
  raf = window.requestAnimationFrame(frame);
})();
