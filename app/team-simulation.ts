import type { SimulationFrame, SimulationScenario } from "./native-python";

export const FRONTIER_SCENARIO: SimulationScenario = {
  rows: 14,
  cols: 24,
  maxTicks: 24,
  killGoal: 5,
  baseCol: 1,
  warrior: { id: 101, row: 6, col: 5 },
  initialMonsters: [
    { id: 1, row: 6, col: 12 },
    { id: 2, row: 6, col: 18 },
  ],
  spawns: [
    { tick: 4, id: 3, row: 6, col: 23 },
    { tick: 8, id: 4, row: 6, col: 16 },
    { tick: 12, id: 5, row: 6, col: 23 },
    { tick: 16, id: 6, row: 6, col: 15 },
    { tick: 20, id: 7, row: 6, col: 23 },
  ],
};

export const FRONTIER_STARTER_CODE = `# 每次 step() 都会让世界前进 1 秒
# 方向可写：UP / DOWN / LEFT / RIGHT / WAIT
while battle_running():
    me = warrior()
    enemies = monsters()

    if len(enemies) == 0:
        step("WAIT")
        continue

    target = enemies[0]

    # TODO 1：用 for 找出 col 最小、最靠近营地的怪物
    for enemy in enemies:
        pass

    # TODO 2：比较 target 与 me 的行列，决定移动方向
    step("WAIT")`;

export const FRONTIER_REFERENCE_CODE = `while battle_running():
    me = warrior()
    enemies = monsters()

    if len(enemies) == 0:
        step("WAIT")
        continue

    target = enemies[0]
    for enemy in enemies:
        if enemy["col"] < target["col"]:
            target = enemy

    if target["row"] < me["row"]:
        step("UP")
    elif target["row"] > me["row"]:
        step("DOWN")
    elif target["col"] < me["col"]:
        step("LEFT")
    elif target["col"] > me["col"]:
        step("RIGHT")
    else:
        step("WAIT")`;

export const INITIAL_FRONTIER_FRAME: SimulationFrame = {
  tick: 0,
  warrior: { ...FRONTIER_SCENARIO.warrior },
  monsters: FRONTIER_SCENARIO.initialMonsters.map((monster) => ({ ...monster })),
  kills: 0,
  direction: "WAIT",
  events: ["战场已就绪；第一名战士等待命令"],
  outcome: "running",
};

export const FRONTIER_DECORATIONS = [
  [1, 2, "/assets/v2/town/oak-tall.png", "古树"],
  [2, 5, "/assets/v2/town/pine.png", "松树"],
  [2, 8, "/assets/v2/town/shrubs.png", "灌木"],
  [1, 16, "/assets/v2/dungeon/rock-large.png", "北岭巨石"],
  [3, 19, "/assets/v2/town/tree-amber.png", "金叶树"],
  [4, 3, "/assets/v2/town/fence.png", "营地木栅"],
  [4, 9, "/assets/v2/town/oak.png", "橡树"],
  [4, 14, "/assets/v2/dungeon/rock-small.png", "路边碎岩"],
  [5, 3, "/assets/v2/town/fence.png", "营地木栅"],
  [5, 20, "/assets/v2/dungeon/torch.png", "前线火炬"],
  [7, 3, "/assets/v2/town/fence.png", "营地木栅"],
  [7, 10, "/assets/v2/town/sign.png", "前线路牌"],
  [7, 18, "/assets/v2/town/shrub-tall.png", "高灌木"],
  [8, 3, "/assets/v2/town/fence.png", "营地木栅"],
  [8, 6, "/assets/v2/town/logs.png", "木料"],
  [8, 14, "/assets/v2/town/pine-tall.png", "古松"],
  [9, 2, "/assets/v2/town/mushrooms.png", "蘑菇簇"],
  [9, 11, "/assets/v2/dungeon/rock-small.png", "碎岩"],
  [9, 21, "/assets/v2/town/oak-tall.png", "东境古树"],
  [10, 5, "/assets/v2/town/bush-center.png", "灌木"],
  [10, 16, "/assets/v2/town/pine.png", "松树"],
  [11, 3, "/assets/v2/town/log.png", "倒木"],
  [11, 9, "/assets/v2/town/tree-amber.png", "金叶树"],
  [12, 14, "/assets/v2/dungeon/rock-large.png", "南岭巨石"],
  [12, 21, "/assets/v2/town/pine-tall.png", "古松"],
] as const;
