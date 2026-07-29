import ast
import contextlib
import io
import json
import sys
import time

_scenario = json.loads(__scenario_json)
_rows = _scenario["rows"]
_cols = _scenario["cols"]
_max_ticks = _scenario["maxTicks"]
_kill_goal = _scenario["killGoal"]
_base_col = _scenario["baseCol"]
_warrior = dict(_scenario["warrior"])
_monsters = [dict(monster) for monster in _scenario["initialMonsters"]]
_spawns = [dict(monster) for monster in _scenario["spawns"]]
_tick = 0
_kills = 0
_outcome = "running"
_frames = []

_allowed_modules = {
    "bisect",
    "collections",
    "functools",
    "heapq",
    "itertools",
    "math",
    "operator",
    "statistics",
}
_blocked_calls = {
    "__import__",
    "breakpoint",
    "compile",
    "delattr",
    "dir",
    "eval",
    "exec",
    "getattr",
    "globals",
    "help",
    "input",
    "locals",
    "open",
    "setattr",
    "vars",
}
_blocked_names = {
    "__builtins__",
    "__loader__",
    "__spec__",
    "js",
    "micropip",
    "pyodide",
}
_directions = {
    "UP": (-1, 0),
    "DOWN": (1, 0),
    "LEFT": (0, -1),
    "RIGHT": (0, 1),
    "WAIT": (0, 0),
}


def _validate(tree):
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                module = alias.name.split(".", 1)[0]
                if module not in _allowed_modules:
                    raise ImportError(f"战士控制台不开放模块 {alias.name!r}")
        if isinstance(node, ast.ImportFrom):
            module = (node.module or "").split(".", 1)[0]
            if node.level or module not in _allowed_modules:
                raise ImportError(f"战士控制台不开放模块 {node.module!r}")
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
            if node.func.id in _blocked_calls:
                raise PermissionError(f"战士控制台不开放 {node.func.id}()")
        if isinstance(node, ast.Attribute) and node.attr.startswith("__"):
            raise PermissionError("战士控制台不开放双下划线属性")
        if isinstance(node, ast.Name) and node.id in _blocked_names:
            raise PermissionError(f"战士控制台不开放名称 {node.id!r}")


def _snapshot(direction, events):
    return {
        "tick": _tick,
        "warrior": dict(_warrior),
        "monsters": [dict(monster) for monster in _monsters],
        "kills": _kills,
        "direction": direction,
        "events": list(events),
        "outcome": _outcome,
    }


def _distance(a, b):
    return abs(a["row"] - b["row"]) + abs(a["col"] - b["col"])


def _attack_nearest(events):
    global _kills
    adjacent = [monster for monster in _monsters if _distance(_warrior, monster) <= 1]
    if not adjacent:
        return False
    target = min(adjacent, key=lambda monster: (monster["col"], monster["id"]))
    _monsters.remove(target)
    _kills += 1
    events.append(f"战士自动攻击 #{target['id']}，击杀成功")
    return True


def battle_running():
    return _outcome == "running" and _tick < _max_ticks


def warrior():
    return dict(_warrior)


def monsters():
    return [dict(monster) for monster in _monsters]


def step(direction):
    global _tick, _outcome
    if not battle_running():
        raise RuntimeError("模拟已经结束，不能继续 step()")
    if type(direction) is not str:
        raise TypeError(f"第 {sys._getframe(1).f_lineno} 行：step() 需要方向字符串")
    normalized = direction.upper()
    if normalized not in _directions:
        raise ValueError(
            f"第 {sys._getframe(1).f_lineno} 行：方向必须是 UP、DOWN、LEFT、RIGHT 或 WAIT"
        )

    _tick += 1
    events = []
    arriving = [monster for monster in _spawns if monster["tick"] == _tick]
    for monster in arriving:
        spawned = {key: monster[key] for key in ("id", "row", "col")}
        _monsters.append(spawned)
        events.append(f"东侧裂隙出现怪物 #{spawned['id']}")

    attacked = _attack_nearest(events)
    if not attacked:
        dr, dc = _directions[normalized]
        next_row = _warrior["row"] + dr
        next_col = _warrior["col"] + dc
        if 0 <= next_row < _rows and 0 <= next_col < _cols:
            _warrior["row"] = next_row
            _warrior["col"] = next_col
            events.append(
                "战士原地警戒"
                if normalized == "WAIT"
                else f"战士向 {normalized} 移动一格"
            )
        else:
            events.append("战士撞到地图边界，原地停留")
        _attack_nearest(events)

    for monster in _monsters:
        monster["col"] -= 1
    if _monsters:
        events.append(f"{len(_monsters)} 只怪物向营地移动一格")

    if any(monster["col"] <= _base_col for monster in _monsters):
        _outcome = "lost"
        events.append("怪物突破西侧营地，防线失守")
    elif _tick >= _max_ticks:
        if _kills >= _kill_goal:
            _outcome = "won"
            events.append(f"守满 {_max_ticks} 秒，先锋试炼完成")
        else:
            _outcome = "lost"
            events.append(f"只击杀 {_kills} 只怪物，未达到 {_kill_goal} 只的目标")

    _frames.append(_snapshot(normalized, events))


_frames.append(_snapshot("WAIT", ["战场已就绪；第一名战士等待命令"]))
_tree = ast.parse(__source, filename="warrior.py", mode="exec")
_validate(_tree)
_user_globals = {
    "__builtins__": __builtins__,
    "__name__": "__main__",
    "battle_running": battle_running,
    "warrior": warrior,
    "monsters": monsters,
    "step": step,
}
_stdout = io.StringIO()
_started = time.perf_counter()
with contextlib.redirect_stdout(_stdout):
    exec(compile(_tree, "warrior.py", "exec"), _user_globals, _user_globals)
_execution_ms = (time.perf_counter() - _started) * 1000

if _outcome == "running":
    _outcome = "incomplete"
    _frames.append(
        _snapshot(
            "WAIT",
            [f"程序在第 {_tick} 秒提前结束；需要用循环持续到 battle_running() 为 False"],
        )
    )

json.dumps(
    {
        "frames": _frames,
        "outcome": _outcome,
        "stdout": _stdout.getvalue(),
        "executionMs": _execution_ms,
    },
    ensure_ascii=False,
)
