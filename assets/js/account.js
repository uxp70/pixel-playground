/* Account page: device profiles, their records and the list on this device. */
(function () {
  "use strict";

  var AUTH = PP.auth;

  var formsEl = document.getElementById("accountForms");
  var signedEl = document.getElementById("signedIn");
  var profileAvatar = document.getElementById("profileAvatar");
  var profileName = document.getElementById("profileName");
  var profileSince = document.getElementById("profileSince");
  var profileStats = document.getElementById("profileStats");
  var profileBests = document.getElementById("profileBests");
  var profileRuns = document.getElementById("profileRuns");
  var signOutBtn = document.getElementById("signOut");
  var listEl = document.getElementById("deviceAccounts");

  var signinForm = document.getElementById("signinForm");
  var signinName = document.getElementById("signinName");
  var signinPin = document.getElementById("signinPin");
  var signinError = document.getElementById("signinError");

  var signupForm = document.getElementById("signupForm");
  var signupName = document.getElementById("signupName");
  var signupPin = document.getElementById("signupPin");
  var signupPin2 = document.getElementById("signupPin2");
  var signupError = document.getElementById("signupError");

  function gameHref(id) {
    var entry = window.PP_GAME_BY_ID ? window.PP_GAME_BY_ID[id] : null;
    return entry ? entry.href : "index.html#games";
  }

  function shortDate(at) {
    try {
      return new Date(at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    } catch (err) {
      return "";
    }
  }

  function say(el, message) {
    if (!el) return;
    el.textContent = message || "";
    el.hidden = !message;
  }

  function renderProfile(me) {
    var stats = AUTH.stats(me.name);

    profileAvatar.textContent = me.avatar;
    profileName.textContent = me.name;
    profileSince.textContent = me.created
      ? "Playing here since " + shortDate(me.created)
      : "Signed in on this device";

    profileStats.innerHTML =
      '<div class="ac-stat"><b>' + stats.runs + "</b><span>runs filed</span></div>" +
      '<div class="ac-stat"><b>' + stats.games + "</b><span>games played</span></div>" +
      '<div class="ac-stat"><b>' + stats.bests.length + "</b><span>records held</span></div>";

    profileBests.innerHTML = "";
    if (!stats.bests.length) {
      profileBests.innerHTML =
        '<p class="ac-sub">No runs yet. <a href="index.html#games">Pick a game</a> and ' +
        "finish one — it lands here and on the leaderboard.</p>";
    } else {
      stats.bests.forEach(function (item) {
        var row = document.createElement("a");
        row.className = "ac-best";
        row.href = gameHref(item.game);
        row.innerHTML =
          '<span class="ac-best-name">' + PP.escapeHtml(item.label) + "</span>" +
          '<span class="ac-best-score">' + PP.formatNumber(item.score) + PP.escapeHtml(item.unit) + "</span>";
        profileBests.appendChild(row);
      });
    }

    profileRuns.innerHTML = "";
    if (!stats.recent.length) {
      profileRuns.innerHTML = '<p class="ac-sub">Nothing filed under this name yet.</p>';
    } else {
      stats.recent.forEach(function (run) {
        var entry = window.PP_GAME_BY_ID ? window.PP_GAME_BY_ID[run.game] : null;
        var row = document.createElement("div");
        row.className = "ac-run";
        row.innerHTML =
          '<span class="ac-run-game">' + PP.escapeHtml(entry ? entry.emoji + " " + entry.title : run.game) + "</span>" +
          '<span class="ac-run-score">' + PP.escapeHtml(PP.leaderboard.describe(run.game, run.score)) + "</span>" +
          '<span class="ac-run-when">' + shortDate(run.at) + "</span>";
        profileRuns.appendChild(row);
      });
    }
  }

  function renderDrift() {
    listEl.innerHTML = "";
    var accounts = AUTH.accounts();
    var me = AUTH.current();

    if (!accounts.length) {
      listEl.innerHTML = '<p class="ac-sub">No accounts yet — create the first one above.</p>';
      return;
    }

    accounts.forEach(function (account) {
      var row = document.createElement("button");
      row.type = "button";
      row.className = "ac-person";
      if (me && me.name === account.name) row.classList.add("is-current");
      row.innerHTML =
        '<span class="avatar" aria-hidden="true">' + account.avatar + "</span>" +
        '<span class="ac-person-name">' + PP.escapeHtml(account.name) + "</span>" +
        '<span class="ac-person-meta">' +
        (me && me.name === account.name ? "signed in" : "tap to sign in") + "</span>";
      row.addEventListener("click", function () {
        if (me && me.name === account.name) return;
        signinName.value = account.name;
        signinPin.value = "";
        signinPin.focus();
        PP.sfx("pick");
      });
      listEl.appendChild(row);
    });
  }

  function render() {
    var me = AUTH.current();
    if (me) {
      signedEl.hidden = false;
      formsEl.hidden = true;
      renderProfile(me);
    } else {
      signedEl.hidden = true;
      formsEl.hidden = false;
    }
    renderDrift();
  }

  signinForm.addEventListener("submit", function (event) {
    event.preventDefault();
    var result = AUTH.signIn(signinName.value, signinPin.value);
    if (!result.ok) {
      say(signinError, result.error);
      PP.sfx("bad");
      return;
    }
    say(signinError, "");
    signinPin.value = "";
    PP.sfx("win");
    render();
  });

  signupForm.addEventListener("submit", function (event) {
    event.preventDefault();
    if (signupPin.value !== signupPin2.value) {
      say(signupError, "The two PINs do not match.");
      PP.sfx("bad");
      return;
    }
    var result = AUTH.signUp(signupName.value, signupPin.value);
    if (!result.ok) {
      say(signupError, result.error);
      PP.sfx("bad");
      return;
    }
    say(signupError, "");
    signupPin.value = "";
    signupPin2.value = "";
    PP.sfx("win");
    render();
  });

  signOutBtn.addEventListener("click", function () {
    AUTH.signOut();
    PP.sfx("pick");
    render();
  });

  if (signinName) signinName.value = PP.leaderboard.player() === "Player 1" ? "" : PP.leaderboard.player();

  render();
})();
