"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  prepareNativePython,
  runNativeSimulation,
  type SimulationFrame,
} from "./native-python";
import {
  FRONTIER_DECORATIONS,
  FRONTIER_REFERENCE_CODE,
  FRONTIER_SCENARIO,
  FRONTIER_STARTER_CODE,
  INITIAL_FRONTIER_FRAME,
} from "./team-simulation";

type SimulationPhase = "editing" | "compiling" | "playing" | "paused" | "won" | "lost" | "error";

const cellKey = (row: number, col: number) => `${row}-${col}`;
const MONSTER_SPRITES = [
  "/assets/v2/dungeon/slime.png",
  "/assets/v2/dungeon/goblin.png",
  "/assets/v2/dungeon/skeleton.png",
];

function TeamWorldMap({ onBack, onStart }: { onBack: () => void; onStart: () => void }) {
  const missions = [
    { id: "01", title: "第一个队员", focus: "while · 实时状态", note: "1 名战士", open: true, left: 19, top: 69 },
    { id: "02", title: "最近的威胁", focus: "for · 最值选择", note: "仍是 1 名战士", open: false, left: 43, top: 48 },
    { id: "03", title: "双路警报", focus: "if · 优先级", note: "仍是 1 名战士", open: false, left: 67, top: 61 },
    { id: "04", title: "编队防线", focus: "多 Agent 分工", note: "小队系统", open: false, left: 84, top: 29 },
  ];

  return (
    <main className="team-world-shell">
      <header className="world-header team-world-header">
        <button className="team-back-link" onClick={onBack}>← 第一章地图</button>
        <a className="brand" href="#team-top" aria-label="守望者前线首页">
          <span className="brand-mark team-brand-mark">⚑</span>
          <span><strong>守望者前线</strong><small>CODECASTER COMMAND</small></span>
        </a>
        <div className="team-rank"><small>当前编制</small><strong>1 名战士</strong></div>
      </header>

      <section className="team-hero" id="team-top">
        <div className="team-hero-copy">
          <div className="eyebrow team-eyebrow"><span /> PYTHON 冒险 · 第二章</div>
          <h1>一个人清掉一排，<em>一支队伍守住整片地图</em></h1>
          <p>第一战之后，裂隙里的怪物仍源源不断。它们不会等三秒——在真正的前线，每一秒都在移动。现在，把判断写成命令，让战士替你持续战斗。</p>
          <button className="team-primary-cta" onClick={onStart}>
            <span>建立第一支小队</span>
            <strong>部署先锋战士</strong>
            <b>→</b>
          </button>
        </div>
        <aside className="team-story-card">
          <span>AFTER LEVEL 01</span>
          <blockquote>“循环能击倒眼前的一排，却守不住不断变化的战场。”</blockquote>
          <div className="story-dialogue">
            <i className="story-wizard" aria-hidden />
            <p><strong>见习法师</strong>个人力量有限，我需要有人替我执行每一次判断。</p>
          </div>
          <div className="story-dialogue">
            <i className="story-warrior" aria-hidden />
            <p><strong>先锋战士</strong>把逻辑交给我。走到怪物 1 格内，我会自动攻击。</p>
          </div>
        </aside>
      </section>

      <section className="team-map-card" aria-label="守望者前线大地图">
        <div className="team-map-scroll">
          <div className="team-campaign-map">
            <div className="frontier-region frontier-village"><span>西境营地</span></div>
            <div className="frontier-region frontier-forest"><span>守望林线</span></div>
            <div className="frontier-region frontier-rift"><span>东侧裂隙</span></div>
            <div className="frontier-road frontier-road-a" />
            <div className="frontier-road frontier-road-b" />
            <i className="frontier-sprite frontier-camp" aria-hidden />
            <i className="frontier-sprite frontier-tree" aria-hidden />
            <i className="frontier-sprite frontier-rune" aria-hidden />
            <i className="frontier-sprite frontier-torch" aria-hidden />
            {missions.map((mission) => (
              <button
                key={mission.id}
                className={`team-mission-node ${mission.open ? "is-open" : "is-locked"}`}
                style={{ left: `${mission.left}%`, top: `${mission.top}%` }}
                onClick={mission.open ? onStart : undefined}
                disabled={!mission.open}
                aria-label={`${mission.id} ${mission.title}，${mission.open ? "可进入" : "尚未开放"}`}
              >
                <span className="team-node-sigil">{mission.open ? mission.id : "◇"}</span>
                <span className="team-node-copy">
                  <small>{mission.open ? "CURRENT MISSION" : "同一张大地图 · 即将开放"}</small>
                  <strong>{mission.title}</strong>
                  <em>{mission.focus}</em>
                  <b>{mission.note}</b>
                </span>
              </button>
            ))}
            <aside className="frontier-rule-card">
              <span>大地图规则</span>
              <strong>怪物每 1 秒行动</strong>
              <p>所有模拟关都发生在这张边境地图。编辑时世界暂停；部署后，代码中的每次 <code>step()</code> 就是完整的 1 秒。</p>
              <div><b>24 × 14</b><small>大地图</small><b>1 SEC</b><small>每回合</small><b>1</b><small>前期战士</small></div>
            </aside>
          </div>
        </div>
      </section>

      <section className="team-curriculum">
        <div><span>观察</span><strong>读取实时状态</strong><small>warrior() / monsters()</small></div>
        <div><span>判断</span><strong>循环比较威胁</strong><small>for + 最值更新</small></div>
        <div><span>行动</span><strong>推进模拟 1 秒</strong><small>step(direction)</small></div>
        <div><span>复盘</span><strong>逐秒查看战报</strong><small>同一代码，应对变化</small></div>
      </section>
    </main>
  );
}

