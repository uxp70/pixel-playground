/* Hub page: the whole catalogue, searchable and filterable, with your records. */
(function () {
  "use strict";

  var games = (window.PP_GAMES || []).slice();
  var grid = document.getElementById("gameGrid");
  var search = document.getElementById("gameSearch");
  var filters = document.getElementById("gameFilters");
  var countEl = document.getElementById("cardCount");
  var totalEl = document.getElementById("gameCount");
  var emptyEl = document.getElementById("gameEmpty");
  var resetEl = document.getElementById("gameReset");

  if (totalEl) totalEl.textContent = games.length;

  var cards = [];
  var activeCat = "all";
  var query = "";

  function bestLine(game) {
    var value = PP.scores.get(game.id);
    if (value === null || value === undefined) return { text: "No score yet", empty: true };
    var runs = PP.leaderboard.count(game.id);
    return {
      text: "Best " + PP.formatNumber(value) + game.unit + (runs ? " · " + runs + " runs" : ""),
      empty: false,
    };
  }

  function buildCard(game) {
    var card = document.createElement("a");
    card.className = "card";
    card.href = game.href;
    card.style.setProperty("--accent", game.accent);
    card.setAttribute("data-cat", game.category);
    card.setAttribute("data-search",
      [game.title, game.category, game.blurb, game.kit || "classic"]
        .join(" ")
        .toLowerCase());

    var best = bestLine(game);
    card.innerHTML =
      '<span class="card-play" aria-hidden="true">Play →</span>' +
      '<span class="card-icon" aria-hidden="true">' + game.emoji + "</span>" +
      '<span class="card-tag">' + PP.escapeHtml(game.category) + "</span>" +
      "<h3>" + PP.escapeHtml(game.title) + "</h3>" +
      "<p>" + PP.escapeHtml(game.blurb) + "</p>" +
      '<span class="card-best"' + (best.empty ? ' data-empty="true"' : "") + ">" +
      PP.escapeHtml(best.text) + "</span>";

    grid.appendChild(card);
    cards.push(card);
  }

  games.forEach(buildCard);

  var counts = { all: games.length };
  games.forEach(function (game) {
    counts[game.category] = (counts[game.category] || 0) + 1;
  });

  var order = ["all"];
  Object.keys(counts).forEach(function (key) {
    if (key !== "all") order.push(key);
  });
  order.sort(function (a, b) {
    if (a === "all") return -1;
    if (b === "all") return 1;
    return counts[b] - counts[a];
  });

  order.forEach(function (cat) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cab-chip";
    btn.setAttribute("data-cat", cat);
    btn.setAttribute("aria-pressed", cat === activeCat ? "true" : "false");
    btn.textContent = (cat === "all" ? "Everything" : cat) + " " + counts[cat];
    btn.addEventListener("click", function () {
      activeCat = cat;
      Array.prototype.forEach.call(filters.children, function (node) {
        node.setAttribute("aria-pressed", node === btn ? "true" : "false");
      });
      apply();
      PP.sfx("pick");
    });
    filters.appendChild(btn);
  });

  function apply() {
    var shown = 0;
    cards.forEach(function (card) {
      var matchesCat = activeCat === "all" || card.getAttribute("data-cat") === activeCat;
      var matchesText = !query || card.getAttribute("data-search").indexOf(query) !== -1;
      var visible = matchesCat && matchesText;
      card.hidden = !visible;
      if (visible) shown++;
    });
    if (countEl) countEl.textContent = shown;
    if (emptyEl) emptyEl.hidden = shown > 0;
  }

  if (search) {
    search.addEventListener("input", function () {
      query = search.value.trim().toLowerCase();
      apply();
    });
  }

  if (resetEl) {
    resetEl.addEventListener("click", function () {
      query = "";
      activeCat = "all";
      if (search) search.value = "";
      Array.prototype.forEach.call(filters.children, function (node, index) {
        node.setAttribute("aria-pressed", index === 0 ? "true" : "false");
      });
      apply();
    });
  }

  apply();

  var numeric = [];
  games.forEach(function (game) {
    if (game.mode !== "high") return;
    var value = PP.scores.get(game.id);
    if (typeof value === "number") numeric.push(value);
  });

  var stat = document.getElementById("statBest");
  if (stat) {
    stat.textContent = numeric.length ? PP.formatNumber(Math.max.apply(null, numeric)) : "—";
  }
})();
