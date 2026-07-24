"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

type Spell = "ice" | "wind" | "sound" | "metal" | "stone" | "fire" | "earth";
type ObjectKind = "monster" | "tree" | "rock" | "mud" | "water";
type GameObject = {
  row: number;
  col: number;
  emoji: string;
  sprite?: string;
  name: string;
  kind: ObjectKind;
  target?: boolean;
  order?: number;
  requiredSpells?: Spell[];
  layer?: number;
  slot?: number;
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
  availableSpells?: Spell[];
  stationary?: boolean;
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

function spiralCoords(top: number, left: number, size: number) {
  const result: [number, number][] = [];
  let bottom = top + size - 1;
  let right = left + size - 1;
  while (top <= bottom && left <= right) {
    for (let col = left; col <= right; col += 1) result.push([top, col]);
    top += 1;
    for (let row = top; row <= bottom; row += 1) result.push([row, right]);
    right -= 1;
    if (top <= bottom) {
      for (let col = right; col >= left; col -= 1) result.push([bottom, col]);
      bottom -= 1;
    }
    if (left <= right) {
      for (let row = bottom; row >= top; row -= 1) result.push([row, left]);
      left += 1;
    }
  }
  return result;
}

function golemTargets(top: number, left: number): GameObject[] {
  const mask = ["..###..", ".#####.", "#######", "#######", "#######", ".##.##.", ".##.##."];
  const cells = mask.flatMap((row, r) => [...row].flatMap((value, c) => value === "#" ? [{ r, c }] : []));
  const ringIndex = (r: number, c: number, layer: number) => {
    const low = layer;
    const high = 6 - layer;
    if (r === low) return c - low;
    if (c === high) return high - low + (r - low);
    if (r === high) return (high - low) * 2 + (high - c);
    return (high - low) * 3 + (high - r);
  };
  const ordered = cells
    .map(({ r, c }) => ({ r, c, layer: Math.min(r, c, 6 - r, 6 - c) }))
    .sort((a, b) => a.layer - b.layer || ringIndex(a.r, a.c, a.layer) - ringIndex(b.r, b.c, b.layer));
  const slots = new Map<number, number>();
  return ordered.map(({ r, c, layer }, order) => {
    const slot = slots.get(layer) ?? 0;
    slots.set(layer, slot + 1);
    return {
      row: top + r,
      col: left + c,
      emoji: "",
      sprite: "/assets/v2/dungeon/golem.png",
      name: layer === 3 ? "石巨人核心" : `第 ${layer + 1} 层岩甲`,
      kind: "monster" as ObjectKind,
      target: true,
      order,
      layer,
      slot,
      requiredSpells: [(layer + slot) % 2 === 0 ? "ice" : "fire"],
    };
  });
}

function spiralTargets(top: number, left: number, size: number, name: string, sprite: string): GameObject[] {
  return spiralCoords(top, left, size).map(([row, col], order, all) => ({
    row,
    col,
    emoji: "",
    sprite,
    name: order === all.length - 1 ? `${name}核心` : name,
    kind: "monster" as ObjectKind,
    target: true,
    order,
  }));
}

function boulderTargets(randomize = false): GameObject[] {
  const size = 7;
  const occupied = new Set<string>();
  const center = Math.floor(size / 2);
  for (let row = center - 1; row <= center + 1; row += 1) {
    for (let col = center - 1; col <= center + 1; col += 1) occupied.add(keyOf(row, col));
  }
  while (occupied.size < 27) {
    const frontier = new Map<string, number>();
    for (const cell of occupied) {
      const [row, col] = cell.split("-").map(Number);
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as [number, number][]) {
        const nextRow = row + dr;
        const nextCol = col + dc;
        const key = keyOf(nextRow, nextCol);
        if (nextRow < 0 || nextRow >= size || nextCol < 0 || nextCol >= size || occupied.has(key)) continue;
        const neighbors = [[-1, 0], [1, 0], [0, -1], [0, 1]]
          .filter(([nr, nc]) => occupied.has(keyOf(nextRow + nr, nextCol + nc))).length;
        frontier.set(key, neighbors);
      }
    }
    const candidates = [...frontier.entries()].sort((a, b) => b[1] - a[1]);
    const pool = randomize ? candidates.slice(0, Math.max(4, Math.ceil(candidates.length * 0.55))) : candidates;
    const picked = pool[randomize ? randomInt(0, pool.length - 1) : 0]?.[0];
    if (!picked) break;
    occupied.add(picked);
  }
  const coords = [...occupied]
    .map((cell) => cell.split("-").map(Number) as [number, number])
    .sort(([rowA, colA], [rowB, colB]) => rowA - rowB || colA - colB);
  const minRow = Math.min(...coords.map(([row]) => row));
  const minCol = Math.min(...coords.map(([, col]) => col));
  return coords.map(([row, col], order) => ({
    row: row - minRow + 4,
    col: col - minCol + 4,
    emoji: "",
    sprite: "/assets/v2/dungeon/rock-large.png",
    name: order === Math.floor(coords.length / 2) ? "巨岩核心" : "巨岩岩体",
    kind: "rock" as ObjectKind,
    target: true,
    order,
  }));
}

function outwardSpiralCoords(centerRow: number, centerCol: number, radius: number) {
  const result: [number, number][] = [[centerRow, centerCol]];
  let row = centerRow;
  let col = centerCol;
  for (let layer = 1; layer <= radius; layer += 1) {
    col += 1;
    result.push([row, col]);
    for (let step = 0; step < layer * 2 - 1; step += 1) {
      row -= 1;
      result.push([row, col]);
    }
    for (let step = 0; step < layer * 2; step += 1) {
      col -= 1;
      result.push([row, col]);
    }
    for (let step = 0; step < layer * 2; step += 1) {
      row += 1;
      result.push([row, col]);
    }
    for (let step = 0; step < layer * 2; step += 1) {
      col += 1;
      result.push([row, col]);
    }
  }
  return result;
}

function outwardSpiralTargets(top: number, left: number, size: number): GameObject[] {
  const radius = Math.floor(size / 2);
  const coords = outwardSpiralCoords(top + radius, left + radius, radius);
  return coords.map(([row, col], order) => ({
    row,
    col,
    emoji: "",
    sprite: order === 0 ? "/assets/v2/dungeon/rune.png" : "/assets/v2/dungeon/serpent.png",
    name: order === 0 ? "逆旋星核" : "星轨守卫",
    kind: "monster" as ObjectKind,
    target: true,
    order,
  }));
}

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
    hint: "一个参数的 range(n) 会生成 0 到 n-1。让循环变量负责第几只，再给列坐标加上当前起点。",
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
    hint: "比较第一只与最后一只的坐标：行每次加 1，列也每次加 1。两者的差值始终不变。",
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
    hint: "第三个参数是步长。让列从当前第一只开始，每次增加 2；stop 要写在最后一只之后。",
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
    hint: "可以写负步长 range(start, stop, -1)，也可以写 reversed(range(low, high))；本关只检查最终施法顺序。",
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
    hint: "外层 range 走最小行到最大行，内层 range 走最小列到最大列；两个 stop 都要比最大坐标多 1。",
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
    hint: "每下一行多一个目标。内层 stop 可以用当前行 i、第一行坐标和起始列共同算出；注意 range 的 stop 不会被包含。",
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
    stationary: true,
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
    hint: "外层控制当前随机起始行到结束行，内层让 k 从 0 到 4；把 i 和 k 交给 zigzag_col(i, k)。",
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
  {
    id: 9,
    title: "冰火石巨人",
    area: "断岳神殿",
    focus: "双层 for · 外圈到内圈",
    spell: "ice",
    availableSpells: ["ice", "fire"],
    spellName: "冰火裂岩",
    spellGlyph: "IF",
    mana: 37,
    description: "山体化成巨型石像。岩甲必须从外向内剥离，并交替承受寒冰与烈火。",
    mission: "按岩层顺序清除 37 块巨人躯体；每层中的奇偶位置弱点不同。",
    hint: "外层循环控制 layer，内层循环控制第 k 块。用 (layer + k) % 2 判断冰火。",
    starterCode: "# 外层走岩甲层，内层走当前层的石块\n",
    objects: golemTargets(4, 4),
    strictOrder: true,
    entry: "still",
    terrain: "cave",
  },
  {
    id: 10,
    title: "寒冰迷螺",
    area: "霜纹地宫",
    focus: "边界收缩 · 向内螺旋",
    spell: "ice",
    spellName: "极寒追迹",
    spellGlyph: "IC",
    mana: 49,
    description: "冰甲巨虫盘成方形螺旋，只能沿身体从外端一路攻击到中心。",
    mission: "维护 top、bottom、left、right 四条边界，顺时针清除 7×7 迷螺。",
    hint: "每走完一条边，就把对应边界向内缩一格；最后可能只剩一行或一列。",
    starterCode: "# 用四条边界写出向内收缩的螺旋\n",
    objects: spiralTargets(4, 4, 7, "冰甲迷螺", "/assets/v2/dungeon/worm.png"),
    strictOrder: true,
    entry: "burrow",
    terrain: "cave",
  },
  {
    id: 11,
    title: "峡口巨岩",
    area: "断桥峡道",
    focus: "双层 for · 随机不规则区域",
    spell: "stone",
    spellName: "裂岩冲击",
    spellGlyph: "ST",
    mana: 27,
    description: "一整块形状不规则的山岩堵死了路口；每次进入时，岩体轮廓都会改变。",
    mission: "逐行扫描巨岩的随机轮廓，只击中真正属于岩体的 27 块区域。",
    hint: "外层遍历 rock_top() 到 rock_bottom()；每一行用 rock_left(i)、rock_right(i) 确定边界，再用 rock_has(i, j) 避开凹口。",
    starterCode: "# 用双层 for 扫描随机生成的不规则巨岩\n",
    objects: boulderTargets(),
    strictOrder: true,
    stationary: true,
    entry: "still",
    terrain: "desert",
  },
  {
    id: 12,
    title: "逆旋星核",
    area: "星陨回廊",
    focus: "状态游标 · 从中心向外螺旋",
    spell: "metal",
    spellName: "星轨飞刃",
    spellGlyph: "MT",
    mana: 81,
    description: "星核展开成 9×9 守卫阵。必须从中心出发，用不断增长的步长向外逆旋。",
    mission: "维护行列游标；每扩张一层，依次向右一步、向上、向左、向下、再向右，清除 81 个目标。",
    hint: "先攻击中心。layer 从 1 到 4：右移 1 格后，上走 2*layer-1，再分别左、下、右各走 2*layer 格。",
    starterCode: "# 从中心开始，让游标按逐层增长的步数向外螺旋\n",
    objects: outwardSpiralTargets(3, 3, 9),
    strictOrder: true,
    stationary: true,
    entry: "still",
    terrain: "cave",
  },
];

