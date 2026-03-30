import { useEffect, useState, type CSSProperties } from "react";
import {
  TOOL_DEFINITIONS,
  getCharacterDefinition,
  getNextCharacterId,
  describeToolButtonLabel,
  describeToolParameters,
  findToolInstance,
  getDebugGrantableToolIds,
  getToolDisabledMessage,
  getToolAvailability,
  isAimTool,
  isCharacterSkillTool,
  isDirectionalTool,
  isTileTargetTool,
  type Direction,
  type GameSnapshot,
  type ToolId,
  type TurnToolSnapshot
} from "@watcher/shared";
import { GameBoardCanvas } from "./game/components/GameBoardCanvas";
import {
  evaluateActionPresentation,
  getActionPresentationElapsedMs
} from "./game/animation/presentationPlayback";
import { useWatcherConnection } from "./game/network/useWatcherConnection";
import {
  useGameStore,
  type SelectedToolInstanceId
} from "./game/state/useGameStore";

const MOVEMENT_KEYS: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right"
};

const CONNECTION_STATUS_LABELS = {
  idle: "空闲",
  connecting: "连接中",
  connected: "已连接",
  disconnected: "已断开",
  error: "错误"
} as const;

const TURN_PHASE_LABELS = {
  roll: "掷骰阶段",
  action: "行动阶段"
} as const;

const DEBUG_TOOL_OPTIONS = getDebugGrantableToolIds();

// Selected-tool lookup is shared by the sidebar and interaction hint copy.
function findSelectedTool(
  snapshot: GameSnapshot | null,
  sessionId: string | null,
  selectedToolInstanceId: SelectedToolInstanceId
): TurnToolSnapshot | null {
  if (!snapshot || !sessionId || !selectedToolInstanceId) {
    return null;
  }

  const me = snapshot.players.find((player) => player.id === sessionId);

  return me ? findToolInstance(me.tools, selectedToolInstanceId) ?? null : null;
}

// Sidebar labels surface the most important per-instance numbers at a glance.
function describeToolButton(tool: TurnToolSnapshot): string {
  return describeToolButtonLabel(tool);
}

