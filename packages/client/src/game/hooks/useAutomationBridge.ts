import { useEffect } from "react";
import {
  evaluateActionPresentation,
  getActionPresentationElapsedMs
} from "../animation/presentationPlayback";
import { useGameStore } from "../state/useGameStore";

// Automation hooks expose stable control points for browser-driven inspection.
export function useAutomationBridge(): void {
  const advanceTime = useGameStore((state) => state.advanceTime);

  useEffect(() => {
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
        displayedSummons: window.watcher_scene_debug?.displayedSummons ?? {},
        displayedTiles: window.watcher_scene_debug?.displayedTiles ?? {},
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
