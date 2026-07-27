import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { loadPyodide } from "pyodide";

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

let pyodidePromise;
let harnessPromise;

async function runNativePython(source, defaultSpell = "fire", targets = []) {
  pyodidePromise ??= loadPyodide();
  harnessPromise ??= readFile(new URL("../public/python-harness.py", import.meta.url), "utf8");
  const [pyodide, harness] = await Promise.all([pyodidePromise, harnessPromise]);
  const globals = pyodide.globals.get("dict")();
  try {
    globals.set("__source", source);
    globals.set("__targets_json", JSON.stringify(targets));
    globals.set("__default_spell", defaultSpell);
    return JSON.parse(await pyodide.runPythonAsync(harness, { globals }));
  } finally {
    globals.destroy();
  }
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
  const [page, harness] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../public/python-harness.py", import.meta.url), "utf8"),
  ]);
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
  assert.match(page, /for layer in range\(1, 5\):/);
  assert.match(harness, /def rock_top\(\):/);
  assert.match(harness, /def rock_left\(row\):/);
  assert.match(harness, /def rock_has\(row, col\):/);
  assert.doesNotMatch(harness, /path_is_clear|blockage_remains|boss_needs_ice/);
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

test("native Python accepts tuple iteration and unpacking without requiring range as the outer loop", async () => {
  const source = [
    "for sx, sy in (13,2),(11,4),(9,6):",
    "    for dx in range(0,3):",
    "        earth(sx-dx, sy)",
  ].join("\n");
  const { actions } = await runNativePython(source, "earth");

  assert.deepEqual(actions, [
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

test("native Python executes imports, itertools.product, functions, and comprehensions", async () => {
  const source = [
    "from itertools import *",
    "def cast(rows, cols):",
    "    points = [(i, j) for i, j in product(rows, cols)]",
    "    for i, j in points:",
    "        fire(i, j)",
    "cast(range(5, 10), range(3, 8))",
  ].join("\n");
  const { actions, executionMs } = await runNativePython(source);

  assert.equal(actions.length, 25);
  assert.deepEqual(actions[0], { spell: "fire", row: 5, col: 3, line: 5 });
  assert.deepEqual(actions.at(-1), { spell: "fire", row: 9, col: 7, line: 5 });
  assert.ok(executionMs >= 0);
});
