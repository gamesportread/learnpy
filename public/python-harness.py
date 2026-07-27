import ast
import contextlib
import io
import json
import sys
import time

_targets = sorted(json.loads(__targets_json), key=lambda item: item.get("order", 0))
_default_spell = __default_spell
_actions = []
_front_index = 0
_phase_index = 0

_allowed_modules = {
    "bisect",
    "collections",
    "decimal",
    "fractions",
    "functools",
    "heapq",
    "itertools",
    "math",
    "operator",
    "random",
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


def _validate(tree):
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                module = alias.name.split(".", 1)[0]
                if module not in _allowed_modules:
                    raise ImportError(f"教学法阵不开放模块 {alias.name!r}")
        if isinstance(node, ast.ImportFrom):
            module = (node.module or "").split(".", 1)[0]
            if node.level or module not in _allowed_modules:
                raise ImportError(f"教学法阵不开放模块 {node.module!r}")
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
            if node.func.id in _blocked_calls:
                raise PermissionError(f"教学法阵不开放 {node.func.id}()")
        if isinstance(node, ast.Attribute) and node.attr.startswith("__"):
            raise PermissionError("教学法阵不开放双下划线属性")
        if isinstance(node, ast.Name) and node.id in _blocked_names:
            raise PermissionError(f"教学法阵不开放名称 {node.id!r}")


def _required_spells(target):
    return target.get("requiredSpells") or [_default_spell]


def _cast(spell, row, col, line):
    global _front_index, _phase_index
    if type(row) is not int or type(col) is not int:
        raise TypeError(f"第 {line} 行：法术坐标必须是整数")
    if len(_actions) >= 225:
        raise RuntimeError("法术超过 225 次，循环可能没有正确结束")
    _actions.append({"spell": spell, "row": row, "col": col, "line": line})
    if _front_index >= len(_targets):
        return
    target = _targets[_front_index]
    required = _required_spells(target)[_phase_index]
    if target["row"] != row or target["col"] != col or required != spell:
        return
    _phase_index += 1
    if _phase_index >= len(_required_spells(target)):
        _front_index += 1
        _phase_index = 0


def ice(row, col):
    _cast("ice", row, col, sys._getframe(1).f_lineno)


def wind(row, col):
    _cast("wind", row, col, sys._getframe(1).f_lineno)


def sound(row, col):
    _cast("sound", row, col, sys._getframe(1).f_lineno)


def metal(row, col):
    _cast("metal", row, col, sys._getframe(1).f_lineno)


def stone(row, col):
    _cast("stone", row, col, sys._getframe(1).f_lineno)


def fire(row, col):
    _cast("fire", row, col, sys._getframe(1).f_lineno)


def earth(row, col):
    _cast("earth", row, col, sys._getframe(1).f_lineno)


def village_has_water():
    return _front_index >= len(_targets)


def water_front():
    if not _targets:
        return -1, -1
    target = _targets[min(_front_index, len(_targets) - 1)]
    return target["row"], target["col"]


def zigzag_col(row, step):
    first = _targets[0]
    columns = [target["col"] for target in _targets]
    return min(columns) + step if row % 2 == first["row"] % 2 else max(columns) - step


def golem_layers():
    return max(target.get("layer", 0) for target in _targets) + 1


def shell_size(layer):
    return sum(target.get("layer") == layer for target in _targets)


def _golem_part(layer, slot):
    for target in _targets:
        if target.get("layer") == layer and target.get("slot") == slot:
            return target
    raise ValueError(f"找不到第 {layer} 层第 {slot} 块岩甲")


def golem_row(layer, slot):
    return _golem_part(layer, slot)["row"]


def golem_col(layer, slot):
    return _golem_part(layer, slot)["col"]


def rock_top():
    return min(target["row"] for target in _targets)


def rock_bottom():
    return max(target["row"] for target in _targets)


def rock_left(row):
    columns = [target["col"] for target in _targets if target["row"] == row]
    if not columns:
        raise ValueError(f"找不到第 {row} 行的岩体")
    return min(columns)


def rock_right(row):
    columns = [target["col"] for target in _targets if target["row"] == row]
    if not columns:
        raise ValueError(f"找不到第 {row} 行的岩体")
    return max(columns)


def rock_has(row, col):
    return any(target["row"] == row and target["col"] == col for target in _targets)


_tree = ast.parse(__source, filename="spell.py", mode="exec")
_validate(_tree)
_user_globals = {
    "__builtins__": __builtins__,
    "__name__": "__main__",
    "ice": ice,
    "wind": wind,
    "sound": sound,
    "metal": metal,
    "stone": stone,
    "fire": fire,
    "earth": earth,
    "village_has_water": village_has_water,
    "water_front": water_front,
    "zigzag_col": zigzag_col,
    "golem_layers": golem_layers,
    "shell_size": shell_size,
    "golem_row": golem_row,
    "golem_col": golem_col,
    "rock_top": rock_top,
    "rock_bottom": rock_bottom,
    "rock_left": rock_left,
    "rock_right": rock_right,
    "rock_has": rock_has,
}
_stdout = io.StringIO()
_started = time.perf_counter()
with contextlib.redirect_stdout(_stdout):
    exec(compile(_tree, "spell.py", "exec"), _user_globals, _user_globals)
_execution_ms = (time.perf_counter() - _started) * 1000
json.dumps(
    {
        "actions": _actions,
        "stdout": _stdout.getvalue(),
        "executionMs": _execution_ms,
    },
    ensure_ascii=False,
)
