/* Breaker family — eleven wall games with different balls, bricks and rules. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, clamp = K.clamp, rr = K.roundRect;

  var MODES = [
    { name: "Brick Wall", kind: "classic", rows: 4, cols: 6, hudA: "Score", hudB: "Lives", pattern: "bricks" },
    { name: "Paddle Pop", kind: "multi", rows: 4, cols: 6, hudA: "Score", hudB: "Balls", pattern: "dots" },
    { name: "Ball Bash", kind: "heavy", rows: 3, cols: 6, hudA: "Score", hudB: "Lives", pattern: "bands" },
    { name: "Smash Grid", kind: "moving", rows: 4, cols: 6, hudA: "Score", hudB: "Lives", pattern: "grid" },
    { name: "Bounce Break", kind: "tilt", rows: 4, cols: 6, hudA: "Score", hudB: "Lives", pattern: "waves" },
    { name: "Wall Cracker", kind: "cracker", rows: 4, cols: 6, hudA: "Score", hudB: "Cracked", pattern: "rain" },
    { name: "Brick Drift", kind: "gravity", rows: 4, cols: 6, hudA: "Score", hudB: "Lives", pattern: "stars" },
    { name: "Bat & Ball", kind: "bat", rows: 4, cols: 6, hudA: "Score", hudB: "Lives", pattern: "beams" },
    { name: "Pillar Pop", kind: "pillars", rows: 1, cols: 6, hudA: "Score", hudB: "Lives", pattern: "scan" },
    { name: "Shard Smash", kind: "shard", rows: 4, cols: 6, hudA: "Score", hudB: "Balls", pattern: "rain" },
    { name: "Final Wall", kind: "boss", rows: 0, cols: 0, hudA: "Score", hudB: "Boss", pattern: "beams" },
  ];

  function make(api) {
    var m = api.mode;
    var kind = m.kind;
    var ctx = api.ctx;
    var padW = kind === "heavy" ? 150 : 118;
    var px = W / 2 - padW / 2;
    var lastPx = px;
    var speed = kind === "heavy" ? 230 : 265;
    var bricks = [];
    var balls = [];
    var lives = 3;
    var score = 0;
    var launched = false;
    var boss = { x: 80, y: 90, w: W - 160, h: 120, hp: 26, max: 26 };
    var cracked = 0;
    var totalBreakable = 0;

    function makeBrick(x, y, w, h, hp, solid) {
      return { x: x, y: y, w: w, h: h, hp: hp, max: hp, solid: !!solid, baseX: x };
    }

    function buildWall() {
      bricks = [];
      totalBreakable = 0;
      if (kind === "boss") return;
      var bw = (W - 32) / (m.cols || 6);
      var bh = kind === "pillars" ? 86 : 24;
      var rows = m.rows || 4;
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < (m.cols || 6); c++) {
          if (kind === "cracker" && (r + c) % 3 === 0) continue;
          var solid = kind === "cracker" && (r + c) % 4 === 0;
          var hp = solid ? Infinity : (r === 0 ? 2 : 1);
          bricks.push(makeBrick(16 + c * bw + 3, 76 + r * (bh + 8), bw - 6, bh, hp, solid));
          if (!solid) totalBreakable++;
        }
      }
    }

    function park() {
      launched = false;
      balls = [{ x: px + padW / 2, y: H - 118, vx: 0, vy: 0, r: kind === "heavy" ? 14 : 9 }];
    }

    function launch() {
      if (launched) return;
      launched = true;
      var count = kind === "multi" ? 3 : 1;
      balls = [];
      for (var i = 0; i < count; i++) {
        var angle = -Math.PI / 2 + rand(-0.55, 0.55);
        balls.push({
          x: px + padW / 2, y: H - 118,
          vx: Math.cos(angle) * speed + (i - (count - 1) / 2) * 60,
          vy: Math.sin(angle) * speed,
          r: 9,
        });
      }
      api.sfx("pick");
    }

    function loseBall() {
      lives--;
      api.sfx("bad");
      api.shake(9);
      api.haptic(24);
      if (lives <= 0) { api.finish(score); return; }
      park();
    }

    function step(dt) {
      if (!launched) return;
      for (var b = balls.length - 1; b >= 0; b--) {
        var ball = balls[b];
        if (kind === "gravity") ball.vy += 260 * dt;
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;

        if (ball.x < ball.r + 10) { ball.x = ball.r + 10; ball.vx = Math.abs(ball.vx); api.sfx("pick"); }
        if (ball.x > W - ball.r - 10) { ball.x = W - ball.r - 10; ball.vx = -Math.abs(ball.vx); api.sfx("pick"); }
        if (ball.y < ball.r + 10) { ball.y = ball.r + 10; ball.vy = Math.abs(ball.vy); api.sfx("pick"); }

        var paddleHit = ball.vy > 0 && ball.y > H - 76 && ball.y < H - 44 &&
          Math.abs(ball.x - (px + padW / 2)) < padW / 2 + 10;
        if (paddleHit) {
          ball.y = H - 76;
          var offset = clamp((ball.x - (px + padW / 2)) / (padW / 2), -1, 1);
          if (kind === "tilt" || kind === "bat") offset += clamp((px - lastPx) * 0.06, -0.5, 0.5);
          offset = clamp(offset, -1, 1);
          ball.vx = offset * speed * 0.9;
          ball.vy = -Math.sqrt(Math.max(speed * speed - ball.vx * ball.vx, 90));
          api.sfx("pick");
          api.haptic(5);
        }

        if (kind === "boss") {
          if (ball.x > boss.x && ball.x < boss.x + boss.w && ball.y > boss.y && ball.y < boss.y + boss.h) {
            boss.hp--;
            score += 8;
            ball.vy = -Math.abs(ball.vy);
            api.sfx("good");
            api.burst(ball.x, ball.y, api.accent, 5);
            if (boss.hp <= 0) { api.finish(score + 100); return; }
          }
        }

        for (var i = bricks.length - 1; i >= 0; i--) {
          var br = bricks[i];
          if (ball.x < br.x || ball.x > br.x + br.w || ball.y < br.y || ball.y > br.y + br.h) continue;
          var gapX = Math.min(ball.x - br.x, br.x + br.w - ball.x);
          var gapY = Math.min(ball.y - br.y, br.y + br.h - ball.y);
          if (kind !== "heavy") {
            if (gapX < gapY) ball.vx *= -1; else ball.vy *= -1;
          }
          if (!br.solid) {
            br.hp--;
            if (br.hp <= 0) {
              bricks.splice(i, 1);
              score += 10;
              api.burst(ball.x, ball.y, api.accent, 5);
              if (kind === "cracker") cracked++;
              if (kind === "shard" && balls.length < 5) {
                balls.push({ x: ball.x, y: ball.y, vx: -ball.vx * 0.8, vy: ball.vy, r: 7 });
              }
            }
          }
          break;
        }

        if (ball.y > H + 30) {
          balls.splice(b, 1);
          if (!balls.length) { loseBall(); return; }
        }
      }

      if (kind === "boss") {
        if (boss.hp <= 0) { api.finish(score + 100); return; }
      } else if (!bricks.filter(function (br) { return !br.solid; }).length) {
        if (kind === "cracker") { api.finish(score + 60); return; }
        score += 80;
        buildWall();
        park();
        api.sfx("win");
      }
    }

    buildWall();
    park();

    function update(dt) {
      lastPx = px;
      if (api.keys.ArrowLeft || api.keys.KeyA) px = clamp(px - 420 * dt, 8, W - padW - 8);
      if (api.keys.ArrowRight || api.keys.KeyD) px = clamp(px + 420 * dt, 8, W - padW - 8);
      if (!launched) {
        balls[0].x = px + padW / 2;
        balls[0].y = H - 118;
      }
      if (kind === "moving") {
        for (var i = 0; i < bricks.length; i++) {
          bricks[i].x = bricks[i].baseX + Math.sin(api.elapsed * 1.2 + bricks[i].y * 0.02) * 26;
        }
      }
      step(dt / 2);
      if (api.ended) return;
      step(dt / 2);
      if (api.ended) return;
      api.hud(score, kind === "boss" ? boss.hp + " / " + boss.max : lives + " lives");
    }

    function draw() {
      api.bg();
      var i;
      for (i = 0; i < bricks.length; i++) {
        var br = bricks[i];
        ctx.fillStyle = br.solid ? "rgba(148,163,184,0.28)" : br.hp > 1 ? "rgba(244,114,182,0.9)" : "rgba(244,114,182,0.55)";
        rr(ctx, br.x, br.y, br.w, br.h, 5); ctx.fill();
        if (br.solid) {
          ctx.strokeStyle = "rgba(255,255,255,0.15)";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
      if (kind === "boss") {
        ctx.fillStyle = api.accent;
        rr(ctx, boss.x, boss.y, boss.w, boss.h, 16); ctx.fill();
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        rr(ctx, boss.x + 16, boss.y + boss.h - 28, boss.w - 32, 12, 6); ctx.fill();
        ctx.fillStyle = "#f8fafc";
        rr(ctx, boss.x + 16, boss.y + boss.h - 28, (boss.w - 32) * (boss.hp / boss.max), 12, 6); ctx.fill();
        api.text("FINAL WALL", W / 2, boss.y + 40, 24, "rgba(0,0,0,0.55)");
      }
      ctx.fillStyle = "#f8fafc";
      rr(ctx, px, H - 62, padW, 14, 7); ctx.fill();
      if (kind === "tilt" || kind === "bat") {
        ctx.fillStyle = api.accent;
        rr(ctx, px + 8, H - 62, padW - 16, 6, 3); ctx.fill();
      }
      for (i = 0; i < balls.length; i++) {
        ctx.fillStyle = api.accent;
        ctx.beginPath(); ctx.arc(balls[i].x, balls[i].y, balls[i].r, 0, Math.PI * 2); ctx.fill();
      }
      if (!launched) api.text("TAP TO SERVE", W / 2, H - 150, 22, "rgba(255,255,255,0.5)");
    }

    function move(x) { px = clamp(x - padW / 2, 8, W - padW - 8); }

    return {
      update: update,
      draw: draw,
      move: move,
      tap: launch,
      key: function (code) {
        if (code === "Space" || code === "Enter") launch();
      },
      swipe: function (dx) { px = clamp(px + dx * 46, 8, W - padW - 8); },
    };
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
