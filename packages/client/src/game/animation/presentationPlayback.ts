import type {
  ActionPresentation,
  ActionPresentationEvent,
  Direction,
  GridPosition,
  PlayerStateTransition,
  PresentationEffectType,
  PresentationMotionStyle,
  PresentationProjectileType,
  SequencedActionPresentation,
  SummonStateTransition,
  TileStateTransition
} from "@watcher/shared";

interface SampledGridPosition {
  facing: Direction | null;
  lift: number;
  x: number;
  y: number;
}

export interface ActivePlayerMotionPlayback {
  motionStyle: PresentationMotionStyle;
  playerId: string;
  position: SampledGridPosition;
  progress: number;
}

export interface ActiveProjectilePlayback {
  eventId: string;
  ownerId: string;
  position: SampledGridPosition;
  projectileType: PresentationProjectileType;
  progress: number;
}

export interface ActiveEffectPlayback {
  effectType: PresentationEffectType;
  eventId: string;
  position: GridPosition;
  progress: number;
  tiles: GridPosition[];
}

export interface ActionPresentationPlaybackState {
  effects: ActiveEffectPlayback[];
  playerMotions: Record<string, ActivePlayerMotionPlayback>;
  projectiles: ActiveProjectilePlayback[];
}

export interface PendingStateTransitionPlayback {
  eventId: string;
  playerTransitions: PlayerStateTransition[];
  sequence: number;
  startMs: number;
  summonTransitions: SummonStateTransition[];
  tileTransitions: TileStateTransition[];
}

function clampProgress(progress: number): number {
  return Math.max(0, Math.min(1, progress));
}

function getFacingBetweenPoints(from: GridPosition, to: GridPosition): Direction | null {
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;

  if (Math.abs(deltaX) >= Math.abs(deltaY) && deltaX !== 0) {
    return deltaX > 0 ? "right" : "left";
  }

  if (deltaY !== 0) {
    return deltaY > 0 ? "down" : "up";
  }

  return null;
}

// Path sampling stays generic so players and projectiles can share the same evaluator.
function sampleGridPath(
  positions: GridPosition[],
  progress: number,
  liftHeight = 0
): SampledGridPosition {
  if (positions.length === 0) {
    return {
      x: 0,
      y: 0,
      lift: 0,
      facing: null
    };
  }

  if (positions.length === 1) {
    return {
      x: positions[0]!.x,
      y: positions[0]!.y,
      lift: 0,
      facing: null
    };
  }

  const normalizedProgress = clampProgress(progress);
  const segmentProgress = normalizedProgress * (positions.length - 1);
  const segmentIndex = Math.min(positions.length - 2, Math.floor(segmentProgress));
  const localProgress = segmentProgress - segmentIndex;
  const from = positions[segmentIndex]!;
  const to = positions[segmentIndex + 1]!;

  return {
    x: from.x + (to.x - from.x) * localProgress,
    y: from.y + (to.y - from.y) * localProgress,
    lift: Math.sin(normalizedProgress * Math.PI) * liftHeight,
    facing: getFacingBetweenPoints(from, to)
  };
}

function isEventActive(event: ActionPresentationEvent, elapsedMs: number): boolean {
  return elapsedMs >= event.startMs && elapsedMs <= event.startMs + event.durationMs;
}

function getEventProgress(event: ActionPresentationEvent, elapsedMs: number): number {
  if (event.durationMs <= 0) {
    return 1;
  }

  return clampProgress((elapsedMs - event.startMs) / event.durationMs);
}

