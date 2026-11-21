/* Dot Frenzy — clear dots in matching colour pairs. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, clamp = K.clamp, near = K.near;
  var MODE = { name: "Dot Frenzy", level: 6, hudA: "Pairs", hudB: "Time", pattern: "stars" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var colors = ["#f472b6", "#22d3ee", "#fbbf24", "#a78bfa"];
      var score = 0, clock = 0, next = 0.15, targets = [], selected = null, LIMIT = 18, done = false;

      function addPair() {
        if (targets.length > 18) return;
        var color = Math.floor(rand(0, colors.length));
        for (var k = 0; k < 2; k++) {
          var r = rand(16, 22);
          targets.push({
            x: rand(r + 18, W - r - 18), y: rand(r + 72, H - r - 18), r: r,
            color: color, born: api.elapsed,
          });
        }
      }

      function end() {
        if (done) return;
        done = true;
        api.finish(score);
      }

      function update(dt) {
        if (done) return;
        clock += dt;
        next -= dt;
        if (next <= 0) { addPair(); next = 0.75; }
        if (clock >= LIMIT) { end(); return; }
        api.hud(score, Math.max(0, Math.ceil(LIMIT - clock)) + "s");
      }

      function draw() {
        api.bg();
        for (var i = 0; i < targets.length; i++) {
          var t = targets[i];
          var pulse = 0.88 + 0.12 * Math.sin(api.elapsed * 4 + i);
          ctx.globalAlpha = 1;
          ctx.fillStyle = colors[t.color];
          ctx.beginPath(); ctx.arc(t.x, t.y, t.r * pulse, 0, Math.PI * 2); ctx.fill();
          if (selected === t) {
            ctx.strokeStyle = "#f8fafc";
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(t.x, t.y, t.r + 7, 0, Math.PI * 2); ctx.stroke();
          }
        }
        ctx.globalAlpha = 1;
        api.text("PAIR THE COLOURS", W / 2, 58, 18, "rgba(255,255,255,0.5)");
      }

      function tap(x, y) {
        if (done) return;
        for (var i = targets.length - 1; i >= 0; i--) {
          var t = targets[i];
          if (!near(x, y, 2, t.x, t.y, t.r)) continue;
          if (!selected) {
            selected = t;
            api.sfx("pick");
            return;
          }
          if (selected === t) { selected = null; return; }
          if (selected.color === t.color) {
            score++;
            api.sfx("good");
            api.burst(t.x, t.y, colors[t.color], 8);
            api.haptic(4);
            targets = targets.filter(function (dot) { return dot !== t && dot !== selected; });
            selected = null;
          } else {
            selected = t;
            api.sfx("bad");
            api.shake(3);
          }
          return;
        }
      }

      return { update: update, draw: draw, tap: tap };
    },
  });
})();
