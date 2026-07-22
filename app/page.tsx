"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Spell = "ice" | "wind" | "sound" | "metal" | "stone" | "fire" | "earth";
type ObjectKind = "monster" | "tree" | "rock" | "mud" | "water";
type GameObject = {
  row: number;
  col: number;
  emoji: string;
  name: string;
  kind: ObjectKind;
  target?: boolean;
  order?: number;
};

type Level = {
  id: number;
  title: string;
  area: string;
  focus: string;
  spell: Spell;
  spellName: string;
  spellGlyph: string;
  mana: number;
  description: string;
  mission: string;
  hint: string;
  starterCode: string;
  objects: GameObject[];
  strictOrder?: boolean;
  entry: "burrow" | "fly" | "walk" | "rise" | "still";
  terrain: "meadow" | "cave" | "grave" | "desert" | "river";
};

const keyOf = (row: number, col: number) => `${row}-${col}`;
const targets = (
  coords: [number, number][],
  emoji: string,
  name: string,
  kind: ObjectKind = "monster",
) => coords.map(([row, col], order) => ({ row, col, emoji, name, kind, target: true, order }));

const decorations: GameObject[] = [
  { row: 1, col: 2, emoji: "🌲", name: "古树", kind: "tree" },
  { row: 2, col: 12, emoji: "🌳", name: "大树", kind: "tree" },
  { row: 12, col: 1, emoji: "🪨", name: "岩石", kind: "rock" },
  { row: 13, col: 11, emoji: "🌲", name: "松树", kind: "tree" },
];