type Direction = { row: number; col: number };
type BattleScene = {
  objects: GameObject[];
  protectedTarget: GameObject;
  caster: GameObject;
  direction: Direction;
};

type DifficultyId = "novice" | "beginner" | "intermediate" | "archmage" | "hell";
type Difficulty = {
  id: DifficultyId;
  label: string;
  shortLabel: string;
  description: string;
  intervalMs: number | null;
  failureSteps: number;
};
type ChallengeRecord = { score: number; completedAt: string };
type ChallengeRecords = Record<number, Partial<Record<DifficultyId, ChallengeRecord>>>;
type LevelDifficulties = Record<number, DifficultyId>;

const DIFFICULTIES: Difficulty[] = [
  {
    id: "novice",
    label: "新手模式",
    shortLabel: "怪物从不移动",
    description: "适合第一次学习：可以慢慢观察坐标，运行错误也不会改变阵型。",
    intervalMs: null,
    failureSteps: 0,
  },
  {
    id: "beginner",
    label: "初级",
    shortLabel: "仅错误时移动",
    description: "怪物只会在代码运行失败后推进一格；编辑和思考时保持不动。",
    intervalMs: null,
    failureSteps: 1,
  },
  {
    id: "intermediate",
    label: "中级",
    shortLabel: "每 12 秒移动",
    description: "编辑阶段每 12 秒推进一格；运行法术动画时暂停移动。",
    intervalMs: 12000,
    failureSteps: 0,
  },
  {
    id: "archmage",
    label: "大魔法师",
    shortLabel: "每 7 秒移动",
    description: "编辑阶段每 7 秒推进，并在运行失败时额外推进一格。",
    intervalMs: 7000,
    failureSteps: 1,
  },
  {
    id: "hell",
    label: "地狱模式",
    shortLabel: "每 3 秒移动",
    description: "编辑阶段每 3 秒推进；运行失败时再连续推进两格。",
    intervalMs: 3000,
    failureSteps: 2,
  },
];

const DEFAULT_DIFFICULTY: DifficultyId = "beginner";
const difficultyById = (id: DifficultyId) => DIFFICULTIES.find((item) => item.id === id) ?? DIFFICULTIES[1];

const EXECUTION_LIMIT_MS = 5;

const STARTER_CODE: Record<number, string> = {
  1: "# 用 range(stop) 冰封这一排史莱姆\n",
  2: "# 用 range(start, stop) 追踪斜线上的蝙蝠\n",
  3: "# 用 range(start, stop, step) 跳过环境\n",
  4: "# 按蛇首顺序释放 metal(i, j)\n",
  5: "# 写两个 for，覆盖整个矩形\n",
  6: "# 写两个 for，覆盖三角阵\n",
  7: "# 水头会变化，请用 while 持续开渠\n",
  8: "# 用双层 for 沿 Z 字顺序清理虫群\n",
  9: "# 外层走岩甲层，内层走当前层的石块\n",
  10: "# 用 top / bottom / left / right 写出螺旋\n",
  11: "# 用双层 for 扫描随机生成的不规则巨岩\n",
  12: "# 从中心开始，让游标按增长的步数向外螺旋\n",
};

const TARGET_SPRITES: Record<number, string> = {
  1: "/assets/v2/dungeon/slime.png",
  2: "/assets/v2/dungeon/bat.png",
  3: "/assets/v2/dungeon/goblin.png",
  4: "/assets/v2/dungeon/serpent.png",
  5: "/assets/v2/dungeon/skeleton.png",
  6: "/assets/v2/dungeon/bandit.png",
  7: "/assets/v2/town/mound.png",
  8: "/assets/v2/dungeon/worm.png",
  9: "/assets/v2/dungeon/golem.png",
  10: "/assets/v2/dungeon/worm.png",
  11: "/assets/v2/dungeon/rock-large.png",
  12: "/assets/v2/dungeon/rune.png",
};

const ENVIRONMENT_SPRITES: Record<Level["terrain"], { sprite: string; name: string; kind: ObjectKind }[]> = {
  meadow: [
    ["tree-amber", "金叶树", "tree"], ["pine", "松树", "tree"], ["oak", "橡树", "tree"],
    ["shrub-tall", "高灌木", "tree"], ["pine-tall", "古松", "tree"], ["oak-tall", "老橡树", "tree"],
    ["sapling", "幼树", "tree"], ["shrubs", "矮灌丛", "tree"], ["mushrooms", "蘑菇簇", "tree"],
    ["bush-left", "莓果灌木", "tree"], ["bush-center", "茂密灌木", "tree"], ["logs", "倒木", "rock"],
  ].map(([file, name, kind]) => ({ sprite: `/assets/v2/town/${file}.png`, name, kind: kind as ObjectKind })),
  cave: [
    ["rock-small", "碎岩"], ["rock-large", "洞穴巨石"], ["pit-small", "裂隙"], ["pit", "深坑"],
    ["rune", "古代符文"], ["cage", "锈蚀铁笼"], ["stonepile", "石堆"], ["torch", "洞穴火炬"],
  ].map(([file, name]) => ({ sprite: `/assets/v2/dungeon/${file}.png`, name, kind: "rock" as ObjectKind })),
  grave: [
    ["gravestone", "旧墓碑"], ["tomb", "石棺"], ["rock-small", "墓园碎石"], ["rock-large", "墓园巨石"],
    ["cage", "铁栅遗迹"], ["rune", "封印符文"], ["pit-small", "塌陷墓穴"], ["stonepile", "骨灰石堆"],
  ].map(([file, name]) => ({ sprite: `/assets/v2/dungeon/${file}.png`, name, kind: "rock" as ObjectKind })),
  desert: [
    ["tree-amber", "荒漠乔木", "tree"], ["shrub-tall", "旱地灌木", "tree"], ["mound", "沙土丘", "mud"],
    ["log", "枯木", "rock"], ["pot", "陶罐", "rock"], ["sign", "旧路牌", "rock"],
    ["rock-small", "红砂碎岩", "rock"], ["rock-large", "峡谷巨石", "rock"],
  ].map(([file, name, kind]) => ({ sprite: file.startsWith("rock") ? `/assets/v2/dungeon/${file}.png` : `/assets/v2/town/${file}.png`, name, kind: kind as ObjectKind })),
  river: [
    ["pine-small", "河岸松", "tree"], ["sapling", "河岸幼树", "tree"], ["shrubs", "芦岸灌丛", "tree"],
    ["mushrooms", "湿地蘑菇", "tree"], ["bush-left", "水边灌木", "tree"], ["fence", "护岸木栅", "rock"],
    ["log", "漂流木", "rock"], ["logs", "堆叠木料", "rock"], ["pot", "蓄水陶罐", "rock"],
  ].map(([file, name, kind]) => ({ sprite: `/assets/v2/town/${file}.png`, name, kind: kind as ObjectKind })),
};

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

