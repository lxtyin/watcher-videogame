import { SUMMON_REGISTRY } from "../content/summons";
import { rollToolDie } from "../dice";
import {
  appendDraftSummonMutations,
  appendDraftTriggeredSummonEffects,
  setDraftToolDieSeed,
  setDraftToolInventory,
  type ResolutionDraft
} from "../rules/actionDraft";
import { createRolledToolInstance } from "../tools";
import type { BoardSummonState, GridPosition, TurnToolSnapshot } from "../types";
import type { SummonDefinition, SummonTriggerContext } from "./types";

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
      movement: context.movement,
      ownerId: context.summon.ownerId,
      playerId: context.player.id,
      position: context.summon.position,
      summonId: context.summon.summonId,
      summonInstanceId: context.summon.instanceId,
      grantedTool
    }
  ]);
}


export const WALLET_SUMMON_DEFINITION: SummonDefinition = {
  id: "wallet",
  ...SUMMON_REGISTRY.wallet,
  onPassThrough: (context) => {
    if (context.movementTiming === "in_turn") {
      grantWalletReward(context);
    }
  },
  onStop: (context) => {
    if (context.movementTiming === "in_turn") {
      grantWalletReward(context);
    }
  }
};

export function collectSummonsAtPosition(
  summons: BoardSummonState[],
  position: GridPosition
): BoardSummonState[] {
  return summons.filter((summon) => positionsEqual(summon.position, position));
}

export function hasSummonAtPosition(
  summons: BoardSummonState[],
  position: GridPosition
): boolean {
  return summons.some((summon) => positionsEqual(summon.position, position));
}
