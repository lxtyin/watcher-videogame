import { getDraftSummons, type ResolutionDraft } from "../rules/actionDraft";
import { getMovementTimingForPlayer } from "../rules/displacement";
import type { GridPosition, SummonId, SummonMutation } from "../types";
import { DICE_PIG_SUMMON_DEFINITION } from "./dice-pig";
import { collectSummonsAtPosition, hasSummonAtPosition, WALLET_SUMMON_DEFINITION } from "./wallet";
import type { SummonDeathContext, SummonDefinition, SummonPhaseContext } from "./types";

export type { SummonDeathContext, SummonDefinition, SummonPhaseContext, SummonTriggerContext } from "./types";

export const SUMMON_DEFINITIONS: Record<SummonId, SummonDefinition> = {
  dicePig: DICE_PIG_SUMMON_DEFINITION,
  wallet: WALLET_SUMMON_DEFINITION
};

export function getSummonDefinition(summonId: SummonId): SummonDefinition {
  return SUMMON_DEFINITIONS[summonId];
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
      movementTiming: getMovementTimingForPlayer(draft.actorId, context.player.id),
      phase: context.phase,
      player: {
        characterId: context.player.characterId,
        id: context.player.id,
        modifiers: [...context.player.modifiers],
        position: context.position,
        spawnPosition: context.player.spawnPosition,
        tags: context.player.tags,
        teamId: context.player.teamId,
        turnFlags: [...context.player.turnFlags]
      },
      position: context.position,
      startMs: context.startMs,
      ...(typeof context.remainingMovePoints === "number"
        ? { remainingMovePoints: context.remainingMovePoints }
        : {}),
      summon
    });
  }
}

export function resolvePassThroughSummonEffects(
  draft: ResolutionDraft,
  context: SummonPhaseContext
): void {
  runSummonPhase("onPassThrough", draft, context);
}

export function resolveStopSummonEffects(
  draft: ResolutionDraft,
  context: SummonPhaseContext
): void {
  runSummonPhase("onStop", draft, context);
}

export function resolveSummonDeath(
  draft: ResolutionDraft,
  context: Omit<SummonDeathContext, "draft">
): void {
  const summonDefinition = getSummonDefinition(context.summon.summonId);

  summonDefinition.onDeath?.({
    ...context,
    draft
  });
}

export { hasSummonAtPosition } from "./wallet";