function createBattleScene(level: Level): BattleScene {
  const baseTargets = (level.id === 11 ? boulderTargets(true) : level.objects.filter((object) => object.target))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const minRow = Math.min(...baseTargets.map((object) => object.row));
  const maxRow = Math.max(...baseTargets.map((object) => object.row));
  const minCol = Math.min(...baseTargets.map((object) => object.col));
  const maxCol = Math.max(...baseTargets.map((object) => object.col));
  const moving = !level.stationary;
  const vertical = moving && (maxRow - minRow <= 7) && (level.id % 2 === 0 || maxCol - minCol > 7);
  const sign = Math.random() < 0.5 ? -1 : 1;
  const direction: Direction = moving ? (vertical ? { row: sign, col: 0 } : { row: 0, col: sign }) : { row: 0, col: 0 };
  const runway = moving ? 3 : 0;
  const rowLow = (moving ? 0 : 1) + (direction.row < 0 ? runway : 0);
  const rowHigh = (moving ? 14 : 13) - (direction.row > 0 ? runway : 0);
  const colLow = (moving ? 0 : 1) + (direction.col < 0 ? runway : 0);
  const colHigh = (moving ? 14 : 13) - (direction.col > 0 ? runway : 0);
  const shiftRow = randomInt(rowLow - minRow, rowHigh - maxRow);
  const shiftCol = randomInt(colLow - minCol, colHigh - maxCol);
  const shiftedTargets = baseTargets.map((object) => ({
    ...object,
    row: object.row + shiftRow,
    col: object.col + shiftCol,
    sprite: object.sprite ?? TARGET_SPRITES[level.id],
  }));
  const centerRow = Math.round(shiftedTargets.reduce((sum, object) => sum + object.row, 0) / shiftedTargets.length);
  const centerCol = Math.round(shiftedTargets.reduce((sum, object) => sum + object.col, 0) / shiftedTargets.length);
  const stationaryCell = ([[13, 13], [1, 13], [13, 1], [1, 1]] as [number, number][])
    .find(([row, col]) => !shiftedTargets.some((object) => object.row === row && object.col === col)) ?? [13, 13];
  const protectedTarget: GameObject = level.id === 7
    ? { row: Math.max(0, shiftedTargets.at(-1)!.row - 1), col: shiftedTargets.at(-1)!.col, emoji: "", sprite: "/assets/v2/town/fountain.png", name: "缺水村庄", kind: "rock" }
    : {
        row: direction.row > 0 ? 14 : direction.row < 0 ? 0 : centerRow,
        col: direction.col > 0 ? 14 : direction.col < 0 ? 0 : centerCol,
        emoji: "",
        sprite: "/assets/v2/dungeon/hostage.png",
        name: "守护法师",
        kind: "rock",
      };
  if (level.stationary && level.id !== 7) {
    protectedTarget.row = stationaryCell[0];
    protectedTarget.col = stationaryCell[1];
  }
  const caster: GameObject = level.id === 7
    ? { row: stationaryCell[0], col: stationaryCell[1], emoji: "", sprite: "/assets/v2/dungeon/hostage.png", name: "开渠法师", kind: "rock" }
    : protectedTarget;

  const reserved = new Set<string>([keyOf(protectedTarget.row, protectedTarget.col), keyOf(caster.row, caster.col)]);
  shiftedTargets.forEach((object) => {
    for (let step = 0; step <= 14; step += 1) {
      const row = object.row + direction.row * step;
      const col = object.col + direction.col * step;
      if (row < 0 || row > 14 || col < 0 || col > 14) break;
      reserved.add(keyOf(row, col));
    }
  });
  const palette = ENVIRONMENT_SPRITES[level.terrain];
  const decorations: GameObject[] = [];
  const wanted = level.terrain === "meadow" || level.terrain === "river" ? 28 : 23;
  let attempts = 0;
  while (decorations.length < wanted && attempts < 800) {
    attempts += 1;
    const row = randomInt(0, 14);
    const col = randomInt(0, 14);
    const key = keyOf(row, col);
    if (reserved.has(key) || decorations.some((object) => object.row === row && object.col === col)) continue;
    const choice = palette[randomInt(0, palette.length - 1)];
    decorations.push({ row, col, emoji: "", sprite: choice.sprite, name: choice.name, kind: choice.kind });
  }
  const supportObjects = keyOf(caster.row, caster.col) === keyOf(protectedTarget.row, protectedTarget.col)
    ? [protectedTarget]
    : [protectedTarget, caster];
  return {
    objects: [...shiftedTargets, ...supportObjects, ...decorations],
    protectedTarget,
    caster,
    direction,
  };
}

function solutionFor(level: Level, targetsNow: GameObject[]) {
  const ordered = [...targetsNow].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const first = ordered[0];
  const last = ordered.at(-1)!;
  if (level.id === 1) return `for j in range(${ordered.length}):\n    ice(${first.row}, ${first.col} + j)`;
  if (level.id === 2) {
    const offset = first.col - first.row;
    return `for i in range(${first.row}, ${last.row + 1}):\n    wind(i, i ${offset >= 0 ? "+" : "-"} ${Math.abs(offset)})`;
  }
  if (level.id === 3) return `for j in range(${first.col}, ${last.col + 2}, 2):\n    sound(${first.row}, j)`;
  if (level.id === 4) {
    const low = Math.min(...ordered.map((object) => object.col));
    const high = Math.max(...ordered.map((object) => object.col));
    return `for j in reversed(range(${low}, ${high + 1})):\n    metal(${first.row}, j)`;
  }
  if (level.id === 5) return `for i in range(${first.row}, ${last.row + 1}):\n    for j in range(${Math.min(...ordered.map((object) => object.col))}, ${Math.max(...ordered.map((object) => object.col)) + 1}):\n        stone(i, j)`;
  if (level.id === 6) {
    const startCol = Math.min(...ordered.map((object) => object.col));
    return `for i in range(${first.row}, ${last.row + 1}):\n    for j in range(${startCol}, ${startCol} + (i - ${first.row}) + 1):\n        fire(i, j)`;
  }
  if (level.id === 7) return "while not village_has_water():\n    i, j = water_front()\n    earth(i, j)";
  if (level.id === 8) return `for i in range(${first.row}, ${last.row + 1}):\n    for k in range(5):\n        j = zigzag_col(i, k)\n        fire(i, j)`;
  if (level.id === 9) return "for layer in range(golem_layers()):\n    for k in range(shell_size(layer)):\n        i = golem_row(layer, k)\n        j = golem_col(layer, k)\n        if (layer + k) % 2 == 0:\n            ice(i, j)\n        if (layer + k) % 2 == 1:\n            fire(i, j)";
  const top = Math.min(...ordered.map((object) => object.row));
  const bottom = Math.max(...ordered.map((object) => object.row));
  const left = Math.min(...ordered.map((object) => object.col));
  const right = Math.max(...ordered.map((object) => object.col));
  if (level.id === 10) return `top = ${top}\nbottom = ${bottom}\nleft = ${left}\nright = ${right}\nwhile top <= bottom and left <= right:\n    for j in range(left, right + 1):\n        ice(top, j)\n    top = top + 1\n    for i in range(top, bottom + 1):\n        ice(i, right)\n    right = right - 1\n    if top <= bottom:\n        for j in range(right, left - 1, -1):\n            ice(bottom, j)\n        bottom = bottom - 1\n    if left <= right:\n        for i in range(bottom, top - 1, -1):\n            ice(i, left)\n        left = left + 1`;
  if (level.id === 11) return "for i in range(rock_top(), rock_bottom() + 1):\n    for j in range(rock_left(i), rock_right(i) + 1):\n        if rock_has(i, j):\n            stone(i, j)";
  return `i = ${first.row}\nj = ${first.col}\nmetal(i, j)\nfor layer in range(1, 5):\n    j = j + 1\n    metal(i, j)\n    for step in range(2 * layer - 1):\n        i = i - 1\n        metal(i, j)\n    for step in range(2 * layer):\n        j = j - 1\n        metal(i, j)\n    for step in range(2 * layer):\n        i = i + 1\n        metal(i, j)\n    for step in range(2 * layer):\n        j = j + 1\n        metal(i, j)`;
}

function missionFor(level: Level, targetsNow: GameObject[], protectedName: string) {
  const ordered = [...targetsNow].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const first = ordered[0];
  const last = ordered.at(-1)!;
  if (level.id === 7) return `依次挖开从 (${first.row},${first.col}) 到 (${last.row},${last.col}) 的 ${ordered.length} 块堵塞泥土，让水流到村庄。`;
  if (level.id === 9) return `石巨人位于 (${Math.min(...ordered.map((object) => object.row))},${Math.min(...ordered.map((object) => object.col))}) 附近，共 ${ordered.length} 块岩甲；必须从外层到核心并匹配冰火弱点。`;
  if (level.id === 10) return `迷螺占据 ${Math.min(...ordered.map((object) => object.row))}–${Math.max(...ordered.map((object) => object.row))} 行、${Math.min(...ordered.map((object) => object.col))}–${Math.max(...ordered.map((object) => object.col))} 列，沿顺时针螺旋攻击。`;
  if (level.id === 11) return `一整块随机巨岩占据第 ${Math.min(...ordered.map((object) => object.row))}–${Math.max(...ordered.map((object) => object.row))} 行，共 ${ordered.length} 块相连岩体；按行从左到右完整击碎。`;
  if (level.id === 12) return `从星核中心 (${first.row},${first.col}) 出发，以不断增长的步长向外逆旋，严格清除完整 9×9 星阵。`;
  return `当前从 (${first.row},${first.col}) 排到 (${last.row},${last.col})，共 ${ordered.length} 个。请在它们抵达${protectedName}前完成法阵。`;
}

