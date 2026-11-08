/* Flash family — eleven memory games with different boards and rules. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, near = K.near, rr = K.roundRect;

  var MODES = [
    { name: "Echo Grid", kind: "seq", size: 3, hudA: "Rounds", hudB: "Step", pattern: "grid" },
    { name: "Glow Sequence", kind: "seq", size: 4, hudA: "Rounds", hudB: "Step", pattern: "stars" },
    { name: "Light Order", kind: "seq", size: 3, numbers: true, hudA: "Rounds", hudB: "Step", pattern: "bands" },
    { name: "Signal Path", kind: "path", size: 4, hudA: "Rounds", hudB: "Step", pattern: "grid" },
    { name: "Pulse Recall", kind: "seq", size: 3, fast: true, hudA: "Rounds", hudB: "Step", pattern: "beams" },
    { name: "Cipher Lights", kind: "cipher", size: 3, hudA: "Codes", hudB: "Step", pattern: "scan" },
    { name: "Neon Memory", kind: "rotate", size: 4, hudA: "Rounds", hudB: "Turn", pattern: "dots" },
    { name: "Pattern Loop", kind: "change", size: 4, hudA: "Spots", hudB: "Time", pattern: "waves" },
    { name: "Flash Code", kind: "colors", hudA: "Codes", hudB: "Step", pattern: "rain" },
    { name: "Grid Echo", kind: "mirror", size: 3, hudA: "Rounds", hudB: "Step", pattern: "bricks" },
    { name: "Memory Tide", kind: "seq", size: 4, lives: 3, fast: true, hudA: "Rounds", hudB: "Lives", pattern: "stars" },
  ];

  var COLORS = ["#22d3ee", "#f472b6", "#a3e635", "#fbbf24"];

  function make(api) {
    var m = api.mode;
    var kind = m.kind;
    var ctx = api.ctx;
    var size = m.size || 3;
    var cell = kind === "colors" ? 0 : Math.min(120, (W - 120) / size);
    var gap = 12;
    if (kind === "mirror") { cell = 72; gap = 8; }
    var boardW = size * cell + (size - 1) * gap;
    var bx = kind === "mirror" ? 30 : (W - boardW) / 2;
    var by = kind === "mirror" ? 150 : 120;
    var seq = [];
    var phase = "show";
    var shown = 0;
    var lit = -1;
    var litFor = 0;
    var wait = 0.6;
    var rounds = 0;
    var inputAt = 0;
    var lives = m.lives || 0;
    var rotation = 0;
    var changeTimer = 0;
    var changeIndex = -1;
    var targetIndex = -1;
    var cipherMap = [];
    var colorSeq = [];
    var colorAt = 0;

    function mapIndex(i) {
      if (kind !== "rotate" || rotation === 0) return i;
      var x = i % size;
      var y = Math.floor(i / size);
      var nx = size - 1 - y;
      var ny = x;
      for (var r = 1; r < rotation; r++) {
        var tx = size - 1 - ny;
        ny = nx;
        nx = tx;
      }
      return ny * size + nx;
    }

    function padRect(i, offsetX) {
      return {
        x: bx + (offsetX || 0) + (i % size) * (cell + gap),
        y: by + Math.floor(i / size) * (cell + gap),
        w: cell,
        h: cell,
      };
    }

    function padAt(i, x0) {
      return {
        x: x0 + (i % size) * (cell + gap),
        y: by + Math.floor(i / size) * (cell + gap),
        w: cell,
        h: cell,
      };
    }

    function pushSeq() {
      if (kind === "path" && seq.length) {
        var last = seq[seq.length - 1];
        var lx = last % size;
        var ly = Math.floor(last / size);
        var options = [];
        if (lx > 0) options.push(last - 1);
        if (lx < size - 1) options.push(last + 1);
        if (ly > 0) options.push(last - size);
        if (ly < size - 1) options.push(last + size);
        seq.push(options[Math.floor(rand(0, options.length))]);
        return;
      }
      seq.push(Math.floor(rand(0, size * size)));
    }

    function resetShow() {
      phase = "show";
      shown = 0;
      wait = 0.55;
      lit = -1;
      inputAt = 0;
      if (kind === "change") changeTimer = 1.5;
    }

    function lose() {
      if (lives > 1) {
        lives--;
        resetShow();
        seq = [];
        pushSeq();
        api.sfx("bad");
        api.shake(8);
        return;
      }
      api.sfx("bad");
      api.shake(9);
      api.haptic([20, 45, 30]);
      api.finish(rounds);
    }

    if (kind === "change") {
      seq = [];
      for (var i = 0; i < 5; i++) seq.push(Math.floor(rand(0, size * size)));
      changeTimer = 1.8;
    } else if (kind === "colors") {
      colorSeq = [Math.floor(rand(0, 4))];
      phase = "show";
      shown = 0;
    } else {
      pushSeq();
      pushSeq();
      pushSeq();
      if (kind === "cipher") {
        cipherMap = [0, 1, 2, 3, 4, 5, 6, 7, 8].sort(function () { return Math.random() - 0.5; });
      }
    }

    function update(dt) {
      if (litFor > 0) {
        litFor -= dt;
        if (litFor <= 0) { lit = -1; wait = m.fast ? 0.12 : 0.3; }
        api.hud(rounds, kind === "colors" ? "Watch" : "Watch");
        return;
      }
      if (kind === "change") {
        changeTimer -= dt;
        if (phase === "show" && changeTimer <= 0) {
          phase = "input";
          changeIndex = Math.floor(rand(0, size * size));
          targetIndex = changeIndex;
          if (seq.indexOf(changeIndex) === -1) {
            var swap = seq[Math.floor(rand(0, seq.length))];
            seq[seq.indexOf(swap)] = changeIndex;
          }
          api.hud(rounds, "Spot it");
        } else if (phase === "input") {
          api.hud(rounds, "Spot it");
        }
        if (changeTimer < -2.2 && phase === "input") {
          lose();
        }
        return;
      }

      if (kind === "colors") {
        if (phase === "show") {
          if (wait > 0) { wait -= dt; api.hud(rounds, "Watch"); return; }
          if (shown < colorSeq.length) {
            lit = colorSeq[shown];
            shown++;
            litFor = 0.4;
            api.sfx("pick");
            return;
          }
          phase = "input";
          colorAt = 0;
          api.hud(rounds, "Repeat");
          return;
        }
        api.hud(rounds, "Repeat");
        return;
      }

      if (phase !== "show") {
        api.hud(rounds, kind === "rotate" ? "Turn " + rotation : "Your turn");
        return;
      }
      if (wait > 0) {
        wait -= dt;
        api.hud(rounds, "Watch");
        return;
      }
      if (shown < seq.length) {
        lit = kind === "rotate" ? mapIndex(seq[shown]) : seq[shown];
        shown++;
        litFor = m.fast ? 0.18 : 0.32;
        api.sfx("pick");
        return;
      }
      phase = "input";
      inputAt = 0;
      api.hud(rounds, "Your turn");
    }

    function drawColors() {
      for (var i = 0; i < 4; i++) {
        var x = W / 2 + (i % 2 ? 95 : -95);
        var y = 240 + Math.floor(i / 2) * 130;
        ctx.fillStyle = lit === i ? COLORS[i] : "rgba(255,255,255,0.08)";
        ctx.beginPath(); ctx.arc(x, y, 58, 0, Math.PI * 2); ctx.fill();
        if (lit === i) {
          ctx.strokeStyle = "rgba(255,255,255,0.8)";
          ctx.lineWidth = 4;
          ctx.stroke();
        }
      }
      var left = colorSeq.length - colorAt;
      api.text("REPEAT  " + Math.max(0, left), W / 2, 520, 20, "rgba(255,255,255,0.55)");
    }

    function draw() {
      api.bg();
      var i;
      if (kind === "colors") { drawColors(); return; }

      if (kind === "change") {
        ctx.fillStyle = "rgba(255,255,255,0.05)";
        rr(ctx, bx - 14, by - 14, boardW + 28, boardW + 28, 20); ctx.fill();
        for (i = 0; i < size * size; i++) {
          var cr = padRect(i);
          var active = seq.indexOf(i) !== -1;
          ctx.fillStyle = active ? (phase === "input" && i === targetIndex ? api.accent : "rgba(255,255,255,0.45)") : "rgba(255,255,255,0.05)";
          rr(ctx, cr.x, cr.y, cr.w, cr.h, 14); ctx.fill();
        }
        api.text(phase === "show" ? "MEMORISE" : "TAP THE CHANGED CELL", W / 2, 560, 18, "rgba(255,255,255,0.55)");
        return;
      }

      if (kind === "mirror") {
        var leftX = 30;
        var rightX = W - 30 - boardW;
        ctx.fillStyle = "rgba(255,255,255,0.04)";
        rr(ctx, leftX - 10, by - 10, boardW + 20, boardW + 20, 18); ctx.fill();
        rr(ctx, rightX - 10, by - 10, boardW + 20, boardW + 20, 18); ctx.fill();
        for (i = 0; i < size * size; i++) {
          var lr = padAt(i, leftX);
          var rr2 = padAt(i, rightX);
          ctx.fillStyle = lit === i ? api.accent : "rgba(255,255,255,0.07)";
          rr(ctx, lr.x, lr.y, lr.w, lr.h, 12); ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,0.07)";
          rr(ctx, rr2.x, rr2.y, rr2.w, rr2.h, 12); ctx.fill();
        }
        api.text("WATCH LEFT", leftX + boardW / 2, 110, 18, "rgba(255,255,255,0.5)");
        api.text("TAP RIGHT", rightX + boardW / 2, 110, 18, "rgba(255,255,255,0.5)");
        return;
      }

      for (i = 0; i < size * size; i++) {
        var r = padRect(i);
        var on = lit === i;
        ctx.fillStyle = on ? api.accent : "rgba(255,255,255,0.07)";
        rr(ctx, r.x, r.y, r.w, r.h, 16); ctx.fill();
        if (on) {
          ctx.strokeStyle = "rgba(255,255,255,0.8)";
          ctx.lineWidth = 3;
          ctx.stroke();
        }
        if (m.numbers) {
          api.text(String(i + 1), r.x + r.w / 2, r.y + r.h / 2, 30, on ? "#06121a" : "rgba(255,255,255,0.45)");
        }
        if (kind === "cipher") {
          api.text(String(cipherMap[i] + 1), r.x + r.w / 2, r.y + r.h / 2, 32, on ? "#06121a" : "rgba(255,255,255,0.4)");
        }
      }
      if (kind === "cipher") {
        var code = seq.map(function (v) { return cipherMap[v] + 1; }).join(" ");
        api.text(code, W / 2, 72, 24, "rgba(255,255,255,0.55)");
      } else {
        api.text(phase === "show" ? "WATCH" : "REPEAT", W / 2, 72, 22, "rgba(255,255,255,0.5)");
      }
    }

    function hitPad(i) {
      if (litFor > 0) return;
      if (kind === "change") {
        if (phase !== "input") return;
        if (i === targetIndex) {
          rounds++;
          api.sfx("good");
          api.haptic(10);
          phase = "show";
          changeTimer = 1.5;
          seq = [];
          for (var q = 0; q < 5; q++) seq.push(Math.floor(rand(0, size * size)));
          api.hud(rounds, "Memorise");
        } else {
          api.sfx("bad");
          api.shake(6);
          changeTimer = -2.5;
        }
        return;
      }
      if (kind === "colors") {
        if (phase !== "input") return;
        if (colorSeq[colorAt] === i) {
          colorAt++;
          lit = i;
          litFor = 0.14;
          api.sfx("pick");
          if (colorAt >= colorSeq.length) {
            rounds++;
            colorSeq.push(Math.floor(rand(0, 4)));
            resetShow();
            api.sfx("win");
          }
        } else lose();
        return;
      }
      if (phase !== "input") return;
      var expected = kind === "rotate" ? mapIndex(seq[inputAt]) : seq[inputAt];
      var mapped = kind === "mirror" ? i : i;
      if (expected === mapped) {
        lit = i;
        litFor = 0.12;
        inputAt++;
        api.sfx("pick");
        api.haptic(5);
        if (inputAt >= seq.length) {
          rounds++;
          pushSeq();
          if (kind === "rotate") rotation = (rotation + 1) % 4;
          resetShow();
          api.sfx("good");
        }
      } else {
        lose();
      }
    }

    function tap(x, y) {
      var i;
      if (kind === "colors") {
        for (i = 0; i < 4; i++) {
          var cx = W / 2 + (i % 2 ? 95 : -95);
          var cy = 240 + Math.floor(i / 2) * 130;
          if (near(x, y, 2, cx, cy, 60)) { hitPad(i); return; }
        }
        return;
      }
      if (kind === "mirror") {
        var rightGridX = W - 30 - boardW;
        for (i = 0; i < size * size; i++) {
          var r = padAt(i, rightGridX);
          if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) { hitPad(i); return; }
        }
        return;
      }
      for (i = 0; i < size * size; i++) {
        var rect = padRect(i);
        if (x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h) {
          if (kind === "rotate") {
            var found = -1;
            for (var j = 0; j < size * size; j++) if (mapIndex(j) === i) found = j;
            hitPad(found);
          } else {
            hitPad(i);
          }
          return;
        }
      }
    }

    function key(code) {
      var digit = /^Digit([1-9])$/.exec(code);
      if (!digit) return;
      hitPad(Number(digit[1]) - 1);
    }

    return { update: update, draw: draw, tap: tap, key: key };
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
