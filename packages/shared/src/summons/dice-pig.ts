import { SUMMON_REGISTRY } from "../content/summons";
import { type DiceRewardCode } from "../diceReward";
import { createDiceRewardTool } from "../diceRewardTools";
import {
  getDicePigCarryCode,
  type DicePigCarryCode
} from "../dicePig";
import { applyOnGetToolModifiers } from "../skills";
import {
  appendDraftPresentationEvents,
  appendDraftTriggeredSummonEffects,
  applyResolvedPlayerStateToDraft,
  setDraftToolDieSeed,
  setDraftToolInventory
} from "../rules/actionDraft";
import { createEffectEvent } from "../rules/actionPresentation";
import type { TurnToolSnapshot } from "../types";
import type { SummonDefinition, SummonDeathContext } from "./types";

const DICE_PIG_DEATH_REWARD_EFFECT_MS = 520;

function buildDicePigRewardToolInstanceId(context: SummonDeathContext, grantedToolId: string): string {
  return `${context.summon.instanceId}:${context.draft.sourceId}:death:${grantedToolId}`;
}

function createDicePigReward(
  context: SummonDeathContext,
  carryCode: DicePigCarryCode
): {
  grantedTool: TurnToolSnapshot | null;
  nextToolDieSeed: number;
} {
  if (carryCode === "none") {
    return {
      grantedTool: null,
      nextToolDieSeed: context.draft.nextToolDieSeed
    };
  }

  return createDiceRewardTool(
    carryCode as DiceRewardCode,
    context.draft.nextToolDieSeed,
    (grantedToolId) => buildDicePigRewardToolInstanceId(context, grantedToolId)
  );
}

export const DICE_PIG_SUMMON_DEFINITION: SummonDefinition = {
  id: "dicePig",
  ...SUMMON_REGISTRY.dicePig,
  onDeath: (context) => {
    const actor = context.draft.playersById.get(context.draft.actorId);

    if (!actor) {
      return;
    }

    const carryCode = getDicePigCarryCode(context.summon.state);
    const reward = createDicePigReward(context, carryCode);
    const grantedTools = reward.grantedTool ? [reward.grantedTool] : [];
    const normalizedReward = applyOnGetToolModifiers(
      actor.characterId,
      {
        id: actor.id,
        modifiers: [...actor.modifiers],
        phase: "turn-action",
        position: actor.position,
        tags: { ...actor.tags },
        toolHistory: [],
        turnNumber: 0,
        tools: grantedTools
      },
      grantedTools
    );

    actor.modifiers = [...normalizedReward.nextModifiers];
    actor.tags = { ...normalizedReward.nextTags };
    applyResolvedPlayerStateToDraft(context.draft, actor);
    setDraftToolDieSeed(context.draft, reward.nextToolDieSeed);
    setDraftToolInventory(context.draft, [...context.draft.tools, ...normalizedReward.tools]);
    if (carryCode !== "none") {
      appendDraftPresentationEvents(context.draft, [
        createEffectEvent(
          `${context.summon.instanceId}:${context.draft.sourceId}:death-reward`,
          "dice_reward_claim",
          context.position,
          [context.position],
          context.startMs,
          DICE_PIG_DEATH_REWARD_EFFECT_MS,
          { rewardCode: carryCode }
        )
      ]);
    }
    appendDraftTriggeredSummonEffects(context.draft, [
      {
        grantedTool: normalizedReward.tools[0] ?? null,
        kind: "dice_pig_death",
        playerId: actor.id,
        position: context.position,
        summonId: context.summon.summonId,
        summonInstanceId: context.summon.instanceId
      }
    ]);
  }
};
