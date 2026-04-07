import { useEffect } from "react";
import {
  createDirectionSelection,
  getToolInteractionDefinition,
  type Direction
} from "@watcher/shared";
import { useGameStore } from "../state/useGameStore";
import { getSelectedToolState } from "../state/toolSelection";

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

// Keyboard input remains a convenience layer on top of the same store actions as the scene.
export function useKeyboardInteraction(): void {
  const snapshot = useGameStore((state) => state.snapshot);
  const sessionId = useGameStore((state) => state.sessionId);
  const selectedToolInstanceId = useGameStore((state) => state.selectedToolInstanceId);
  const useToolPayload = useGameStore((state) => state.useToolPayload);
  const rollDice = useGameStore((state) => state.rollDice);
  const endTurn = useGameStore((state) => state.endTurn);

  useEffect(() => {
    // One handler keeps keyboard shortcuts aligned with the current selected tool.
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;

      if (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT")
      ) {
        return;
      }

      if (!snapshot || snapshot.roomPhase !== "in_game") {
        return;
      }

      const direction = MOVEMENT_KEYS[event.key];
      const selectedToolState = getSelectedToolState(
        snapshot,
        sessionId,
        selectedToolInstanceId
      );
      const interaction = selectedToolState
        ? getToolInteractionDefinition(selectedToolState.tool.toolId)
        : null;
      const firstStage = interaction?.stages[0];

      if (
        direction &&
        selectedToolState?.availability.usable &&
        interaction?.stages.length === 1 &&
        firstStage?.kind === "drag-direction-release"
      ) {
        event.preventDefault();
        useToolPayload(
          {
            input: {
              [firstStage.directionKey]: createDirectionSelection(direction)
            }
          },
          selectedToolState.tool.instanceId
        );
        return;
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
        selectedToolState?.availability.usable &&
        interaction?.stages.length === 0
      ) {
        event.preventDefault();
        useToolPayload({ input: {} }, selectedToolState.tool.instanceId);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [
    endTurn,
    rollDice,
    selectedToolInstanceId,
    sessionId,
    snapshot,
    useToolPayload
  ]);
}
