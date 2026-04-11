import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  TOOL_DEFINITIONS,
  describeToolButtonLabel,
  getCharacterDefinition,
  getDebugGrantableToolIds,
  getNextCharacterId,
  getToolAvailability,
  getToolDisabledMessage,
  getToolTextDescription,
  type ToolId,
  type TurnPhase,
  type TurnToolSnapshot
} from "@watcher/shared";
import {
  isChoiceInteractionTool,
  isInstantInteractionTool,
  isPointerDrivenInteractionTool
} from "../interaction/toolInteraction";
import { UiIcon } from "../assets/ui/icons";
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
  "turn-start": "回合开始阶段",
  "turn-action": "行动阶段",
  "turn-end": "回合结束阶段"
} as const;

const DEBUG_TOOL_OPTIONS = getDebugGrantableToolIds();

function describeModeLabel(mode: "free" | "race" | undefined): string {
  return mode === "race" ? "竞速模式" : "自由模式";
}

function describeLobbyHint(isHost: boolean, allReady: boolean): string {
  if (isHost && allReady) {
    return "所有在线玩家都已准备，房主现在可以开始游戏。";
  }

  if (isHost) {
    return "等待所有在线玩家准备完成后，由房主开始游戏。";
  }

  return "先准备，等待房主开始游戏。";
}

