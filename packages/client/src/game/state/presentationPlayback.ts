import type { SequencedActionPresentation } from "@watcher/shared";

export interface PresentationPlaybackState {
  actionPresentationQueue: SequencedActionPresentation[];
  activeActionPresentation: SequencedActionPresentation | null;
  activeActionPresentationStartedAtMs: number | null;
  simulationTimeMs: number;
}

// Presentation playback advances automatically so the scene can stay purely render-focused.
export function pumpActionPresentationPlayback<T extends PresentationPlaybackState>(
  state: T
): Pick<
  T,
  "actionPresentationQueue" | "activeActionPresentation" | "activeActionPresentationStartedAtMs"
> {
  let activeActionPresentation = state.activeActionPresentation;
  let activeActionPresentationStartedAtMs = state.activeActionPresentationStartedAtMs;
  let actionPresentationQueue = state.actionPresentationQueue;

  while (
    activeActionPresentation &&
    activeActionPresentationStartedAtMs !== null &&
    state.simulationTimeMs - activeActionPresentationStartedAtMs >= activeActionPresentation.durationMs
  ) {
    activeActionPresentation = null;
    activeActionPresentationStartedAtMs = null;

    if (!actionPresentationQueue.length) {
      break;
    }

    activeActionPresentation = actionPresentationQueue[0] ?? null;
    activeActionPresentationStartedAtMs = state.simulationTimeMs;
    actionPresentationQueue = actionPresentationQueue.slice(1);
  }

  if (!activeActionPresentation && actionPresentationQueue.length) {
    activeActionPresentation = actionPresentationQueue[0] ?? null;
    activeActionPresentationStartedAtMs = state.simulationTimeMs;
    actionPresentationQueue = actionPresentationQueue.slice(1);
  }

  return {
    actionPresentationQueue,
    activeActionPresentation,
    activeActionPresentationStartedAtMs
  };
}
