import type {
  AffectedPlayerMove,
  Direction,
  GridPosition,
  ModifierId,
  MovementActor,
  MovementDescriptor,
  MovementDescriptorInput,
  MovementType,
  PlayerTagMap,
  ResolvedActorState
} from "../types";
import { isWithinBoard } from "../board";
import { clonePlayerTags } from "../playerTags";
import { resolvePassThroughSummonEffects, resolveStopSummonEffects } from "../summons";
import {
  resolveImpactTerrainEffect,
  resolvePassThroughTerrainEffect,
  resolveStopTerrainEffect
} from "../terrain";
import type { ResolutionDraft } from "./actionDraft";
import {
  appendDraftPresentationEvents,
  appendDraftAffectedPlayerMove,
  appendDraftPreviewHighlightTiles,
  applyResolvedPlayerStateToDraft,
  createDraftEventId,
  markDraftPresentation
} from "./actionDraft";
import {
  buildMotionPositions,
  IMPACT_RECOIL_CONTACT_PROGRESS,
  createPlayerMotionEvent,
  createSoundEvent,
  getMotionStepDurationMs
} from "./actionPresentation";
import { createMovementDescriptor } from "./displacement";
import {
  createTileMutation,
  getTileAfterMutations,
  isLandablePosition,
  resolveLeapLanding,
  stepPosition
} from "./spatial";

interface MovementSubject {
  characterId: MovementActor["characterId"];
  id: string;
  modifiers: ModifierId[];
  position: GridPosition;
  spawnPosition: GridPosition;
  tags: PlayerTagMap;
  teamId: MovementActor["teamId"];
  turnFlags: MovementActor["turnFlags"];
}

interface MovementRuntimeOptions {
  movement: MovementDescriptorInput;
  player: MovementSubject;
  startMs?: number;
  trackAffectedPlayerReason?: string;
}

interface LinearMovementOptions extends MovementRuntimeOptions {
  direction: Direction;
  movePoints: number;
}

interface LeapMovementOptions extends MovementRuntimeOptions {
  direction: Direction;
  maxDistance: number;
}

interface TeleportMovementOptions extends MovementRuntimeOptions {
  targetPosition: GridPosition;
}

export interface MovementSystemResolution {
  actor: ResolvedActorState;
  endMs: number;
  impactStrength: number | null;
  movement: MovementDescriptor;
  motionEndMs: number | null;
  motionStartMs: number | null;
  path: GridPosition[];
  stopReason: string;
}

interface MutableMovementState {
  direction: Direction | null;
  player: MovementSubject;
  remainingMovePoints: number | null;
  shouldContinueMovement: boolean;
  shouldResolveStopTriggers: boolean;
}

interface PendingImpact {
  direction: Direction;
  strength: number;
  tile: NonNullable<ReturnType<typeof getTileAfterMutations>>;
}

interface ImpactTiming {
  contactMs: number;
  endMs: number;
}

function clonePosition(position: GridPosition): GridPosition {
  return {
    x: position.x,
    y: position.y
  };
}

function cloneSubject(player: MovementSubject): MovementSubject {
  return {
    characterId: player.characterId,
    id: player.id,
    modifiers: [...player.modifiers],
    position: clonePosition(player.position),
    spawnPosition: clonePosition(player.spawnPosition),
    tags: clonePlayerTags(player.tags),
    teamId: player.teamId,
    turnFlags: [...player.turnFlags]
  };
}

function buildState(
  player: MovementSubject,
  direction: Direction | null,
  remainingMovePoints: number | null
): MutableMovementState {
  return {
    direction,
    player: cloneSubject(player),
    remainingMovePoints,
    shouldContinueMovement: true,
    shouldResolveStopTriggers: true
  };
}

function resolveMotionStyle(movement: MovementDescriptor): "arc" | "ground" {
  return movement.type === "leap" ? "arc" : "ground";
}

