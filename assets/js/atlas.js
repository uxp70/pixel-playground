/* Atlas runtime.

   Fifty standalone engines share the frame loop, scoring and input plumbing.
   Each cabinet implements its own verb and its own rule; there are no
   editions or family variants layered on top. */
(function () {
  "use strict";

  var W = 600;
  var H = 600;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function near(x1, y1, r1, x2, y2, r2) {
    var dx = x1 - x2, dy = y1 - y2, r = r1 + r2;
    return dx * dx + dy * dy <= r * r;
  }
  function dist(x1, y1, x2, y2) {
    var dx = x1 - x2, dy = y1 - y2;
    return Math.sqrt(dx * dx + dy * dy);
  }
  function rr(ctx, x, y, w, h, r) {
    var rad = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
  }
  function inRect(x, y, rx, ry, rw, rh) {
    return x >= rx && y >= ry && x <= rx + rw && y <= ry + rh;
  }
  var BASE = { time: 1, lives: 0, speed: 1, ramp: 0 };

  var families = {};

  function register(id, make) {
    if (id && typeof make === "function") families[id] = make;
  }

  function familyFor(api) {
    var family = api.game && api.game.family;
    return (window.PP_ATLAS_FAMILIES && window.PP_ATLAS_FAMILIES[family]) || {};
  }

  function begin(api, cfg) {
    cfg = cfg || {};
    var family = familyFor(api);
    var e = BASE;
    var baseTime = cfg.time !== undefined ? cfg.time : family.time || 30;
    var goal = cfg.goal !== undefined ? cfg.goal : family.goal || 10;
    var timeTotal = e.time ? baseTime * e.time : Infinity;
    var timeLeft = timeTotal;
    var rng = Math.random;
    var ctx = api.ctx;
    var ended = false;
    var start = 0;
    var relic = null;

    var S = {
      api: api,
      ctx: ctx,
      W: W, H: H,
      family: family,
      timeTotal: timeTotal,
      timeLeft: timeLeft,
      baseTime: baseTime,
      goal: goal,
      score: 0,
      lives: e.lives || 0,
      elapsed: 0,
      speed: e.speed || 1,
      phase: 1,
      combo: 0,
      comboLeft: 0,
      pointer: { x: W / 2, y: H / 2 },
      ended: false,
      scale: e.scale || 1,
      mirror: !!e.mirror,
      fog: !!e.fog,
      boss: !!e.boss,
      comboMode: !!e.combo,
      zen: !!e.zen,
      seed: e.seeded,
      space: api.keys || {},
      rand: function (a, b) {
        if (a === undefined) return rng();
        if (b === undefined) return rng() * a;
        return a + rng() * (b - a);
      },
      pick: function (list) { return list[Math.floor(rng() * list.length)]; },
    };

    function finish(bonus) {
      if (ended) return;
      ended = true;
      S.ended = true;
      api.finish(Math.max(0, Math.round(S.score + (bonus || 0))));
    }
    S.finish = finish;

    S.win = function (bonus) { finish(bonus === undefined ? 5 : bonus); };

    S.add = function (points) {
      if (ended) return 0;
      var value = points === undefined ? 1 : points;
      var multiplier = 1;
      if (S.comboMode) {
        S.combo++;
        S.comboLeft = 2.2;
        multiplier = 1 + Math.min(4, Math.floor(S.combo / 4));
      }
      var gain = Math.max(0, Math.round(value * multiplier));
      S.score += gain;
      if (S.zen && S.score >= S.goal) finish(5);
      return gain;
    };

    S.fail = function (cost) {
      if (ended) return;
      S.combo = 0;
      S.comboLeft = 0;
      if (S.lives > 0) {
        S.lives--;
      } else {
        S.score = Math.max(0, S.score - (cost || 1));
      }
      api.sfx("bad");
      api.shake(6);
      api.haptic(16);
      if (S.lives === 0 && (e.lives || 0) > 0) finish(0);
    };

    S.hud = function (a, b) {
      if (a !== undefined) api.hud(a, b);
    };

    S.update = function (dt) {
      if (ended) return false;
      S.elapsed += dt;
      if (S.comboLeft > 0) {
        S.comboLeft -= dt;
        if (S.comboLeft <= 0) S.combo = 0;
      }

      if (isFinite(timeTotal)) {
        S.timeLeft = Math.max(0, timeTotal - S.elapsed);
        if (S.timeLeft <= 0) {
          finish(0);
          return false;
        }
      }

      if (S.boss) {
        var p = isFinite(timeTotal)
          ? 1 + Math.min(2, Math.floor((S.elapsed / timeTotal) * 3))
          : 1 + Math.min(2, Math.floor(S.score / Math.max(1, goal / 3)));
        S.phase = p;
      }

      var speed = (e.speed || 1) * (1 + (e.ramp || 0) * S.elapsed);
      if (S.boss) speed *= 1 + (S.phase - 1) * 0.24;
      if (e.chaos) speed *= 0.8 + 0.4 * Math.sin(S.elapsed * 1.8);
      S.speed = clamp(speed, 0.55, 3.2);

      if (e.relic && !relic && S.elapsed > 5) {
        relic = {
          x: S.rand(90, W - 90),
          y: S.rand(110, H - 80),
          r: 17,
          active: true,
          born: S.elapsed,
        };
      }

      var label;
      if (isFinite(timeTotal)) {
        label = Math.ceil(S.timeLeft) + "s";
      } else if (S.lives > 0) {
        label = S.lives + (S.lives === 1 ? " life" : " lives");
      } else if (S.zen) {
        label = S.score + " / " + S.goal;
      } else {
        label = "Endless";
      }
      if (S.boss) label = "P" + S.phase + " · " + label;
      api.hud(S.score, label);
      return true;
    };

    S.map = function (x, y) {
      var px = x, py = y;
      if (S.mirror) px = W - px;
      if (S.scale !== 1) {
        px = (px - W / 2) / S.scale + W / 2;
        py = (py - H / 2) / S.scale + H / 2;
      }
      return { x: px, y: py };
    };

    S.screen = function (x, y) {
      var px = W / 2 + (x - W / 2) * S.scale;
      var py = H / 2 + (y - H / 2) * S.scale;
      return { x: px, y: py };
    };

    S.input = function (x, y) {
      S.pointer.x = x;
      S.pointer.y = y;
      if (relic && relic.active && near(x, y, 10, relic.x, relic.y, relic.r)) {
        relic.active = false;
        S.add(5);
        api.sfx("good");
        api.burst(relic.x, relic.y, "#fde047", 12);
        return null;
      }
      return S.map(x, y);
    };

    S.key = function (code) {
      if (S.mirror) {
        if (code === "ArrowLeft") return "ArrowRight";
        if (code === "ArrowRight") return "ArrowLeft";
        if (code === "KeyA") return "KeyD";
        if (code === "KeyD") return "KeyA";
      }
      return code;
    };

    S.dir = function (code) {
      var c = S.key(code);
      if (c === "ArrowLeft" || c === "KeyA") return -1;
      if (c === "ArrowRight" || c === "KeyD") return 1;
      return 0;
    };

    S.down = S.dir;

    S.spark = function (x, y, color, n) {
      var p = S.screen(x, y);
      api.burst(p.x, p.y, color || api.accent, n || 7);
    };

    S.frame = function (draw, focus) {
      api.bg();
      ctx.save();
      if (S.scale !== 1) {
        ctx.translate(W / 2, H / 2);
        ctx.scale(S.scale, S.scale);
        ctx.translate(-W / 2, -H / 2);
      }
      draw();
      ctx.restore();

      if (relic && relic.active) {
        var pulse = 1 + Math.sin(S.elapsed * 5) * 0.16;
        ctx.save();
        ctx.translate(relic.x, relic.y);
        ctx.rotate(S.elapsed * 1.5);
        ctx.fillStyle = "#fde047";
        ctx.beginPath();
        for (var i = 0; i < 10; i++) {
          var a = (i / 10) * Math.PI * 2 - Math.PI / 2;
          var r = (i % 2 === 0 ? 17 : 7) * pulse;
          if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
          else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        ctx.strokeStyle = "rgba(253,224,71,0.45)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(relic.x, relic.y, 27, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (S.comboMode && S.combo > 1) {
        api.text("x" + (1 + Math.min(4, Math.floor(S.combo / 4))), W - 52, H - 32, 22, "rgba(255,255,255,0.72)");
      }

      if (S.fog) {
        var fx = S.pointer.x;
        var fy = S.pointer.y;
        var grad = ctx.createRadialGradient(fx, fy, 24, fx, fy, 230);
        grad.addColorStop(0, "rgba(5,7,14,0)");
        grad.addColorStop(0.55, "rgba(5,7,14,0.24)");
        grad.addColorStop(1, "rgba(5,7,14,0.95)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
      }
    };

    return S;
  }

  function fallback(api) {
    var S = begin(api);
    return {
      update: function (dt) { S.update(dt); },
      draw: function () {
        S.frame(function () {
          api.text("Engine missing", W / 2, H / 2, 30, "#f43f5e");
        });
      },
      tap: function () { S.win(0); },
    };
  }

  window.PP_ATLAS = {
    W: W, H: H,
    register: register,
    begin: begin,
    families: families,
    clamp: clamp,
    near: near,
    dist: dist,
    rr: rr,
    inRect: inRect,
  };

  if (window.PP_KIT && window.PP_KIT.register) {
    window.PP_KIT.register("atlas", {
      modes: window.PP_ATLAS_MODES || [],
      make: function (api) {
        var id = api.game && api.game.family;
        var make = families[id];
        if (!make) return fallback(api);
        return make(api);
      },
    });
  }
})();
