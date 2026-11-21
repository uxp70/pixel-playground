/* Add Attack — tap falling pairs that add up to the target. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, rr = K.roundRect;
  var MODE = { name: "Add Attack", level: 6, hudA: "Sums", hudB: "Lives", pattern: "rain" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var LINE = H - 66;
      var orbs = [], selected = null, target = 10;
      var score = 0, lives = 3, next = 0.4, done = false;

      function spawn() {
        if (orbs.length > 12) return;
        var r = rand(20, 27);
        orbs.push({
          x: rand(r + 16, W - r - 16), y: -r - 8, r: r,
          value: 1 + Math.floor(rand(0, 9)), vy: 72 + score * 2.6,
        });
        if (orbs.length >= 2 && !hasPair(target)) retarget();
      }

      function hasPair(t) {
        for (var i = 0; i < orbs.length; i++) {
          for (var j = i + 1; j < orbs.length; j++) {
            if (orbs[i].value + orbs[j].value === t) return true;
          }
        }
        return false;
      }

      function retarget() {
        if (orbs.length < 2) return;
        var i = Math.floor(rand(0, orbs.length));
        var j = (i + 1 + Math.floor(rand(0, orbs.length - 1))) % orbs.length;
        target = orbs[i].value + orbs[j].value;
      }

      function end() {
        if (done) return;
        done = true;
        api.finish(score);
      }

      function update(dt) {
        if (done) return;
        next -= dt;
        if (next <= 0) {
          spawn();
          next = Math.max(0.45, 0.95 - score * 0.015);
        }
        for (var i = orbs.length - 1; i >= 0; i--) {
          orbs[i].y += orbs[i].vy * dt;
          if (orbs[i].y - orbs[i].r > LINE) {
            if (selected === orbs[i]) selected = null;
            orbs.splice(i, 1);
            lives--;
            api.sfx("bad");
            api.shake(7);
            api.haptic(18);
            if (lives <= 0) { end(); return; }
            if (orbs.length >= 2 && !hasPair(target)) retarget();
          }
        }
        api.hud(score, lives + " lives");
      }

      function draw() {
        api.bg();
        ctx.fillStyle = "rgba(255,255,255,0.06)";
        rr(ctx, W / 2 - 150, 52, 300, 70, 18); ctx.fill();
        api.text("MAKE " + target, W / 2, 88, 28, api.accent);
        ctx.strokeStyle = "rgba(248,113,113,0.55)";
        ctx.lineWidth = 3;
        ctx.setLineDash([14, 10]);
        ctx.beginPath(); ctx.moveTo(0, LINE); ctx.lineTo(W, LINE); ctx.stroke();
        ctx.setLineDash([]);
        for (var i = 0; i < orbs.length; i++) {
          var o = orbs[i];
          ctx.fillStyle = selected === o ? api.accent : "rgba(255,255,255,0.13)";
          ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2); ctx.fill();
          if (selected === o) {
            ctx.strokeStyle = "#f8fafc";
            ctx.lineWidth = 3;
            ctx.stroke();
          }
          api.text(String(o.value), o.x, o.y + 2, 24, "#f8fafc");
        }
        api.text("TAP TWO NUMBERS THAT ADD TO THE TARGET", W / 2, LINE + 30, 13, "rgba(255,255,255,0.38)");
      }

      function tap(x, y) {
        if (done) return;
        for (var i = orbs.length - 1; i >= 0; i--) {
          var o = orbs[i];
          var dx = x - o.x, dy = y - o.y;
          if (dx * dx + dy * dy > (o.r + 4) * (o.r + 4)) continue;
          if (!selected) { selected = o; api.sfx("pick"); return; }
          if (selected === o) { selected = null; return; }
          if (selected.value + o.value === target) {
            score++;
            api.sfx("good");
            api.burst(o.x, o.y, api.accent, 8);
            api.haptic(4);
            orbs = orbs.filter(function (orb) { return orb !== o && orb !== selected; });
            selected = null;
            if (orbs.length >= 2) retarget();
            else target = 6 + Math.floor(rand(0, 10));
          } else {
            selected = o;
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
