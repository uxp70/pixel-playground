/*
  The originals — five games with engines of their own rather than a kit
  variant. games-data.js holds the generated catalogue; this file appends the
  hand-built cabinets to it so the hub, the leaderboard picker and the account
  records all resolve their ids.

  Loaded after games-data.js and before whichever page script runs.
*/
(function () {
  "use strict";

  var ORIGINALS = [
    {
      id: "redline",
      title: "Redline Rally",
      emoji: "🏎️",
      category: "Racing",
      blurb: "Night road, crests and traffic. Ninety seconds of pure distance.",
      accent: "#ff5d8f",
      unit: " m",
      mode: "high",
      href: "games/redline.html",
    },
    {
      id: "vanguard",
      title: "Vector Vanguard",
      emoji: "🛰️",
      category: "Shooter",
      blurb: "Twin-stick arena: six drone types, ten waves, two dashes.",
      accent: "#7dd3fc",
      unit: " pts",
      mode: "high",
      href: "games/vanguard.html",
    },
    {
      id: "hive",
      title: "Iron Hive",
      emoji: "🏰",
      category: "Strategy",
      blurb: "Tower defence on a fixed lane. Four turrets, twelve waves.",
      accent: "#fbbf24",
      unit: " pts",
      mode: "high",
      href: "games/hive.html",
    },
    {
      id: "descent",
      title: "Lunar Descent",
      emoji: "🌙",
      category: "Physics",
      blurb: "Gravity, one throttle, five pads that keep getting narrower.",
      accent: "#c084fc",
      unit: " pts",
      mode: "high",
      href: "games/descent.html",
    },
    {
      id: "ghost",
      title: "Ghost Protocol",
      emoji: "🕵️",
      category: "Stealth",
      blurb: "Slip past patrol cones, lift three cores, reach the lift.",
      accent: "#4ade80",
      unit: " pts",
      mode: "high",
      href: "games/ghost.html",
    },
  ];

  var games = window.PP_GAMES;
  if (!Array.isArray(games)) return;

  var byId = window.PP_GAME_BY_ID;
  if (!byId || typeof byId !== "object") {
    byId = {};
    window.PP_GAME_BY_ID = byId;
  }

  ORIGINALS.forEach(function (game) {
    byId[game.id] = game;
    var exists = false;
    for (var i = 0; i < games.length; i++) {
      if (games[i].id === game.id) { exists = true; break; }
    }
    if (!exists) games.push(game);
  });
})();