function appendMovementFootstepSoundEvents(
  draft: ResolutionDraft,
  playerId: string,
  path: GridPosition[],
  motionStyle: "arc" | "ground",
  startMs: number
): void {
  if (!path.length) {
    return;
  }

  const stepDurationMs = getMotionStepDurationMs(motionStyle);
  const positions =
    motionStyle === "arc"
      ? [path[path.length - 1]!]
      : path;

  appendDraftPresentationEvents(
    draft,
    positions.map((position, index) =>
      createSoundEvent(
        createDraftEventId(draft, `footstep:${playerId}`),
        "footstep_soft",
        {
          kind: "position",
          position: clonePosition(position)
        },
        motionStyle === "arc"
          ? startMs + path.length * stepDurationMs
          : startMs + (index + 1) * stepDurationMs
      )
    )
  );
}

function appendMovementMotionEvent(
  draft: ResolutionDraft,
  playerId: string,
  startPosition: GridPosition,
  path: GridPosition[],
  movement: MovementDescriptor,
  startMs: number
): {
  endMs: number;
  motionEndMs: number | null;
  motionStartMs: number | null;
} {
  const motionStyle = resolveMotionStyle(movement);
  const motionEvent = createPlayerMotionEvent(
    createDraftEventId(draft, `movement:${playerId}`),
    playerId,
    buildMotionPositions(startPosition, path),
    motionStyle,
    startMs
  );

  if (!motionEvent) {
    return {
      endMs: startMs,
      motionEndMs: null,
      motionStartMs: null
    };
  }

  appendDraftPresentationEvents(draft, [motionEvent]);
  appendMovementFootstepSoundEvents(draft, playerId, path, motionStyle, startMs);

  return {
    endMs: motionEvent.startMs + motionEvent.durationMs,
    motionEndMs: motionEvent.startMs + motionEvent.durationMs,
    motionStartMs: motionEvent.startMs
  };
}

function createDirectionalOffsetPosition(
  position: GridPosition,
  direction: Direction,
  amount: number
): GridPosition {
  const target = stepPosition(position, direction, amount);

  return {
    x: target.x,
    y: target.y
  };
}

function appendImpactRecoilMotionEvent(
  draft: ResolutionDraft,
  playerId: string,
  position: GridPosition,
  direction: Direction,
  startMs: number
): ImpactTiming {
  const motionEvent = createPlayerMotionEvent(
    createDraftEventId(draft, `impact:${playerId}`),
    playerId,
    [
      clonePosition(position),
      createDirectionalOffsetPosition(position, direction, 0.42),
      clonePosition(position)
    ],
    "impact_recoil",
    startMs
  );

  if (!motionEvent) {
    return {
      contactMs: startMs,
      endMs: startMs
    };
  }

  appendDraftPresentationEvents(draft, [motionEvent]);

  return {
    contactMs: startMs + Math.round(motionEvent.durationMs * IMPACT_RECOIL_CONTACT_PROGRESS),
    endMs: motionEvent.startMs + motionEvent.durationMs
  };
}

function syncMovementStatePlayerFromDraft(
  draft: ResolutionDraft,
  player: MovementSubject
): void {
  const livePlayer =
    player.id === draft.actorId
      ? draft.actor
      : draft.playersById.get(player.id);

  if (!livePlayer) {
    return;
  }

  player.characterId = livePlayer.characterId;
  player.modifiers = [...livePlayer.modifiers];
  player.position = clonePosition(livePlayer.position);
  player.spawnPosition = clonePosition(livePlayer.spawnPosition);
  player.tags = clonePlayerTags(livePlayer.tags);
  player.turnFlags = [...livePlayer.turnFlags];
}

