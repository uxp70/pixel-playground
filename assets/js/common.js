/* Shared helpers for every game on the site. No dependencies. */
(function () {
  "use strict";

  var SCORE_KEY = "pixel-playground:scores";
  var MUTE_KEY = "pixel-playground:muted";

  function readJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      /* private mode / quota — scores just won't persist */
    }
  }

  var scores = {
    all: function () {
      var data = readJSON(SCORE_KEY, {});
      return data && typeof data === "object" ? data : {};
    },
    get: function (id) {
      var value = this.all()[id];
      return typeof value === "number" && isFinite(value) ? value : null;
    },
    /** Store a score. mode "high" keeps the biggest, "low" the smallest. */
    save: function (id, value, mode) {
      if (typeof value !== "number" || !isFinite(value)) return null;
      var current = this.get(id);
      var lowerIsBetter = mode === "low";
      var better =
        current === null || (lowerIsBetter ? value < current : value > current);
      if (better) {
        var data = this.all();
        data[id] = value;
        writeJSON(SCORE_KEY, data);
        return value;
      }
      return current;
    },
  };

  /* ------------------------------------------------------------ leaderboard */

  var BOARD_KEY = "pixel-playground:board";
  var PLAYER_KEY = "pixel-playground:player";
  var RUNS_PER_GAME = 50;

  /* Every game that files runs declares how its score reads and ranks. */
  var GAME_META = {
    skyline: { label: "Skyline", mode: "high", unit: " floors" },
    snake: { label: "Snake", mode: "high", unit: " pts" },
    "2048": { label: "2048", mode: "high", unit: " pts" },
    breakout: { label: "Breakout", mode: "high", unit: " pts" },
    pong: { label: "Pong", mode: "high", unit: " hits" },
    memory: { label: "Memory Match", mode: "low", unit: " moves" },
    simon: { label: "Simon", mode: "high", unit: " rounds" },
    minesweeper: { label: "Minesweeper", mode: "low", unit: "s" },
    reaction: { label: "Reaction Test", mode: "low", unit: " ms" },
    prism: { label: "Prism", mode: "low", unit: " rotations" },
    blackout: { label: "Blackout", mode: "high", unit: " boards" },
  };

  var lastRun = null;

  /** Which game page are we on? Returns null on the hub and the board page. */
  function pageGameId() {
    var match = /\/games\/([a-z0-9-]+)\.html$/.exec(window.location.pathname || "");
    return match ? match[1] : null;
  }

  function runComp(a, b, mode) {
    if (a.score !== b.score) return mode === "low" ? a.score - b.score : b.score - a.score;
    return a.at - b.at;
  }

  function readRuns() {
    var data = readJSON(BOARD_KEY, []);
    if (!Array.isArray(data)) return [];
    return data.filter(function (run) {
      return run && typeof run.game === "string" && GAME_META[run.game] &&
        typeof run.score === "number" && isFinite(run.score);
    });
  }

  var leaderboard = {
    games: function () { return Object.keys(GAME_META); },

    meta: function (id) { return GAME_META[id] || null; },

    player: function () {
      try {
        var saved = localStorage.getItem(PLAYER_KEY);
        if (saved) return saved;
      } catch (err) { /* private mode — fall through */ }
      return "Player 1";
    },

    /** Remember a handle for future runs. Returns the cleaned name. */
    setPlayer: function (name) {
      var clean = String(name == null ? "" : name).replace(/\s+/g, " ").trim().slice(0, 14);
      if (!clean) clean = "Player 1";
      try { localStorage.setItem(PLAYER_KEY, clean); } catch (err) { /* ignore */ }
      return clean;
    },

    /** All runs for one game, best first. */
    runs: function (id) {
      var meta = GAME_META[id];
      if (!meta) return [];
      return readRuns()
        .filter(function (run) { return run.game === id; })
        .sort(function (a, b) { return runComp(a, b, meta.mode); });
    },

    top: function (id, count) {
      return this.runs(id).slice(0, count || 10);
    },

    best: function (id) {
      var runs = this.runs(id);
      return runs.length ? runs[0].score : null;
    },

    count: function (id) { return this.runs(id).length; },

    /** "1,240 pts" — ready to print. */
    describe: function (id, value) {
      var meta = GAME_META[id];
      return formatNumber(value) + (meta ? meta.unit : "");
    },

    /**
     * File one finished run and return { rank, total } so the game-over panel
     * can tell the player where they landed.
     */
    submit: function (id, score) {
      var meta = GAME_META[id];
      if (!meta) return null;
      if (typeof score !== "number" || !isFinite(score)) return null;

      var entry = { game: id, score: score, player: this.player(), at: Date.now() };
      var list = readRuns();

      var rank = 1;
      list.forEach(function (run) {
        if (run.game !== id) return;
        var ahead = run.score === score
          ? run.at < entry.at
          : (meta.mode === "low" ? run.score < score : run.score > score);
        if (ahead) rank++;
      });

      list.push(entry);

      // Keep the board small: the best runs per game survive the trim.
      var grouped = {};
      list.forEach(function (run) {
        if (!grouped[run.game]) grouped[run.game] = [];
        grouped[run.game].push(run);
      });
      var trimmed = [];
      var total = 0;
      Object.keys(grouped).forEach(function (key) {
        var mode = GAME_META[key].mode;
        grouped[key].sort(function (a, b) { return runComp(a, b, mode); });
        var keep = grouped[key].slice(0, RUNS_PER_GAME);
        if (key === id) total = keep.length;
        trimmed = trimmed.concat(keep);
      });
      writeJSON(BOARD_KEY, trimmed);

      lastRun = { game: id, score: score, rank: Math.min(rank, total), total: total };
      return lastRun;
    },

    /** Clear one game's runs, or the whole board when id is omitted. */
    clear: function (id) {
      if (!id) {
        writeJSON(BOARD_KEY, []);
        return;
      }
      writeJSON(BOARD_KEY, readRuns().filter(function (run) { return run.game !== id; }));
    },

    lastRun: function () { return lastRun; },
  };

  /* ------------------------------------------------------------------ audio */

  var audioCtx = null;

  function context() {
    if (audioCtx) return audioCtx;
    var Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    try {
      audioCtx = new Ctor();
    } catch (err) {
      audioCtx = null;
    }
    return audioCtx;
  }

  function isMuted() {
    return localStorage.getItem(MUTE_KEY) === "1";
  }

  /** One short tone. Returns immediately; does nothing when muted. */
  function tone(freq, ms, type, volume) {
    if (isMuted()) return;
    var ctx = context();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      try { ctx.resume(); } catch (err) { /* ignore */ }
    }
    try {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      var now = ctx.currentTime;
      var dur = (ms || 160) / 1000;
      osc.type = type || "sine";
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(volume || 0.07, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + dur + 0.02);
    } catch (err) {
      /* audio is a nice-to-have */
    }
  }

  /** Named UI blips. kind: "pick" | "good" | "bad" | "win" */
  function beep(kind) {
    if (kind === "good") {
      tone(659.25, 90, "sine", 0.055);
      setTimeout(function () { tone(987.77, 110, "sine", 0.04); }, 55);
      return;
    }
    if (kind === "win") {
      [523.25, 659.25, 783.99, 1046.5].forEach(function (freq, i) {
        setTimeout(function () { tone(freq, 240, "triangle", 0.055); }, i * 95);
      });
      return;
    }
    if (kind === "bad") {
      tone(196, 130, "sawtooth", 0.04);
      setTimeout(function () { tone(130.81, 190, "sawtooth", 0.035); }, 85);
      return;
    }
    var note = kind === "pick" ? [520, 60, "triangle", 0.05] : [440, 80, "sine", 0.05];
    tone(note[0], note[1], note[2], note[3]);
  }

  function bindMuteButton() {
    var btn = document.querySelector("[data-mute]");
    if (!btn) return;
    function paint() {
      var muted = isMuted();
      btn.textContent = muted ? "🔇" : "🔊";
      btn.setAttribute("aria-label", muted ? "Unmute sound" : "Mute sound");
      btn.setAttribute("aria-pressed", muted ? "true" : "false");
    }
    btn.addEventListener("click", function () {
      localStorage.setItem(MUTE_KEY, isMuted() ? "0" : "1");
      paint();
      if (!isMuted()) beep("pick");
    });
    paint();
  }

  /* --------------------------------------------------------------- utilities */

  /**
   * Size a canvas for crisp rendering: logical coordinates stay at w x h,
   * the backing store is scaled by devicePixelRatio.
   */
  function fitCanvas(canvas, w, h) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.aspectRatio = w + " / " + h;
    canvas.ppW = w;
    canvas.ppH = h;
    var ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  }

  function formatNumber(value) {
    if (value === null || value === undefined) return "—";
    return Number(value).toLocaleString("en-US");
  }

  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  /** Reveal an overlay element and set its contents. */
  function showOverlay(el, html) {
    if (!el) return;
    var note = "";
    var game = pageGameId();
    if (lastRun && game && lastRun.game === game) {
      note =
        '<p class="lb-note">' +
        (lastRun.rank === 1
          ? "New #1 on this device"
          : "#" + lastRun.rank + " of " + lastRun.total + " on this device") +
        ' · <a href="../leaderboard.html?game=' + encodeURIComponent(game) +
        '" style="color:#22d3ee;font-weight:700;text-decoration:none">Leaderboard →</a></p>';
    }
    el.innerHTML = '<div class="overlay-inner">' + html + note + "</div>";
    el.hidden = false;
  }

  function hideOverlay(el) {
    if (!el) return;
    el.hidden = true;
    el.innerHTML = "";
  }

  /** Keyboard arrow helper: calls handler(dx, dy) for arrow / WASD keys. */
  function onDirectionalKeys(handler) {
    var map = {
      ArrowUp: [0, -1], KeyW: [0, -1],
      ArrowDown: [0, 1], KeyS: [0, 1],
      ArrowLeft: [-1, 0], KeyA: [-1, 0],
      ArrowRight: [1, 0], KeyD: [1, 0],
    };
    document.addEventListener("keydown", function (event) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      var dir = map[event.code];
      if (!dir) return;
      event.preventDefault();
      handler(dir[0], dir[1], event);
    });
  }

  /** Swipe detection on an element. */
  function onSwipe(el, handler) {
    var startX = 0, startY = 0, tracking = false;
    el.addEventListener("pointerdown", function (event) {
      tracking = true;
      startX = event.clientX;
      startY = event.clientY;
    });
    el.addEventListener("pointerup", function (event) {
      if (!tracking) return;
      tracking = false;
      var dx = event.clientX - startX;
      var dy = event.clientY - startY;
      if (Math.hypot(dx, dy) < 24) return;
      if (Math.abs(dx) > Math.abs(dy)) handler(dx > 0 ? 1 : -1, 0);
      else handler(0, dy > 0 ? 1 : -1);
    });
    el.addEventListener("pointercancel", function () { tracking = false; });
  }

  /* -------------------------------------------------------------- fullscreen */

  /**
   * Add a fullscreen toggle to any game page. Real Fullscreen API where it
   * exists; on iPhone, where element fullscreen is unavailable, fall back to a
   * fixed, full-viewport layout with the same markup and behaviour.
   */
  function setupFullscreen() {
    var target = document.querySelector(".game-main");
    var head = document.querySelector(".game-head");
    if (!target || !head) return;

    var toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "icon-btn";
    toggle.setAttribute("data-fullscreen", "true");
    toggle.title = "Fullscreen (F)";
    head.appendChild(toggle);

    var exit = document.createElement("button");
    exit.type = "button";
    exit.className = "icon-btn fs-exit";
    exit.textContent = "✕";
    exit.setAttribute("aria-label", "Exit fullscreen");
    target.appendChild(exit);

    var pseudoOn = false;

    function active() {
      return !!document.fullscreenElement ||
        !!document.webkitFullscreenElement ||
        pseudoOn;
    }

    function paint() {
      var on = active();
      toggle.textContent = on ? "✕" : "⛶";
      toggle.setAttribute("aria-label", on ? "Exit fullscreen" : "Enter fullscreen");
      toggle.setAttribute("aria-pressed", on ? "true" : "false");
      exit.hidden = !on;
      document.documentElement.classList.toggle("is-fullscreen", on);
      document.body.classList.toggle("is-fullscreen", on);
      if (window.dispatchEvent && typeof CustomEvent === "function") {
        window.dispatchEvent(new CustomEvent("pp:fullscreenchange", { detail: { on: on } }));
      }
    }

    function setPseudo(on) {
      pseudoOn = on;
      target.classList.toggle("is-fullscreen", on);
      paint();
    }

    function request() {
      if (target.requestFullscreen) {
        var promise = target.requestFullscreen();
        if (promise && promise.then) {
          promise.then(paint).catch(function () { setPseudo(true); });
        } else {
          paint();
        }
      } else if (target.webkitRequestFullscreen) {
        try { target.webkitRequestFullscreen(); } catch (err) { setPseudo(true); }
        paint();
      } else {
        setPseudo(true);
      }
      beep("pick");
    }

    function release() {
      if (document.exitFullscreen) {
        var promise = document.exitFullscreen();
        if (promise && promise.catch) promise.catch(function () {});
      } else if (document.webkitExitFullscreen) {
        try { document.webkitExitFullscreen(); } catch (err) { /* ignore */ }
      }
      setPseudo(false);
      beep("pick");
    }

    toggle.addEventListener("click", function () {
      if (active()) release(); else request();
    });
    exit.addEventListener("click", release);

    ["fullscreenchange", "webkitfullscreenchange"].forEach(function (name) {
      document.addEventListener(name, paint);
    });

    document.addEventListener("keydown", function (event) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "Escape" && pseudoOn) setPseudo(false);
      if (event.key === "f" || event.key === "F") {
        event.preventDefault();
        if (active()) release(); else request();
      }
    });

    exit.hidden = true;
    paint();
  }

  /* ---------------------------------------------------- selection & gestures */

  function lockSurfaces() {
    document.addEventListener("contextmenu", function (event) {
      var el = event.target;
      if (el && el.closest && el.closest(
        ".stage, .dpad, .board2048, .memory-board, .simon-board, .mine-board, .reaction-pad, .icon-btn"
      )) {
        event.preventDefault();
      }
    });

    // Drag-selecting while playing is never intended.
    document.addEventListener("selectstart", function (event) {
      var el = event.target;
      if (!el || !el.closest) return;
      if (el.closest(".site-foot, .hint")) return;
      event.preventDefault();
    });
  }

  /* ------------------------------------------------------------- feel ----- */

  var reduceMotion = false;
  try {
    reduceMotion = !!(window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  } catch (err) {
    reduceMotion = false;
  }

  /** Short vibration. Silenced with the sound, skipped when motion is reduced. */
  function haptic(pattern) {
    if (isMuted() || reduceMotion) return;
    if (typeof navigator.vibrate !== "function") return;
    try { navigator.vibrate(pattern === undefined ? 12 : pattern); } catch (err) { /* ignore */ }
  }

  /** Quick positional shake, self-cleaning. */
  function shake(el, power) {
    if (!el || reduceMotion || !el.animate) return;
    var p = power === undefined ? 6 : power;
    el.animate(
      [
        { transform: "translate3d(0,0,0)" },
        { transform: "translate3d(" + -p + "px," + p * 0.6 + "px,0)" },
        { transform: "translate3d(" + p + "px," + -p * 0.5 + "px,0)" },
        { transform: "translate3d(" + -p * 0.4 + "px," + p * 0.2 + "px,0)" },
        { transform: "translate3d(0,0,0)" },
      ],
      { duration: 260, easing: "cubic-bezier(.36,.07,.19,.97)" }
    );
  }

  /** A counter pulses when its value changes. */
  function bump(el) {
    if (!el || reduceMotion) return;
    var target = el.tagName === "B" ? el : el.querySelector("b") || el;
    target.classList.remove("is-bumped");
    void target.offsetWidth;
    target.classList.add("is-bumped");
    setTimeout(function () { target.classList.remove("is-bumped"); }, 400);
  }

  function fxLayer() {
    var host = document.querySelector(".stage");
    if (!host) return null;
    var layer = host.querySelector(".fx");
    if (!layer) {
      layer = document.createElement("div");
      layer.className = "fx";
      layer.setAttribute("aria-hidden", "true");
      host.appendChild(layer);
    }
    return layer;
  }

  /** Spray sparks from a point given in host-local CSS pixels. */
  function burst(x, y, color, count, spread) {
    if (reduceMotion) return;
    var layer = fxLayer();
    if (!layer) return;
    var total = count || 10;
    var reach = spread || 46;
    for (var i = 0; i < total; i++) {
      var spark = document.createElement("i");
      var angle = (Math.PI * 2 * i) / total + Math.random() * 0.7;
      var distance = reach * (0.4 + Math.random() * 0.8);
      var size = 3 + Math.random() * 4;
      spark.style.left = x + "px";
      spark.style.top = y + "px";
      spark.style.width = size + "px";
      spark.style.height = size + "px";
      spark.style.background = color || "#22d3ee";
      layer.appendChild(spark);
      if (!spark.animate) { spark.remove(); continue; }
      var anim = spark.animate(
        [
          { transform: "translate(-50%,-50%) scale(1)", opacity: 0.95 },
          {
            transform: "translate(-50%,-50%) translate(" +
              Math.cos(angle) * distance + "px," + Math.sin(angle) * distance +
              "px) scale(0.15)",
            opacity: 0,
          },
        ],
        { duration: 380 + Math.random() * 280, easing: "cubic-bezier(.2,.7,.3,1)" }
      );
      anim.onfinish = (function (node) {
        return function () { node.remove(); };
      })(spark);
    }
  }

  function burstFromRect(rect, hostRect, color, count, spread) {
    burst(rect.left - hostRect.left + rect.width / 2,
      rect.top - hostRect.top + rect.height / 2, color, count, spread);
  }

  /** Sparks from the centre of a DOM element (board tiles, cards, pads). */
  function burstAt(el, color, count, spread) {
    if (!el || reduceMotion || !el.getBoundingClientRect) return;
    var host = document.querySelector(".stage");
    if (!host) return;
    burstFromRect(el.getBoundingClientRect(), host.getBoundingClientRect(),
      color, count, spread);
  }

  /** Sparks at a point in a canvas's logical coordinate space. */
  function burstOn(canvas, x, y, color, count, spread) {
    if (!canvas || reduceMotion) return;
    var host = document.querySelector(".stage");
    if (!host) return;
    var rect = canvas.getBoundingClientRect();
    var hostRect = host.getBoundingClientRect();
    var w = canvas.ppW || rect.width;
    var h = canvas.ppH || rect.height;
    var scale = Math.min(rect.width / w, rect.height / h);
    burst(rect.left - hostRect.left + x * scale,
      rect.top - hostRect.top + y * scale, color, count, spread);
  }

  window.PP = {
    juice: {
      haptic: haptic,
      shake: shake,
      bump: bump,
      burst: burst,
      burstAt: burstAt,
      burstOn: burstOn,
    },
    scores: scores,
    leaderboard: leaderboard,
    sfx: beep,
    tone: tone,
    muted: isMuted,
    fitCanvas: fitCanvas,
    formatNumber: formatNumber,
    escapeHtml: escapeHtml,
    showOverlay: showOverlay,
    hideOverlay: hideOverlay,
    onDirectionalKeys: onDirectionalKeys,
    onSwipe: onSwipe,
    setupFullscreen: setupFullscreen,
  };

  function boot() {
    bindMuteButton();
    setupFullscreen();
    lockSurfaces();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
