import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

async function loadSafePythonRuntime() {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const start = source.indexOf("type Value =");
  const end = source.indexOf("\nconst sleep =", start);
  assert.ok(start >= 0 && end > start, "safe Python runtime source should be discoverable");
  const runtimeSource = `${source.slice(start, end)}\n;globalThis.__runtime = { executeProgram };`;
  const javascript = ts.transpileModule(runtimeSource, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;
  const context = {};
  vm.createContext(context);
  vm.runInContext(javascript, context);
  return context.__runtime;
}

test("server-renders twelve levels and the embedded five-mode challenge dossier", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>循环秘境 · Python 法术学院<\/title>/);
  assert.match(html, /class="map-challenge-panel difficulty-beginner"/);
  assert.match(html, /CHALLENGE DOSSIER/);
  assert.match(html, /选择本关挑战难度/);
  assert.match(html, /开始本关挑战/);
  assert.match(html, /新手模式/);
  assert.match(html, /初级/);
  assert.match(html, /中级/);
  assert.match(html, /大魔法师/);
  assert.match(html, /地狱模式/);
  assert.match(html, /冰火石巨人/);
  assert.match(html, /寒冰迷螺/);
  assert.match(html, /峡口巨岩/);
  assert.match(html, /逆旋星核/);
  assert.doesNotMatch(html, /风暴清障|终焉蛇王/);
  assert.match(html, /可试玩(?:\s|<!--.*?-->)*12/);
  assert.doesNotMatch(html, /总体难度|id="difficulty-select"/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/);
});

