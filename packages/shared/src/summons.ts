import { SUMMON_REGISTRY } from "./content/summons";
import { rollToolDie } from "./dice";
import type {
  BoardSummonState,
  CharacterId,
  Direction,
  GridPosition,
  ModifierId,
  MovementActor,
  MovementDescriptor,
  PlayerTagMap,
  PlayerTurnFlag,
  SummonId,
  SummonMutation,
  TurnToolSnapshot
} from "./types";
import { createRolledToolInstance } from "./tools";
import type { ResolutionDraft } from "./rules/actionDraft";
import {
  appendDraftSummonMutations,
  appendDraftTriggeredSummonEffects,
  getDraftSummons,
  setDraftToolDieSeed,
  setDraftToolInventory
} from "./rules/actionDraft";
import { isMovementDisposition, isMovementType } from "./rules/displacement";

interface SummonTriggerTarget {
  characterId: CharacterId;
  id: string;
  modifiers: ModifierId[];
  position: GridPosition;
  spawnPosition: GridPosition;
  tags: PlayerTagMap;
  turnFlags: PlayerTurnFlag[];
}

interface SummonTriggerContext {
  direction?: Direction;
  draft: ResolutionDraft;
  movement: MovementDescriptor | null;
  player: SummonTriggerTarget;
  position: GridPosition;
  remainingMovePoints?: number;
  summon: BoardSummonState;
}

interface SummonPhaseContext {
  direction?: Direction;
  movement: MovementDescriptor | null;
  player: MovementActor;
  position: GridPosition;
  remainingMovePoints?: number;
}

export interface SummonDefinition {
  description: string;
  id: SummonId;
  label: string;
  onPassThrough?: (context: SummonTriggerContext) => void;
  onStop?: (context: SummonTriggerContext) => void;
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

function removeSummonFromDraft(draft: ResolutionDraft, summon: BoardSummonState): void {
  if (!draft.summonsById.has(summon.instanceId)) {
    return;
  }

  appendDraftSummonMutations(draft, [
    {
      instanceId: summon.instanceId,
      kind: "remove"
    }
  ]);
}

function grantWalletReward(context: SummonTriggerContext): void {
  const toolRoll = rollToolDie(context.draft.nextToolDieSeed);
  const grantedTool = createRolledToolInstance(
    buildWalletRewardToolInstanceId(
      context.summon.instanceId,
      context.draft.sourceId,
      toolRoll.value.toolId
    ),
    toolRoll.value
  );

  removeSummonFromDraft(context.draft, context.summon);
  setDraftToolDieSeed(context.draft, toolRoll.nextSeed);
  setDraftToolInventory(context.draft, [...context.draft.tools, grantedTool]);
  appendDraftTriggeredSummonEffects(context.draft, [
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
  ]);
}

export const SUMMON_DEFINITIONS: Record<SummonId, SummonDefinition> = {
  wallet: {
    id: "wallet",
    ...SUMMON_REGISTRY.wallet,
    onPassThrough: (context) => {
      if (!canWalletTrigger(context, ["translate", "drag"])) {
        return;
      }

      grantWalletReward(context);
    },
    onStop: (context) => {
      if (!canWalletTrigger(context, ["leap"])) {
        return;
      }

      grantWalletReward(context);
    }
  }
};

export function getSummonDefinition(summonId: SummonId): SummonDefinition {
  return SUMMON_DEFINITIONS[summonId];
}

function collectSummonsAtPosition(
  summons: BoardSummonState[],
  position: GridPosition
): BoardSummonState[] {
  return summons.filter((summon) => positionsEqual(summon.position, position));
}

function runSummonPhase(
  phase: "onPassThrough" | "onStop",
  draft: ResolutionDraft,
  context: SummonPhaseContext
): void {
  const summonsAtPosition = collectSummonsAtPosition(getDraftSummons(draft), context.position);

  for (const summon of summonsAtPosition) {
    const summonDefinition = getSummonDefinition(summon.summonId);
    const trigger = summonDefinition[phase];

    if (!trigger) {
      continue;
    }

    trigger({
      ...(context.direction ? { direction: context.direction } : {}),
      draft,
      movement: context.movement,
      player: {
        characterId: context.player.characterId,
        id: context.player.id,
        modifiers: [...context.player.modifiers],
        position: context.position,
        spawnPosition: context.player.spawnPosition,
        tags: context.player.tags,
        turnFlags: [...context.player.turnFlags]
      },
      position: context.position,
      ...(typeof context.remainingMovePoints === "number"
        ? { remainingMovePoints: context.remainingMovePoints }
        : {}),
      summon
    });
  }
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
  draft: ResolutionDraft,
  context: SummonPhaseContext
): void {
  runSummonPhase("onPassThrough", draft, context);
}

// Stop summons reuse the same live summon set and only fire when the displacement actually ends on a tile.
export function resolveStopSummonEffects(
  draft: ResolutionDraft,
  context: SummonPhaseContext
): void {
  runSummonPhase("onStop", draft, context);
}
