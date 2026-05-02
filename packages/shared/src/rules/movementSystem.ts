import type {
  AffectedPlayerMove,
  BoardSummonState,
  Direction,
  GridPosition,
  ModifierId,
  MovementActor,
  MovementDescriptor,
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
  appendDraftSummonMutations,
  appendDraftPreviewHighlightTiles,
  applyResolvedPlayerStateToDraft,
  createDraftEventId,
  markDraftPresentation
} from "./actionDraft";
import {
  buildMotionPositions,
  IMPACT_RECOIL_CONTACT_PROGRESS,
  createPlayerMotionEvent,
  createSummonMotionEvent,
  createSoundEvent,
  getMotionStepDurationMs
} from "./actionPresentation";
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
  kind: "player" | "summon";
  modifiers: ModifierId[];
  ownerId?: string;
  position: GridPosition;
  spawnPosition: GridPosition;
  summonId?: BoardSummonState["summonId"];
  tags: PlayerTagMap;
  teamId: MovementActor["teamId"];
  turnFlags: MovementActor["turnFlags"];
}

interface MovementRuntimeOptions {
  movement: MovementDescriptor;
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

export function didDisplacementTakeEffect(
  resolution: Pick<MovementSystemResolution, "impactStrength" | "path">
): boolean {
  return resolution.path.length > 0 || resolution.impactStrength !== null;
}

interface MutableMovementState {
  direction: Direction | null;
  player: MovementSubject;
  remainingMovePoints: number | null;
  shouldContinueMovement: boolean;
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

function cloneMovementWithType(
  movement: MovementDescriptor,
  type: MovementType
): MovementDescriptor {
  return {
    ...movement,
    type,
    tags: [...movement.tags]
  };
}

function cloneSubject(player: MovementSubject): MovementSubject {
  return {
    characterId: player.characterId,
    id: player.id,
    kind: player.kind,
    modifiers: [...player.modifiers],
    ...(player.ownerId === undefined ? {} : { ownerId: player.ownerId }),
    position: clonePosition(player.position),
    spawnPosition: clonePosition(player.spawnPosition),
    ...(player.summonId === undefined ? {} : { summonId: player.summonId }),
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
  subject: MovementSubject,
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
  const motionPositions = buildMotionPositions(startPosition, path);
  const motionEvent =
    subject.kind === "summon"
      ? createSummonMotionEvent(
          createDraftEventId(draft, `movement:${subject.id}`),
          subject.id,
          motionPositions,
          motionStyle,
          startMs
        )
      : createPlayerMotionEvent(
          createDraftEventId(draft, `movement:${subject.id}`),
          subject.id,
          motionPositions,
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
  appendMovementFootstepSoundEvents(draft, subject.id, path, motionStyle, startMs);

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
  subject: MovementSubject,
  position: GridPosition,
  direction: Direction,
  startMs: number
): ImpactTiming {
  const positions = [
    clonePosition(position),
    createDirectionalOffsetPosition(position, direction, 0.42),
    clonePosition(position)
  ];
  const motionEvent =
    subject.kind === "summon"
      ? createSummonMotionEvent(
          createDraftEventId(draft, `impact:${subject.id}`),
          subject.id,
          positions,
          "impact_recoil",
          startMs
        )
      : createPlayerMotionEvent(
          createDraftEventId(draft, `impact:${subject.id}`),
          subject.id,
          positions,
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
  if (player.kind === "summon") {
    const liveSummon = draft.summonsById.get(player.id);

    if (!liveSummon) {
      player.turnFlags = [];
      return;
    }

    player.ownerId = liveSummon.ownerId;
    player.position = clonePosition(liveSummon.position);
    player.summonId = liveSummon.summonId;
    return;
  }

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

function applyMovementSubjectStateToDraft(
  draft: ResolutionDraft,
  subject: MovementSubject,
  recordSummonMutation = false
): void {
  if (subject.kind === "player") {
    applyResolvedPlayerStateToDraft(draft, subject);
    return;
  }

  const existingSummon = draft.summonsById.get(subject.id);

  if (!existingSummon) {
    return;
  }

  const nextSummon = {
    ...existingSummon,
    ownerId: subject.ownerId ?? existingSummon.ownerId,
    position: clonePosition(subject.position),
    summonId: subject.summonId ?? existingSummon.summonId
  };

  if (recordSummonMutation) {
    appendDraftSummonMutations(draft, [
      {
        instanceId: nextSummon.instanceId,
        kind: "upsert",
        ownerId: nextSummon.ownerId,
        position: nextSummon.position,
        summonId: nextSummon.summonId
      }
    ]);
    return;
  }

  draft.summonsById.set(nextSummon.instanceId, nextSummon);
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

  applyMovementSubjectStateToDraft(draft, state.player);

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
      phase: null,
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
  applyMovementSubjectStateToDraft(draft, state.player);

  resolveStopSummonEffects(draft, {
    movement,
    phase: null,
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
    applyMovementSubjectStateToDraft(draft, state.player, true);

    if (trackAffectedPlayerReason && state.player.kind === "player") {
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
  options: LinearMovementOptions
): MovementSystemResolution {
  const movement = options.movement;
  const presentationMark = markDraftPresentation(draft);
  const state = buildState(options.player, options.direction, options.movePoints);
  const startMs = options.startMs ?? 0;
  const startPosition = clonePosition(options.player.position);
  const path: GridPosition[] = [];
  const stepDurationMs = getMotionStepDurationMs(resolveMotionStyle(movement));
  let stepsTaken = 0;
  let stopReason = "Movement ended";
  let pendingImpact: PendingImpact | null = null;

  while (true) {
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
      if (movement.type === "translate" && (state.remainingMovePoints ?? 0) > 0) {
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
      if (movement.type === "translate" && tile.type === "earthWall" && (state.remainingMovePoints ?? 0) > 0) {
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

    if ((state.remainingMovePoints ?? 0) > 0 && state.shouldContinueMovement) {
      runPassThroughTriggers(
        draft,
        state,
        movement,
        startMs + stepsTaken * stepDurationMs
      );
    } else {
      break;
    }
  }

  const timing = appendMovementMotionEvent(
    draft,
    state.player,
    startPosition,
    path,
    movement,
    startMs
  );
  let impactTiming: ImpactTiming | null = null;

  if (pendingImpact) {
    impactTiming = appendImpactRecoilMotionEvent(
      draft,
      state.player,
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
      source:
        state.player.kind === "player"
          ? {
              kind: "player",
              movement,
              player: state.player
            }
          : {
              kind: "summon",
              movement,
              summon: draft.summonsById.get(state.player.id) ?? {
                instanceId: state.player.id,
                ownerId: state.player.ownerId ?? "",
                position: clonePosition(state.player.position),
                summonId: state.player.summonId!
              }
            },
      startMs: impactTiming.contactMs,
      strength: pendingImpact.strength,
      tile: pendingImpact.tile
    });
    syncMovementStatePlayerFromDraft(draft, state.player);
  }

  runStopTriggers(draft, state, movement, impactTiming?.endMs ?? timing.motionEndMs ?? startMs);

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
  return resolveSteppedDisplacement(draft, options);
}

export function resolveDragDisplacement(
  draft: ResolutionDraft,
  options: LinearMovementOptions
): MovementSystemResolution {
  return resolveSteppedDisplacement(draft, options);
}

// Leap displacement flies over intermediate cells, then resolves landing triggers as normal translate contact.
export function resolveLeapDisplacement(
  draft: ResolutionDraft,
  options: LeapMovementOptions
): MovementSystemResolution {
  const movement = options.movement;
  const movementLanding = cloneMovementWithType(movement, "landing");
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

    if (index !== leap.path.length - 1) { 
      runPassThroughTriggers(
        draft,
        state,
        index === leap.path.length - 1 ? movementLanding : movement,
        startMs + traversedPath.length * stepDurationMs
      );
    }

    if (!state.shouldContinueMovement) {
      break;
    }
  }

  const timing = appendMovementMotionEvent(
    draft,
    state.player,
    startPosition,
    traversedPath,
    movement,
    startMs
  );

  runStopTriggers(draft, state, movement, timing.motionEndMs ?? startMs);

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
  const movement = options.movement;
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

  // runPassThroughTriggers(draft, state, movement, startMs);
  runStopTriggers(draft, state, movement, startMs);

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
