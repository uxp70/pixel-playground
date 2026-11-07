/* Cabinet runner for the 110 generated games.

   Each engine registers itself through PP_KIT.register(id, definition) from
   assets/js/kits/*.js. A definition is { modes: [11], make(api) } where every
   mode is a different game, not a difficulty tier. The runner owns the canvas,
   input, overlays, scoring and the frame loop. */
(function () {
  "use strict";

  var W = 600;
  var H = 600;
  var KITS = {};

  function rand(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function near(x1, y1, r1, x2, y2, r2) {
    var dx = x1 - x2;
    var dy = y1 - y2;
    var reach = r1 + r2;
    return dx * dx + dy * dy <= reach * reach;
  }
  function roundRect(ctx, x, y, w, h, r) {
    var rad = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
  }
  function register(id, def) {
    if (id && def && def.make && def.modes) KITS[id] = def;
  }

  window.PP_KITS = KITS;
  window.PP_KIT = {
    W: W, H: H, rand: rand, clamp: clamp, near: near,
    roundRect: roundRect, register: register,
  };

  /* ------------------------------------------------------------- backdrop --- */

  function hash(n) {
    var x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  function mix(hex, base, amount) {
    var a = /^#?([0-9a-f]{6})$/i.exec(hex || "");
    var b = /^#?([0-9a-f]{6})$/i.exec(base || "#070a14");
    if (!a || !b) return base || "#070a14";
    var out = "#";
    for (var i = 1; i < 7; i += 2) {
      var av = parseInt(a[1].slice(i - 1, i + 1), 16);
      var bv = parseInt(b[1].slice(i - 1, i + 1), 16);
      var value = Math.round(av * amount + bv * (1 - amount));
      out += ("0" + value.toString(16)).slice(-2);
    }
    return out;
  }

  function paintPattern(ctx, kind, accent, t) {
    ctx.save();
    ctx.strokeStyle = accent;
    ctx.fillStyle = accent;
    ctx.lineWidth = 1;
    var i;
    if (kind === "grid") {
      ctx.globalAlpha = 0.055;
      var off = (t * 14) % 48;
      for (i = -48; i < W + 48; i += 48) {
        ctx.beginPath(); ctx.moveTo(i + off, 0); ctx.lineTo(i + off, H); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i + off); ctx.lineTo(W, i + off); ctx.stroke();
      }
    } else if (kind === "dots") {
      ctx.globalAlpha = 0.09;
      for (var y = 24; y < H; y += 46) {
        for (var x = 24; x < W; x += 46) {
          ctx.beginPath(); ctx.arc(x, y, 1.7, 0, Math.PI * 2); ctx.fill();
        }
      }
    } else if (kind === "stars") {
      for (i = 0; i < 70; i++) {
        var sx = hash(i) * W;
        var sy = hash(i + 91) * H;
        var tw = 0.15 + 0.5 * (0.5 + 0.5 * Math.sin(t * 1.7 + i));
        ctx.globalAlpha = tw * 0.5;
        ctx.fillRect(sx, sy, 1.8, 1.8);
      }
    } else if (kind === "rain") {
      ctx.globalAlpha = 0.12;
      for (i = 0; i < 42; i++) {
        var rx = (hash(i) * W + t * 40 * (0.4 + hash(i + 7))) % (W + 80) - 40;
        var ry = (hash(i + 31) * H + t * 230 * (0.5 + hash(i + 5))) % (H + 90) - 45;
        ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + 9, ry + 22); ctx.stroke();
      }
    } else if (kind === "bands") {
      ctx.globalAlpha = 0.05;
      for (i = 0; i < H; i += 64) {
        ctx.fillRect(0, i + (t * 8) % 64, W, 22);
      }
    } else if (kind === "scan") {
      ctx.globalAlpha = 0.07;
      var band = (t * 90) % (H + 160) - 80;
      ctx.fillRect(0, band, W, 46);
      ctx.globalAlpha = 0.04;
      for (i = 0; i < H; i += 6) ctx.fillRect(0, i, W, 1);
    } else if (kind === "bricks") {
      ctx.globalAlpha = 0.06;
      for (var by = 0; by < H; by += 46) {
        var shift = (Math.floor(by / 46) % 2) * 38;
        for (var bx = -76; bx < W; bx += 76) {
          ctx.strokeRect(bx + shift, by, 72, 42);
        }
      }
    } else if (kind === "beams") {
      ctx.globalAlpha = 0.08;
      for (i = 0; i < 6; i++) {
        var lx = (i * 137 + t * 22) % (W + 200) - 100;
        var grad = ctx.createLinearGradient(lx, 0, lx + 70, 0);
        grad.addColorStop(0, "rgba(255,255,255,0)");
        grad.addColorStop(0.5, accent);
        grad.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = grad;
        ctx.fillRect(lx, 0, 70, H);
        ctx.fillStyle = accent;
      }
    } else if (kind === "waves") {
      ctx.globalAlpha = 0.08;
      for (var row = 0; row < 7; row++) {
        ctx.beginPath();
        for (var wx = 0; wx <= W; wx += 12) {
          var wy = 70 + row * 80 + Math.sin(wx * 0.018 + t * 1.2 + row) * 16;
          if (wx === 0) ctx.moveTo(wx, wy); else ctx.lineTo(wx, wy);
        }
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function boot() {
    var canvas = document.getElementById("board");
    if (!canvas) return;

    var overlay = document.getElementById("overlay");
    var stage = document.querySelector(".stage") || canvas;
    var titleEl = document.getElementById("game-title");
    var crumbEl = document.getElementById("game-crumb");
    var hintEl = document.getElementById("game-hint");
    var bestEl = document.getElementById("best");
    var hudA = document.getElementById("hudA");
    var hudB = document.getElementById("hudB");
    var hudALabel = document.getElementById("hudALabel");
    var hudBLabel = document.getElementById("hudBLabel");

    var match = /[?&]g=([a-z0-9-]+)/i.exec(window.location.search || "");
    var id = match ? match[1].toLowerCase() : "";
    var game = window.PP_GAME_BY_ID ? window.PP_GAME_BY_ID[id] : null;
    var kitFactory = game ? KITS[game.kit] : null;

    if (!game || !kitFactory) {
      if (titleEl) titleEl.textContent = "Not found";
      PP.showOverlay(overlay,
        '<p class="kicker">404</p><h2>No such game</h2>' +
        '<p class="overlay-copy">That id is not in the catalogue, or its engine did not load.</p>' +
        '<div class="actions"><a class="btn" href="../index.html">Back to the arcade</a></div>');
      return;
    }

    var level = game.level || 1;
    var mode = kitFactory.modes[level - 1] || kitFactory.modes[0] || {};
    var modeName = mode.name || game.title;
    var modeRule = mode.rule || game.rule || "";
    var controls = mode.controls || game.controls || "Tap to play";

    document.title = game.title + " — Pixel Playground";
    if (titleEl) titleEl.textContent = game.title;
    if (crumbEl) {
      crumbEl.textContent = game.emoji + " " + game.category + " · " + modeName;
    }
    if (hintEl) hintEl.textContent = controls;
    if (hudALabel) hudALabel.textContent = mode.hudA || "Score";
    if (hudBLabel) hudBLabel.textContent = mode.hudB || "Detail";

    var best = PP.scores.get(game.id);
    function paintBest() {
      if (bestEl) bestEl.textContent = PP.formatNumber(best === null ? 0 : best);
    }
    paintBest();

    var ctx = PP.fitCanvas(canvas, W, H);
    var kit = null;
    var running = false;
    var paused = false;
    var ended = false;
    var booted = true;

    var api = {
      W: W, H: H,
      ctx: ctx,
      level: level,
      accent: game.accent,
      mode: mode,
      game: game,
      elapsed: 0,
      px: W / 2,
      py: H / 2,
      keys: {},
      ended: false,
      hud: function (a, b) {
        if (hudA) hudA.textContent = a;
        if (hudB) hudB.textContent = b;
      },
      bg: function (c1, c2) {
        var top = c1 || mix(game.accent, "#0b1020", 0.16);
        var bottom = c2 || mix(game.accent, "#05070d", 0.04);
        var grad = ctx.createLinearGradient(0, 0, W * 0.55, H);
        grad.addColorStop(0, top);
        grad.addColorStop(1, bottom);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
        paintPattern(ctx, mode.pattern || "grid", game.accent, api.elapsed);
      },
      text: function (str, x, y, size, color, weight) {
        ctx.fillStyle = color || "#f8fafc";
        ctx.font = (weight || 800) + " " + size + "px ui-sans-serif, system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(str, x, y);
      },
      burst: function (x, y, color, n) {
        PP.juice.burstOn(canvas, x, y, color || game.accent, n || 10, 56);
      },
      shake: function (px) { PP.juice.shake(stage, px || 6); },
      sfx: function (kind) { PP.sfx(kind); },
      haptic: function (pattern) { PP.juice.haptic(pattern); },
      finish: finish,
    };

    function begin() {
      PP.hideOverlay(overlay);
      api.elapsed = 0;
      api.ended = false;
      for (var key in api.keys) delete api.keys[key];
      kit = kitFactory.make(api);
      ended = false;
      paused = false;
      running = true;
      last = 0;
      if (hudA) hudA.textContent = "0";
      if (hudB) hudB.textContent = "—";
      paintBest();
      if (canvas.focus) canvas.focus();
    }

    function finish(score) {
      if (ended) return;
      ended = true;
      running = false;
      paused = false;
      api.ended = true;

      var value = Math.max(0, Math.round(score));
      best = PP.scores.save(game.id, value, game.mode);
      paintBest();
      var result = PP.leaderboard.submit(game.id, value);
      PP.sfx(game.mode === "low" ? "good" : "win");

      var unit = game.unit || "";
      var bestLine = PP.formatNumber(best) + unit;
      PP.showOverlay(overlay,
        '<p class="kicker">' + game.emoji + " " + modeName + "</p>" +
        "<h2>" + PP.formatNumber(value) + unit + "</h2>" +
        '<p class="overlay-copy">' + (modeRule || game.blurb) + "</p>" +
        '<p class="overlay-copy">Best on this device: ' + bestLine + "</p>" +
        '<div class="actions">' +
        '<button class="btn" id="againBtn">Play again</button>' +
        '<a class="btn btn-ghost" href="../index.html">Arcade</a>' +
        "</div>");

      var again = document.getElementById("againBtn");
      if (again) again.addEventListener("click", begin);
    }

    function pause() {
      if (!running || paused || ended) return;
      paused = true;
      running = false;
      PP.showOverlay(overlay,
        '<p class="kicker">Paused</p><h2>' + game.title + "</h2>" +
        '<p class="overlay-copy">The run is still here. Resume where you left off, or start over.</p>' +
        '<div class="actions">' +
        '<button class="btn" id="resumeBtn">Resume</button>' +
        '<button class="btn btn-ghost" id="restartBtn">Start over</button>' +
        "</div>");
      var resumeBtn = document.getElementById("resumeBtn");
      if (resumeBtn) resumeBtn.addEventListener("click", function () {
        paused = false;
        running = true;
        last = 0;
        PP.hideOverlay(overlay);
        if (canvas.focus) canvas.focus();
      });
      var restart = document.getElementById("restartBtn");
      if (restart) restart.addEventListener("click", begin);
    }

    function startScreen() {
      PP.showOverlay(overlay,
        '<p class="kicker">' + game.emoji + " " + game.category + " · " + modeName + "</p>" +
        "<h2>" + game.title + "</h2>" +
        '<p class="overlay-copy">' + game.blurb + "</p>" +
        '<p class="overlay-hint">' + controls +
        " · best " + PP.formatNumber(best === null ? 0 : best) + (game.unit || "") + "</p>" +
        '<div class="actions">' +
        '<button class="btn" id="playBtn">Play</button>' +
        '<a class="btn btn-ghost" href="../index.html">Arcade</a>' +
        "</div>");
      var play = document.getElementById("playBtn");
      if (play) play.addEventListener("click", begin);
    }

    function logical(event) {
      var rect = canvas.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) / Math.max(1, rect.width)) * W,
        y: ((event.clientY - rect.top) / Math.max(1, rect.height)) * H,
      };
    }

    var downX = 0, downY = 0, pointerDown = false;

    canvas.addEventListener("pointerdown", function (event) {
      if (!running || !kit) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      var point = logical(event);
      downX = point.x;
      downY = point.y;
      pointerDown = true;
      api.px = point.x;
      api.py = point.y;
      try { canvas.setPointerCapture(event.pointerId); } catch (err) { /* older browsers */ }
      if (kit.down) kit.down(point.x, point.y);
    });

    canvas.addEventListener("pointermove", function (event) {
      if (!running || !kit) return;
      var point = logical(event);
      api.px = point.x;
      api.py = point.y;
      if (!kit.move) return;
      if (event.pointerType === "mouse" || pointerDown) kit.move(point.x, point.y);
    });

    canvas.addEventListener("pointerup", function (event) {
      if (!pointerDown) return;
      pointerDown = false;
      if (!running || !kit) return;
      var point = logical(event);
      var dx = point.x - downX;
      var dy = point.y - downY;
      var isSwipe = Math.hypot(dx, dy) >= 34;
      try { canvas.releasePointerCapture(event.pointerId); } catch (err) { /* ignore */ }
      if (isSwipe && kit.swipe) {
        kit.swipe(dx > 0 ? 1 : -1, dy > 0 ? 1 : -1);
        return;
      }
      if (kit.tap) kit.tap(point.x, point.y);
    });

    canvas.addEventListener("pointercancel", function () {
      pointerDown = false;
    });

    var blocked = { ArrowUp: 1, ArrowDown: 1, ArrowLeft: 1, ArrowRight: 1, Space: 1 };

    document.addEventListener("keydown", function (event) {
      if (blocked[event.code]) event.preventDefault();
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (!running) {
        if (event.code !== "Enter" && event.code !== "Space") return;
        var active = document.activeElement;
        if (active && (active.tagName === "BUTTON" || active.tagName === "A")) return;
        var primary = overlay ? overlay.querySelector("button.btn") : null;
        if (primary) { event.preventDefault(); primary.click(); }
        return;
      }
      api.keys[event.code] = true;
      if (!kit || !kit.key) return;
      if (event.repeat) return;
      kit.key(event.code);
    });

    document.addEventListener("keyup", function (event) {
      api.keys[event.code] = false;
    });

    document.addEventListener("visibilitychange", function () {
      if (document.hidden && running) pause();
    });

    kit = kitFactory.make(api);
    startScreen();

    var last = 0;
    function frame(time) {
      window.requestAnimationFrame(frame);
      if (!last) last = time;
      var dt = Math.min((time - last) / 1000, 0.05);
      last = time;
      if (running && !ended) {
        api.elapsed += dt;
        kit.update(dt);
      }
      if (kit && kit.draw) kit.draw();
    }
    window.requestAnimationFrame(frame);
  }

  function start() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", boot);
    } else {
      window.setTimeout(boot, 0);
    }
  }
  start();
})();