// Event playback resolves the semantic presentation payload into concrete transient render state.
export function evaluateActionPresentation(
  presentation: ActionPresentation | null,
  elapsedMs: number
): ActionPresentationPlaybackState {
  if (!presentation) {
    return {
      playerMotions: {},
      projectiles: [],
      effects: []
    };
  }

  const playerMotions: Record<string, ActivePlayerMotionPlayback> = {};
  const projectiles: ActiveProjectilePlayback[] = [];
  const effects: ActiveEffectPlayback[] = [];

  for (const event of presentation.events) {
    if (!isEventActive(event, elapsedMs)) {
      continue;
    }

    const progress = getEventProgress(event, elapsedMs);

    if (event.kind === "player_motion") {
      playerMotions[event.playerId] = {
        playerId: event.playerId,
        motionStyle: event.motionStyle,
        progress,
        position: sampleGridPath(
          event.positions,
          progress,
          event.motionStyle === "arc"
            ? 0.7 + Math.max(0, event.positions.length - 2) * 0.08
            : event.motionStyle === "finish"
              ? 1.75
              : 0
        )
      };
      continue;
    }

    if (event.kind === "projectile") {
      projectiles.push({
        eventId: event.id,
        ownerId: event.ownerId,
        projectileType: event.projectileType,
        progress,
        position: sampleGridPath(
          event.positions,
          progress,
          event.projectileType === "rocket" ? 0.18 : 0.08
        )
      });
      continue;
    }

    if (event.kind === "effect") {
      effects.push({
        eventId: event.id,
        effectType: event.effectType,
        position: event.position,
        progress,
        tiles: event.tiles
      });
    }
  }

  return {
    playerMotions,
    projectiles,
    effects
  };
}

export function getActionPresentationElapsedMs(
  presentation: SequencedActionPresentation | null,
  startedAtMs: number | null,
  simulationTimeMs: number
): number {
  if (!presentation || startedAtMs === null) {
    return 0;
  }

  return Math.max(0, simulationTimeMs - startedAtMs);
}

function collectPendingOriginsFromPresentation(
  pendingOrigins: Record<string, GridPosition>,
  presentation: ActionPresentation | null,
  elapsedMs: number
): void {
  if (!presentation) {
    return;
  }

  for (const event of presentation.events) {
    if (event.kind !== "player_motion" || event.playerId in pendingOrigins) {
      continue;
    }

    if (event.startMs <= elapsedMs) {
      continue;
    }

    pendingOrigins[event.playerId] = event.positions[0]!;
  }
}

function collectPendingStateTransitionsFromPresentation(
  pendingTransitions: PendingStateTransitionPlayback[],
  presentation: SequencedActionPresentation | null,
  elapsedMs: number
): void {
  if (!presentation) {
    return;
  }

  for (const event of presentation.events) {
    if (event.kind !== "state_transition" || event.startMs <= elapsedMs) {
      continue;
    }

    pendingTransitions.push({
      eventId: event.id,
      playerTransitions: event.playerTransitions ?? [],
      sequence: presentation.sequence,
      startMs: event.startMs,
      tileTransitions: event.tileTransitions,
      summonTransitions: event.summonTransitions
    });
  }
}

// Pending motion origins keep movers anchored until their semantic animation actually starts.
export function collectPendingPlayerOrigins(
  activePresentation: SequencedActionPresentation | null,
  activeElapsedMs: number,
  queuedPresentations: SequencedActionPresentation[]
): Record<string, GridPosition> {
  const pendingOrigins: Record<string, GridPosition> = {};

  collectPendingOriginsFromPresentation(pendingOrigins, activePresentation, activeElapsedMs);

  for (const presentation of queuedPresentations) {
    collectPendingOriginsFromPresentation(pendingOrigins, presentation, -1);
  }

  return pendingOrigins;
}

// Pending state transitions let the scene keep pre-impact visuals until their semantic trigger time.
export function collectPendingStateTransitions(
  activePresentation: SequencedActionPresentation | null,
  activeElapsedMs: number,
  queuedPresentations: SequencedActionPresentation[]
): PendingStateTransitionPlayback[] {
  const pendingTransitions: PendingStateTransitionPlayback[] = [];

  collectPendingStateTransitionsFromPresentation(
    pendingTransitions,
    activePresentation,
    activeElapsedMs
  );

  for (const presentation of queuedPresentations) {
    collectPendingStateTransitionsFromPresentation(pendingTransitions, presentation, -1);
  }

  return pendingTransitions.sort(
    (left, right) =>
      right.sequence - left.sequence ||
      right.startMs - left.startMs ||
      right.eventId.localeCompare(left.eventId)
  );
}
