import { SUMMON_REGISTRY } from "../content/summons";
import { rollToolDie } from "../dice";
import { applyOnGetToolModifiers } from "../skills";
import {
  appendDraftTriggeredSummonEffects,
  applyResolvedPlayerStateToDraft,
  setDraftToolDieSeed,
  setDraftToolInventory
} from "../rules/actionDraft";
import { createRolledToolInstance } from "../tools";
import type { SummonDefinition, SummonDeathContext } from "./types";

function buildDicePigRewardToolInstanceId(context: SummonDeathContext, grantedToolId: string): string {
  return `${context.summon.instanceId}:${context.draft.sourceId}:death:${grantedToolId}`;
}

export const DICE_PIG_SUMMON_DEFINITION: SummonDefinition = {
  id: "dicePig",
  ...SUMMON_REGISTRY.dicePig,
  onDeath: (context) => {
    const actor = context.draft.playersById.get(context.draft.actorId);

    if (!actor) {
      return;
    }

    const toolRoll = rollToolDie(context.draft.nextToolDieSeed);
    const grantedTool = createRolledToolInstance(
      buildDicePigRewardToolInstanceId(context, toolRoll.value.toolId),
      toolRoll.value
    );
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
        tools: [grantedTool]
      },
      [grantedTool]
    );

    actor.modifiers = [...normalizedReward.nextModifiers];
    actor.tags = { ...normalizedReward.nextTags };
    applyResolvedPlayerStateToDraft(context.draft, actor);
    setDraftToolDieSeed(context.draft, toolRoll.nextSeed);
    setDraftToolInventory(context.draft, [...context.draft.tools, ...normalizedReward.tools]);
    appendDraftTriggeredSummonEffects(context.draft, [
      {
        grantedTool,
        kind: "dice_pig_death",
        playerId: actor.id,
        position: context.position,
        summonId: context.summon.summonId,
        summonInstanceId: context.summon.instanceId
      }
    ]);
  }
};
