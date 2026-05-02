import type {
  ActionPresentation,
  ActionPresentationEvent,
  GridPosition,
  PlayerStateTransition,
  PresentationAnchor,
  PresentationEffectType,
  PresentationLinkProgressStyle,
  PresentationLinkStyle,
  PresentationMotionStyle,
  PresentationProjectileType,
  PresentationSoundCueId,
  ReactionPresentationEvent,
  SoundPresentationEvent,
  SummonStateTransition,
  TileStateTransition,
  ToolId
} from "../types";

const GROUND_MOTION_MS_PER_STEP = 150;
const ARC_MOTION_MS_PER_STEP = 210;
const FINISH_MOTION_MS_PER_STEP = 820;
const FALL_SIDE_MOTION_MS = 420;
const SPIN_DROP_MOTION_MS = 520;
export const IMPACT_RECOIL_MOTION_MS = 320;
export const IMPACT_RECOIL_CONTACT_PROGRESS = 0.42;
const PROJECTILE_MOTION_MS_PER_STEP = 110;

export const ROCKET_BLAST_DELAY_MS = 40;
export const HOOKSHOT_PULL_DELAY_MS = 30;

function normalizePresentationEvents(events: ActionPresentationEvent[]): ActionPresentationEvent[] {
  // Player motion order drives pending-origin playback; authored reaction slots stay stable.
  const motionEvents = events
    .flatMap((event, index) => event.kind === "motion" ? [{ event, index }] : [])
    .sort((left, right) => left.event.startMs - right.event.startMs || left.index - right.index)
    .map(({ event }) => event);
  let nextMotionIndex = 0;

  return events.map((event) => {
    if (event.kind !== "motion") {
      return event;
    }

    const sortedEvent = motionEvents[nextMotionIndex];
    nextMotionIndex += 1;
    return sortedEvent ?? event;
  });
}

export function getProjectileTravelDurationMs(stepCount: number, speed = 1): number {
  const normalizedSpeed = Math.max(0.1, speed);

  return Math.max(1, Math.round((Math.max(1, stepCount) * PROJECTILE_MOTION_MS_PER_STEP) / normalizedSpeed));
}

// Presentation events stay semantic so the client can map them onto meshes and effects.
export function createPresentation(
  actorId: string,
  toolId: ToolId,
  events: ActionPresentationEvent[]
): ActionPresentation | null {
  if (!events.length) {
    return null;
  }

  const normalizedEvents = normalizePresentationEvents(events);

  return {
    actorId,
    toolId,
    events: normalizedEvents,
    durationMs: Math.max(...normalizedEvents.map((event) => event.startMs + event.durationMs))
  };
}

export function createPlayerMotionEvent(
  eventId: string,
  playerId: string,
  positions: GridPosition[],
  motionStyle: PresentationMotionStyle,
  startMs = 0
): ActionPresentationEvent | null {
  return createGridMotionEvent(
    eventId,
    {
      kind: "player",
      motionStyle,
      playerId
    },
    positions,
    motionStyle,
    startMs
  );
}

export function createSummonMotionEvent(
  eventId: string,
  summonInstanceId: string,
  positions: GridPosition[],
  motionStyle: PresentationMotionStyle,
  startMs = 0
): ActionPresentationEvent | null {
  return createGridMotionEvent(
    eventId,
    {
      kind: "summon",
      motionStyle,
      summonInstanceId
    },
    positions,
    motionStyle,
    startMs
  );
}

function createGridMotionEvent(
  eventId: string,
  subject: Extract<ActionPresentationEvent, { kind: "motion" }>["subject"],
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
    kind: "motion",
    positions,
    subject,
    startMs,
    durationMs:
      stepCount *
      (motionStyle === "arc"
        ? ARC_MOTION_MS_PER_STEP
        : motionStyle === "finish"
          ? FINISH_MOTION_MS_PER_STEP
          : motionStyle === "fall_side"
            ? FALL_SIDE_MOTION_MS
            : motionStyle === "spin_drop"
              ? SPIN_DROP_MOTION_MS
              : motionStyle === "impact_recoil"
                ? IMPACT_RECOIL_MOTION_MS
                : GROUND_MOTION_MS_PER_STEP)
  };
}

