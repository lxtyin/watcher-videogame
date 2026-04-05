import type {
  BoardDefinition,
  BoardPlayerState,
  BoardSummonState,
  Direction,
  GridPosition,
  ModifierId,
  MovementActor,
  MovementDescriptor,
  PlayerTagMap,
  ResolvedActorState,
  SummonMutation,
  TileMutation,
  TriggeredSummonEffect,
  TriggeredTerrainEffect,
  TurnToolSnapshot
} from "../types";
import { isWithinBoard } from "../board";
import { clonePlayerTags } from "../playerTags";
import { resolvePassThroughSummonEffects, resolveStopSummonEffects } from "../summons";
import { resolvePassThroughTerrainEffect, resolveStopTerrainEffect } from "../terrain";
import {
  createTileMutation,
  getTileAfterMutations,
  isLandablePosition,
  resolveLeapLanding,
  stepPosition
} from "./spatial";

interface MovementSystemContext {
  activeTool: TurnToolSnapshot | null;
  actorId: string;
  board: BoardDefinition;
  players: BoardPlayerState[];
  sourceId: string;
  summons: BoardSummonState[];
}

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
  priorSummonMutations?: SummonMutation[];
  priorTileMutations?: TileMutation[];
  toolDieSeed: number;
  tools: TurnToolSnapshot[];
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
  nextToolDieSeed: number;
  path: GridPosition[];
  stopReason: string;
  summonMutations: SummonMutation[];
  tileMutations: TileMutation[];
  tools: TurnToolSnapshot[];
  triggeredSummonEffects: TriggeredSummonEffect[];
  triggeredTerrainEffects: TriggeredTerrainEffect[];
}

interface MutableMovementState {
  direction: Direction | null;
  nextToolDieSeed: number;
  player: MovementSubject;
  remainingMovePoints: number | null;
  summonMutations: SummonMutation[];
  tileMutations: TileMutation[];
  tools: TurnToolSnapshot[];
  triggeredSummonEffects: TriggeredSummonEffect[];
  triggeredTerrainEffects: TriggeredTerrainEffect[];
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
  tools: TurnToolSnapshot[],
  toolDieSeed: number,
  direction: Direction | null,
  remainingMovePoints: number | null
): MutableMovementState {
  return {
    direction,
    nextToolDieSeed: toolDieSeed,
    player: cloneSubject(player),
    remainingMovePoints,
    summonMutations: [],
    tileMutations: [],
    tools,
    triggeredSummonEffects: [],
    triggeredTerrainEffects: []
  };
}

function applyToolStatePatch(
  state: MutableMovementState,
  patch: {
    nextDirection?: Direction;
    nextModifiers?: ModifierId[];
    nextRemainingMovePoints?: number;
    nextTags?: PlayerTagMap;
    nextToolDieSeed?: number;
    nextTools?: TurnToolSnapshot[];
    nextTurnFlags?: MovementActor["turnFlags"];
  }
): void {
  if (patch.nextTags) {
    state.player.tags = clonePlayerTags(patch.nextTags);
  }

  if (patch.nextModifiers) {
    state.player.modifiers = [...patch.nextModifiers];
  }

  if (patch.nextDirection) {
    state.direction = patch.nextDirection;
  }

  if (typeof patch.nextRemainingMovePoints === "number") {
    state.remainingMovePoints = patch.nextRemainingMovePoints;
  }

  if (typeof patch.nextToolDieSeed === "number") {
    state.nextToolDieSeed = patch.nextToolDieSeed;
  }

  if (patch.nextTools) {
    state.tools = patch.nextTools;
  }

  if (patch.nextTurnFlags) {
    state.player.turnFlags = [...patch.nextTurnFlags];
  }
}

function appendEffectArrays(
  state: MutableMovementState,
  patch: {
    summonMutations?: SummonMutation[];
    triggeredSummonEffects?: TriggeredSummonEffect[];
    triggeredTerrainEffects?: TriggeredTerrainEffect[];
  }
): void {
  if (patch.summonMutations?.length) {
    state.summonMutations.push(...patch.summonMutations);
  }

  if (patch.triggeredSummonEffects?.length) {
    state.triggeredSummonEffects.push(...patch.triggeredSummonEffects);
  }

  if (patch.triggeredTerrainEffects?.length) {
    state.triggeredTerrainEffects.push(...patch.triggeredTerrainEffects);
  }
}