const LEVELS: Level[] = [
  {
    id: 1,
    title: "冰封史莱姆",
    area: "青苔原野",
    focus: "range(stop)",
    spell: "ice",
    spellName: "寒冰晶刺",
    spellGlyph: "❄",
    mana: 5,
    description: "史莱姆正从草地里钻出。用一个参数的 range 连续冰封它们。",
    mission: "击中第 7 行、2 到 6 列的 5 只史莱姆，不能伤到树木。",
    hint: "range(2, 7) 会生成 2、3、4、5、6；也可以先思考怎样只用一个参数。",
    starterCode: "# j 会依次变成 2、3、4、5、6\nfor j in range(2, 7):\n    ice(7, j)",
    objects: [
      ...targets([[7, 2], [7, 3], [7, 4], [7, 5], [7, 6]], "🟢", "史莱姆"),
      ...decorations,
    ],
    entry: "burrow",
    terrain: "meadow",
  },
  {
    id: 2,
    title: "风之蝙蝠",
    area: "回声洞穴",
    focus: "range(start, stop)",
    spell: "wind",
    spellName: "旋风刃",
    spellGlyph: "≈",
    mana: 6,
    description: "蝙蝠从洞穴斜着飞来。一个循环变量可以同时决定行和列。",
    mission: "沿斜线吹走 6 只蝙蝠：从 (2,3) 到 (7,8)。",
    hint: "当 i 从 2 走到 7 时，列坐标始终比 i 大 1。",
    starterCode: "for i in range(2, 8):\n    wind(i, i + 1)",
    objects: [
      ...targets([[2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8]], "🦇", "小蝙蝠"),
      { row: 2, col: 2, emoji: "🕳️", name: "洞口", kind: "rock" },
      { row: 8, col: 4, emoji: "🪨", name: "洞穴岩石", kind: "rock" },
      { row: 10, col: 11, emoji: "🪨", name: "洞穴岩石", kind: "rock" },
    ],
    entry: "fly",
    terrain: "cave",
  },
  {
    id: 3,
    title: "声波地精",
    area: "红砂峡谷",
    focus: "range(start, stop, step)",
    spell: "sound",
    spellName: "震荡音波",
    spellGlyph: "♪",
    mana: 6,
    description: "地精隔一格排成阵型。第三个 range 参数能让法术跳着走。",
    mission: "只攻击第 10 行的奇数列：1、3、5、7、9、11。",
    hint: "range(1, 12, 2) 从 1 开始，每次增加 2，在 12 前停下。",
    starterCode: "for j in range(1, 12, 2):\n    sound(10, j)",
    objects: [
      ...targets([[10, 1], [10, 3], [10, 5], [10, 7], [10, 9], [10, 11]], "👺", "地精"),
      { row: 10, col: 2, emoji: "🌵", name: "仙人掌", kind: "tree" },
      { row: 10, col: 6, emoji: "🌵", name: "仙人掌", kind: "tree" },
      { row: 10, col: 10, emoji: "🌵", name: "仙人掌", kind: "tree" },
    ],
    entry: "walk",
    terrain: "desert",
  },
  {
    id: 4,
    title: "蛇首逆袭",
    area: "盘蛇遗迹",
    focus: "逆向 range",
    spell: "metal",
    spellName: "秘银飞刃",
    spellGlyph: "✦",
    mana: 8,
    description: "蛇怪的身体刀枪不入。每次只能击中发亮的头部，它会逐格后退。",
    mission: "严格按 11 → 4 的列顺序攻击第 6 行，任何抢攻都会失败。",
    hint: "逆向 range 需要负步长：range(11, 3, -1)。",
    starterCode: "for j in range(11, 3, -1):\n    metal(6, j)",
    objects: [
      ...targets([[6, 11], [6, 10], [6, 9], [6, 8], [6, 7], [6, 6], [6, 5], [6, 4]], "🐍", "蛇怪"),
      { row: 3, col: 3, emoji: "🗿", name: "遗迹石像", kind: "rock" },
      { row: 9, col: 12, emoji: "🗿", name: "遗迹石像", kind: "rock" },
    ],
    strictOrder: true,
    entry: "still",
    terrain: "cave",
  },
  {
    id: 5,
    title: "石化墓园",
    area: "月影墓园",
    focus: "双层 for · 矩形",
    spell: "stone",
    spellName: "落岩术",
    spellGlyph: "◆",
    mana: 12,
    description: "骷髅兵从 3×4 的墓区爬出。外层循环走行，内层循环走列。",
    mission: "完整覆盖第 3–5 行、第 8–11 列的矩形。",
    hint: "外层 range(3, 6)，内层 range(8, 12)。注意缩进。",
    starterCode: "for i in range(3, 6):\n    for j in range(8, 12):\n        stone(i, j)",
    objects: [
      ...targets(Array.from({ length: 3 }, (_, r) => Array.from({ length: 4 }, (_, c) => [r + 3, c + 8] as [number, number])).flat(), "💀", "骷髅兵"),
      { row: 2, col: 7, emoji: "🪦", name: "墓碑", kind: "rock" },
      { row: 6, col: 12, emoji: "🪦", name: "墓碑", kind: "rock" },
      { row: 8, col: 4, emoji: "🌲", name: "枯树", kind: "tree" },
    ],
    entry: "rise",
    terrain: "grave",
  },
  {
    id: 6,
    title: "火焰三角阵",
    area: "荆棘营地",
    focus: "双层 for · 三角形",
    spell: "fire",
    spellName: "烈焰流星",
    spellGlyph: "🔥",
    mana: 15,
    description: "穿藤甲的强盗摆成下三角阵。每一行都比上一行多一个目标。",
    mission: "烧掉第 3–7 行的三角阵，但别点燃阵外的古树。",
    hint: "第 i 行的列从 3 开始，到 i 结束。range 的 stop 不会被包含。",
    starterCode: "for i in range(3, 8):\n    for j in range(3, i + 1):\n        fire(i, j)",
    objects: [
      ...targets(Array.from({ length: 5 }, (_, r) => Array.from({ length: r + 1 }, (_, c) => [r + 3, c + 3] as [number, number])).flat(), "🥷", "藤甲强盗"),
      { row: 2, col: 3, emoji: "🌲", name: "古树", kind: "tree" },
      { row: 4, col: 8, emoji: "🌲", name: "古树", kind: "tree" },
      { row: 8, col: 5, emoji: "🌳", name: "大树", kind: "tree" },
    ],
    entry: "walk",
    terrain: "meadow",
  },
  {
    id: 7,
    title: "开渠救村",
    area: "干涸河谷",
    focus: "动态 while",
    spell: "earth",
    spellName: "大地开凿",
    spellGlyph: "⛏",
    mana: 11,
    description: "水流每前进一步才会露出下一块泥土。开挖次数无法事先知道，while 正合适。",
    mission: "反复读取 water_front()，一直挖到 village_has_water() 为真。",
    hint: "while 的条件写“村庄还没有水”。每轮读取新的水头坐标再开挖。",
    starterCode: "while not village_has_water():\n    i, j = water_front()\n    earth(i, j)",
    objects: [
      ...targets([[12, 2], [11, 2], [10, 2], [10, 3], [10, 4], [9, 4], [8, 4], [8, 5], [8, 6], [7, 6], [6, 6]], "🟫", "堵塞泥土", "mud"),
      { row: 13, col: 2, emoji: "💧", name: "水源", kind: "water" },
      { row: 5, col: 6, emoji: "🏘️", name: "村庄", kind: "rock" },
      { row: 9, col: 5, emoji: "🌲", name: "河岸树木", kind: "tree" },
    ],
    strictOrder: true,
    entry: "still",
    terrain: "river",
  },
  {
    id: 8,
    title: "火扫虫巢",
    area: "熔岩虫穴",
    focus: "双层 for · Z 字",
    spell: "fire",
    spellName: "赤焰追踪",
    spellGlyph: "☄",
    mana: 25,
    description: "巨虫按 Z 字路线涌出。每行方向相反，法术必须紧跟队伍。",
    mission: "用双层循环依次清理 5×5 虫群；zigzag_col(i, k) 会计算当前列。",
    hint: "外层控制行，内层让 k 从 0 到 4；把 i 和 k 交给 zigzag_col。",
    starterCode: "for i in range(4, 9):\n    for k in range(5):\n        j = zigzag_col(i, k)\n        fire(i, j)",
    objects: [
      ...targets(Array.from({ length: 5 }, (_, r) => Array.from({ length: 5 }, (_, k) => [r + 4, r % 2 === 0 ? k + 4 : 8 - k] as [number, number])).flat(), "🐛", "熔岩巨虫"),
      { row: 3, col: 3, emoji: "🪨", name: "火山岩", kind: "rock" },
      { row: 9, col: 9, emoji: "🪨", name: "火山岩", kind: "rock" },
    ],
    strictOrder: true,
    entry: "burrow",
    terrain: "desert",
  },
];

const WORLD_STAGES = [
  ...LEVELS.map((level) => ({ id: level.id, title: level.title, focus: level.focus, playable: true })),
  { id: 9, title: "冰火石巨人", focus: "外圈 → 内圈", playable: false },
  { id: 10, title: "寒冰迷螺", focus: "向内螺旋", playable: false },
  { id: 11, title: "风暴清障", focus: "状态 while", playable: false },
  { id: 12, title: "终焉蛇王", focus: "综合挑战", playable: false },
];

