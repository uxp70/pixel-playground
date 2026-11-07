/* Atlas engines 1–10: timing, tether, balance, juggling and the first action games. */
(function () {
  "use strict";
  var A = window.PP_ATLAS;
  var W = A.W, H = A.H;
  var clamp = A.clamp, near = A.near, rr = A.rr;
  var TAU = Math.PI * 2;

  /* 1. Needlepoint -------------------------------------------------------- */
  A.register("needlepoint", function (api) {
    var S = A.begin(api);
    var x = W / 2, dir = 1, target = 300, width = 70, cooldown = 0, hit = 0;
    function reset() {
      target = S.rand(100, W - 100);
      width = Math.max(28, 72 - S.score * 1.4);
      cooldown = 0.22;
    }
    reset();
    return {
      update: function (dt) {
        if (!S.update(dt)) return;
        hit = Math.max(0, hit - dt);
        if (cooldown > 0) { cooldown -= dt; return; }
        x += dir * (150 + S.score * 4) * S.speed * dt;
        if (x < 60) { x = 60; dir = 1; }
        if (x > W - 60) { x = W - 60; dir = -1; }
      },
      draw: function () {
        S.frame(function () {
          var ctx = api.ctx;
          ctx.fillStyle = "rgba(255,255,255,0.08)";
          rr(ctx, 58, 300, W - 116, 44, 22); ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,0.13)";
          ctx.fillRect(70, 318, W - 140, 8);
          ctx.fillStyle = api.accent;
          rr(ctx, target - width / 2, 296, width, 52, 16); ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,0.92)";
          ctx.fillRect(x - 4, 272, 8, 100);
          ctx.beginPath(); ctx.arc(x, 272, 10, 0, TAU); ctx.fill();
          api.text("STOP", W / 2, 388, 21, "rgba(255,255,255,0.48)");
          if (hit > 0) api.text("+1", x, 235, 26, api.accent);
        });
      },
      tap: function (px, py) {
        if (!S.input(px, py)) return;
        if (cooldown > 0) return;
        if (Math.abs(x - target) <= width / 2) {
          hit = 0.5; S.add(1); S.spark(x, 300, api.accent, 9);
          api.sfx("good"); reset();
        } else {
          S.fail(1); reset();
        }
      },
    };
  });

  /* 2. Pulse Ring --------------------------------------------------------- */
  A.register("pulse-ring", function (api) {
    var S = A.begin(api);
    var radius = 240, target = 135, tolerance = 13, result = 0;
    function next() {
      target = S.rand(74, 175);
      tolerance = Math.max(8, 15 - S.score * 0.2);
      radius = 238;
      result = 0;
    }
    next();
    return {
      update: function (dt) {
        if (!S.update(dt)) return;
        radius -= (92 + S.score * 2.2) * S.speed * dt;
        if (radius < 34) {
          S.fail(1);
          next();
        }
      },
      draw: function () {
        S.frame(function () {
          var ctx = api.ctx;
          ctx.strokeStyle = "rgba(255,255,255,0.18)";
          ctx.lineWidth = 2; ctx.setLineDash([6, 9]);
          ctx.beginPath(); ctx.arc(W / 2, H / 2, target, 0, TAU); ctx.stroke();
          ctx.setLineDash([]);
          ctx.strokeStyle = api.accent;
          ctx.lineWidth = 5;
          ctx.beginPath(); ctx.arc(W / 2, H / 2, radius, 0, TAU); ctx.stroke();
          ctx.fillStyle = "rgba(255,255,255,0.9)";
          ctx.beginPath(); ctx.arc(W / 2, H / 2, 7, 0, TAU); ctx.fill();
          if (result > 0) api.text(result, W / 2, H / 2 - 52, 28, api.accent);
        });
      },
      tap: function (px, py) {
        if (!S.input(px, py)) return;
        if (Math.abs(radius - target) <= tolerance) {
          result = "+2"; S.add(2); S.spark(W / 2, H / 2, api.accent, 10);
          api.sfx("good"); next();
        } else {
          S.fail(1); result = "MISS"; next();
        }
      },
    };
  });

  /* 3. Holdfast ----------------------------------------------------------- */
  A.register("holdfast", function (api) {
    var S = A.begin(api);
    var meter = 0, target = 0.62, width = 0.17, holding = false, result = 0;
    function next() {
      target = S.rand(0.35, 0.82);
      width = Math.max(0.08, 0.2 - S.score * 0.004);
      meter = 0;
    }
    next();
    return {
      update: function (dt) {
        if (!S.update(dt)) return;
        if (holding) meter = Math.min(1, meter + dt * 0.48 * S.speed);
        result = Math.max(0, result - dt);
      },
      draw: function () {
        S.frame(function () {
          var ctx = api.ctx;
          var x = 150, y = 150, w = 300, h = 300;
          ctx.fillStyle = "rgba(255,255,255,0.07)";
          rr(ctx, x, y, w, h, 26); ctx.fill();
          var bandY = y + h - (target + width) * h;
          ctx.fillStyle = "rgba(255,255,255,0.16)";
          ctx.fillRect(x + 22, bandY, w - 44, width * h);
          ctx.fillStyle = api.accent;
          ctx.fillRect(x + 22, y + h - meter * h, w - 44, 8);
          ctx.strokeStyle = "rgba(255,255,255,0.8)";
          ctx.lineWidth = 3;
          ctx.strokeRect(x + 22, bandY, w - 44, width * h);
          api.text(holding ? "RELEASE" : "HOLD", W / 2, 92, 24, "rgba(255,255,255,0.62)");
          if (result > 0) api.text("NICE", W / 2, 120, 24, api.accent);
        });
      },
      down: function (px, py) {
        if (!S.input(px, py)) return;
        holding = true;
      },
      tap: function (px, py) {
        if (!S.input(px, py)) return;
        holding = false;
        if (Math.abs(meter - target) <= width / 2) {
          result = 0.7; S.add(1); S.spark(W / 2, 430, api.accent, 9);
          api.sfx("good"); next();
        } else {
          S.fail(1); next();
        }
      },
      swipe: function () {
        holding = false;
      },
    };
  });

  /* 4. Tetherball --------------------------------------------------------- */
  A.register("tetherball", function (api) {
    var S = A.begin(api);
    var ball = { x: W / 2, y: H / 2 };
    var ring = { x: W / 2, y: H / 2, r: 92 };
    var tension = 0, scoreClock = 0, lossClock = 0;
    return {
      update: function (dt) {
        if (!S.update(dt)) return;
        var t = S.elapsed * S.speed;
        ring.x = W / 2 + Math.sin(t * 0.9) * 180;
        ring.y = H / 2 + Math.cos(t * 1.25) * 150;
        var targetX = S.pointer.x, targetY = S.pointer.y;
        ball.x += (targetX - ball.x) * Math.min(1, dt * 12);
        ball.y += (targetY - ball.y) * Math.min(1, dt * 12);
        var d = A.dist(ball.x, ball.y, ring.x, ring.y);
        var inside = d < ring.r - 10;
        if (inside) {
          tension = Math.max(0, tension - dt * 1.8);
          lossClock = 0;
          scoreClock += dt;
          if (scoreClock > 1.1) {
            scoreClock = 0; S.add(1); S.spark(ball.x, ball.y, api.accent, 5);
          }
        } else {
          tension = Math.min(1, tension + dt * 0.45);
          lossClock += dt;
          if (lossClock > 2.2) {
            lossClock = 0; S.fail(1); ball.x = W / 2; ball.y = H / 2;
          }
        }
      },
      draw: function () {
        S.frame(function () {
          var ctx = api.ctx;
          ctx.strokeStyle = "rgba(255,255,255,0.2)";
          ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(ring.x, ring.y, ring.r, 0, TAU); ctx.stroke();
          ctx.strokeStyle = api.accent;
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(W / 2, H / 2); ctx.lineTo(ball.x, ball.y); ctx.stroke();
          ctx.fillStyle = "rgba(255,255,255,0.16)";
          ctx.beginPath(); ctx.arc(W / 2, H / 2, 18, 0, TAU); ctx.fill();
          ctx.fillStyle = api.accent;
          ctx.beginPath(); ctx.arc(ball.x, ball.y, 18, 0, TAU); ctx.fill();
          ctx.fillStyle = "rgba(0,0,0,0.55)";
          ctx.fillRect(40, 42, 200, 12);
          ctx.fillStyle = tension > 0.65 ? "#f87171" : api.accent;
          ctx.fillRect(40, 42, 200 * (1 - tension), 12);
          api.text("TENSION", 140, 72, 15, "rgba(255,255,255,0.42)");
        });
      },
      down: function (px, py) { S.input(px, py); },
      move: function (px, py) { S.input(px, py); },
      tap: function (px, py) { S.input(px, py); },
    };
  });

  /* 5. Seesaw ------------------------------------------------------------- */
  A.register("seesaw", function (api) {
    var S = A.begin(api);
    var angle = 0, targetAngle = 0, ballX = W / 2, vx = 0, clock = 0, gust = 0;
    return {
      update: function (dt) {
        if (!S.update(dt)) return;
        angle += (targetAngle - angle) * Math.min(1, dt * 5);
        targetAngle *= Math.pow(0.2, dt);
        vx += Math.sin(angle) * 240 * S.speed * dt;
        vx *= Math.pow(0.992, dt * 60);
        ballX += vx * dt;
        gust -= dt;
        if (gust <= 0) {
          gust = S.rand(1.5, 3.2);
          vx += S.rand(-22, 22);
        }
        if (ballX < 64 || ballX > W - 64) {
          S.fail(1); ballX = W / 2; vx = 0; angle = 0; targetAngle = 0;
        }
        clock += dt;
        if (clock > 2.2) {
          clock = 0; S.add(1); S.spark(W / 2, 340, api.accent, 4);
        }
      },
      draw: function () {
        S.frame(function () {
          var ctx = api.ctx;
          ctx.save();
          ctx.translate(W / 2, 360); ctx.rotate(angle);
          ctx.fillStyle = "rgba(255,255,255,0.16)";
          rr(ctx, -260, -14, 520, 28, 14); ctx.fill();
          ctx.fillStyle = api.accent;
          ctx.beginPath(); ctx.arc(ballX - W / 2, -28, 20, 0, TAU); ctx.fill();
          ctx.restore();
          ctx.fillStyle = "rgba(255,255,255,0.08)";
          ctx.beginPath(); ctx.moveTo(255, 390); ctx.lineTo(345, 390); ctx.lineTo(300, 455); ctx.closePath(); ctx.fill();
          api.text("TAP LEFT / RIGHT", W / 2, 520, 18, "rgba(255,255,255,0.46)");
        });
      },
      tap: function (px, py) {
        if (!S.input(px, py)) return;
        targetAngle = px < W / 2 ? -0.22 : 0.22;
      },
      key: function (code) {
        var d = S.dir(code);
        if (d) targetAngle = d * 0.22;
      },
    };
  });

  /* 6. Juggle ------------------------------------------------------------- */
  A.register("juggle", function (api) {
    var S = A.begin(api);
    var balls = [];
    for (var i = 0; i < 3; i++) {
      balls.push({ x: 180 + i * 120, y: 250 + i * 20, vx: (i - 1) * 70, vy: -160 - i * 30, r: 21 });
    }
    var hit = 0;
    return {
      update: function (dt) {
        if (!S.update(dt)) return;
        hit = Math.max(0, hit - dt);
        for (var i = 0; i < balls.length; i++) {
          var b = balls[i];
          b.vy += 470 * dt;
          b.x += b.vx * dt; b.y += b.vy * dt;
          if (b.x < b.r + 30) { b.x = b.r + 30; b.vx = Math.abs(b.vx); }
          if (b.x > W - b.r - 30) { b.x = W - b.r - 30; b.vx = -Math.abs(b.vx); }
          if (b.y > H - 45) {
            S.fail(1);
            b.y = 180; b.x = S.rand(100, W - 100); b.vy = -280; b.vx = S.rand(-80, 80);
          }
        }
      },
      draw: function () {
        S.frame(function () {
          var ctx = api.ctx;
          ctx.fillStyle = "rgba(255,255,255,0.08)";
          ctx.fillRect(24, H - 42, W - 48, 10);
          balls.forEach(function (b, index) {
            ctx.fillStyle = index === 0 ? api.accent : "rgba(255,255,255,0.78)";
            ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
            ctx.strokeStyle = "rgba(0,0,0,0.24)"; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(b.x - 6, b.y - 7, b.r * 0.35, 0, TAU); ctx.stroke();
          });
          api.text("KEEP THEM UP", W / 2, 52, 18, "rgba(255,255,255,0.43)");
          if (hit > 0) api.text("BOUNCE", W / 2, 86, 22, api.accent);
        });
      },
      tap: function (px, py) {
        var p = S.input(px, py);
        if (!p) return;
        var best = null, bestD = 999;
        balls.forEach(function (b) {
          var d = A.dist(p.x, p.y, b.x, b.y);
          if (d < b.r + 24 && d < bestD) { best = b; bestD = d; }
        });
        if (best) {
          best.vy = -340; best.y = Math.min(best.y, H - 90);
          hit = 0.28; S.add(1); S.spark(best.x, best.y, api.accent, 5);
        } else {
          S.fail(1);
        }
      },
    };
  });

  /* 7. Skycatch ----------------------------------------------------------- */
  A.register("skycatch", function (api) {
    var S = A.begin(api);
    var basket = { x: W / 2, w: 92, y: H - 60 };
    var items = [], spawn = 0.4;
    function drop() {
      var bomb = S.rand() < 0.25;
      items.push({
        x: S.rand(50, W - 50), y: -30, vy: S.rand(150, 210) * S.speed,
        r: bomb ? 14 : 11, bomb: bomb,
      });
    }
    return {
      update: function (dt) {
        if (!S.update(dt)) return;
        spawn -= dt;
        if (spawn <= 0) { drop(); spawn = Math.max(0.2, 0.62 - S.score * 0.012); }
        for (var i = items.length - 1; i >= 0; i--) {
          var it = items[i];
          it.y += it.vy * dt;
          if (it.y > basket.y - 12 && it.y < basket.y + 34 &&
              Math.abs(it.x - basket.x) < basket.w / 2 + it.r) {
            items.splice(i, 1);
            if (it.bomb) S.fail(1);
            else { S.add(1); S.spark(it.x, it.y, api.accent, 7); api.sfx("pick"); }
            continue;
          }
          if (it.y > H + 30) items.splice(i, 1);
        }
      },
      draw: function () {
        S.frame(function () {
          var ctx = api.ctx;
          ctx.fillStyle = "rgba(255,255,255,0.1)";
          rr(ctx, basket.x - basket.w / 2, basket.y, basket.w, 18, 9); ctx.fill();
          ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(basket.x - basket.w / 2, basket.y); ctx.lineTo(basket.x - basket.w / 2 + 18, basket.y + 42); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(basket.x + basket.w / 2, basket.y); ctx.lineTo(basket.x + basket.w / 2 - 18, basket.y + 42); ctx.stroke();
          items.forEach(function (it) {
            ctx.fillStyle = it.bomb ? "#475569" : api.accent;
            ctx.beginPath(); ctx.arc(it.x, it.y, it.r, 0, TAU); ctx.fill();
            if (it.bomb) {
              ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 2;
              ctx.beginPath(); ctx.arc(it.x, it.y, it.r * 0.45, 0, TAU); ctx.stroke();
            }
          });
          api.text("CATCH THE LIGHT", W / 2, 54, 17, "rgba(255,255,255,0.4)");
        });
      },
      down: function (px) {
        var p = S.input(px, H - 60);
        if (p) basket.x = clamp(p.x, basket.w / 2 + 20, W - basket.w / 2 - 20);
      },
      move: function (px) {
        var p = S.input(px, H - 60);
        if (p) basket.x = clamp(p.x, basket.w / 2 + 20, W - basket.w / 2 - 20);
      },
      tap: function (px) {
        var p = S.input(px, H - 60);
        if (p) basket.x = clamp(p.x, basket.w / 2 + 20, W - basket.w / 2 - 20);
      },
    };
  });

  /* 8. Shardstorm --------------------------------------------------------- */
  A.register("shardstorm", function (api) {
    var S = A.begin(api);
    var player = { x: W / 2, y: H - 100, r: 13 };
    var shards = [], motes = [], shardClock = 0, moteClock = 0;
    return {
      update: function (dt) {
        if (!S.update(dt)) return;
        shardClock -= dt; moteClock -= dt;
        if (shardClock <= 0) {
          shardClock = Math.max(0.18, 0.48 - S.score * 0.008);
          shards.push({ x: S.rand(30, W - 30), y: -24, vy: S.rand(180, 300) * S.speed, r: S.rand(8, 16) });
        }
        if (moteClock <= 0) {
          moteClock = S.rand(1.1, 2.2);
          motes.push({ x: S.rand(50, W - 50), y: -20, vy: S.rand(120, 180) * S.speed, r: 9 });
        }
        for (var i = shards.length - 1; i >= 0; i--) {
          var s = shards[i]; s.y += s.vy * dt;
          if (s.y > H + 30) shards.splice(i, 1);
          else if (near(player.x, player.y, player.r, s.x, s.y, s.r)) {
            shards.splice(i, 1); S.fail(1);
            player.x = W / 2; player.y = H - 100;
          }
        }
        for (var j = motes.length - 1; j >= 0; j--) {
          var m = motes[j]; m.y += m.vy * dt;
          if (m.y > H + 20) motes.splice(j, 1);
          else if (near(player.x, player.y, player.r + 6, m.x, m.y, m.r)) {
            motes.splice(j, 1); S.add(1); S.spark(m.x, m.y, api.accent, 6); api.sfx("pick");
          }
        }
      },
      draw: function () {
        S.frame(function () {
          var ctx = api.ctx;
          shards.forEach(function (s) {
            ctx.fillStyle = "rgba(248,113,113,0.76)";
            ctx.beginPath(); ctx.moveTo(s.x, s.y - s.r); ctx.lineTo(s.x + s.r, s.y); ctx.lineTo(s.x, s.y + s.r); ctx.lineTo(s.x - s.r, s.y); ctx.closePath(); ctx.fill();
          });
          motes.forEach(function (m) {
            ctx.fillStyle = api.accent;
            ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, TAU); ctx.fill();
          });
          ctx.fillStyle = api.accent;
          ctx.beginPath(); ctx.arc(player.x, player.y, player.r, 0, TAU); ctx.fill();
          ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(player.x, player.y, player.r + 13, 0, TAU); ctx.stroke();
        });
      },
      down: function (px, py) {
        var p = S.input(px, py); if (!p) return;
        player.x = clamp(p.x, 20, W - 20); player.y = clamp(p.y, 80, H - 24);
      },
      move: function (px, py) {
        var p = S.input(px, py); if (!p) return;
        player.x = clamp(p.x, 20, W - 20); player.y = clamp(p.y, 80, H - 24);
      },
      tap: function (px, py) {
        var p = S.input(px, py); if (!p) return;
        player.x = clamp(p.x, 20, W - 20); player.y = clamp(p.y, 80, H - 24);
      },
    };
  });

  /* 9. Lanechange --------------------------------------------------------- */
  A.register("lanechange", function (api) {
    var S = A.begin(api);
    var lanes = 4, lane = 1, cars = [], fuels = [], spawn = 0.3;
    var playerY = H - 92, laneX = function (i) { return 90 + i * 140; };
    function spawnCar() {
      var l = Math.floor(S.rand(0, lanes));
      var bad = false;
      cars.forEach(function (c) { if (c.lane === l && c.y < 100) bad = true; });
      if (bad) l = (l + 1) % lanes;
      cars.push({ lane: l, y: -80, speed: S.rand(120, 190) * S.speed });
      if (S.rand() < 0.28) fuels.push({ lane: (l + 2) % lanes, y: S.rand(-180, -80) });
    }
    return {
      update: function (dt) {
        if (!S.update(dt)) return;
        spawn -= dt;
        if (spawn <= 0) { spawnCar(); spawn = Math.max(0.22, 0.56 - S.score * 0.012); }
        for (var i = cars.length - 1; i >= 0; i--) {
          var c = cars[i]; c.y += c.speed * dt;
          if (c.y > H + 70) { cars.splice(i, 1); continue; }
          if (c.lane === lane && Math.abs(c.y - playerY) < 48) {
            cars.splice(i, 1); S.fail(1); lane = 1;
            cars.length = 0; fuels.length = 0;
            break;
          }
        }
        for (var j = fuels.length - 1; j >= 0; j--) {
          var f = fuels[j]; f.y += 135 * S.speed * dt;
          if (f.y > H + 20) { fuels.splice(j, 1); continue; }
          if (f.lane === lane && Math.abs(f.y - playerY) < 40) {
            fuels.splice(j, 1); S.add(1); S.spark(laneX(lane), playerY, api.accent, 6);
          }
        }
      },
      draw: function () {
        S.frame(function () {
          var ctx = api.ctx;
          for (var i = 0; i < lanes; i++) {
            var x = laneX(i);
            ctx.fillStyle = i === lane ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.025)";
            ctx.fillRect(x - 62, 0, 124, H);
            ctx.strokeStyle = "rgba(255,255,255,0.18)";
            ctx.setLineDash([24, 20]); ctx.beginPath(); ctx.moveTo(x + 65, 0); ctx.lineTo(x + 65, H); ctx.stroke();
          }
          ctx.setLineDash([]);
          cars.forEach(function (c) {
            ctx.fillStyle = "#f87171";
            rr(ctx, laneX(c.lane) - 28, c.y - 38, 56, 76, 13); ctx.fill();
          });
          fuels.forEach(function (f) {
            ctx.fillStyle = api.accent;
            ctx.beginPath(); ctx.arc(laneX(f.lane), f.y, 12, 0, TAU); ctx.fill();
          });
          ctx.fillStyle = "#e2e8f0";
          rr(ctx, laneX(lane) - 25, playerY - 40, 50, 80, 13); ctx.fill();
          ctx.fillStyle = api.accent;
          ctx.fillRect(laneX(lane) - 19, playerY + 20, 12, 6);
          ctx.fillRect(laneX(lane) + 7, playerY + 20, 12, 6);
        });
      },
      tap: function (px, py) {
        var p = S.input(px, py); if (!p) return;
        lane = clamp(lane + (p.x < W / 2 ? -1 : 1), 0, lanes - 1);
        api.sfx("pick");
      },
      key: function (code) {
        var d = S.dir(code);
        if (d) { lane = clamp(lane + d, 0, lanes - 1); api.sfx("pick"); }
      },
      swipe: function (dx) {
        if (dx) lane = clamp(lane + dx, 0, lanes - 1);
      },
    };
  });

  /* 10. Flap -------------------------------------------------------------- */
  A.register("flap", function (api) {
    var S = A.begin(api);
    var bird = { y: H / 2, vy: 0, x: 150, r: 15 };
    var walls = [], spawn = 1.2, passed = 0;
    function reset() {
      bird.y = H / 2; bird.vy = 0; walls = []; spawn = 1.1; passed = 0;
    }
    return {
      update: function (dt) {
        if (!S.update(dt)) return;
        bird.vy += 780 * dt;
        bird.y += bird.vy * dt;
        spawn -= dt;
        if (spawn <= 0) {
          spawn = Math.max(0.82, 1.46 - S.score * 0.018);
          var gap = Math.max(132, 190 - S.score * 2.2);
          walls.push({ x: W + 80, gap: S.rand(110, H - 110), gapH: gap, scored: false });
        }
        for (var i = walls.length - 1; i >= 0; i--) {
          var w = walls[i];
          w.x -= (145 + S.score * 2.2) * S.speed * dt;
          if (!w.scored && w.x + 42 < bird.x) {
            w.scored = true; passed++; S.add(1); S.spark(bird.x, bird.y, api.accent, 5);
          }
          if (w.x < -100) { walls.splice(i, 1); continue; }
          if (bird.x + bird.r > w.x && bird.x - bird.r < w.x + 74) {
            if (bird.y - bird.r < w.gap - w.gapH / 2 || bird.y + bird.r > w.gap + w.gapH / 2) {
              S.fail(1); reset(); return;
            }
          }
        }
        if (bird.y < 20 || bird.y > H - 20) { S.fail(1); reset(); }
      },
      draw: function () {
        S.frame(function () {
          var ctx = api.ctx;
          walls.forEach(function (w) {
            ctx.fillStyle = "rgba(34,211,238,0.55)";
            ctx.fillRect(w.x, 0, 74, w.gap - w.gapH / 2);
            ctx.fillRect(w.x, w.gap + w.gapH / 2, 74, H);
            ctx.fillStyle = "rgba(255,255,255,0.12)";
            ctx.fillRect(w.x + 8, 0, 8, w.gap - w.gapH / 2);
            ctx.fillRect(w.x + 8, w.gap + w.gapH / 2, 8, H);
          });
          ctx.fillStyle = api.accent;
          ctx.beginPath(); ctx.arc(bird.x, bird.y, bird.r, 0, TAU); ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,0.9)";
          ctx.beginPath(); ctx.arc(bird.x + 5, bird.y - 4, 4, 0, TAU); ctx.fill();
          api.text("" + passed, W / 2, 50, 22, "rgba(255,255,255,0.45)");
        });
      },
      tap: function (px, py) {
        if (!S.input(px, py)) return;
        bird.vy = -300; api.sfx("pick");
      },
      key: function (code) {
        if (code === "Space" || code === "ArrowUp" || code === "KeyW") bird.vy = -300;
      },
    };
  });
})();
