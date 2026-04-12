import { useEffect } from "react";
import { evaluatePlaybackEngine } from "../animation/playbackEngine";
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
      const playbackState = evaluatePlaybackEngine({
        activeActionPresentation: state.activeActionPresentation,
        activeActionPresentationStartedAtMs: state.activeActionPresentationStartedAtMs,
        actionPresentationQueue: state.actionPresentationQueue,
        simulationTimeMs: state.simulationTimeMs,
        snapshot: state.snapshot
      });
      const payload = {
        route: window.location.search.includes("room=")
          ? "room"
          : window.location.search.includes("screen=create")
            ? "create"
            : "home",
        mode: state.connectionStatus,
        coordinateSystem: "origin=(0,0) at the top-left of the board, x grows right, y grows down",
        sessionId: state.sessionId,
        timeMs: state.simulationTimeMs,
        selectedToolInstanceId: state.selectedToolInstanceId,
        inspectionCard: window.watcher_scene_debug?.inspectionCard ?? null,
        displayedPlayers: window.watcher_scene_debug?.displayedPlayers ?? {},
        displayedSummons: window.watcher_scene_debug?.displayedSummons ?? {},
        displayedTiles: window.watcher_scene_debug?.displayedTiles ?? {},
        actionPresentation: state.activeActionPresentation
          ? {
              sequence: state.activeActionPresentation.sequence,
              toolId: state.activeActionPresentation.toolId,
              elapsedMs: playbackState.activeElapsedMs,
              durationMs: state.activeActionPresentation.durationMs,
              queuedCount: state.actionPresentationQueue.length,
              activePlayerMotionIds: Object.keys(playbackState.playerMotions),
              activeProjectileCount: playbackState.projectiles.length,
              activeReactionCount: playbackState.reactions.length
            }
          : {
              sequence: null,
              toolId: null,
              elapsedMs: 0,
              durationMs: 0,
              queuedCount: state.actionPresentationQueue.length,
              activePlayerMotionIds: [],
              activeProjectileCount: 0,
              activeReactionCount: 0
            },
        diceRollAnimation: state.diceRollAnimation
          ? {
              dice: state.diceRollAnimation.dice.map((die) => ({
                kind: die.kind,
                label: die.label,
                resultLabel: die.resultLabel
              })),
              elapsedMs: state.simulationTimeMs - state.diceRollAnimation.startedAtMs,
              durationMs: state.diceRollAnimation.durationMs,
              pendingSnapshot: Boolean(state.pendingDiceRollSnapshot)
            }
          : null,
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
