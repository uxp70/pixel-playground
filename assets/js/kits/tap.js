/* Tap family — eleven different one-thumb games, not eleven speeds of one. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, clamp = K.clamp, near = K.near, rr = K.roundRect;

  var MODES = [
    { name: "Tap Storm", kind: "targets", time: 20, spawn: 0.55, life: 1.15, radius: [24, 36], hudA: "Hits", hudB: "Time", pattern: "rain" },
    { name: "Rapid Grid", kind: "grid", time: 20, hudA: "Cells", hudB: "Time", pattern: "grid" },
    { name: "Blip Rush", kind: "blip", time: 15, hudA: "Blips", hudB: "Time", pattern: "scan" },
    { name: "Pop Circuit", kind: "circuit", time: 20, hudA: "Nodes", hudB: "Time", pattern: "beams" },
    { name: "Swat Squad", kind: "targets", time: 20, spawn: 0.42, life: 1.7, radius: [20, 28], move: 95, combo: true, hudA: "Swats", hudB: "Time", pattern: "dots" },
    { name: "Dot Frenzy", kind: "targets", time: 15, spawn: 0.12, life: 0.72, radius: [10, 16], crowd: true, hudA: "Dots", hudB: "Time", pattern: "stars" },
    { name: "Tap Tide", kind: "targets", time: 30, spawn: 0.6, life: 99, radius: [22, 30], tide: true, lives: 3, hudA: "Caught", hudB: "Lives", pattern: "waves" },
    { name: "Pixel Panic", kind: "targets", time: 20, spawn: 0.38, life: 1.25, radius: [17, 26], decoy: 0.35, hudA: "Clean", hudB: "Time", pattern: "bricks" },
    { name: "Snap Field", kind: "targets", time: 20, spawn: 0.5, life: 1.1, radius: [20, 30], zone: true, hudA: "In ring", hudB: "Time", pattern: "grid" },
    { name: "Pulse Tap", kind: "targets", time: 20, spawn: 0.62, life: 2.4, radius: [24, 34], pulse: true, hudA: "Pulses", hudB: "Time", pattern: "bands" },
    { name: "Tap Finale", kind: "boss", time: 35, hudA: "Damage", hudB: "Time", pattern: "beams" },
  ];

  function make(api) {
    var m = api.mode;
    var kind = m.kind;
    var ctx = api.ctx;
    var score = 0;
    var clock = 0;
    var lives = m.lives || 0;
    var targets = [];
    var next = 0.25;
    var combo = 0;
    var comboClock = 0;
    var ringR = 210;
    var ringPhase = 0;

    var grid = { size: 4, cell: 118, gap: 12, lit: 0, litFor: 0.6 };
    grid.x = (W - (grid.size * grid.cell + (grid.size - 1) * grid.gap)) / 2;
    grid.y = (H - (grid.size * grid.cell + (grid.size - 1) * grid.gap)) / 2;

    var blip = { x: W / 2, y: H / 2, r: 34, moveIn: 0.7 };
    var circuit = { nodes: [], seq: [], at: 0, flash: 0 };
    for (var n = 0; n < 6; n++) {
      var angle = -Math.PI / 2 + (n / 6) * Math.PI * 2;
      circuit.nodes.push({ x: W / 2 + Math.cos(angle) * 190, y: H / 2 + Math.sin(angle) * 190, r: 30 });
    }
    circuit.seq = [0, 2, 4, 1];

    var boss = { x: W / 2, y: H / 2, r: 46, hp: 12, max: 12, phase: 1, shields: [], spin: 0, hit: 0 };

    function addTarget() {
      if (m.crowd && targets.length > 26) return;
      var r = rand(m.radius[0], m.radius[1]);
      var t = {
        x: rand(r + 18, W - r - 18),
        y: rand(r + 72, H - r - 18),
        r: r,
        life: m.life * rand(0.85, 1.15),
        age: 0,
        vx: m.move ? rand(-1, 1) * m.move : 0,
        vy: m.move ? rand(-1, 1) * m.move : 0,
        dud: m.decoy ? Math.random() < m.decoy : false,
        phase: rand(0, Math.PI * 2),
      };
      if (m.tide) {
        t.y = H + r;
        t.vy = -rand(64, 96) - api.level * 3;
      }
      targets.push(t);
    }

    function pop(t, index) {
      var inZone = true;
      if (m.zone) {
        var dx = t.x - W / 2;
        var dy = t.y - H / 2;
        inZone = Math.sqrt(dx * dx + dy * dy) + t.r * 0.5 <= ringR;
      }
      var bright = true;
      if (m.pulse) bright = Math.sin(api.elapsed * 5 + t.phase) > 0.55;
      targets.splice(index, 1);

      if (m.decoy && t.dud) {
        score = Math.max(0, score - 2);
        api.sfx("bad");
        api.shake(7);
        api.haptic(16);
        return;
      }
      if (!inZone) {
        score = Math.max(0, score - 1);
        api.sfx("bad");
        api.shake(4);
        return;
      }
      if (!bright) {
        score = Math.max(0, score - 1);
        api.sfx("bad");
        api.haptic(10);
        return;
      }

      var gain = m.pulse ? 2 : 1;
      if (m.combo) {
        combo++;
        comboClock = 1.6;
        gain += Math.min(3, Math.floor(combo / 4));
      }
      score += gain;
      api.sfx("pick");
      api.burst(t.x, t.y, t.dud ? "#94a3b8" : api.accent, m.crowd ? 4 : 7);
      api.haptic(5);
    }

    function newLit() {
      var total = grid.size * grid.size;
      var pick = Math.floor(rand(0, total));
      if (pick === grid.lit) pick = (pick + 1) % total;
      grid.lit = pick;
      grid.litFor = Math.max(0.34, 0.72 - api.level * 0.03);
    }

    function gridRect(i) {
      return {
        x: grid.x + (i % grid.size) * (grid.cell + grid.gap),
        y: grid.y + Math.floor(i / grid.size) * (grid.cell + grid.gap),
        w: grid.cell,
        h: grid.cell,
      };
    }

    function newSeq() {
      circuit.seq = [];
      var last = -1;
      for (var i = 0; i < 4; i++) {
        var pick = Math.floor(rand(0, 6));
        if (pick === last) pick = (pick + 1) % 6;
        circuit.seq.push(pick);
        last = pick;
      }
      circuit.at = 0;
    }

    function bossHit(x, y) {
      for (var i = 0; i < boss.shields.length; i++) {
        var s = boss.shields[i];
        if (near(x, y, 4, s.x, s.y, 22)) {
          score = Math.max(0, score - 1);
          api.sfx("bad");
          api.shake(4);
          return;
        }
      }
      if (near(x, y, 4, boss.x, boss.y, boss.r)) {
        boss.hp--;
        boss.hit = 0.18;
        score += 2;
        api.sfx("good");
        api.burst(boss.x, boss.y, api.accent, 10);
        api.haptic(7);
        if (boss.hp <= 0) {
          if (boss.phase >= 3) {
            api.finish(score + 15);
            return;
          }
          boss.phase++;
          boss.max = 12 + boss.phase * 3;
          boss.hp = boss.max;
          boss.spin += 0.7;
          api.sfx("win");
        }
      }
    }

    function update(dt) {
      clock += dt;
      comboClock = Math.max(0, comboClock - dt);
      if (comboClock === 0) combo = 0;

      if (kind === "boss") {
        boss.spin += dt * (0.9 + boss.phase * 0.35);
        boss.shields = [];
        for (var b = 0; b < 4; b++) {
          var a = boss.spin + (b / 4) * Math.PI * 2;
          boss.shields.push({ x: boss.x + Math.cos(a) * 92, y: boss.y + Math.sin(a) * 92 });
        }
        boss.hit = Math.max(0, boss.hit - dt);
        api.hud(score, Math.max(0, Math.ceil(m.time - clock)) + "s");
      } else if (kind === "grid") {
        grid.litFor -= dt;
        if (grid.litFor <= 0) newLit();
        api.hud(score, Math.max(0, Math.ceil(m.time - clock)) + "s");
      } else if (kind === "blip") {
        blip.moveIn -= dt;
        if (blip.moveIn <= 0) {
          blip.x = rand(50, W - 50);
          blip.y = rand(90, H - 50);
          blip.r = Math.max(22, blip.r - 1);
          blip.moveIn = Math.max(0.32, 0.7 - score * 0.015);
        }
        api.hud(score, Math.max(0, Math.ceil(m.time - clock)) + "s");
      } else if (kind === "circuit") {
        circuit.flash = Math.max(0, circuit.flash - dt);
        api.hud(score, Math.max(0, Math.ceil(m.time - clock)) + "s");
      } else {
        if (m.zone) ringR = 168 + Math.sin(clock * 1.4) * 52;
        next -= dt;
        if (next <= 0) { addTarget(); next = m.spawn; }
        for (var i = targets.length - 1; i >= 0; i--) {
          var t = targets[i];
          t.age += dt;
          if (m.move) {
            t.x += t.vx * dt;
            t.y += t.vy * dt;
            if (t.x < t.r + 10 || t.x > W - t.r - 10) { t.vx *= -1; t.x = clamp(t.x, t.r + 10, W - t.r - 10); }
            if (t.y < t.r + 70 || t.y > H - t.r - 10) { t.vy *= -1; t.y = clamp(t.y, t.r + 70, H - t.r - 10); }
          }
          if (m.tide) t.y += t.vy * dt;
          if (m.tide && t.y < 78) {
            targets.splice(i, 1);
            lives--;
            api.sfx("bad");
            api.shake(8);
            api.haptic(20);
            if (lives <= 0) { api.finish(score); return; }
            continue;
          }
          if (!m.tide && t.age > t.life) targets.splice(i, 1);
        }
        api.hud(score, m.tide ? lives + " lives" : Math.max(0, Math.ceil(m.time - clock)) + "s");
        if (m.combo && combo > 1) api.text("x" + combo, W / 2, H - 34, 20, "rgba(255,255,255,0.5)");
      }

      if (clock >= m.time) api.finish(score);
    }

    function draw() {
      api.bg();
      var i;
      if (kind === "grid") {
        for (i = 0; i < grid.size * grid.size; i++) {
          var r = gridRect(i);
          var on = i === grid.lit;
          ctx.fillStyle = on ? api.accent : "rgba(255,255,255,0.06)";
          rr(ctx, r.x, r.y, r.w, r.h, 18);
          ctx.fill();
          if (on) {
            ctx.strokeStyle = "rgba(255,255,255,0.7)";
            ctx.lineWidth = 3;
            ctx.stroke();
          }
        }
      } else if (kind === "blip") {
        ctx.strokeStyle = "rgba(255,255,255,0.12)";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(blip.x, blip.y, blip.r + 16, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = api.accent;
        ctx.beginPath(); ctx.arc(blip.x, blip.y, blip.r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.beginPath(); ctx.arc(blip.x, blip.y, blip.r * 0.35, 0, Math.PI * 2); ctx.fill();
      } else if (kind === "circuit") {
        ctx.strokeStyle = "rgba(255,255,255,0.12)";
        ctx.lineWidth = 3;
        for (i = 0; i < circuit.seq.length - 1; i++) {
          var a = circuit.nodes[circuit.seq[i]];
          var b = circuit.nodes[circuit.seq[i + 1]];
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
        for (i = 0; i < circuit.nodes.length; i++) {
          var node = circuit.nodes[i];
          var active = circuit.seq[circuit.at] === i;
          ctx.fillStyle = active ? api.accent : "rgba(255,255,255,0.08)";
          ctx.beginPath(); ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2); ctx.fill();
          if (active) {
            ctx.strokeStyle = "rgba(255,255,255,0.8)";
            ctx.lineWidth = 3;
            ctx.stroke();
          }
        }
        api.text(circuit.at + " / " + circuit.seq.length, W / 2, 84, 22, "rgba(255,255,255,0.55)");
      } else if (kind === "boss") {
        var pulse = 1 + boss.hit * 1.4;
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.beginPath(); ctx.arc(boss.x, boss.y, 118, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = api.accent;
        ctx.beginPath(); ctx.arc(boss.x, boss.y, boss.r * pulse, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.beginPath(); ctx.arc(boss.x, boss.y, boss.r * 0.34, 0, Math.PI * 2); ctx.fill();
        for (i = 0; i < boss.shields.length; i++) {
          var s = boss.shields[i];
          ctx.fillStyle = "#94a3b8";
          ctx.beginPath(); ctx.arc(s.x, s.y, 22, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = "rgba(255,255,255,0.35)";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        rr(ctx, W / 2 - 150, 60, 300, 14, 7); ctx.fill();
        ctx.fillStyle = api.accent;
        rr(ctx, W / 2 - 150, 60, 300 * (boss.hp / boss.max), 14, 7); ctx.fill();
        api.text("PHASE " + boss.phase + " / 3", W / 2, 96, 20, "rgba(255,255,255,0.6)");
      } else {
        if (m.zone) {
          ctx.strokeStyle = "rgba(255,255,255,0.28)";
          ctx.lineWidth = 3;
          ctx.setLineDash([10, 12]);
          ctx.beginPath(); ctx.arc(W / 2, H / 2, ringR, 0, Math.PI * 2); ctx.stroke();
          ctx.setLineDash([]);
        }
        if (m.tide) {
          ctx.strokeStyle = "rgba(248,113,113,0.55)";
          ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(0, 78); ctx.lineTo(W, 78); ctx.stroke();
        }
        for (i = 0; i < targets.length; i++) {
          var t = targets[i];
          var k = m.tide ? 1 : clamp(1 - t.age / t.life, 0.15, 1);
          var radius = t.r;
          var alpha = 1;
          if (m.pulse) {
            var wave = 0.5 + 0.5 * Math.sin(api.elapsed * 5 + t.phase);
            radius = t.r * (0.72 + wave * 0.4);
            alpha = 0.45 + wave * 0.55;
          }
          ctx.globalAlpha = alpha;
          ctx.fillStyle = t.dud ? "#475569" : (m.zone && !m.tide ? api.accent : api.accent);
          ctx.beginPath(); ctx.arc(t.x, t.y, radius * (0.55 + k * 0.45), 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 1;
          if (t.dud) {
            ctx.strokeStyle = "rgba(255,255,255,0.35)";
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(t.x, t.y, radius * 0.5, 0, Math.PI * 2); ctx.stroke();
          }
        }
      }
    }

    function tap(x, y) {
      var i;
      if (kind === "grid") {
        for (i = 0; i < grid.size * grid.size; i++) {
          var r = gridRect(i);
          if (x < r.x || x > r.x + r.w || y < r.y || y > r.y + r.h) continue;
          if (i === grid.lit) {
            score++;
            api.sfx("pick");
            api.burst(x, y, api.accent, 6);
            newLit();
          } else {
            score = Math.max(0, score - 1);
            api.sfx("bad");
            api.shake(4);
          }
          return;
        }
        return;
      }
      if (kind === "blip") {
        if (near(x, y, 2, blip.x, blip.y, blip.r)) {
          score++;
          api.sfx("pick");
          api.burst(blip.x, blip.y, api.accent, 8);
          blip.x = rand(50, W - 50);
          blip.y = rand(90, H - 50);
          blip.r = Math.min(44, blip.r + 1);
          blip.moveIn = Math.max(0.32, 0.7 - score * 0.015);
        }
        return;
      }
      if (kind === "circuit") {
        for (i = 0; i < circuit.nodes.length; i++) {
          var node = circuit.nodes[i];
          if (!near(x, y, 2, node.x, node.y, node.r)) continue;
          if (circuit.seq[circuit.at] === i) {
            score++;
            circuit.at++;
            api.sfx("pick");
            api.burst(node.x, node.y, api.accent, 6);
            if (circuit.at >= circuit.seq.length) {
              score += 3;
              api.sfx("win");
              newSeq();
            }
          } else {
            score = Math.max(0, score - 1);
            circuit.at = 0;
            api.sfx("bad");
            api.shake(6);
          }
          return;
        }
        return;
      }
      if (kind === "boss") {
        bossHit(x, y);
        return;
      }
      for (i = targets.length - 1; i >= 0; i--) {
        var t = targets[i];
        if (near(x, y, 2, t.x, t.y, t.r * (m.pulse ? 1.15 : 0.95))) {
          pop(t, i);
          return;
        }
      }
    }

    return { update: update, draw: draw, tap: tap };
  }

  MODES.forEach(function (mode, index) {
    K.register(K.engineId(mode.name), {
      modes: [mode],
      make: function (api) {
        api.mode = mode;
        api.level = index + 1;
        return make(api);
      },
    });
  });
})();
