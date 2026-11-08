/* Stack family — eleven skyline games with different towers and conditions. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, clamp = K.clamp, rr = K.roundRect;

  var MODES = [
    { name: "Towering", kind: "classic", hudA: "Floors", hudB: "Best", pattern: "stars" },
    { name: "Brick Lift", kind: "bricks", hudA: "Floors", hudB: "Width", pattern: "bricks" },
    { name: "Cloud Stack", kind: "wind", hudA: "Floors", hudB: "Wind", pattern: "waves" },
    { name: "Deck Up", kind: "deck", hudA: "Floors", hudB: "Streak", pattern: "bands" },
    { name: "Sky Pile", kind: "drift", hudA: "Floors", hudB: "Drift", pattern: "dots" },
    { name: "Floor Rise", kind: "thin", hudA: "Floors", hudB: "Width", pattern: "grid" },
    { name: "Block Tower", kind: "wide", hudA: "Floors", hudB: "Width", pattern: "bricks" },
    { name: "Crane Up", kind: "swing", hudA: "Floors", hudB: "Swing", pattern: "beams" },
    { name: "Stack Yard", kind: "wild", hudA: "Floors", hudB: "Width", pattern: "rain" },
    { name: "High Rise", kind: "rush", hudA: "Floors", hudB: "Speed", pattern: "scan" },
    { name: "Tower Ten", kind: "perfect", hudA: "Perfect", hudB: "Floors", pattern: "stars" },
  ];

  function make(api) {
    var m = api.mode;
    var kind = m.kind;
    var ctx = api.ctx;
    var blockH = 28;
    var startW = 250;
    var speed = kind === "rush" ? 190 : 145;
    var blocks = [{ x: (W - startW) / 2, w: startW, y: H - 150 }];
    var cam = 0;
    var floors = 0;
    var perfects = 0;
    var streak = 0;
    var wind = 0;
    var clock = 0;
    var moving = spawn(blocks[0]);

    function spawn(prev) {
      var fromLeft = blocks.length % 2 === 1;
      var w = prev.w;
      if (kind === "bricks" || kind === "wild") w = clamp(w + rand(-34, 34), 80, 250);
      if (kind === "wide") w = clamp(w + 12, 100, 300);
      return {
        x: fromLeft ? 0 : W - w,
        w: w,
        y: prev.y - blockH,
        dir: fromLeft ? 1 : -1,
      };
    }

    function finish(score) { api.finish(score); }

    function drop() {
      var top = blocks[blocks.length - 1];
      var left = Math.max(moving.x, top.x);
      var right = Math.min(moving.x + moving.w, top.x + top.w);
      var overlap = right - left;
      if (overlap <= 5) {
        api.sfx("bad");
        api.shake(11);
        api.haptic([20, 50, 30]);
        finish(kind === "perfect" ? perfects : floors);
        return;
      }
      var perfect = Math.abs(moving.x - top.x) <= 8;
      var placed;
      if (perfect) {
        var grow = kind === "deck" ? 12 : 6;
        var grew = Math.min(startW + 40, moving.w + grow);
        placed = { x: top.x + top.w / 2 - grew / 2, w: grew, y: moving.y };
        perfects++;
        streak++;
        api.sfx("good");
        api.burst(placed.x + placed.w / 2, placed.y, api.accent, 12);
        api.haptic(10);
        if (kind === "perfect" && perfects >= 10) { finish(perfects); return; }
      } else {
        placed = { x: left, w: overlap, y: moving.y };
        streak = 0;
        api.sfx("pick");
        api.shake(2);
        api.haptic(5);
        if (kind === "perfect") { finish(perfects); return; }
      }
      blocks.push(placed);
      floors++;
      if (kind === "thin" && placed.w < 56) { finish(floors); return; }
      moving = spawn(placed);
      if (kind === "rush") speed += 7;
    }

    function update(dt) {
      clock += dt;
      var windPush = 0;
      if (kind === "wind") {
        wind = Math.sin(clock * 0.9) * 95;
        windPush = wind;
      }
      if (kind === "swing") {
        moving.x = W / 2 - moving.w / 2 + Math.sin(clock * 1.5) * 220;
      } else {
        moving.x += moving.dir * speed * dt + windPush * dt;
      }
      if (kind === "drift") moving.x += Math.sin(clock * 1.4) * 46 * dt;
      if (moving.x < 0) { moving.x = 0; moving.dir = 1; }
      if (moving.x + moving.w > W) { moving.x = W - moving.w; moving.dir = -1; }
      cam -= (Math.min(0, moving.y - H * 0.46) - cam) * Math.min(1, dt * 6);
      api.hud(kind === "perfect" ? perfects + " / 10" : floors + "",
        kind === "wind" ? Math.round(wind) + "" : Math.round(moving.w) + " px");
    }

    function draw() {
      api.bg();
      ctx.save();
      ctx.translate(0, -cam);
      var i;
      for (i = 0; i < blocks.length; i++) {
        var b = blocks[i];
        var isTop = i === blocks.length - 1;
        ctx.fillStyle = isTop ? api.accent : (i % 2 ? "rgba(148,163,184,0.5)" : "rgba(148,163,184,0.32)");
        rr(ctx, b.x, b.y, b.w, blockH - 3, 5); ctx.fill();
        if (isTop) {
          ctx.fillStyle = "rgba(255,255,255,0.28)";
          ctx.fillRect(b.x + 5, b.y + 4, b.w - 10, 3);
        }
      }
      ctx.fillStyle = "#f8fafc";
      rr(ctx, moving.x, moving.y, moving.w, blockH - 3, 5); ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(moving.x + 4, moving.y + blockH - 8, moving.w - 8, 2);
      ctx.restore();
      if (kind === "wind") {
        ctx.strokeStyle = "rgba(255,255,255,0.2)";
        ctx.lineWidth = 2;
        for (i = 0; i < 5; i++) {
          var y = 100 + i * 90;
          ctx.beginPath();
          ctx.moveTo(30, y);
          ctx.lineTo(30 + Math.abs(wind), y - 8);
          ctx.stroke();
        }
        api.text(wind < 0 ? "◀ GUST" : "GUST ▶", W / 2, 60, 18, "rgba(255,255,255,0.45)");
      }
      if (kind === "perfect") api.text(perfects + " PERFECT", W / 2, 60, 20, "rgba(255,255,255,0.55)");
      if (streak > 1) api.text("STREAK x" + streak, W / 2, H - 50, 16, "rgba(255,255,255,0.35)");
    }

    return {
      update: update,
      draw: draw,
      tap: drop,
      key: function (code) { if (code === "Space" || code === "Enter") drop(); },
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