type Value = number | boolean | number[];
type ExprToken = { type: "number" | "name" | "op"; value: string };
type Node =
  | { type: "for"; name: string; args: string[]; body: Node[]; line: number }
  | { type: "while"; condition: string; body: Node[]; line: number }
  | { type: "if"; condition: string; body: Node[]; line: number }
  | { type: "assign"; name: string; expression: string; line: number }
  | { type: "tupleAssign"; names: string[]; functionName: string; line: number }
  | { type: "call"; name: string; args: string[]; line: number };

const splitArgs = (source: string) => {
  const result: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < source.length; i += 1) {
    if (source[i] === "(") depth += 1;
    if (source[i] === ")") depth -= 1;
    if (source[i] === "," && depth === 0) {
      result.push(source.slice(start, i).trim());
      start = i + 1;
    }
  }
  const tail = source.slice(start).trim();
  if (tail) result.push(tail);
  return result;
};

function tokenize(expression: string): ExprToken[] {
  const tokens: ExprToken[] = [];
  const pattern = /\s*(?:(\d+)|(\/\/|==|!=|<=|>=|[()+\-*/%<>,])|([A-Za-z_]\w*))/gy;
  let index = 0;
  while (index < expression.length) {
    pattern.lastIndex = index;
    const match = pattern.exec(expression);
    if (!match) throw new Error(`无法理解表达式：${expression.slice(index)}`);
    if (match[1]) tokens.push({ type: "number", value: match[1] });
    else if (match[2]) tokens.push({ type: "op", value: match[2] });
    else tokens.push({ type: "name", value: match[3] });
    index = pattern.lastIndex;
  }
  return tokens;
}

const asNumber = (value: Value, expression: string) => {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`这里需要一个数字：${expression}`);
  return value;
};

class ExpressionParser {
  private index = 0;
  constructor(
    private tokens: ExprToken[],
    private vars: Record<string, Value>,
    private callBuiltin: (name: string, args: Value[]) => Value,
  ) {}

  parse(): Value {
    const value = this.parseOr();
    if (this.index < this.tokens.length) throw new Error(`多余的符号：${this.tokens[this.index].value}`);
    return value;
  }

  private peek(value?: string) {
    const token = this.tokens[this.index];
    return value ? token?.value === value : token;
  }

  private take(value?: string) {
    const token = this.tokens[this.index];
    if (!token || (value && token.value !== value)) throw new Error(`期待 ${value ?? "表达式"}`);
    this.index += 1;
    return token;
  }

  private parseOr(): Value {
    let left = this.parseAnd();
    while (this.peek("or")) {
      this.take();
      left = Boolean(left) || Boolean(this.parseAnd());
    }
    return left;
  }

  private parseAnd(): Value {
    let left = this.parseCompare();
    while (this.peek("and")) {
      this.take();
      left = Boolean(left) && Boolean(this.parseCompare());
    }
    return left;
  }

  private parseCompare(): Value {
    let left = this.parseAdd();
    while (["==", "!=", "<", "<=", ">", ">="].includes(this.tokens[this.index]?.value ?? "")) {
      const op = this.take().value;
      const right = this.parseAdd();
      if (op === "==") left = left === right;
      if (op === "!=") left = left !== right;
      if (op === "<") left = asNumber(left, op) < asNumber(right, op);
      if (op === "<=") left = asNumber(left, op) <= asNumber(right, op);
      if (op === ">") left = asNumber(left, op) > asNumber(right, op);
      if (op === ">=") left = asNumber(left, op) >= asNumber(right, op);
    }
    return left;
  }

  private parseAdd(): Value {
    let left = this.parseMultiply();
    while (this.peek("+") || this.peek("-")) {
      const op = this.take().value;
      const right = this.parseMultiply();
      left = op === "+" ? asNumber(left, op) + asNumber(right, op) : asNumber(left, op) - asNumber(right, op);
    }
    return left;
  }

  private parseMultiply(): Value {
    let left = this.parseUnary();
    while (["*", "/", "//", "%"].includes(this.tokens[this.index]?.value ?? "")) {
      const op = this.take().value;
      const right = asNumber(this.parseUnary(), op);
      const leftNumber = asNumber(left, op);
      if (right === 0) throw new Error("不能除以 0");
      if (op === "*") left = leftNumber * right;
      if (op === "/") left = leftNumber / right;
      if (op === "//") left = Math.floor(leftNumber / right);
      if (op === "%") left = leftNumber % right;
    }
    return left;
  }

  private parseUnary(): Value {
    if (this.peek("not")) {
      this.take();
      return !Boolean(this.parseUnary());
    }
    if (this.peek("-")) {
      this.take();
      return -asNumber(this.parseUnary(), "负号");
    }
    return this.parsePrimary();
  }

  private parsePrimary(): Value {
    const token = this.take();
    if (token.type === "number") return Number(token.value);
    if (token.value === "(") {
      const value = this.parseOr();
      this.take(")");
      return value;
    }
    if (token.type !== "name") throw new Error(`无法理解 ${token.value}`);
    if (token.value === "True") return true;
    if (token.value === "False") return false;
    if (this.peek("(")) {
      this.take("(");
      const args: Value[] = [];
      if (!this.peek(")")) {
        do {
          args.push(this.parseOr());
          if (!this.peek(",")) break;
          this.take(",");
        } while (!this.peek(")"));
      }
      this.take(")");
      return this.callBuiltin(token.value, args);
    }
    if (!(token.value in this.vars)) throw new Error(`变量 ${token.value} 还没有赋值`);
    return this.vars[token.value];
  }
}

