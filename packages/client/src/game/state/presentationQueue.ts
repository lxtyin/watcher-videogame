import type { SequencedActionPresentation } from "@watcher/shared";

export interface PresentationQueueState {
  actionPresentationQueue: SequencedActionPresentation[];
  activeActionPresentation: SequencedActionPresentation | null;
  activeActionPresentationStartedAtMs: number | null;
  simulationTimeMs: number;
}

// The queue pump only advances authoritative presentation scheduling.
// Sampling and rendering belong to the animation playback engine.
export function pumpPresentationQueue<T extends PresentationQueueState>(
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