function runPassThroughTriggers(
  draft: ResolutionDraft,
  state: MutableMovementState,
  movement: MovementDescriptor,
  startMs: number
): void {
  const tile = getTileAfterMutations(
    draft.board,
    draft.tileMutations,
    state.player.position
  );

  if (!tile) {
    return;
  }

  const triggerPosition = clonePosition(state.player.position);

  applyResolvedPlayerStateToDraft(draft, state.player);

  resolvePassThroughTerrainEffect(draft, {
    movement,
    startMs,
    state,
    tile
  });

  if (
    state.player.position.x === triggerPosition.x &&
    state.player.position.y === triggerPosition.y
  ) {
    resolvePassThroughSummonEffects(draft, {
      ...(state.direction ? { direction: state.direction } : {}),
      movement,
      player: state.player,
      position: state.player.position,
      startMs,
      ...(typeof state.remainingMovePoints === "number"
        ? { remainingMovePoints: state.remainingMovePoints }
        : {})
    });
  }

  syncMovementStatePlayerFromDraft(draft, state.player);
}

function runStopTriggers(
  draft: ResolutionDraft,
  state: MutableMovementState,
  movement: MovementDescriptor | null,
  startMs: number
): void {
  applyResolvedPlayerStateToDraft(draft, state.player);

  resolveStopSummonEffects(draft, {
    movement,
    player: state.player,
    position: state.player.position,
    startMs
  });

  const tile = getTileAfterMutations(draft.board, draft.tileMutations, state.player.position);

  if (tile) {
    resolveStopTerrainEffect(draft, {
      movement,
      player: state.player,
      position: state.player.position,
      startMs,
      tile
    });
  }

  syncMovementStatePlayerFromDraft(draft, state.player);
}

function buildResolution(
  draft: ResolutionDraft,
  state: MutableMovementState,
  movement: MovementDescriptor,
  path: GridPosition[],
  stopReason: string,
  trackAffectedPlayerReason: string | undefined,
  startPosition: GridPosition,
  timing: {
    endMs: number;
    motionEndMs: number | null;
    motionStartMs: number | null;
  },
  impactStrength: number | null
): MovementSystemResolution {
  if (path.length) {
    applyResolvedPlayerStateToDraft(draft, state.player);

    if (trackAffectedPlayerReason) {
      appendDraftAffectedPlayerMove(draft, {
        boardVisible: draft.playersById.get(state.player.id)?.boardVisible ?? true,
        movement,
        modifiers: [...state.player.modifiers],
        path: path.map(clonePosition),
        playerId: state.player.id,
        reason: trackAffectedPlayerReason,
        startPosition: clonePosition(startPosition),
        target: clonePosition(state.player.position),
        tags: clonePlayerTags(state.player.tags),
        turnFlags: [...state.player.turnFlags]
      });
    }
  }

  return {
    actor: {
      boardVisible: draft.playersById.get(state.player.id)?.boardVisible ?? true,
      modifiers: [...state.player.modifiers],
      position: clonePosition(state.player.position),
      tags: clonePlayerTags(state.player.tags),
      turnFlags: [...state.player.turnFlags]
    },
    endMs: timing.endMs,
    impactStrength,
    movement,
    motionEndMs: timing.motionEndMs,
    motionStartMs: timing.motionStartMs,
    path: path.map(clonePosition),
    stopReason
  };
}