function parseProgram(source: string): Node[] {
  if (source.length > 4096) throw new Error("代码太长了，请控制在 4 KB 以内");
  const lines = source
    .replace(/\t/g, "    ")
    .split("\n")
    .map((raw, index) => {
      const withoutComment = raw.split("#")[0].replace(/\s+$/, "");
      return { indent: withoutComment.match(/^ */)?.[0].length ?? 0, text: withoutComment.trim(), line: index + 1 };
    })
    .filter((line) => line.text);
  if (!lines.length) throw new Error("先写一点 Python 代码吧");

  function block(start: number, indent: number): [Node[], number] {
    const nodes: Node[] = [];
    let cursor = start;
    while (cursor < lines.length) {
      const current = lines[cursor];
      if (current.indent < indent) break;
      if (current.indent > indent) throw new Error(`第 ${current.line} 行缩进多了一层`);
      const forMatch = current.text.match(/^for\s+([A-Za-z_]\w*)\s+in\s+range\((.*)\):$/);
      const whileMatch = current.text.match(/^while\s+(.+):$/);
      const ifMatch = current.text.match(/^if\s+(.+):$/);
      if (forMatch || whileMatch || ifMatch) {
        const next = lines[cursor + 1];
        if (!next || next.indent <= indent) throw new Error(`第 ${current.line} 行下面需要缩进代码`);
        const [body, nextCursor] = block(cursor + 1, next.indent);
        if (forMatch) nodes.push({ type: "for", name: forMatch[1], args: splitArgs(forMatch[2]), body, line: current.line });
        if (whileMatch) nodes.push({ type: "while", condition: whileMatch[1], body, line: current.line });
        if (ifMatch) nodes.push({ type: "if", condition: ifMatch[1], body, line: current.line });
        cursor = nextCursor;
        continue;
      }
      const tupleMatch = current.text.match(/^([A-Za-z_]\w*)\s*,\s*([A-Za-z_]\w*)\s*=\s*([A-Za-z_]\w*)\(\s*\)$/);
      if (tupleMatch) {
        nodes.push({ type: "tupleAssign", names: [tupleMatch[1], tupleMatch[2]], functionName: tupleMatch[3], line: current.line });
        cursor += 1;
        continue;
      }
      const assignMatch = current.text.match(/^([A-Za-z_]\w*)\s*=\s*(.+)$/);
      if (assignMatch) {
        nodes.push({ type: "assign", name: assignMatch[1], expression: assignMatch[2], line: current.line });
        cursor += 1;
        continue;
      }
      const callMatch = current.text.match(/^([A-Za-z_]\w*)\((.*)\)$/);
      if (callMatch) {
        nodes.push({ type: "call", name: callMatch[1], args: splitArgs(callMatch[2]), line: current.line });
        cursor += 1;
        continue;
      }
      throw new Error(`第 ${current.line} 行暂不支持：${current.text}`);
    }
    return [nodes, cursor];
  }

  return block(0, lines[0].indent)[0];
}

type Action = { spell: Spell; row: number; col: number; line: number };

function executeProgram(source: string, level: Level): Action[] {
  const nodes = parseProgram(source);
  const vars: Record<string, Value> = {};
  const actions: Action[] = [];
  const orderedTargets = level.objects.filter((object) => object.target).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const runtime = { frontIndex: 0, steps: 0 };
  const spellNames = new Set<Spell>(["ice", "wind", "sound", "metal", "stone", "fire", "earth"]);

  const builtin = (name: string, args: Value[]): Value => {
    if (name === "village_has_water") return runtime.frontIndex >= orderedTargets.length;
    if (name === "water_front") {
      const target = orderedTargets[Math.min(runtime.frontIndex, orderedTargets.length - 1)];
      return target ? [target.row, target.col] : [-1, -1];
    }
    if (name === "zigzag_col") {
      const row = asNumber(args[0], name);
      const step = asNumber(args[1], name);
      return row % 2 === 0 ? 4 + step : 8 - step;
    }
    throw new Error(`不认识函数 ${name}()`);
  };
  const evaluate = (expression: string) => new ExpressionParser(tokenize(expression), vars, builtin).parse();
  const tick = (line: number) => {
    runtime.steps += 1;
    if (runtime.steps > 1000) throw new Error(`第 ${line} 行附近运行太久了，while 可能没有结束`);
  };

  function run(list: Node[]) {
    for (const node of list) {
      tick(node.line);
      if (node.type === "assign") vars[node.name] = evaluate(node.expression);
      if (node.type === "tupleAssign") {
        const value = builtin(node.functionName, []);
        if (!Array.isArray(value) || value.length !== node.names.length) throw new Error(`第 ${node.line} 行无法拆成两个坐标`);
        node.names.forEach((name, index) => { vars[name] = value[index]; });
      }
      if (node.type === "call") {
        if (!spellNames.has(node.name as Spell)) throw new Error(`第 ${node.line} 行只能调用本关法术函数`);
        const values = node.args.map((arg) => asNumber(evaluate(arg), arg));
        if (values.length !== 2 || !values.every(Number.isInteger)) throw new Error(`第 ${node.line} 行法术需要两个整数坐标`);
        const [row, col] = values;
        actions.push({ spell: node.name as Spell, row, col, line: node.line });
        if (actions.length > 225) throw new Error("法术超过 225 次，循环可能写错了");
        const expected = orderedTargets[runtime.frontIndex];
        if (level.id === 7 && node.name === "earth" && expected && expected.row === row && expected.col === col) runtime.frontIndex += 1;
      }
      if (node.type === "if" && Boolean(evaluate(node.condition))) run(node.body);
      if (node.type === "for") {
        if (node.args.length < 1 || node.args.length > 3) throw new Error(`第 ${node.line} 行 range 需要 1～3 个参数`);
        const nums = node.args.map((arg) => asNumber(evaluate(arg), arg));
        let start = 0;
        let stop = nums[0];
        let step = 1;
        if (nums.length >= 2) [start, stop] = nums;
        if (nums.length === 3) step = nums[2];
        if (!nums.every(Number.isInteger) || step === 0) throw new Error(`第 ${node.line} 行 range 参数需要是整数，步长不能为 0`);
        let loops = 0;
        for (let value = start; step > 0 ? value < stop : value > stop; value += step) {
          vars[node.name] = value;
          run(node.body);
          loops += 1;
          if (loops > 300) throw new Error(`第 ${node.line} 行循环次数太多了`);
        }
      }
      if (node.type === "while") {
        let loops = 0;
        while (Boolean(evaluate(node.condition))) {
          run(node.body);
          loops += 1;
          if (loops > 100) throw new Error(`第 ${node.line} 行 while 可能没有结束`);
        }
      }
    }
  }

  run(nodes);
  return actions;
}