test("per-level difficulty records, marks, and map placement stay wired together", async () => {
  const [page, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(page, /id: "novice"[\s\S]*intervalMs: null[\s\S]*failureSteps: 0/);
  assert.match(page, /id: "beginner"[\s\S]*intervalMs: null[\s\S]*failureSteps: 1/);
  assert.match(page, /id: "intermediate"[\s\S]*intervalMs: 12000/);
  assert.match(page, /id: "archmage"[\s\S]*intervalMs: 7000[\s\S]*failureSteps: 1/);
  assert.match(page, /id: "hell"[\s\S]*intervalMs: 3000[\s\S]*failureSteps: 2/);
  assert.match(page, /localStorage\.setItem\("codecaster-challenge-records-v2"/);
  assert.match(page, /localStorage\.setItem\("codecaster-level-difficulties-v2"/);
  assert.match(page, /const completedModes = DIFFICULTIES\.filter/);
  assert.match(page, /node-difficulty-marks/);
  assert.match(page, /Math\.max\(previous\?\.score \?\? 0, score\)/);
  assert.match(page, /difficulty=\{activeChallenge\.difficulty\}/);
  assert.match(css, /\.map-challenge-panel\s*\{[\s\S]*position:\s*absolute;[\s\S]*right:\s*18px;[\s\S]*bottom:\s*18px;/);
  assert.doesNotMatch(css, /\.difficulty-card\s*\{/);
});

test("levels eleven and twelve use a random boulder and one-spell outward spiral", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const level12Start = page.indexOf("id: 12,");
  const level12End = page.indexOf("\n  },\n];", level12Start);
  const level12 = page.slice(level12Start, level12End);

  assert.match(page, /id: 9,[\s\S]*title: "冰火石巨人"[\s\S]*availableSpells: \["ice", "fire"\][\s\S]*strictOrder: true/);
  assert.match(page, /id: 10,[\s\S]*title: "寒冰迷螺"[\s\S]*mana: 49[\s\S]*strictOrder: true/);
  assert.match(page, /id: 11,[\s\S]*title: "峡口巨岩"[\s\S]*mana: 27[\s\S]*objects: boulderTargets\(\)[\s\S]*stationary: true/);
  assert.match(level12, /title: "逆旋星核"/);
  assert.match(level12, /spell: "metal"/);
  assert.match(level12, /mana: 81/);
  assert.match(level12, /objects: outwardSpiralTargets\(3, 3, 9\)/);
  assert.match(level12, /stationary: true/);
  assert.doesNotMatch(level12, /availableSpells|requiredSpells/);
  assert.match(page, /function boulderTargets\(randomize = false\)/);
  assert.match(page, /function outwardSpiralCoords\(/);
  assert.match(page, /name === "rock_top"/);
  assert.match(page, /name === "rock_left" \|\| name === "rock_right"/);
  assert.match(page, /name === "rock_has"/);
  assert.match(page, /for layer in range\(1, 5\):/);
  assert.match(page, /function advanceTargetState\(/);
  assert.doesNotMatch(page, /path_is_clear|blockage_remains|boss_needs_ice/);
});

test("battle UI has external axes, caster-origin traces, fixed 2x timing, and replay", async () => {
  const [page, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(page, /className="arena-frame"/);
  assert.match(page, /axis-top/);
  assert.match(page, /axis-bottom/);
  assert.match(page, /axis-left/);
  assert.match(page, /axis-right/);
  assert.doesNotMatch(page, /className="arena-status"|className="speed-control"/);
  assert.match(page, /const ACTION_DELAY_MS = 260/);
  assert.match(page, /fromRow: scene\.caster\.row/);
  assert.match(page, /fromCol: scene\.caster\.col/);
  assert.match(page, /className=\{`spell-trace trace-\$\{spellTrace\.spell\}`\}/);
  assert.match(page, /if \(completedRef\.current\) return/);
  assert.match(page, /if \(cleared\) \{[\s\S]*setStatus\("success"\)/);
  assert.match(page, /status === "success" \? replay : runCode/);
  assert.match(page, /if \(!replayResult\) \{[\s\S]*onComplete\(level\.id, finalScore\)/);
  assert.match(css, /\.arena-frame\s*\{[\s\S]*grid-template-columns:\s*30px minmax\(0,1fr\) 30px/);
  assert.match(css, /\.spell-trace\s*\{/);
  assert.match(css, /\.game-object\.is-protected, \.game-object\.is-caster/);
  assert.doesNotMatch(css, /\.speed-control\s*\{|\.arena-status\s*\{/);
});

test("safe Python accepts tuple iteration and unpacking without requiring range as the outer loop", async () => {
  const { executeProgram } = await loadSafePythonRuntime();
  const source = [
    "for sx, sy in (13,2),(11,4),(9,6):",
    "    for dx in range(0,3):",
    "        earth(sx-dx, sy)",
  ].join("\n");
  const actions = executeProgram(source, { spell: "earth", objects: [] });

  assert.deepEqual(JSON.parse(JSON.stringify(actions)), [
    { spell: "earth", row: 13, col: 2, line: 3 },
    { spell: "earth", row: 12, col: 2, line: 3 },
    { spell: "earth", row: 11, col: 2, line: 3 },
    { spell: "earth", row: 11, col: 4, line: 3 },
    { spell: "earth", row: 10, col: 4, line: 3 },
    { spell: "earth", row: 9, col: 4, line: 3 },
    { spell: "earth", row: 9, col: 6, line: 3 },
    { spell: "earth", row: 8, col: 6, line: 3 },
    { spell: "earth", row: 7, col: 6, line: 3 },
  ]);
});

test("safe Python also supports lists, indexing, enumerate, zip, and unpack assignment", async () => {
  const { executeProgram } = await loadSafePythonRuntime();
  const source = [
    "points = [(4, 2), (3, 3)]",
    "for index, point in enumerate(points):",
    "    row, col = point",
    "    earth(row + index, point[1])",
    "for row, col in zip([2], [5]):",
    "    earth(row, col)",
  ].join("\n");
  const actions = executeProgram(source, { spell: "earth", objects: [] });

  assert.deepEqual(JSON.parse(JSON.stringify(actions)), [
    { spell: "earth", row: 4, col: 2, line: 4 },
    { spell: "earth", row: 4, col: 3, line: 4 },
    { spell: "earth", row: 2, col: 5, line: 6 },
  ]);
});
