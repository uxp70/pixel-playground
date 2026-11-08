/* Catch family — eleven games about what falls and what you do with it. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, clamp = K.clamp, near = K.near, rr = K.roundRect;

  var MODES = [
    { name: "Star Basket", kind: "items", time: 30, bomb: 0.12, hudA: "Caught", hudB: "Time", pattern: "stars" },
    { name: "Fruit Fall", kind: "items", time: 30, bomb: 0, color: true, hudA: "Matching", hudB: "Time", pattern: "dots" },
    { name: "Coin Catch", kind: "items", time: 30, bomb: 0.08, pegs: true, hudA: "Coins", hudB: "Time", pattern: "grid" },
    { name: "Orb Scoop", kind: "items", time: 30, bomb: 0.1, split: true, hudA: "Orbs", hudB: "Time", pattern: "bands" },
    { name: "Drop Harvest", kind: "items", time: 30, bomb: 0.1, wind: true, hudA: "Harvest", hudB: "Time", pattern: "waves" },
    { name: "Gem Grab", kind: "items", time: 25, bomb: 0, speed: 230, narrow: true, combo: true, hudA: "Gems", hudB: "Time", pattern: "beams" },
    { name: "Bubble Net", kind: "items", time: 30, bomb: 0.06, swing: true, hudA: "Bubbles", hudB: "Time", pattern: "rain" },
    { name: "Seed Catch", kind: "items", time: 30, bomb: 0.1, shrink: true, hudA: "Seeds", hudB: "Time", pattern: "dots" },
    { name: "Moon Scoop", kind: "items", time: 30, bomb: 0.08, moon: true, hudA: "Scooped", hudB: "Time", pattern: "stars" },
    { name: "Loot Fall", kind: "items", time: 30, bomb: 0.22, reveal: true, hudA: "Loot", hudB: "Time", pattern: "bricks" },
    { name: "Final Haul", kind: "boss", time: 30, bomb: 0.2, hudA: "Crate", hudB: "Time", pattern: "scan" },
  ];

  var COLORS = ["#f87171", "#4ade80", "#60a5fa", "#fbbf24"];

  function make(api) {
    var m = api.mode;
    var kind = m.kind;
    var ctx = api.ctx;
    var bx = W / 2;
    var bw = m.narrow ? 72 : 96;
    var score = 0;
    var clock = 0;
    var combo = 0;
    var comboClock = 0;
    var items = [];
    var pegs = [];
    var spawn = 0.4;
    var targetColor = 0;
    var colorClock = 0;
    var boss = { x: W / 2, y: -80, r: 54, vy: 46, hp: 3, caught: 0 };

    function addPegs() {
      for (var i = 0; i < 5; i++) pegs.push({ x: 80 + i * 110, y: 180 + (i % 2) * 110, r: 13 });
    }
    if (m.pegs) addPegs();

    function addItem() {
      var bomb = Math.random() < (m.bomb || 0);
      var color = Math.floor(rand(0, 4));
      items.push({
        x: rand(34, W - 34),
        y: -24,
        r: bomb ? 17 : rand(12, 17),
        vy: (m.moon ? 68 : (m.speed || 150)) * rand(0.82, 1.22),
        bomb: bomb,
        color: color,
        split: m.split,
        bounce: m.moon ? 1 : 0,
        reveal: m.reveal,
        spin: rand(0, Math.PI * 2),
      });
    }

    function catchItem(it, index) {
      if (it.bomb) {
        score = Math.max(0, score - 2);
        combo = 0;
        api.sfx("bad");
        api.shake(9);
        api.haptic(20);
        items.splice(index, 1);
        return;
      }
      var good = true;
      if (m.color && it.color !== targetColor) good = false;
      if (!good) {
        score = Math.max(0, score - 1);
        combo = 0;
        api.sfx("bad");
        api.shake(5);
        items.splice(index, 1);
        return;
      }
      score++;
      if (m.combo) {
        combo++;
        comboClock = 1.4;
        score += Math.min(3, Math.floor(combo / 5));
      }
      if (m.shrink) bw = Math.max(48, bw - 5);
      api.sfx("good");
      api.burst(it.x, it.y, it.bomb ? "#f87171" : COLORS[it.color], 7);
      api.haptic(6);
      items.splice(index, 1);
    }

    function update(dt) {
      clock += dt;
      comboClock = Math.max(0, comboClock - dt);
      if (!comboClock) combo = 0;
      colorClock += dt;
      if (m.color && colorClock > 4.5) { colorClock = 0; targetColor = (targetColor + 1) % 4; }

      if (m.swing) bx = W / 2 + Math.sin(clock * 1.25) * 190;
      else bx = clamp(bx, bw / 2 + 4, W - bw / 2 - 4);

      if (kind === "boss") {
        boss.y += boss.vy * dt;
        if (boss.y > H - 96) {
          if (Math.abs(boss.x - bx) < bw / 2 + boss.r * 0.6) {
            boss.hp--;
            boss.caught++;
            score += 5;
            api.sfx("good");
            api.burst(boss.x, boss.y, api.accent, 12);
            api.haptic(10);
            boss.vy = -150;
            if (boss.hp <= 0) { api.finish(score + 15); return; }
          } else {
            boss.vy = -90;
            api.sfx("bad");
            api.shake(6);
          }
        }
        if (boss.y < -90) { boss.y = -90; boss.vy = Math.abs(boss.vy); }
        spawn -= dt;
        if (spawn <= 0) {
          spawn = 0.55;
          items.push({ x: rand(34, W - 34), y: -24, r: 16, vy: 190 * rand(0.9, 1.2), bomb: true, color: 0, split: false, bounce: 0, spin: 0 });
        }
        for (var bi = items.length - 1; bi >= 0; bi--) {
          var bombItem = items[bi];
          bombItem.y += bombItem.vy * dt;
          if (bombItem.y > H - 82 && bombItem.y < H - 22 && Math.abs(bombItem.x - bx) < bw / 2 + 8) {
            catchItem(bombItem, bi);
          } else if (bombItem.y > H + 30) items.splice(bi, 1);
        }
      } else {
        spawn -= dt;
        if (spawn <= 0) {
          spawn = Math.max(0.22, 0.58 * rand(0.75, 1.25));
          addItem();
        }
        for (var i = items.length - 1; i >= 0; i--) {
          var it = items[i];
          if (m.wind) it.x += Math.sin(clock * 1.4 + it.y * 0.012) * 55 * dt;
          if (m.moon) it.vy += 8 * dt;
          it.y += it.vy * dt;
          it.spin += dt * 2;

          if (m.pegs) {
            for (var p = 0; p < pegs.length; p++) {
              if (near(it.x, it.y, it.r, pegs[p].x, pegs[p].y, pegs[p].r) && it.vy > 0) {
                it.vy = -Math.abs(it.vy) * 0.85;
                it.x += rand(-18, 18);
                api.sfx("pick");
              }
            }
          }

          if (it.split && it.y > H * 0.54) {
            it.split = false;
            for (var s = 0; s < 2; s++) {
              items.push({ x: it.x + (s ? 14 : -14), y: it.y, r: it.r * 0.62, vy: it.vy * 1.05, bomb: false, color: it.color, split: false, spin: 0 });
            }
          }

          if (m.moon && it.y > H - 22 && it.bounce < 2) {
            it.y = H - 22;
            it.vy = -Math.abs(it.vy) * 0.55;
            it.bounce++;
          }

          var inBasket = it.y > H - 82 && it.y < H - 22 && Math.abs(it.x - bx) < bw / 2 + it.r * 0.35;
          if (inBasket) { catchItem(it, i); continue; }
          if (it.y > H + 30) {
            if (!it.bomb) combo = 0;
            items.splice(i, 1);
          }
        }
      }

      api.hud(score, Math.max(0, Math.ceil(m.time - clock)) + "s");
      if (clock >= m.time) api.finish(score);
    }

    function drawItem(it) {
      var revealed = !m.reveal || it.y > H - 230 || it.bomb;
      if (it.bomb && (revealed || !m.reveal)) {
        ctx.fillStyle = "#64748b";
        ctx.beginPath(); ctx.arc(it.x, it.y, it.r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#f87171";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(it.x - 6, it.y - 6); ctx.lineTo(it.x + 6, it.y + 6);
        ctx.moveTo(it.x + 6, it.y - 6); ctx.lineTo(it.x - 6, it.y + 6);
        ctx.stroke();
        return;
      }
      if (!revealed) {
        ctx.fillStyle = "#475569";
        ctx.beginPath(); ctx.arc(it.x, it.y, it.r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.2)";
        ctx.lineWidth = 2;
        ctx.stroke();
        return;
      }
      ctx.fillStyle = COLORS[it.color];
      ctx.beginPath(); ctx.arc(it.x, it.y, it.r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 2;
      ctx.stroke();
      if (m.color && it.color === targetColor) {
        ctx.strokeStyle = "rgba(255,255,255,0.85)";
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(it.x, it.y, it.r + 5, 0, Math.PI * 2); ctx.stroke();
      }
    }

    function draw() {
      api.bg();
      var i;
      if (m.wind) {
        ctx.strokeStyle = "rgba(255,255,255,0.12)";
        ctx.lineWidth = 2;
        for (i = 0; i < 6; i++) {
          var yy = 90 + i * 82;
          ctx.beginPath();
          ctx.moveTo(40, yy);
          ctx.quadraticCurveTo(W / 2, yy + Math.sin(clock + i) * 30, W - 40, yy);
          ctx.stroke();
        }
      }
      if (m.pegs) {
        ctx.fillStyle = "rgba(255,255,255,0.16)";
        for (i = 0; i < pegs.length; i++) {
          ctx.beginPath(); ctx.arc(pegs[i].x, pegs[i].y, pegs[i].r, 0, Math.PI * 2); ctx.fill();
        }
      }
      for (i = 0; i < items.length; i++) drawItem(items[i]);

      if (kind === "boss") {
        ctx.fillStyle = api.accent;
        rr(ctx, boss.x - boss.r, boss.y - boss.r * 0.8, boss.r * 2, boss.r * 1.6, 14);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.5)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(boss.x - boss.r * 0.7, boss.y);
        ctx.lineTo(boss.x + boss.r * 0.7, boss.y);
        ctx.stroke();
        api.text("HITS " + boss.caught, W / 2, 80, 20, "rgba(255,255,255,0.6)");
      }

      ctx.fillStyle = "#f8fafc";
      rr(ctx, bx - bw / 2, H - 78, bw, 52, 12);
      ctx.fill();
      ctx.fillStyle = api.accent;
      rr(ctx, bx - bw / 2 + 6, H - 72, bw - 12, 12, 6);
      ctx.fill();

      if (m.color) {
        ctx.fillStyle = COLORS[targetColor];
        ctx.beginPath(); ctx.arc(W / 2, 58, 13, 0, Math.PI * 2); ctx.fill();
        api.text("CATCH THIS COLOUR", W / 2, 90, 15, "rgba(255,255,255,0.55)");
      }
      if (combo > 1) api.text("x" + combo, W - 46, 58, 20, "rgba(255,255,255,0.55)");
    }

    function move(x) { if (!m.swing) bx = x; }

    return { update: update, draw: draw, move: move };
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
