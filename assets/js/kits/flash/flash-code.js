/* Flash Code — repeat the growing colour code. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, near = K.near;
  var MODE = { name: "Flash Code", level: 9, hudA: "Codes", hudB: "Step", pattern: "rain" };
  var COLORS = ["#22d3ee", "#f472b6", "#a3e635", "#fbbf24"];

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var seq = [], phase = "show", shown = 0, lit = -1, litFor = 0, wait = 0.7, rounds = 0, inputAt = 0;
      var centers = [];
      for (var i = 0; i < 4; i++) centers.push({ x: W / 2 + (i % 2 ? 95 : -95), y: 250 + Math.floor(i / 2) * 130 });

      function reset() { phase = "show"; shown = 0; wait = 0.55; lit = -1; inputAt = 0; }
      function lose() { api.sfx("bad"); api.shake(9); api.haptic([20, 45, 30]); api.finish(rounds); }

      seq.push(Math.floor(rand(0, 4)));

      function update(dt) {
        if (litFor > 0) {
          litFor -= dt;
          if (litFor <= 0) { lit = -1; wait = 0.12; }
          api.hud(rounds, "Watch");
          return;
        }
        if (phase !== "show") { api.hud(rounds, "Repeat"); return; }
        if (wait > 0) { wait -= dt; api.hud(rounds, "Watch"); return; }
        if (shown < seq.length) {
          lit = seq[shown++];
          litFor = 0.4;
          api.sfx("pick");
          api.hud(rounds, "Watch");
          return;
        }
        phase = "input";
        inputAt = 0;
        api.hud(rounds, "Repeat");
      }

      function draw() {
        api.bg();
        for (var i = 0; i < 4; i++) {
          ctx.fillStyle = lit === i ? COLORS[i] : "rgba(255,255,255,0.08)";
          ctx.beginPath();
          ctx.arc(centers[i].x, centers[i].y, 58, 0, Math.PI * 2);
          ctx.fill();
          if (lit === i) {
            ctx.strokeStyle = "rgba(255,255,255,0.8)";
            ctx.lineWidth = 4;
            ctx.stroke();
          }
        }
        api.text("REPEAT  " + Math.max(0, seq.length - inputAt), W / 2, 520, 20, "rgba(255,255,255,0.55)");
      }

      function tap(x, y) {
        if (phase !== "input" || litFor > 0) return;
        for (var i = 0; i < 4; i++) {
          if (!near(x, y, 2, centers[i].x, centers[i].y, 60)) continue;
          if (seq[inputAt] !== i) { lose(); return; }
          inputAt++;
          lit = i;
          litFor = 0.14;
          api.sfx("pick");
          api.haptic(5);
          if (inputAt >= seq.length) {
            rounds++;
            seq.push(Math.floor(rand(0, 4)));
            reset();
            api.sfx("good");
          }
          return;
        }
      }

      return { update: update, draw: draw, tap: tap };
    },
  });
})();