function moveEnemies(objects: GameObject[], scene: BattleScene, steps: number) {
  if (scene.direction.row === 0 && scene.direction.col === 0 || steps <= 0) {
    return { objects, moved: 0, danger: false };
  }
  let current = objects;
  let moved = 0;
  for (let step = 0; step < steps; step += 1) {
    let danger = false;
    const next = current.map((object) => {
      if (!object.target) return object;
      const row = object.row + scene.direction.row;
      const col = object.col + scene.direction.col;
      const breachedEdge = (scene.direction.row > 0 && row === 14)
        || (scene.direction.row < 0 && row === 0)
        || (scene.direction.col > 0 && col === 14)
        || (scene.direction.col < 0 && col === 0);
      if (
        row < 0 || row > 14 || col < 0 || col > 14 || breachedEdge
        || keyOf(row, col) === keyOf(scene.protectedTarget.row, scene.protectedTarget.col)
      ) danger = true;
      return { ...object, row, col };
    });
    if (danger) return { objects: current, moved, danger: true };
    current = next;
    moved += 1;
  }
  return { objects: current, moved, danger: false };
}

const WORLD_STAGES = LEVELS.map((level) => ({ id: level.id, title: level.title, focus: level.focus, playable: true }));

type Value = number | boolean | Value[];
type ExprToken = { type: "number" | "name" | "op"; value: string };
type Node =
  | { type: "for"; names: string[]; iterable: string; body: Node[]; line: number }
  | { type: "while"; condition: string; body: Node[]; line: number }
  | { type: "if"; condition: string; body: Node[]; line: number }
  | { type: "assign"; name: string; expression: string; line: number }
  | { type: "unpackAssign"; names: string[]; expression: string; line: number }
  | { type: "call"; name: string; args: string[]; line: number };