function SimulationMap({ frame }: { frame: SimulationFrame }) {
  const decorations = useMemo(
    () => new Map(FRONTIER_DECORATIONS.map(([row, col, sprite, name]) => [cellKey(row, col), { sprite, name }])),
    [],
  );
  const monsters = useMemo(
    () => new Map(frame.monsters.map((monster) => [cellKey(monster.row, monster.col), monster])),
    [frame.monsters],
  );
  const warriorKey = cellKey(frame.warrior.row, frame.warrior.col);
  const summary = `第 ${frame.tick} 秒，战士在第 ${frame.warrior.row} 行第 ${frame.warrior.col} 列，存活怪物 ${frame.monsters.length} 只，已经击杀 ${frame.kills} 只。`;

  return (
    <div className="sim-map-scroll">
      <div className="sim-grid" role="img" aria-label={summary}>
        {Array.from({ length: FRONTIER_SCENARIO.rows * FRONTIER_SCENARIO.cols }, (_, index) => {
          const row = Math.floor(index / FRONTIER_SCENARIO.cols);
          const col = index % FRONTIER_SCENARIO.cols;
          const key = cellKey(row, col);
          const monster = monsters.get(key);
          const decoration = decorations.get(key);
          const isWarrior = key === warriorKey;
          const isBase = row === 6 && col === FRONTIER_SCENARIO.baseCol;
          const isRift = row === 6 && col === FRONTIER_SCENARIO.cols - 1;
          const inAttackRange = Math.abs(row - frame.warrior.row) + Math.abs(col - frame.warrior.col) <= 1;
          const road = row === 6 || (col === 12 && row >= 1 && row <= 6) || (col === 19 && row >= 6 && row <= 12);
          const classes = [
            "sim-cell",
            road ? "is-road" : "",
            isBase ? "is-base-cell" : "",
            isRift ? "is-rift-cell" : "",
            inAttackRange ? "is-attack-range" : "",
          ].filter(Boolean).join(" ");
          return (
            <span className={classes} key={key} aria-hidden>
              {decoration && !monster && !isWarrior && !isBase && !isRift && (
                <i className="sim-decoration" style={{ backgroundImage: `url(${decoration.sprite})` }} title={decoration.name} />
              )}
              {isBase && <i className="sim-base" title="西境营地" />}
              {isRift && <i className="sim-rift" title="史莱姆裂隙" />}
              {isWarrior && <i className="sim-unit sim-warrior" title="先锋战士" />}
              {monster && (
                <i
                  className="sim-unit sim-monster"
                  style={{ backgroundImage: `url(${MONSTER_SPRITES[(monster.id - 1) % MONSTER_SPRITES.length]})` }}
                  title={`怪物 #${monster.id}`}
                ><b>#{monster.id}</b></i>
              )}
            </span>
          );
        })}
        <span className="future-gate future-gate-north" aria-hidden>封印</span>
        <span className="future-gate future-gate-south" aria-hidden>封印</span>
      </div>
    </div>
  );
}

