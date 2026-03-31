import type {
  ActionPresentation,
  ActionPresentationEvent,
  GridPosition,
  PresentationEffectType,
  PresentationMotionStyle,
  PresentationProjectileType,
  SummonStateTransition,
  TileStateTransition,
  ToolId
} from "../types";

const GROUND_MOTION_MS_PER_STEP = 150;
const ARC_MOTION_MS_PER_STEP = 210;
const PROJECTILE_MOTION_MS_PER_STEP = 110;
const ROCKET_EXPLOSION_EFFECT_MS = 420;

export const ROCKET_BLAST_DELAY_MS = 40;

// Presentation events stay semantic so the client can map them onto meshes and effects.
export function createPresentation(
  actorId: string,
  toolId: ToolId,
  events: ActionPresentationEvent[]
): ActionPresentation | null {
  if (!events.length) {
    return null;
  }

  return {
    actorId,
    toolId,
    events,
    durationMs: Math.max(...events.map((event) => event.startMs + event.durationMs))
  };
}

export function createPlayerMotionEvent(
  eventId: string,
  playerId: string,
  positions: GridPosition[],
  motionStyle: PresentationMotionStyle,
  startMs = 0
): ActionPresentationEvent | null {
  if (positions.length < 2) {
    return null;
  }

  const stepCount = Math.max(1, positions.length - 1);

  return {
    id: eventId,
    kind: "player_motion",
    playerId,
    motionStyle,
    positions,
    startMs,
    durationMs:
      stepCount * (motionStyle === "arc" ? ARC_MOTION_MS_PER_STEP : GROUND_MOTION_MS_PER_STEP)
  };
}

export function createProjectileEvent(
  eventId: string,
  ownerId: string,
  projectileType: PresentationProjectileType,
  positions: GridPosition[],
  startMs = 0
): ActionPresentationEvent | null {
  if (positions.length < 2) {
    return null;
  }

  return {
    id: eventId,
    kind: "projectile",
    ownerId,
    projectileType,
    positions,
    startMs,
    durationMs: Math.max(1, positions.length - 1) * PROJECTILE_MOTION_MS_PER_STEP
  };
}

export function createEffectEvent(
  eventId: string,
  effectType: PresentationEffectType,
  position: GridPosition,
  tiles: GridPosition[],
  startMs = 0,
  durationMs = ROCKET_EXPLOSION_EFFECT_MS
): ActionPresentationEvent {
  return {
    id: eventId,
    kind: "effect",
    effectType,
    position,
    tiles,
    startMs,
    durationMs
  };
}

export function createStateTransitionEvent(
  eventId: string,
  tileTransitions: TileStateTransition[],
  summonTransitions: SummonStateTransition[],
  startMs = 0
): ActionPresentationEvent | null {
  if (!tileTransitions.length && !summonTransitions.length) {
    return null;
  }

  return {
    id: eventId,
    kind: "state_transition",
    tileTransitions,
    summonTransitions,
    startMs,
    durationMs: 0
  };
}

export function appendPresentationEvents(
  presentation: ActionPresentation | null,
  actorId: string,
  toolId: ToolId,
  events: ActionPresentationEvent[]
): ActionPresentation | null {
  if (!presentation && !events.length) {
    return null;
  }

  const nextEvents = [...(presentation?.events ?? []), ...events];

  if (!nextEvents.length) {
    return null;
  }

  return {
    actorId: presentation?.actorId ?? actorId,
    toolId: presentation?.toolId ?? toolId,
    events: nextEvents,
    durationMs: Math.max(...nextEvents.map((event) => event.startMs + event.durationMs))
  };
}

function getMotionStepDurationMs(motionStyle: PresentationMotionStyle): number {
  return motionStyle === "arc" ? ARC_MOTION_MS_PER_STEP : GROUND_MOTION_MS_PER_STEP;
}

// Mutation timing can align to a motion path by sampling the target cell arrival time.
export function getMotionArrivalStartMs(
  positions: GridPosition[],
  motionStyle: PresentationMotionStyle,
  targetPosition: GridPosition,
  startMs = 0
): number | null {
  const stepIndex = positions.findIndex(
    (position, index) =>
      index > 0 && position.x === targetPosition.x && position.y === targetPosition.y
  );

  if (stepIndex <= 0) {
    return null;
  }

  return startMs + stepIndex * getMotionStepDurationMs(motionStyle);
}

export function buildMotionPositions(
  startPosition: GridPosition,
  path: GridPosition[]
): GridPosition[] {
  return path.length ? [startPosition, ...path] : [startPosition];
}
