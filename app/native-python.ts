export type NativePythonAction = {
  spell: string;
  row: number;
  col: number;
  line: number;
};

export type NativePythonTarget = {
  row: number;
  col: number;
  order?: number;
  requiredSpells?: string[];
  layer?: number;
  slot?: number;
};

export type NativePythonResult = {
  actions: NativePythonAction[];
  stdout: string;
  executionMs: number;
};

type WorkerReply =
  | { type: "ready" }
  | { type: "result"; id: number; result: NativePythonResult }
  | { type: "error"; id: number; error: string };

type PendingRequest = {
  resolve: (result: NativePythonResult) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

const LOAD_TIMEOUT_MS = 30_000;
const EXECUTION_TIMEOUT_MS = 2_000;

let worker: Worker | null = null;
let readyPromise: Promise<void> | null = null;
let readyResolve: (() => void) | null = null;
let readyReject: ((error: Error) => void) | null = null;
let nextRequestId = 1;
const pending = new Map<number, PendingRequest>();

function disposeWorker(reason?: Error) {
  worker?.terminate();
  worker = null;
  readyPromise = null;
  readyResolve = null;
  readyReject = null;
  for (const request of pending.values()) {
    clearTimeout(request.timer);
    request.reject(reason ?? new Error("Python 运行时已重置"));
  }
  pending.clear();
}

function ensureWorker() {
  if (worker && readyPromise) return readyPromise;
  if (typeof window === "undefined") return Promise.reject(new Error("Python 运行时只能在浏览器中启动"));

  worker = new Worker("/python-worker.js", { type: "module", name: "codecaster-python" });
  readyPromise = new Promise<void>((resolve, reject) => {
    readyResolve = resolve;
    readyReject = reject;
    const loadTimer = setTimeout(() => {
      const error = new Error("Python 运行时加载超时，请刷新页面后重试");
      reject(error);
      disposeWorker(error);
    }, LOAD_TIMEOUT_MS);

    const handleReady = () => {
      clearTimeout(loadTimer);
      resolve();
    };
    readyResolve = handleReady;
  });

  worker.addEventListener("message", (event: MessageEvent<WorkerReply>) => {
    const message = event.data;
    if (message.type === "ready") {
      readyResolve?.();
      readyResolve = null;
      readyReject = null;
      return;
    }
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    clearTimeout(request.timer);
    if (message.type === "result") request.resolve(message.result);
    else request.reject(new Error(message.error));
  });

  worker.addEventListener("error", (event) => {
    const error = new Error(event.message || "Python 运行时启动失败");
    readyReject?.(error);
    disposeWorker(error);
  });

  return readyPromise;
}

export function prepareNativePython() {
  return ensureWorker();
}

export async function runNativePython(
  source: string,
  defaultSpell: string,
  targets: NativePythonTarget[],
): Promise<NativePythonResult> {
  await ensureWorker();
  if (!worker) throw new Error("Python 运行时没有启动");

  const id = nextRequestId;
  nextRequestId += 1;
  return new Promise<NativePythonResult>((resolve, reject) => {
    const timer = setTimeout(() => {
      const error = new Error("代码运行超过 2 秒，可能存在无法结束的循环");
      pending.delete(id);
      reject(error);
      disposeWorker(error);
    }, EXECUTION_TIMEOUT_MS);
    pending.set(id, { resolve, reject, timer });
    worker!.postMessage({ type: "run", id, source, defaultSpell, targets });
  });
}
