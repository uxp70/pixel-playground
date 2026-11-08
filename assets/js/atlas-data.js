/* Atlas catalogue: fifty standalone cabinets, one per mechanic. Loaded after
   games-data.js so the hub, leaderboard, account page and play page all see
   the same 176-game catalogue. The mechanics live in assets/js/atlas/*.js;
   this file is pure data and is safe on every page. */
(function () {
  "use strict";

  var FAMILIES = [
    {
      id: "needlepoint", title: "Needlepoint", emoji: "🧷", accent: "#f43f5e",
      category: "Reflex", pattern: "scan", time: 25, goal: 10,
      blurb: "A needle sweeps across a dial. Stop it inside the bright band.",
      rule: "Stop the needle while it is inside the lit band.",
      controls: "Tap to stop the needle",
    },
    {
      id: "pulse-ring", title: "Pulse Ring", emoji: "💓", accent: "#fb7185",
      category: "Reflex", pattern: "bands", time: 30, goal: 12,
      blurb: "A ring closes around the target. Tap when the edges meet.",
      rule: "Tap the moment the shrinking ring matches the ring.",
      controls: "Tap when the rings meet",
    },
    {
      id: "holdfast", title: "Holdfast", emoji: "🫳", accent: "#f472b6",
      category: "Reflex", pattern: "beams", time: 25, goal: 10,
      blurb: "Fill the meter, then let go inside the target band.",
      rule: "Hold to fill the meter and release inside the target band.",
      controls: "Hold, then release",
    },
    {
      id: "tetherball", title: "Tetherball", emoji: "🪀", accent: "#e879f9",
      category: "Action", pattern: "waves", time: 35, goal: 12,
      blurb: "Drag the tether ball and keep it inside the wandering ring.",
      rule: "Keep the ball inside the moving ring without letting the tether snap.",
      controls: "Drag to move the ball",
    },
    {
      id: "seesaw", title: "Seesaw", emoji: "⚖️", accent: "#c084fc",
      category: "Arcade", pattern: "grid", time: 30, goal: 12,
      blurb: "Tap either side to tip the beam and keep the ball out of the pit.",
      rule: "Balance the beam so the ball stays on the platform.",
      controls: "Tap left or right",
    },
    {
      id: "juggle", title: "Juggle", emoji: "🤹", accent: "#a78bfa",
      category: "Arcade", pattern: "stars", time: 30, goal: 14,
      blurb: "Tap each ball to bounce it. Keep every ball off the floor.",
      rule: "Bounce every ball before it falls past the floor.",
      controls: "Tap a ball to bounce it",
    },
    {
      id: "skycatch", title: "Skycatch", emoji: "🧺", accent: "#818cf8",
      category: "Action", pattern: "rain", time: 30, goal: 15,
      blurb: "Catch falling stars and let the bombs pass you by.",
      rule: "Catch stars for points and avoid catching bombs.",
      controls: "Drag the basket",
    },
    {
      id: "shardstorm", title: "Shardstorm", emoji: "🌪️", accent: "#60a5fa",
      category: "Action", pattern: "rain", time: 35, goal: 15,
      blurb: "Drag your spark through a storm of falling shards.",
      rule: "Survive the shards and collect the blue motes.",
      controls: "Drag to move",
    },
    {
      id: "lanechange", title: "Lanechange", emoji: "🛣️", accent: "#38bdf8",
      category: "Arcade", pattern: "bands", time: 35, goal: 15,
      blurb: "Switch lanes through oncoming traffic and collect fuel.",
      rule: "Switch lanes to avoid traffic and collect fuel cells.",
      controls: "Tap a side or use ← →",
    },
    {
      id: "flap", title: "Flap", emoji: "🪽", accent: "#22d3ee",
      category: "Action", pattern: "scan", time: 30, goal: 12,
      blurb: "Tap to rise and thread the gaps in the moving wall.",
      rule: "Fly through each gap without touching a wall.",
      controls: "Tap to flap",
    },
    {
      id: "lunar-pad", title: "Lunar Pad", emoji: "🌙", accent: "#2dd4bf",
      category: "Physics", pattern: "stars", time: 40, goal: 3,
      blurb: "Thrust and rotate onto the landing pad without breaking the lander.",
      rule: "Land gently on the pad; hard landings break the lander.",
      controls: "Tap to thrust, ← → to rotate",
    },
    {
      id: "orbit", title: "Orbit", emoji: "🪐", accent: "#34d399",
      category: "Action", pattern: "stars", time: 35, goal: 14,
      blurb: "Tap to jump between orbits and scoop up the glowing motes.",
      rule: "Tap to switch orbit and collect every mote.",
      controls: "Tap to switch orbit",
    },
    {
      id: "slingshot", title: "Slingshot", emoji: "🏹", accent: "#4ade80",
      category: "Aim", pattern: "dots", time: 30, goal: 10,
      blurb: "Pull back, line up the shot and release at the right moment.",
      rule: "Sling the pellet into the target using pull and angle.",
      controls: "Drag back and release",
    },
    {
      id: "putt", title: "Putt", emoji: "⛳", accent: "#a3e635",
      category: "Aim", pattern: "grid", time: 35, goal: 5,
      blurb: "Read the green, set the power and sink the putt.",
      rule: "Putt the ball into the hole in as few strokes as you can.",
      controls: "Drag to aim and release to putt",
    },
    {
      id: "dartboard", title: "Dartboard", emoji: "🎯", accent: "#facc15",
      category: "Aim", pattern: "scan", time: 30, goal: 15,
      blurb: "A reticle drifts across the board. Tap when it reaches the gold.",
      rule: "Tap while the reticle is on the gold ring.",
      controls: "Tap to throw",
    },
    {
      id: "hoop", title: "Hoop", emoji: "🏀", accent: "#fbbf24",
      category: "Aim", pattern: "beams", time: 35, goal: 10,
      blurb: "Flick the ball through a hoop that will not stand still.",
      rule: "Flick the ball through the moving hoop.",
      controls: "Drag and release to shoot",
    },
    {
      id: "cannon", title: "Cannon", emoji: "💥", accent: "#f59e0b",
      category: "Aim", pattern: "grid", time: 30, goal: 10,
      blurb: "Set the angle and power, then bring the tower down.",
      rule: "Adjust angle and power to hit the target.",
      controls: "Tap to set, drag to aim",
    },
    {
      id: "pool", title: "Pool", emoji: "🎱", accent: "#fb923c",
      category: "Aim", pattern: "dots", time: 40, goal: 6,
      blurb: "Aim the cue, use the rails and pot the coloured balls.",
      rule: "Pot every coloured ball without scratching the cue ball.",
      controls: "Drag to aim and release",
    },
    {
      id: "maze", title: "Maze", emoji: "🧭", accent: "#f97316",
      category: "Puzzle", pattern: "grid", time: 40, goal: 3,
      blurb: "Find the route through the shifting maze before the clock runs out.",
      rule: "Reach the exit through the maze.",
      controls: "Arrows, WASD or swipe",
    },
    {
      id: "path", title: "Path", emoji: "✏️", accent: "#f87171",
      category: "Puzzle", pattern: "dots", time: 35, goal: 4,
      blurb: "Draw a safe route through the field without clipping a wall.",
      rule: "Draw one continuous path from start to goal.",
      controls: "Drag to draw a path",
    },
    {
      id: "pipes", title: "Pipes", emoji: "🔧", accent: "#fca5a5",
      category: "Puzzle", pattern: "grid", time: 45, goal: 4,
      blurb: "Rotate the pipes until the flow reaches every outlet.",
      rule: "Rotate the pipes to connect the source to the outlets.",
      controls: "Tap pipes to rotate",
    },
    {
      id: "mirrors", title: "Mirrors", emoji: "🪞", accent: "#fde047",
      category: "Puzzle", pattern: "beams", time: 45, goal: 4,
      blurb: "Turn the mirrors and steer the laser into the gem.",
      rule: "Rotate mirrors so the laser hits the gem.",
      controls: "Tap mirrors to rotate",
    },
    {
      id: "lights", title: "Lights", emoji: "💡", accent: "#67e8f9",
      category: "Puzzle", pattern: "grid", time: 45, goal: 3,
      blurb: "Every tap flips a cross of lights. Turn the whole board dark.",
      rule: "Flip the lights until the board is completely dark.",
      controls: "Tap a cell to flip it and its neighbours",
    },
    {
      id: "merge", title: "Merge", emoji: "🔢", accent: "#c4b5fd",
      category: "Puzzle", pattern: "bricks", time: 45, goal: 1,
      blurb: "Slide the board, join equal tiles and build a bigger number.",
      rule: "Merge equal tiles until the target tile appears.",
      controls: "Arrows, WASD or swipe",
    },
    {
      id: "slide", title: "Slide", emoji: "🧩", accent: "#fdba74",
      category: "Puzzle", pattern: "grid", time: 60, goal: 2,
      blurb: "Slide the numbered tiles back into order around the gap.",
      rule: "Put every tile back in numerical order.",
      controls: "Tap a tile beside the gap",
    },
    {
      id: "crates", title: "Crates", emoji: "📦", accent: "#f43f5e",
      category: "Puzzle", pattern: "bricks", time: 60, goal: 2,
      blurb: "Push every crate onto a pad without trapping it in a corner.",
      rule: "Push every crate onto a marked pad.",
      controls: "Arrows, WASD or swipe",
    },
    {
      id: "nonogram", title: "Nonogram", emoji: "🟦", accent: "#fb7185",
      category: "Puzzle", pattern: "grid", time: 60, goal: 2,
      blurb: "Read the row and column clues and fill the hidden picture.",
      rule: "Fill cells so every row and column matches its clue.",
      controls: "Tap to fill, long-press to mark",
    },
    {
      id: "mines", title: "Mines", emoji: "💣", accent: "#f472b6",
      category: "Puzzle", pattern: "grid", time: 60, goal: 2,
      blurb: "Clear the field without stepping on a mine. The numbers are clues.",
      rule: "Reveal every safe cell and flag the mines.",
      controls: "Tap to reveal, long-press to flag",
    },
    {
      id: "wordfind", title: "Wordfind", emoji: "🔤", accent: "#e879f9",
      category: "Word", pattern: "dots", time: 60, goal: 2,
      blurb: "Hidden words run in every direction through the letter grid.",
      rule: "Find every word on the list in the letter grid.",
      controls: "Drag across a word",
    },
    {
      id: "typing", title: "Typing", emoji: "⌨️", accent: "#c084fc",
      category: "Word", pattern: "scan", time: 30, goal: 12,
      blurb: "Words fall toward the floor. Type them before they land.",
      rule: "Type each falling word before it reaches the floor.",
      controls: "Type on the keyboard",
    },
    {
      id: "math", title: "Math", emoji: "➗", accent: "#a78bfa",
      category: "Brain", pattern: "grid", time: 30, goal: 10,
      blurb: "Quick arithmetic with no room for a second guess.",
      rule: "Pick the correct answer to each sum.",
      controls: "Tap an answer",
    },
    {
      id: "sequence", title: "Sequence", emoji: "🔢", accent: "#818cf8",
      category: "Brain", pattern: "bands", time: 30, goal: 10,
      blurb: "Every row hides a rule. Work out what comes next.",
      rule: "Choose the number that continues the sequence.",
      controls: "Tap an answer",
    },
    {
      id: "odd", title: "Odd", emoji: "🧿", accent: "#60a5fa",
      category: "Brain", pattern: "dots", time: 30, goal: 12,
      blurb: "One shape in every crowd does not belong. Find it fast.",
      rule: "Tap the shape that differs from the rest.",
      controls: "Tap the odd one out",
    },
    {
      id: "pairs", title: "Pairs", emoji: "🃏", accent: "#38bdf8",
      category: "Brain", pattern: "grid", time: 45, goal: 2,
      blurb: "Flip two cards at a time and remember where every pair hides.",
      rule: "Match every pair with as few flips as you can.",
      controls: "Tap two cards",
    },
    {
      id: "simon", title: "Echo Pads", emoji: "🎵", accent: "#22d3ee",
      category: "Brain", pattern: "beams", time: 40, goal: 6,
      blurb: "Watch the pads flash, then play the sequence back.",
      rule: "Repeat the growing sequence without a mistake.",
      controls: "Tap the pads in order",
    },
    {
      id: "rhythm", title: "Rhythm", emoji: "🥁", accent: "#2dd4bf",
      category: "Music", pattern: "bands", time: 30, goal: 15,
      blurb: "Four lanes, one beat. Hit the notes as they cross the line.",
      rule: "Tap each lane when its note reaches the line.",
      controls: "Tap the lanes or use D F J K",
    },
    {
      id: "whack", title: "Whack", emoji: "🔨", accent: "#34d399",
      category: "Reflex", pattern: "dots", time: 30, goal: 15,
      blurb: "Targets pop up and vanish. Hit the bright ones, not the duds.",
      rule: "Tap the live targets and avoid the grey duds.",
      controls: "Tap the targets",
    },
    {
      id: "bubble", title: "Bubble", emoji: "🫧", accent: "#4ade80",
      category: "Arcade", pattern: "waves", time: 30, goal: 15,
      blurb: "Aim the launcher and pop same-coloured bubbles in clusters.",
      rule: "Group and pop bubbles of the same colour.",
      controls: "Tap to aim and fire",
    },
    {
      id: "slice", title: "Slice", emoji: "🗡️", accent: "#a3e635",
      category: "Action", pattern: "rain", time: 30, goal: 15,
      blurb: "Swipe through the flying fruit and leave the bombs alone.",
      rule: "Slice fruit and avoid the bombs.",
      controls: "Swipe across the screen",
    },
    {
      id: "invaders", title: "Invaders", emoji: "👾", accent: "#facc15",
      category: "Shooter", pattern: "stars", time: 40, goal: 10,
      blurb: "A formation descends. Move, fire and keep the last line clear.",
      rule: "Destroy every invader before it reaches the floor.",
      controls: "Drag or use ← → to move, fire automatically",
    },
    {
      id: "runner", title: "Runner", emoji: "🏃", accent: "#fbbf24",
      category: "Arcade", pattern: "scan", time: 35, goal: 400,
      blurb: "Jump and slide through a landscape that keeps throwing obstacles.",
      rule: "Run as far as you can without hitting an obstacle.",
      controls: "Tap to jump, swipe down to slide",
    },
    {
      id: "frogger", title: "Frogger", emoji: "🐸", accent: "#f59e0b",
      category: "Arcade", pattern: "bands", time: 40, goal: 8,
      blurb: "Cross the traffic, then the river, and reach the far bank.",
      rule: "Reach the far bank without being hit or swept away.",
      controls: "Arrows, WASD or swipe",
    },
    {
      id: "fishing", title: "Fishing", emoji: "🎣", accent: "#fb923c",
      category: "Arcade", pattern: "waves", time: 40, goal: 8,
      blurb: "Cast, wait for the bite and reel inside the moving window.",
      rule: "Reel while the fish is inside the landing window.",
      controls: "Tap to cast, tap in the window",
    },
    {
      id: "stealth", title: "Stealth", emoji: "🕵️", accent: "#f97316",
      category: "Strategy", pattern: "scan", time: 45, goal: 3,
      blurb: "Patrol cones sweep the floor. Slip past and reach the exit.",
      rule: "Reach the exit without entering a patrol cone.",
      controls: "Arrows, WASD or swipe",
    },
    {
      id: "lockpick", title: "Lockpick", emoji: "🔐", accent: "#f87171",
      category: "Puzzle", pattern: "scan", time: 45, goal: 4,
      blurb: "Set each pin inside the sweet spot before the tension slips.",
      rule: "Set every pin inside the sweet spot.",
      controls: "Tap to set the pin",
    },
    {
      id: "defuse", title: "Defuse", emoji: "🧨", accent: "#fca5a5",
      category: "Puzzle", pattern: "bricks", time: 45, goal: 3,
      blurb: "Read the clue, cut the right wire and stop the countdown.",
      rule: "Cut the wire named by the clue before the timer ends.",
      controls: "Tap a wire to cut it",
    },
    {
      id: "sorting", title: "Sorting", emoji: "📮", accent: "#fde047",
      category: "Arcade", pattern: "grid", time: 35, goal: 20,
      blurb: "Parcels arrive faster than the bins can take them. Match the labels.",
      rule: "Send each parcel into the bin with the matching mark.",
      controls: "Tap a parcel, then a bin",
    },
    {
      id: "parking", title: "Parking", emoji: "🚗", accent: "#67e8f9",
      category: "Arcade", pattern: "grid", time: 45, goal: 3,
      blurb: "Reverse, steer and slot the car into the bay without a scratch.",
      rule: "Park inside the marked bay without hitting a wall.",
      controls: "Drag to steer, tap to reverse",
    },
    {
      id: "connect", title: "Connect", emoji: "🔴", accent: "#c4b5fd",
      category: "Strategy", pattern: "dots", time: 60, goal: 1,
      blurb: "Drop discs, build a line and keep the rival from doing it first.",
      rule: "Connect four discs before the rival.",
      controls: "Tap a column to drop a disc",
    },
    {
      id: "dice", title: "Dice", emoji: "🎲", accent: "#fdba74",
      category: "Strategy", pattern: "dots", time: 40, goal: 1,
      blurb: "Push your luck: roll, hold the good dice and stop before you bust.",
      rule: "Score as high as you can without busting.",
      controls: "Tap to roll or hold",
    },
  ];

  var games = Array.isArray(window.PP_GAMES) ? window.PP_GAMES : [];
  var byId = window.PP_GAME_BY_ID && typeof window.PP_GAME_BY_ID === "object"
    ? window.PP_GAME_BY_ID
    : {};
  var familyMap = {};
  var modes = [];

  // One cabinet per mechanic. The "solo-" prefix keeps Atlas ids distinct
  // from the bespoke cabinets (for example, the bespoke Simon).
  FAMILIES.forEach(function (family, index) {
    familyMap[family.id] = family;
    var id = "solo-" + family.id;
    var mode = {
      name: family.title,
      rule: family.rule,
      pattern: family.pattern,
      hudA: "Score",
      hudB: "Time",
      family: family.id,
      controls: family.controls,
    };
    modes.push(mode);

    var game = {
      id: id,
      title: family.title,
      emoji: family.emoji,
      accent: family.accent,
      category: family.category,
      href: "games/play.html?g=" + id,
      mode: "high",
      unit: " pts",
      blurb: family.blurb,
      rule: family.rule,
      controls: family.controls,
      kit: "atlas",
      level: index + 1,
      family: family.id,
      atlas: true,
      standalone: true,
    };
    games.push(game);
    byId[id] = game;
  });

  window.PP_ATLAS_MODES = modes;
  window.PP_ATLAS_FAMILIES = familyMap;
  window.PP_ATLAS_FAMILY_LIST = FAMILIES;
  window.PP_GAMES = games;
  window.PP_GAME_BY_ID = byId;
})();