const splitArgs = (source: string) => {
  const result: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < source.length; i += 1) {
    if (source[i] === "(" || source[i] === "[") depth += 1;
    if (source[i] === ")" || source[i] === "]") depth -= 1;
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
  const pattern = /\s*(?:(\d+)|(\/\/|==|!=|<=|>=|\(|\)|\[|\]|\+|-|\*|\/|%|<|>|,)|([A-Za-z_]\w*))/gy;
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
    const values = [this.parseOr()];
    let isTuple = false;
    while (this.peek(",")) {
      isTuple = true;
      this.take(",");
      if (!this.peek()) break;
      values.push(this.parseOr());
    }
    if (this.index < this.tokens.length) throw new Error(`多余的符号：${this.tokens[this.index].value}`);
    return isTuple ? values : values[0];
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
    let value: Value;
    if (token.type === "number") {
      value = Number(token.value);
    } else if (token.value === "(" || token.value === "[") {
      const close = token.value === "(" ? ")" : "]";
      const items: Value[] = [];
      let isSequence = token.value === "[";
      if (!this.peek(close)) {
        items.push(this.parseOr());
        while (this.peek(",")) {
          isSequence = true;
          this.take(",");
          if (this.peek(close)) break;
          items.push(this.parseOr());
        }
      } else {
        isSequence = true;
      }
      this.take(close);
      value = isSequence ? items : items[0];
    } else {
      if (token.type !== "name") throw new Error(`无法理解 ${token.value}`);
      if (token.value === "True") value = true;
      else if (token.value === "False") value = false;
      else if (this.peek("(")) {
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
        value = this.callBuiltin(token.value, args);
      } else {
        if (!(token.value in this.vars)) throw new Error(`变量 ${token.value} 还没有赋值`);
        value = this.vars[token.value];
      }
    }
    while (this.peek("[")) {
      this.take("[");
      const index = asNumber(this.parseOr(), "下标");
      this.take("]");
      if (!Array.isArray(value) || !Number.isInteger(index)) throw new Error("列表或元组下标必须是整数");
      const normalizedIndex = index < 0 ? value.length + index : index;
      if (normalizedIndex < 0 || normalizedIndex >= value.length) throw new Error("列表或元组下标超出范围");
      value = value[normalizedIndex];
    }
    return value;
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
      const forMatch = current.text.match(/^for\s+(.+?)\s+in\s+(.+):$/);
      const whileMatch = current.text.match(/^while\s+(.+):$/);
      const ifMatch = current.text.match(/^if\s+(.+):$/);
      if (forMatch || whileMatch || ifMatch) {
        const next = lines[cursor + 1];
        if (!next || next.indent <= indent) throw new Error(`第 ${current.line} 行下面需要缩进代码`);
        const [body, nextCursor] = block(cursor + 1, next.indent);
        if (forMatch) {
          const target = forMatch[1].trim().replace(/^\((.*)\)$/, "$1");
          const names = target.split(",").map((name) => name.trim());
          if (!names.length || !names.every((name) => /^[A-Za-z_]\w*$/.test(name))) {
            throw new Error(`第 ${current.line} 行 for 左侧需要变量名，多个变量请用逗号分隔`);
          }
          nodes.push({ type: "for", names, iterable: forMatch[2].trim(), body, line: current.line });
        }
        if (whileMatch) nodes.push({ type: "while", condition: whileMatch[1], body, line: current.line });
        if (ifMatch) nodes.push({ type: "if", condition: ifMatch[1], body, line: current.line });
        cursor = nextCursor;
        continue;
      }
      const unpackMatch = current.text.match(/^(\(?\s*[A-Za-z_]\w*(?:\s*,\s*[A-Za-z_]\w*)+\s*\)?)\s*=\s*(.+)$/);
      if (unpackMatch) {
        const names = unpackMatch[1].replace(/[()]/g, "").split(",").map((name) => name.trim());
        nodes.push({ type: "unpackAssign", names, expression: unpackMatch[2], line: current.line });
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
type SuccessfulRun = {
  actions: Action[];
  objects: GameObject[];
  executionMs: number;
  score: number;
  stars: number;
};
type SpellTrace = Action & { id: number; fromRow: number; fromCol: number };

const ACTION_DELAY_MS = 260;
const PROJECTILE_DELAY_MS = 105;
const cloneObjects = (items: GameObject[]) => items.map((object) => ({
  ...object,
  requiredSpells: object.requiredSpells ? [...object.requiredSpells] : undefined,
}));

const requiredSpellsFor = (target: GameObject, level: Level) => target.requiredSpells ?? [level.spell];

function advanceTargetState(
  state: { frontIndex: number; phaseIndex: number },
  targetsNow: GameObject[],
  action: Pick<Action, "spell" | "row" | "col">,
  level: Level,
) {
  const target = targetsNow[state.frontIndex];
  if (!target) return false;
  const required = requiredSpellsFor(target, level)[state.phaseIndex];
  if (target.row !== action.row || target.col !== action.col || required !== action.spell) return false;
  state.phaseIndex += 1;
  if (state.phaseIndex >= requiredSpellsFor(target, level).length) {
    state.frontIndex += 1;
    state.phaseIndex = 0;
  }
  return true;
}

function executeProgram(source: string, level: Level): Action[] {
  const nodes = parseProgram(source);
  const vars: Record<string, Value> = {};
  const actions: Action[] = [];
  const orderedTargets = level.objects.filter((object) => object.target).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const runtime = { frontIndex: 0, phaseIndex: 0, activeIndex: -1, steps: 0 };
  const spellNames = new Set<Spell>(["ice", "wind", "sound", "metal", "stone", "fire", "earth"]);

  const builtin = (name: string, args: Value[]): Value => {
    if (name === "range") {
      if (args.length < 1 || args.length > 3) throw new Error("range() 需要 1～3 个参数");
      const nums = args.map((value) => asNumber(value, "range"));
      if (!nums.every(Number.isInteger)) throw new Error("range() 参数需要是整数");
      let start = 0;
      let stop = nums[0];
      let step = 1;
      if (nums.length >= 2) [start, stop] = nums;
      if (nums.length === 3) step = nums[2];
      if (step === 0) throw new Error("range() 的步长不能为 0");
      const values: number[] = [];
      for (let value = start; step > 0 ? value < stop : value > stop; value += step) {
        values.push(value);
        if (values.length > 300) throw new Error("range() 生成的循环次数太多了");
      }
      return values;
    }
    if (name === "reversed" || name === "list" || name === "tuple" || name === "sorted") {
      if (args.length !== 1 || !Array.isArray(args[0])) throw new Error(`${name}() 需要一个列表、元组或 range`);
      const values = [...args[0]];
      if (name === "reversed") return values.reverse();
      if (name === "sorted") return values.sort((a, b) => asNumber(a, name) - asNumber(b, name));
      return values;
    }
    if (name === "enumerate") {
      if (!Array.isArray(args[0]) || args.length > 2) throw new Error("enumerate() 需要一个序列和可选起点");
      const start = args.length === 2 ? asNumber(args[1], name) : 0;
      if (!Number.isInteger(start)) throw new Error("enumerate() 的起点需要是整数");
      return args[0].map((value, index) => [start + index, value]);
    }
    if (name === "zip") {
      if (!args.length || !args.every(Array.isArray)) throw new Error("zip() 的参数需要是列表、元组或 range");
      const sequences = args as Value[][];
      const length = Math.min(...sequences.map((sequence) => sequence.length));
      return Array.from({ length }, (_, index) => sequences.map((sequence) => sequence[index]));
    }
    if (name === "len") {
      if (args.length !== 1 || !Array.isArray(args[0])) throw new Error("len() 需要一个列表、元组或 range");
      return args[0].length;
    }
    if (name === "abs") {
      if (args.length !== 1) throw new Error("abs() 需要一个数字");
      return Math.abs(asNumber(args[0], name));
    }
    if (name === "min" || name === "max" || name === "sum") {
      const values = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
      const nums = values.map((value) => asNumber(value, name));
      if (!nums.length) throw new Error(`${name}() 至少需要一个数字`);
      if (name === "sum") return nums.reduce((total, value) => total + value, 0);
      return name === "min" ? Math.min(...nums) : Math.max(...nums);
    }
    if (name === "village_has_water") return runtime.frontIndex >= orderedTargets.length;
    if (name === "water_front") {
      const target = orderedTargets[Math.min(runtime.frontIndex, orderedTargets.length - 1)];
      return target ? [target.row, target.col] : [-1, -1];
    }
    if (name === "zigzag_col") {
      const row = asNumber(args[0], name);
      const step = asNumber(args[1], name);
      const first = orderedTargets[0];
      const minCol = Math.min(...orderedTargets.map((target) => target.col));
      const maxCol = Math.max(...orderedTargets.map((target) => target.col));
      return row % 2 === first.row % 2 ? minCol + step : maxCol - step;
    }
    if (name === "golem_layers") return Math.max(...orderedTargets.map((target) => target.layer ?? 0)) + 1;
    if (name === "shell_size") {
      const layer = asNumber(args[0], name);
      return orderedTargets.filter((target) => target.layer === layer).length;
    }
    if (name === "golem_row" || name === "golem_col") {
      const layer = asNumber(args[0], name);
      const slot = asNumber(args[1], name);
      const target = orderedTargets.find((item) => item.layer === layer && item.slot === slot);
      if (!target) throw new Error(`${name}() 找不到第 ${layer} 层第 ${slot} 块岩甲`);
      return name === "golem_row" ? target.row : target.col;
    }
    if (name === "rock_top") return Math.min(...orderedTargets.map((target) => target.row));
    if (name === "rock_bottom") return Math.max(...orderedTargets.map((target) => target.row));
    if (name === "rock_left" || name === "rock_right") {
      const row = asNumber(args[0], name);
      const cols = orderedTargets.filter((target) => target.row === row).map((target) => target.col);
      if (!cols.length) throw new Error(`${name}() 找不到第 ${row} 行的岩体`);
      return name === "rock_left" ? Math.min(...cols) : Math.max(...cols);
    }
    if (name === "rock_has") {
      const row = asNumber(args[0], name);
      const col = asNumber(args[1], name);
      return orderedTargets.some((target) => target.row === row && target.col === col);
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
      if (node.type === "unpackAssign") {
        const value = evaluate(node.expression);
        if (!Array.isArray(value) || value.length !== node.names.length) {
          throw new Error(`第 ${node.line} 行需要 ${node.names.length} 个值才能完成解包`);
        }
        node.names.forEach((name, index) => { vars[name] = value[index]; });
      }
      if (node.type === "call") {
        if (!spellNames.has(node.name as Spell)) throw new Error(`第 ${node.line} 行只能调用本关法术函数`);
        const values = node.args.map((arg) => asNumber(evaluate(arg), arg));
        if (values.length !== 2 || !values.every(Number.isInteger)) throw new Error(`第 ${node.line} 行法术需要两个整数坐标`);
        const [row, col] = values;
        const action = { spell: node.name as Spell, row, col, line: node.line };
        actions.push(action);
        if (actions.length > 225) throw new Error("法术超过 225 次，循环可能写错了");
        advanceTargetState(runtime, orderedTargets, action, level);
      }
      if (node.type === "if" && Boolean(evaluate(node.condition))) run(node.body);
      if (node.type === "for") {
        const values = evaluate(node.iterable);
        if (!Array.isArray(values)) throw new Error(`第 ${node.line} 行 for 后面需要可遍历的 range、列表或元组`);
        if (values.length > 300) throw new Error(`第 ${node.line} 行循环次数太多了`);
        let loops = 0;
        for (const value of values) {
          if (node.names.length === 1) {
            vars[node.names[0]] = value;
          } else {
            if (!Array.isArray(value) || value.length !== node.names.length) {
              throw new Error(`第 ${node.line} 行每一项需要有 ${node.names.length} 个值才能解包`);
            }
            node.names.forEach((name, index) => { vars[name] = value[index]; });
          }
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
  records,
  levelDifficulties,
  onLevelDifficultyChange,
  onSelect,
}: {
  records: ChallengeRecords;
  levelDifficulties: LevelDifficulties;
  onLevelDifficultyChange: (levelId: number, difficulty: DifficultyId) => void;
  onSelect: (level: Level, difficulty: DifficultyId) => void;
}) {
  const [selectedLevelId, setSelectedLevelId] = useState(1);
  const positions = [
    [8, 74], [18, 52], [29, 70], [39, 38], [50, 58], [60, 24],
    [68, 48], [77, 26], [86, 43], [92, 15], [60, 72], [48, 88],
  ];
  const selectedLevel = LEVELS.find((level) => level.id === selectedLevelId) ?? LEVELS[0];
  const selectedDifficultyId = levelDifficulties[selectedLevel.id] ?? DEFAULT_DIFFICULTY;
  const selectedDifficulty = difficultyById(selectedDifficultyId);
  const selectedRecords = records[selectedLevel.id] ?? {};
  const completedLevels = LEVELS.filter((level) => Object.keys(records[level.id] ?? {}).length > 0).length;
  const totalStars = Object.values(records).reduce((sum, levelRecords) => sum + Object.keys(levelRecords).length * 3, 0);
  return (
    <main className="world-shell">
      <header className="world-header">
        <a className="brand" href="#top" aria-label="循环秘境首页">
          <span className="brand-mark">⌁</span>
          <span><strong>循环秘境</strong><small>CODECASTER ACADEMY</small></span>
        </a>
        <div className="player-card">
          <span className="avatar" aria-hidden />
          <span><small>见习法师</small><strong>循环等级 {Math.max(1, completedLevels + 1)}</strong></span>
          <span className="star-pill">★ {totalStars}</span>
        </div>
      </header>

      <section className="world-intro" id="top">
        <div className="eyebrow"><span /> PYTHON 冒险 · 第一章</div>
        <h1>用循环，<em>重写魔法世界</em></h1>
        <p>每一行代码都会变成真正的法术。观察队形、写下循环，然后一次施法击破整个军团。</p>
        <button className="primary-cta" onClick={() => onSelect(LEVELS[0], levelDifficulties[1] ?? DEFAULT_DIFFICULTY)}>
          <span>继续冒险</span><strong>第 1 关 · 冰封史莱姆</strong><b>→</b>
        </button>
        <div className="legend-row">
          <span><i className="dot completed" /> 已通关 {completedLevels}</span>
          <span><i className="dot current" /> 可试玩 {LEVELS.length}</span>
          <span><i className="dot locked" /> 每关 5 档挑战</span>
        </div>
      </section>

      <section className="map-card" aria-label="循环秘境大地图">
        <div className="map-scroll">
          <div className="world-map" id="world-map">
            <div className="map-region region-meadow"><span>青苔原野</span></div>
            <div className="map-region region-canyon"><span>红砂峡谷</span></div>
            <div className="map-region region-grave"><span>月影墓园</span></div>
            <div className="map-region region-volcano"><span>熔岩虫穴</span></div>
            <div className="route route-one" />
            <div className="route route-two" />
            <div className="route route-three" />
            <div className="map-decoration deco-one" aria-hidden />
            <div className="map-decoration deco-two" aria-hidden />
            <div className="map-decoration deco-three" aria-hidden />
            {WORLD_STAGES.map((stage, index) => {
              const level = LEVELS.find((item) => item.id === stage.id);
              const levelRecords = records[stage.id] ?? {};
              const completedModes = DIFFICULTIES.filter((item) => levelRecords[item.id]);
              const done = completedModes.length > 0;
              const mastered = completedModes.length === DIFFICULTIES.length;
              const selected = selectedLevelId === stage.id;
              return (
                <button
                  key={stage.id}
                  className={`level-node ${done ? "is-done" : ""} ${mastered ? "is-mastered" : ""} ${selected ? "is-selected" : ""} ${stage.playable ? "is-open" : "is-locked"}`}
                  style={{ left: `${positions[index][0]}%`, top: `${positions[index][1]}%` }}
                  onClick={() => level && setSelectedLevelId(level.id)}
                  disabled={!stage.playable}
                  aria-label={`第 ${stage.id} 关 ${stage.title}，${stage.playable ? "可试玩" : "研发中"}`}
                >
                  <span className="node-orbit"><b>{mastered ? "★" : done ? `${completedModes.length}/5` : stage.playable ? stage.id : "⌕"}</b></span>
                  <span className="node-label">
                    <small>LEVEL {String(stage.id).padStart(2, "0")}</small>
                    <strong>{stage.title}</strong>
                    <em>{stage.focus}</em>
                    <span className="node-difficulty-marks" aria-label={`已完成 ${completedModes.length} 个难度`}>
                      {DIFFICULTIES.map((item) => <i key={item.id} className={`mark-${item.id} ${levelRecords[item.id] ? "is-cleared" : ""}`} title={`${item.label}：${levelRecords[item.id] ? `${levelRecords[item.id]!.score} 分` : "未通关"}`} />)}
                    </span>
                  </span>
                </button>
              );
            })}
            <section className={`map-challenge-panel difficulty-${selectedDifficultyId}`} aria-label={`第 ${selectedLevel.id} 关挑战设置`}>
              <div className="challenge-panel-heading">
                <span>CHALLENGE DOSSIER</span>
                <strong>第 {String(selectedLevel.id).padStart(2, "0")} 关</strong>
              </div>
              <h2>{selectedLevel.title}</h2>
              <p>{selectedLevel.focus} · {selectedLevel.area}</p>
              <fieldset>
                <legend>选择本关挑战难度</legend>
                {DIFFICULTIES.map((item) => {
                  const record = selectedRecords[item.id];
                  return (
                    <button
                      type="button"
                      key={item.id}
                      className={`challenge-difficulty-option ${selectedDifficultyId === item.id ? "is-active" : ""} ${record ? "is-cleared" : ""}`}
                      onClick={() => onLevelDifficultyChange(selectedLevel.id, item.id)}
                    >
                      <span><i className={`difficulty-sigil mark-${item.id}`} />{item.label}</span>
                      <small>{record ? `已通关 · ${record.score} 分` : item.shortLabel}</small>
                    </button>
                  );
                })}
              </fieldset>
              <div className="challenge-rule"><span>规则</span><p>{selectedDifficulty.description}</p></div>
              <button className="challenge-start" onClick={() => onSelect(selectedLevel, selectedDifficultyId)}>
                开始本关挑战 <span>→</span>
              </button>
            </section>
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
  difficulty,
  onBack,
  onComplete,
}: {
  level: Level;
  difficulty: DifficultyId;
  onBack: () => void;
  onComplete: (id: number, score: number) => void;
}) {
  const [scene] = useState(() => createBattleScene(level));
  const [objects, setObjects] = useState(scene.objects);
  const [code, setCode] = useState(STARTER_CODE[level.id]);
  const [status, setStatus] = useState<"idle" | "running" | "success" | "failed" | "lost">("idle");
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [hitStages, setHitStages] = useState<Map<string, number>>(new Map());
  const [destroyed, setDestroyed] = useState<Set<string>>(new Set());
  const [craters, setCraters] = useState<Set<string>>(new Set());
  const [impact, setImpact] = useState<string | null>(null);
  const [spellTrace, setSpellTrace] = useState<SpellTrace | null>(null);
  const [orderIndex, setOrderIndex] = useState(0);
  const [mana, setMana] = useState(level.mana);
  const [score, setScore] = useState(0);
  const [stars, setStars] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const [hintStage, setHintStage] = useState<0 | 1 | 2>(0);
  const [executionMs, setExecutionMs] = useState<number | null>(null);
  const [successfulRun, setSuccessfulRun] = useState<SuccessfulRun | null>(null);
  const [log, setLog] = useState<string[]>(["战场已经生成，可以立即观察坐标并编写法阵。"]);
  const runId = useRef(0);
  const completedRef = useRef(false);
  const objectsRef = useRef(objects);
  const resultRef = useRef<HTMLDivElement>(null);
  const orderedTargets = useMemo(() => objects.filter((object) => object.target).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)), [objects]);
  const objectMap = useMemo(() => new Map(objects.map((object) => [keyOf(object.row, object.col), object])), [objects]);
  const answer = useMemo(() => solutionFor(level, orderedTargets), [level, orderedTargets]);
  const dynamicMission = useMemo(() => missionFor(level, orderedTargets, scene.protectedTarget.name), [level, orderedTargets, scene.protectedTarget.name]);
  const planning = status === "idle" || status === "failed";
  const selectedDifficulty = difficultyById(difficulty);
  const hasMovingEnemies = scene.direction.row !== 0 || scene.direction.col !== 0;
  const movementRule = !hasMovingEnemies
    ? "本关没有移动敌军"
    : selectedDifficulty.intervalMs
      ? `${selectedDifficulty.label} · 每 ${selectedDifficulty.intervalMs / 1000} 秒推进${selectedDifficulty.failureSteps ? `，失败额外推进 ${selectedDifficulty.failureSteps} 格` : ""}`
      : selectedDifficulty.failureSteps
        ? `${selectedDifficulty.label} · 仅运行失败后推进`
        : `${selectedDifficulty.label} · 怪物不会移动`;

  useEffect(() => { objectsRef.current = objects; }, [objects]);

  useEffect(() => {
    if (!planning || !hasMovingEnemies || selectedDifficulty.intervalMs === null) return;
    const timer = window.setInterval(() => {
      if (completedRef.current) return;
      const result = moveEnemies(objectsRef.current, scene, 1);
      if (result.danger) {
        runId.current += 1;
        setStatus("lost");
        setLog((current) => [...current, `敌军突破防线，${scene.protectedTarget.name}受到攻击。`].slice(-10));
        return;
      }
      objectsRef.current = result.objects;
      setObjects(result.objects);
      setLog((current) => [...current, `${selectedDifficulty.label}：敌军按时推进一格，坐标已经更新。`].slice(-10));
    }, selectedDifficulty.intervalMs);
    return () => window.clearInterval(timer);
  }, [hasMovingEnemies, planning, scene, selectedDifficulty.intervalMs, selectedDifficulty.label]);

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

  const advanceEnemiesAfterFailure = () => {
    completedRef.current = false;
    setStatus("failed");
    if (scene.direction.row === 0 && scene.direction.col === 0) {
      return "本关没有移动敌军，可以直接修改代码后重试。";
    }
    if (selectedDifficulty.failureSteps === 0) {
      return `${selectedDifficulty.label}不会因运行失败额外推进；请修改代码后重试。`;
    }
    const result = moveEnemies(objectsRef.current, scene, selectedDifficulty.failureSteps);
    if (result.danger) {
      runId.current += 1;
      setStatus("lost");
      return `本次施法失败后敌军突破防线，${scene.protectedTarget.name}受到攻击。`;
    }
    objectsRef.current = result.objects;
    setObjects(result.objects);
    return `本次施法失败，按${selectedDifficulty.label}规则，敌军推进了 ${result.moved} 格。`;
  };

  const reset = () => {
    runId.current += 1;
    completedRef.current = false;
    objectsRef.current = scene.objects;
    setObjects(scene.objects);
    setRemoved(new Set());
    setHitStages(new Map());
    setDestroyed(new Set());
    setCraters(new Set());
    setImpact(null);
    setSpellTrace(null);
    setOrderIndex(0);
    setMana(level.mana);
    setScore(0);
    setStars(0);
    setExecutionMs(null);
    setSuccessfulRun(null);
    setStatus("idle");
    setLog([`战场和法力已复原。代码运行上限为 ${EXECUTION_LIMIT_MS}ms。`]);
  };

  const animateActions = async (
    actions: Action[],
    runtimeObjects: GameObject[],
    measuredExecutionMs: number,
    replayResult?: Pick<SuccessfulRun, "score" | "stars">,
  ) => {
    const activeRun = runId.current + 1;
    runId.current = activeRun;
    const runtimeTargets = runtimeObjects.filter((object) => object.target).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const runtimeObjectMap = new Map(runtimeObjects.map((object) => [keyOf(object.row, object.col), object]));
    const localRemoved = new Set<string>();
    const localHitStages = new Map<string, number>();
    const localDestroyed = new Set<string>();
    const localCraters = new Set<string>();
    let localOrder = 0;
    let invalidHits = 0;
    let remainingMana = level.mana;
    const messages = [replayResult ? `开始回放上次通关的 ${actions.length} 次法术。` : `已生成 ${actions.length} 次法术，开始按代码顺序释放。`];
    // Freeze timed movement immediately, including the brief render window before
    // React tears down the planning interval. It stays frozen after a clear.
    completedRef.current = true;
    setRemoved(new Set());
    setHitStages(new Map());
    setDestroyed(new Set());
    setCraters(new Set());
    setImpact(null);
    setSpellTrace(null);
    setOrderIndex(0);
    setMana(level.mana);
    setStatus("running");
    if (!replayResult) {
      setScore(0);
      setStars(0);
    }
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
      setSpellTrace({
        ...action,
        id: activeRun * 1000 + index,
        fromRow: scene.caster.row,
        fromCol: scene.caster.col,
      });
      await sleep(PROJECTILE_DELAY_MS);
      if (runId.current !== activeRun) return;
      setImpact(actionKey);
      const object = runtimeObjectMap.get(actionKey);
      const inBounds = action.row >= 0 && action.row < 15 && action.col >= 0 && action.col < 15;
      const expected = runtimeTargets[localOrder];
      const orderCorrect = !level.strictOrder || (expected && expected.row === action.row && expected.col === action.col);
      const currentPhase = localHitStages.get(actionKey) ?? 0;
      const phases = object?.target ? requiredSpellsFor(object, level) : [level.spell];
      const requiredSpell = phases[currentPhase] ?? phases.at(-1)!;
      const spellCorrect = action.spell === requiredSpell;

      if (object?.target && !localRemoved.has(actionKey) && spellCorrect && orderCorrect) {
        const nextPhase = currentPhase + 1;
        if (nextPhase >= phases.length) {
          localHitStages.delete(actionKey);
          localRemoved.add(actionKey);
          localOrder += 1;
          setRemoved(new Set(localRemoved));
          setOrderIndex(localOrder);
          messages.push(`第 ${action.line} 行 → ${action.spell}(${action.row}, ${action.col})：完成破坏 ${object.name}`);
        } else {
          localHitStages.set(actionKey, nextPhase);
          setHitStages(new Map(localHitStages));
          messages.push(`第 ${action.line} 行 → ${action.spell}(${action.row}, ${action.col})：${object.name} 第 ${nextPhase}/${phases.length} 段破防`);
        }
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
        const reason = !inBounds ? "坐标越界" : object?.target && !spellCorrect ? `元素错误，当前需要 ${requiredSpell}()` : object?.target && !orderCorrect ? "不是当前可攻击部位，顺序错误" : "打在空地上";
        messages.push(`${action.spell}(${action.row}, ${action.col})：${reason}`);
        playTone(action.spell, false);
      }
      setLog([...messages]);
      await sleep(ACTION_DELAY_MS - PROJECTILE_DELAY_MS);
      setImpact(null);
      setSpellTrace(null);
    }

    if (runId.current !== activeRun) return;
    const cleared = localRemoved.size === runtimeTargets.length;
    const perfect = cleared && invalidHits === 0 && actions.length <= level.mana;
    const calculatedScore = Math.max(0, Math.round((localRemoved.size / runtimeTargets.length) * 2100 + remainingMana * 30 - invalidHits * 240 + (perfect ? 900 : 0)));
    const finalScore = replayResult?.score ?? calculatedScore;
    const finalStars = replayResult?.stars ?? (perfect ? 3 : cleared ? 2 : localRemoved.size ? 1 : 0);
    setScore(finalScore);
    setStars(finalStars);
    if (cleared) {
      completedRef.current = true;
      setStatus("success");
      messages.push(replayResult
        ? `回放完成：已按原顺序重现 ${actions.length} 次施法，成绩没有重复记录。`
        : perfect
          ? `法阵完成：运行 ${measuredExecutionMs.toFixed(3)}ms，零误伤，${actions.length} 次施法全部有效。`
          : `目标已经全部清除；本次有 ${invalidHits} 次无效命中，获得 ${finalStars} 星。战场保持通关状态。`);
      if (!replayResult && soundOn) {
        const victory = new Audio("/assets/audio/bookOpen.ogg");
        victory.volume = 0.34;
        void victory.play().catch(() => undefined);
      }
      if (!replayResult) {
        setSuccessfulRun({
          actions: actions.map((action) => ({ ...action })),
          objects: cloneObjects(runtimeObjects),
          executionMs: measuredExecutionMs,
          score: finalScore,
          stars: finalStars,
        });
        onComplete(level.id, finalScore);
      }
    } else {
      messages.push(`还剩 ${runtimeTargets.length - localRemoved.size} 个目标。检查循环边界、坐标和施法顺序。`);
      setRemoved(new Set());
      setHitStages(new Map());
      setDestroyed(new Set());
      setOrderIndex(0);
      messages.push(advanceEnemiesAfterFailure());
    }
    setLog([...messages]);
    setTimeout(() => resultRef.current?.focus(), 30);
  };

  const runCode = async () => {
    const runtimeObjects = objectsRef.current;
    let actions: Action[];
    const executionStartedAt = performance.now();
    try {
      actions = executeProgram(code, { ...level, objects: runtimeObjects });
    } catch (error) {
      setExecutionMs(performance.now() - executionStartedAt);
      setStars(0);
      const advanceMessage = advanceEnemiesAfterFailure();
      setLog([`语法法阵没有成形：${error instanceof Error ? error.message : "未知错误"}`, advanceMessage]);
      return;
    }
    const measuredExecutionMs = performance.now() - executionStartedAt;
    setExecutionMs(measuredExecutionMs);
    if (measuredExecutionMs > EXECUTION_LIMIT_MS) {
      setScore(0);
      setStars(0);
      const advanceMessage = advanceEnemiesAfterFailure();
      setLog([`运行耗时 ${measuredExecutionMs.toFixed(3)}ms，超过 ${EXECUTION_LIMIT_MS}ms 上限，施法失败。请精简循环。`, advanceMessage]);
      return;
    }
    if (!actions.length) {
      const advanceMessage = advanceEnemiesAfterFailure();
      setLog(["代码运行了，但没有释放任何法术。", advanceMessage]);
      return;
    }
    await animateActions(actions, runtimeObjects, measuredExecutionMs);
  };

  const replay = async () => {
    if (!successfulRun) return;
    const replayObjects = cloneObjects(successfulRun.objects);
    completedRef.current = true;
    objectsRef.current = replayObjects;
    setObjects(replayObjects);
    setExecutionMs(successfulRun.executionMs);
    await animateActions(
      successfulRun.actions.map((action) => ({ ...action })),
      replayObjects,
      successfulRun.executionMs,
      successfulRun,
    );
  };

  const handleEditorKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      if (status === "success") void replay();
      else if (planning) void runCode();
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const target = event.currentTarget;
      const before = code.slice(0, target.selectionStart);
      const currentLine = before.slice(before.lastIndexOf("\n") + 1);
      const currentIndent = currentLine.match(/^\s*/)?.[0] ?? "";
      const blockIndent = currentLine.trimEnd().endsWith(":") ? "    " : "";
      const insertion = `\n${currentIndent}${blockIndent}`;
      const next = `${before}${insertion}${code.slice(target.selectionEnd)}`;
      const cursor = before.length + insertion.length;
      setCode(next);
      requestAnimationFrame(() => { target.selectionStart = cursor; target.selectionEnd = cursor; });
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
    const waterSource = orderedTargets[0];
    if (level.terrain === "river" && waterSource && row === Math.min(14, waterSource.row + 1) && col === waterSource.col) return "water";
    if (level.terrain === "grave" && (row + col) % 11 === 0) return "grave";
    if (level.terrain === "cave" && (row + col) % 9 === 0) return "stone";
    if (level.terrain === "desert") return "sand";
    return "grass";
  };
  const spellTraceStyle: CSSProperties | undefined = spellTrace
    ? {
        left: `${((spellTrace.fromCol + 0.5) / 15) * 100}%`,
        top: `${((spellTrace.fromRow + 0.5) / 15) * 100}%`,
        width: `${(Math.hypot(spellTrace.col - spellTrace.fromCol, spellTrace.row - spellTrace.fromRow) / 15) * 100}%`,
        transform: `rotate(${Math.atan2(spellTrace.row - spellTrace.fromRow, spellTrace.col - spellTrace.fromCol) * 180 / Math.PI}deg)`,
      }
    : undefined;
  const axisNumbers = Array.from({ length: 15 }, (_, index) => index);

  return (
    <main className={`battle-shell level-${level.id} spell-${level.spell}`}>
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
        <div className="spell-badge"><span>{level.availableSpells ? `${level.availableSpells.length}X` : level.spell.slice(0, 2).toUpperCase()}</span><div><small>本关法术</small><strong>{level.spellName}</strong><code>{(level.availableSpells ?? [level.spell]).map((spell) => `${spell}(i,j)`).join(" / ")}</code></div></div>
        <div className="mission-copy"><small>{movementRule}</small><p>{dynamicMission}</p></div>
        <div className="mission-metrics">
          <div className={`runtime-budget ${executionMs !== null && executionMs > EXECUTION_LIMIT_MS ? "is-danger" : ""}`}><small>代码运行</small><strong>{executionMs === null ? "—" : executionMs.toFixed(2)}<em> / {EXECUTION_LIMIT_MS}ms</em></strong></div>
          <div className="target-progress"><small>目标</small><strong>{removed.size}<em> / {orderedTargets.length}</em></strong><div><span style={{ width: `${(removed.size / orderedTargets.length) * 100}%` }} /></div></div>
        </div>
      </section>

      <section className="battle-layout">
        <div className="arena-panel">
          <div className="panel-heading">
            <div><span className="live-dot" /> 战术地图 <small>15 × 15 · ROW, COL</small></div>
            <div className="map-coordinates">外圈坐标 · 行 / 列均为 0–14</div>
          </div>
          <div className="arena-frame">
            <span className="axis-corner axis-corner-tl">行\列</span>
            <ol className="arena-axis axis-cols axis-top" aria-hidden>{axisNumbers.map((value) => <li key={value}>{value}</li>)}</ol>
            <span className="axis-corner axis-corner-tr" aria-hidden />
            <ol className="arena-axis axis-rows axis-left" aria-hidden>{axisNumbers.map((value) => <li key={value}>{value}</li>)}</ol>
            <div className={`arena terrain-${level.terrain} status-${status}`}>
              <p className="sr-only">地图行列坐标均从 0 到 14。上下两侧显示列坐标，左右两侧显示行坐标。</p>
              <div className="battle-grid" role="grid" aria-label="15乘15战术地图">
              {Array.from({ length: 225 }, (_, index) => {
                const row = Math.floor(index / 15);
                const col = index % 15;
                const cellKey = keyOf(row, col);
                const object = objectMap.get(cellKey);
                const isRemoved = removed.has(cellKey);
                const isDestroyed = destroyed.has(cellKey);
                const hitStage = hitStages.get(cellKey) ?? 0;
                const isCurrentHead = level.strictOrder && object?.target && object.order === orderIndex;
                const classes = [
                  "battle-cell",
                  `tile-${terrainAt(row, col)}`,
                  impact === cellKey ? "is-impact" : "",
                  isRemoved ? "is-removed" : "",
                  isDestroyed ? "is-destroyed" : "",
                  craters.has(cellKey) ? "has-crater" : "",
                  hitStage > 0 ? "is-damaged" : "",
                  isCurrentHead ? "is-current-target" : "",
                ].filter(Boolean).join(" ");
                return (
                  <div className={classes} role="gridcell" key={cellKey} aria-label={`第 ${row} 行第 ${col} 列：${object?.name ?? "空地"}`}>
                    {object && !isRemoved && !isDestroyed && (
                      <span
                        className={`game-object kind-${object.kind} ${object.target ? `is-target entry-${level.entry}` : ""} ${keyOf(object.row, object.col) === keyOf(scene.protectedTarget.row, scene.protectedTarget.col) ? "is-protected" : ""} ${keyOf(object.row, object.col) === keyOf(scene.caster.row, scene.caster.col) ? "is-caster" : ""}`}
                        style={{ animationDelay: `${(object.order ?? 0) * 55}ms`, backgroundImage: `url(${object.sprite})` }}
                      >
                        {isCurrentHead && <i className="head-marker">▼</i>}
                      </span>
                    )}
                    {isRemoved && <span className="vanish-particles" aria-hidden />}
                    {isDestroyed && <span className={`debris debris-${object?.kind ?? "rock"}`} aria-hidden />}
                    {craters.has(cellKey) && <span className="crater" aria-hidden>·</span>}
                    {impact === cellKey && <span className="spell-impact" aria-hidden />}
                  </div>
                );
              })}
              </div>
              {spellTrace && (
                <span
                  key={spellTrace.id}
                  className={`spell-trace trace-${spellTrace.spell}`}
                  style={spellTraceStyle}
                  aria-hidden
                ><i /></span>
              )}
            </div>
            <ol className="arena-axis axis-rows axis-right" aria-hidden>{axisNumbers.map((value) => <li key={value}>{value}</li>)}</ol>
            <span className="axis-corner axis-corner-bl" aria-hidden />
            <ol className="arena-axis axis-cols axis-bottom" aria-hidden>{axisNumbers.map((value) => <li key={value}>{value}</li>)}</ol>
            <span className="axis-corner axis-corner-br" aria-hidden />
          </div>
        </div>

        <div className="code-panel">
          <div className="editor-tabs">
            <div className="file-tab"><span>PY</span> spell.py <i>●</i></div>
            <button className="hint-button" onClick={() => setHintStage((value) => (value === 0 ? 1 : value === 1 ? 2 : 0))} aria-expanded={hintStage > 0}>
              ? {hintStage === 0 ? "查看提示" : hintStage === 1 ? "显示参考答案" : "收起提示"}
            </button>
          </div>
          {hintStage > 0 && (
            <div className={`hint-card hint-stage-${hintStage}`}>
              <span>?</span>
              <div>
                <p>{hintStage === 1 ? level.hint : `这是按当前坐标生成的参考答案。${movementRule}；坐标变化时答案会同步更新。`}</p>
                {hintStage === 2 && <pre>{answer}</pre>}
              </div>
              {hintStage === 2 && <button onClick={() => setCode(answer)}>填入编辑器</button>}
            </div>
          )}
          <div className="editor-wrap">
            <div className="line-numbers" aria-hidden>{Array.from({ length: lineCount }, (_, index) => <span key={index}>{index + 1}</span>)}</div>
            <textarea
              value={code}
              onChange={(event) => setCode(event.target.value)}
              onKeyDown={handleEditorKeyDown}
              spellCheck={false}
              aria-label="Python 代码编辑器"
              disabled={status === "running" || status === "success" || status === "lost"}
            />
          </div>
          <div className="editor-actions">
            <button className="secondary-button" onClick={() => { setCode(STARTER_CODE[level.id]); reset(); }}>↺ 还原</button>
            <button
              className={`run-button ${status === "success" ? "is-replay" : ""}`}
              onClick={status === "success" ? replay : runCode}
              disabled={status === "running" || status === "lost"}
            >
              <span>{status === "running" ? "··" : status === "success" ? "↻" : "▶"}</span>
              {status === "running" ? "施法中" : status === "success" ? "回放施法" : status === "lost" ? "任务失败" : "运行代码"}
              <kbd>{status === "success" ? "REPLAY" : "⌘↵"}</kbd>
            </button>
          </div>
          <div className="console-panel" ref={resultRef} tabIndex={-1} aria-live="polite">
            <div className="console-head"><span><i /> 魔法控制台</span><strong className={`result-${status}`}>{status === "success" ? `${score} PTS` : status === "lost" ? "DEFENSE LOST" : status === "failed" ? `${score} PTS · CHECK` : "READY"}</strong></div>
            <div className="console-lines">
              {log.slice(-4).map((message, index) => <p key={`${message}-${index}`}><span>{index === log.slice(-4).length - 1 ? "›" : "·"}</span>{message}</p>)}
            </div>
            {status === "success" && <button className="next-button" onClick={onBack}>收下 {stars} 颗星，返回世界地图 →</button>}
          </div>
          <div className="safety-note"><span>盾</span> 本地安全模式：可使用 range、列表/元组、解包、索引、for、while、if 与常用序列函数；最终只按施法结果判定。</div>
        </div>
      </section>
    </main>
  );
}

export default function Home() {
  const [activeChallenge, setActiveChallenge] = useState<{ level: Level; difficulty: DifficultyId } | null>(null);
  const [records, setRecords] = useState<ChallengeRecords>({});
  const [levelDifficulties, setLevelDifficulties] = useState<LevelDifficulties>({});

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const oldDifficulty = localStorage.getItem("codecaster-difficulty");
        const migratedDifficulty = DIFFICULTIES.some((item) => item.id === oldDifficulty) ? oldDifficulty as DifficultyId : DEFAULT_DIFFICULTY;
        const savedDifficulties = localStorage.getItem("codecaster-level-difficulties-v2");
        if (savedDifficulties) {
          setLevelDifficulties(JSON.parse(savedDifficulties) as LevelDifficulties);
        } else {
          setLevelDifficulties(Object.fromEntries(LEVELS.map((level) => [level.id, migratedDifficulty])));
        }

        const savedRecords = localStorage.getItem("codecaster-challenge-records-v2");
        if (savedRecords) {
          setRecords(JSON.parse(savedRecords) as ChallengeRecords);
        } else {
          const legacy = localStorage.getItem("codecaster-progress");
          if (legacy) {
            const parsed = JSON.parse(legacy) as { completed?: number[]; bestScores?: Record<number, number> };
            const migrated: ChallengeRecords = {};
            for (const levelId of parsed.completed ?? []) {
              migrated[levelId] = {
                [migratedDifficulty]: {
                  score: parsed.bestScores?.[levelId] ?? 0,
                  completedAt: new Date().toISOString(),
                },
              };
            }
            setRecords(migrated);
            localStorage.setItem("codecaster-challenge-records-v2", JSON.stringify(migrated));
          }
        }
      } catch { /* local progress is optional */ }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const completeLevel = (id: number, difficulty: DifficultyId, score: number) => {
    setRecords((current) => {
      const previous = current[id]?.[difficulty];
      const next: ChallengeRecords = {
        ...current,
        [id]: {
          ...current[id],
          [difficulty]: {
            score: Math.max(previous?.score ?? 0, score),
            completedAt: previous?.completedAt ?? new Date().toISOString(),
          },
        },
      };
      try { localStorage.setItem("codecaster-challenge-records-v2", JSON.stringify(next)); } catch { /* local progress is optional */ }
      return next;
    });
  };

  const changeLevelDifficulty = (levelId: number, nextDifficulty: DifficultyId) => {
    setLevelDifficulties((current) => {
      const next = { ...current, [levelId]: nextDifficulty };
      try { localStorage.setItem("codecaster-level-difficulties-v2", JSON.stringify(next)); } catch { /* local preference is optional */ }
      return next;
    });
  };

  return activeChallenge ? (
    <Battle
      key={`${activeChallenge.level.id}-${activeChallenge.difficulty}`}
      level={activeChallenge.level}
      difficulty={activeChallenge.difficulty}
      onBack={() => setActiveChallenge(null)}
      onComplete={(id, score) => completeLevel(id, activeChallenge.difficulty, score)}
    />
  ) : (
    <WorldMap
      records={records}
      levelDifficulties={levelDifficulties}
      onLevelDifficultyChange={changeLevelDifficulty}
      onSelect={(level, difficulty) => setActiveChallenge({ level, difficulty })}
    />
  );
}