function applyStopPatch(
  state: MutableMovementState,
  patch: {
    nextModifiers?: ModifierId[];
    nextPosition?: GridPosition;
    nextTags?: PlayerTagMap;
    nextToolDieSeed?: number;
    nextTools?: TurnToolSnapshot[];
    nextTurnFlags?: MovementActor["turnFlags"];
  }
): void {
  applyToolStatePatch(state, patch);

  if (patch.nextPosition) {
    state.player.position = clonePosition(patch.nextPosition);
  }
}

function applySummonMutationsToMap(
  summonsById: Map<string, BoardSummonState>,
  summonMutations: SummonMutation[]
): void {
  for (const mutation of summonMutations) {
    if (mutation.kind === "remove") {
      summonsById.delete(mutation.instanceId);
      continue;
    }

    summonsById.set(mutation.instanceId, {
      instanceId: mutation.instanceId,
      ownerId: mutation.ownerId,
      position: clonePosition(mutation.position),
      summonId: mutation.summonId
    });
  }
}

function buildLiveSummons(
  context: MovementSystemContext,
  priorSummonMutations: SummonMutation[],
  localSummonMutations: SummonMutation[]
): BoardSummonState[] {
  const summonsById = new Map(
    context.summons.map((summon) => [summon.instanceId, summon] as const)
  );

  applySummonMutationsToMap(summonsById, priorSummonMutations);
  applySummonMutationsToMap(summonsById, localSummonMutations);
  return [...summonsById.values()];
}

function buildTileMutationSet(
  priorTileMutations: TileMutation[],
  localTileMutations: TileMutation[]
): TileMutation[] {
  return [...priorTileMutations, ...localTileMutations];
}

function runPassThroughTriggers(
  context: MovementSystemContext,
  state: MutableMovementState,
  movement: MovementDescriptor,
  priorTileMutations: TileMutation[],
  priorSummonMutations: SummonMutation[]
): void {
  const tile = getTileAfterMutations(
    context.board,
    buildTileMutationSet(priorTileMutations, state.tileMutations),
    state.player.position
  );

  if (!tile) {
    return;
  }

  const terrainResolution = resolvePassThroughTerrainEffect({
    ...(state.direction ? { direction: state.direction } : {}),
    movement,
    playerId: state.player.id,
    position: state.player.position,
    ...(typeof state.remainingMovePoints === "number"
      ? { remainingMovePoints: state.remainingMovePoints }
      : {}),
    tile
  });

  applyToolStatePatch(state, terrainResolution);
  appendEffectArrays(state, terrainResolution);

  const summonResolution = resolvePassThroughSummonEffects({
    movement,
    player: state.player,
    position: state.player.position,
    sourceId: context.sourceId,
    summons: buildLiveSummons(context, priorSummonMutations, state.summonMutations),
    toolDieSeed: state.nextToolDieSeed,
    tools: state.tools,
    ...(state.direction ? { direction: state.direction } : {}),
    ...(typeof state.remainingMovePoints === "number"
      ? { remainingMovePoints: state.remainingMovePoints }
      : {})
  });

  applyToolStatePatch(state, summonResolution);
  appendEffectArrays(state, summonResolution);
}

function runStopTriggers(
  context: MovementSystemContext,
  state: MutableMovementState,
  movement: MovementDescriptor | null,
  priorTileMutations: TileMutation[],
  priorSummonMutations: SummonMutation[]
): void {
  const liveSummons = buildLiveSummons(context, priorSummonMutations, state.summonMutations);
  const summonResolution = resolveStopSummonEffects({
    movement,
    player: state.player,
    position: state.player.position,
    sourceId: context.sourceId,
    summons: liveSummons,
    toolDieSeed: state.nextToolDieSeed,
    tools: state.tools
  });

  applyStopPatch(state, summonResolution);
  appendEffectArrays(state, summonResolution);

  const tile = getTileAfterMutations(
    context.board,
    buildTileMutationSet(priorTileMutations, state.tileMutations),
    state.player.position
  );

  if (!tile) {
    return;
  }

  const terrainResolution = resolveStopTerrainEffect({
    movement,
    player: {
      characterId: state.player.characterId,
      id: state.player.id,
      isActor: state.player.id === context.actorId,
      modifiers: [...state.player.modifiers],
      position: state.player.position,
      spawnPosition: state.player.spawnPosition,
      tags: state.player.tags,
      turnFlags: [...state.player.turnFlags]
    },
    sourceId: context.sourceId,
    tile,
    toolDieSeed: state.nextToolDieSeed,
    tools: state.tools
  });

  if (!terrainResolution) {
    return;
  }

  applyStopPatch(state, terrainResolution);
  appendEffectArrays(state, terrainResolution);
}

