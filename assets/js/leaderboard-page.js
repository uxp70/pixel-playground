/* Leaderboard page: renders the saved runs for every game. */
(function () {
  "use strict";

  var LB = PP.leaderboard;
  var games = LB.games();

  var tabsEl = document.getElementById("lbTabs");
  var listEl = document.getElementById("lbList");
  var titleEl = document.getElementById("lbTitle");
  var emptyEl = document.getElementById("lbEmpty");
  var clearBtn = document.getElementById("lbClear");
  var nameInput = document.getElementById("lbName");
  var saveNameBtn = document.getElementById("lbSaveName");
  var hintEl = document.getElementById("lbPlayerHint");
  var totalEl = document.getElementById("lbTotal");

  var active = "all";

  var query = /[?&]game=([a-z0-9-]+)/i.exec(window.location.search || "");
  if (query) {
    var wanted = query[1].toLowerCase();
    if (games.indexOf(wanted) !== -1) active = wanted;
  }

  function totalRuns() {
    return games.reduce(function (sum, id) { return sum + LB.count(id); }, 0);
  }

  function formatDate(at) {
    try {
      return new Date(at).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    } catch (err) {
      return "";
    }
  }

  function medal(rank) {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return String(rank);
  }

  function row(id, run, rank) {
    var item = document.createElement("li");
    item.className = "lb-row";
    item.setAttribute("data-rank", String(rank));
    item.innerHTML =
      '<span class="lb-pos">' + medal(rank) + "</span>" +
      '<span class="lb-score">' + PP.escapeHtml(LB.describe(id, run.score)) + "</span>" +
      '<span class="lb-who">' + PP.escapeHtml(run.player || "Player") + "</span>" +
      '<span class="lb-when">' + formatDate(run.at) + "</span>";
    return item;
  }

  function gameGroup(id, limit) {
    var meta = LB.meta(id);
    var runs = LB.top(id, limit || 3);
    if (!runs.length || !meta) return null;

    var wrap = document.createElement("section");
    wrap.className = "lb-group";

    var head = document.createElement("div");
    head.className = "lb-group-head";
    head.innerHTML = "<h3>" + PP.escapeHtml(meta.label) + "</h3>" +
      "<span>" + LB.count(id) + (LB.count(id) === 1 ? " run" : " runs") + "</span>";
    wrap.appendChild(head);

    var list = document.createElement("ol");
    list.className = "lb-list";
    runs.forEach(function (run, index) {
      list.appendChild(row(id, run, index + 1));
    });
    wrap.appendChild(list);
    return wrap;
  }

  function renderTabs() {
    tabsEl.innerHTML = "";

    var all = document.createElement("button");
    all.type = "button";
    all.className = "lb-tab";
    all.textContent = "All games";
    all.setAttribute("aria-pressed", active === "all" ? "true" : "false");
    all.addEventListener("click", function () { select("all"); });
    tabsEl.appendChild(all);

    games.forEach(function (id) {
      var meta = LB.meta(id);
      if (!meta) return;
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "lb-tab";
      btn.textContent = meta.label;
      btn.setAttribute("aria-pressed", active === id ? "true" : "false");
      btn.addEventListener("click", function () { select(id); });
      tabsEl.appendChild(btn);
    });
  }

  function render() {
    renderTabs();
    listEl.innerHTML = "";

    var shown = 0;

    if (active === "all") {
      titleEl.textContent = "Every game";
      games.forEach(function (id) {
        var node = gameGroup(id, 3);
        if (!node) return;
        listEl.appendChild(node);
        shown++;
      });
      clearBtn.textContent = "Clear everything";
    } else {
      var meta = LB.meta(active);
      titleEl.textContent = meta ? meta.label : "Top runs";
      var runs = LB.top(active, 10);
      if (runs.length) {
        var list = document.createElement("ol");
        list.className = "lb-list";
        runs.forEach(function (run, index) {
          list.appendChild(row(active, run, index + 1));
        });
        listEl.appendChild(list);
        shown = runs.length;
      }
      clearBtn.textContent = "Clear this board";
    }

    emptyEl.hidden = shown > 0;
    clearBtn.disabled = active === "all" ? totalRuns() === 0 : LB.count(active) === 0;

    var total = totalRuns();
    totalEl.textContent = total === 0
      ? "No runs filed yet"
      : total + (total === 1 ? " run saved" : " runs saved") + " · " +
        games.filter(function (id) { return LB.count(id) > 0; }).length + " of " +
        games.length + " games played";
  }

  function select(id) {
    active = id;
    render();
    var url = id === "all"
      ? "leaderboard.html"
      : "leaderboard.html?game=" + encodeURIComponent(id);
    try { window.history.replaceState(null, "", url); } catch (err) { /* file:// */ }
  }

  nameInput.value = LB.player();

  saveNameBtn.addEventListener("click", function () {
    var name = LB.setPlayer(nameInput.value);
    nameInput.value = name;
    hintEl.textContent = "New runs are filed as \"" + name + "\".";
    PP.sfx("good");
  });

  nameInput.addEventListener("keydown", function (event) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    saveNameBtn.click();
  });

  clearBtn.addEventListener("click", function () {
    var scope = active === "all"
      ? "every score on this device"
      : "the " + (LB.meta(active) ? LB.meta(active).label : active) + " board";
    if (!window.confirm("Clear " + scope + "? This cannot be undone.")) return;
    LB.clear(active === "all" ? null : active);
    PP.sfx("bad");
    render();
  });

  render();
})();
