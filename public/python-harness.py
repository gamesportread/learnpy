import ast
import contextlib
import io
import json
import sys
import time

_actions = []

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


def _cast(spell, row, col, line):
    if type(row) is not int or type(col) is not int:
        raise TypeError(f"第 {line} 行：法术坐标必须是整数")
    if len(_actions) >= 225:
        raise RuntimeError("法术超过 225 次，循环可能没有正确结束")
    _actions.append({"spell": spell, "row": row, "col": col, "line": line})


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
