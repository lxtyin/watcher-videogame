import { SUMMON_REGISTRY } from "./content/summons";
import { rollToolDie } from "./dice";
import { isMovementDisposition, isMovementType } from "./rules/displacement";
import type {
  BoardSummonState,
  CharacterId,
  CharacterStateMap,
  Direction,
  GridPosition,
  MovementActor,
  MovementDescriptor,
  PlayerTurnFlag,
  SummonId,
  SummonMutation,
  TriggeredSummonEffect,
  TurnToolSnapshot
} from "./types";
import { createRolledToolInstance } from "./tools";

interface SummonTriggerTarget {
  characterId: CharacterId;
  characterState: CharacterStateMap;
  id: string;
  position: GridPosition;
  spawnPosition: GridPosition;
  turnFlags: PlayerTurnFlag[];
}

interface SummonTriggerContext {
  direction?: Direction;
  movement: MovementDescriptor | null;
  player: SummonTriggerTarget;
  position: GridPosition;
  remainingMovePoints?: number;
  sourceId: string;
  summon: BoardSummonState;
  toolDieSeed: number;
  tools: TurnToolSnapshot[];
}

interface SummonTriggerResult {
  consumeSummon?: boolean;
  nextCharacterState?: CharacterStateMap;
  nextDirection?: Direction;
  nextRemainingMovePoints?: number;
  nextToolDieSeed?: number;
  nextTools?: TurnToolSnapshot[];
  nextTurnFlags?: PlayerTurnFlag[];
  triggeredSummonEffects: TriggeredSummonEffect[];
}

interface SummonPhaseContext {
  direction?: Direction;
  movement: MovementDescriptor | null;
  player: MovementActor;
  position: GridPosition;
  remainingMovePoints?: number;
  sourceId: string;
  summons: BoardSummonState[];
  toolDieSeed: number;
  tools: TurnToolSnapshot[];
}

export interface SummonPhaseResolution {
  nextCharacterState?: CharacterStateMap;
  nextDirection?: Direction;
  nextRemainingMovePoints?: number;
  nextToolDieSeed?: number;
  nextTools?: TurnToolSnapshot[];
  nextTurnFlags?: PlayerTurnFlag[];
  summonMutations: SummonMutation[];
  triggeredSummonEffects: TriggeredSummonEffect[];
}

export interface SummonDefinition {
  description: string;
  id: SummonId;
  label: string;
  onPassThrough?: (context: SummonTriggerContext) => SummonTriggerResult | null;
  onStop?: (context: SummonTriggerContext) => SummonTriggerResult | null;
  triggerMode: "movement_trigger";
}

function positionsEqual(left: GridPosition, right: GridPosition): boolean {
  return left.x === right.x && left.y === right.y;
}

function buildWalletRewardToolInstanceId(
  instanceId: string,
  sourceId: string,
  grantedToolId: TurnToolSnapshot["toolId"]
): string {
  return `${instanceId}:${sourceId}:pickup:${grantedToolId}`;
}

function canWalletTrigger(
  context: SummonTriggerContext,
  allowedMovementTypes: Array<MovementDescriptor["type"]>
): boolean {
  return (
    context.summon.ownerId === context.player.id &&
    context.player.characterId === "leader" &&
    !!context.movement &&
    isMovementDisposition(context.movement, "active") &&
    allowedMovementTypes.some((movementType) => isMovementType(context.movement, movementType))
  );
}

function grantWalletReward(context: SummonTriggerContext): SummonTriggerResult {
  const toolRoll = rollToolDie(context.toolDieSeed);
  const grantedTool = createRolledToolInstance(
    buildWalletRewardToolInstanceId(
      context.summon.instanceId,
      context.sourceId,
      toolRoll.value.toolId
    ),
    toolRoll.value
  );

  return {
    consumeSummon: true,
    nextToolDieSeed: toolRoll.nextSeed,
    nextTools: [...context.tools, grantedTool],
    triggeredSummonEffects: [
      {
        kind: "wallet_pickup",
        movement: context.movement!,
        ownerId: context.summon.ownerId,
        playerId: context.player.id,
        position: context.summon.position,
        summonId: context.summon.summonId,
        summonInstanceId: context.summon.instanceId,
        grantedTool
      }
    ]
  };
}

