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

  /**
   * Score metadata for any game id: the hand-written eleven first, then the
   * generated catalogue (games-data.js, which loads after this file).
   */
  function gameMeta(id) {
    if (GAME_META[id]) return GAME_META[id];
    var entry = window.PP_GAME_BY_ID ? window.PP_GAME_BY_ID[id] : null;
    return entry ? { label: entry.title, mode: entry.mode, unit: entry.unit } : null;
  }

  function catalogueIds() {
    if (window.PP_GAMES && window.PP_GAMES.length) {
      return window.PP_GAMES.map(function (game) { return game.id; });
    }
    return Object.keys(GAME_META);
  }

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
      return run && typeof run.game === "string" && gameMeta(run.game) &&
        typeof run.score === "number" && isFinite(run.score);
    });
  }

  var leaderboard = {
    games: function () { return catalogueIds(); },

    meta: function (id) { return gameMeta(id); },

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
      var meta = gameMeta(id);
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
      var meta = gameMeta(id);
      return formatNumber(value) + (meta ? meta.unit : "");
    },

    /**
     * File one finished run and return { rank, total } so the game-over panel
     * can tell the player where they landed.
     */
    submit: function (id, score) {
      var meta = gameMeta(id);
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
        var mode = gameMeta(key).mode;
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

  /* ------------------------------------------------------------------ music */

  /*
   * A small procedural loop — no audio files, no network. Four bars of a slow
   * minor progression over a soft kick, hats, bass and arpeggio. Browsers only
   * allow audio after a gesture, so the loop arms itself and starts on the first
   * tap or key press. The ♫ button in the header turns it off for good.
   */

  var MUSIC_KEY = "pixel-playground:music";
  var MUSIC_GAIN = 0.5;
  var BPM = 92;
  var STEP = 60 / BPM / 4;
  var PROGRESSION = [
    { pad: [57, 60, 64, 67], bass: 45 },
    { pad: [53, 57, 60, 64], bass: 41 },
    { pad: [48, 55, 60, 64], bass: 36 },
    { pad: [55, 59, 62, 67], bass: 43 },
  ];
  var ARP = [0, 2, 1, 3, 2, 3, 1, 0];

  var music = {
    enabled: true,
    started: false,
    gain: null,
    timer: null,
    step: 0,
    next: 0,
    noise: null,
  };

  function musicPref() {
    try { return localStorage.getItem(MUSIC_KEY) !== "0"; } catch (err) { return true; }
  }

  function hz(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }

  function musicBus() {
    var ctx = context();
    if (!ctx) return null;
    if (!music.gain) {
      music.gain = ctx.createGain();
      music.gain.gain.value = MUSIC_GAIN;
      music.gain.connect(ctx.destination);
    }
    return ctx;
  }

  function noiseBuffer(ctx) {
    if (music.noise) return music.noise;
    var length = Math.floor(ctx.sampleRate * 0.35);
    var buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    }
    music.noise = buffer;
    return buffer;
  }

  function voice(freq, at, dur, type, level) {
    var ctx = context();
    if (!ctx || !music.gain) return;
    try {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, at);
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(level, at + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      osc.connect(gain).connect(music.gain);
      osc.start(at);
      osc.stop(at + dur + 0.05);
    } catch (err) { /* ignore */ }
  }

  function thump(at) {
    var ctx = context();
    if (!ctx || !music.gain) return;
    try {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(132, at);
      osc.frequency.exponentialRampToValueAtTime(46, at + 0.17);
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.16, at + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.22);
      osc.connect(gain).connect(music.gain);
      osc.start(at);
      osc.stop(at + 0.26);
    } catch (err) { /* ignore */ }
  }

  function hiss(at, level) {
    var ctx = context();
    if (!ctx || !music.gain) return;
    try {
      var src = ctx.createBufferSource();
      src.buffer = noiseBuffer(ctx);
      var filter = ctx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.value = 6200;
      var gain = ctx.createGain();
      gain.gain.setValueAtTime(level, at);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.07);
      src.connect(filter).connect(gain).connect(music.gain);
      src.start(at);
      src.stop(at + 0.12);
    } catch (err) { /* ignore */ }
  }

  function playStep(step, at) {
    var bar = Math.floor(step / 16) % PROGRESSION.length;
    var chord = PROGRESSION[bar];
    var pos = step % 16;

    if (pos === 0) {
      for (var i = 0; i < chord.pad.length; i++) {
        voice(hz(chord.pad[i]), at, STEP * 14, "sine", 0.016);
      }
    }
    if (pos === 0 || pos === 6 || pos === 10) voice(hz(chord.bass), at, STEP * 4, "triangle", 0.05);
    if (pos === 14) voice(hz(chord.bass + 12), at, STEP * 2, "triangle", 0.028);
    if (pos % 2 === 0) {
      var note = chord.pad[ARP[pos / 2] % chord.pad.length] + 12;
      voice(hz(note), at, STEP * 1.5, "square", 0.01);
    }
    if (pos === 0 || pos === 8) thump(at);
    if (pos === 4 || pos === 12) hiss(at, 0.05);
    if (pos % 2 === 1) hiss(at, 0.016);
  }

  function pumpMusic() {
    var ctx = musicBus();
    if (!ctx || !music.started) return;
    if (!music.enabled || isMuted() || ctx.state === "suspended") {
      music.next = ctx.currentTime + 0.1;
      return;
    }
    var now = ctx.currentTime;
    if (music.next < now) music.next = now + 0.05;
    var guard = 0;
    while (music.next < now + 0.35 && guard < 24) {
      playStep(music.step, music.next);
      music.next += STEP;
      music.step = (music.step + 1) % 64;
      guard++;
    }
  }

  function startMusic() {
    if (!music.enabled || music.started) return;
    var ctx = musicBus();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      try { ctx.resume(); } catch (err) { /* ignore */ }
    }
    if (ctx.state !== "running") return;
    music.started = true;
    music.next = ctx.currentTime + 0.1;
    if (!music.timer) music.timer = window.setInterval(pumpMusic, 60);
  }

  function stopMusic() {
    music.started = false;
    if (music.timer) {
      window.clearInterval(music.timer);
      music.timer = null;
    }
    if (music.gain) {
      try { music.gain.disconnect(); } catch (err) { /* ignore */ }
      music.gain = null;
    }
  }

  function setMusicPref(on) {
    music.enabled = !!on;
    try { localStorage.setItem(MUSIC_KEY, on ? "1" : "0"); } catch (err) { /* ignore */ }
    if (on) startMusic(); else stopMusic();
    paintMusicButton();
    return music.enabled;
  }

  function paintMusicButton() {
    var buttons = document.querySelectorAll("[data-music]");
    Array.prototype.forEach.call(buttons, function (btn) {
      var off = !music.enabled;
      btn.textContent = "♫";
      btn.classList.toggle("is-off", off);
      btn.setAttribute("aria-pressed", off ? "false" : "true");
      btn.setAttribute("aria-label", off ? "Turn music on" : "Turn music off");
      btn.title = off ? "Music off" : "Music on";
    });
  }

  function mountMusicButton() {
    music.enabled = musicPref();
    if (!document.querySelector("[data-music]")) {
      var host = document.querySelector(".head-links") || document.querySelector(".game-head");
      if (host) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "icon-btn music-btn";
        btn.setAttribute("data-music", "");
        btn.addEventListener("click", function () {
          if (music.enabled) {
            setMusicPref(false);
            beep("pick");
          } else {
            setMusicPref(true);
            if (music.started) beep("good");
          }
          paintMusicButton();
        });
        host.appendChild(btn);
      }
    }
    paintMusicButton();

    if (!music.enabled) return;
    ["pointerdown", "keydown", "touchstart"].forEach(function (name) {
      window.addEventListener(name, function () { startMusic(); }, { once: true, passive: true });
    });
  }

  /* -------------------------------------------------------------- accounts */

  /*
   * Device profiles, not real authentication: a name, a salted hash of a PIN
   * and a session flag, all in localStorage. Nothing leaves the browser and the
   * PIN only keeps friends on the same phone from inheriting your board.
   */

  var ACCOUNT_KEY = "pixel-playground:accounts";
  var SESSION_KEY = "pixel-playground:session";
  var AVATARS = ["🦊", "🐙", "🦄", "🐳", "🦉", "🐝", "🦖", "🐧", "🦋", "🐢", "🦁", "🐼"];

  function hashPin(pin, salt) {
    var text = salt + "|" + pin + "|pixel-playground";
    var a = 0x811c9dc5;
    var b = 0x1000193;
    for (var i = 0; i < text.length; i++) {
      a ^= text.charCodeAt(i);
      a = Math.imul(a, 0x01000193) >>> 0;
      b = (Math.imul(b, 0x85ebca6b) + text.charCodeAt(i)) >>> 0;
    }
    return a.toString(16) + b.toString(16);
  }

  function readAccounts() {
    var list = readJSON(ACCOUNT_KEY, []);
    return Array.isArray(list) ? list.filter(function (item) { return item && item.name; }) : [];
  }

  function findAccount(name) {
    var wanted = String(name || "").toLowerCase();
    var accounts = readAccounts();
    for (var i = 0; i < accounts.length; i++) {
      if (accounts[i].name.toLowerCase() === wanted) return accounts[i];
    }
    return null;
  }

  function avatarFor(name) {
    var account = findAccount(name);
    if (account && account.avatar) return account.avatar;
    var text = String(name || "Player");
    var seed = 0;
    for (var i = 0; i < text.length; i++) seed = (seed * 31 + text.charCodeAt(i)) >>> 0;
    return AVATARS[seed % AVATARS.length];
  }

  var auth = {
    accounts: function () {
      return readAccounts().map(function (account) {
        return { name: account.name, avatar: account.avatar || avatarFor(account.name), created: account.created };
      });
    },

    current: function () {
      var name = null;
      try { name = localStorage.getItem(SESSION_KEY); } catch (err) { return null; }
      if (!name) return null;
      var account = findAccount(name);
      if (!account) return null;
      return { name: account.name, avatar: account.avatar || avatarFor(account.name), created: account.created };
    },

    avatar: avatarFor,

    signUp: function (name, pin) {
      var clean = String(name || "").replace(/\s+/g, " ").trim().slice(0, 14);
      if (clean.length < 2) return { ok: false, error: "Pick a name of at least two characters." };
      if (!/^\d{4,8}$/.test(String(pin || ""))) return { ok: false, error: "The PIN needs 4 to 8 digits." };
      if (findAccount(clean)) return { ok: false, error: "That name is already taken on this device." };
      var accounts = readAccounts();
      if (accounts.length >= 12) return { ok: false, error: "This device already has twelve accounts." };
      var salt = Math.random().toString(36).slice(2, 10);
      var account = {
        name: clean,
        salt: salt,
        hash: hashPin(String(pin), salt),
        avatar: avatarFor(clean),
        created: Date.now(),
      };
      accounts.push(account);
      writeJSON(ACCOUNT_KEY, accounts);
      auth.enter(clean);
      return { ok: true, account: { name: clean, avatar: account.avatar, created: account.created } };
    },

    signIn: function (name, pin) {
      var account = findAccount(String(name || "").trim());
      if (!account) return { ok: false, error: "No account with that name on this device." };
      if (account.hash !== hashPin(String(pin || ""), account.salt)) {
        return { ok: false, error: "That PIN does not match " + account.name + "." };
      }
      auth.enter(account.name);
      return { ok: true, account: { name: account.name, avatar: account.avatar, created: account.created } };
    },

    enter: function (name) {
      try { localStorage.setItem(SESSION_KEY, name); } catch (err) { /* ignore */ }
      leaderboard.setPlayer(name);
      paintAccountChip();
      return name;
    },

    signOut: function () {
      try { localStorage.removeItem(SESSION_KEY); } catch (err) { /* ignore */ }
      paintAccountChip();
    },

    /** Every run filed under one name (or the current player's name). */
    runs: function (name) {
      var who = String(name || (auth.current() || {}).name || leaderboard.player()).toLowerCase();
      return readRuns()
        .filter(function (run) { return String(run.player || "").toLowerCase() === who; })
        .sort(function (a, b) { return b.at - a.at; });
    },

    /** Totals plus the best run per game for one player. */
    stats: function (name) {
      var runs = auth.runs(name);
      var bests = {};
      runs.forEach(function (run) {
        var meta = gameMeta(run.game);
        if (!meta) return;
        var current = bests[run.game];
        if (!current) { bests[run.game] = { game: run.game, score: run.score, at: run.at }; return; }
        var better = meta.mode === "low" ? run.score < current.score : run.score > current.score;
        if (better) { bests[run.game] = { game: run.game, score: run.score, at: run.at }; }
      });
      var list = Object.keys(bests).map(function (id) {
        var meta = gameMeta(id) || { label: id, unit: "" };
        return {
          game: id,
          label: meta.label,
          unit: meta.unit,
          score: bests[id].score,
          at: bests[id].at,
        };
      });
      list.sort(function (a, b) { return a.label.localeCompare(b.label); });
      return {
        runs: runs.length,
        games: list.length,
        bests: list,
        recent: runs.slice(0, 12),
      };
    },
  };

  function paintAccountChip() {
    var hosts = document.querySelectorAll(".head-links, .game-head");
    var me = auth.current();
    var inGames = /\/games\//.test(window.location.pathname || "");
    Array.prototype.forEach.call(hosts, function (host) {
      var chip = host.querySelector("[data-account]");
      if (!chip) {
        chip = document.createElement("a");
        chip.className = "account-chip";
        chip.setAttribute("data-account", "");
        host.appendChild(chip);
      }
      chip.href = (inGames ? "../" : "") + "account.html";
      if (me) {
        chip.innerHTML = '<span class="avatar" aria-hidden="true">' + me.avatar + "</span>" +
          '<span class="account-name">' + escapeHtml(me.name) + "</span>";
        chip.title = "Signed in as " + me.name + " — open your account";
      } else {
        chip.innerHTML = '<span class="avatar" aria-hidden="true">👤</span>' +
          '<span class="account-name">Sign in</span>';
        chip.title = "Create or sign in to a device account";
      }
    });
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
    music: {
      start: startMusic,
      stop: stopMusic,
      set: setMusicPref,
      on: function () { return music.enabled; },
    },
    auth: auth,
    avatar: avatarFor,
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

  /* The refresh theme is linked by the newer pages; the eleven original
     cabinets predate it, so give them the same palette at boot. */
  function loadTheme() {
    if (document.querySelector('link[href*="refresh.css"]')) return;
    var inGames = /\/games\//.test(window.location.pathname || "");
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = (inGames ? "../" : "") + "assets/css/refresh.css";
    document.head.appendChild(link);
  }

  function boot() {
    bindMuteButton();
    setupFullscreen();
    lockSurfaces();
    mountMusicButton();
    paintAccountChip();
    loadTheme();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