function describeInteractionHint(
  roomPhase: "lobby" | "in_game" | "settlement" | undefined,
  isMyTurn: boolean,
  phase: TurnPhase | null,
  selectedTool: TurnToolSnapshot | null,
  localTools: TurnToolSnapshot[]
): string {
  if (roomPhase === "lobby") {
    return "在房间中选择角色、查看玩家状态并准备。";
  }

  if (roomPhase === "settlement") {
    return "这局已经结算完成，可以查看结果或回到房间。";
  }

  if (!isMyTurn) {
    return "当前不是你的回合，请等待其他玩家行动。";
  }

  if (phase === "turn-start") {
    return localTools.length
      ? "你可以先使用回合开始阶段工具，或者直接投骰。"
      : "点击投骰开始本回合。";
  }

  if (!selectedTool) {
    return localTools.length ? "从工具列表中选择一个工具。" : "当前没有可用工具，可以结束回合。";
  }

  const availability = getToolAvailability(selectedTool, localTools);
  const label = TOOL_DEFINITIONS[selectedTool.toolId].label;

  if (!availability.usable) {
    return `${label} 当前不可用：${availability.reason ?? "条件不足"}。`;
  }

  if (isChoiceInteractionTool(selectedTool.toolId)) {
    return `先选择 ${label} 的结算方式。`;
  }

  if (isPointerDrivenInteractionTool(selectedTool.toolId)) {
    return `${label} 需要在场景里瞄准后释放。`;
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
  const endTurn = useGameStore((state) => state.endTurn);
  const setReady = useGameStore((state) => state.setReady);
  const kickPlayer = useGameStore((state) => state.kickPlayer);
  const startGame = useGameStore((state) => state.startGame);
  const returnToRoom = useGameStore((state) => state.returnToRoom);
  const setCharacter = useGameStore((state) => state.setCharacter);
  const grantDebugTool = useGameStore((state) => state.grantDebugTool);
  const useToolPayload = useGameStore((state) => state.useToolPayload);
  const [debugToolId, setDebugToolId] = useState<ToolId>(DEBUG_TOOL_OPTIONS[0] ?? "movement");
  const [copiedRoomCode, setCopiedRoomCode] = useState(false);

  const me = snapshot?.players.find((player) => player.id === sessionId) ?? null;
  const activePlayer = snapshot?.players.find((player) => player.id === snapshot.turnInfo.currentPlayerId) ?? null;
  const connectedPlayers = useMemo(() => snapshot?.players.filter((player) => player.isConnected) ?? [], [snapshot]);
  const allConnectedPlayersReady =
    connectedPlayers.length > 0 && connectedPlayers.every((player) => player.isReady);
  const isHost = Boolean(sessionId && snapshot?.hostPlayerId === sessionId);
  const isMyTurn = Boolean(snapshot?.roomPhase === "in_game" && sessionId && activePlayer?.id === sessionId);
  const activePhase = snapshot?.turnInfo.phase ?? null;
  const selectedTool = findSelectedTool(snapshot, sessionId, selectedToolInstanceId);
  const selectedToolDefinition = selectedTool ? TOOL_DEFINITIONS[selectedTool.toolId] : null;
  const selectedToolTextDescription = selectedTool ? getToolTextDescription(selectedTool) : null;
  const selectedToolAvailability =
    selectedTool && me ? getToolAvailability(selectedTool, me.tools) : null;
  const roleDefinition = me ? getCharacterDefinition(me.characterId) : null;
  const nextCharacterId = me ? getNextCharacterId(me.characterId) : "late";
  const nextRoleDefinition = getCharacterDefinition(nextCharacterId);
  const tools = useMemo(() => me?.tools ?? [], [me]);
  const otherPlayers = snapshot?.players.filter((player) => player.id !== sessionId) ?? [];
  const instantToolReady = Boolean(
    selectedTool &&
      selectedToolDefinition &&
      isInstantInteractionTool(selectedTool.toolId) &&
      selectedToolAvailability?.usable
  );
  const interactionHint = describeInteractionHint(
    snapshot?.roomPhase,
    isMyTurn,
    activePhase,
    selectedTool,
    tools
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

  const handleToolClick = (tool: TurnToolSnapshot) => {
    const availability = getToolAvailability(tool, tools);

    setSelectedToolInstanceId(tool.instanceId);

    if (!availability.usable) {
      showToolNotice(getBlockedToolMessage(tool, tools));
      return;
    }

    if (!isInstantInteractionTool(tool.toolId)) {
      return;
    }

    useToolPayload({ input: {} }, tool.instanceId);
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

  const copyRoomCode = async () => {
    if (!navigator.clipboard?.writeText) {
      showToolNotice("当前浏览器无法复制房间号。");
      return;
    }

    try {
      await navigator.clipboard.writeText(snapshot.roomCode);
      setCopiedRoomCode(true);
      window.setTimeout(() => setCopiedRoomCode(false), 1400);
    } catch {
      showToolNotice("当前浏览器无法复制房间号。");
    }
  };

  return (
    <aside className="hud-panel">
      <div className="brand-block room-brand-block">
        <div>
          <p className="eyebrow">Watcher Room</p>
          <h1>{snapshot.mapLabel}</h1>
          <div className="room-code-block">
            <span className="room-code-label">房间号</span>
            <div className="room-code-row">
              <strong>{snapshot.roomCode}</strong>
              <button
                type="button"
                className="room-code-copy-button"
                aria-label="复制房间号"
                onClick={() => void copyRoomCode()}
              >
                <UiIcon name="copy" />
                <span>{copiedRoomCode ? "已复制" : "复制"}</span>
              </button>
            </div>
            <p className="lead">{describeModeLabel(snapshot.mode)}</p>
          </div>
        </div>
        <button
          type="button"
          className="room-home-button"
          aria-label="返回主页"
          title="返回主页"
          onClick={onLeaveRoom}
        >
          <UiIcon name="home" />
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
        {toolNotice ? <p className="hint-copy">{toolNotice.message}</p> : null}
      </section>

      {snapshot.roomPhase === "lobby" ? (
        <>
          <section className="controls-card">
            <div className="role-skill-header">
              <p className="section-title">房间玩家</p>
              <span>{snapshot.players.length} 名</span>
            </div>
            <p className="hint-copy">{describeLobbyHint(isHost, allConnectedPlayersReady)}</p>
            <div className="lobby-player-list">
              {snapshot.players.map((player) => {
                const isMe = player.id === sessionId;
                const characterDefinition = getCharacterDefinition(player.characterId);

                return (
                  <article key={player.id} className="lobby-player-card">
                    <PetThumbnail color={player.color} fallbackSeed={player.id} petId={player.petId} />
                    <div className="lobby-player-copy">
                      <div className="player-name-line">
                        <span className="player-swatch" style={{ "--player-accent": player.color } as CSSProperties} />
                        <strong>{player.name}</strong>
                        {snapshot.hostPlayerId === player.id ? <span className="mini-pill">房主</span> : null}
                      </div>
                      <p className="hint-copy">{characterDefinition.label}</p>
                      <div className="lobby-player-flags">
                        <span className={`mini-pill ${player.isConnected ? "" : "offline"}`}>
                          {player.isConnected ? "在线" : "离线保留中"}
                        </span>
                        <span className={`mini-pill ${player.isReady ? "ready" : ""}`}>
                          {player.isReady ? "已准备" : "未准备"}
                        </span>
                      </div>
                    </div>
                    {isMe ? (
                      <div className="lobby-player-actions">
                        <button type="button" data-testid="lobby-ready-button" onClick={() => setReady(!player.isReady)}>
                          {player.isReady ? "取消准备" : "准备"}
                        </button>
                        <button
                          type="button"
                          className="ghost-button"
                          data-testid="switch-character-button"
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
                <span className="player-swatch" style={{ "--player-accent": me?.color ?? "#c9b182" } as CSSProperties} />
                <strong>{me?.name ?? "--"}</strong>
              </div>
              <span>{me ? `(${me.position.x}, ${me.position.y})` : "--"}</span>
            </div>
            <div className="info-card">
              <p className="info-label">当前回合</p>
              <div className="player-name-line">
                <span className="player-swatch" style={{ "--player-accent": activePlayer?.color ?? "#c9b182" } as CSSProperties} />
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
                disabled={!isMyTurn || activePhase !== "turn-start" || !me}
              >
                切换到 {nextRoleDefinition.label}
              </button>
            </div>
            <p className="character-summary">{roleDefinition?.summary ?? "等待角色数据同步。"}</p>
          </section>

          <section className="controls-card">
            <p className="section-title">回合控制</p>
            <div className="action-row">
              <button
                type="button"
                data-testid="roll-dice-button"
                onClick={() => rollDice()}
                disabled={!isMyTurn || activePhase !== "turn-start"}
              >
                投骰
              </button>
              <button
                type="button"
                data-testid="end-turn-button"
                onClick={() => endTurn()}
                disabled={!isMyTurn || activePhase !== "turn-action"}
              >
                结束回合
              </button>
                {snapshot.roomPhase === "settlement" ? (
                  <button type="button" className="ghost-button" onClick={() => returnToRoom()}>
                    <UiIcon name="return" />
                    <span>返回房间</span>
                  </button>
                ) : null}
            </div>
            {snapshot.allowDebugTools ? (
              <>
                <div className="debug-grant-row">
                  <select
                    value={debugToolId}
                    onChange={(event) => setDebugToolId(event.target.value as ToolId)}
                    disabled={!isMyTurn || activePhase !== "turn-action"}
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
                    disabled={!isMyTurn || activePhase !== "turn-action"}
                  >
                    获取调试工具
                  </button>
                </div>
                <p className="hint-copy">调试地图中，行动阶段可直接领取已实现工具。</p>
              </>
            ) : (
              <p className="hint-copy">当前地图关闭调试发牌，需按正式规则推进。</p>
            )}
          </section>

          <section className="tool-card">
            <div className="role-skill-header">
              <p className="section-title">当前工具</p>
              <span>{tools.length ? `${tools.length} 个` : "暂无"}</span>
            </div>
            {tools.length ? (
              <div className="tool-grid">
                {tools.map((tool, index) => {
                  const availability = getToolAvailability(tool, tools);

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
                      onClick={() => handleToolClick(tool)}
                    >
                      {describeToolButtonLabel(tool)}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="hint-copy">这个阶段目前没有工具。</p>
            )}
            {selectedToolDefinition && selectedTool ? (
              <div className="tool-detail" style={{ "--tool-accent": selectedToolDefinition.color } as CSSProperties}>
                <strong>{describeToolButtonLabel(selectedTool)}</strong>
                <p>{selectedToolTextDescription?.description ?? selectedToolDefinition.description}</p>
                {selectedToolTextDescription?.details.length ? (
                  <p>{selectedToolTextDescription.details.join(" · ")}</p>
                ) : null}
                {!selectedToolAvailability?.usable ? <p>{getToolDisabledMessage(selectedTool, tools)}</p> : null}
              </div>
            ) : (
              <div className="tool-detail">
                <strong>尚未选择工具</strong>
                <p>从列表中选择一个工具，或在场景中的弧形 HUD 中选择。</p>
              </div>
            )}
            {instantToolReady && selectedTool ? (
              <button
                type="button"
                data-testid="use-instant-tool-button"
                onClick={() => useToolPayload({ input: {} }, selectedTool.instanceId)}
              >
                使用 {selectedToolDefinition?.label}
              </button>
            ) : null}
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
                            <span className="player-swatch" style={{ "--player-accent": player.color } as CSSProperties} />
                            <strong>{player.name}</strong>
                          </div>
                          <p className="hint-copy">{playerRole.label}</p>
                        </div>
                        <span>{`(${player.position.x}, ${player.position.y})`}</span>
                      </div>
                      {player.tools.length ? (
                        <div className="player-tool-chip-grid">
                          {player.tools.map((tool) => (
                            <span key={tool.instanceId} className="player-tool-chip">
                              {describeToolButtonLabel(tool)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="hint-copy">这个阶段当前没有工具。</p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="hint-copy">房间里暂时没有其他玩家。</p>
            )}
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
