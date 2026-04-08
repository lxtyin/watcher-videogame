import type {
  ActionPresentationEvent,
  AffectedPlayerMove,
  Direction,
  GridPosition,
  ModifierId,
  MovementActor,
  MovementDescriptor,
  PlayerTagMap,
  ResolvedActorState
} from "../types";
import { isWithinBoard } from "../board";
import { clonePlayerTags } from "../playerTags";
import { resolvePassThroughSummonEffects, resolveStopSummonEffects } from "../summons";
import { resolvePassThroughTerrainEffect, resolveStopTerrainEffect } from "../terrain";
import type { ResolutionDraft } from "./actionDraft";
import {
  appendDraftAffectedPlayerMove,
  applyResolvedPlayerStateToDraft
} from "./actionDraft";
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
  turnFlags: MovementActor["turnFlags"];
}

interface MovementRuntimeOptions {
  movement: MovementDescriptor;
  player: MovementSubject;
  trackAffectedPlayerReason?: string;
}

interface LinearMovementOptions extends MovementRuntimeOptions {
  direction: Direction;
  maxSteps?: number;
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
  path: GridPosition[];
  presentationEvents: ActionPresentationEvent[];
  stopReason: string;
}

interface MutableMovementState {
  direction: Direction | null;
  player: MovementSubject;
  presentationEvents: ActionPresentationEvent[];
  remainingMovePoints: number | null;
  shouldContinueMovement: boolean;
  shouldResolveStopTriggers: boolean;
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
    presentationEvents: [],
    remainingMovePoints,
    shouldContinueMovement: true,
    shouldResolveStopTriggers: true
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
  movement: MovementDescriptor
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
  movement: MovementDescriptor | null
): void {
  applyResolvedPlayerStateToDraft(draft, state.player);

  resolveStopSummonEffects(draft, {
    movement,
    player: state.player,
    position: state.player.position
  });

  const tile = getTileAfterMutations(draft.board, draft.tileMutations, state.player.position);

  if (tile) {
    resolveStopTerrainEffect(draft, {
      movement,
      player: state.player,
      position: state.player.position,
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
  startPosition: GridPosition
): MovementSystemResolution {
  if (path.length) {
    applyResolvedPlayerStateToDraft(draft, state.player);

    if (trackAffectedPlayerReason) {
      appendDraftAffectedPlayerMove(draft, {
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
      modifiers: [...state.player.modifiers],
      position: clonePosition(state.player.position),
      tags: clonePlayerTags(state.player.tags),
      turnFlags: [...state.player.turnFlags]
    },
    path: path.map(clonePosition),
    presentationEvents: state.presentationEvents,
    stopReason
  };
}

// Grounded displacement powers translate and drag style movement with immediate board triggers.
export function resolveLinearDisplacement(
  draft: ResolutionDraft,
  options: LinearMovementOptions
): MovementSystemResolution {
  const state = buildState(options.player, options.direction, options.movePoints);
  const startPosition = clonePosition(options.player.position);
  const path: GridPosition[] = [];
  const maxSteps = options.maxSteps ?? Number.POSITIVE_INFINITY;
  let stepsTaken = 0;
  let stopReason = "Movement ended";

  while ((state.remainingMovePoints ?? 0) > 0 && stepsTaken < maxSteps && state.shouldContinueMovement) {
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

    if (tile.type === "wall" || tile.type === "highwall") {
      stopReason = "Wall";
      break;
    }

    const moveCost = tile.type === "earthWall" ? 1 + tile.durability : 1;

    if ((state.remainingMovePoints ?? 0) < moveCost) {
      stopReason = "Not enough move points";
      break;
    }

    state.remainingMovePoints = (state.remainingMovePoints ?? 0) - moveCost;
    state.player.position = target;
    path.push(target);
    stepsTaken += 1;

    if (tile.type === "earthWall") {
      draft.tileMutations.push(createTileMutation(target, "floor", 0));
    }

    runPassThroughTriggers(draft, state, options.movement);
  }

  if (path.length && state.shouldResolveStopTriggers) {
    runStopTriggers(draft, state, options.movement);
  }

  return buildResolution(
    draft,
    state,
    options.movement,
    path,
    stopReason,
    options.trackAffectedPlayerReason,
    startPosition
  );
}

// Leap displacement resolves a landing path, then fires pass-through and stop triggers with leap metadata.
export function resolveLeapDisplacement(
  draft: ResolutionDraft,
  options: LeapMovementOptions
): MovementSystemResolution {
  const state = buildState(options.player, options.direction, null);
  const startPosition = clonePosition(options.player.position);
  const traversedPath: GridPosition[] = [];
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
      options.movement,
      leap.path,
      "No landing tile",
      options.trackAffectedPlayerReason,
      startPosition
    );
  }

  for (const position of leap.path) {
    state.player.position = position;
    traversedPath.push(clonePosition(position));
    runPassThroughTriggers(draft, state, options.movement);

    if (!state.shouldContinueMovement) {
      break;
    }
  }

  if (traversedPath.length && state.shouldResolveStopTriggers) {
    runStopTriggers(draft, state, options.movement);
  }

  return buildResolution(
    draft,
    state,
    options.movement,
    traversedPath,
    "Movement ended",
    options.trackAffectedPlayerReason,
    startPosition
  );
}

// Teleport displacement treats the destination as a zero-length path with pass-through plus stop semantics.
export function resolveTeleportDisplacement(
  draft: ResolutionDraft,
  options: TeleportMovementOptions
): MovementSystemResolution {
  const state = buildState(options.player, null, null);
  const startPosition = clonePosition(options.player.position);

  if (!isLandablePosition(draft.board, options.targetPosition, draft.tileMutations)) {
    return buildResolution(
      draft,
      state,
      options.movement,
      [],
      "Teleport target is not landable",
      options.trackAffectedPlayerReason,
      startPosition
    );
  }

  state.player.position = clonePosition(options.targetPosition);
  const path = [clonePosition(options.targetPosition)];

  runPassThroughTriggers(draft, state, options.movement);

  if (state.shouldResolveStopTriggers) {
    runStopTriggers(draft, state, options.movement);
  }

  return buildResolution(
    draft,
    state,
    options.movement,
    path,
    "Movement ended",
    options.trackAffectedPlayerReason,
    startPosition
  );
}
