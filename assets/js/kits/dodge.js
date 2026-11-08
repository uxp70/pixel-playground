/* Dodge family — eleven survival games with different threats and movement. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, clamp = K.clamp, near = K.near, rr = K.roundRect;

  var MODES = [
    { name: "Meteor Dip", kind: "shards", speed: 160, gap: 0.55, homing: true, hudA: "Time", hudB: "Dodged", pattern: "stars" },
    { name: "Shard Fall", kind: "shards", speed: 175, gap: 0.6, split: true, hudA: "Time", hudB: "Dodged", pattern: "grid" },
    { name: "Gap Runner", kind: "walls", speed: 120, hudA: "Time", hudB: "Walls", pattern: "bands" },
    { name: "Comet Dodge", kind: "shards", speed: 205, gap: 0.7, trail: true, hudA: "Time", hudB: "Dodged", pattern: "rain" },
    { name: "Spike Rain", kind: "shards", speed: 155, gap: 0.5, spikes: true, lives: 3, hudA: "Time", hudB: "Lives", pattern: "bricks" },
    { name: "Neon Dive", kind: "beams", speed: 130, lives: 3, hudA: "Time", hudB: "Lives", pattern: "scan" },
    { name: "Icefall", kind: "shards", speed: 180, gap: 0.58, ice: true, hudA: "Time", hudB: "Dodged", pattern: "waves" },
    { name: "Drift Zone", kind: "shards", speed: 165, gap: 0.55, drift: true, hudA: "Time", hudB: "Dodged", pattern: "dots" },
    { name: "Hailstorm", kind: "shards", speed: 140, gap: 0.15, small: true, lives: 4, hudA: "Time", hudB: "Lives", pattern: "rain" },
    { name: "Void Sway", kind: "shards", speed: 170, gap: 0.52, sway: true, hudA: "Time", hudB: "Dodged", pattern: "beams" },
    { name: "Last Light", kind: "shards", speed: 185, gap: 0.5, dark: true, lives: 3, hudA: "Time", hudB: "Lives", pattern: "stars" },
  ];

  function make(api) {
    var m = api.mode;
    var kind = m.kind;
    var ctx = api.ctx;
    var px = W / 2;
    var py = H - 48;
    var pr = 16;
    var vx = 0;
    var targetX = W / 2;
    var targetY = H - 48;
    var clock = 0;
    var lives = m.lives || 1;
    var dodged = 0;
    var invuln = 0;
    var hazards = [];
    var walls = [];
    var beams = [];
    var spikes = [];
    var spawn = 0.5;
    var wallGap = 190;
    var wallY = -40;
    var wallGapX = W / 2;
    var beamTimer = 0.6;

    function resetHazards() {
      hazards.length = 0;
      walls.length = 0;
      beams.length = 0;
      spikes.length = 0;
      spawn = 0.6;
      wallY = -40;
      beamTimer = 0.7;
    }

    function hurt() {
      if (invuln > 0) return;
      if (lives > 1) {
        lives--;
        invuln = 1.4;
        resetHazards();
        api.sfx("bad");
        api.shake(12);
        api.haptic([30, 50, 30]);
        return;
      }
      api.sfx("bad");
      api.shake(14);
      api.haptic([30, 60, 40]);
      api.finish(Math.floor(clock));
    }

    function addShard() {
      var r = m.small ? rand(6, 11) : rand(10, 20);
      hazards.push({
        x: rand(20, W - 20),
        y: -r - 10,
        r: r,
        vx: m.homing ? rand(-1, 1) * 20 : 0,
        vy: m.speed * rand(0.8, 1.25),
        trail: [],
        split: m.split,
      });
    }

    function update(dt) {
      clock += dt;
      invuln = Math.max(0, invuln - dt);

      var accel = 900;
      var maxV = 320;
      if (m.ice) {
        if (api.keys.ArrowLeft || api.keys.KeyA) vx -= accel * dt;
        if (api.keys.ArrowRight || api.keys.KeyD) vx += accel * dt;
        vx = clamp(vx, -maxV, maxV);
        px += vx * dt;
        vx *= Math.pow(0.985, dt * 60);
      } else {
        if (api.keys.ArrowLeft || api.keys.KeyA) px -= 340 * dt;
        if (api.keys.ArrowRight || api.keys.KeyD) px += 340 * dt;
      }

      if (kind === "beams") {
        if (api.keys.ArrowUp || api.keys.KeyW) py -= 260 * dt;
        if (api.keys.ArrowDown || api.keys.KeyS) py += 260 * dt;
        py = clamp(py, 120, H - 36);
      } else {
        py = H - 48;
      }

      if (m.drift) px += Math.sin(clock * 0.9) * 40 * dt;
      px = clamp(px, pr + 6, W - pr - 6);

      if (kind === "walls") {
        wallY += m.speed * dt;
        if (wallY > H + 60) {
          wallY = -80;
          dodged++;
          wallGap = Math.max(118, 200 - clock * 2);
          wallGapX = rand(wallGap / 2 + 20, W - wallGap / 2 - 20);
          api.sfx("pick");
        }
        var close = wallY + 46 > py - pr && wallY - 46 < py + pr;
        if (close && (px < wallGapX - wallGap / 2 || px > wallGapX + wallGap / 2)) {
          hurt();
          return;
        }
      } else if (kind === "beams") {
        beamTimer -= dt;
        if (beamTimer <= 0) {
          beamTimer = Math.max(0.55, 1.3 - clock * 0.03);
          beams.push({ x: -160, y: rand(150, H - 80), w: rand(110, 220), h: 16, v: rand(180, 300) });
        }
        for (var b = beams.length - 1; b >= 0; b--) {
          var beam = beams[b];
          beam.x += beam.v * dt;
          if (beam.x > W + 40) { beams.splice(b, 1); dodged++; continue; }
          if (py + pr > beam.y && py - pr < beam.y + beam.h &&
              px + pr > beam.x && px - pr < beam.x + beam.w) { hurt(); return; }
        }
      } else {
        spawn -= dt;
        if (spawn <= 0) {
          spawn = Math.max(0.18, m.gap * rand(0.75, 1.3));
          addShard();
        }
        for (var i = hazards.length - 1; i >= 0; i--) {
          var h = hazards[i];
          if (m.homing) h.vx += clamp(px - h.x, -30, 30) * dt * 2.2;
          h.x += h.vx * dt;
          h.y += h.vy * dt;
          if (m.trail) {
            h.trail.push({ x: h.x, y: h.y });
            if (h.trail.length > 7) h.trail.shift();
          }
          if (m.split && h.split && h.y > H * 0.52) {
            h.split = false;
            for (var s = 0; s < 2; s++) {
              hazards.push({ x: h.x + (s ? 16 : -16), y: h.y, r: h.r * 0.6, vx: s ? 45 : -45, vy: h.vy * 0.9, trail: [], split: false });
            }
          }
          if (m.spikes && h.y > H - 34) {
            spikes.push({ x: h.x, y: H - 14, r: h.r * 0.9, ttl: 4 });
            hazards.splice(i, 1);
            dodged++;
            continue;
          }
          if (h.y > H + 40) {
            hazards.splice(i, 1);
            dodged++;
            continue;
          }
          var hit = near(px, py, pr * 0.8, h.x + (m.sway ? Math.sin(clock * 0.7) * 70 : 0), h.y, h.r);
          if (m.trail) {
            for (var t = 0; t < h.trail.length; t++) {
              if (near(px, py, pr * 0.7, h.trail[t].x, h.trail[t].y, h.r * 0.7)) hit = true;
            }
          }
          if (hit) {
            hurt();
            return;
          }
        }
        for (var sp = spikes.length - 1; sp >= 0; sp--) {
          spikes[sp].ttl -= dt;
          if (spikes[sp].ttl <= 0) spikes.splice(sp, 1);
          else if (near(px, py, pr * 0.8, spikes[sp].x, spikes[sp].y, spikes[sp].r)) { hurt(); return; }
        }
      }

      api.hud(Math.floor(clock) + "s", m.lives ? lives + " lives" : dodged + " dodged");
    }

    function draw() {
      api.bg();
      var sway = m.sway ? Math.sin(clock * 0.7) * 70 : 0;
      var i;
      if (kind === "walls") {
        ctx.fillStyle = "rgba(239,138,90,0.9)";
        ctx.fillRect(0, wallY, wallGapX - wallGap / 2, 46);
        ctx.fillRect(wallGapX + wallGap / 2, wallY, W - wallGapX - wallGap / 2, 46);
        ctx.fillStyle = "rgba(255,255,255,0.12)";
        ctx.fillRect(wallGapX - wallGap / 2, wallY, wallGap, 46);
      } else if (kind === "beams") {
        for (i = 0; i < beams.length; i++) {
          var beam = beams[i];
          var g = ctx.createLinearGradient(beam.x, 0, beam.x + beam.w, 0);
          g.addColorStop(0, "rgba(255,255,255,0)");
          g.addColorStop(0.5, api.accent);
          g.addColorStop(1, "rgba(255,255,255,0)");
          ctx.fillStyle = g;
          ctx.fillRect(beam.x, beam.y, beam.w, beam.h);
        }
      } else {
        for (i = 0; i < hazards.length; i++) {
          var h = hazards[i];
          if (m.trail) {
            for (var t = 0; t < h.trail.length; t++) {
              ctx.globalAlpha = (t + 1) / (h.trail.length + 2);
              ctx.fillStyle = "#f97316";
              ctx.beginPath(); ctx.arc(h.trail[t].x, h.trail[t].y, h.r * 0.55, 0, Math.PI * 2); ctx.fill();
            }
            ctx.globalAlpha = 1;
          }
          ctx.fillStyle = m.spikes ? "#fbbf24" : "#ef8a5a";
          ctx.beginPath();
          ctx.moveTo(h.x + sway, h.y - h.r);
          ctx.lineTo(h.x + h.r + sway, h.y + h.r * 0.75);
          ctx.lineTo(h.x - h.r + sway, h.y + h.r * 0.75);
          ctx.closePath();
          ctx.fill();
        }
        for (i = 0; i < spikes.length; i++) {
          ctx.globalAlpha = Math.min(1, spikes[i].ttl);
          ctx.fillStyle = "#fbbf24";
          ctx.beginPath();
          ctx.moveTo(spikes[i].x, spikes[i].y - spikes[i].r * 1.5);
          ctx.lineTo(spikes[i].x + spikes[i].r, spikes[i].y + 6);
          ctx.lineTo(spikes[i].x - spikes[i].r, spikes[i].y + 6);
          ctx.closePath(); ctx.fill();
          ctx.globalAlpha = 1;
        }
      }

      var alpha = invuln > 0 ? 0.35 + 0.35 * Math.sin(clock * 22) : 1;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#f8fafc";
      ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = api.accent;
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(px, py, pr + 5, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;

      if (m.dark) {
        var light = ctx.createRadialGradient(px, py, 30, px, py, 190);
        light.addColorStop(0, "rgba(3,5,10,0)");
        light.addColorStop(1, "rgba(3,5,10,0.93)");
        ctx.fillStyle = light;
        ctx.fillRect(0, 0, W, H);
      }
      if (invuln > 0) api.text("SHIELD", W / 2, 70, 18, "rgba(255,255,255,0.5)");
    }

    function move(x, y) {
      if (m.ice) {
        vx += clamp((x - px) * 6, -140, 140);
        return;
      }
      px = clamp(x, pr + 6, W - pr - 6);
      if (kind === "beams") py = clamp(y, 120, H - 36);
    }

    function key(code) {
      if (code === "Space") return;
    }

    return { update: update, draw: draw, move: move, key: key };
  }

  MODES.forEach(function (mode, index) {
    K.register(K.engineId(mode.name), {
      modes: [mode],
      make: function (api) {
        api.mode = mode;
        api.level = index + 1;
        return make(api);
      },
    });
  });
})();
