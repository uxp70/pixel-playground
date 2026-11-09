/* Tap Finale — a shielded boss with three phases. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, near = K.near, rr = K.roundRect;
  var MODE = { name: "Tap Finale", level: 11, hudA: "Damage", hudB: "Time", pattern: "beams" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var boss = { x: W / 2, y: H / 2, r: 46, hp: 12, max: 12, phase: 1, spin: 0, hit: 0 };
      var score = 0, clock = 0, shields = [], LIMIT = 35;

      function update(dt) {
        clock += dt;
        boss.spin += dt * (0.9 + boss.phase * 0.35);
        boss.hit = Math.max(0, boss.hit - dt);
        shields = [];
        for (var b = 0; b < 4; b++) {
          var a = boss.spin + (b / 4) * Math.PI * 2;
          shields.push({ x: boss.x + Math.cos(a) * 92, y: boss.y + Math.sin(a) * 92 });
        }
        api.hud(score, Math.max(0, Math.ceil(LIMIT - clock)) + "s");
        if (clock >= LIMIT) api.finish(score);
      }

      function draw() {
        api.bg();
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.beginPath(); ctx.arc(boss.x, boss.y, 118, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = api.accent;
        ctx.beginPath(); ctx.arc(boss.x, boss.y, boss.r * (1 + boss.hit * 1.4), 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.beginPath(); ctx.arc(boss.x, boss.y, boss.r * 0.34, 0, Math.PI * 2); ctx.fill();
        for (var i = 0; i < shields.length; i++) {
          ctx.fillStyle = "#94a3b8";
          ctx.beginPath(); ctx.arc(shields[i].x, shields[i].y, 22, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = "rgba(255,255,255,0.35)";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        rr(ctx, W / 2 - 150, 60, 300, 14, 7); ctx.fill();
        ctx.fillStyle = api.accent;
        rr(ctx, W / 2 - 150, 60, 300 * (boss.hp / boss.max), 14, 7); ctx.fill();
        api.text("PHASE " + boss.phase + " / 3", W / 2, 96, 20, "rgba(255,255,255,0.6)");
      }

      function tap(x, y) {
        for (var i = 0; i < shields.length; i++) {
          if (near(x, y, 4, shields[i].x, shields[i].y, 22)) {
            score = Math.max(0, score - 1);
            api.sfx("bad");
            api.shake(4);
            return;
          }
        }
        if (!near(x, y, 4, boss.x, boss.y, boss.r)) return;
        boss.hp--;
        boss.hit = 0.18;
        score += 2;
        api.sfx("good");
        api.burst(boss.x, boss.y, api.accent, 10);
        api.haptic(7);
        if (boss.hp <= 0) {
          if (boss.phase >= 3) { api.finish(score + 15); return; }
          boss.phase++;
          boss.max = 12 + boss.phase * 3;
          boss.hp = boss.max;
          boss.spin += 0.7;
          api.sfx("win");
        }
      }

      return { update: update, draw: draw, tap: tap };
    },
  });
})();
