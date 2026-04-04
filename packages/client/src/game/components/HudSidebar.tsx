import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
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
import { PetThumbnail } from "./PetThumbnail";

const CONNECTION_STATUS_LABELS = {
  idle: "空闲",
  connecting: "连接中",
  connected: "已连接",
  disconnected: "已断开",
  error: "错误"
} as const;

const ROOM_PHASE_LABELS = {
  lobby: "房间中",
  in_game: "对局中",
  settlement: "结算中"
} as const;

const TURN_PHASE_LABELS = {
  roll: "投骰阶段",
  action: "行动阶段"
} as const;

const DEBUG_TOOL_OPTIONS = getDebugGrantableToolIds();

function describeModeLabel(mode: "free" | "race" | undefined): string {
  return mode === "race" ? "竞速模式" : "自由模式";
}

function describeLobbyHint(isHost: boolean, allReady: boolean): string {
  if (isHost && allReady) {
    return "所有玩家都已准备，房主现在可以开始游戏。";
  }

  if (isHost) {
    return "等待所有在线玩家准备完成后，由房主开始游戏。";
  }

  return "在自己的棋子旁点击准备，等房主开始游戏。";
}

function describeInteractionHint(
  roomPhase: "lobby" | "in_game" | "settlement" | undefined,
  isMyTurn: boolean,
  phase: "roll" | "action" | null,
  selectedTool: TurnToolSnapshot | null,
  localTools: TurnToolSnapshot[],
  turnStartActionCount: number
): string {
  if (roomPhase === "lobby") {
    return "房间尚未开始，左侧可调整角色、查看玩家状态并准备。";
  }

  if (roomPhase === "settlement") {
    return "这局已经结算完成，可以查看排行榜，或回到房间重新准备下一局。";
  }

  if (!isMyTurn) {
    return "当前不是你的回合，请等待其他玩家行动。";
  }

  if (phase === "roll") {
    return turnStartActionCount
      ? "先决定是否使用回合开始技能，然后再投骰。"
      : "点击投骰开始本回合。";
  }

  if (!selectedTool) {
    return localTools.length
      ? "从左侧列表或场景弧形 UI 里选择一个工具。"
      : "本回合已经没有可用工具，可以结束回合。";
  }

  const availability = getToolAvailability(selectedTool, localTools);
  const label = TOOL_DEFINITIONS[selectedTool.toolId].label;

  if (!availability.usable) {
    return `${label} 当前不可用：${availability.reason ?? "条件不足"}。`;
  }

  if (isDirectionalTool(selectedTool.toolId)) {
    return `按住 ${label} 并拖出方向，松手执行，右键取消。`;
  }

  if (isTileTargetTool(selectedTool.toolId)) {
    return `按住 ${label} 并拖到目标格，松手执行。`;
  }

  if (isTileDirectionTool(selectedTool.toolId)) {
    return `按住 ${label}，先选目标格，再拖出方向后松手。`;
  }

  if (isChoiceTool(selectedTool.toolId)) {
    return `先在下方选择 ${label} 的结算方式。`;
  }

  return `点击按钮使用 ${label}。`;
}

function getBlockedToolMessage(tool: TurnToolSnapshot, tools: TurnToolSnapshot[]): string {
  return getToolDisabledMessage(tool, tools) ?? `${TOOL_DEFINITIONS[tool.toolId].label} 当前不可用。`;
}

