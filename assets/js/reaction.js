/* Reaction Test — five rounds, average reaction time. */
(function () {
  "use strict";

  var ROUNDS = 5;
  var MIN_WAIT = 1100;
  var MAX_WAIT = 3600;

  var pad = document.getElementById("pad");
  var padTitle = document.getElementById("padTitle");
  var padSub = document.getElementById("padSub");
  var roundsEl = document.getElementById("rounds");
  var roundEl = document.getElementById("round");
  var lastEl = document.getElementById("last");
  var avgEl = document.getElementById("average");
  var bestEl = document.getElementById("best");
  var resetBtn = document.getElementById("reset");

  var state = "idle";
  var times = [];
  var timer = null;
  var goAt = 0;
  var lastValue = null;

  var best = PP.scores.get("reaction");
  paintBest();

  function paintBest() {
    bestEl.textContent = best === null ? "—" : PP.formatNumber(best) + " ms";
  }

  function setPad(kind, title, sub) {
    state = kind;
    pad.setAttribute("data-state", kind);
    padTitle.textContent = title;
    padSub.textContent = sub;
  }

  function buildPills() {
    roundsEl.innerHTML = "";
    for (var i = 0; i < ROUNDS; i++) {
      var pill = document.createElement("span");
      pill.className = "round-pill";
      pill.textContent = times[i] === undefined ? "—" : times[i] + " ms";
      if (times[i] !== undefined) pill.setAttribute("data-done", "true");
      roundsEl.appendChild(pill);
    }
  }

  function refreshHud() {
    roundEl.textContent = Math.min(times.length + (state === "waiting" || state === "go" ? 1 : 0), ROUNDS) + " / " + ROUNDS;
    lastEl.textContent = lastValue === null ? "—" : lastValue + " ms";
    if (times.length) {
      var sum = times.reduce(function (a, b) { return a + b; }, 0);
      avgEl.textContent = Math.round(sum / times.length) + " ms";
    } else {
      avgEl.textContent = "—";
    }
    buildPills();
  }

  function clearTimer() {
    if (timer) clearTimeout(timer);
    timer = null;
  }

  function startRound() {
    clearTimer();
    lastValue = null;
    setPad(
      "waiting",
      "Wait for green…",
      "Round " + (times.length + 1) + " of " + ROUNDS
    );
    refreshHud();
    var delay = MIN_WAIT + Math.random() * (MAX_WAIT - MIN_WAIT);
    timer = setTimeout(function () {
      timer = null;
      goAt = performance.now();
      setPad("go", "TAP!", "Now!");
      PP.juice.haptic(20);
      refreshHud();
    }, delay);
  }

  function scoreRound() {
    var elapsed = Math.round(performance.now() - goAt);
    times.push(elapsed);
    lastValue = elapsed;
    PP.sfx("good");
    PP.juice.bump(lastEl);
    PP.juice.haptic(10);
    clearTimer();

    if (times.length >= ROUNDS) {
      finish();
      return;
    }

    setPad("result", elapsed + " ms", "Nice. Tap for round " + (times.length + 1) + " of " + ROUNDS);
    refreshHud();
  }

  function finish() {
    var sum = times.reduce(function (a, b) { return a + b; }, 0);
    var average = Math.round(sum / times.length);
    var previous = best;
    best = PP.scores.save("reaction", average, "low");
    paintBest();
    PP.sfx("win");
    PP.juice.shake(pad, 4);
    PP.juice.haptic([20, 40, 20, 40]);

    var verdict =
      average < 200 ? "That's genuinely fast." :
      average < 280 ? "Solid reflexes." :
      average < 380 ? "About average — not bad." :
      "Slow and steady still counts.";

    setPad(
      "done",
      average + " ms average",
      (previous === null || average < previous ? "New personal best! " : "") + verdict + " Tap to play again."
    );
    refreshHud();
  }

  function resetRun() {
    clearTimer();
    times = [];
    lastValue = null;
    setPad("idle", "Tap to start", "Five rounds · wait for green");
    refreshHud();
  }

  pad.addEventListener("click", function () {
    // Guard against the click that lands right after the pad turns green:
    // a tap within ~80 ms of the green flash is still treated as a real hit.
    if (state === "idle" || state === "done") {
      times = [];
      lastValue = null;
      startRound();
      return;
    }
    if (state === "waiting") {
      clearTimer();
      PP.sfx("bad");
      PP.juice.shake(pad, 5);
      PP.juice.haptic([20, 40, 20]);
      setPad("early", "Too soon!", "Wait for green, then tap. Tap to retry this round.");
      refreshHud();
      return;
    }
    if (state === "early") {
      startRound();
      return;
    }
    if (state === "go") {
      scoreRound();
      return;
    }
    if (state === "result") {
      startRound();
    }
  });

  resetBtn.addEventListener("click", resetRun);

  resetRun();
})();
