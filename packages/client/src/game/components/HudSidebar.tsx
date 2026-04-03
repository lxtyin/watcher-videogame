import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  DEFAULT_GAME_MAP_ID,
  RACE_GAME_MAP_ID,
  TOOL_DEFINITIONS,
  TURN_START_ACTION_DEFINITIONS,
  describeToolButtonLabel,
  describeToolParameters,
  getCharacterDefinition,
  getDebugGrantableToolIds,
  getNextCharacterId,
  getToolAvailability,
  getToolChoiceDefinitions,
  getToolDisabledMessage,
  isAimTool,
  isCharacterSkillTool,
  isChoiceTool,
  isDirectionalTool,
  isTileDirectionTool,
  isTileTargetTool,
  type ToolId,
  type TurnToolSnapshot
} from "@watcher/shared";
import { findSelectedTool } from "../state/toolSelection";
import { useGameStore } from "../state/useGameStore";

const CONNECTION_STATUS_LABELS = {
  idle: "空闲",
  connecting: "连接中",
  connected: "已连接",
  disconnected: "已断开",
  error: "错误"
} as const;

const TURN_PHASE_LABELS = {
  roll: "投骰阶段",
  action: "行动阶段"
} as const;

const DEBUG_TOOL_OPTIONS = getDebugGrantableToolIds();

function navigateToMap(mapId: string): void {
  const url = new URL(window.location.href);

  if (mapId === DEFAULT_GAME_MAP_ID) {
    url.searchParams.delete("map");
  } else {
    url.searchParams.set("map", mapId);
  }

  window.location.assign(url.toString());
}

function describeModeLabel(mode: "free" | "race" | undefined): string {
  if (mode === "race") {
    return "竞速模式";
  }

  return "自由模式";
}

function describeInteractionHint(
  isMyTurn: boolean,
  phase: "roll" | "action" | null,
  selectedTool: TurnToolSnapshot | null,
  localTools: TurnToolSnapshot[],
  turnStartActionCount: number
): string {
  if (!isMyTurn) {
    return "当前不是你的回合，请等待其他玩家行动。";
  }

  if (phase === "roll") {
    return turnStartActionCount
      ? "点击掷骰开始回合，或先使用角色的回合开始技能。"
      : "点击掷骰开始本回合，或按 R。";
  }

  if (!selectedTool) {
    return localTools.length
      ? "从工具列表或场景头顶弧环中选择一个可用工具。"
      : "本回合已经没有工具可用了，可以结束回合。";
  }

  const availability = getToolAvailability(selectedTool, localTools);
  const label = TOOL_DEFINITIONS[selectedTool.toolId].label;

  if (!availability.usable) {
    return `${label}当前不可用：${availability.reason}。`;
  }

  if (isDirectionalTool(selectedTool.toolId)) {
    return `按住${label}，拖到高亮方向后松手执行，脚底圆环会预览结果。`;
  }

  if (isTileTargetTool(selectedTool.toolId)) {
    return `按住${label}，把目标拖到棋盘格上后松手执行。`;
  }

  if (isTileDirectionTool(selectedTool.toolId)) {
    return `按住${label}，先选目标格，再拖出方向后松手执行。`;
  }

  if (isChoiceTool(selectedTool.toolId)) {
    return `在下方点选一个方案，决定${label}的结算方式。`;
  }

  return `点击按钮使用${label}。`;
}

function getBlockedToolMessage(tool: TurnToolSnapshot, tools: TurnToolSnapshot[]): string {
  return getToolDisabledMessage(tool, tools) ?? `${TOOL_DEFINITIONS[tool.toolId].label}当前不可用。`;
}