function buildResolution(
  state: MutableMovementState,
  path: GridPosition[],
  stopReason: string
): MovementSystemResolution {
  return {
    actor: {
      modifiers: [...state.player.modifiers],
      position: clonePosition(state.player.position),
      tags: clonePlayerTags(state.player.tags),
      turnFlags: [...state.player.turnFlags]
    },
    nextToolDieSeed: state.nextToolDieSeed,
    path,
    stopReason,
    summonMutations: state.summonMutations,
    tileMutations: state.tileMutations,
    tools: state.tools,
    triggeredSummonEffects: state.triggeredSummonEffects,
    triggeredTerrainEffects: state.triggeredTerrainEffects
  };
}

// Grounded displacement powers translate and drag style movement with immediate board triggers.
export function resolveLinearDisplacement(
  context: MovementSystemContext,
  options: LinearMovementOptions
): MovementSystemResolution {
  const state = buildState(
    options.player,
    options.tools,
    options.toolDieSeed,
    options.direction,
    options.movePoints
  );
  const priorTileMutations = options.priorTileMutations ?? [];
  const priorSummonMutations = options.priorSummonMutations ?? [];
  const path: GridPosition[] = [];
  const maxSteps = options.maxSteps ?? Number.POSITIVE_INFINITY;
  let stepsTaken = 0;
  let stopReason = "Movement ended";

  while ((state.remainingMovePoints ?? 0) > 0 && stepsTaken < maxSteps) {
    const direction = state.direction;

    if (!direction) {
      stopReason = "No direction";
      break;
    }

    const target = stepPosition(state.player.position, direction);

    if (!isWithinBoard(context.board, target)) {
      stopReason = "Board edge";
      break;
    }

    const tile = getTileAfterMutations(
      context.board,
      buildTileMutationSet(priorTileMutations, state.tileMutations),
      target
    );

    if (!tile) {
      stopReason = "Missing tile";
      break;
    }

    if (tile.type === "wall") {
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
      state.tileMutations.push(createTileMutation(target, "floor", 0));
    }

    runPassThroughTriggers(context, state, options.movement, priorTileMutations, priorSummonMutations);
  }

  if (path.length) {
    runStopTriggers(context, state, options.movement, priorTileMutations, priorSummonMutations);
  }

  return buildResolution(state, path, stopReason);
}

// Leap displacement resolves a landing path, then fires pass-through and stop triggers with leap metadata.
export function resolveLeapDisplacement(
  context: MovementSystemContext,
  options: LeapMovementOptions
): MovementSystemResolution {
  const state = buildState(
    options.player,
    options.tools,
    options.toolDieSeed,
    options.direction,
    null
  );
  const priorTileMutations = options.priorTileMutations ?? [];
  const priorSummonMutations = options.priorSummonMutations ?? [];
  const leap = resolveLeapLanding(
    context.board,
    options.player.position,
    options.direction,
    options.maxDistance,
    priorTileMutations
  );

  if (!leap.landing) {
    return buildResolution(state, leap.path, "No landing tile");
  }

  for (const position of leap.path) {
    state.player.position = position;
    runPassThroughTriggers(context, state, options.movement, priorTileMutations, priorSummonMutations);
  }

  runStopTriggers(context, state, options.movement, priorTileMutations, priorSummonMutations);
  return buildResolution(state, leap.path, "Movement ended");
}

// Teleport displacement treats the destination as a zero-length path with pass-through plus stop semantics.
export function resolveTeleportDisplacement(
  context: MovementSystemContext,
  options: TeleportMovementOptions
): MovementSystemResolution {
  const state = buildState(options.player, options.tools, options.toolDieSeed, null, null);
  const priorTileMutations = options.priorTileMutations ?? [];
  const priorSummonMutations = options.priorSummonMutations ?? [];

  if (!isLandablePosition(context.board, options.targetPosition, priorTileMutations)) {
    return buildResolution(state, [], "Teleport target is not landable");
  }

  state.player.position = clonePosition(options.targetPosition);
  const path = [clonePosition(options.targetPosition)];

  runPassThroughTriggers(context, state, options.movement, priorTileMutations, priorSummonMutations);
  runStopTriggers(context, state, options.movement, priorTileMutations, priorSummonMutations);

  return buildResolution(state, path, "Movement ended");
}
