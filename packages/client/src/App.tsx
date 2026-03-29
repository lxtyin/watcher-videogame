import { useEffect, type CSSProperties } from "react";
import { TOOL_DEFINITIONS, isDirectionalTool, type Direction } from "@watcher/shared";
import { GameBoardCanvas } from "./game/components/GameBoardCanvas";
import { useWatcherConnection } from "./game/network/useWatcherConnection";
import {
  useGameStore,
  type SelectedActionId
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

function useKeyboardInteraction(): void {
  const selectedActionId = useGameStore((state) => state.selectedActionId);
  const performDirectionalAction = useGameStore((state) => state.performDirectionalAction);
  const rollDice = useGameStore((state) => state.rollDice);
  const endTurn = useGameStore((state) => state.endTurn);
  const useInstantTool = useGameStore((state) => state.useInstantTool);

  useEffect(() => {
    // Keyboard input stays thin and forwards intent to the authoritative room.
    const onKeyDown = (event: KeyboardEvent) => {
      const direction = MOVEMENT_KEYS[event.key];

      if (direction) {
        event.preventDefault();
        performDirectionalAction(direction);
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
        selectedActionId !== "move" &&
        !isDirectionalTool(selectedActionId)
      ) {
        event.preventDefault();
        useInstantTool();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [endTurn, performDirectionalAction, rollDice, selectedActionId, useInstantTool]);
}

function useActionSelectionGuard(): void {
  const snapshot = useGameStore((state) => state.snapshot);
  const sessionId = useGameStore((state) => state.sessionId);
  const selectedActionId = useGameStore((state) => state.selectedActionId);
  const setSelectedActionId = useGameStore((state) => state.setSelectedActionId);

  useEffect(() => {
    if (!snapshot || !sessionId || selectedActionId === "move") {
      return;
    }

    const me = snapshot.players.find((player) => player.id === sessionId);
    const hasSelectedTool = me?.availableTools.some((tool) => tool.id === selectedActionId);

    if (!hasSelectedTool) {
      setSelectedActionId("move");
    }
  }, [selectedActionId, sessionId, setSelectedActionId, snapshot]);
}

function useAnimationClock(): void {
  const tickRealTime = useGameStore((state) => state.tickRealTime);

  useEffect(() => {
    let frameId = 0;
    let previousTime = performance.now();

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

function useAutomationBridge(): void {
  const advanceTime = useGameStore((state) => state.advanceTime);

  useEffect(() => {
    // These hooks let browser automation inspect and drive the prototype deterministically.
    window.advanceTime = (ms: number) => {
      advanceTime(ms);
    };

    window.render_game_to_text = () => {
      const state = useGameStore.getState();
      const payload = {
        mode: state.connectionStatus,
        coordinateSystem: "origin=(0,0) at the top-left of the board, x grows right, y grows down",
        sessionId: state.sessionId,
        timeMs: state.simulationTimeMs,
        selectedActionId: state.selectedActionId,
        snapshot: state.snapshot
      };

      return JSON.stringify(payload);
    };

    return () => {
      window.advanceTime = undefined;
      window.render_game_to_text = undefined;
    };
  }, [advanceTime]);
}

function describeInteractionHint(
  isMyTurn: boolean,
  phase: "roll" | "action" | null,
  selectedActionId: SelectedActionId
): string {
  if (!isMyTurn) {
    return "Waiting for your turn.";
  }

  if (phase === "roll") {
    return "Roll the dice to get move points and a tool for this turn.";
  }

  if (selectedActionId === "move") {
    return "Drag from your piece in the 3D board to choose a movement direction.";
  }

  if (isDirectionalTool(selectedActionId)) {
    return `Drag from your piece in the 3D board to aim ${TOOL_DEFINITIONS[selectedActionId].label}.`;
  }

  return `Use ${TOOL_DEFINITIONS[selectedActionId].label} from the action card or press Enter.`;
}

export default function App() {
  useWatcherConnection();
  useKeyboardInteraction();
  useActionSelectionGuard();
  useAnimationClock();
  useAutomationBridge();

  const connectionStatus = useGameStore((state) => state.connectionStatus);
  const lastError = useGameStore((state) => state.lastError);
  const snapshot = useGameStore((state) => state.snapshot);
  const sessionId = useGameStore((state) => state.sessionId);
  const selectedActionId = useGameStore((state) => state.selectedActionId);
  const setSelectedActionId = useGameStore((state) => state.setSelectedActionId);
  const rollDice = useGameStore((state) => state.rollDice);
  const endTurn = useGameStore((state) => state.endTurn);
  const useInstantTool = useGameStore((state) => state.useInstantTool);

  const me = snapshot?.players.find((player) => player.id === sessionId) ?? null;
  const activePlayer = snapshot?.players.find((player) => player.id === snapshot.turnInfo.currentPlayerId) ?? null;
  const isMyTurn = Boolean(activePlayer && sessionId && activePlayer.id === sessionId);
  const activePhase = snapshot?.turnInfo.phase ?? null;
  const selectedToolDefinition =
    selectedActionId === "move" ? null : TOOL_DEFINITIONS[selectedActionId];
  const instantToolReady =
    selectedActionId !== "move" &&
    !isDirectionalTool(selectedActionId) &&
    me?.availableTools.some((tool) => tool.id === selectedActionId);

  const interactionHint = describeInteractionHint(isMyTurn, activePhase, selectedActionId);

  return (
    <div className="app-shell">
      <aside className="hud-panel">
        <div className="brand-block">
          <p className="eyebrow">Watcher Prototype</p>
          <h1>Dice, tools, and drag-to-aim actions</h1>
          <p className="lead">
            Roll first, pick an action, then aim movement or directional tools directly inside the board.
          </p>
        </div>

        <section className="status-card">
          <span className={`status-pill status-${connectionStatus}`}>{connectionStatus}</span>
          <p>{interactionHint}</p>
          {lastError ? <p className="error-copy">{lastError}</p> : null}
        </section>

        <section className="info-grid">
          <div className="info-card">
            <p className="info-label">You</p>
            <strong>{me?.name ?? "Connecting..."}</strong>
            <span>{me ? `(${me.position.x}, ${me.position.y})` : "--"}</span>
          </div>
          <div className="info-card">
            <p className="info-label">Active Turn</p>
            <strong>{activePlayer?.name ?? "--"}</strong>
            <span>{snapshot ? activePhase : "--"}</span>
          </div>
        </section>

        <section className="controls-card">
          <p className="section-title">Turn Flow</p>
          <div className="action-row">
            <button
              type="button"
              data-testid="roll-dice-button"
              onClick={() => rollDice()}
              disabled={!isMyTurn || activePhase !== "roll"}
            >
              Roll Dice
            </button>
            <button
              type="button"
              data-testid="end-turn-button"
              onClick={() => endTurn()}
              disabled={!isMyTurn || activePhase !== "action"}
            >
              End Turn
            </button>
          </div>
          <p className="hint-copy">Keyboard: `R` rolls dice, `E` ends the turn.</p>
        </section>

        <section className="roll-card">
          <p className="section-title">Current Roll</p>
          <div className="roll-grid">
            <div className="info-card compact">
              <p className="info-label">Move Die</p>
              <strong>{snapshot?.turnInfo.moveRoll ?? 0}</strong>
            </div>
            <div className="info-card compact">
              <p className="info-label">Move Points</p>
              <strong>{me?.remainingMovePoints ?? 0}</strong>
            </div>
            <div className="info-card compact">
              <p className="info-label">Segments</p>
              <strong>{me?.movementActionsRemaining ?? 0}</strong>
            </div>
            <div className="info-card compact">
              <p className="info-label">Tool Die</p>
              <strong>
                {snapshot?.turnInfo.lastRolledToolId
                  ? TOOL_DEFINITIONS[snapshot.turnInfo.lastRolledToolId].label
                  : "--"}
              </strong>
            </div>
          </div>
        </section>

        <section className="tool-card">
          <p className="section-title">Action Mode</p>
          <div className="tool-grid">
            <button
              type="button"
              data-testid="action-select-move"
              className={selectedActionId === "move" ? "tool-button selected" : "tool-button"}
              onClick={() => setSelectedActionId("move")}
            >
              Move
            </button>
            {me?.availableTools.map((tool) => {
              const definition = TOOL_DEFINITIONS[tool.id];

              return (
                <button
                  key={tool.id}
                  type="button"
                  data-testid={`tool-button-${tool.id}`}
                  className={selectedActionId === tool.id ? "tool-button selected" : "tool-button"}
                  onClick={() => setSelectedActionId(tool.id)}
                >
                  {definition.label} x{tool.charges}
                </button>
              );
            })}
          </div>
          {selectedToolDefinition ? (
            <div className="tool-detail" style={{ "--tool-accent": selectedToolDefinition.color } as CSSProperties}>
              <strong>{selectedToolDefinition.label}</strong>
              <p>{selectedToolDefinition.description}</p>
            </div>
          ) : (
            <div className="tool-detail">
              <strong>Move</strong>
              <p>Spend your rolled move points in one chosen direction.</p>
            </div>
          )}
          {instantToolReady ? (
            <button
              type="button"
              data-testid="use-instant-tool-button"
              onClick={() => useInstantTool()}
            >
              Use {selectedToolDefinition?.label}
            </button>
          ) : null}
          <p className="hint-copy">Arrow keys and `WASD` use the currently selected directional action.</p>
        </section>

        <section className="legend-card">
          <p className="section-title">Board Legend</p>
          <div className="legend-row">
            <span className="legend-swatch floor" />
            Floor cube
          </div>
          <div className="legend-row">
            <span className="legend-swatch wall" />
            Solid wall cube
          </div>
          <div className="legend-row">
            <span className="legend-swatch earth-wall" />
            Earth wall cube
          </div>
          <div className="legend-row">
            <span className="legend-swatch active" />
            Active turn marker
          </div>
        </section>

        {/* <section className="log-card">
          <p className="section-title">Latest Events</p>
          <ul>
            {snapshot?.eventLog.length ? (
              snapshot.eventLog
                .slice()
                .reverse()
                .map((event) => <li key={event.id}>{event.message}</li>)
            ) : (
              <li>Waiting for room events...</li>
            )}
          </ul>
        </section> */}
      </aside>

      <main className="scene-panel">
        <GameBoardCanvas />
      </main>
    </div>
  );
}
