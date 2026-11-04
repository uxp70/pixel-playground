/* Leaderboard page: every finished run, filterable by game and by player. */
(function () {
  "use strict";

  var LB = PP.leaderboard;
  var AUTH = PP.auth;
  var games = LB.games();
  var CATALOGUE = window.PP_GAMES || [];

  var listEl = document.getElementById("lbList");
  var titleEl = document.getElementById("lbTitle");
  var emptyEl = document.getElementById("lbEmpty");
  var clearBtn = document.getElementById("lbClear");
  var selectEl = document.getElementById("lbGame");
  var mineEl = document.getElementById("lbMine");
  var totalEl = document.getElementById("lbTotal");
  var accountRow = document.getElementById("lbAccountRow");
  var hintEl = document.getElementById("lbPlayerHint");

  var active = "all";
  var mineOnly = false;

  var query = /[?&]game=([a-z0-9-]+)/i.exec(window.location.search || "");
  if (query && games.indexOf(query[1].toLowerCase()) !== -1) active = query[1].toLowerCase();

  function who() {
    var me = AUTH.current();
    return me ? me.name : LB.player();
  }

  function buildSelect() {
    var all = document.createElement("option");
    all.value = "all";
    all.textContent = "All games (" + games.length + ")";
    selectEl.appendChild(all);

    var groups = {};
    var order = [];
    CATALOGUE.forEach(function (game) {
      if (!groups[game.category]) {
        groups[game.category] = [];
        order.push(game.category);
      }
      groups[game.category].push(game);
    });
    order.sort();

    order.forEach(function (category) {
      var group = document.createElement("optgroup");
      group.label = category;
      groups[category].forEach(function (game) {
        var option = document.createElement("option");
        option.value = game.id;
        option.textContent = game.title;
        group.appendChild(option);
      });
      selectEl.appendChild(group);
    });

    selectEl.value = active;
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

  function runsFor(id) {
    var runs = LB.runs(id);
    if (!mineOnly) return runs;
    var name = who().toLowerCase();
    return runs.filter(function (run) {
      return String(run.player || "").toLowerCase() === name;
    });
  }

  function row(id, run, rank) {
    var mine = String(run.player || "").toLowerCase() === who().toLowerCase();
    var item = document.createElement("li");
    item.className = "lb-row" + (mine ? " is-mine" : "");
    item.setAttribute("data-rank", String(rank));
    item.innerHTML =
      '<span class="lb-pos">' + medal(rank) + "</span>" +
      '<span class="lb-score">' + PP.escapeHtml(LB.describe(id, run.score)) + "</span>" +
      '<span class="lb-who"><span class="lb-av" aria-hidden="true">' +
      AUTH.avatar(run.player) + "</span>" +
      PP.escapeHtml(run.player || "Player") + "</span>" +
      '<span class="lb-when">' + formatDate(run.at) + "</span>";
    return item;
  }

  function groupOf(id, limit) {
    var meta = LB.meta(id);
    var runs = runsFor(id);
    if (!runs.length || !meta) return null;

    var wrap = document.createElement("section");
    wrap.className = "lb-group";

    var head = document.createElement("div");
    head.className = "lb-group-head";
    head.innerHTML = "<h3>" + PP.escapeHtml(meta.label) + "</h3>" +
      "<span>" + runs.length + (runs.length === 1 ? " run" : " runs") + "</span>";
    wrap.appendChild(head);

    var list = document.createElement("ol");
    list.className = "lb-list";
    runs.slice(0, limit).forEach(function (run, index) {
      list.appendChild(row(id, run, index + 1));
    });
    wrap.appendChild(list);
    return wrap;
  }

  function renderAccount() {
    var me = AUTH.current();
    if (me) {
      var stats = AUTH.stats(me.name);
      accountRow.innerHTML =
        '<div class="lb-account-card">' +
        '<span class="avatar" aria-hidden="true">' + me.avatar + "</span>" +
        "<div>" +
        '<div class="lb-account-name">' + PP.escapeHtml(me.name) + "</div>" +
        '<div class="lb-account-sub">' + stats.runs + " runs · " + stats.games +
        " games · " + stats.bests.length + " records</div>" +
        "</div>" +
        '<a class="btn small ghost" href="account.html">Manage account</a>' +
        "</div>";
      hintEl.textContent = 'New runs are filed as "' + me.name + '".';
    } else {
      accountRow.innerHTML =
        '<div class="lb-account-card">' +
        '<span class="avatar" aria-hidden="true">👤</span>' +
        "<div>" +
        '<div class="lb-account-name">No account on this device</div>' +
        '<div class="lb-account-sub">Runs are filed as "' +
        PP.escapeHtml(LB.player()) + '"</div>' +
        "</div>" +
        '<a class="btn small" href="account.html">Create an account</a>' +
        "</div>";
      hintEl.textContent = "A device account keeps everyone's records apart.";
    }
  }

  function render() {
    listEl.innerHTML = "";
    var shown = 0;

    if (active === "all") {
      titleEl.textContent = "Every game";
      games.forEach(function (id) {
        var node = groupOf(id, 3);
        if (!node) return;
        listEl.appendChild(node);
        shown++;
      });
      clearBtn.textContent = "Clear everything";
    } else {
      var meta = LB.meta(active);
      titleEl.textContent = meta ? meta.label : "Top runs";
      var runs = runsFor(active);
      if (runs.length) {
        var list = document.createElement("ol");
        list.className = "lb-list";
        runs.slice(0, 15).forEach(function (run, index) {
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
    var played = games.filter(function (id) { return LB.count(id) > 0; }).length;
    totalEl.textContent = total === 0
      ? "No runs filed yet"
      : total + (total === 1 ? " run saved" : " runs saved") +
        " · " + played + " of " + games.length + " games played";
  }

  function totalRuns() {
    return games.reduce(function (sum, id) { return sum + LB.count(id); }, 0);
  }

  function select(id) {
    active = id;
    render();
    var url = id === "all"
      ? "leaderboard.html"
      : "leaderboard.html?game=" + encodeURIComponent(id);
    try { window.history.replaceState(null, "", url); } catch (err) { /* file:// */ }
  }

  selectEl.addEventListener("change", function () {
    select(selectEl.value);
    PP.sfx("pick");
  });

  mineEl.addEventListener("change", function () {
    mineOnly = mineEl.checked;
    render();
    PP.sfx("pick");
  });

  clearBtn.addEventListener("click", function () {
    var meta = active === "all" ? null : LB.meta(active);
    var scope = active === "all"
      ? "every score saved on this device, for every account"
      : "the whole " + (meta ? meta.label : active) + " board, for every account";
    if (!window.confirm("Clear " + scope + "? This cannot be undone.")) return;
    LB.clear(active === "all" ? null : active);
    PP.sfx("bad");
    render();
    renderAccount();
  });

  buildSelect();
  renderAccount();
  render();
})();
