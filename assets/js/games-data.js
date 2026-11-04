/* The whole catalogue: eleven hand-built games plus 110 generated ones.
   Loaded by the hub, the leaderboard, the play page and the account page. */
(function () {
  "use strict";

  /* Shared description of each engine, so the catalogue can label scores. */
  var KIT_META = {
    tap: {
      category: "Reflex", mode: "high", unit: " hits",
      blurb: "Twenty seconds of glowing targets — duds cost you two hits.",
      controls: "Tap the lit targets",
    },
    dodge: {
      category: "Action", mode: "high", unit: "s",
      blurb: "Drag along the floor and stay clear of the falling shards.",
      controls: "Drag or use ← →",
    },
    catch: {
      category: "Action", mode: "high", unit: " caught",
      blurb: "Scoop the falling orbs and let the bombs fall past you.",
      controls: "Drag to move the basket",
    },
    flash: {
      category: "Brain", mode: "high", unit: " rounds",
      blurb: "A grid flashes a pattern; play it back and it grows.",
      controls: "Tap the pads in order",
    },
    reflex: {
      category: "Reflex", mode: "low", unit: " ms",
      blurb: "Five rounds, one cue. Tap the instant it flips — early taps reset.",
      controls: "Tap the moment it changes",
    },
    stack: {
      category: "Arcade", mode: "high", unit: " floors",
      blurb: "Drop the sliding floor as dead-centre as you can.",
      controls: "Tap or press space to drop",
    },
    quiz: {
      category: "Brain", mode: "high", unit: " correct",
      blurb: "Eight quick sums against a ticking clock.",
      controls: "Tap the right answer",
    },
    snakey: {
      category: "Classic", mode: "high", unit: " pts",
      blurb: "A small neon serpent, walls that bite and food that grows you.",
      controls: "Arrows, WASD or swipe",
    },
    breaker: {
      category: "Classic", mode: "high", unit: " pts",
      blurb: "A paddle, a ball and a wall of bricks to take apart.",
      controls: "Drag the paddle",
    },
    lanes: {
      category: "Action", mode: "high", unit: " m",
      blurb: "Three lanes, rising speed and a lot of oncoming traffic.",
      controls: "Tap a side or use ← →",
    },
  };

  /* [id, title, emoji, accent, flavour line] — eleven per engine. */
  var VARIANTS = {
    tap: [
      ["tap-storm", "Tap Storm", "🎯", "#f43f5e", "A downpour of targets."],
      ["rapid-grid", "Rapid Grid", "🔳", "#fb7185", "Everything at once, briefly."],
      ["blip-rush", "Blip Rush", "💠", "#f472b6", "Blink and it is gone."],
      ["pop-circuit", "Pop Circuit", "🔌", "#e879f9", "Short-lived and glowing."],
      ["swat-squad", "Swat Squad", "🪰", "#c084fc", "Constant, irritating, satisfying."],
      ["dot-frenzy", "Dot Frenzy", "🟣", "#a78bfa", "Dots everywhere, no mercy."],
      ["tap-tide", "Tap Tide", "🌊", "#818cf8", "It comes in waves."],
      ["pixel-panic", "Pixel Panic", "🟥", "#60a5fa", "Pixels that will not sit still."],
      ["snap-field", "Snap Field", "⚡", "#38bdf8", "Fields of split-second chances."],
      ["pulse-tap", "Pulse Tap", "💓", "#22d3ee", "Tap to the rhythm of the spawns."],
      ["tap-finale", "Tap Finale", "🎇", "#fde68a", "A last burst of targets."],
    ],
    dodge: [
      ["meteor-dip", "Meteor Dip", "☄️", "#f97316", "Small rocks, big trouble."],
      ["shard-fall", "Shard Fall", "🔻", "#fb923c", "Glass from a broken sky."],
      ["gap-runner", "Gap Runner", "🏃", "#fbbf24", "Find the gap, then the next one."],
      ["comet-dodge", "Comet Dodge", "🌠", "#facc15", "Long tails, longer odds."],
      ["spike-rain", "Spike Rain", "🌧️", "#a3e635", "Rain that points downward."],
      ["neon-dive", "Neon Dive", "🕹️", "#4ade80", "Dive between the beams."],
      ["icefall", "Icefall", "🧊", "#34d399", "Cold, fast and everywhere."],
      ["drift-zone", "Drift Zone", "🌀", "#2dd4bf", "Let the floor slide."],
      ["hailstorm", "Hailstorm", "🌨️", "#22d3ee", "Dense weather, thin margins."],
      ["void-sway", "Void Sway", "🕳️", "#38bdf8", "Nothing to stand on but timing."],
      ["last-light", "Last Light", "🔅", "#fcd34d", "Dodge until the lights go out."],
    ],
    catch: [
      ["star-basket", "Star Basket", "⭐", "#fbbf24", "Catch the sky as it falls."],
      ["fruit-fall", "Fruit Fall", "🍎", "#f87171", "A harvest in free fall."],
      ["coin-catch", "Coin Catch", "🪙", "#f59e0b", "Every drop is money."],
      ["orb-scoop", "Orb Scoop", "🔵", "#60a5fa", "Scoop them before they land."],
      ["drop-harvest", "Drop Harvest", "🌾", "#a3e635", "Gather what the sky gives."],
      ["gem-grab", "Gem Grab", "💎", "#22d3ee", "Rare, bright, falling."],
      ["bubble-net", "Bubble Net", "🫧", "#a78bfa", "Light things, light touch."],
      ["seed-catch", "Seed Catch", "🌱", "#4ade80", "Small things worth catching."],
      ["moon-scoop", "Moon Scoop", "🌙", "#c084fc", "Scoop the night sky."],
      ["loot-fall", "Loot Fall", "🎁", "#f472b6", "Grab the good, dodge the bad."],
      ["final-haul", "Final Haul", "🧺", "#fca5a5", "One more basketful."],
    ],
    flash: [
      ["echo-grid", "Echo Grid", "🔊", "#22d3ee", "Watch it, then say it back."],
      ["glow-sequence", "Glow Sequence", "✨", "#a78bfa", "Light remembers order."],
      ["light-order", "Light Order", "🔆", "#fbbf24", "The order is the whole game."],
      ["signal-path", "Signal Path", "📶", "#38bdf8", "Follow the signal exactly."],
      ["pulse-recall", "Pulse Recall", "💫", "#f472b6", "Recall it pulse by pulse."],
      ["cipher-lights", "Cipher Lights", "🔐", "#c084fc", "A code made of glow."],
      ["neon-memory", "Neon Memory", "🌈", "#34d399", "Bright and unforgiving."],
      ["pattern-loop", "Pattern Loop", "🔁", "#fb7185", "Longer every single time."],
      ["flash-code", "Flash Code", "📟", "#facc15", "Read the flashes, repeat them."],
      ["grid-echo", "Grid Echo", "🟦", "#818cf8", "A grid that answers back."],
      ["memory-tide", "Memory Tide", "🌊", "#93c5fd", "Patterns that keep coming."],
    ],
    reflex: [
      ["quickdraw", "Quickdraw", "🤠", "#f59e0b", "Fastest hand wins nothing but pride."],
      ["green-light", "Green Light", "🟢", "#22c55e", "Wait. Wait. Now."],
      ["snap-reflex", "Snap Reflex", "🫰", "#f43f5e", "Snap decisions only."],
      ["trigger-test", "Trigger Test", "🎚️", "#f97316", "One cue, one tap."],
      ["twitch", "Twitch", "👁️", "#a855f7", "Eyes first, thumbs second."],
      ["fast-hands", "Fast Hands", "🙌", "#38bdf8", "Hands faster than thought."],
      ["side-step", "Side Step", "↔️", "#14b8a6", "React in the right direction."],
      ["jump-cue", "Jump Cue", "🦘", "#84cc16", "Spring when the cue lands."],
      ["ready-set", "Ready Set", "🎬", "#eab308", "Ready, set, measured."],
      ["beat-clock", "Beat Clock", "⏱️", "#06b6d4", "Beat your own clock."],
      ["flash-tap", "Flash Tap", "🔆", "#fde047", "Train the twitch."],
    ],
    stack: [
      ["towering", "Towering", "🏗️", "#f59e0b", "Up is the only direction."],
      ["brick-lift", "Brick Lift", "🧱", "#f97316", "Lift it brick by brick."],
      ["cloud-stack", "Cloud Stack", "☁️", "#38bdf8", "Stacking weather."],
      ["deck-up", "Deck Up", "🃏", "#a78bfa", "A deck that grows upward."],
      ["sky-pile", "Sky Pile", "🌤️", "#fbbf24", "Pile it into the sky."],
      ["floor-rise", "Floor Rise", "⬆️", "#34d399", "One more floor, always."],
      ["block-tower", "Block Tower", "🔶", "#fb923c", "Blocks, gravity, nerve."],
      ["crane-up", "Crane Up", "🏚️", "#facc15", "Swing it in and drop it."],
      ["stack-yard", "Stack Yard", "📦", "#f472b6", "A yard of falling boxes."],
      ["high-rise", "High Rise", "🏢", "#22d3ee", "Build until the wind wins."],
      ["tower-ten", "Tower Ten", "🔟", "#fcd34d", "Ten floors is only the start."],
    ],
    quiz: [
      ["quick-math", "Quick Math", "➗", "#22d3ee", "Sums against the clock."],
      ["number-crunch", "Number Crunch", "🔢", "#60a5fa", "Crunch the numbers fast."],
      ["sum-sprint", "Sum Sprint", "🏁", "#818cf8", "Sprint through the arithmetic."],
      ["equation-dash", "Equation Dash", "🟰", "#a78bfa", "Dash from sum to sum."],
      ["mental-grit", "Mental Grit", "🧠", "#c084fc", "Hold the numbers in your head."],
      ["add-attack", "Add Attack", "➕", "#e879f9", "Adding, at speed."],
      ["times-table", "Times Table", "✖️", "#f472b6", "Multiplication under pressure."],
      ["fraction-flip", "Fraction Flip", "½", "#fb7185", "Halves, thirds, panic."],
      ["pattern-sum", "Pattern Sum", "🧮", "#fbbf24", "Find the sum by pattern."],
      ["brain-bolt", "Brain Bolt", "⚡", "#34d399", "Short circuits encouraged."],
      ["sum-storm", "Sum Storm", "🌩️", "#a5b4fc", "Sums in a downpour."],
    ],
    snakey: [
      ["thread-snake", "Thread Snake", "🧵", "#34d399", "A thread that grows."],
      ["circuit-worm", "Circuit Worm", "🔋", "#22c55e", "Wired and hungry."],
      ["glow-worm", "Glow Worm", "🪱", "#a3e635", "Small glow, long body."],
      ["trail-twist", "Trail Twist", "🌀", "#2dd4bf", "Do not cross your own trail."],
      ["loop-snake", "Loop Snake", "➰", "#14b8a6", "Loops are lethal."],
      ["neon-worm", "Neon Worm", "💚", "#4ade80", "Neon in every segment."],
      ["coil", "Coil", "🧬", "#22d3ee", "Coil it tighter."],
      ["ribbon-run", "Ribbon Run", "🎀", "#38bdf8", "A ribbon with teeth."],
      ["wire-snake", "Wire Snake", "🔌", "#60a5fa", "Live wire, live snake."],
      ["tail-chase", "Tail Chase", "🦎", "#818cf8", "Your tail is the enemy."],
      ["serpent-loop", "Serpent Loop", "🐉", "#34d399", "A serpent with a loop habit."],
    ],
    breaker: [
      ["brick-wall", "Brick Wall", "🧱", "#f472b6", "Take the wall apart."],
      ["paddle-pop", "Paddle Pop", "🏓", "#f43f5e", "Paddle first, ball second."],
      ["ball-bash", "Ball Bash", "🔴", "#fb7185", "Bash it until it clears."],
      ["smash-grid", "Smash Grid", "💥", "#fb923c", "A grid begging to break."],
      ["bounce-break", "Bounce Break", "↩️", "#fbbf24", "Angles are everything."],
      ["wall-cracker", "Wall Cracker", "🔨", "#facc15", "Every hit is a crack."],
      ["brick-drift", "Brick Drift", "🏎️", "#a3e635", "Let the ball drift."],
      ["bat-and-ball", "Bat & Ball", "🏏", "#34d399", "The old story, retold."],
      ["pillar-pop", "Pillar Pop", "🏛️", "#22d3ee", "Pop the pillars."],
      ["shard-smash", "Shard Smash", "💠", "#38bdf8", "Smash it to shards."],
      ["final-wall", "Final Wall", "🧨", "#fb7185", "The last wall between you and nothing."],
    ],
    lanes: [
      ["lane-runner", "Lane Runner", "🛣️", "#f59e0b", "Pick a lane and commit."],
      ["dash-line", "Dash Line", "💨", "#fb923c", "One clean line through traffic."],
      ["track-sprint", "Track Sprint", "🏟️", "#facc15", "Sprint the track."],
      ["rift-runner", "Rift Runner", "🌌", "#a78bfa", "Thread the rift."],
      ["side-sprint", "Side Sprint", "↔️", "#c084fc", "Sideways at speed."],
      ["neon-lanes", "Neon Lanes", "🏙️", "#e879f9", "Night driving, no brakes."],
      ["corridor-dash", "Corridor Dash", "🚪", "#f472b6", "Doors that close fast."],
      ["hurdle-run", "Hurdle Run", "🚧", "#fb7185", "Hurdles, endlessly."],
      ["slip-lane", "Slip Lane", "🛞", "#f97316", "Slip between the gaps."],
      ["charge-line", "Charge Line", "🐂", "#fbbf24", "Charge and hope."],
      ["last-lane", "Last Lane", "🛑", "#f87171", "The lane with no exits."],
    ],
  };

  var BESPOKE = [
    ["skyline", "Skyline", "🌆", "#f59e0b", "Arcade", "games/skyline.html", "high", " floors",
      "One tap per floor. Perfect drops keep the width; sloppy ones shave it thin.", "Tap to drop"],
    ["snake", "Snake", "🐍", "#34d399", "Classic", "games/snake.html", "high", " pts",
      "Neon snake with wrap-free walls. Eat, grow, and do not clip your own tail.", "Arrows, WASD or swipe"],
    ["2048", "2048", "🔢", "#fbbf24", "Puzzle", "games/2048.html", "high", " pts",
      "Slide the tiles, merge the doubles, chase that elusive 2048 square.", "Arrows, WASD or swipe"],
    ["breakout", "Breakout", "🧱", "#f472b6", "Classic", "games/breakout.html", "high", " pts",
      "Bounce the ball, clear the wall, keep it off the floor. Three lives, no mercy.", "Move the paddle"],
    ["pong", "Pong", "🏓", "#38bdf8", "Classic", "games/pong.html", "high", " hits",
      "First to seven against the computer. Drag, mouse or arrows.", "Drag or use ↑ ↓"],
    ["memory", "Memory Match", "🃏", "#22d3ee", "Brain", "games/memory.html", "low", " moves",
      "Eight emoji pairs, sixteen cards, one sharp memory. Fewest moves wins.", "Flip two cards"],
    ["simon", "Simon", "🎵", "#a78bfa", "Brain", "games/simon.html", "high", " rounds",
      "Watch the colour sequence, then play it back. One more step every round.", "Tap the pads in order"],
    ["minesweeper", "Minesweeper", "💣", "#fb923c", "Brain", "games/minesweeper.html", "low", "s",
      "Nine by nine, ten mines. Tap to clear, long-press or right-click to flag.", "Tap to clear, long-press to flag"],
    ["reaction", "Reaction Test", "⚡", "#8b5cf6", "Reflex", "games/reaction.html", "low", " ms",
      "Five rounds, one green screen. Find out how quick your thumbs really are.", "Tap when it turns green"],
    ["prism", "Prism", "🔺", "#a78bfa", "Puzzle", "games/prism.html", "low", " rotations",
      "Flip mirrors to bend a laser into the gem. Five puzzles, fewest rotations wins.", "Tap mirrors to rotate"],
    ["blackout", "Blackout", "🌑", "#06b6d4", "Puzzle", "games/blackout.html", "high", " boards",
      "Kill every light on a 5x5 grid — each tap flips a cross. Sixty seconds.", "Tap squares"],
  ];

  function build() {
    var list = BESPOKE.map(function (row) {
      return {
        id: row[0], title: row[1], emoji: row[2], accent: row[3], category: row[4],
        href: row[5], mode: row[6], unit: row[7], blurb: row[8], controls: row[9],
        kit: null, level: 0,
      };
    });

    Object.keys(VARIANTS).forEach(function (kit) {
      var meta = KIT_META[kit];
      VARIANTS[kit].forEach(function (row, index) {
        list.push({
          id: row[0], title: row[1], emoji: row[2], accent: row[3], category: meta.category,
          href: "games/play.html?g=" + row[0], mode: meta.mode, unit: meta.unit,
          blurb: row[4] + " " + meta.blurb, controls: meta.controls,
          kit: kit, level: index + 1,
        });
      });
    });

    return list;
  }

  var games = build();

  window.PP_KIT_META = KIT_META;
  window.PP_GAMES = games;
  window.PP_GAME_BY_ID = games.reduce(function (map, game) {
    map[game.id] = game;
    return map;
  }, {});
})();
