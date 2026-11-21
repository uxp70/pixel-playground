/* Trigger Test — stop the spinning needle in the green arc. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand;
  var MODE = { name: "Trigger Test", level: 4, hudA: "Round", hudB: "Error", pattern: "bands" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var CX = W / 2, CY = 302, R = 176, ARC = 0.55, ROUNDS = 6;
      var state = "wait", wait = 0.7, angle = 0, green = 0, speed = 2.5;
      var times = [], last = 0, roundAt = 0, done = false;

      function norm(a) {
        while (a < 0) a += Math.PI * 2;
        while (a >= Math.PI * 2) a -= Math.PI * 2;
        return a;
      }

      function arm() {
        state = "wait";
        wait = 0.65 + Math.random() * 1.2;
        green = rand(0, Math.PI * 2);
        angle = 0;
      }

      function record(err) {
        if (done) return;
        last = Math.max(1, Math.round(err));
        times.push(last);
        api.sfx(err > 500 ? "bad" : "good");
        if (err > 500) { api.shake(6); api.haptic(18); }
        else api.haptic(5);
        if (times.length >= ROUNDS) {
          var sum = 0;
          for (var i = 0; i < times.length; i++) sum += times[i];
          done = true;
          api.finish(Math.round(sum / times.length));
          return;
        }
        arm();
      }

      function strike() {
        if (done) return;
        if (state === "wait") { record(800); return; }
        if (state !== "spin") return;
        var diff = Math.abs(norm(angle - green));
        diff = Math.min(diff, Math.PI * 2 - diff);
        record(diff <= ARC / 2 ? (diff / speed) * 1000 + 10 : 650);
      }

      function update(dt) {
        if (done) return;
        if (state === "wait") {
          wait -= dt;
          if (wait <= 0) {
            state = "spin";
            roundAt = api.elapsed;
            api.sfx("pick");
          }
        } else if (state === "spin") {
          angle = norm(angle + speed * dt);
          if (api.elapsed - roundAt > 3.4) record(650);
        }
        if (done) return;
        api.hud(Math.min(times.length + 1, ROUNDS) + " / " + ROUNDS, times.length ? last + " ms" : "ready");
      }

      function draw() {
        api.bg();
        ctx.fillStyle = "rgba(255,255,255,0.05)";
        ctx.beginPath(); ctx.arc(CX, CY, R + 22, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.12)";
        ctx.lineWidth = 26;
        ctx.beginPath(); ctx.arc(CX, CY, R, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = "rgba(34,197,94,0.55)";
        ctx.lineWidth = 26;
        ctx.beginPath(); ctx.arc(CX, CY, R, green - ARC / 2, green + ARC / 2); ctx.stroke();
        ctx.strokeStyle = "rgba(255,255,255,0.2)";
        ctx.lineWidth = 2;
        for (var i = 0; i < 12; i++) {
          var a = (i / 12) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(CX + Math.cos(a) * (R - 22), CY + Math.sin(a) * (R - 22));
          ctx.lineTo(CX + Math.cos(a) * (R - 8), CY + Math.sin(a) * (R - 8));
          ctx.stroke();
        }
        var shown = state === "spin" ? angle : 0;
        ctx.strokeStyle = "#f8fafc";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(CX, CY);
        ctx.lineTo(CX + Math.cos(shown) * (R - 34), CY + Math.sin(shown) * (R - 34));
        ctx.stroke();
        ctx.fillStyle = api.accent;
        ctx.beginPath(); ctx.arc(CX, CY, 14, 0, Math.PI * 2); ctx.fill();
        api.text("STOP THE NEEDLE IN THE GREEN", W / 2, 66, 18, "rgba(255,255,255,0.5)");
        if (times.length) api.text(last + " ms", W / 2, H - 58, 24, "rgba(255,255,255,0.45)");
      }

      arm();

      return { update: update, draw: draw, down: strike, key: function (code) { if (code === "Space" || code === "Enter") strike(); } };
    },
  });
})();
