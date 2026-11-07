/* Atlas engines 11–20: landing, orbit, aim, putt, darts, hoops, cannons, pool, maze, path. */
(function () {
  "use strict";
  var A = window.PP_ATLAS;
  var W = A.W, H = A.H;
  var clamp = A.clamp, near = A.near, rr = A.rr, dist = A.dist;
  var TAU = Math.PI * 2;

  /* 11. Lunar Pad --------------------------------------------------------- */
  A.register("lunar-pad", function (api) {
    var S = A.begin(api);
    var lander = { x: W / 2, y: 90, vx: 0, vy: 0, angle: 0 };
    var pad = { x: W / 2, w: 118, y: H - 52 };
    function reset() {
      lander.x = S.rand(110, W - 110); lander.y = 80;
      lander.vx = S.rand(-24, 24); lander.vy = 0; lander.angle = 0;
      pad.x = S.rand(110, W - 110);
    }
    reset();
    return {
      update: function (dt) {
        if (!S.update(dt)) return;
        var left = S.space[S.key("ArrowLeft")] || S.space[S.key("KeyA")];
        var right = S.space[S.key("ArrowRight")] || S.space[S.key("KeyD")];
        lander.angle += ((right ? 1 : 0) - (left ? 1 : 0)) * 2.2 * dt;
        lander.vy += 105 * dt;
        lander.x += lander.vx * dt;
        lander.y += lander.vy * dt;
        if (lander.x < 22 || lander.x > W - 22) { lander.vx *= -0.6; lander.x = clamp(lander.x, 22, W - 22); }
        if (lander.y > H - 34) {
          var speed = Math.hypot(lander.vx, lander.vy);
          if (Math.abs(lander.x - pad.x) < pad.w / 2 && speed < 160 && Math.abs(lander.angle) < 0.55) {
            S.add(3); S.spark(lander.x, pad.y, api.accent, 12); api.sfx("good"); reset();
          } else {
            S.fail(1); reset();
          }
        }
      },
      draw: function () {
        S.frame(function () {
          var ctx = api.ctx;
          ctx.fillStyle = "rgba(255,255,255,0.08)";
          ctx.fillRect(0, H - 26, W, 26);
          ctx.fillStyle = api.accent;
          rr(ctx, pad.x - pad.w / 2, pad.y, pad.w, 12, 6); ctx.fill();
          ctx.save();
          ctx.translate(lander.x, lander.y); ctx.rotate(lander.angle);
          ctx.fillStyle = "#f8fafc";
          ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(15, 13); ctx.lineTo(-15, 13); ctx.closePath(); ctx.fill();
          ctx.fillStyle = api.accent;
          ctx.fillRect(-9, 13, 18, 4);
          ctx.restore();
          api.text("GENTLE", W / 2, 44, 17, "rgba(255,255,255,0.38)");
        });
      },
      tap: function (px, py) {
        if (!S.input(px, py)) return;
        lander.vx += Math.sin(lander.angle) * 70;
        lander.vy -= Math.cos(lander.angle) * 78;
        api.sfx("pick");
      },
    };
  });

  /* 12. Orbit ------------------------------------------------------------- */
  A.register("orbit", function (api) {
    var S = A.begin(api);
    var angle = 0, orbit = 0, radii = [126, 226];
    var things = [], clock = 0;
    function spawn() {
      var good = S.rand() < 0.72;
      things.push({
        orbit: Math.floor(S.rand(0, 2)),
        angle: S.rand(0, TAU),
        good: good,
        r: good ? 9 : 13,
      });
    }
    for (var i = 0; i < 4; i++) spawn();
    return {
      update: function (dt) {
        if (!S.update(dt)) return;
        angle += 1.55 * S.speed * dt;
        clock -= dt;
        if (clock <= 0) { clock = Math.max(0.32, 0.72 - S.score * 0.01); spawn(); }
        var alive = [];
        for (var i = 0; i < things.length; i++) {
          var t = things[i];
          if (!t) continue;
          t.angle += (t.good ? 0.45 : -0.65) * S.speed * dt;
          var d = Math.abs(((t.angle - angle + Math.PI) % TAU + TAU) % TAU - Math.PI);
          if (t.orbit === orbit && d < 0.18) {
            if (t.good) {
              S.add(1); S.spark(W / 2 + Math.cos(angle) * radii[orbit], H / 2 + Math.sin(angle) * radii[orbit], api.accent, 7);
            } else {
              S.fail(1); things = []; for (var j = 0; j < 4; j++) spawn();
              return;
            }
          } else {
            alive.push(t);
          }
        }
        things = alive;
      },
      draw: function () {
        S.frame(function () {
          var ctx = api.ctx;
          ctx.strokeStyle = "rgba(255,255,255,0.13)"; ctx.lineWidth = 2;
          radii.forEach(function (r) { ctx.beginPath(); ctx.arc(W / 2, H / 2, r, 0, TAU); ctx.stroke(); });
          ctx.fillStyle = "rgba(255,255,255,0.13)";
          ctx.beginPath(); ctx.arc(W / 2, H / 2, 42, 0, TAU); ctx.fill();
          things.forEach(function (t) {
            var x = W / 2 + Math.cos(t.angle) * radii[t.orbit];
            var y = H / 2 + Math.sin(t.angle) * radii[t.orbit];
            ctx.fillStyle = t.good ? api.accent : "rgba(248,113,113,0.9)";
            ctx.beginPath(); ctx.arc(x, y, t.r, 0, TAU); ctx.fill();
          });
          var px = W / 2 + Math.cos(angle) * radii[orbit];
          var py = H / 2 + Math.sin(angle) * radii[orbit];
          ctx.fillStyle = "#fff";
          ctx.beginPath(); ctx.arc(px, py, 14, 0, TAU); ctx.fill();
          ctx.strokeStyle = api.accent; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(px, py, 20, 0, TAU); ctx.stroke();
          api.text("ORBIT " + (orbit + 1), W / 2, H - 48, 16, "rgba(255,255,255,0.4)");
        });
      },
      tap: function (px, py) {
        if (!S.input(px, py)) return;
        orbit = 1 - orbit; api.sfx("pick");
      },
      key: function (code) {
        if (code === "Space" || code === "ArrowUp" || code === "KeyW") orbit = 1 - orbit;
      },
    };
  });

  /* 13. Slingshot --------------------------------------------------------- */
  A.register("slingshot", function (api) {
    var S = A.begin(api);
    var sling = { x: W / 2, y: H - 84 };
    var targets = [], shot = null, drag = null, score = 0;
    function resetTargets() {
      targets = [];
      for (var i = 0; i < 3; i++) {
        targets.push({ x: 130 + i * 170, y: 130 + (i % 2) * 90, r: 22 });
      }
    }
    resetTargets();
    return {
      update: function (dt) {
        if (!S.update(dt)) return;
        if (shot) {
          shot.vy += 300 * dt;
          shot.x += shot.vx * dt; shot.y += shot.vy * dt;
          for (var i = targets.length - 1; i >= 0; i--) {
            var t = targets[i];
            if (near(shot.x, shot.y, 7, t.x, t.y, t.r)) {
              targets.splice(i, 1); S.add(1); S.spark(t.x, t.y, api.accent, 10);
              api.sfx("good");
            }
          }
          if (targets.length === 0) { S.add(2); resetTargets(); }
          if (shot.x < -20 || shot.x > W + 20 || shot.y < -20 || shot.y > H + 20) shot = null;
        }
      },
      draw: function () {
        S.frame(function () {
          var ctx = api.ctx;
          targets.forEach(function (t) {
            ctx.strokeStyle = api.accent; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, TAU); ctx.stroke();
            ctx.fillStyle = "rgba(255,255,255,0.08)";
            ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, TAU); ctx.fill();
            ctx.fillStyle = api.accent;
            ctx.beginPath(); ctx.arc(t.x, t.y, 6, 0, TAU); ctx.fill();
          });
          ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 5;
          ctx.beginPath(); ctx.moveTo(sling.x - 25, sling.y + 24); ctx.lineTo(sling.x, sling.y); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(sling.x + 25, sling.y + 24); ctx.lineTo(sling.x, sling.y); ctx.stroke();
          if (drag && shot === null) {
            ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(sling.x, sling.y); ctx.lineTo(sling.x + drag.x, sling.y + drag.y); ctx.stroke();
          }
          if (shot) {
            ctx.fillStyle = api.accent;
            ctx.beginPath(); ctx.arc(shot.x, shot.y, 8, 0, TAU); ctx.fill();
          } else {
            ctx.fillStyle = "#fff";
            ctx.beginPath(); ctx.arc(sling.x, sling.y, 9, 0, TAU); ctx.fill();
          }
        });
      },
      down: function (px, py) {
        var p = S.input(px, py); if (!p) return;
        if (!shot) drag = { x: p.x - sling.x, y: p.y - sling.y };
      },
      move: function (px, py) {
        var p = S.input(px, py); if (!p || !drag) return;
        drag.x = p.x - sling.x; drag.y = p.y - sling.y;
      },
      release: function () {
        if (!drag || shot) return;
        if (Math.hypot(drag.x, drag.y) < 18) { drag = null; return; }
        shot = { x: sling.x, y: sling.y, vx: -drag.x * 4.2, vy: -drag.y * 4.2 };
        drag = null; api.sfx("pick");
      },
    };
  });

  /* 14. Putt -------------------------------------------------------------- */
  A.register("putt", function (api) {
    var S = A.begin(api);
    var ball = { x: 130, y: 300, vx: 0, vy: 0, r: 9 };
    var hole = { x: W - 120, y: 300, r: 18 };
    var drag = null, still = 0;
    function resetHole() {
      hole.x = S.rand(250, W - 90); hole.y = S.rand(150, H - 90);
      ball.x = 100; ball.y = H / 2; ball.vx = 0; ball.vy = 0; drag = null; still = 0;
    }
    resetHole();
    return {
      update: function (dt) {
        if (!S.update(dt)) return;
        ball.x += ball.vx * dt; ball.y += ball.vy * dt;
        ball.vx *= Math.pow(0.986, dt * 60); ball.vy *= Math.pow(0.986, dt * 60);
        var speed = Math.hypot(ball.vx, ball.vy);
        if (speed < 4) { ball.vx = 0; ball.vy = 0; }
        if (ball.x < 38 || ball.x > W - 38 || ball.y < 100 || ball.y > H - 38) {
          S.fail(1); resetHole(); return;
        }
        if (speed > 0 && dist(ball.x, ball.y, hole.x, hole.y) < hole.r && speed < 190) {
          S.add(1); S.spark(hole.x, hole.y, api.accent, 10); api.sfx("good"); resetHole(); return;
        }
        if (speed === 0) still += dt; else still = 0;
      },
      draw: function () {
        S.frame(function () {
          var ctx = api.ctx;
          ctx.fillStyle = "rgba(74,222,128,0.11)";
          rr(ctx, 34, 92, W - 68, H - 124, 26); ctx.fill();
          ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.lineWidth = 2;
          ctx.strokeRect(34, 92, W - 68, H - 124);
          ctx.fillStyle = "#05070d";
          ctx.beginPath(); ctx.arc(hole.x, hole.y, hole.r, 0, TAU); ctx.fill();
          ctx.strokeStyle = "rgba(255,255,255,0.4)";
          ctx.beginPath(); ctx.arc(hole.x, hole.y, hole.r, 0, TAU); ctx.stroke();
          if (drag) {
            ctx.strokeStyle = "rgba(255,255,255,0.45)"; ctx.lineWidth = 2;
            ctx.setLineDash([5, 6]);
            ctx.beginPath(); ctx.moveTo(ball.x, ball.y); ctx.lineTo(ball.x + drag.x, ball.y + drag.y); ctx.stroke();
            ctx.setLineDash([]);
          }
          ctx.fillStyle = "#f8fafc";
          ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, TAU); ctx.fill();
        });
      },
      down: function (px, py) {
        var p = S.input(px, py); if (!p) return;
        if (Math.hypot(ball.vx, ball.vy) > 6) return;
        drag = { x: p.x - ball.x, y: p.y - ball.y };
      },
      move: function (px, py) {
        var p = S.input(px, py); if (!p || !drag) return;
        drag.x = p.x - ball.x; drag.y = p.y - ball.y;
      },
      release: function () {
        if (!drag) return;
        if (Math.hypot(drag.x, drag.y) < 14) { drag = null; return; }
        ball.vx = clamp(drag.x * 3.4, -420, 420);
        ball.vy = clamp(drag.y * 3.4, -420, 420);
        drag = null; api.sfx("pick");
      },
    };
  });

  /* 15. Dartboard --------------------------------------------------------- */
  A.register("dartboard", function (api) {
    var S = A.begin(api);
    var x = W / 2, y = H / 2, hit = 0;
    return {
      update: function (dt) {
        if (!S.update(dt)) return;
        var t = S.elapsed * S.speed;
        x = W / 2 + Math.sin(t * 1.6) * 190;
        y = H / 2 + Math.cos(t * 2.15) * 160;
        hit = Math.max(0, hit - dt);
      },
      draw: function () {
        S.frame(function () {
          var ctx = api.ctx;
          var cx = W / 2, cy = H / 2;
          [150, 116, 82, 48, 22].forEach(function (r, i) {
            ctx.fillStyle = i % 2 ? "rgba(255,255,255,0.08)" : (i === 4 ? api.accent : "rgba(255,255,255,0.14)");
            ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
          });
          ctx.strokeStyle = api.accent; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(cx, cy, 22, 0, TAU); ctx.stroke();
          ctx.fillStyle = "#f8fafc";
          ctx.beginPath(); ctx.arc(x, y, 7, 0, TAU); ctx.fill();
          ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(x - 18, y); ctx.lineTo(x + 18, y); ctx.moveTo(x, y - 18); ctx.lineTo(x, y + 18); ctx.stroke();
          if (hit > 0) api.text("+1", W / 2, H - 60, 26, api.accent);
        });
      },
      tap: function (px, py) {
        if (!S.input(px, py)) return;
        var d = dist(x, y, W / 2, H / 2);
        if (d <= 24) { S.add(3); hit = 0.5; S.spark(x, y, api.accent, 10); api.sfx("good"); }
        else if (d <= 60) { S.add(2); hit = 0.5; S.spark(x, y, api.accent, 8); api.sfx("pick"); }
        else if (d <= 100) { S.add(1); hit = 0.5; S.spark(x, y, api.accent, 6); api.sfx("pick"); }
        else { S.fail(1); }
      },
    };
  });

  /* 16. Hoop -------------------------------------------------------------- */
  A.register("hoop", function (api) {
    var S = A.begin(api);
    var ball = { x: W / 2, y: H - 90, vx: 0, vy: 0, prevY: H - 90 };
    var drag = null, active = false;
    var hoop = { x: W / 2, y: 190, r: 43 };
    function reset() {
      ball.x = W / 2; ball.y = H - 90; ball.vx = 0; ball.vy = 0;
      ball.prevY = ball.y; drag = null; active = false;
      hoop.x = S.rand(110, W - 110);
    }
    return {
      update: function (dt) {
        if (!S.update(dt)) return;
        hoop.x = W / 2 + Math.sin(S.elapsed * S.speed * 1.15) * 165;
        if (active) {
          ball.prevY = ball.y;
          ball.vy += 360 * dt;
          ball.x += ball.vx * dt; ball.y += ball.vy * dt;
          if (ball.vy > 0 && ball.prevY < hoop.y && ball.y >= hoop.y &&
              Math.abs(ball.x - hoop.x) < hoop.r) {
            S.add(2); S.spark(hoop.x, hoop.y, api.accent, 11); api.sfx("good"); reset(); return;
          }
          if (ball.y > H + 30 || ball.x < -30 || ball.x > W + 30) { S.fail(1); reset(); }
        }
      },
      draw: function () {
        S.frame(function () {
          var ctx = api.ctx;
          ctx.fillStyle = "rgba(255,255,255,0.1)";
          ctx.fillRect(hoop.x - 60, hoop.y - 52, 120, 8);
          ctx.strokeStyle = api.accent; ctx.lineWidth = 5;
          ctx.beginPath(); ctx.ellipse(hoop.x, hoop.y, hoop.r, 12, 0, 0, TAU); ctx.stroke();
          ctx.strokeStyle = "rgba(255,255,255,0.16)"; ctx.lineWidth = 1;
          for (var i = -2; i <= 2; i++) {
            ctx.beginPath(); ctx.moveTo(hoop.x + i * 18, hoop.y); ctx.lineTo(hoop.x + i * 9, hoop.y + 40); ctx.stroke();
          }
          if (drag) {
            ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 2;
            ctx.setLineDash([5, 6]);
            ctx.beginPath(); ctx.moveTo(ball.x, ball.y); ctx.lineTo(ball.x + drag.x, ball.y + drag.y); ctx.stroke();
            ctx.setLineDash([]);
          }
          ctx.fillStyle = active ? "#fff" : api.accent;
          ctx.beginPath(); ctx.arc(ball.x, ball.y, 12, 0, TAU); ctx.fill();
        });
      },
      down: function (px, py) {
        var p = S.input(px, py); if (!p || active) return;
        drag = { x: p.x - ball.x, y: p.y - ball.y };
      },
      move: function (px, py) {
        var p = S.input(px, py); if (!p || !drag) return;
        drag.x = p.x - ball.x; drag.y = p.y - ball.y;
      },
      release: function () {
        if (!drag) return;
        if (Math.hypot(drag.x, drag.y) < 16) { drag = null; return; }
        ball.vx = drag.x * 3.8; ball.vy = drag.y * 3.8;
        active = true; drag = null; api.sfx("pick");
      },
    };
  });

  /* 17. Cannon ------------------------------------------------------------ */
  A.register("cannon", function (api) {
    var S = A.begin(api);
    var shot = null, target = { x: 470, y: 230, r: 32 };
    var cooldown = 0;
    return {
      update: function (dt) {
        if (!S.update(dt)) return;
        cooldown = Math.max(0, cooldown - dt);
        if (shot) {
          shot.vy += 250 * dt;
          shot.x += shot.vx * dt; shot.y += shot.vy * dt;
          if (near(shot.x, shot.y, 7, target.x, target.y, target.r)) {
            S.add(2); S.spark(target.x, target.y, api.accent, 12); api.sfx("good");
            target.x = S.rand(380, 540); target.y = S.rand(130, 430);
            shot = null; cooldown = 0.35;
          } else if (shot.y > H + 40 || shot.x > W + 40 || shot.x < -40) {
            S.fail(1); shot = null; cooldown = 0.2;
          }
        }
      },
      draw: function () {
        S.frame(function () {
          var ctx = api.ctx;
          var angle = 0.45 + Math.sin(S.elapsed * S.speed * 0.9) * 0.34;
          var power = 0.55 + Math.sin(S.elapsed * S.speed * 1.7) * 0.35;
          ctx.save(); ctx.translate(78, H - 74); ctx.rotate(-angle);
          ctx.fillStyle = api.accent; ctx.fillRect(0, -11, 66, 22);
          ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.beginPath(); ctx.arc(0, 0, 28, 0, TAU); ctx.fill();
          ctx.restore();
          ctx.fillStyle = "rgba(255,255,255,0.08)";
          ctx.fillRect(280, H - 94, 190, 10);
          ctx.fillStyle = api.accent;
          ctx.fillRect(280, H - 94, 190 * power, 10);
          ctx.fillStyle = "rgba(255,255,255,0.14)";
          ctx.beginPath(); ctx.arc(target.x, target.y, target.r, 0, TAU); ctx.fill();
          ctx.strokeStyle = api.accent; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(target.x, target.y, target.r, 0, TAU); ctx.stroke();
          if (shot) {
            ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(shot.x, shot.y, 8, 0, TAU); ctx.fill();
          }
          api.text("POWER", 375, H - 112, 14, "rgba(255,255,255,0.4)");
        });
      },
      tap: function (px, py) {
        if (!S.input(px, py) || shot || cooldown > 0) return;
        var t = S.elapsed * S.speed;
        var angle = 0.45 + Math.sin(t * 0.9) * 0.34;
        var power = 0.55 + Math.sin(t * 1.7) * 0.35;
        var speed = 300 + power * 360;
        shot = { x: 78 + Math.cos(angle) * 66, y: H - 74 - Math.sin(angle) * 66, vx: Math.cos(angle) * speed, vy: -Math.sin(angle) * speed };
        api.sfx("pick");
      },
    };
  });

  /* 18. Pool -------------------------------------------------------------- */
  A.register("pool", function (api) {
    var S = A.begin(api);
    var cue = null, balls = [], drag = null, moving = false, rest = 0;
    var pockets = [{ x: 66, y: 108 }, { x: W - 66, y: 108 }, { x: 66, y: H - 62 }, { x: W - 66, y: H - 62 }];
    function reset() {
      balls = [{ x: 160, y: 330, vx: 0, vy: 0, r: 12, cue: true, color: "#f8fafc" }];
      var colors = ["#fbbf24", "#f87171", "#60a5fa", "#a78bfa"];
      colors.forEach(function (color, i) {
        var a = (i / colors.length) * TAU;
        balls.push({ x: W / 2 + Math.cos(a) * 42, y: 300 + Math.sin(a) * 42, vx: 0, vy: 0, r: 12, color: color });
      });
      cue = balls[0]; drag = null; moving = false; rest = 0;
    }
    reset();
    function pot(ball) {
      if (ball.cue) { S.fail(1); reset(); return; }
      S.add(1); S.spark(ball.x, ball.y, api.accent, 9); api.sfx("pick");
      balls.splice(balls.indexOf(ball), 1);
      if (balls.length === 1) { S.add(3); reset(); }
    }
    return {
      update: function (dt) {
        if (!S.update(dt)) return;
        moving = false;
        balls.forEach(function (b) {
          if (Math.hypot(b.vx, b.vy) > 2) moving = true;
          b.x += b.vx * dt; b.y += b.vy * dt;
          b.vx *= Math.pow(0.985, dt * 60); b.vy *= Math.pow(0.985, dt * 60);
          if (b.x < 56 + b.r) { b.x = 56 + b.r; b.vx = Math.abs(b.vx) * 0.9; }
          if (b.x > W - 56 - b.r) { b.x = W - 56 - b.r; b.vx = -Math.abs(b.vx) * 0.9; }
          if (b.y < 98 + b.r) { b.y = 98 + b.r; b.vy = Math.abs(b.vy) * 0.9; }
          if (b.y > H - 52 - b.r) { b.y = H - 52 - b.r; b.vy = -Math.abs(b.vy) * 0.9; }
          if (b.vx * b.vx + b.vy * b.vy < 16) { b.vx = 0; b.vy = 0; }
        });
        for (var i = 0; i < balls.length; i++) {
          for (var j = i + 1; j < balls.length; j++) {
            var a = balls[i], b = balls[j];
            var dx = b.x - a.x, dy = b.y - a.y;
            var d = Math.hypot(dx, dy);
            if (d > 0 && d < a.r + b.r) {
              var nx = dx / d, ny = dy / d;
              var overlap = (a.r + b.r - d) / 2;
              a.x -= nx * overlap; a.y -= ny * overlap;
              b.x += nx * overlap; b.y += ny * overlap;
              var p = a.vx * nx + a.vy * ny - (b.vx * nx + b.vy * ny);
              if (p > 0) {
                a.vx -= p * nx; a.vy -= p * ny;
                b.vx += p * nx; b.vy += p * ny;
              }
            }
          }
        }
        for (var k = balls.length - 1; k >= 0; k--) {
          var ball = balls[k];
          for (var q = 0; q < pockets.length; q++) {
            if (dist(ball.x, ball.y, pockets[q].x, pockets[q].y) < 24) { pot(ball); return; }
          }
        }
        if (!moving) rest += dt; else rest = 0;
      },
      draw: function () {
        S.frame(function () {
          var ctx = api.ctx;
          ctx.fillStyle = "rgba(52,211,153,0.09)";
          rr(ctx, 46, 88, W - 92, H - 128, 26); ctx.fill();
          ctx.strokeStyle = "rgba(255,255,255,0.15)"; ctx.lineWidth = 2;
          rr(ctx, 46, 88, W - 92, H - 128, 26); ctx.stroke();
          pockets.forEach(function (p) {
            ctx.fillStyle = "#03050a";
            ctx.beginPath(); ctx.arc(p.x, p.y, 20, 0, TAU); ctx.fill();
          });
          balls.forEach(function (b) {
            ctx.fillStyle = b.color;
            ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
            ctx.strokeStyle = "rgba(0,0,0,0.28)"; ctx.lineWidth = 2; ctx.stroke();
            if (b.cue) {
              ctx.fillStyle = "rgba(0,0,0,0.2)";
              ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, TAU); ctx.fill();
            }
          });
          if (drag && !moving) {
            ctx.strokeStyle = "rgba(255,255,255,0.4)"; ctx.lineWidth = 2;
            ctx.setLineDash([6, 7]);
            ctx.beginPath(); ctx.moveTo(cue.x, cue.y); ctx.lineTo(cue.x + drag.x, cue.y + drag.y); ctx.stroke();
            ctx.setLineDash([]);
          }
          api.text("POT THE COLOURS", W / 2, 58, 17, "rgba(255,255,255,0.38)");
        });
      },
      down: function (px, py) {
        var p = S.input(px, py); if (!p || moving) return;
        drag = { x: p.x - cue.x, y: p.y - cue.y };
      },
      move: function (px, py) {
        var p = S.input(px, py); if (!p || !drag) return;
        drag.x = p.x - cue.x; drag.y = p.y - cue.y;
      },
      release: function () {
        if (!drag || moving) return;
        if (Math.hypot(drag.x, drag.y) < 14) { drag = null; return; }
        cue.vx = clamp(drag.x * 2.9, -360, 360);
        cue.vy = clamp(drag.y * 2.9, -360, 360);
        drag = null; api.sfx("pick");
      },
    };
  });

  /* 19. Maze -------------------------------------------------------------- */
  A.register("maze", function (api) {
    var S = A.begin(api);
    var n = 9, cell = 54, off = (W - n * cell) / 2;
    var cells = [], player = { x: 0, y: 0 }, exit = { x: n - 1, y: n - 1 };
    function index(x, y) { return y * n + x; }
    function make() {
      cells = [];
      for (var i = 0; i < n * n; i++) cells.push({ walls: [1, 1, 1, 1], seen: false });
      var stack = [{ x: 0, y: 0 }];
      cells[0].seen = true;
      while (stack.length) {
        var cur = stack[stack.length - 1];
        var opts = [];
        [[0, -1, 0, 2], [1, 0, 1, 3], [0, 1, 2, 0], [-1, 0, 3, 1]].forEach(function (d) {
          var nx = cur.x + d[0], ny = cur.y + d[1];
          if (nx >= 0 && ny >= 0 && nx < n && ny < n && !cells[index(nx, ny)].seen) opts.push(d);
        });
        if (!opts.length) { stack.pop(); continue; }
        var d = opts[Math.floor(S.rand(0, opts.length))];
        var nx = cur.x + d[0], ny = cur.y + d[1];
        cells[index(cur.x, cur.y)].walls[d[2]] = 0;
        cells[index(nx, ny)].walls[d[3]] = 0;
        cells[index(nx, ny)].seen = true;
        stack.push({ x: nx, y: ny });
      }
      player.x = 0; player.y = 0;
      exit.x = n - 1; exit.y = n - 1;
    }
    make();
    function move(dx, dy) {
      var c = cells[index(player.x, player.y)];
      var wall = dx === 1 ? 1 : dx === -1 ? 3 : dy === 1 ? 2 : 0;
      if (c.walls[wall]) return;
      player.x += dx; player.y += dy;
      S.spark(off + player.x * cell + cell / 2, off + player.y * cell + cell / 2, api.accent, 3);
      if (player.x === exit.x && player.y === exit.y) {
        S.add(1); S.spark(off + exit.x * cell + cell / 2, off + exit.y * cell + cell / 2, api.accent, 10);
        api.sfx("good"); make();
      }
    }
    return {
      update: function (dt) { S.update(dt); },
      draw: function () {
        S.frame(function () {
          var ctx = api.ctx;
          ctx.fillStyle = "rgba(255,255,255,0.045)";
          ctx.fillRect(off, off, n * cell, n * cell);
          cells.forEach(function (c, i) {
            var x = off + (i % n) * cell, y = off + Math.floor(i / n) * cell;
            ctx.strokeStyle = "rgba(255,255,255,0.36)"; ctx.lineWidth = 3;
            if (c.walls[0]) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + cell, y); ctx.stroke(); }
            if (c.walls[1]) { ctx.beginPath(); ctx.moveTo(x + cell, y); ctx.lineTo(x + cell, y + cell); ctx.stroke(); }
            if (c.walls[2]) { ctx.beginPath(); ctx.moveTo(x, y + cell); ctx.lineTo(x + cell, y + cell); ctx.stroke(); }
            if (c.walls[3]) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + cell); ctx.stroke(); }
          });
          ctx.fillStyle = api.accent;
          ctx.beginPath(); ctx.arc(off + exit.x * cell + cell / 2, off + exit.y * cell + cell / 2, 13, 0, TAU); ctx.fill();
          ctx.fillStyle = "#fff";
          ctx.beginPath(); ctx.arc(off + player.x * cell + cell / 2, off + player.y * cell + cell / 2, 11, 0, TAU); ctx.fill();
        });
      },
      tap: function (px, py) {
        var p = S.input(px, py); if (!p) return;
        var cx = clamp(Math.floor((p.x - off) / cell), 0, n - 1);
        var cy = clamp(Math.floor((p.y - off) / cell), 0, n - 1);
        if (cx === player.x && cy === player.y) return;
        if (Math.abs(cx - player.x) + Math.abs(cy - player.y) === 1) move(cx - player.x, cy - player.y);
      },
      key: function (code) {
        if (code === "ArrowLeft" || code === "KeyA") move(-1, 0);
        else if (code === "ArrowRight" || code === "KeyD") move(1, 0);
        else if (code === "ArrowUp" || code === "KeyW") move(0, -1);
        else if (code === "ArrowDown" || code === "KeyS") move(0, 1);
      },
      swipe: function (dx, dy) {
        if (Math.abs(dx) > Math.abs(dy)) move(dx, 0); else move(0, dy);
      },
    };
  });

  /* 20. Path -------------------------------------------------------------- */
  A.register("path", function (api) {
    var S = A.begin(api);
    var start = { x: 60, y: H / 2 }, goal = { x: W - 60, y: H / 2 };
    var bars = [], path = [], drawing = false;
    function make() {
      bars = [];
      [180, 310, 440].forEach(function (x) {
        var gap = S.rand(150, H - 150);
        bars.push({ x: x, gap: gap, h: S.rand(100, 160) });
      });
      path = []; drawing = false;
    }
    make();
    function blocked(x, y) {
      for (var i = 0; i < bars.length; i++) {
        var b = bars[i];
        if (Math.abs(x - b.x) < 15 && Math.abs(y - b.gap) > b.h / 2) return true;
      }
      return false;
    }
    function evaluate() {
      if (path.length < 2) return;
      var end = path[path.length - 1];
      var ok = dist(end.x, end.y, goal.x, goal.y) < 45;
      for (var i = 0; i < path.length && ok; i++) if (blocked(path[i].x, path[i].y)) ok = false;
      if (ok) {
        S.add(1); S.spark(goal.x, goal.y, api.accent, 11); api.sfx("good"); make();
      } else {
        S.fail(1); make();
      }
    }
    return {
      update: function (dt) { S.update(dt); },
      draw: function () {
        S.frame(function () {
          var ctx = api.ctx;
          ctx.fillStyle = "rgba(255,255,255,0.06)";
          ctx.fillRect(30, 76, W - 60, H - 112);
          bars.forEach(function (b) {
            ctx.fillStyle = "rgba(248,113,113,0.28)";
            ctx.fillRect(b.x - 13, 76, 26, b.gap - b.h / 2 - 76);
            ctx.fillRect(b.x - 13, b.gap + b.h / 2, 26, H - 40 - (b.gap + b.h / 2));
          });
          ctx.strokeStyle = api.accent; ctx.lineWidth = 4;
          ctx.beginPath();
          path.forEach(function (p, i) { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
          ctx.stroke();
          ctx.fillStyle = "#fff";
          ctx.beginPath(); ctx.arc(start.x, start.y, 12, 0, TAU); ctx.fill();
          ctx.fillStyle = api.accent;
          ctx.beginPath(); ctx.arc(goal.x, goal.y, 15, 0, TAU); ctx.fill();
          api.text("DRAG FROM START", W / 2, 46, 16, "rgba(255,255,255,0.36)");
        });
      },
      down: function (px, py) {
        var p = S.input(px, py); if (!p) return;
        if (dist(p.x, p.y, start.x, start.y) > 70) return;
        drawing = true;
        path = [{ x: start.x, y: start.y }, p];
      },
      move: function (px, py) {
        if (!drawing) return;
        var p = S.input(px, py); if (!p) return;
        path.push(p);
        if (path.length > 400) path.shift();
      },
      release: function () {
        if (!drawing) return;
        drawing = false;
        if (!path.length) return;
        var last = path[path.length - 1];
        if (dist(last.x, last.y, goal.x, goal.y) > 45) path.push({ x: goal.x, y: goal.y });
        evaluate();
      },
    };
  });
})();