export const SUMMON_DEFINITIONS: Record<SummonId, SummonDefinition> = {
  wallet: {
    id: "wallet",
    ...SUMMON_REGISTRY.wallet,
    onPassThrough: (context) => {
      if (!canWalletTrigger(context, ["translate", "drag"])) {
        return null;
      }

      return grantWalletReward(context);
    },
    onStop: (context) => {
      if (!canWalletTrigger(context, ["leap"])) {
        return null;
      }

      return grantWalletReward(context);
    }
  }
};

export function getSummonDefinition(summonId: SummonId): SummonDefinition {
  return SUMMON_DEFINITIONS[summonId];
}

function collectSummonsAtPosition(
  summons: BoardSummonState[],
  position: GridPosition,
  remainingSummonIds: Set<string>
): BoardSummonState[] {
  return summons.filter(
    (summon) =>
      remainingSummonIds.has(summon.instanceId) &&
      positionsEqual(summon.position, position)
  );
}

function applySummonTriggerResult(
  result: SummonTriggerResult,
  summon: BoardSummonState,
  remainingSummonIds: Set<string>,
  resolution: SummonPhaseResolution
): void {
  if (result.nextCharacterState) {
    resolution.nextCharacterState = {
      ...result.nextCharacterState
    };
  }

  if (result.nextDirection) {
    resolution.nextDirection = result.nextDirection;
  }

  if (typeof result.nextRemainingMovePoints === "number") {
    resolution.nextRemainingMovePoints = result.nextRemainingMovePoints;
  }

  if (typeof result.nextToolDieSeed === "number") {
    resolution.nextToolDieSeed = result.nextToolDieSeed;
  }

  if (result.nextTools) {
    resolution.nextTools = result.nextTools;
  }

  if (result.nextTurnFlags) {
    resolution.nextTurnFlags = [...result.nextTurnFlags];
  }

  if (result.consumeSummon && remainingSummonIds.has(summon.instanceId)) {
    remainingSummonIds.delete(summon.instanceId);
    resolution.summonMutations.push({
      instanceId: summon.instanceId,
      kind: "remove"
    });
  }

  resolution.triggeredSummonEffects.push(...result.triggeredSummonEffects);
}

function runSummonPhase(
  phase: "onPassThrough" | "onStop",
  context: SummonPhaseContext
): SummonPhaseResolution {
  const resolution: SummonPhaseResolution = {
    summonMutations: [],
    triggeredSummonEffects: []
  };
  const remainingSummonIds = new Set(context.summons.map((summon) => summon.instanceId));
  const summonsAtPosition = collectSummonsAtPosition(
    context.summons,
    context.position,
    remainingSummonIds
  );

  for (const summon of summonsAtPosition) {
    const summonDefinition = getSummonDefinition(summon.summonId);
    const trigger = summonDefinition[phase];

    if (!trigger) {
      continue;
    }

    const result = trigger({
      ...(context.direction ? { direction: context.direction } : {}),
      movement: context.movement,
      player: {
        characterId: context.player.characterId,
        characterState: context.player.characterState,
        id: context.player.id,
        position: context.position,
        spawnPosition: context.player.spawnPosition,
        turnFlags: [...context.player.turnFlags]
      },
      position: context.position,
      ...(typeof context.remainingMovePoints === "number"
        ? { remainingMovePoints: context.remainingMovePoints }
        : {}),
      sourceId: context.sourceId,
      summon,
      toolDieSeed: resolution.nextToolDieSeed ?? context.toolDieSeed,
      tools: resolution.nextTools ?? context.tools
    });

    if (!result) {
      continue;
    }

    applySummonTriggerResult(result, summon, remainingSummonIds, resolution);
  }

  return resolution;
}

// Summon occupancy checks keep deployment validation shared between preview and authority.
export function hasSummonAtPosition(summons: BoardSummonState[], position: GridPosition): boolean {
  return summons.some((summon) => positionsEqual(summon.position, position));
}

export function createSummonUpsertMutation(
  instanceId: string,
  summonId: SummonId,
  ownerId: string,
  position: GridPosition
): SummonMutation {
  return {
    instanceId,
    kind: "upsert",
    ownerId,
    position,
    summonId
  };
}

// Summon pass-through now fires immediately during displacement instead of replaying the full path later.
export function resolvePassThroughSummonEffects(
  context: SummonPhaseContext
): SummonPhaseResolution {
  return runSummonPhase("onPassThrough", context);
}

// Stop summons reuse the same live summon set and only fire when the displacement actually ends on a tile.
export function resolveStopSummonEffects(
  context: SummonPhaseContext
): SummonPhaseResolution {
  return runSummonPhase("onStop", context);
}