// The sidebar stays focused on HUD presentation while scene interaction lives in BoardScene.
export function HudSidebar() {
  const snapshot = useGameStore((state) => state.snapshot);
  const sessionId = useGameStore((state) => state.sessionId);
  const connectionStatus = useGameStore((state) => state.connectionStatus);
  const lastError = useGameStore((state) => state.lastError);
  const selectedToolInstanceId = useGameStore((state) => state.selectedToolInstanceId);
  const toolNotice = useGameStore((state) => state.toolNotice);
  const clearToolNotice = useGameStore((state) => state.clearToolNotice);
  const showToolNotice = useGameStore((state) => state.showToolNotice);
  const setSelectedToolInstanceId = useGameStore((state) => state.setSelectedToolInstanceId);
  const rollDice = useGameStore((state) => state.rollDice);
  const useTurnStartAction = useGameStore((state) => state.useTurnStartAction);
  const endTurn = useGameStore((state) => state.endTurn);
  const setCharacter = useGameStore((state) => state.setCharacter);
  const grantDebugTool = useGameStore((state) => state.grantDebugTool);
  const useInstantTool = useGameStore((state) => state.useInstantTool);
  const useChoiceTool = useGameStore((state) => state.useChoiceTool);
  const [debugToolId, setDebugToolId] = useState<ToolId>(DEBUG_TOOL_OPTIONS[0] ?? "movement");

  const me = snapshot?.players.find((player) => player.id === sessionId) ?? null;
  const activePlayer = snapshot?.players.find((player) => player.id === snapshot.turnInfo.currentPlayerId) ?? null;
  const isMyTurn = Boolean(activePlayer && sessionId && activePlayer.id === sessionId);
  const activePhase = snapshot?.turnInfo.phase ?? null;
  const turnStartActions = snapshot?.turnInfo.turnStartActions ?? [];
  const selectedTool = findSelectedTool(snapshot, sessionId, selectedToolInstanceId);
  const selectedToolDefinition = selectedTool ? TOOL_DEFINITIONS[selectedTool.toolId] : null;
  const selectedToolParameters = selectedTool ? describeToolParameters(selectedTool) : [];
  const selectedToolAvailability =
    selectedTool && me ? getToolAvailability(selectedTool, me.tools) : null;
  const roleDefinition = me ? getCharacterDefinition(me.characterId) : null;
  const nextCharacterId = me ? getNextCharacterId(me.characterId) : "late";
  const nextRoleDefinition = getCharacterDefinition(nextCharacterId);
  const roleTools = useMemo(
    () => me?.tools.filter((tool) => isCharacterSkillTool(tool)) ?? [],
    [me]
  );
  const regularTools = useMemo(
    () => me?.tools.filter((tool) => !isCharacterSkillTool(tool)) ?? [],
    [me]
  );
  const otherPlayers = snapshot?.players.filter((player) => player.id !== sessionId) ?? [];
  const instantToolReady = Boolean(
    selectedTool &&
      selectedToolDefinition &&
      !isAimTool(selectedTool.toolId) &&
      !isChoiceTool(selectedTool.toolId) &&
      selectedToolAvailability?.usable
  );
  const selectedChoiceOptions =
    selectedTool && isChoiceTool(selectedTool.toolId)
      ? getToolChoiceDefinitions(selectedTool.toolId)
      : [];
  const usableToolCount = me?.tools.filter((tool) => getToolAvailability(tool, me.tools).usable).length ?? 0;
  const interactionHint =
    snapshot?.settlementState === "complete"
      ? "本局竞速已经全部完赛，可以查看结算页，或继续留在房间里回看棋盘。"
      : describeInteractionHint(
          isMyTurn,
          activePhase,
          selectedTool,
          me?.tools ?? [],
          turnStartActions.length
        );

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

  const handleRoleSkillClick = (tool: TurnToolSnapshot) => {
    const tools = me?.tools ?? [];
    const availability = getToolAvailability(tool, tools);

    setSelectedToolInstanceId(tool.instanceId);

    if (!availability.usable) {
      showToolNotice(getBlockedToolMessage(tool, tools));
      return;
    }

    if (isAimTool(tool.toolId) || isChoiceTool(tool.toolId)) {
      return;
    }

    useInstantTool(tool.instanceId);
  };

  const handleSidebarToolClick = (tool: TurnToolSnapshot) => {
    const tools = me?.tools ?? [];
    const availability = getToolAvailability(tool, tools);

    setSelectedToolInstanceId(tool.instanceId);

    if (!availability.usable) {
      showToolNotice(getBlockedToolMessage(tool, tools));
    }
  };

  return (
    <aside className="hud-panel">
      <div className="brand-block">
        <p className="eyebrow">Watcher 原型</p>
        <h1>场景优先的骰子与工具回合</h1>
        <p className="lead">
          当前回合以统一的工具列表结算。移动本身也是工具，因此执行顺序、使用条件和后续强化都会走同一套扩展路径。
        </p>
      </div>

      <section className="status-card">
        <span className={`status-pill status-${connectionStatus}`}>
          {CONNECTION_STATUS_LABELS[connectionStatus]}
        </span>
        <p>{interactionHint}</p>
        {lastError ? <p className="error-copy">{lastError}</p> : null}
      </section>

      <section className="controls-card">
        <div className="role-skill-header">
          <div>
            <p className="section-title">玩法地图</p>
            <strong>{snapshot?.mapLabel ?? "等待地图加载"}</strong>
          </div>
          <span>{describeModeLabel(snapshot?.mode)}</span>
        </div>
        <div className="tool-grid">
          <button
            type="button"
            onClick={() => navigateToMap(DEFAULT_GAME_MAP_ID)}
            disabled={snapshot?.mapId === DEFAULT_GAME_MAP_ID}
          >
            自由模式
          </button>
          <button
            type="button"
            onClick={() => navigateToMap(RACE_GAME_MAP_ID)}
            disabled={snapshot?.mapId === RACE_GAME_MAP_ID}
          >
            竞速地图
          </button>
        </div>
        <p className="hint-copy">
          每张地图会绑定一种玩法模式。这一步先提供竞速地图入口，完整主页和房间流转下一步再接。
        </p>
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
            切换至 {nextRoleDefinition.label}
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
                  className={[
                    "tool-button",
                    selectedToolInstanceId === tool.instanceId ? "selected" : "",
                    !availability.usable ? "disabled" : ""
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-disabled={!availability.usable}
                  onClick={() => handleRoleSkillClick(tool)}
                >
                  {describeToolButtonLabel(tool)}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="hint-copy">这个角色当前没有可点击的主动技能。</p>
        )}
      </section>

      <section className="controls-card">
        <p className="section-title">回合开始</p>
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
        {turnStartActions.length ? (
          <div className="tool-grid role-skill-grid">
            {turnStartActions.map((action, index) => (
              <button
                key={`${action.characterId}-${action.actionId}`}
                type="button"
                data-testid={`turn-start-action-button-${index}`}
                className="tool-button"
                onClick={() => useTurnStartAction(action.actionId)}
                disabled={!isMyTurn || activePhase !== "roll"}
              >
                {TURN_START_ACTION_DEFINITIONS[action.actionId].label}
              </button>
            ))}
          </div>
        ) : (
          <p className="hint-copy">当前角色没有额外的回合开始技能。</p>
        )}
        {snapshot?.allowDebugTools ? (
          <>
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
          </>
        ) : (
          <p className="hint-copy">当前地图关闭了调试发牌，所有玩家按正式规则竞速到终点。</p>
        )}
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
                  className={[
                    "tool-button",
                    selectedToolInstanceId === tool.instanceId ? "selected" : "",
                    !availability.usable ? "disabled" : ""
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-disabled={!availability.usable}
                  onClick={() => handleSidebarToolClick(tool)}
                >
                  {describeToolButtonLabel(tool)}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="hint-copy">这个回合目前没有普通工具，可能只剩角色技能或已经全部用完。</p>
        )}
        {selectedToolDefinition && selectedTool ? (
          <div className="tool-detail" style={{ "--tool-accent": selectedToolDefinition.color } as CSSProperties}>
            <strong>{describeToolButtonLabel(selectedTool)}</strong>
            <p>{selectedToolDefinition.description}</p>
            {selectedToolParameters.length ? <p>{selectedToolParameters.join(" · ")}</p> : null}
            {!selectedToolAvailability?.usable ? (
              <p>{getToolDisabledMessage(selectedTool, me?.tools ?? [])}</p>
            ) : null}
          </div>
        ) : (
          <div className="tool-detail">
            <strong>尚未选择工具</strong>
            <p>可以从上方列表或场景中的头顶弧环选择一个工具。</p>
          </div>
        )}
        {selectedChoiceOptions.length && selectedTool ? (
          <div className="tool-grid role-skill-grid">
            {selectedChoiceOptions.map((choice) => (
              <button
                key={choice.id}
                type="button"
                className="tool-button"
                onClick={() => useChoiceTool(choice.id, selectedTool.instanceId)}
                disabled={!selectedToolAvailability?.usable}
              >
                {choice.label}
              </button>
            ))}
          </div>
        ) : null}
        {selectedChoiceOptions.length ? (
          <div className="character-passive-list">
            {selectedChoiceOptions.map((choice) => (
              <p key={`${selectedTool?.instanceId}-${choice.id}`} className="hint-copy">
                {choice.label}：{choice.description}
              </p>
            ))}
          </div>
        ) : null}
        {instantToolReady && selectedTool ? (
          <button
            type="button"
            data-testid="use-instant-tool-button"
            onClick={() => useInstantTool(selectedTool.instanceId)}
          >
            使用 {selectedToolDefinition?.label}
          </button>
        ) : null}
        <p className="hint-copy">灰色工具仍会显示在列表里，点击后会提示当前为什么不能使用。</p>
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
                  className={["player-observer-card", isObservedActive ? "active" : ""]
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
                      <p className="hint-copy">
                        {playerRole.label}
                        {player.finishRank
                          ? ` · 第 ${player.finishRank} 名 · 第 ${player.finishedTurnNumber} 回合到达`
                          : ""}
                      </p>
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
                            className={["player-tool-chip", availability.usable ? "" : "disabled"]
                              .filter(Boolean)
                              .join(" ")}
                          >
                            {describeToolButtonLabel(tool)}
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
          <span className="legend-swatch start" />
          出生点，竞速模式所有玩家共享起点
        </div>
        <div className="legend-row">
          <span className="legend-swatch goal" />
          终点，只会在自己的回合停留时触发到达
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
          加速带，平移经过时会加速或转向
        </div>
        <div className="legend-row">
          <span className="legend-swatch wallet" />
          钱包，领导经过自己的钱包时会拾取并获得一个工具骰
        </div>
        <div className="legend-row">
          <span className="legend-swatch active" />
          当前行动者标记
        </div>
      </section>
    </aside>
  );
}