// Keyboard input remains a convenience layer on top of the same store actions as the scene.
function useKeyboardInteraction(): void {
  const snapshot = useGameStore((state) => state.snapshot);
  const sessionId = useGameStore((state) => state.sessionId);
  const selectedToolInstanceId = useGameStore((state) => state.selectedToolInstanceId);
  const performDirectionalAction = useGameStore((state) => state.performDirectionalAction);
  const rollDice = useGameStore((state) => state.rollDice);
  const endTurn = useGameStore((state) => state.endTurn);
  const useInstantTool = useGameStore((state) => state.useInstantTool);

  useEffect(() => {
    // Keyboard input stays thin and forwards intent to the authoritative room.
    // One handler keeps keyboard shortcuts aligned with the current selected tool.
    const onKeyDown = (event: KeyboardEvent) => {
      const direction = MOVEMENT_KEYS[event.key];
      const me = snapshot?.players.find((player) => player.id === sessionId) ?? null;
      const selectedTool =
        me && selectedToolInstanceId ? findToolInstance(me.tools, selectedToolInstanceId) : undefined;
      const selectedToolAvailability =
        selectedTool && me ? getToolAvailability(selectedTool, me.tools) : null;

      if (
        direction &&
        selectedTool &&
        isDirectionalTool(selectedTool.toolId) &&
        selectedToolAvailability?.usable
      ) {
        event.preventDefault();
        performDirectionalAction(direction, selectedTool.instanceId);
      }

      if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        rollDice();
      }

      if (event.key.toLowerCase() === "e") {
        event.preventDefault();
        endTurn();
      }

      if (
        (event.key === "Enter" || event.key === " ") &&
        selectedTool &&
        !isDirectionalTool(selectedTool.toolId) &&
        selectedToolAvailability?.usable
      ) {
        event.preventDefault();
        useInstantTool(selectedTool.instanceId);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [endTurn, performDirectionalAction, rollDice, selectedToolInstanceId, sessionId, snapshot, useInstantTool]);
}

// The animation clock keeps lightweight scene motion advancing outside of automated runs.
function useAnimationClock(): void {
  const tickRealTime = useGameStore((state) => state.tickRealTime);

  useEffect(() => {
    let frameId = 0;
    let previousTime = performance.now();

    // The RAF loop feeds a shared clock used by scene bobbing and other local-only effects.
    const loop = (currentTime: number) => {
      tickRealTime(currentTime - previousTime);
      previousTime = currentTime;
      frameId = window.requestAnimationFrame(loop);
    };

    frameId = window.requestAnimationFrame(loop);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [tickRealTime]);
}

// Automation hooks expose stable control points for browser-driven inspection.
function useAutomationBridge(): void {
  const advanceTime = useGameStore((state) => state.advanceTime);

  useEffect(() => {
    // These hooks let browser automation inspect and drive the prototype deterministically.
    window.advanceTime = (ms: number) => {
      advanceTime(ms);
    };
    window.watcher_store = useGameStore;

    window.render_game_to_text = () => {
      const state = useGameStore.getState();
      const activePresentationElapsedMs = getActionPresentationElapsedMs(
        state.activeActionPresentation,
        state.activeActionPresentationStartedAtMs,
        state.simulationTimeMs
      );
      const activePresentationPlayback = evaluateActionPresentation(
        state.activeActionPresentation,
        activePresentationElapsedMs
      );
      const payload = {
        mode: state.connectionStatus,
        coordinateSystem: "origin=(0,0) at the top-left of the board, x grows right, y grows down",
        sessionId: state.sessionId,
        timeMs: state.simulationTimeMs,
        selectedToolInstanceId: state.selectedToolInstanceId,
        displayedPlayers: window.watcher_scene_debug?.displayedPlayers ?? {},
        actionPresentation: state.activeActionPresentation
          ? {
              sequence: state.activeActionPresentation.sequence,
              toolId: state.activeActionPresentation.toolId,
              elapsedMs: activePresentationElapsedMs,
              durationMs: state.activeActionPresentation.durationMs,
              queuedCount: state.actionPresentationQueue.length,
              activePlayerMotionIds: Object.keys(activePresentationPlayback.playerMotions),
              activeProjectileCount: activePresentationPlayback.projectiles.length,
              activeEffectCount: activePresentationPlayback.effects.length
            }
          : {
              sequence: null,
              toolId: null,
              elapsedMs: 0,
              durationMs: 0,
              queuedCount: state.actionPresentationQueue.length,
              activePlayerMotionIds: [],
              activeProjectileCount: 0,
              activeEffectCount: 0
            },
        snapshot: state.snapshot
      };

      return JSON.stringify(payload);
    };

    return () => {
      window.advanceTime = undefined;
      window.render_game_to_text = undefined;
      window.watcher_store = undefined;
    };
  }, [advanceTime]);
}

// The hint line adapts to turn phase, tool selection, and current availability.
function describeInteractionHint(
  isMyTurn: boolean,
  phase: "roll" | "action" | null,
  selectedTool: TurnToolSnapshot | null,
  localTools: TurnToolSnapshot[]
): string {
  if (!isMyTurn) {
    return "当前不是你的回合，请等待其他玩家行动。";
  }

  if (phase === "roll") {
    return "点击棋子头顶的骰子开始掷骰，或按 R。";
  }

  if (!selectedTool) {
    return localTools.length
      ? "从头顶弧环中选择一个可用工具。灰色按钮代表当前条件未满足。"
      : "本回合已经没有工具可用了，可以结束回合。";
  }

  const availability = getToolAvailability(selectedTool, localTools);
  const label = TOOL_DEFINITIONS[selectedTool.toolId].label;

  if (!availability.usable) {
    return `${label}当前不可用：${availability.reason}。`;
  }

  if (isDirectionalTool(selectedTool.toolId)) {
    return `按住${label}，拖到高亮方向箭头后松手执行，脚底圆环会预览结果。`;
  }

  if (isTileTargetTool(selectedTool.toolId)) {
    return `按住${label}，把目标拖到棋盘格上后松手执行，高亮格会自动吸附到实际可达位置。`;
  }

  return `点击头顶弧环使用${label}，或按 Enter。`;
}

// The app shell combines the sidebar HUD with the scene-first interaction surface.
export default function App() {
  useWatcherConnection();
  useKeyboardInteraction();
  useAnimationClock();
  useAutomationBridge();

  const connectionStatus = useGameStore((state) => state.connectionStatus);
  const lastError = useGameStore((state) => state.lastError);
  const snapshot = useGameStore((state) => state.snapshot);
  const sessionId = useGameStore((state) => state.sessionId);
  const selectedToolInstanceId = useGameStore((state) => state.selectedToolInstanceId);
  const toolNotice = useGameStore((state) => state.toolNotice);
  const clearToolNotice = useGameStore((state) => state.clearToolNotice);
  const showToolNotice = useGameStore((state) => state.showToolNotice);
  const setSelectedToolInstanceId = useGameStore((state) => state.setSelectedToolInstanceId);
  const rollDice = useGameStore((state) => state.rollDice);
  const endTurn = useGameStore((state) => state.endTurn);
  const setCharacter = useGameStore((state) => state.setCharacter);
  const grantDebugTool = useGameStore((state) => state.grantDebugTool);
  const useInstantTool = useGameStore((state) => state.useInstantTool);
  const [debugToolId, setDebugToolId] = useState<ToolId>(DEBUG_TOOL_OPTIONS[0] ?? "movement");

  const me = snapshot?.players.find((player) => player.id === sessionId) ?? null;
  const activePlayer = snapshot?.players.find((player) => player.id === snapshot.turnInfo.currentPlayerId) ?? null;
  const isMyTurn = Boolean(activePlayer && sessionId && activePlayer.id === sessionId);
  const activePhase = snapshot?.turnInfo.phase ?? null;
  const selectedTool = findSelectedTool(snapshot, sessionId, selectedToolInstanceId);
  const selectedToolDefinition = selectedTool ? TOOL_DEFINITIONS[selectedTool.toolId] : null;
  const selectedToolParameters = selectedTool ? describeToolParameters(selectedTool) : [];
  const selectedToolAvailability =
    selectedTool && me ? getToolAvailability(selectedTool, me.tools) : null;
  const roleDefinition = me ? getCharacterDefinition(me.characterId) : null;
  const nextCharacterId = me ? getNextCharacterId(me.characterId) : "late";
  const nextRoleDefinition = getCharacterDefinition(nextCharacterId);
  const roleTools = me?.tools.filter((tool) => isCharacterSkillTool(tool)) ?? [];
  const regularTools = me?.tools.filter((tool) => !isCharacterSkillTool(tool)) ?? [];
  const otherPlayers =
    snapshot?.players.filter((player) => player.id !== sessionId) ?? [];
  const instantToolReady =
    selectedTool &&
    selectedToolDefinition &&
    !isAimTool(selectedTool.toolId) &&
    selectedToolAvailability?.usable;
  const usableToolCount = me?.tools.filter((tool) => getToolAvailability(tool, me.tools).usable).length ?? 0;

  const interactionHint = describeInteractionHint(isMyTurn, activePhase, selectedTool, me?.tools ?? []);
  const handleRoleSkillClick = (tool: TurnToolSnapshot) => {
    const availability = getToolAvailability(tool, me?.tools ?? []);
    setSelectedToolInstanceId(tool.instanceId);

    if (!availability.usable) {
      showToolNotice(
        getToolDisabledMessage(tool, me?.tools ?? []) ?? `${TOOL_DEFINITIONS[tool.toolId].label}当前不可用。`
      );
      return;
    }

    if (isAimTool(tool.toolId)) {
      return;
    }

    useInstantTool(tool.instanceId);
  };
  const handleSidebarToolClick = (tool: TurnToolSnapshot) => {
    const tools = me?.tools ?? [];
    const availability = getToolAvailability(tool, tools);

    setSelectedToolInstanceId(tool.instanceId);

    if (!availability.usable) {
      showToolNotice(
        getToolDisabledMessage(tool, tools) ?? `${TOOL_DEFINITIONS[tool.toolId].label}当前不可用。`
      );
    }
  };

  useEffect(() => {
    if (!toolNotice) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      clearToolNotice();
    }, 2200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [clearToolNotice, toolNotice]);

  return (
    <div className="app-shell">
      <aside className="hud-panel">
        <div className="brand-block">
          <p className="eyebrow">Watcher 原型</p>
          <h1>场景优先的骰子与工具回合</h1>
          <p className="lead">
            当前回合以统一的工具列表结算。移动本身也是工具，因此执行顺序、使用条件和后续强化都会走同一套扩展路径。
          </p>
        </div>

        <section className="status-card">
          <span className={`status-pill status-${connectionStatus}`}>{CONNECTION_STATUS_LABELS[connectionStatus]}</span>
          <p>{interactionHint}</p>
          {lastError ? <p className="error-copy">{lastError}</p> : null}
        </section>

        <section className="info-grid">
          <div className="info-card">
            <p className="info-label">玩家</p>
            <div className="player-name-line">
              <span
                className="player-swatch"
                style={{ "--player-accent": me?.color ?? "#c9b182" } as CSSProperties}
              />
              <strong>{me?.name ?? "连接中..."}</strong>
            </div>
            <span>{me ? `(${me.position.x}, ${me.position.y})` : "--"}</span>
          </div>
          <div className="info-card">
            <p className="info-label">当前回合</p>
            <div className="player-name-line">
              <span
                className="player-swatch"
                style={{ "--player-accent": activePlayer?.color ?? "#c9b182" } as CSSProperties}
              />
              <strong>{activePlayer?.name ?? "--"}</strong>
            </div>
            <span>{snapshot && activePhase ? TURN_PHASE_LABELS[activePhase] : "--"}</span>
          </div>
        </section>

        <section className="character-card">
          <div className="character-card__header">
            <div>
              <p className="section-title">角色</p>
              <strong>{roleDefinition?.label ?? "--"}</strong>
            </div>
            <button
              type="button"
              data-testid="switch-character-button"
              onClick={() => setCharacter(nextCharacterId)}
              disabled={!isMyTurn || activePhase !== "roll" || !me}
            >
              切换为{nextRoleDefinition.label}
            </button>
          </div>
          <p className="character-summary">{roleDefinition?.summary ?? "等待角色数据同步。"}</p>
          {roleDefinition?.passiveDescriptions.length ? (
            <div className="character-passive-list">
              {roleDefinition.passiveDescriptions.map((description, index) => (
                <p key={`${roleDefinition.id}-passive-${index}`} className="hint-copy">
                  被动：{description}
                </p>
              ))}
            </div>
          ) : (
            <p className="hint-copy">这个角色当前没有额外被动说明。</p>
          )}
          <div className="role-skill-header">
            <p className="section-title">主动技能</p>
            <span>{roleTools.length ? `${roleTools.length} 个` : "暂无"}</span>
          </div>
          {roleTools.length ? (
            <div className="tool-grid role-skill-grid">
              {roleTools.map((tool, index) => {
                const availability = getToolAvailability(tool, me?.tools ?? []);

                return (
                  <button
                    key={tool.instanceId}
                    type="button"
                    data-testid={`role-skill-button-${tool.toolId}-${index}`}
                    className={
                      [
                        "tool-button",
                        selectedToolInstanceId === tool.instanceId ? "selected" : "",
                        !availability.usable ? "disabled" : ""
                      ]
                        .filter(Boolean)
                        .join(" ")
                    }
                    aria-disabled={!availability.usable}
                    onClick={() => handleRoleSkillClick(tool)}
                  >
                    {describeToolButton(tool)}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="hint-copy">这个角色当前没有可点击的主动技能。</p>
          )}
          <p className="hint-copy">主动技能会出现在这里，也会同步显示在场景中的头顶弧环。</p>
          <p className="hint-copy">切换角色只允许在掷骰前进行，这样本回合工具列表会保持稳定。</p>
        </section>

        <section className="controls-card">
          <p className="section-title">辅助操作</p>
          <div className="action-row">
            <button
              type="button"
              data-testid="roll-dice-button"
              onClick={() => rollDice()}
              disabled={!isMyTurn || activePhase !== "roll"}
            >
              掷骰
            </button>
            <button
              type="button"
              data-testid="end-turn-button"
              onClick={() => endTurn()}
              disabled={!isMyTurn || activePhase !== "action"}
            >
              结束回合
            </button>
          </div>
          <div className="debug-grant-row">
            <select
              value={debugToolId}
              onChange={(event) => setDebugToolId(event.target.value as ToolId)}
              disabled={!isMyTurn || activePhase !== "action"}
              data-testid="debug-tool-select"
            >
              {DEBUG_TOOL_OPTIONS.map((toolId) => (
                <option key={toolId} value={toolId}>
                  {TOOL_DEFINITIONS[toolId].label}
                </option>
              ))}
            </select>
            <button
              type="button"
              data-testid="grant-debug-tool-button"
              onClick={() => grantDebugTool(debugToolId)}
              disabled={!isMyTurn || activePhase !== "action"}
            >
              获取调试工具
            </button>
          </div>
          <p className="hint-copy">调试：行动阶段可以从下拉列表里直接发放任意已实现工具。</p>
          <p className="hint-copy">主要操作都在棋子头顶完成。键盘辅助：`R` 掷骰，`E` 结束回合，方向键执行当前定向工具。</p>
        </section>

        <section className="roll-card">
          <p className="section-title">本回合掷骰</p>
          <div className="roll-grid">
            <div className="info-card compact">
              <p className="info-label">移动骰</p>
              <strong>{snapshot?.turnInfo.moveRoll ?? 0}</strong>
            </div>
            <div className="info-card compact">
              <p className="info-label">工具骰</p>
              <strong>
                {snapshot?.turnInfo.lastRolledToolId
                  ? TOOL_DEFINITIONS[snapshot.turnInfo.lastRolledToolId].label
                  : "--"}
              </strong>
            </div>
            <div className="info-card compact">
              <p className="info-label">工具总数</p>
              <strong>{me?.tools.length ?? 0}</strong>
            </div>
            <div className="info-card compact">
              <p className="info-label">可用数量</p>
              <strong>{usableToolCount}</strong>
            </div>
          </div>
        </section>

        <section className="tool-card">
          <div className="role-skill-header">
            <p className="section-title">回合工具</p>
            <span>{regularTools.length ? `${regularTools.length} 个` : "暂无"}</span>
          </div>
          {regularTools.length ? (
            <div className="tool-grid">
              {regularTools.map((tool, index) => {
                const availability = getToolAvailability(tool, me?.tools ?? []);

                return (
                  <button
                    key={tool.instanceId}
                    type="button"
                    data-testid={`tool-button-${tool.toolId}-${index}`}
                    className={
                      [
                        "tool-button",
                        selectedToolInstanceId === tool.instanceId ? "selected" : "",
                        !availability.usable ? "disabled" : ""
                      ]
                        .filter(Boolean)
                        .join(" ")
                    }
                    aria-disabled={!availability.usable}
                    onClick={() => handleSidebarToolClick(tool)}
                  >
                    {describeToolButton(tool)}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="hint-copy">这个回合目前没有普通工具，可能只剩角色技能或已经全部用完。</p>
          )}
          {selectedToolDefinition && selectedTool ? (
            <div className="tool-detail" style={{ "--tool-accent": selectedToolDefinition.color } as CSSProperties}>
              <strong>{describeToolButton(selectedTool)}</strong>
              <p>{selectedToolDefinition.description}</p>
              {selectedToolParameters.length ? <p>{selectedToolParameters.join(" · ")}</p> : null}
              {!selectedToolAvailability?.usable ? (
                <p>{getToolDisabledMessage(selectedTool, me?.tools ?? [])}</p>
              ) : null}
            </div>
          ) : (
            <div className="tool-detail">
              <strong>尚未选择工具</strong>
              <p>可以从上方列表或场景里的头顶弧环选择一个工具。</p>
            </div>
          )}
          {instantToolReady ? (
            <button
              type="button"
              data-testid="use-instant-tool-button"
              onClick={() => useInstantTool(selectedTool.instanceId)}
            >
              使用{selectedToolDefinition?.label}
            </button>
          ) : null}
          <p className="hint-copy">灰色工具仍会显示在列表里，点击后会提示当前为什么不能用。</p>
        </section>

        <section className="player-observer-section">
          <div className="role-skill-header">
            <p className="section-title">其他玩家</p>
            <span>{otherPlayers.length ? `${otherPlayers.length} 名` : "暂无"}</span>
          </div>
          {otherPlayers.length ? (
            <div className="player-observer-list">
              {otherPlayers.map((player) => {
                const isObservedActive = snapshot?.turnInfo.currentPlayerId === player.id;
                const playerRole = getCharacterDefinition(player.characterId);

                return (
                  <div
                    key={player.id}
                    className={[
                      "player-observer-card",
                      isObservedActive ? "active" : ""
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <div className="player-observer-header">
                      <div>
                        <div className="player-name-line">
                          <span
                            className="player-swatch"
                            style={{ "--player-accent": player.color } as CSSProperties}
                          />
                          <strong>{player.name}</strong>
                        </div>
                        <p className="hint-copy">{playerRole.label}</p>
                      </div>
                      <span>{`(${player.position.x}, ${player.position.y})`}</span>
                    </div>
                    {player.tools.length ? (
                      <div className="player-tool-chip-grid">
                        {player.tools.map((tool) => {
                          const availability = getToolAvailability(tool, player.tools);

                          return (
                            <span
                              key={tool.instanceId}
                              className={[
                                "player-tool-chip",
                                availability.usable ? "" : "disabled"
                              ]
                                .filter(Boolean)
                                .join(" ")}
                            >
                              {describeToolButton(tool)}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="hint-copy">这个回合当前没有工具。</p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="hint-copy">房间里暂时还没有其他玩家。</p>
          )}
        </section>

        <section className="legend-card">
          <p className="section-title">棋盘图例</p>
          <div className="legend-row">
            <span className="legend-swatch floor" />
            普通地块
          </div>
          <div className="legend-row">
            <span className="legend-swatch wall" />
            实体墙
          </div>
          <div className="legend-row">
            <span className="legend-swatch earth-wall" />
            土墙
          </div>
          <div className="legend-row">
            <span className="legend-swatch pit" />
            坑洞，停留后回出生点
          </div>
          <div className="legend-row">
            <span className="legend-swatch lucky" />
            幸运方块，每回合最多送一次工具
          </div>
          <div className="legend-row">
            <span className="legend-swatch conveyor" />
            加速带，移动经过时会加速或转向
          </div>
          <div className="legend-row">
            <span className="legend-swatch wallet" />
            钱包，领导经过自己放置的钱包时会拾取并获得一个工具骰子
          </div>
          <div className="legend-row">
            <span className="legend-swatch active" />
            当前行动者标记
          </div>
        </section>
      </aside>

      <main className="scene-panel">
        <GameBoardCanvas />
      </main>

      {toolNotice ? (
        <div className="ui-notice" role="status" aria-live="polite">
          {toolNotice.message}
        </div>
      ) : null}
    </div>
  );
}
