import { loadPyodide } from "/pyodide/pyodide.mjs";

const [pyodide, harness] = await Promise.all([
  loadPyodide({ indexURL: "/pyodide/" }),
  fetch("/python-harness.py").then((response) => {
    if (!response.ok) throw new Error("无法加载 Python 游戏桥接代码");
    return response.text();
  }),
]);

self.postMessage({ type: "ready" });

self.addEventListener("message", async (event) => {
  const message = event.data;
  if (message?.type !== "run") return;
  const globals = pyodide.globals.get("dict")();
  try {
    globals.set("__source", message.source);
    globals.set("__targets_json", JSON.stringify(message.targets));
    globals.set("__default_spell", message.defaultSpell);
    const resultJson = await pyodide.runPythonAsync(harness, { globals });
    const result = JSON.parse(resultJson);
    self.postMessage({ type: "result", id: message.id, result });
  } catch (error) {
    self.postMessage({
      type: "error",
      id: message.id,
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    globals.destroy();
  }
});