const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function WorldMap({
  completed,
  bestScores,
  onSelect,
}: {
  completed: number[];
  bestScores: Record<number, number>;
  onSelect: (level: Level) => void;
}) {
  const positions = [
    [8, 74], [18, 52], [29, 70], [39, 38], [50, 58], [60, 24],
    [68, 48], [76, 70], [84, 42], [89, 14], [91, 72], [94, 91],
  ];
  const totalStars = completed.reduce((sum, id) => sum + (bestScores[id] ? 3 : 0), 0);
  return (
    <main className="world-shell">
      <header className="world-header">
        <a className="brand" href="#top" aria-label="循环秘境首页">
          <span className="brand-mark">⌁</span>
          <span><strong>循环秘境</strong><small>CODECASTER ACADEMY</small></span>
        </a>
        <div className="player-card">
          <span className="avatar">🧙</span>
          <span><small>见习法师</small><strong>循环等级 {Math.max(1, completed.length + 1)}</strong></span>
          <span className="star-pill">★ {totalStars}</span>
        </div>
      </header>

      <section className="world-intro" id="top">
        <div className="eyebrow"><span /> PYTHON 冒险 · 第一章</div>
        <h1>用循环，<em>重写魔法世界</em></h1>
        <p>每一行代码都会变成真正的法术。观察队形、写下循环，然后一次施法击破整个军团。</p>
        <button className="primary-cta" onClick={() => onSelect(LEVELS[0])}>
          <span>继续冒险</span><strong>第 1 关 · 冰封史莱姆</strong><b>→</b>
        </button>
        <div className="legend-row">
          <span><i className="dot completed" /> 已通关 {completed.length}</span>
          <span><i className="dot current" /> 可试玩 8</span>
          <span><i className="dot locked" /> 研发中 4</span>
        </div>
      </section>

      <section className="map-card" aria-label="循环秘境大地图">
        <div className="map-scroll">
          <div className="world-map">
            <div className="map-region region-meadow"><span>青苔原野</span></div>
            <div className="map-region region-canyon"><span>红砂峡谷</span></div>
            <div className="map-region region-grave"><span>月影墓园</span></div>
            <div className="map-region region-volcano"><span>熔岩虫穴</span></div>
            <div className="route route-one" />
            <div className="route route-two" />
            <div className="route route-three" />
            <div className="map-decoration deco-one">♜</div>
            <div className="map-decoration deco-two">♨</div>
            <div className="map-decoration deco-three">☁</div>
            {WORLD_STAGES.map((stage, index) => {
              const level = LEVELS.find((item) => item.id === stage.id);
              const done = completed.includes(stage.id);
              return (
                <button
                  key={stage.id}
                  className={`level-node ${done ? "is-done" : ""} ${stage.playable ? "is-open" : "is-locked"}`}
                  style={{ left: `${positions[index][0]}%`, top: `${positions[index][1]}%` }}
                  onClick={() => level && onSelect(level)}
                  disabled={!stage.playable}
                  aria-label={`第 ${stage.id} 关 ${stage.title}，${stage.playable ? "可试玩" : "研发中"}`}
                >
                  <span className="node-orbit"><b>{done ? "✓" : stage.playable ? stage.id : "⌕"}</b></span>
                  <span className="node-label"><small>LEVEL {String(stage.id).padStart(2, "0")}</small><strong>{stage.title}</strong><em>{stage.focus}</em></span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="curriculum-strip">
        <div><span>01</span><strong>单层循环</strong><small>range 的 1 / 2 / 3 个参数</small></div>
        <div><span>02</span><strong>顺序挑战</strong><small>负步长与蛇首规则</small></div>
        <div><span>03</span><strong>双层循环</strong><small>矩形、三角与 Z 字</small></div>
        <div><span>04</span><strong>动态世界</strong><small>不知道次数时用 while</small></div>
      </section>
      <footer className="world-footer">
        视觉地块与音效来自 <a href="https://kenney.nl" target="_blank" rel="noreferrer">Kenney</a>（CC0） · Python 教学实验室 · 坐标从 0 到 14
      </footer>
    </main>
  );
}

function Battle({
  level,
  onBack,
  onComplete,
}: {
  level: Level;
  onBack: () => void;
  onComplete: (id: number, score: number) => void;
}) {
  const [code, setCode] = useState(level.starterCode);
  const [status, setStatus] = useState<"entering" | "idle" | "running" | "success" | "failed">("entering");
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [destroyed, setDestroyed] = useState<Set<string>>(new Set());
  const [craters, setCraters] = useState<Set<string>>(new Set());
  const [impact, setImpact] = useState<string | null>(null);
  const [orderIndex, setOrderIndex] = useState(0);
  const [mana, setMana] = useState(level.mana);
  const [score, setScore] = useState(0);
  const [stars, setStars] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [soundOn, setSoundOn] = useState(true);
  const [showHint, setShowHint] = useState(false);
  const [log, setLog] = useState<string[]>(["等待怪物入场……"]);
  const runId = useRef(0);
  const speedRef = useRef(speed);
  const resultRef = useRef<HTMLDivElement>(null);
  const orderedTargets = useMemo(() => level.objects.filter((object) => object.target).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)), [level]);
  const objectMap = useMemo(() => new Map(level.objects.map((object) => [keyOf(object.row, object.col), object])), [level]);

  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => {
    const timer = setTimeout(() => {
      setStatus("idle");
      setLog([`敌军入场完毕。${level.spellName} 已就绪。`]);
    }, 950);
    return () => clearTimeout(timer);
  }, [level]);

  const playTone = (spell: Spell, good: boolean) => {
    if (!soundOn || typeof window === "undefined") return;
    const soundPath = !good
      ? "/assets/audio/chop.ogg"
      : spell === "metal"
        ? "/assets/audio/metalClick.ogg"
        : spell === "stone" || spell === "earth"
          ? "/assets/audio/chop.ogg"
          : "/assets/audio/knifeSlice.ogg";
    const sample = new Audio(soundPath);
    sample.volume = 0.22;
    void sample.play().catch(() => undefined);
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const frequencies: Record<Spell, number> = { ice: 720, wind: 540, sound: 440, metal: 880, stone: 180, fire: 260, earth: 130 };
    oscillator.type = good ? "triangle" : "sawtooth";
    oscillator.frequency.setValueAtTime(good ? frequencies[spell] : 92, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(good ? frequencies[spell] * 1.5 : 55, context.currentTime + 0.16);
    gain.gain.setValueAtTime(0.055, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.2);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.21);
    setTimeout(() => context.close(), 300);
  };

  const reset = () => {
    runId.current += 1;
    setRemoved(new Set());
    setDestroyed(new Set());
    setCraters(new Set());
    setImpact(null);
    setOrderIndex(0);
    setMana(level.mana);
    setScore(0);
    setStars(0);
    setStatus("idle");
    setLog(["战场已复原。准备再次施法。"]);
  };

  const runCode = async () => {
    const activeRun = runId.current + 1;
    runId.current = activeRun;
    let actions: Action[];
    try {
      actions = executeProgram(code, level);
    } catch (error) {
      setStatus("failed");
      setStars(0);
      setLog([`语法法阵没有成形：${error instanceof Error ? error.message : "未知错误"}`]);
      return;
    }
    if (!actions.length) {
      setStatus("failed");
      setLog(["代码运行了，但没有释放任何法术。"]);
      return;
    }

    const localRemoved = new Set<string>();
    const localDestroyed = new Set<string>();
    const localCraters = new Set<string>();
    let localOrder = 0;
    let invalidHits = 0;
    let remainingMana = level.mana;
    const messages = [`已生成 ${actions.length} 次法术，开始按代码顺序释放。`];
    setRemoved(new Set());
    setDestroyed(new Set());
    setCraters(new Set());
    setOrderIndex(0);
    setMana(level.mana);
    setStatus("running");
    setScore(0);
    setStars(0);
    setLog(messages);

    for (let index = 0; index < actions.length; index += 1) {
      if (runId.current !== activeRun) return;
      const action = actions[index];
      if (remainingMana <= 0) {
        invalidHits += actions.length - index;
        messages.push("法力耗尽，后续法术没有释放。");
        break;
      }
      remainingMana -= 1;
      setMana(remainingMana);
      const actionKey = keyOf(action.row, action.col);
      setImpact(actionKey);
      await sleep(70);
      const object = objectMap.get(actionKey);
      const inBounds = action.row >= 0 && action.row < 15 && action.col >= 0 && action.col < 15;
      const expected = orderedTargets[localOrder];
      const orderCorrect = !level.strictOrder || (expected && expected.row === action.row && expected.col === action.col);
      const spellCorrect = action.spell === level.spell;

      if (object?.target && !localRemoved.has(actionKey) && spellCorrect && orderCorrect) {
        localRemoved.add(actionKey);
        localOrder += 1;
        setRemoved(new Set(localRemoved));
        setOrderIndex(localOrder);
        messages.push(`第 ${action.line} 行 → ${level.spell}(${action.row}, ${action.col})：精准命中 ${object.name}`);
        playTone(action.spell, true);
      } else if (object && !object.target) {
        invalidHits += 1;
        localDestroyed.add(actionKey);
        setDestroyed(new Set(localDestroyed));
        messages.push(`误伤 ${object.name}！环境被法术破坏。`);
        playTone(action.spell, false);
      } else {
        invalidHits += 1;
        if (inBounds) {
          localCraters.add(actionKey);
          setCraters(new Set(localCraters));
        }
        const reason = !inBounds ? "坐标越界" : object?.target && !spellCorrect ? `元素错误，${object.name}抵抗了法术` : object?.target && !orderCorrect ? "不是当前蛇首／水头，顺序错误" : "打在空地上";
        messages.push(`${action.spell}(${action.row}, ${action.col})：${reason}`);
        playTone(action.spell, false);
      }
      setLog([...messages]);
      await sleep(520 / speedRef.current);
      setImpact(null);
    }

    if (runId.current !== activeRun) return;
    const cleared = localRemoved.size === orderedTargets.length;
    const perfect = cleared && invalidHits === 0 && actions.length <= level.mana;
    const finalScore = Math.max(0, Math.round((localRemoved.size / orderedTargets.length) * 2100 + remainingMana * 30 - invalidHits * 240 + (perfect ? 900 : 0)));
    setScore(finalScore);
    if (perfect) {
      setStatus("success");
      setStars(3);
      messages.push(`法阵完成：零误伤，${actions.length} 次施法全部有效！`);
      if (soundOn) {
        const victory = new Audio("/assets/audio/bookOpen.ogg");
        victory.volume = 0.34;
        void victory.play().catch(() => undefined);
      }
      onComplete(level.id, finalScore);
    } else {
      setStatus("failed");
      setStars(cleared ? 2 : localRemoved.size ? 1 : 0);
      messages.push(cleared ? `敌军已清除，但有 ${invalidHits} 次无效命中。请挑战零误伤。` : `还剩 ${orderedTargets.length - localRemoved.size} 个目标。检查 range 的边界和顺序。`);
    }
    setLog([...messages]);
    setTimeout(() => resultRef.current?.focus(), 30);
  };

  const handleEditorKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      if (status !== "running") void runCode();
      return;
    }
    if (event.key !== "Tab") return;
    event.preventDefault();
    const target = event.currentTarget;
    const next = `${code.slice(0, target.selectionStart)}    ${code.slice(target.selectionEnd)}`;
    const cursor = target.selectionStart + 4;
    setCode(next);
    requestAnimationFrame(() => { target.selectionStart = cursor; target.selectionEnd = cursor; });
  };

  const lineCount = Math.max(7, code.split("\n").length);
  const terrainAt = (row: number, col: number) => {
    if (level.terrain === "river" && (col === 1 || (row >= 11 && col === 2))) return "water";
    if (level.terrain === "grave" && (row + col) % 11 === 0) return "grave";
    if (level.terrain === "cave" && (row + col) % 9 === 0) return "stone";
    if (level.terrain === "desert") return "sand";
    return "grass";
  };

  return (
    <main className={`battle-shell spell-${level.spell}`}>
      <header className="battle-header">
        <button className="back-button" onClick={onBack} aria-label="返回大地图">← <span>世界地图</span></button>
        <div className="battle-title">
          <span className="level-number">{String(level.id).padStart(2, "0")}</span>
          <span><small>{level.area} · {level.focus}</small><strong>{level.title}</strong></span>
        </div>
        <div className="battle-tools">
          <button className="sound-toggle" onClick={() => setSoundOn((value) => !value)} aria-pressed={soundOn}>{soundOn ? "♪ 音效开" : "♩ 音效关"}</button>
          <div className="mana-orb"><span>✦</span><div><small>剩余法力</small><strong>{mana}<em> / {level.mana}</em></strong></div></div>
        </div>
      </header>

      <section className="mission-bar">
        <div className="spell-badge"><span>{level.spellGlyph}</span><div><small>本关法术</small><strong>{level.spellName}</strong><code>{level.spell}(i, j)</code></div></div>
        <div className="mission-copy"><small>MISSION</small><p>{level.mission}</p></div>
        <div className="target-progress"><small>目标</small><strong>{removed.size}<em> / {orderedTargets.length}</em></strong><div><span style={{ width: `${(removed.size / orderedTargets.length) * 100}%` }} /></div></div>
      </section>

      <section className="battle-layout">
        <div className="arena-panel">
          <div className="panel-heading">
            <div><span className="live-dot" /> 战术地图 <small>15 × 15 · ROW, COL</small></div>
            <div className="map-coordinates"><span>0</span><span>14</span></div>
          </div>
          <div className={`arena terrain-${level.terrain} status-${status}`}>
            <div className="grid-label grid-label-row">ROW</div>
            <div className="grid-label grid-label-col">COL</div>
            <div className="battle-grid" role="grid" aria-label="15乘15战术地图">
              {Array.from({ length: 225 }, (_, index) => {
                const row = Math.floor(index / 15);
                const col = index % 15;
                const cellKey = keyOf(row, col);
                const object = objectMap.get(cellKey);
                const isRemoved = removed.has(cellKey);
                const isDestroyed = destroyed.has(cellKey);
                const isCurrentHead = level.strictOrder && object?.target && object.order === orderIndex;
                const classes = [
                  "battle-cell",
                  `tile-${terrainAt(row, col)}`,
                  impact === cellKey ? "is-impact" : "",
                  isRemoved ? "is-removed" : "",
                  isDestroyed ? "is-destroyed" : "",
                  craters.has(cellKey) ? "has-crater" : "",
                  isCurrentHead ? "is-current-target" : "",
                ].filter(Boolean).join(" ");
                return (
                  <div className={classes} role="gridcell" key={cellKey} aria-label={`第 ${row} 行第 ${col} 列：${object?.name ?? "空地"}`}>
                    {row === 0 && <span className="coord coord-col">{col}</span>}
                    {col === 0 && <span className="coord coord-row">{row}</span>}
                    {object && !isRemoved && !isDestroyed && (
                      <span className={`game-object kind-${object.kind} entry-${level.entry}`} style={{ animationDelay: `${(object.order ?? 0) * 55}ms` }}>
                        {object.emoji}
                        {isCurrentHead && <i className="head-marker">▼</i>}
                      </span>
                    )}
                    {isRemoved && <span className="vanish-particles" aria-hidden>✦</span>}
                    {isDestroyed && <span className="debris" aria-hidden>{object?.kind === "tree" ? "🪵" : object?.kind === "rock" ? "💥" : "🟤"}</span>}
                    {craters.has(cellKey) && <span className="crater" aria-hidden>·</span>}
                    {impact === cellKey && <span className="spell-impact" aria-hidden>{level.spellGlyph}</span>}
                  </div>
                );
              })}
            </div>
            <div className="wizard"><span className="wizard-hat">✦</span><span className="wizard-face">🧙</span><i /></div>
            <div className="arena-status">
              <span className={`status-icon status-${status}`}>{status === "running" ? "◌" : status === "success" ? "✓" : status === "failed" ? "!" : "✦"}</span>
              <div><small>{status === "running" ? "法术执行中" : status === "success" ? "任务完成" : status === "failed" ? "需要调整" : "等待施法"}</small><strong>{status === "running" ? `第 ${removed.size + 1} 个目标` : status === "success" ? `${score} 分 · ${"★".repeat(stars)}` : level.description}</strong></div>
            </div>
          </div>
        </div>

        <div className="code-panel">
          <div className="editor-tabs">
            <div className="file-tab"><span>🐍</span> spell.py <i>●</i></div>
            <button className="hint-button" onClick={() => setShowHint((value) => !value)} aria-expanded={showHint}>✧ {showHint ? "收起提示" : "查看提示"}</button>
          </div>
          {showHint && <div className="hint-card"><span>💡</span><p>{level.hint}</p></div>}
          <div className="editor-wrap">
            <div className="line-numbers" aria-hidden>{Array.from({ length: lineCount }, (_, index) => <span key={index}>{index + 1}</span>)}</div>
            <textarea
              value={code}
              onChange={(event) => setCode(event.target.value)}
              onKeyDown={handleEditorKeyDown}
              spellCheck={false}
              aria-label="Python 代码编辑器"
              disabled={status === "running"}
            />
          </div>
          <div className="editor-actions">
            <div className="speed-control" aria-label="动画速度">
              <span>速度</span>
              {[0.5, 1, 2, 4].map((value) => <button key={value} className={speed === value ? "active" : ""} onClick={() => setSpeed(value)}>{value}×</button>)}
            </div>
            <button className="secondary-button" onClick={() => { setCode(level.starterCode); reset(); }}>↺ 还原</button>
            <button className="run-button" onClick={runCode} disabled={status === "running"}><span>{status === "running" ? "◌" : "▶"}</span>{status === "running" ? "施法中" : "运行代码"}<kbd>⌘↵</kbd></button>
          </div>
          <div className="console-panel" ref={resultRef} tabIndex={-1} aria-live="polite">
            <div className="console-head"><span><i /> 魔法控制台</span><strong className={`result-${status}`}>{status === "success" ? `${score} PTS` : status === "failed" ? "CHECK CODE" : "READY"}</strong></div>
            <div className="console-lines">
              {log.slice(-4).map((message, index) => <p key={`${message}-${index}`}><span>{index === log.slice(-4).length - 1 ? "›" : "·"}</span>{message}</p>)}
            </div>
            {status === "success" && <button className="next-button" onClick={onBack}>收下 {stars} 颗星，返回世界地图 →</button>}
          </div>
          <div className="safety-note"><span>盾</span> 本地安全模式：仅支持 range、for、while、if、整数运算与本关法术函数；最多执行 1000 步。</div>
        </div>
      </section>
    </main>
  );
}

