import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  TOOL_DEFINITIONS,
  describeToolButtonLabel,
  describeToolParameters,
  getCharacterDefinition,
  getDebugGrantableToolIds,
  getNextCharacterId,
  getToolAvailability,
  getToolDisabledMessage,
  isAimTool,
  isCharacterSkillTool,
  isDirectionalTool,
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
    return "点击棋子头顶的骰子开始投掷，或按 R。";
  }

  if (!selectedTool) {
    return localTools.length
      ? "从头顶弧环中选择一个可用工具。灰色按钮表示当前条件未满足。"
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
      selectedToolAvailability?.usable
  );
  const usableToolCount = me?.tools.filter((tool) => getToolAvailability(tool, me.tools).usable).length ?? 0;
  const interactionHint = describeInteractionHint(isMyTurn, activePhase, selectedTool, me?.tools ?? []);

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
        <p className="hint-copy">主动技能会出现在这里，也会同步显示在场景中的头顶弧环。</p>
        <p className="hint-copy">切换角色只允许在投骰前进行，这样本回合工具列表会保持稳定。</p>
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
        <p className="hint-copy">主要操作都在棋子头顶完成。键盘辅助：`R` 投骰，`E` 结束回合，方向键执行当前定向工具。</p>
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
            <p>可以从上方列表或场景里的头顶弧环选择一个工具。</p>
          </div>
        )}
        {instantToolReady && selectedTool ? (
          <button
            type="button"
            data-testid="use-instant-tool-button"
            onClick={() => useInstantTool(selectedTool.instanceId)}
          >
            使用 {selectedToolDefinition?.label}
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
  );
}
