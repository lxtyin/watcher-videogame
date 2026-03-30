import type {
  ActionPresentation,
  ActionPresentationEvent,
  GridPosition,
  PresentationEffectType,
  PresentationMotionStyle,
  PresentationProjectileType,
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

export function buildMotionPositions(
  startPosition: GridPosition,
  path: GridPosition[]
): GridPosition[] {
  return path.length ? [startPosition, ...path] : [startPosition];
}
