/* Memory Match — eight emoji pairs on a 4x4 board. */
(function () {
  "use strict";

  var FACES = ["🐙", "🍄", "🚀", "🍕", "🎧", "🌵", "🦊", "⚡"];
  var PAIRS = FACES.length;

  var boardEl = document.getElementById("board");
  var overlay = document.getElementById("overlay");
  var movesEl = document.getElementById("moves");
  var pairsEl = document.getElementById("pairs");
  var timeEl = document.getElementById("time");
  var bestEl = document.getElementById("best");

  var deck = [];
  var first = null;
  var second = null;
  var locked = false;
  var moves = 0;
  var matched = 0;
  var startedAt = 0;
  var ticker = null;

  var best = PP.scores.get("memory");
  bestEl.textContent = best === null ? "—" : PP.formatNumber(best) + " moves";

  function shuffle(list) {
    for (var i = list.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = list[i];
      list[i] = list[j];
      list[j] = tmp;
    }
    return list;
  }

  function formatTime(ms) {
    var total = Math.floor(ms / 1000);
    var mins = Math.floor(total / 60);
    var secs = total % 60;
    return mins + ":" + (secs < 10 ? "0" : "") + secs;
  }

  function paintHud() {
    movesEl.textContent = moves;
    pairsEl.textContent = matched + " / " + PAIRS;
    if (startedAt) timeEl.textContent = formatTime(Date.now() - startedAt);
  }

  function startTimer() {
    if (ticker) return;
    startedAt = Date.now();
    ticker = setInterval(function () {
      timeEl.textContent = formatTime(Date.now() - startedAt);
    }, 250);
  }

  function stopTimer() {
    if (ticker) clearInterval(ticker);
    ticker = null;
  }

  function flip(card) {
    if (locked) return;
    if (card === first || card.classList.contains("matched")) return;
    if (card.getAttribute("aria-pressed") === "true") return;

    startTimer();
    card.setAttribute("aria-pressed", "true");
    card.setAttribute("aria-label", "Card face up: " + card.dataset.face);
    PP.sfx("pick");

    if (!first) {
      first = card;
      return;
    }

    second = card;
    moves++;
    paintHud();

    if (first.dataset.face === second.dataset.face) {
      first.classList.add("matched");
      second.classList.add("matched");
      first.disabled = true;
      second.disabled = true;
      PP.sfx("good");
      PP.juice.burstAt(first, "#34d399", 9, 46);
      PP.juice.burstAt(second, "#34d399", 9, 46);
      PP.juice.bump(pairsEl);
      PP.juice.haptic(12);
      matched++;
      first = null;
      second = null;
      paintHud();
      if (matched === PAIRS) finish();
      return;
    }

    locked = true;
    PP.sfx("bad");
    PP.juice.shake(boardEl, 3);
    PP.juice.haptic(18);
    var a = first;
    var b = second;
    setTimeout(function () {
      a.setAttribute("aria-pressed", "false");
      b.setAttribute("aria-pressed", "false");
      a.setAttribute("aria-label", "Card face down");
      b.setAttribute("aria-label", "Card face down");
      first = null;
      second = null;
      locked = false;
    }, 720);
  }

  function finish() {
    stopTimer();
    var seconds = Math.round((Date.now() - startedAt) / 1000);
    var previous = best;
    best = PP.scores.save("memory", moves, "low");
    bestEl.textContent = PP.formatNumber(best) + " moves";
    PP.leaderboard.submit("memory", moves);
    PP.sfx("win");
    PP.juice.shake(document.querySelector(".stage") || boardEl, 5);
    PP.juice.haptic([20, 40, 20, 40]);

    var record = previous === null || moves < previous;
    PP.showOverlay(
      overlay,
      '<p class="kicker">All pairs found</p>' +
        "<h2>" + (record ? "New record!" : "Cleared!") + "</h2>" +
        '<div class="score-big">' + moves + " moves</div>" +
        "<p>Finished in " + formatTime(seconds * 1000) + ". Best run: " +
        PP.formatNumber(best) + " moves.</p>" +
        '<div class="actions"><button class="btn" type="button" id="again">Play again</button></div>'
    );
    overlay.querySelector("#again").addEventListener("click", reset);
  }

  function reset() {
    PP.hideOverlay(overlay);
    stopTimer();
    deck = shuffle(FACES.concat(FACES));
    first = null;
    second = null;
    locked = false;
    moves = 0;
    matched = 0;
    startedAt = 0;
    boardEl.innerHTML = "";

    deck.forEach(function (face, index) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mcard";
      btn.dataset.face = face;
      btn.setAttribute("aria-pressed", "false");
      btn.setAttribute("aria-label", "Card " + (index + 1) + ", face down");
      btn.innerHTML =
        '<span class="mcard-inner">' +
        '<span class="mface back" aria-hidden="true">✦</span>' +
        '<span class="mface face" aria-hidden="true">' + face + "</span>" +
        "</span>";
      btn.addEventListener("click", function () { flip(btn); });
      boardEl.appendChild(btn);
    });

    paintHud();
    timeEl.textContent = "0:00";
  }

  document.getElementById("newGame").addEventListener("click", reset);
  reset();
})();
