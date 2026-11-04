/* Simon — repeat the growing colour sequence. Each pad has its own tone. */
(function () {
  "use strict";

  var COLORS = [
    { freq: 329.63 }, /* green  */
    { freq: 261.63 }, /* red    */
    { freq: 392.0 },  /* yellow */
    { freq: 196.0 },  /* blue   */
  ];

  var pads = Array.prototype.slice.call(document.querySelectorAll(".simon-pad"));
  var overlay = document.getElementById("overlay");
  var statusEl = document.getElementById("status");
  var roundEl = document.getElementById("round");
  var clearedEl = document.getElementById("cleared");
  var bestEl = document.getElementById("best");

  var best = PP.scores.get("simon") || 0;
  var sequence = [];
  var inputIndex = 0;
  var accepting = false;
  var playing = false;
  var timers = [];
  var cleared = 0;

  bestEl.textContent = PP.formatNumber(best);

  function setStatus(text, tone) {
    statusEl.textContent = text;
    if (tone) statusEl.setAttribute("data-tone", tone);
    else statusEl.removeAttribute("data-tone");
  }

  function paintHud() {
    roundEl.textContent = sequence.length;
    clearedEl.textContent = cleared;
    bestEl.textContent = PP.formatNumber(best);
  }

  function clearTimers() {
    timers.forEach(function (id) { clearTimeout(id); });
    timers = [];
  }

  function later(fn, ms) {
    timers.push(setTimeout(fn, ms));
  }

  function flash(index, ms) {
    var pad = pads[index];
    if (!pad) return;
    pad.classList.add("is-lit");
    PP.tone(COLORS[index].freq, ms || 260, "sine", 0.1);
    later(function () { pad.classList.remove("is-lit"); }, ms || 260);
  }

  function lockPads(locked) {
    pads.forEach(function (pad) { pad.disabled = locked; });
  }

  function playSequence() {
    playing = true;
    accepting = false;
    inputIndex = 0;
    lockPads(true);
    setStatus("Watch closely…", "go");

    var gap = Math.max(280, 620 - sequence.length * 22);
    var i = 0;

    function next() {
      if (i >= sequence.length) {
        playing = false;
        accepting = true;
        lockPads(false);
        setStatus("Your turn — repeat it.", "go");
        return;
      }
      flash(sequence[i], Math.min(340, gap * 0.6));
      i++;
      later(next, gap);
    }

    later(next, 650);
  }

  function nextRound() {
    sequence.push(Math.floor(Math.random() * pads.length));
    paintHud();
    playSequence();
  }

  function start() {
    PP.hideOverlay(overlay);
    clearTimers();
    pads.forEach(function (pad) { pad.classList.remove("is-lit"); });
    sequence = [];
    cleared = 0;
    inputIndex = 0;
    paintHud();
    later(nextRound, 320);
  }

  function fail() {
    accepting = false;
    playing = false;
    clearTimers();
    pads.forEach(function (pad) { pad.classList.remove("is-lit"); });
    lockPads(true);
    PP.sfx("bad");
    PP.juice.shake(document.querySelector(".stage"), 8);
    PP.juice.haptic([30, 60, 60]);
    setStatus("Wrong pad — sequence broken.", "bad");

    var completed = Math.max(0, sequence.length - 1);
    var previous = best;
    best = PP.scores.save("simon", completed, "high");
    paintHud();

    PP.showOverlay(
      overlay,
      '<p class="kicker">Sequence broken</p>' +
        "<h2>" + (completed > previous ? "New record!" : "Nice run") + "</h2>" +
        '<div class="score-big">' + completed + " rounds</div>" +
        "<p>You got through " + completed + " round" + (completed === 1 ? "" : "s") +
        ". Best: " + PP.formatNumber(best) + ".</p>" +
        '<div class="actions"><button class="btn" type="button" id="again">Play again</button></div>'
    );
    overlay.querySelector("#again").addEventListener("click", start);
  }

  function success() {
    cleared = sequence.length;
    paintHud();
    PP.sfx("win");
    PP.juice.bump(roundEl);
    PP.juice.haptic(10);
    setStatus("Correct! Next round coming…", "go");
    accepting = false;
    lockPads(true);
    later(nextRound, 900);
  }

  function choose(index) {
    if (!accepting || playing) return;
    flash(index, 200);
    PP.juice.haptic(12);

    if (sequence[inputIndex] !== index) {
      fail();
      return;
    }

    inputIndex++;
    if (inputIndex >= sequence.length) success();
  }

  pads.forEach(function (pad, index) {
    pad.addEventListener("click", function () { choose(index); });
  });

  document.addEventListener("keydown", function (event) {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    var map = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Numpad1: 0, Numpad2: 1, Numpad3: 2, Numpad4: 3 };
    if (map[event.code] === undefined) return;
    event.preventDefault();
    choose(map[event.code]);
  });

  function showStart() {
    PP.showOverlay(
      overlay,
      '<p class="kicker">Ready</p><h2>Simon</h2>' +
        "<p>Four pads, one growing sequence. Watch and listen, then repeat it in order.</p>" +
        '<div class="actions"><button class="btn" type="button" id="play">Start game</button></div>'
    );
    overlay.querySelector("#play").addEventListener("click", start);
  }

  lockPads(true);
  paintHud();
  showStart();
})();
