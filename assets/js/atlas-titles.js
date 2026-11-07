/* Atlas title layer.

   atlas-data.js describes 50 families x 18 editions. That file is kept as
   pure catalogue data; this layer runs immediately after it and gives every
   one of the 900 entries a title of its own. The family and edition remain
   play-page context, but no card is called "Stealth Classic" or
   "Stealth Rapid" again. */
(function () {
  "use strict";

  if (window.PP_ATLAS_TITLES_READY) return;
  window.PP_ATLAS_TITLES_READY = true;

  var EDITION_BLURBS = {
    classic: "A straight score chase.",
    rapid: "A shorter clock and a faster board.",
    marathon: "A longer, calmer run.",
    survival: "Three lives against rising pressure.",
    precision: "One mistake ends the run.",
    endless: "One life, no clock, and the pace keeps climbing.",
    mirror: "Left and right are reversed.",
    fog: "Only the area around your pointer is lit.",
    tiny: "The whole arena is scaled down.",
    giant: "The arena is scaled up and the edges are cropped.",
    zen: "No clock and no lives; reach the target score.",
    combo: "Quick scoring builds a multiplier.",
    boss: "Three phases, each faster than the last.",
    sudden: "One life and a very short clock.",
    daily: "A fixed layout that is the same every run.",
    relic: "A bonus star appears; tap it for extra points.",
    chaos: "The speed surges and drops unpredictably.",
    finale: "One life, fog, combos and three fast phases.",
  };

  var ADJECTIVES = [
    "Silent", "Crimson", "Velvet", "Iron", "Ghost", "Midnight",
    "Copper", "Glass", "Hollow", "Quiet", "Static", "Amber",
    "Violet", "Ashen", "Neon", "Feral", "Last", "Golden",
  ];

  var NOUNS = {
    Reflex: ["Dial", "Pulse", "Meter", "Spark", "Beat", "Tick", "Flash", "Snap", "Blink", "Rush", "Flick", "Edge", "Mark", "Tempo", "Cue", "Turn", "Trigger", "Current"],
    Aim: ["Bolt", "Arc", "Dart", "Shot", "Ring", "Scope", "Toss", "Roll", "Putt", "Lane", "Hook", "Launch", "Trail", "Strike", "Pin", "Goal", "Angle", "Rebound"],
    Puzzle: ["Grid", "Path", "Pipe", "Light", "Tile", "Lock", "Key", "Link", "Loop", "Shift", "Slide", "Crate", "Clue", "Map", "Gate", "Knot", "Chain", "Step"],
    Word: ["Word", "Letter", "Script", "Line", "Page", "Ink", "Spell", "Trace", "Verse", "Glyph", "Text", "Quill", "Rune", "Scroll", "Voice", "Type", "Read", "Blank"],
    Brain: ["Sum", "Code", "Echo", "Pair", "Mind", "Pattern", "Logic", "Memory", "Riddle", "Match", "Signal", "Number", "Order", "Cipher", "Clue", "Sequence", "Focus", "Recall"],
    Music: ["Beat", "Note", "Chord", "Tempo", "Rhythm", "Drum", "Bass", "Tone", "Pulse", "Echo", "Melody", "Measure", "Sync", "Wave", "Loop", "Step", "Sound", "Bar"],
    Action: ["Storm", "Run", "Dash", "Dive", "Rush", "Blade", "Spark", "Trail", "Chase", "Drift", "Blast", "Shield", "Wing", "Leap", "Strike", "Surge", "Dodge", "Blaze"],
    Arcade: ["Lane", "Track", "Run", "Rush", "Drift", "Turn", "Bend", "Dash", "Circuit", "Course", "Mile", "Drive", "Rally", "Sprint", "Cruise", "Hurdle", "Grid", "Finish"],
    Physics: ["Gravity", "Thrust", "Orbit", "Mass", "Vector", "Momentum", "Pendulum", "Axis", "Bounce", "Drag", "Lift", "Weight", "Force", "Spin", "Drift", "Fall", "Plane", "Impulse"],
    Shooter: ["Blaster", "Volley", "Salvo", "Barrel", "Sight", "Bolt", "Shell", "Ray", "Burst", "Strike", "Target", "Squad", "Patrol", "Cannon", "Trigger", "Recoil", "Assault", "Vanguard"],
    Strategy: ["Heist", "Veil", "Exit", "Patrol", "Cipher", "Cover", "Ledger", "Shadow", "Gate", "Wire", "Alarm", "Route", "Lock", "Trace", "Ghost", "Signal", "Plan", "Watch"],
  };

  var RESERVED_TITLES = [
    "Redline Rally", "Vector Vanguard", "Iron Hive", "Lunar Descent", "Ghost Protocol",
  ];

  var games = window.PP_GAMES || [];
  var families = window.PP_ATLAS_FAMILY_LIST || [];
  var editions = window.PP_ATLAS_EDITIONS || [];
  var atlasGames = games.filter(function (game) { return game && game.atlas; });
  var modes = window.PP_ATLAS_MODES || [];
  if (!families.length || !editions.length || !atlasGames.length || atlasGames.length !== modes.length) return;

  var used = {};
  games.forEach(function (game) {
    if (game && !game.atlas && game.title) used[game.title.toLowerCase()] = true;
  });
  RESERVED_TITLES.forEach(function (title) {
    used[title.toLowerCase()] = true;
  });

  var ordinals = {};

  function titleFor(family, ordinal, editionIndex) {
    var nouns = NOUNS[family.category] || NOUNS.Arcade;
    var noun = nouns[editionIndex % nouns.length];
    for (var tries = 0; tries < ADJECTIVES.length; tries++) {
      var adjective = ADJECTIVES[(editionIndex + ordinal * 3 + tries) % ADJECTIVES.length];
      var candidate = adjective + " " + noun;
      var key = candidate.toLowerCase();
      if (!used[key]) {
        used[key] = true;
        return candidate;
      }
    }
    var fallback = noun + " " + (editionIndex + 1);
    var suffix = 2;
    while (used[fallback.toLowerCase()]) {
      fallback = noun + " " + (editionIndex + 1) + " " + suffix;
      suffix++;
    }
    used[fallback.toLowerCase()] = true;
    return fallback;
  }

  var index = 0;
  families.forEach(function (family) {
    var ordinal = ordinals[family.category] || 0;
    ordinals[family.category] = ordinal + 1;
    editions.forEach(function (edition, editionIndex) {
      var game = atlasGames[index];
      var mode = modes[index];
      var title = titleFor(family, ordinal, editionIndex);
      var concept = (EDITION_BLURBS[edition.id] || edition.rule) + " " + family.rule;
      index++;

      if (game) {
        game.title = title;
        game.blurb = concept;
        game.rule = concept;
        game.familyTitle = family.title;
        game.editionLabel = edition.label;
      }
      if (mode) {
        mode.title = title;
        mode.rule = concept;
      }
    });
  });

  window.PP_ATLAS_TITLE_COUNT = index;
})();
