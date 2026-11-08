/* Quiz family — eleven arithmetic games with different questions and clocks. */
(function () {
  "use strict";
  var K = window.PP_KIT;
  var W = K.W, H = K.H, rand = K.rand, clamp = K.clamp, rr = K.roundRect;

  var MODES = [
    { name: "Quick Math", kind: "add", total: 8, time: 10, hudA: "Correct", hudB: "Time", pattern: "grid" },
    { name: "Number Crunch", kind: "mixed", total: 8, time: 10, hudA: "Correct", hudB: "Time", pattern: "dots" },
    { name: "Sum Sprint", kind: "add", total: 10, time: 6, hudA: "Correct", hudB: "Time", pattern: "bands" },
    { name: "Equation Dash", kind: "missing", total: 8, time: 10, hudA: "Solved", hudB: "Time", pattern: "scan" },
    { name: "Mental Grit", kind: "mixed", total: 10, time: 0, hudA: "Correct", hudB: "Question", pattern: "stars" },
    { name: "Add Attack", kind: "add", total: 15, time: 5, hudA: "Correct", hudB: "Time", pattern: "rain" },
    { name: "Times Table", kind: "times", total: 8, time: 10, hudA: "Correct", hudB: "Time", pattern: "bricks" },
    { name: "Fraction Flip", kind: "fraction", total: 8, time: 12, hudA: "Correct", hudB: "Time", pattern: "waves" },
    { name: "Pattern Sum", kind: "pattern", total: 8, time: 12, hudA: "Correct", hudB: "Time", pattern: "beams" },
    { name: "Brain Bolt", kind: "bool", total: 10, time: 6, hudA: "Correct", hudB: "Time", pattern: "scan" },
    { name: "Sum Storm", kind: "mixed", total: 12, time: 7, hudA: "Correct", hudB: "Time", pattern: "stars" },
  ];

  function make(api) {
    var m = api.mode;
    var kind = m.kind;
    var ctx = api.ctx;
    var index = 0;
    var correct = 0;
    var question = null;
    var picked = -1;
    var paused = 0;
    var timeLeft = m.time || 0;
    var wasRight = false;
    var lives = kind === "mixed" && m.name === "Mental Grit" ? 1 : 0;

    function uniqueOptions(answer, spread) {
      var options = [answer];
      var guard = 0;
      while (options.length < 4 && guard++ < 80) {
        var fake = answer + Math.round(rand(-spread, spread));
        if (fake !== answer && options.indexOf(fake) === -1) options.push(fake);
      }
      while (options.length < 4) options.push(answer + options.length);
      options.sort(function () { return Math.random() - 0.5; });
      return options;
    }

    function makeQuestion() {
      var a, b, c, d, answer, text;
      if (kind === "add") {
        a = 2 + Math.floor(rand(0, 12 + api.level * 2));
        b = 2 + Math.floor(rand(0, 12 + api.level * 2));
        answer = a + b;
        text = a + " + " + b + " = ?";
        return { text: text, answer: answer, options: uniqueOptions(answer, 9) };
      }
      if (kind === "times") {
        a = 2 + Math.floor(rand(0, 9 + api.level));
        b = 2 + Math.floor(rand(0, 10));
        answer = a * b;
        return { text: a + " × " + b + " = ?", answer: answer, options: uniqueOptions(answer, 12) };
      }
      if (kind === "missing") {
        a = 2 + Math.floor(rand(0, 20));
        b = 2 + Math.floor(rand(0, 20));
        c = a + b;
        answer = b;
        return { text: a + " + ? = " + c, answer: answer, options: uniqueOptions(answer, 8) };
      }
      if (kind === "fraction") {
        d = 4 + Math.floor(rand(0, 5));
        a = 1 + Math.floor(rand(0, d - 2));
        b = 1 + Math.floor(rand(0, d - a));
        answer = a + b;
        return { text: a + "/" + d + " + " + b + "/" + d + " = ?/" + d, answer: answer, options: uniqueOptions(answer, 5) };
      }
      if (kind === "pattern") {
        a = 2 + Math.floor(rand(0, 9));
        b = 2 + Math.floor(rand(0, 7));
        var seq = [a, a + b, a + b * 2, a + b * 3];
        answer = a + b * 4;
        return { text: seq.join(", ") + ", ?", answer: answer, options: uniqueOptions(answer, 8) };
      }
      if (kind === "bool") {
        a = 2 + Math.floor(rand(0, 14));
        b = 2 + Math.floor(rand(0, 14));
        c = a + b;
        var wrong = Math.random() < 0.5;
        var shown = wrong ? c + (Math.random() < 0.5 ? 1 : -1) : c;
        answer = wrong ? 0 : 1;
        return {
          text: a + " + " + b + " = " + shown,
          answer: answer,
          options: [0, 1],
          labels: ["FALSE", "TRUE"],
        };
      }
      a = 2 + Math.floor(rand(0, 18));
      b = 2 + Math.floor(rand(0, 14));
      if (Math.random() < 0.5) {
        answer = a + b;
        text = a + " + " + b + " = ?";
      } else {
        if (b > a) { var t = a; a = b; b = t; }
        answer = a - b;
        text = a + " − " + b + " = ?";
      }
      return { text: text, answer: answer, options: uniqueOptions(answer, 8) };
    }

    function nextQuestion() {
      picked = -1;
      wasRight = false;
      paused = 0;
      timeLeft = m.time || 0;
      question = makeQuestion();
      if (question.labels) question.options = [0, 1];
      api.hud(correct, (index + 1) + " / " + m.total);
    }

    function advance() {
      index++;
      if (index >= m.total) { api.finish(correct); return; }
      nextQuestion();
    }

    function optionRect(i) {
      var w = (W - 110) / 2;
      var h = 76;
      return {
        x: 36 + (i % 2) * (w + 38),
        y: 350 + Math.floor(i / 2) * (h + 20),
        w: w,
        h: h,
      };
    }

    nextQuestion();

    function update(dt) {
      if (paused > 0) {
        paused -= dt;
        if (paused <= 0) advance();
        return;
      }
      if (m.time) {
        timeLeft -= dt;
        if (timeLeft <= 0) {
          api.sfx("bad");
          api.shake(5);
          picked = -1;
          paused = 0.55;
          return;
        }
      }
      api.hud(correct, m.time ? Math.max(0, Math.ceil(timeLeft)) + "s" : (index + 1) + " / " + m.total);
    }

    function draw() {
      api.bg();
      ctx.fillStyle = "rgba(255,255,255,0.07)";
      rr(ctx, 36, 66, W - 72, 236, 22); ctx.fill();
      api.text(question.text, W / 2, 168, question.text.length > 18 ? 40 : 52, "#f8fafc");
      if (m.time) api.text(Math.max(0, Math.ceil(timeLeft)) + "s", W / 2, 250, 24, api.accent);

      for (var i = 0; i < question.options.length; i++) {
        var r = optionRect(i);
        var chosen = picked === i;
        var isAnswer = question.options[i] === question.answer;
        ctx.fillStyle = "rgba(255,255,255,0.1)";
        if (chosen) ctx.fillStyle = wasRight ? "#22c55e" : "#ef4444";
        if (paused > 0 && isAnswer) ctx.fillStyle = "#22c55e";
        rr(ctx, r.x, r.y, r.w, r.h, 16); ctx.fill();
        var label = question.labels ? question.labels[question.options[i]] : String(question.options[i]);
        api.text(label, r.x + r.w / 2, r.y + r.h / 2 + 2, question.labels ? 26 : 32, "#f8fafc");
      }
    }

    function tap(x, y) {
      if (paused > 0) return;
      for (var i = 0; i < question.options.length; i++) {
        var r = optionRect(i);
        if (x < r.x || x > r.x + r.w || y < r.y || y > r.y + r.h) continue;
        picked = i;
        wasRight = question.options[i] === question.answer;
        if (wasRight) {
          correct++;
          api.sfx("good");
          api.burst(r.x + r.w / 2, r.y + r.h / 2, "#22c55e", 9);
          api.haptic(7);
        } else {
          api.sfx("bad");
          api.shake(7);
          api.haptic(16);
          if (lives) { api.finish(correct); return; }
        }
        paused = 0.5;
        return;
      }
    }

    return { update: update, draw: draw, tap: tap };
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
