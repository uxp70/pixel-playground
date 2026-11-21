/* Stack Yard — catch the falling crates and build the pile. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, clamp = K.clamp, rr = K.roundRect;
  var MODE = { name: "Stack Yard", level: 9, hudA: "Floors", hudB: "Lives", pattern: "rain" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var CH = 24;
      var cart = { x: W / 2 - 78, w: 156, y: H - 92, h: 28 };
      var stack = [], crates = [], floors = 0, lives = 3, spawn = 0.35, done = false;

      function end() {
        if (done) return;
        done = true;
        api.finish(floors);
      }

      function drop() {
        var w = rand(46, 86);
        crates.push({ x: rand(18, W - w - 18), y: -34, w: w, h: CH, vy: 155 + floors * 7 });
        spawn = Math.max(0.52, 1.28 - floors * 0.035);
      }

      function catchCrate(c) {
        var dx = clamp(c.x - cart.x, 2, cart.w - c.w - 2);
        stack.push({ dx: dx, w: c.w });
        if (stack.length > 14) stack.shift();
        floors++;
        api.sfx("good");
        api.burst(c.x + c.w / 2, cart.y - 6, api.accent, 8);
        api.haptic(4);
      }

      function miss() {
        lives--;
        api.sfx("bad");
        api.shake(8);
        api.haptic([18, 40, 24]);
        if (lives <= 0) end();
      }

      function update(dt) {
        if (done) return;
        if (api.keys.ArrowLeft || api.keys.KeyA) cart.x = clamp(cart.x - 430 * dt, 8, W - cart.w - 8);
        if (api.keys.ArrowRight || api.keys.KeyD) cart.x = clamp(cart.x + 430 * dt, 8, W - cart.w - 8);

        spawn -= dt;
        if (spawn <= 0) drop();

        for (var i = crates.length - 1; i >= 0; i--) {
          var c = crates[i];
          c.y += c.vy * dt;
          if (c.y + c.h >= cart.y && c.y + c.h <= cart.y + cart.h + 14 &&
              c.x + c.w > cart.x && c.x < cart.x + cart.w) {
            catchCrate(c);
            crates.splice(i, 1);
            continue;
          }
          if (c.y + c.h > H) {
            crates.splice(i, 1);
            miss();
            if (done) return;
          }
        }
        api.hud(floors, lives + " lives");
      }

      function draw() {
        api.bg();
        ctx.fillStyle = "rgba(255,255,255,0.05)";
        ctx.fillRect(0, cart.y + 8, W, H - cart.y);
        for (var i = 0; i < stack.length; i++) {
          var b = stack[i];
          var y = cart.y - (i + 1) * (CH + 2);
          ctx.fillStyle = i % 2 ? "rgba(251,146,60,0.7)" : "rgba(244,114,182,0.62)";
          rr(ctx, cart.x + b.dx, y, b.w, CH, 3); ctx.fill();
          ctx.fillStyle = "rgba(0,0,0,0.18)";
          ctx.fillRect(cart.x + b.dx + 4, y + CH - 7, b.w - 8, 2);
        }
        for (var j = 0; j < crates.length; j++) {
          var c = crates[j];
          ctx.fillStyle = "#f8fafc";
          rr(ctx, c.x, c.y, c.w, c.h, 3); ctx.fill();
          ctx.fillStyle = "rgba(0,0,0,0.16)";
          ctx.fillRect(c.x + 5, c.y + 5, c.w - 10, 3);
        }
        ctx.fillStyle = api.accent;
        rr(ctx, cart.x, cart.y, cart.w, cart.h, 6); ctx.fill();
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.beginPath(); ctx.arc(cart.x + 24, cart.y + cart.h + 4, 10, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cart.x + cart.w - 24, cart.y + cart.h + 4, 10, 0, Math.PI * 2); ctx.fill();
        api.text("CATCH THE CRATES", W / 2, 62, 20, "rgba(255,255,255,0.5)");
      }

      function place(x) {
        cart.x = clamp(x - cart.w / 2, 8, W - cart.w - 8);
      }

      return {
        update: update,
        draw: draw,
        tap: function (x) { place(x); },
        move: function (x) { place(x); },
        swipe: function (dx) { cart.x = clamp(cart.x + dx * 48, 8, W - cart.w - 8); },
      };
    },
  });
})();
