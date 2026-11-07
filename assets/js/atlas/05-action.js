/* Atlas engines 41–50: the action and strategy shelf. */
(function () {
  "use strict";
  var A = window.PP_ATLAS;
  var W = A.W, H = A.H;
  var clamp = A.clamp, near = A.near, rr = A.rr, dist = A.dist;
  var TAU = Math.PI * 2;

  /* 41. Runner ------------------------------------------------------------- */
  A.register("runner", function (api) {
    var S = A.begin(api, { goal: 400 });
    var player = { y: H - 100, vy: 0, slide: 0 };
    var obstacles = [], spawn = 0.8, scoreClock = 0;
    var ground = H - 84;
    function reset() {
      player.y = ground; player.vy = 0; player.slide = 0;
      obstacles = []; spawn = 0.8;
    }
    return {
      update: function (dt) {
        if (!S.update(dt)) return;
        player.vy += 1550 * dt;
        player.y += player.vy * dt;
        if (player.y > ground) { player.y = ground; player.vy = 0; }
        player.slide = Math.max(0, player.slide - dt);
        spawn -= dt;
        if (spawn <= 0) {
          spawn = Math.max(0.72, 1.28 - S.score * 0.0016);
          var type = S.rand() < 0.3 ? "high" : "low";
          obstacles.push({ x: W + 50, type: type, w: 42, h: type === "high" ? 34 : 62, hit: false });
        }
        var speed = (210 + S.score * 0.22) * S.speed;
        for (var i = obstacles.length - 1; i >= 0; i--) {
          var o = obstacles[i]; o.x -= speed * dt;
          if (o.x < -80) { obstacles.splice(i, 1); continue; }
          var px = 140, pw = 42, ph = player.slide > 0 ? 24 : 48;
          var py = player.slide > 0 ? ground - 14 : player.y - 50;
          var oy = o.type === "high" ? ground - 78 : ground - o.h;
          if (px + pw > o.x && px < o.x + o.w && py + ph > oy && py < oy + o.h) {
            S.fail(1); reset(); return;
          }
        }
        scoreClock += dt;
        if (scoreClock > 0.5) { scoreClock = 0; S.add(4); }
      },
      draw: function () {
        S.frame(function () {
          var ctx = api.ctx;
          ctx.fillStyle = "rgba(255,255,255,0.05)";
          ctx.fillRect(0, ground, W, H - ground);
          ctx.strokeStyle = "rgba(255,255,255,0.2)"; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(0, ground); ctx.lineTo(W, ground); ctx.stroke();
          for (var i = 0; i < 7; i++) {
            ctx.fillStyle = "rgba(255,255,255,0.06)";
            ctx.fillRect(((i * 110 - (S.elapsed * 80) % 110) + W) % (W + 110), 120 + (i % 3) * 80, 46, 3);
          }
          obstacles.forEach(function (o) {
            ctx.fillStyle = o.type === "high" ? "#fbbf24" : "#f87171";
            ctx.fillRect(o.x, o.type === "high" ? ground - 78 : ground - o.h, o.w, o.h);
          });
          ctx.fillStyle = api.accent;
          var ph = player.slide > 0 ? 24 : 48;
          rr(ctx, 140, player.slide > 0 ? ground - 14 : player.y - 50, 42, ph, 9); ctx.fill();
          api.text("DISTANCE " + Math.round(S.score) + " m", W / 2, 48, 17, "rgba(255,255,255,0.38)");
        });
      },
      tap: function (px, py) {
        if (!S.input(px, py)) return;
        if (Math.abs(player.y - ground) < 2) { player.vy = -650; api.sfx("pick"); }
      },
      swipe: function (dx, dy) { if (dy > 0) player.slide = 0.7; },
      key: function (code) {
        if (code === "Space" || code === "ArrowUp" || code === "KeyW") {
          if (Math.abs(player.y - ground) < 2) player.vy = -650;
        }
        if (code === "ArrowDown" || code === "KeyS") player.slide = 0.7;
      },
    };
  });

  /* 42. Frogger ------------------------------------------------------------ */
  A.register("frogger", function (api) {
    var S = A.begin(api);
    var cols = 9, rows = 7, cw = 58, rh = 64, ox = (W - cols * cw) / 2, oy = 92;
    var player = { x: 4, y: 6 };
    var cars = [], logs = [];
    function cellX(x) { return ox + x * cw + cw / 2; }
    function cellY(y) { return oy + y * rh + rh / 2; }
    function reset() {
      player.x = 4; player.y = 6;
      cars = []; logs = [];
      for (var i = 0; i < 6; i++) cars.push({ x: S.rand(-100, W + 100), row: 5, speed: 110 + S.rand(0, 70) });
      for (var j = 0; j < 5; j++) cars.push({ x: S.rand(-100, W + 100), row: 4, speed: -80 - S.rand(0, 70) });
      for (var k = 0; k < 4; k++) logs.push({ x: S.rand(-100, W + 100), row: 2, w: 120, speed: 60 });
      for (var l = 0; l < 4; l++) logs.push({ x: S.rand(-100, W + 100), row: 1, w: 100, speed: -70 });
    }
    reset();
    function move(dx, dy) {
      var nx = clamp(player.x + dx, 0, cols - 1);
      var ny = clamp(player.y + dy, 0, rows - 1);
      player.x = nx; player.y = ny;
      if (ny === 0) { S.add(1); S.spark(cellX(nx), cellY(0), api.accent, 11); api.sfx("good"); reset(); }
    }
    return {
      update: function (dt) {
        if (!S.update(dt)) return;
        cars.forEach(function (c) {
          c.x += c.speed * S.speed * dt;
          if (c.x < -140) c.x = W + 140;
          if (c.x > W + 140) c.x = -140;
        });
        logs.forEach(function (l) {
          l.x += l.speed * S.speed * dt;
          if (l.x < -180) l.x = W + 180;
          if (l.x > W + 180) l.x = -180;
        });
        var cx = cellX(player.x);
        if (player.y === 4 || player.y === 5) {
          for (var i = 0; i < cars.length; i++) {
            var c = cars[i];
            if (c.row === player.y && Math.abs(c.x - cx) < cw * 0.55) { S.fail(1); reset(); return; }
          }
        }
        if (player.y === 1 || player.y === 2) {
          var onLog = logs.some(function (l) {
            return l.row === player.y && cx > l.x - l.w / 2 && cx < l.x + l.w / 2;
          });
          if (!onLog) { S.fail(1); reset(); }
        }
      },
      draw: function () {
        S.frame(function () {
          var ctx = api.ctx;
          ctx.fillStyle = "rgba(34,211,238,0.07)";
          ctx.fillRect(ox, oy + rh, cols * cw, rh * 2);
          ctx.fillStyle = "rgba(74,222,128,0.09)";
          ctx.fillRect(ox, oy + rh * 4, cols * cw, rh * 2);
          ctx.fillStyle = "rgba(255,255,255,0.12)";
          ctx.fillRect(ox, oy, cols * cw, rh);
          for (var i = 0; i < cols; i++) {
            ctx.strokeStyle = "rgba(255,255,255,0.045)"; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(ox + i * cw, oy); ctx.lineTo(ox + i * cw, oy + rows * rh); ctx.stroke();
          }
          cars.forEach(function (c) {
            ctx.fillStyle = c.speed > 0 ? "#f87171" : "#fbbf24";
            rr(ctx, c.x - 34, cellY(c.row) - 17, 68, 34, 8); ctx.fill();
          });
          logs.forEach(function (l) {
            ctx.fillStyle = "rgba(120,80,42,0.8)";
            rr(ctx, l.x - l.w / 2, cellY(l.row) - 16, l.w, 32, 14); ctx.fill();
          });
          ctx.fillStyle = api.accent;
          ctx.beginPath(); ctx.arc(cellX(player.x), cellY(player.y), 16, 0, TAU); ctx.fill();
          ctx.fillStyle = "rgba(0,0,0,0.6)";
          ctx.beginPath(); ctx.arc(cellX(player.x) - 5, cellY(player.y) - 4, 2, 0, TAU); ctx.arc(cellX(player.x) + 5, cellY(player.y) - 4, 2, 0, TAU); ctx.fill();
          api.text("REACH THE FAR BANK", W / 2, 48, 15, "rgba(255,255,255,0.34)");
        });
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

  /* 43. Fishing ------------------------------------------------------------ */
  A.register("fishing", function (api) {
    var S = A.begin(api);
    var state = "ready", bob = { x: W / 2, y: H / 2 }, bite = 0, wait = 0, fish = { x: W / 2, y: H / 2 };
    function reset() {
      state = "ready"; wait = 0; bite = 0;
      fish.x = W / 2; fish.y = H / 2;
    }
    return {
      update: function (dt) {
        if (!S.update(dt)) return;
        if (state === "ready") return;
        if (state === "waiting") {
          wait -= dt;
          if (wait <= 0) {
            state = "bite"; bite = Math.max(0.34, 0.9 - S.score * 0.02);
            fish.x = S.rand(80, W - 80); fish.y = S.rand(180, H - 70);
            api.sfx("pick");
          }
        } else if (state === "bite") {
          bite -= dt;
          if (bite <= 0) { state = "ready"; S.fail(1); }
        }
      },
      draw: function () {
        S.frame(function () {
          var ctx = api.ctx;
          ctx.fillStyle = "rgba(56,189,248,0.08)";
          ctx.fillRect(0, 140, W, H - 140);
          ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(0, 140); ctx.lineTo(W, 140); ctx.stroke();
          if (state !== "ready") {
            ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(W / 2, 120); ctx.lineTo(bob.x, bob.y); ctx.stroke();
            ctx.fillStyle = api.accent;
            ctx.beginPath(); ctx.arc(bob.x, bob.y, 10, 0, TAU); ctx.fill();
          }
          ctx.fillStyle = "#fbbf24";
          ctx.beginPath(); ctx.arc(fish.x, fish.y, 13, 0, TAU); ctx.fill();
          ctx.beginPath(); ctx.moveTo(fish.x - 12, fish.y); ctx.lineTo(fish.x - 28, fish.y - 10); ctx.lineTo(fish.x - 28, fish.y + 10); ctx.closePath(); ctx.fill();
          if (state === "bite") api.text("BITE!", W / 2, H - 70, 28, api.accent);
          else if (state === "waiting") api.text("WAIT", W / 2, H - 70, 20, "rgba(255,255,255,0.35)");
          else api.text("TAP TO CAST", W / 2, H - 70, 20, "rgba(255,255,255,0.35)");
        });
      },
      tap: function (px, py) {
        if (!S.input(px, py)) return;
        if (state === "ready") {
          state = "waiting"; wait = S.rand(0.7, 1.8); bob.x = S.rand(100, W - 100); bob.y = S.rand(240, H - 90);
          api.sfx("pick");
        } else if (state === "bite") {
          S.add(1); S.spark(fish.x, fish.y, api.accent, 9); api.sfx("good"); reset();
        } else {
          S.fail(1); reset();
        }
      },
    };
  });

  /* 44. Stealth ------------------------------------------------------------ */
  A.register("stealth", function (api) {
    var S = A.begin(api);
    var player = { x: 86, y: H - 90 }, exit = { x: W - 76, y: 86 }, guards = [];
    function reset() {
      player.x = 66; player.y = H - 90;
      guards = [];
      for (var i = 0; i < 4; i++) {
        guards.push({
          x: S.rand(150, W - 150), y: 150 + i * 100,
          range: S.rand(105, 155), angle: S.rand(0, TAU), speed: S.rand(0.35, 0.8),
        });
      }
    }
    reset();
    return {
      update: function (dt) {
        if (!S.update(dt)) return;
        guards.forEach(function (g) {
          g.angle += g.speed * S.speed * dt;
          var dx = player.x - g.x, dy = player.y - g.y;
          var d = Math.hypot(dx, dy);
          var a = Math.atan2(dy, dx);
          var delta = Math.abs(((a - g.angle + Math.PI) % TAU + TAU) % TAU - Math.PI);
          if (d < g.range && delta < 0.45) {
            S.fail(1); reset(); return;
          }
        });
        if (dist(player.x, player.y, exit.x, exit.y) < 34) {
          S.add(1); S.spark(exit.x, exit.y, api.accent, 12); api.sfx("good"); reset();
        }
      },
      draw: function () {
        S.frame(function () {
          var ctx = api.ctx;
          ctx.fillStyle = "rgba(255,255,255,0.05)";
          ctx.fillRect(40, 50, W - 80, H - 100);
          guards.forEach(function (g) {
            ctx.fillStyle = "rgba(248,113,113,0.07)";
            ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.arc(g.x, g.y, g.range, g.angle - 0.45, g.angle + 0.45); ctx.closePath(); ctx.fill();
            ctx.fillStyle = "#f87171";
            ctx.beginPath(); ctx.arc(g.x, g.y, 17, 0, TAU); ctx.fill();
          });
          ctx.fillStyle = "#fde047";
          ctx.beginPath(); ctx.arc(exit.x, exit.y, 18, 0, TAU); ctx.fill();
          ctx.fillStyle = api.accent;
          ctx.beginPath(); ctx.arc(player.x, player.y, 14, 0, TAU); ctx.fill();
          api.text("REACH THE LIFT", W / 2, 32, 15, "rgba(255,255,255,0.34)");
        });
      },
      down: function (px, py) {
        var p = S.input(px, py); if (!p) return;
        player.x = clamp(p.x, 44, W - 44); player.y = clamp(p.y, 50, H - 50);
      },
      move: function (px, py) {
        var p = S.input(px, py); if (!p) return;
        player.x = clamp(p.x, 44, W - 44); player.y = clamp(p.y, 50, H - 50);
      },
      key: function (code) {
        var d = S.dir(code);
        if (d) player.x = clamp(player.x + d * 24, 44, W - 44);
        if (code === "ArrowUp" || code === "KeyW") player.y = clamp(player.y - 24, 50, H - 50);
        if (code === "ArrowDown" || code === "KeyS") player.y = clamp(player.y + 24, 50, H - 50);
      },
      swipe: function (dx, dy) {
        player.x = clamp(player.x + dx * 26, 44, W - 44);
        player.y = clamp(player.y + dy * 26, 50, H - 50);
      },
    };
  });

  /* 45. Lockpick ----------------------------------------------------------- */
  A.register("lockpick", function (api) {
    var S = A.begin(api);
    var pins = [], active = 0, angle = 0, dir = 1;
    function make() {
      pins = [];
      for (var i = 0; i < 4; i++) pins.push({ target: S.rand(0.25, 0.75), width: 0.15, set: false });
      active = 0; angle = 0; dir = 1;
    }
    make();
    return {
      update: function (dt) {
        if (!S.update(dt)) return;
        if (active >= pins.length) return;
        angle += dir * (0.55 + active * 0.16) * S.speed * dt;
        if (angle > 1) { angle = 1; dir = -1; }
        if (angle < 0) { angle = 0; dir = 1; }
      },
      draw: function () {
        S.frame(function () {
          var ctx = api.ctx;
          for (var i = 0; i < pins.length; i++) {
            var y = 150 + i * 92;
            ctx.fillStyle = "rgba(255,255,255,0.07)";
            rr(ctx, 100, y, W - 200, 18, 9); ctx.fill();
            ctx.fillStyle = pins[i].set ? "#4ade80" : "rgba(255,255,255,0.16)";
            rr(ctx, 100 + pins[i].target * (W - 200) - pins[i].width * (W - 200) / 2, y - 4, pins[i].width * (W - 200), 26, 9); ctx.fill();
            if (i === active) {
              ctx.fillStyle = api.accent;
              ctx.beginPath(); ctx.arc(100 + angle * (W - 200), y - 28, 10, 0, TAU); ctx.fill();
            }
            if (pins[i].set) api.text("SET", W - 70, y + 9, 14, "#4ade80");
          }
          api.text("STOP EACH PIN IN THE BAND", W / 2, 56, 15, "rgba(255,255,255,0.35)");
          api.text("PIN " + Math.min(active + 1, pins.length) + " / " + pins.length, W / 2, H - 52, 17, "rgba(255,255,255,0.4)");
        });
      },
      tap: function (px, py) {
        if (!S.input(px, py) || active >= pins.length) return;
        var pin = pins[active];
        if (Math.abs(angle - pin.target) <= pin.width / 2) {
          pin.set = true; active++; S.add(1); S.spark(100 + angle * (W - 200), 150 + active * 92, api.accent, 7); api.sfx("good");
          if (active >= pins.length) { S.add(2); api.sfx("win"); make(); }
        } else {
          S.fail(1); make();
        }
      },
    };
  });

  /* 46. Defuse ------------------------------------------------------------- */
  A.register("defuse", function (api) {
    var S = A.begin(api);
    var colors = ["#f87171", "#60a5fa", "#a3e635", "#fbbf24"];
    var names = ["RED", "BLUE", "GREEN", "YELLOW"];
    var answer = 0, local = 10, flash = 0;
    function make() {
      answer = Math.floor(S.rand(0, 4)); local = Math.max(5, 9 - S.score * 0.2); flash = 0;
    }
    make();
    return {
      update: function (dt) {
        if (!S.update(dt)) return;
        local -= dt; flash = Math.max(0, flash - dt);
        if (local <= 0) { S.fail(1); make(); }
      },
      draw: function () {
        S.frame(function () {
          var ctx = api.ctx;
          ctx.fillStyle = "rgba(255,255,255,0.06)";
          rr(ctx, 90, 130, W - 180, 330, 22); ctx.fill();
          for (var i = 0; i < 4; i++) {
            var y = 180 + i * 68;
            ctx.strokeStyle = colors[i]; ctx.lineWidth = 8;
            ctx.beginPath(); ctx.moveTo(130, y); ctx.bezierCurveTo(230, y - 26, 370, y + 26, W - 130, y); ctx.stroke();
            api.text(names[i], W / 2, y - 18, 15, "rgba(255,255,255,0.45)");
          }
          api.text("CUT THE " + names[answer] + " WIRE", W / 2, 96, 23, api.accent);
          api.text(Math.ceil(local) + "s", W / 2, 510, 30, local < 3 ? "#f87171" : "rgba(255,255,255,0.55)");
          if (flash > 0) api.text("SNIP", W / 2, 550, 24, api.accent);
        });
      },
      tap: function (px, py) {
        var p = S.input(px, py); if (!p) return;
        for (var i = 0; i < 4; i++) {
          var y = 180 + i * 68;
          if (p.y > y - 34 && p.y < y + 34) {
            if (i === answer) {
              S.add(2); flash = 0.25; api.sfx("good"); S.spark(p.x, y, api.accent, 10); make();
            } else {
              S.fail(1); api.sfx("bad"); make();
            }
            return;
          }
        }
      },
    };
  });

  /* 47. Sorting ------------------------------------------------------------ */
  A.register("sorting", function (api) {
    var S = A.begin(api);
    var colors = ["#f87171", "#60a5fa", "#a3e635", "#fbbf24"];
    var parcels = [], selected = null, spawn = 0.4;
    function spawnParcel() {
      parcels.push({ x: S.rand(110, W - 110), y: 110, vy: S.rand(70, 105) * S.speed, color: Math.floor(S.rand(0, 4)) });
    }
    return {
      update: function (dt) {
        if (!S.update(dt)) return;
        spawn -= dt;
        if (spawn <= 0) { spawnParcel(); spawn = Math.max(0.24, 0.72 - S.score * 0.012); }
        for (var i = parcels.length - 1; i >= 0; i--) {
          var p = parcels[i]; p.y += p.vy * dt;
          if (p.y > H - 60) {
            if (parcels[i] === selected) selected = null;
            parcels.splice(i, 1); S.fail(1);
          }
        }
      },
      draw: function () {
        S.frame(function () {
          var ctx = api.ctx;
          for (var i = 0; i < 4; i++) {
            var x = 38 + i * 138;
            ctx.fillStyle = colors[i];
            ctx.globalAlpha = 0.7;
            rr(ctx, x, H - 55, 126, 40, 10); ctx.fill();
            ctx.globalAlpha = 1;
            api.text("BIN", x + 63, H - 35, 14, "#07111f");
          }
          parcels.forEach(function (p, i) {
            ctx.fillStyle = colors[p.color];
            rr(ctx, p.x - 23, p.y - 23, 46, 46, 9); ctx.fill();
            if (p === selected) {
              ctx.strokeStyle = "#fff"; ctx.lineWidth = 3;
              rr(ctx, p.x - 29, p.y - 29, 58, 58, 12); ctx.stroke();
            }
          });
          api.text("TAP PARCEL, THEN BIN", W / 2, 48, 15, "rgba(255,255,255,0.34)");
        });
      },
      tap: function (px, py) {
        var p = S.input(px, py); if (!p) return;
        for (var i = parcels.length - 1; i >= 0; i--) {
          if (dist(p.x, p.y, parcels[i].x, parcels[i].y) < 29) { selected = parcels[i]; api.sfx("pick"); return; }
        }
        if (p.y > H - 65 && p.y < H - 10) {
          var bin = Math.floor((p.x - 38) / 138);
          if (bin < 0 || bin > 3 || !selected) return;
          var parcel = selected;
          var at = parcels.indexOf(parcel);
          if (at === -1) { selected = null; return; }
          parcels.splice(at, 1); selected = null;
          if (parcel.color === bin) { S.add(1); S.spark(p.x, H - 35, colors[bin], 7); api.sfx("good"); }
          else { S.fail(1); }
        }
      },
    };
  });

  /* 48. Parking ------------------------------------------------------------ */
  A.register("parking", function (api) {
    var S = A.begin(api);
    var n = 7, cell = 68, off = (W - n * cell) / 2;
    var car = { x: 1, y: 5 }, bay = { x: 5, y: 1 }, walls = {};
    function key(x, y) { return x + "," + y; }
    function make() {
      walls = {};
      for (var i = 0; i < n; i++) { walls[key(i, 0)] = 1; walls[key(i, n - 1)] = 1; walls[key(0, i)] = 1; walls[key(n - 1, i)] = 1; }
      for (var w = 0; w < 5; w++) {
        var wx = Math.floor(S.rand(2, n - 2)), wy = Math.floor(S.rand(2, n - 2));
        walls[key(wx, wy)] = 1;
      }
      car = { x: 1, y: n - 2 };
      bay = { x: n - 2, y: 1 };
      walls[key(car.x, car.y)] = 0; walls[key(bay.x, bay.y)] = 0;
      if (!reachable()) {
        for (var k = 1; k < n - 1; k++) for (var l = 1; l < n - 1; l++) walls[key(k, l)] = 0;
      }
    }
    function reachable() {
      var seen = {}, queue = [key(car.x, car.y)];
      seen[key(car.x, car.y)] = 1;
      while (queue.length) {
        var cur = queue.pop().split(",");
        var x = Number(cur[0]), y = Number(cur[1]);
        if (x === bay.x && y === bay.y) return true;
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
          var nx = x + d[0], ny = y + d[1], k = key(nx, ny);
          if (nx < 1 || ny < 1 || nx >= n - 1 || ny >= n - 1 || seen[k] || walls[k]) return;
          seen[k] = 1; queue.push(k);
        });
      }
      return false;
    }
    make();
    function move(dx, dy) {
      var nx = clamp(car.x + dx, 1, n - 2), ny = clamp(car.y + dy, 1, n - 2);
      if (walls[key(nx, ny)]) { S.fail(1); return; }
      car.x = nx; car.y = ny;
      if (car.x === bay.x && car.y === bay.y) {
        S.add(1); S.spark(off + bay.x * cell + cell / 2, off + bay.y * cell + cell / 2, api.accent, 10);
        api.sfx("good"); make();
      }
    }
    return {
      update: function (dt) { S.update(dt); },
      draw: function () {
        S.frame(function () {
          var ctx = api.ctx;
          ctx.fillStyle = "rgba(255,255,255,0.035)";
          ctx.fillRect(off, off, n * cell, n * cell);
          for (var x = 0; x < n; x++) for (var y = 0; y < n; y++) {
            if (!walls[key(x, y)]) continue;
            ctx.fillStyle = "rgba(255,255,255,0.1)";
            ctx.fillRect(off + x * cell + 3, off + y * cell + 3, cell - 6, cell - 6);
          }
          ctx.strokeStyle = api.accent; ctx.lineWidth = 2;
          ctx.setLineDash([7, 6]);
          ctx.strokeRect(off + bay.x * cell + 7, off + bay.y * cell + 7, cell - 14, cell - 14);
          ctx.setLineDash([]);
          ctx.fillStyle = api.accent;
          rr(ctx, off + car.x * cell + 12, off + car.y * cell + 12, cell - 24, cell - 24, 8); ctx.fill();
          ctx.fillStyle = "#07111f";
          ctx.fillRect(off + car.x * cell + 18, off + car.y * cell + 18, cell - 36, 10);
          api.text("SWIPE TO PARK", W / 2, 44, 15, "rgba(255,255,255,0.34)");
        });
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
      down: function (px, py) { S.input(px, py); },
    };
  });

  /* 49. Connect ------------------------------------------------------------ */
  A.register("connect", function (api) {
    var S = A.begin(api);
    var cols = 7, rows = 6, board = [], turn = 0, lock = 0, result = "";
    function make() {
      board = [];
      for (var i = 0; i < cols * rows; i++) board.push(-1);
      turn = 0; lock = 0; result = "";
    }
    make();
    function drop(col, who) {
      for (var r = rows - 1; r >= 0; r--) {
        var i = r * cols + col;
        if (board[i] < 0) { board[i] = who; return r; }
      }
      return -1;
    }
    function win(who) {
      for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
        var i = r * cols + c;
        if (board[i] !== who) continue;
        if (c <= cols - 4 && board[i + 1] === who && board[i + 2] === who && board[i + 3] === who) return true;
        if (r <= rows - 4 && board[i + cols] === who && board[i + cols * 2] === who && board[i + cols * 3] === who) return true;
        if (c <= cols - 4 && r <= rows - 4 && board[i + cols + 1] === who && board[i + cols * 2 + 2] === who && board[i + cols * 3 + 3] === who) return true;
        if (c >= 3 && r <= rows - 4 && board[i + cols - 1] === who && board[i + cols * 2 - 2] === who && board[i + cols * 3 - 3] === who) return true;
      }
      return false;
    }
    function wouldWin(col, who) {
      var row = drop(col, who);
      if (row < 0) return false;
      var result = win(who);
      board[row * cols + col] = -1;
      return result;
    }
    function ai() {
      var valid = [];
      for (var c = 0; c < cols; c++) if (board[c] < 0) valid.push(c);
      if (!valid.length) return false;
      for (var i = 0; i < valid.length; i++) if (wouldWin(valid[i], 1)) { drop(valid[i], 1); return true; }
      for (var j = 0; j < valid.length; j++) if (wouldWin(valid[j], 0)) { drop(valid[j], 1); return true; }
      drop(valid[Math.floor(S.rand(0, valid.length))], 1);
      return true;
    }
    return {
      update: function (dt) {
        if (!S.update(dt)) return;
        if (lock > 0) {
          lock -= dt;
          if (lock <= 0 && turn === 1 && !result) {
            ai();
            if (win(1)) { result = "RIVAL"; S.fail(1); setTimeout(make, 500); }
            else { turn = 0; }
          }
        }
      },
      draw: function () {
        S.frame(function () {
          var ctx = api.ctx;
          var cw = 72, ch = 64, ox = (W - cols * cw) / 2, oy = 140;
          ctx.fillStyle = "rgba(255,255,255,0.055)";
          rr(ctx, ox - 12, oy - 12, cols * cw + 24, rows * ch + 24, 18); ctx.fill();
          for (var i = 0; i < board.length; i++) {
            var x = ox + (i % cols) * cw + cw / 2;
            var y = oy + Math.floor(i / cols) * ch + ch / 2;
            ctx.fillStyle = "rgba(0,0,0,0.32)";
            ctx.beginPath(); ctx.arc(x, y, 25, 0, TAU); ctx.fill();
            if (board[i] >= 0) {
              ctx.fillStyle = board[i] === 0 ? api.accent : "#f87171";
              ctx.beginPath(); ctx.arc(x, y, 25, 0, TAU); ctx.fill();
            }
          }
          api.text(result || (turn === 0 ? "YOUR TURN" : "RIVAL"), W / 2, 70, 19, result ? "#f87171" : "rgba(255,255,255,0.45)");
        });
      },
      tap: function (px, py) {
        var p = S.input(px, py); if (!p || turn !== 0 || lock > 0 || result) return;
        var cw = 72, ox = (W - cols * cw) / 2;
        var col = Math.floor((p.x - ox) / cw);
        if (col < 0 || col >= cols || board[col] >= 0) return;
        drop(col, 0); api.sfx("pick");
        if (win(0)) { S.add(1); result = "WIN"; api.sfx("win"); setTimeout(make, 400); return; }
        turn = 1; lock = 0.38;
        if (board.every(function (v) { return v >= 0; })) setTimeout(make, 350);
      },
    };
  });

  /* 50. Dice --------------------------------------------------------------- */
  A.register("dice", function (api) {
    var S = A.begin(api, { goal: 20 });
    var value = 1, round = 0, banked = 0, rolling = 0, bust = 0;
    function roll() {
      if (rolling > 0) return;
      rolling = 0.24; value = Math.floor(S.rand(1, 7));
      if (value === 1) { bust = 0.7; S.fail(1); round = 0; api.sfx("bad"); }
      else { round += value; api.sfx("pick"); }
    }
    function bank() {
      if (round <= 0) return;
      banked += round; S.add(round); round = 0; api.sfx("good");
    }
    return {
      update: function (dt) {
        if (!S.update(dt)) return;
        rolling = Math.max(0, rolling - dt);
        bust = Math.max(0, bust - dt);
      },
      draw: function () {
        S.frame(function () {
          var ctx = api.ctx;
          ctx.fillStyle = "rgba(255,255,255,0.06)";
          rr(ctx, 200, 150, 200, 200, 30); ctx.fill();
          ctx.strokeStyle = "rgba(255,255,255,0.2)"; ctx.lineWidth = 3; ctx.stroke();
          var dots = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] }[value];
          ctx.fillStyle = api.accent;
          dots.forEach(function (d) { ctx.beginPath(); ctx.arc(300 + d[0] * 48, 250 + d[1] * 48, 14, 0, TAU); ctx.fill(); });
          api.text("ROUND " + round + "  ·  BANKED " + banked, W / 2, 110, 18, "rgba(255,255,255,0.55)");
          ctx.fillStyle = "rgba(255,255,255,0.09)";
          rr(ctx, 85, 430, 190, 78, 18); ctx.fill();
          rr(ctx, 325, 430, 190, 78, 18); ctx.fill();
          api.text("ROLL", 180, 469, 24, "#f8fafc");
          api.text("BANK", 420, 469, 24, api.accent);
          if (bust > 0) api.text("BUST", W / 2, 412, 26, "#f87171");
        });
      },
      tap: function (px, py) {
        var p = S.input(px, py); if (!p) return;
        if (p.x < W / 2) roll(); else bank();
      },
      key: function (code) {
        if (code === "Space" || code === "ArrowUp") roll();
        if (code === "Enter" || code === "ArrowDown") bank();
      },
    };
  });
})();
