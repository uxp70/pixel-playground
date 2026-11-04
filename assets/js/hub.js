/* Hub page: show the player's saved records on each game card. */
(function () {
  "use strict";

  var LABELS = {
    snake: function (v) { return "Best " + PP.formatNumber(v); },
    "2048": function (v) { return "Best " + PP.formatNumber(v); },
    breakout: function (v) { return "Best " + PP.formatNumber(v); },
    pong: function (v) { return "Best rally " + PP.formatNumber(v) + " hits"; },
    memory: function (v) { return "Fewest moves " + PP.formatNumber(v); },
    simon: function (v) { return "Best " + PP.formatNumber(v) + " rounds"; },
    minesweeper: function (v) { return "Fastest " + PP.formatNumber(v) + "s"; },
    reaction: function (v) { return "Best avg " + PP.formatNumber(v) + " ms"; },
    skyline: function (v) { return "Best " + PP.formatNumber(v) + " floors"; },
    prism: function (v) { return "Fewest " + PP.formatNumber(v) + " rotations"; },
    blackout: function (v) { return "Best " + PP.formatNumber(v) + " boards"; },
  };

  var badges = document.querySelectorAll("[data-best]");

  Array.prototype.forEach.call(badges, function (el) {
    var id = el.getAttribute("data-best");
    var value = PP.scores.get(id);
    var format = LABELS[id];
    if (value === null || !format) {
      el.textContent = "No score yet";
      el.setAttribute("data-empty", "true");
      return;
    }
    el.textContent = format(value);
    el.removeAttribute("data-empty");
  });

  // Hero stat: the single biggest score-like number on the device.
  var numeric = ["skyline", "snake", "2048", "breakout", "pong", "blackout"]
    .map(function (id) { return PP.scores.get(id); })
    .filter(function (v) { return typeof v === "number"; });

  var stat = document.getElementById("statBest");
  if (stat) {
    stat.textContent = numeric.length
      ? PP.formatNumber(Math.max.apply(null, numeric))
      : "—";
  }
})();
