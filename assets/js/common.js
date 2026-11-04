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

  /** Short blip. kind: "pick" | "good" | "bad" | "win" */
  function beep(kind) {
    if (isMuted()) return;
    var ctx = context();
    if (!ctx || ctx.state === "suspended") {
      try { ctx && ctx.resume(); } catch (err) { /* ignore */ }
      if (!ctx) return;
    }
    var notes = {
      pick: [520, 0.06, "triangle", 0.05],
      good: [740, 0.1, "sine", 0.07],
      bad: [160, 0.16, "sawtooth", 0.05],
      win: [880, 0.18, "triangle", 0.08],
    }[kind] || [440, 0.08, "sine", 0.05];

    try {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      var now = ctx.currentTime;
      osc.type = notes[2];
      osc.frequency.setValueAtTime(notes[0], now);
      if (kind === "win") {
        osc.frequency.exponentialRampToValueAtTime(notes[0] * 1.6, now + notes[1]);
      }
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(notes[3], now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + notes[1]);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + notes[1] + 0.02);
    } catch (err) {
      /* audio is a nice-to-have */
    }
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

  /**
   * Size a canvas for crisp rendering: logical coordinates stay at w x h,
   * the backing store is scaled by devicePixelRatio.
   */
  function fitCanvas(canvas, w, h) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.aspectRatio = w + " / " + h;
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
    el.innerHTML = '<div class="overlay-inner">' + html + "</div>";
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

  window.PP = {
    scores: scores,
    sfx: beep,
    fitCanvas: fitCanvas,
    formatNumber: formatNumber,
    escapeHtml: escapeHtml,
    showOverlay: showOverlay,
    hideOverlay: hideOverlay,
    onDirectionalKeys: onDirectionalKeys,
    onSwipe: onSwipe,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindMuteButton);
  } else {
    bindMuteButton();
  }
})();