export function createProjectileEvent(
  eventId: string,
  ownerId: string | null,
  projectileType: PresentationProjectileType,
  positions: GridPosition[],
  startMs = 0,
  speed = 1
): ActionPresentationEvent | null {
  if (positions.length < 2) {
    return null;
  }

  return {
    id: eventId,
    kind: "motion",
    positions,
    subject: {
      kind: "projectile",
      ownerId,
      projectileType
    },
    startMs,
    durationMs: getProjectileTravelDurationMs(positions.length - 1, speed)
  };
}

export function createEffectEvent(
  eventId: string,
  effectType: PresentationEffectType,
  position: GridPosition,
  tiles: GridPosition[],
  startMs = 0,
  durationMs = 1000
): ActionPresentationEvent {
  return {
    id: eventId,
    kind: "reaction",
    reaction: {
      kind: "effect",
      effectType,
      position,
      tiles
    },
    startMs,
    durationMs
  };
}

export function createPlayerLiftReactionEvent(
  eventId: string,
  playerId: string,
  height: number,
  startMs = 0,
  durationMs = GROUND_MOTION_MS_PER_STEP
): ReactionPresentationEvent {
  return {
    id: eventId,
    kind: "reaction",
    reaction: {
      kind: "player_lift",
      height,
      playerId
    },
    startMs,
    durationMs
  };
}

export function createLinkReactionEvent(
  eventId: string,
  from: PresentationAnchor,
  to: PresentationAnchor,
  style: PresentationLinkStyle,
  startMs = 0,
  durationMs = GROUND_MOTION_MS_PER_STEP,
  progressStyle: PresentationLinkProgressStyle = "full"
): ReactionPresentationEvent {
  return {
    id: eventId,
    kind: "reaction",
    reaction: {
      from,
      kind: "link",
      progressStyle,
      style,
      to
    },
    startMs,
    durationMs
  };
}

export function createNumberPopupReactionEvent(
  eventId: string,
  position: GridPosition,
  value: number,
  startMs = 0,
  durationMs = 640
): ReactionPresentationEvent {
  return {
    id: eventId,
    kind: "reaction",
    reaction: {
      kind: "number_popup",
      position,
      value
    },
    startMs,
    durationMs
  };
}

export function createSoundEvent(
  eventId: string,
  cueId: PresentationSoundCueId,
  anchor: PresentationAnchor | null = null,
  startMs = 0,
  volume?: number
): SoundPresentationEvent {
  return {
    id: eventId,
    kind: "sound",
    sound: volume === undefined ? { anchor, cueId } : { anchor, cueId, volume },
    startMs,
    durationMs: 0
  };
}

export function createStateTransitionEvent(
  eventId: string,
  tileTransitions: TileStateTransition[],
  summonTransitions: SummonStateTransition[],
  playerTransitions: PlayerStateTransition[] = [],
  startMs = 0
): ActionPresentationEvent | null {
  if (!tileTransitions.length && !summonTransitions.length && !playerTransitions.length) {
    return null;
  }

  return {
    id: eventId,
    kind: "state_transition",
    playerTransitions,
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

  const nextEvents = normalizePresentationEvents([...(presentation?.events ?? []), ...events]);

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

export function offsetPresentationEvents(
  events: ActionPresentationEvent[],
  offsetMs: number
): ActionPresentationEvent[] {
  if (!offsetMs) {
    return events;
  }

  return events.map((event) => ({
    ...event,
    startMs: event.startMs + offsetMs
  }));
}

export function getMotionStepDurationMs(motionStyle: PresentationMotionStyle): number {
  if (motionStyle === "arc") {
    return ARC_MOTION_MS_PER_STEP;
  }

  if (motionStyle === "finish") {
    return FINISH_MOTION_MS_PER_STEP;
  }

  if (motionStyle === "fall_side") {
    return FALL_SIDE_MOTION_MS;
  }

  if (motionStyle === "spin_drop") {
    return SPIN_DROP_MOTION_MS;
  }

  return GROUND_MOTION_MS_PER_STEP;
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