export function HudSidebar({ onLeaveRoom }: { onLeaveRoom: () => void }) {
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
  const setReady = useGameStore((state) => state.setReady);
  const kickPlayer = useGameStore((state) => state.kickPlayer);
  const startGame = useGameStore((state) => state.startGame);
  const setCharacter = useGameStore((state) => state.setCharacter);
  const grantDebugTool = useGameStore((state) => state.grantDebugTool);
  const useInstantTool = useGameStore((state) => state.useInstantTool);
  const useChoiceTool = useGameStore((state) => state.useChoiceTool);
  const [debugToolId, setDebugToolId] = useState<ToolId>(DEBUG_TOOL_OPTIONS[0] ?? "movement");

  const me = snapshot?.players.find((player) => player.id === sessionId) ?? null;
  const hostPlayer = snapshot?.players.find((player) => player.id === snapshot.hostPlayerId) ?? null;
  const activePlayer =
    snapshot?.players.find((player) => player.id === snapshot.turnInfo.currentPlayerId) ?? null;
  const connectedPlayers = useMemo(
    () => snapshot?.players.filter((player) => player.isConnected) ?? [],
    [snapshot]
  );
  const allConnectedPlayersReady =
    connectedPlayers.length > 0 && connectedPlayers.every((player) => player.isReady);
  const isHost = Boolean(sessionId && snapshot?.hostPlayerId === sessionId);
  const isMyTurn = Boolean(
    snapshot?.roomPhase === "in_game" &&
      activePlayer &&
      sessionId &&
      activePlayer.id === sessionId
  );
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
  const selectedChoiceOptions =
    selectedTool && isChoiceTool(selectedTool.toolId)
      ? getToolChoiceDefinitions(selectedTool.toolId)
      : [];
  const instantToolReady = Boolean(
    selectedTool &&
      selectedToolDefinition &&
      !isAimTool(selectedTool.toolId) &&
      !isChoiceTool(selectedTool.toolId) &&
      selectedToolAvailability?.usable
  );
  const usableToolCount =
    me?.tools.filter((tool) => getToolAvailability(tool, me.tools).usable).length ?? 0;
  const interactionHint = describeInteractionHint(
    snapshot?.roomPhase,
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

  if (!snapshot) {
    return (
      <aside className="hud-panel">
        <section className="status-card">
          <span className={`status-pill status-${connectionStatus}`}>
            {CONNECTION_STATUS_LABELS[connectionStatus]}
          </span>
          <p>正在等待房间状态同步。</p>
          {lastError ? <p className="error-copy">{lastError}</p> : null}
        </section>
      </aside>
    );
  }

  return (
    <aside className="hud-panel">
      <div className="brand-block room-brand-block">
        <div>
          <p className="eyebrow">Watcher Room</p>
          <h1>{snapshot.mapLabel}</h1>
          <p className="lead">
            房间号 {snapshot.roomCode} · {describeModeLabel(snapshot.mode)}
          </p>
        </div>
        <button type="button" className="ghost-button" onClick={onLeaveRoom}>
          返回主页
        </button>
      </div>

      <section className="status-card">
        <div className="room-status-row">
          <span className={`status-pill status-${connectionStatus}`}>
            {CONNECTION_STATUS_LABELS[connectionStatus]}
          </span>
          <span className="status-pill status-connected">
            {ROOM_PHASE_LABELS[snapshot.roomPhase]}
          </span>
        </div>
        <p>{interactionHint}</p>
        {lastError ? <p className="error-copy">{lastError}</p> : null}
      </section>

      <section className="controls-card">
        <div className="role-skill-header">
          <div>
            <p className="section-title">房间信息</p>
            <strong>{hostPlayer ? `房主：${hostPlayer.name}` : "等待房主"}</strong>
          </div>
          <span>{connectedPlayers.length} / {snapshot.players.length} 在线</span>
        </div>
        <p className="hint-copy">
          {snapshot.roomPhase === "lobby"
            ? describeLobbyHint(isHost, allConnectedPlayersReady)
            : snapshot.allowDebugTools
              ? "当前地图允许调试工具。"
              : "当前地图关闭调试发牌。"}
        </p>
      </section>

      {snapshot.roomPhase === "lobby" ? (
        <>
          <section className="controls-card">
            <div className="role-skill-header">
              <p className="section-title">房间玩家</p>
              <span>{snapshot.players.length} 名</span>
            </div>
            <div className="lobby-player-list">
              {snapshot.players.map((player) => {
                const isMe = player.id === sessionId;
                const characterDefinition = getCharacterDefinition(player.characterId);

                return (
                  <article key={player.id} className="lobby-player-card">
                    <PetThumbnail color={player.color} fallbackSeed={player.id} petId={player.petId} />
                    <div className="lobby-player-copy">
                      <div className="player-name-line">
                        <span
                          className="player-swatch"
                          style={{ "--player-accent": player.color } as CSSProperties}
                        />
                        <strong>{player.name}</strong>
                        {snapshot.hostPlayerId === player.id ? (
                          <span className="mini-pill">房主</span>
                        ) : null}
                      </div>
                      <p className="hint-copy">
                        {characterDefinition.label} · {player.id}
                      </p>
                      <div className="lobby-player-flags">
                        <span className={`mini-pill ${player.isConnected ? "" : "offline"}`}>
                          {player.isConnected ? "在线" : "断线保留中"}
                        </span>
                        <span className={`mini-pill ${player.isReady ? "ready" : ""}`}>
                          {player.isReady ? "已准备" : "未准备"}
                        </span>
                      </div>
                    </div>
                    {isMe ? (
                      <div className="lobby-player-actions">
                        <button
                          type="button"
                          data-testid="lobby-ready-button"
                          onClick={() => setReady(!player.isReady)}
                        >
                          {player.isReady ? "取消准备" : "准备"}
                        </button>
                        <button
                          type="button"
                          data-testid="switch-character-button"
                          className="ghost-button"
                          onClick={() => setCharacter(nextCharacterId)}
                        >
                          切换到 {nextRoleDefinition.label}
                        </button>
                      </div>
                    ) : isHost ? (
                      <div className="lobby-player-actions">
                        <button
                          type="button"
                          className="ghost-button"
                          data-testid={`kick-player-${player.id}`}
                          onClick={() => kickPlayer(player.id)}
                        >
                          踢出玩家
                        </button>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>

          <section className="character-card">
            <div className="character-card__header">
              <div>
                <p className="section-title">我的角色</p>
                <strong>{roleDefinition?.label ?? "--"}</strong>
              </div>
              {me ? <span>{me.isReady ? "已准备" : "待准备"}</span> : null}
            </div>
            <p className="character-summary">{roleDefinition?.summary ?? "等待角色数据同步。"}</p>
          </section>

          <section className="controls-card">
            <p className="section-title">开局</p>
            <div className="action-row">
              <button
                type="button"
                data-testid="start-game-button"
                onClick={() => startGame()}
                disabled={!isHost || !allConnectedPlayersReady}
              >
                开始游戏
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={() => setReady(!(me?.isReady ?? false))}
                disabled={!me}
              >
                {me?.isReady ? "取消准备" : "准备"}
              </button>
            </div>
          </section>
        </>
      ) : (
        <>
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
                切换到 {nextRoleDefinition.label}
              </button>
            </div>
            <p className="character-summary">{roleDefinition?.summary ?? "等待角色数据同步。"}</p>
            {/* <div className="role-skill-header">
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
            )} */}
          </section>
          
          <section className="player-observer-section">
            <div className="role-skill-header">
              <p className="section-title">其他玩家</p>
              <span>{otherPlayers.length ? `${otherPlayers.length} 名` : "暂无"}</span>
            </div>
            {otherPlayers.length ? (
              <div className="player-observer-list">
                {otherPlayers.map((player) => {
                  const isObservedActive = snapshot.turnInfo.currentPlayerId === player.id;
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
                                className={[
                                  "player-tool-chip",
                                  availability.usable ? "" : "disabled"
                                ]
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


          <section className="controls-card">
            <p className="section-title">回合控制</p>
            <div className="action-row">
              <button
                type="button"
                data-testid="roll-dice-button"
                onClick={() => rollDice()}
                disabled={!isMyTurn || activePhase !== "roll"}
              >
                投骰
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
            {snapshot.allowDebugTools ? (
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
                <p className="hint-copy">调试地图中，行动阶段可以直接领取任意已实现工具。</p>
              </>
            ) : (
              <p className="hint-copy">当前地图关闭调试发牌，玩家需按正式规则推进。</p>
            )}
          </section>

          {/* <section className="roll-card">
            <p className="section-title">本回合骰面</p>
            <div className="roll-grid">
              <div className="info-card compact">
                <p className="info-label">移动骰</p>
                <strong>{snapshot.turnInfo.moveRoll}</strong>
              </div>
              <div className="info-card compact">
                <p className="info-label">工具骰</p>
                <strong>
                  {snapshot.turnInfo.lastRolledToolId
                    ? TOOL_DEFINITIONS[snapshot.turnInfo.lastRolledToolId].label
                    : "--"}
                </strong>
              </div>
              <div className="info-card compact">
                <p className="info-label">工具总数</p>
                <strong>{me?.tools.length ?? 0}</strong>
              </div>
              <div className="info-card compact">
                <p className="info-label">可用工具</p>
                <strong>{usableToolCount}</strong>
              </div>
            </div>
          </section> */}

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
              <p className="hint-copy">这个回合目前没有普通工具了。</p>
            )}
            {selectedToolDefinition && selectedTool ? (
              <div
                className="tool-detail"
                style={{ "--tool-accent": selectedToolDefinition.color } as CSSProperties}
              >
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
                <p>可以从左侧列表或场景中的弧形 UI 里选择一个工具。</p>
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
          </section>

          <section className="legend-card">
            <p className="section-title">棋盘图例</p>
            <div className="legend-row">
              <span className="legend-swatch floor" />
              普通地块
            </div>
            <div className="legend-row">
              <span className="legend-swatch start" />
              出生点，竞速模式下所有玩家共享起点
            </div>
            <div className="legend-row">
              <span className="legend-swatch goal" />
              终点，只会在自己的回合停留时计入到达
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
              幸运方块，每回合最多赠送一次工具
            </div>
            <div className="legend-row">
              <span className="legend-swatch conveyor" />
              加速带，平移经过时会加速或转向
            </div>
            <div className="legend-row">
              <span className="legend-swatch wallet" />
              钱包，领导经过后会拾取并获得额外工具
            </div>
            <div className="legend-row">
              <span className="legend-swatch active" />
              当前行动玩家高亮
            </div>
          </section>
        </>
      )}

      <section className="log-card">
        <p className="section-title">事件日志</p>
        {snapshot.eventLog.length ? (
          <ul>
            {snapshot.eventLog.slice(0, 8).map((entry) => (
              <li key={entry.id}>{entry.message}</li>
            ))}
          </ul>
        ) : (
          <p className="hint-copy">当前还没有新的房间事件。</p>
        )}
      </section>
    </aside>
  );
}
