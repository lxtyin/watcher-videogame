import { SUMMON_REGISTRY } from "../content/summons";
import {
  getDicePigCarryCode,
  type DicePigCarryCode
} from "../dicePig";
import { rollToolDie } from "../dice";
import { applyOnGetToolModifiers } from "../skills";
import {
  appendDraftTriggeredSummonEffects,
  applyResolvedPlayerStateToDraft,
  setDraftToolDieSeed,
  setDraftToolInventory
} from "../rules/actionDraft";
import { createMovementToolInstance, createRolledToolInstance, TOOL_DIE_FACES } from "../tools";
import type { TurnToolSnapshot } from "../types";
import type { SummonDefinition, SummonDeathContext } from "./types";

function buildDicePigRewardToolInstanceId(context: SummonDeathContext, grantedToolId: string): string {
  return `${context.summon.instanceId}:${context.draft.sourceId}:death:${grantedToolId}`;
}

function findToolDieFace(toolId: TurnToolSnapshot["toolId"]) {
  return TOOL_DIE_FACES.find((face) => face.toolId === toolId) ?? null;
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

  if (carryCode === "random_tool") {
    const toolRoll = rollToolDie(context.draft.nextToolDieSeed);

    return {
      grantedTool: createRolledToolInstance(
        buildDicePigRewardToolInstanceId(context, toolRoll.value.toolId),
        toolRoll.value
      ),
      nextToolDieSeed: toolRoll.nextSeed
    };
  }

  if (carryCode.startsWith("point:")) {
    const movePoints = Number.parseInt(carryCode.slice("point:".length), 10);

    return {
      grantedTool: createMovementToolInstance(
        buildDicePigRewardToolInstanceId(context, `movement-${movePoints}`),
        movePoints
      ),
      nextToolDieSeed: context.draft.nextToolDieSeed
    };
  }

  const toolId = carryCode.slice("tool:".length) as TurnToolSnapshot["toolId"];
  const toolFace = findToolDieFace(toolId);

  return {
    grantedTool: toolFace
      ? createRolledToolInstance(
          buildDicePigRewardToolInstanceId(context, toolFace.toolId),
          toolFace
        )
      : null,
    nextToolDieSeed: context.draft.nextToolDieSeed
  };
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