// Grounded displacement powers translate and drag style movement with immediate board triggers.
function resolveSteppedDisplacement(
  draft: ResolutionDraft,
  options: LinearMovementOptions,
  movementType: Extract<MovementType, "drag" | "translate">
): MovementSystemResolution {
  const movement = createMovementDescriptor(movementType, options.movement);
  const movementLanding = createMovementDescriptor("landing", options.movement);
  const presentationMark = markDraftPresentation(draft);
  const state = buildState(options.player, options.direction, options.movePoints);
  const startMs = options.startMs ?? 0;
  const startPosition = clonePosition(options.player.position);
  const path: GridPosition[] = [];
  const stepDurationMs = getMotionStepDurationMs(resolveMotionStyle(movement));
  let stepsTaken = 0;
  let stopReason = "Movement ended";
  let pendingImpact: PendingImpact | null = null;

  while ((state.remainingMovePoints ?? 0) > 0 && state.shouldContinueMovement) {
    const direction = state.direction;

    if (!direction) {
      stopReason = "No direction";
      break;
    }

    const target = stepPosition(state.player.position, direction);

    if (!isWithinBoard(draft.board, target)) {
      stopReason = "Board edge";
      break;
    }

    const tile = getTileAfterMutations(draft.board, draft.tileMutations, target);

    if (!tile) {
      stopReason = "Missing tile";
      break;
    }

    if (tile.type === "wall" || tile.type === "boxingBall" || tile.type === "tower" || tile.type === "highwall") {
      if (movementType === "translate" && (state.remainingMovePoints ?? 0) > 0) {
        pendingImpact = {
          direction,
          strength: state.remainingMovePoints ?? 0,
          tile
        };
      }
      stopReason = "Wall";
      break;
    }

    const moveCost = tile.type === "earthWall" ? 1 + tile.durability : 1;

    if ((state.remainingMovePoints ?? 0) < moveCost) {
      if (movementType === "translate" && tile.type === "earthWall" && (state.remainingMovePoints ?? 0) > 0) {
        pendingImpact = {
          direction,
          strength: state.remainingMovePoints ?? 0,
          tile
        };
      }
      stopReason = "Not enough move points";
      break;
    }

    state.remainingMovePoints = (state.remainingMovePoints ?? 0) - moveCost;
    state.player.position = target;
    path.push(target);
    stepsTaken += 1;

    if (tile.type === "earthWall") {
      appendDraftPreviewHighlightTiles(draft, [target]);
      draft.tileMutations.push(createTileMutation(target, "floor", 0));
    }

    runPassThroughTriggers(
      draft,
      state,
      state.remainingMovePoints > 0 ? movement : movementLanding,
      startMs + stepsTaken * stepDurationMs
    );
  }

  const timing = appendMovementMotionEvent(
    draft,
    state.player.id,
    startPosition,
    path,
    movement,
    startMs
  );
  let impactTiming: ImpactTiming | null = null;

  if (pendingImpact) {
    impactTiming = appendImpactRecoilMotionEvent(
      draft,
      state.player.id,
      state.player.position,
      pendingImpact.direction,
      timing.endMs
    );
    resolveImpactTerrainEffect(draft, {
      direction: pendingImpact.direction,
      position: {
        x: pendingImpact.tile.x,
        y: pendingImpact.tile.y
      },
      source: {
        kind: "player",
        movement,
        player: state.player
      },
      startMs: impactTiming.contactMs,
      strength: pendingImpact.strength,
      tile: pendingImpact.tile
    });
    syncMovementStatePlayerFromDraft(draft, state.player);
  }

  if (path.length && state.shouldResolveStopTriggers) {
    runStopTriggers(draft, state, movement, impactTiming?.endMs ?? timing.motionEndMs ?? startMs);
  }

  return buildResolution(
    draft,
    state,
    movement,
    path,
    stopReason,
    options.trackAffectedPlayerReason,
    startPosition,
    {
      endMs: Math.max(
        timing.endMs,
        draft.presentationEvents.slice(presentationMark).reduce(
          (maxEndMs, event) => Math.max(maxEndMs, event.startMs + event.durationMs),
          timing.endMs
        )
      ),
      motionEndMs: timing.motionEndMs,
      motionStartMs: timing.motionStartMs
    },
    pendingImpact?.strength ?? null
  );
}

export function resolveLinearDisplacement(
  draft: ResolutionDraft,
  options: LinearMovementOptions
): MovementSystemResolution {
  return resolveSteppedDisplacement(draft, options, "translate");
}

export function resolveDragDisplacement(
  draft: ResolutionDraft,
  options: LinearMovementOptions
): MovementSystemResolution {
  return resolveSteppedDisplacement(draft, options, "drag");
}