export default function Home() {
  const [activeLevel, setActiveLevel] = useState<Level | null>(null);
  const [completed, setCompleted] = useState<number[]>([]);
  const [bestScores, setBestScores] = useState<Record<number, number>>({});

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const saved = localStorage.getItem("codecaster-progress");
        if (saved) {
          const parsed = JSON.parse(saved) as { completed?: number[]; bestScores?: Record<number, number> };
          setCompleted(parsed.completed ?? []);
          setBestScores(parsed.bestScores ?? {});
        }
      } catch { /* local progress is optional */ }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const completeLevel = (id: number, score: number) => {
    setCompleted((current) => {
      const next = current.includes(id) ? current : [...current, id];
      setBestScores((scores) => {
        const nextScores = { ...scores, [id]: Math.max(scores[id] ?? 0, score) };
        try { localStorage.setItem("codecaster-progress", JSON.stringify({ completed: next, bestScores: nextScores })); } catch { /* optional */ }
        return nextScores;
      });
      return next;
    });
  };

  return activeLevel ? (
    <Battle key={activeLevel.id} level={activeLevel} onBack={() => setActiveLevel(null)} onComplete={completeLevel} />
  ) : (
    <WorldMap completed={completed} bestScores={bestScores} onSelect={setActiveLevel} />
  );
}
