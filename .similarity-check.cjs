/* Similarity gate: no two kit games in the same family may be near-copies.

   The check normalises each engine to its logic shape — comments, string
   labels, numeric tuning constants and local identifier names are all
   removed — then compares same-family token streams. A pair that differs
   only in constants (a "constant-only pair") collapses to an almost
   identical stream and fails. Engines that share a genre skeleton but
   implement different rules stay below the limit.

   Run: node .similarity-check.cjs [--report]
   Exit 1 when a same-family pair is at or above the limit. */

const fs = require("fs");
const path = require("path");

const ROOT = "assets/js/kits";
const LIMIT = Number(process.env.SIMILARITY_LIMIT || 0.9);
const REPORT = process.argv.includes("--report");

const KEYWORDS = new Set([
  "var", "let", "const", "function", "return", "if", "else", "for", "while",
  "do", "break", "continue", "new", "typeof", "in", "of", "this", "true",
  "false", "null", "undefined", "switch", "case", "default", "delete",
  "instanceof", "void", "try", "catch", "throw", "finally", "yield",
]);

function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:\\])\/\/[^\n]*/g, "$1 ");
}

/* Scan to tokens without building a full parser: enough to tell strings,
   identifiers, numbers and punctuation apart. */
function tokenize(src) {
  const out = [];
  const re = /"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`|[A-Za-z_$][\w$]*|\d+(?:\.\d+)?|[^\s]/g;
  let m;
  while ((m = re.exec(src))) out.push(m[0]);
  return out;
}

function normalize(src) {
  const raw = tokenize(stripComments(src));
  const names = new Map();
  const out = [];
  for (let i = 0; i < raw.length; i++) {
    const tok = raw[i];
    if (tok[0] === '"' || tok[0] === "'" || tok[0] === "`") {
      out.push("S");
    } else if (/^\d/.test(tok)) {
      out.push("N");
    } else if (/^[A-Za-z_$]/.test(tok)) {
      if (KEYWORDS.has(tok)) {
        out.push(tok);
      } else if (out[out.length - 1] === ".") {
        out.push(tok); // property names describe the rules, keep them
      } else {
        if (!names.has(tok)) names.set(tok, "v" + names.size);
        out.push(names.get(tok));
      }
    } else {
      out.push(tok);
    }
  }
  return out;
}

function shingles(tokens, k) {
  const set = new Set();
  for (let i = 0; i + k <= tokens.length; i++) set.add(tokens.slice(i, i + k).join(" "));
  return set;
}

function jaccard(a, b) {
  let shared = 0;
  for (const item of a) if (b.has(item)) shared++;
  return shared / (a.size + b.size - shared);
}

/* Token-level edit distance, capped to keep the 550 same-family pairs quick. */
function similarity(a, b) {
  const n = a.length;
  const m = b.length;
  if (!n || !m) return 0;
  if (Math.abs(n - m) / Math.max(n, m) > 0.45) return 0;
  let prev = new Array(m + 1);
  let next = new Array(m + 1);
  for (let j = 0; j <= m; j++) prev[j] = j;
  for (let i = 1; i <= n; i++) {
    next[0] = i;
    for (let j = 1; j <= m; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const del = prev[j] + 1;
      const ins = next[j - 1] + 1;
      const sub = prev[j - 1] + cost;
      next[j] = del < ins ? (del < sub ? del : sub) : (ins < sub ? ins : sub);
    }
    const swap = prev;
    prev = next;
    next = swap;
  }
  return 1 - prev[m] / Math.max(n, m);
}

function files(dir) {
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...files(full));
    else if (entry.name.endsWith(".js")) found.push(full);
  }
  return found.sort();
}

const byFamily = new Map();
for (const file of files(ROOT)) {
  const tokens = normalize(fs.readFileSync(file, "utf8"));
  const family = path.basename(path.dirname(file));
  if (!byFamily.has(family)) byFamily.set(family, []);
  byFamily.get(family).push({
    name: path.basename(file, ".js"),
    file,
    tokens,
    shingle: shingles(tokens, 6),
  });
}

const pairs = [];
for (const [family, games] of byFamily) {
  for (let i = 0; i < games.length; i++) {
    for (let j = i + 1; j < games.length; j++) {
      const a = games[i];
      const b = games[j];
      const prefilter = jaccard(a.shingle, b.shingle);
      if (prefilter < 0.2) continue;
      pairs.push({ family, a: a.name, b: b.name, jaccard: prefilter, score: similarity(a.tokens, b.tokens) });
    }
  }
}
pairs.sort((x, y) => y.score - x.score || x.family.localeCompare(y.family));

const flagged = pairs.filter((p) => p.score >= LIMIT);
const summary = {
  families: byFamily.size,
  engines: [...byFamily.values()].reduce((n, list) => n + list.length, 0),
  comparedPairs: pairs.length,
  limit: LIMIT,
  flagged: flagged.length,
};
console.log(JSON.stringify(summary, null, 2));

if (REPORT || flagged.length) {
  const rows = (REPORT ? pairs.slice(0, 25) : flagged)
    .map((p) => `${p.score.toFixed(3)}  ${p.family}/${p.a}.js ~ ${p.family}/${p.b}.js`);
  console.log(rows.join("\n"));
}
if (flagged.length) {
  console.error(`\n${flagged.length} same-family pair(s) share near-identical logic. Make each game's rules its own.`);
  process.exitCode = 1;
}
