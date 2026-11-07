/* Reflex family — every cabinet asks for a different kind of speed. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, clamp = K.clamp, near = K.near, rr = K.roundRect;

  var MODES = [
    { name: "Quickdraw", kind: "panel", rounds: 5, hudA: "Round", hudB: "Last", pattern: "scan" },
    { name: "Green Light", kind: "light", rounds: 6, hudA: "Round", hudB: "Last", pattern: "grid" },
    { name: "Snap Reflex", kind: "target", rounds: 8, hudA: "Round", hudB: "Last", pattern: "dots" },
    { name: "Trigger Test", kind: "bar", rounds: 6, zone: 0.3, hudA: "Round", hudB: "Error", pattern: "bands" },
    { name: "Twitch", kind: "panel", rounds: 6, hudA: "Round", hudB: "Last", pattern: "stars" },
    { name: "Fast Hands", kind: "sides", rounds: 8, hudA: "Round", hudB: "Last", pattern: "beams" },
    { name: "Side Step", kind: "arrows", rounds: 8, hudA: "Round", hudB: "Last", pattern: "grid" },
    { name: "Jump Cue", kind: "bar", rounds: 8, zone: 0.16, hudA: "Round", hudB: "Error", pattern: "waves" },
    { name: "Ready Set", kind: "panel", rounds: 5, penalty: 1000, hudA: "Round", hudB: "Last", pattern: "rain" },
    { name: "Beat Clock", kind: "beat", rounds: 12, hudA: "Beat", hudB: "Error", pattern: "dots" },
    { name: "Flash Tap", kind: "rapid", rounds: 10, hudA: "Cue", hudB: "Last", pattern: "beams" },
  ];

  function make(api) {
    var m = api.mode;
    var kind = m.kind;
    var ctx = api.ctx;
    var times = [];
    var state = "wait";
    var cueAt = 0;
    var wait = 1;
    var target = { x: W / 2, y: H / 2, r: 44 };
    var side = 0;
    var arrow = "left";
    var beats = [];
    var beatAt = 0;
    var beatIndex = 0;
    var rapidAt = 0;
    var lastMs = 0;
    var flash = 0;

    function arm() {
      state = "wait";
      wait = 0.75 + Math.random() * 1.55;
      if (kind === "light") wait = 0.5 + Math.random() * 1.2;
      if (kind === "beat") {
        beats = [];
        var start = api.elapsed + 1.6;
        for (var i = 0; i < 12; i++) beats.push(start + i * 0.62);
        beatIndex = 0;
        beatAt = beats[0];
      }
    }

    function fire() {
      state = "go";
      cueAt = api.elapsed;
      target.x = rand(120, W - 120);
      target.y = rand(150, H - 150);
      side = Math.random() < 0.5 ? -1 : 1;
      arrow = Math.random() < 0.5 ? "left" : "right";
      api.sfx("pick");
      api.haptic(10);
    }

    function record(ms) {
      lastMs = Math.max(1, Math.round(ms));
      times.push(lastMs);
      flash = 0.25;
      api.sfx("good");
      if (times.length >= m.rounds) {
        var sum = 0;
        for (var i = 0; i < times.length; i++) sum += times[i];
        api.finish(Math.round(sum / times.length));
        return;
      }
      arm();
    }

    function falseStart() {
      var penalty = m.penalty || 600;
      lastMs = penalty;
      times.push(penalty);
      api.sfx("bad");
      api.shake(8);
      api.haptic(20);
      if (times.length >= m.rounds) {
        var sum = 0;
        for (var i = 0; i < times.length; i++) sum += times[i];
        api.finish(Math.round(sum / times.length));
        return;
      }
      arm();
    }

    function strike(x, y, keySide) {
      flash = 0.18;
      if (kind === "light" && state === "go" && (api.elapsed % 2.4) < 1.9) { falseStart(); return; }
      if (state === "wait") { falseStart(); return; }
      if (state !== "go") return;

      if (kind === "target") {
        if (!near(x, y, 2, target.x, target.y, target.r)) {
          api.sfx("bad");
          api.shake(4);
          lastMs = 600;
          times.push(lastMs);
          if (times.length >= m.rounds) {
            var s0 = 0; for (var z = 0; z < times.length; z++) s0 += times[z];
            api.finish(Math.round(s0 / times.length));
          } else arm();
          return;
        }
      }
      if (kind === "sides") {
        var chosen = keySide || (x < W / 2 ? -1 : 1);
        if (chosen !== side) {
          api.sfx("bad");
          api.shake(4);
          lastMs = 650;
          times.push(lastMs);
          if (times.length >= m.rounds) {
            var s1 = 0; for (var q = 0; q < times.length; q++) s1 += times[q];
            api.finish(Math.round(s1 / times.length));
          } else arm();
          return;
        }
      }
      if (kind === "arrows") {
        var dir = keySide || (x < W / 2 ? "left" : "right");
        if (dir !== arrow) {
          lastMs = 700;
          times.push(lastMs);
          api.sfx("bad");
          api.shake(5);
          if (times.length >= m.rounds) {
            var s2 = 0; for (var w = 0; w < times.length; w++) s2 += times[w];
            api.finish(Math.round(s2 / times.length));
          } else arm();
          return;
        }
      }
      if (kind === "bar") {
        var phase = clamp((api.elapsed - cueAt) / 0.9, 0, 1);
        var zone = (m.zone || 0.3) / 2;
        if (Math.abs(phase - 0.5) > zone) { record(700); return; }
        record(Math.abs(phase - 0.5) * 900 + 30);
        return;
      }
      if (kind === "beat") {
        var err = 9999;
        for (var b = 0; b < beats.length; b++) err = Math.min(err, Math.abs(api.elapsed - beats[b]) * 1000);
        record(err + 20);
        return;
      }
      if (kind === "rapid") {
        record((api.elapsed - cueAt) * 1000);
        return;
      }
      record((api.elapsed - cueAt) * 1000);
    }

    function update(dt) {
      flash = Math.max(0, flash - dt);
      if (kind === "beat") {
        if (state === "wait" && api.elapsed >= beatAt - 1.0) fire();
        if (state === "go") {
          var nextBeat = beats[Math.min(beatIndex, beats.length - 1)];
          if (api.elapsed > nextBeat + 0.5) {
            lastMs = 900;
            times.push(lastMs);
            if (times.length >= m.rounds) {
              var sum = 0; for (var s = 0; s < times.length; s++) sum += times[s];
              api.finish(Math.round(sum / times.length));
              return;
            }
            beatIndex++;
            if (beatIndex >= beats.length) arm();
          }
        }
      } else if (state === "wait") {
        wait -= dt;
        if (kind === "light") {
          var cycle = api.elapsed % 2.4;
          if (cycle >= 1.9 && cycle < 2.25) fire();
        } else if (wait <= 0) fire();
      } else if (state === "go") {
        var limit = kind === "light" ? 0.5 : kind === "twitch" ? 0.65 : kind === "rapid" ? 1.1 : kind === "bar" ? 1.0 : 2.2;
        if (api.elapsed - cueAt > limit) {
          lastMs = 999;
          times.push(lastMs);
          api.sfx("bad");
          if (times.length >= m.rounds) {
            var t = 0; for (var i = 0; i < times.length; i++) t += times[i];
            api.finish(Math.round(t / times.length));
            return;
          }
          arm();
        }
      }
      api.hud(Math.min(times.length + 1, m.rounds) + " / " + m.rounds,
        times.length ? times[times.length - 1] + " ms" : "ready");
    }

    function draw() {
      api.bg();
      var going = state === "go";
      if (kind === "target" && going) {
        ctx.fillStyle = api.accent;
        ctx.beginPath(); ctx.arc(target.x, target.y, target.r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.8)";
        ctx.lineWidth = 3;
        ctx.stroke();
      } else if (kind === "sides" && going) {
        ctx.fillStyle = side < 0 ? api.accent : "rgba(255,255,255,0.12)";
        rr(ctx, 50, 180, 220, 240, 22); ctx.fill();
        ctx.fillStyle = side > 0 ? api.accent : "rgba(255,255,255,0.12)";
        rr(ctx, W - 270, 180, 220, 240, 22); ctx.fill();
        api.text("TAP THE LIT SIDE", W / 2, 520, 18, "rgba(255,255,255,0.5)");
      } else if (kind === "arrows" && going) {
        api.text(arrow === "left" ? "←" : "→", W / 2, H / 2 - 20, 150, api.accent);
        api.text("TAP THAT SIDE", W / 2, H / 2 + 100, 18, "rgba(255,255,255,0.5)");
      } else if (kind === "bar") {
        ctx.fillStyle = "rgba(255,255,255,0.1)";
        rr(ctx, 70, 250, W - 140, 64, 32); ctx.fill();
        var zw = (m.zone || 0.3) * (W - 140);
        ctx.fillStyle = "rgba(34,197,94,0.35)";
        rr(ctx, W / 2 - zw / 2, 250, zw, 64, 32); ctx.fill();
        var phase = state === "go" ? clamp((api.elapsed - cueAt) / 0.9, 0, 1) : 0;
        var mx = 70 + phase * (W - 140);
        ctx.fillStyle = flash > 0 ? "#f8fafc" : api.accent;
        ctx.beginPath(); ctx.arc(mx, 282, 22, 0, Math.PI * 2); ctx.fill();
        api.text("TAP IN THE GREEN", W / 2, 210, 18, "rgba(255,255,255,0.5)");
      } else if (kind === "beat") {
        var pulse = 0.5 + 0.5 * Math.sin(api.elapsed * 10.1);
        ctx.strokeStyle = "rgba(255,255,255,0.16)";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(W / 2, H / 2, 130, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = going ? api.accent : "rgba(255,255,255,0.1)";
        ctx.globalAlpha = going ? 0.5 + pulse * 0.5 : 1;
        ctx.beginPath(); ctx.arc(W / 2, H / 2, 72, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        api.text("TAP ON THE BEAT", W / 2, H / 2 + 160, 18, "rgba(255,255,255,0.5)");
      } else {
        var active = going || kind === "light";
        var color = "rgba(255,255,255,0.08)";
        if (kind === "light") {
          var cycle = api.elapsed % 2.4;
          color = cycle < 1.2 ? "#ef4444" : cycle < 1.9 ? "#f59e0b" : "#22c55e";
          active = cycle >= 1.9;
        } else if (going) {
          color = api.accent;
        }
        ctx.fillStyle = color;
        rr(ctx, 60, 150, W - 120, H - 300, 26); ctx.fill();
        api.text(going ? "NOW" : (kind === "light" && active ? "GO" : "WAIT"), W / 2, H / 2 - 20, 62,
          going || (kind === "light" && active) ? "#05130b" : "rgba(255,255,255,0.55)");
      }
      if (times.length) api.text(times[times.length - 1] + " ms", W / 2, H - 70, 26, "rgba(255,255,255,0.5)");
    }

    function key(code) {
      if (code === "Space" || code === "Enter") { strike(W / 2, H / 2); return; }
      if (kind === "arrows") {
        if (code === "ArrowLeft" || code === "KeyA") strike(W / 2 - 1, H / 2, "left");
        if (code === "ArrowRight" || code === "KeyD") strike(W / 2 + 1, H / 2, "right");
        return;
      }
      if (code === "ArrowLeft" || code === "KeyA") strike(W / 2 - 1, H / 2, -1);
      if (code === "ArrowRight" || code === "KeyD") strike(W / 2 + 1, H / 2, 1);
    }

    arm();

    return { update: update, draw: draw, down: strike, key: key };
  }

  K.register("reflex", { modes: MODES, make: make });
})();
