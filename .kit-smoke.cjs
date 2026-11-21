/* Verification harness: 176 catalogue entries, 160 unique one-mode engines. */
const fs = require("fs");
const vm = require("vm");

function context2d() {
  const target = {
    fillStyle: "#000", strokeStyle: "#000", lineWidth: 1, globalAlpha: 1,
    font: "", textAlign: "center", textBaseline: "middle", lineCap: "butt",
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
    measureText: () => ({ width: 20 }),
  };
  return new Proxy(target, {
    get(obj, prop) {
      if (prop in obj) return obj[prop];
      return function () {};
    },
    set(obj, prop, value) { obj[prop] = value; return true; },
  });
}

const ctx2d = context2d();
const sandbox = {
  console,
  Math,
  Date,
  JSON,
  setTimeout: () => 0,
  clearTimeout: () => {},
  setInterval: () => 0,
  clearInterval: () => {},
  document: {
    readyState: "loading",
    addEventListener() {},
    getElementById() { return null; },
    querySelector() { return null; },
    hidden: false,
  },
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

function load(file) {
  vm.runInContext(fs.readFileSync(file, "utf8"), sandbox, { filename: file });
}

/* Page load order, as games/play.html uses it. */
load("assets/js/games-data.js");
load("assets/js/atlas-data.js");
load("assets/js/originals.js");
load("assets/js/kit.js");
function kitFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = `${dir}/${entry.name}`;
    if (entry.isDirectory()) out.push(...kitFiles(full));
    else if (entry.name.endsWith(".js")) out.push(full);
  }
  return out;
}
/* Family files still at the root load first; per-game files in subfolders
   load after them and, for a migrated family, replace the old registration. */
for (const file of kitFiles("assets/js/kits").sort((a, b) =>
  a.split("/").length - b.split("/").length || a.localeCompare(b))) load(file);
load("assets/js/atlas.js");
for (const file of [
  "01-timing", "02-aim", "03-puzzles", "04-brain", "05-action",
]) load(`assets/js/atlas/${file}.js`);

const games = sandbox.PP_GAMES;
const byId = sandbox.PP_GAME_BY_ID;
const kits = sandbox.PP_KITS;
const ids = Object.keys(kits);
const errors = [];

function fail(message) { errors.push(message); }

if (games.length !== 176) fail(`catalogue is ${games.length}, expected 176`);
if (new Set(games.map((g) => g.id)).size !== games.length) fail("duplicate catalogue id");
if (new Set(games.map((g) => g.title)).size !== games.length) fail("duplicate catalogue title");

const kitGames = games.filter((g) => typeof g.kit === "string" && g.kit.startsWith("kit-"));
const atlasGames = games.filter((g) => typeof g.kit === "string" && g.kit.startsWith("atlas-"));
const bespoke = games.filter((g) => !g.kit);
if (kitGames.length !== 110) fail(`kit games are ${kitGames.length}, expected 110`);
if (atlasGames.length !== 50) fail(`atlas games are ${atlasGames.length}, expected 50`);
if (bespoke.length !== 16) fail(`bespoke games are ${bespoke.length}, expected 16`);
if (ids.length !== 160) fail(`registered engines are ${ids.length}, expected 160`);

const claimed = new Map();
for (const game of [...kitGames, ...atlasGames]) {
  if (!kits[game.kit]) fail(`${game.id} has no engine ${game.kit}`);
  if (claimed.has(game.kit)) fail(`engine ${game.kit} is shared by ${claimed.get(game.kit)} and ${game.id}`);
  claimed.set(game.kit, game.id);
  if (!byId[game.id]) fail(`${game.id} missing from PP_GAME_BY_ID`);
}
if (claimed.size !== 160) fail(`claimed engines are ${claimed.size}, expected 160`);

const multi = [];
for (const id of ids) {
  const def = kits[id];
  if (!def || !Array.isArray(def.modes)) { fail(`${id} has no modes array`); continue; }
  if (def.modes.length !== 1) multi.push(`${id}:${def.modes.length}`);
  if (!def.modes[0] || typeof def.modes[0].name !== "string") fail(`${id} has a nameless mode`);
}
if (multi.length) fail(`multi-mode engines: ${multi.slice(0, 5).join(", ")}`);

/* Every catalogue engine must be claimed by exactly one game, and no legacy
   shared engine ids may survive. */
for (const id of ids) {
  if (!claimed.has(id)) fail(`engine ${id} is not used by any catalogue entry`);
}
if (process.env.ALLOW_LEGACY !== "1") {
  for (const legacy of ["atlas", "tap", "dodge", "catch", "flash", "reflex", "stack", "quiz", "snakey", "breaker", "lanes"]) {
    if (kits[legacy]) fail(`legacy shared engine still registered: ${legacy}`);
  }
}

const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space", "KeyA", "KeyD", "KeyW", "KeyS"];
const runtime = [];
let framesRun = 0;

for (const game of [...kitGames, ...atlasGames]) {
  const def = kits[game.kit];
  if (!def) continue;
  const mode = def.modes[0];
  let finish = null;
  const api = {
    W: 600, H: 600,
    ctx: ctx2d,
    level: game.level,
    accent: game.accent,
    mode,
    game,
    elapsed: 0,
    px: 300, py: 300,
    keys: {},
    ended: false,
    hud() {},
    bg() {},
    text() {},
    burst() {},
    shake() {},
    sfx() {},
    haptic() {},
    finish(score) { finish = score; },
  };
  try {
    const obj = def.make(api);
    if (!obj || typeof obj.update !== "function" || typeof obj.draw !== "function") {
      throw new Error("missing update/draw");
    }
    for (let frame = 0; frame < 90; frame++) {
      if (finish !== null) break;
      if (mode.name !== game.title) throw new Error(`mode ${mode.name} does not match ${game.title}`);
      api.elapsed += 1 / 30;
      obj.update(1 / 30);
      if (frame % 4 === 0) obj.draw();
      if (frame % 13 === 0) {
        const x = 40 + Math.random() * 520;
        const y = 60 + Math.random() * 500;
        if (obj.down) obj.down(x, y);
        if (obj.tap) obj.tap(x, y);
        if (obj.release) obj.release(x, y, -20, -30);
        if (obj.key) obj.key(keys[Math.floor(Math.random() * keys.length)]);
      }
      framesRun++;
    }
  } catch (err) {
    runtime.push({ id: game.id, engine: game.kit, error: String((err && err.stack) || err).split("\n").slice(0, 3).join(" | ") });
  }
}

console.log(JSON.stringify({
  catalogue: games.length,
  kitGames: kitGames.length,
  atlasGames: atlasGames.length,
  bespoke: bespoke.length,
  registeredEngines: ids.length,
  claimedEngines: claimed.size,
  oneModeEngines: ids.length - multi.length,
  framesRun,
  failures: errors.length,
  runtimeFailures: runtime.length,
  failureSample: errors.slice(0, 10),
  runtimeSample: runtime.slice(0, 8),
}, null, 2));

if (errors.length || runtime.length) process.exitCode = 1;