// Leap displacement flies over intermediate cells, then resolves landing triggers as normal translate contact.
export function resolveLeapDisplacement(
  draft: ResolutionDraft,
  options: LeapMovementOptions
): MovementSystemResolution {
  const movement = createMovementDescriptor("leap", options.movement);
  const movementLanding = createMovementDescriptor("landing", options.movement);
  const presentationMark = markDraftPresentation(draft);
  const state = buildState(options.player, options.direction, null);
  const startMs = options.startMs ?? 0;
  const startPosition = clonePosition(options.player.position);
  const traversedPath: GridPosition[] = [];
  const stepDurationMs = getMotionStepDurationMs(resolveMotionStyle(movement));
  const leap = resolveLeapLanding(
    draft.board,
    options.player.position,
    options.direction,
    options.maxDistance,
    draft.tileMutations
  );

  if (!leap.landing) {
    return buildResolution(
      draft,
      state,
      movement,
      leap.path,
      "No landing tile",
      options.trackAffectedPlayerReason,
      startPosition,
      {
        endMs: startMs,
        motionEndMs: null,
        motionStartMs: null
      },
      null
    );
  }

  for (const [index, position] of leap.path.entries()) {
    state.player.position = position;
    traversedPath.push(clonePosition(position));
    runPassThroughTriggers(
      draft,
      state,
      index === leap.path.length - 1 ? movementLanding : movement,
      startMs + traversedPath.length * stepDurationMs
    );

    if (!state.shouldContinueMovement) {
      break;
    }
  }

  const timing = appendMovementMotionEvent(
    draft,
    state.player.id,
    startPosition,
    traversedPath,
    movement,
    startMs
  );

  if (traversedPath.length && state.shouldResolveStopTriggers) {
    runStopTriggers(draft, state, movement, timing.motionEndMs ?? startMs);
  }

  return buildResolution(
    draft,
    state,
    movement,
    traversedPath,
    "Movement ended",
    options.trackAffectedPlayerReason,
    startPosition,
    {
      endMs: Math.max(
        timing.endMs,
        draft.presentationEvents.slice(presentationMark).reduce(
          (maxEndMs, event) => Math.max(maxEndMs, event.startMs + event.durationMs),
          timing.endMs
        )
      ),
      motionEndMs: timing.motionEndMs,
      motionStartMs: timing.motionStartMs
    },
    null
  );
}

// Teleport displacement treats the destination as a zero-length path with pass-through plus stop semantics.
export function resolveTeleportDisplacement(
  draft: ResolutionDraft,
  options: TeleportMovementOptions
): MovementSystemResolution {
  const movement = createMovementDescriptor("landing", options.movement);
  const presentationMark = markDraftPresentation(draft);
  const state = buildState(options.player, null, null);
  const startMs = options.startMs ?? 0;
  const startPosition = clonePosition(options.player.position);

  if (!isLandablePosition(draft.board, options.targetPosition, draft.tileMutations)) {
    return buildResolution(
      draft,
      state,
      movement,
      [],
      "Teleport target is not landable",
      options.trackAffectedPlayerReason,
      startPosition,
      {
        endMs: startMs,
        motionEndMs: null,
        motionStartMs: null
      },
      null
    );
  }

  state.player.position = clonePosition(options.targetPosition);
  const path = [clonePosition(options.targetPosition)];

  runPassThroughTriggers(draft, state, movement, startMs);

  if (state.shouldResolveStopTriggers) {
    runStopTriggers(draft, state, movement, startMs);
  }

  return buildResolution(
    draft,
    state,
    movement,
    path,
    "Movement ended",
    options.trackAffectedPlayerReason,
    startPosition,
    {
      endMs: Math.max(
        startMs,
        draft.presentationEvents.slice(presentationMark).reduce(
          (maxEndMs, event) => Math.max(maxEndMs, event.startMs + event.durationMs),
          startMs
        )
      ),
      motionEndMs: null,
      motionStartMs: null
    },
    null
  );
}