function SimulationBattle({ onBack, onExit }: { onBack: () => void; onExit: () => void }) {
  const [code, setCode] = useState(FRONTIER_STARTER_CODE);
  const [phase, setPhase] = useState<SimulationPhase>("editing");
  const [frames, setFrames] = useState<SimulationFrame[]>([INITIAL_FRONTIER_FRAME]);
  const [frameIndex, setFrameIndex] = useState(0);
  const [executionMs, setExecutionMs] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [hintStage, setHintStage] = useState<0 | 1 | 2>(0);
  const runToken = useRef(0);
  const frame = frames[frameIndex] ?? INITIAL_FRONTIER_FRAME;
  const playing = phase === "playing";
  const locked = phase === "compiling" || playing || phase === "paused" || phase === "won" || phase === "lost";
  const progress = Math.min(100, (frame.tick / FRONTIER_SCENARIO.maxTicks) * 100);
  const lineCount = Math.max(18, code.split("\n").length);

  useEffect(() => {
    void prepareNativePython().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!playing) return;
    if (frameIndex >= frames.length - 1) return;
    const timer = window.setTimeout(() => {
      const nextIndex = frameIndex + 1;
      const nextFrame = frames[nextIndex];
      setFrameIndex(nextIndex);
      if (nextIndex >= frames.length - 1) {
        setPhase(nextFrame?.outcome === "won" ? "won" : "lost");
      }
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [frameIndex, frames, playing]);

  const deploy = async () => {
    const token = runToken.current + 1;
    runToken.current = token;
    setPhase("compiling");
    setErrorMessage("");
    setFrames([INITIAL_FRONTIER_FRAME]);
    setFrameIndex(0);
    setExecutionMs(null);
    try {
      const result = await runNativeSimulation(code, FRONTIER_SCENARIO);
      if (runToken.current !== token) return;
      setFrames(result.frames.length ? result.frames : [INITIAL_FRONTIER_FRAME]);
      setExecutionMs(result.executionMs);
      setFrameIndex(0);
      setPhase("playing");
    } catch (error) {
      if (runToken.current !== token) return;
      setErrorMessage(error instanceof Error ? error.message : "控制程序没有成功运行");
      setPhase("error");
    }
  };

  const reset = () => {
    runToken.current += 1;
    setFrames([INITIAL_FRONTIER_FRAME]);
    setFrameIndex(0);
    setExecutionMs(null);
    setErrorMessage("");
    setPhase("editing");
  };

  const handleEditorKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      if (!locked) void deploy();
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

  const phaseLabel = phase === "compiling"
    ? "正在推演"
    : phase === "playing"
      ? "每秒行动中"
      : phase === "paused"
        ? "回放已暂停"
        : phase === "won"
          ? "防守成功"
          : phase === "lost"
            ? frame.outcome === "incomplete" ? "程序提前结束" : "防线失守"
            : phase === "error"
              ? "代码未通过"
              : "等待部署";

  return (
    <main className="simulation-shell">
      <header className="simulation-header">
        <button className="sim-back-button" onClick={onBack}>← 战队地图</button>
        <div className="simulation-title">
          <span>01</span>
          <div><small>守望者前线 · 单战士教学</small><strong>第一个队员</strong></div>
        </div>
        <div className="simulation-status">
          <span className={`sim-live-dot phase-${phase}`} />
          <div><small>模拟状态</small><strong>{phaseLabel}</strong></div>
        </div>
      </header>

      <section className="simulation-mission">
        <div className="sim-interface-badge"><span>API</span><div><small>本关控制接口</small><strong>step(direction)</strong><code>1 次调用 = 1 秒</code></div></div>
        <div className="sim-mission-copy">
          <small>任务 · 守住 {FRONTIER_SCENARIO.maxTicks} 秒</small>
          <p>用 <code>while</code> 持续决策，用 <code>for</code> 找出最靠近西侧营地的怪物。战士每秒移动 1 格；与怪物曼哈顿距离 ≤ 1 时自动攻击。</p>
        </div>
        <div className="sim-metrics">
          <div><small>TIME</small><strong>{String(frame.tick).padStart(2, "0")}<em> / {FRONTIER_SCENARIO.maxTicks}s</em></strong></div>
          <div><small>KILLS</small><strong>{frame.kills}<em> / {FRONTIER_SCENARIO.killGoal}+</em></strong></div>
          <div><small>ALIVE</small><strong>{frame.monsters.length}</strong></div>
        </div>
      </section>

      <section className="simulation-layout">
        <div className="simulation-map-panel">
          <div className="sim-panel-heading">
            <div><span>守望者前线</span><small>24 × 14 · 同一张持续地图</small></div>
            <div className="sim-tick-rule"><b>1 SEC</b> 怪物每秒向左移动 1 格</div>
          </div>
          <SimulationMap frame={frame} />
          <div className="sim-timeline">
            <span style={{ width: `${progress}%` }} />
            <ol aria-label="模拟时间轴">
              {[0, 4, 8, 12, 16, 20, 24].map((tick) => <li key={tick} className={frame.tick >= tick ? "is-past" : ""}>{tick}s</li>)}
            </ol>
          </div>
          <div className="sim-map-footer">
            <p><span className="legend-warrior" />先锋战士 ({frame.warrior.row}, {frame.warrior.col})</p>
            <p><span className="legend-range" />上下左右 1 格自动攻击</p>
            <p><span className="legend-base" />西侧营地 · 怪物抵达即失败</p>
            <div className="sim-playback-actions">
              {(phase === "playing" || phase === "paused") && (
                <button onClick={() => setPhase((current) => current === "playing" ? "paused" : "playing")}>
                  {phase === "playing" ? "Ⅱ 暂停复盘" : "▶ 继续复盘"}
                </button>
              )}
              {locked && phase !== "won" && <button onClick={reset}>■ 停止并修改</button>}
            </div>
          </div>
        </div>

        <aside className="simulation-code-panel">
          <div className="sim-editor-tabs">
            <div><span>PY</span> warrior.py <i>●</i></div>
            <button onClick={() => setHintStage((current) => current === 0 ? 1 : current === 1 ? 2 : 0)}>
              ? {hintStage === 0 ? "思路提示" : hintStage === 1 ? "参考代码" : "收起"}
            </button>
          </div>
          <div className="sim-api-strip">
            <code>warrior()</code><span>战士坐标</span>
            <code>monsters()</code><span>怪物列表</span>
            <code>battle_running()</code><span>是否继续</span>
          </div>
          {hintStage > 0 && (
            <div className="sim-hint-card">
              <span>{hintStage}/2</span>
              {hintStage === 1 ? (
                <p>每秒先取一次快照。用 <code>for enemy in enemies</code> 比较 <code>col</code>，保存最小者；再比较它与战士的行列，只调用一次 <code>step()</code>。</p>
              ) : (
                <pre>{FRONTIER_REFERENCE_CODE}</pre>
              )}
            </div>
          )}
          <div className="sim-editor-wrap">
            <div className="sim-line-numbers" aria-hidden>
              {Array.from({ length: lineCount }, (_, index) => <span key={index}>{index + 1}</span>)}
            </div>
            <textarea
              value={code}
              onChange={(event) => setCode(event.target.value)}
              onKeyDown={handleEditorKeyDown}
              disabled={locked}
              spellCheck={false}
              aria-label="战士 Python 控制程序"
            />
          </div>
          <div className="sim-editor-actions">
            <button className="sim-reset-code" onClick={() => { setCode(FRONTIER_STARTER_CODE); reset(); }}>↺ 还原骨架</button>
            <button className="sim-deploy-button" onClick={() => void deploy()} disabled={locked}>
              <span>{phase === "compiling" ? "··" : "▶"}</span>
              {phase === "compiling" ? "正在推演" : "部署命令"}
              <kbd>⌘↵</kbd>
            </button>
          </div>
          <div className="sim-console" aria-live={phase === "won" || phase === "lost" || phase === "error" ? "polite" : "off"}>
            <div className="sim-console-head">
              <span>逐秒战报</span>
              <strong className={`phase-${phase}`}>{phaseLabel}</strong>
            </div>
            <div className="sim-console-lines">
              {errorMessage ? (
                <p><b>!</b>{errorMessage}</p>
              ) : (
                frame.events.slice(-4).map((event, index) => <p key={`${frame.tick}-${event}-${index}`}><b>{String(frame.tick).padStart(2, "0")}s</b>{event}</p>)
              )}
              {executionMs !== null && frame.tick === 0 && <p><b>PY</b>已生成 {frames.length - 1} 个逐秒状态 · {executionMs.toFixed(2)}ms</p>}
            </div>
            {(phase === "lost" || phase === "error") && <button onClick={reset}>重置战场并修改代码</button>}
            {phase === "won" && <button onClick={onBack}>先锋加入队伍，返回大地图 →</button>}
          </div>
          <div className="sim-safety-note">模拟结果由同一份代码一次生成；回放只展示结果，不会改变怪物行动顺序。</div>
        </aside>
      </section>

      <button className="sim-exit-link" onClick={onExit}>退出第二章</button>
    </main>
  );
}

export function TeamCampaign({ onBack }: { onBack: () => void }) {
  const [missionOpen, setMissionOpen] = useState(false);
  return missionOpen ? (
    <SimulationBattle onBack={() => setMissionOpen(false)} onExit={onBack} />
  ) : (
    <TeamWorldMap onBack={onBack} onStart={() => setMissionOpen(true)} />
  );
}
