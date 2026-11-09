/* Pop Circuit — tap the lit nodes in the shown order. Standalone cabinet. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, near = K.near;
  var MODE = { name: "Pop Circuit", level: 4, hudA: "Nodes", hudB: "Time", pattern: "beams" };

  K.register(K.engineId(MODE.name), {
    modes: [MODE],
    make: function (api) {
      var ctx = api.ctx;
      var nodes = [], seq = [], at = 0, score = 0, clock = 0, LIMIT = 20;
      for (var i = 0; i < 6; i++) {
        var a = -Math.PI / 2 + (i / 6) * Math.PI * 2;
        nodes.push({ x: W / 2 + Math.cos(a) * 190, y: H / 2 + Math.sin(a) * 190, r: 30 });
      }

      function newSeq() {
        seq = [];
        var last = -1;
        for (var i = 0; i < 4; i++) {
          var pick = Math.floor(rand(0, 6));
          if (pick === last) pick = (pick + 1) % 6;
          seq.push(pick);
          last = pick;
        }
        at = 0;
      }

      newSeq();

      function update(dt) {
        clock += dt;
        api.hud(score, Math.max(0, Math.ceil(LIMIT - clock)) + "s");
        if (clock >= LIMIT) api.finish(score);
      }

      function draw() {
        api.bg();
        ctx.strokeStyle = "rgba(255,255,255,0.12)";
        ctx.lineWidth = 3;
        for (var i = 0; i < seq.length - 1; i++) {
          var a = nodes[seq[i]], b = nodes[seq[i + 1]];
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
        for (var n = 0; n < nodes.length; n++) {
          var node = nodes[n];
          var active = seq[at] === n;
          ctx.fillStyle = active ? api.accent : "rgba(255,255,255,0.08)";
          ctx.beginPath(); ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2); ctx.fill();
          if (active) {
            ctx.strokeStyle = "rgba(255,255,255,0.8)";
            ctx.lineWidth = 3;
            ctx.stroke();
          }
        }
        api.text(at + " / " + seq.length, W / 2, 84, 22, "rgba(255,255,255,0.55)");
      }

      function tap(x, y) {
        for (var i = 0; i < nodes.length; i++) {
          var node = nodes[i];
          if (!near(x, y, 2, node.x, node.y, node.r)) continue;
          if (seq[at] === i) {
            score++;
            at++;
            api.sfx("pick");
            api.burst(node.x, node.y, api.accent, 6);
            api.haptic(4);
            if (at >= seq.length) {
              score += 3;
              api.sfx("win");
              newSeq();
            }
          } else {
            score = Math.max(0, score - 1);
            at = 0;
            api.sfx("bad");
            api.shake(6);
          }
          return;
        }
      }

      return { update: update, draw: draw, tap: tap };
    },
  });
})();
