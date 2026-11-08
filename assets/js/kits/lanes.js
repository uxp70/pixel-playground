/* Lanes family — eleven traffic games with different roads and rules. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, clamp = K.clamp, rr = K.roundRect;

  var MODES = [
    { name: "Lane Runner", kind: "run", lanes: 3, speed: 250, hudA: "Distance", hudB: "Lane", pattern: "grid" },
    { name: "Dash Line", kind: "run", lanes: 4, speed: 270, hudA: "Distance", hudB: "Lane", pattern: "beams" },
    { name: "Track Sprint", kind: "run", lanes: 5, speed: 285, hudA: "Distance", hudB: "Lane", pattern: "bands" },
    { name: "Rift Runner", kind: "wrap", lanes: 3, speed: 265, hudA: "Distance", hudB: "Lane", pattern: "stars" },
    { name: "Side Sprint", kind: "barrier", lanes: 4, speed: 250, hudA: "Distance", hudB: "Lane", pattern: "dots" },
    { name: "Neon Lanes", kind: "fog", lanes: 3, speed: 275, hudA: "Distance", hudB: "Lane", pattern: "rain" },
    { name: "Corridor Dash", kind: "barrier", lanes: 3, speed: 295, hudA: "Distance", hudB: "Lane", pattern: "scan" },
    { name: "Hurdle Run", kind: "hurdle", lanes: 4, speed: 260, hudA: "Distance", hudB: "Lane", pattern: "waves" },
    { name: "Slip Lane", kind: "oil", lanes: 3, speed: 255, hudA: "Distance", hudB: "Lane", pattern: "dots" },
    { name: "Charge Line", kind: "charge", lanes: 3, speed: 330, hudA: "Distance", hudB: "Lane", pattern: "beams" },
    { name: "Last Lane", kind: "hurdle", lanes: 5, speed: 310, fog: true, hudA: "Distance", hudB: "Lane", pattern: "rain" },
  ];

  function make(api) {
    var m = api.mode;
    var kind = m.kind;
    var ctx = api.ctx;
    var count = m.lanes || 3;
    var laneW = W / count;
    var lane = Math.floor(count / 2);
    var targetLane = lane;
    var laneFloat = lane;
    var distance = 0;
    var speed = m.speed;
    var cars = [];
    var barriers = [];
    var oils = [];
    var spawn = 0.6;
    var playerY = H - 150;
    var boost = 0;
    var shake = 0;

    function laneX(i) { return laneW * i + laneW / 2; }

    function shift(delta) {
      var next = targetLane + delta;
      if (kind === "wrap") {
        next = (next + count) % count;
      } else {
        next = clamp(next, 0, count - 1);
      }
      if (next === targetLane) return;
      targetLane = next;
      api.sfx("pick");
      api.haptic(5);
      if (kind === "oil") {
        oils.push({ lane: targetLane, ttl: 2.2 });
      }
    }

    function crash() {
      api.sfx("bad");
      api.shake(14);
      api.haptic([30, 60, 40]);
      api.finish(Math.round(distance));
    }

    function update(dt) {
      var drift = kind === "charge" ? 1.4 : 1;
      distance += (speed * drift * dt) / 14;
      laneFloat += (targetLane - laneFloat) * Math.min(1, dt * 13);
      lane = targetLane;
      boost = Math.max(0, boost - dt);
      shake = Math.max(0, shake - dt);

      if (kind === "charge") speed = Math.min(420, speed + dt * 8);

      spawn -= dt;
      if (spawn <= 0) {
        spawn = Math.max(0.28, 0.66 * rand(0.8, 1.3) - (m.speed - 250) * 0.001);
        var lanePick = Math.floor(rand(0, count));
        if (kind === "hurdle") {
          barriers.push({ lane: lanePick, y: -70, h: 44, solid: true, gap: false });
          if (count === 5) {
            barriers.push({ lane: (lanePick + 2) % count, y: -70, h: 44, solid: true });
          }
        } else if (kind === "barrier" && Math.random() < 0.4) {
          barriers.push({ lane: lanePick, y: -70, h: 44, solid: true });
        } else {
          cars.push({ lane: lanePick, y: -86, h: 86, v: speed * rand(0.85, 1.18) });
        }
      }

      for (var i = cars.length - 1; i >= 0; i--) {
        var c = cars[i];
        c.y += c.v * dt;
        if (c.y > H + 90) { cars.splice(i, 1); continue; }
        if (kind !== "fog" && c.lane === lane && c.y + c.h > playerY && c.y < playerY + 70) crash();
        if (kind === "fog" && c.lane === lane && c.y + c.h > playerY && c.y < playerY + 70) crash();
      }
      for (var b = barriers.length - 1; b >= 0; b--) {
        var bar = barriers[b];
        bar.y += speed * dt * 0.95;
        if (bar.y > H + 90) { barriers.splice(b, 1); continue; }
        if (bar.lane === lane && bar.y + bar.h > playerY && bar.y < playerY + 70) crash();
      }
      for (var o = oils.length - 1; o >= 0; o--) {
        oils[o].ttl -= dt;
        if (oils[o].ttl <= 0) oils.splice(o, 1);
      }
      if (oils.length && Math.random() < dt * 0.8) {
        targetLane = clamp(targetLane + (Math.random() < 0.5 ? -1 : 1), 0, count - 1);
      }

      api.hud(Math.round(distance) + " m", "lane " + (lane + 1) + " / " + count);
    }

    function draw() {
      api.bg();
      var i;
      for (i = 0; i < count; i++) {
        ctx.fillStyle = i === lane ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)";
        ctx.fillRect(i * laneW, 0, laneW, H);
      }
      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.lineWidth = 2;
      ctx.setLineDash([26, 26]);
      var shiftY = (distance * 40) % 52;
      for (i = 1; i < count; i++) {
        ctx.beginPath();
        ctx.moveTo(i * laneW, -shiftY);
        ctx.lineTo(i * laneW, H);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      for (i = 0; i < oils.length; i++) {
        ctx.fillStyle = "rgba(250,204,21,0.13)";
        rr(ctx, oils[i].lane * laneW + 6, 0, laneW - 12, H, 0); ctx.fill();
      }

      for (i = 0; i < cars.length; i++) {
        var c = cars[i];
        ctx.fillStyle = "#f87171";
        rr(ctx, laneX(c.lane) - laneW * 0.26, c.y, laneW * 0.52, c.h, 12); ctx.fill();
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        rr(ctx, laneX(c.lane) - laneW * 0.18, c.y + 14, laneW * 0.36, 26, 6); ctx.fill();
      }
      for (i = 0; i < barriers.length; i++) {
        var bar = barriers[i];
        ctx.fillStyle = "#fbbf24";
        rr(ctx, bar.lane * laneW + 4, bar.y, laneW - 8, bar.h, 6); ctx.fill();
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        for (var s = 0; s < 3; s++) ctx.fillRect(bar.lane * laneW + 8 + s * 18, bar.y + 8, 9, bar.h - 16);
      }

      var drawX = laneFloat * laneW + laneW / 2;
      ctx.fillStyle = api.accent;
      rr(ctx, drawX - laneW * 0.26, playerY, laneW * 0.52, 74, 12); ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      rr(ctx, drawX - laneW * 0.18, playerY + 16, laneW * 0.36, 24, 6); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.fillRect(drawX - laneW * 0.16, playerY + 6, laneW * 0.32, 4);

      if (kind === "fog" || m.fog) {
        var grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, "rgba(4,7,14,0.82)");
        grad.addColorStop(0.62, "rgba(4,7,14,0.55)");
        grad.addColorStop(1, "rgba(4,7,14,0.05)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
      }
      if (kind === "charge") api.text("BOOST", W / 2, 36, 15, "rgba(255,255,255,0.4)");
    }

    function tap(x) {
      if (count <= 3) { shift(x < W / 2 ? -1 : 1); return; }
      var picked = clamp(Math.floor(x / laneW), 0, count - 1);
      if (picked === targetLane) return;
      shift(picked > targetLane ? 1 : -1);
    }

    return {
      update: update,
      draw: draw,
      tap: tap,
      key: function (code) {
        if (code === "ArrowLeft" || code === "KeyA") shift(-1);
        if (code === "ArrowRight" || code === "KeyD") shift(1);
      },
      swipe: function (dx) { shift(dx < 0 ? -1 : 1); },
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
