import type { ToolContentDefinition } from "../content/schema";
import { setPlayerTagValue } from "../playerTags";
import { BLAZE_BOMB_PREPARED_TAG } from "../skills";
import { INSTANT_TOOL_INTERACTION } from "../toolInteraction";
import {
  setDraftActorTags,
  setDraftApplied,
  setDraftToolInventory
} from "../rules/actionDraft";
import { consumeActiveTool } from "../rules/actionResolution";
import type { ToolModule } from "./types";
import {
  appendDraftSoundEvent,
  createPlayerAnchor,
  createToolPreview,
  createToolUnavailableResult,
  createUsedSummary,
  isChargedToolAvailable
} from "./helpers";

function isBlazePrepareBombAvailable(
  context: Parameters<NonNullable<ToolContentDefinition["isAvailable"]>>[0]
) {
  const chargeAvailability = isChargedToolAvailable(context);

  if (!chargeAvailability.usable) {
    return chargeAvailability;
  }

  return context.phase === "turn-start"
    ? chargeAvailability
    : createToolUnavailableResult("只能在回合开始阶段使用");
}

export const BLAZE_PREPARE_BOMB_TOOL_DEFINITION: ToolContentDefinition = {
  label: "备弹",
  disabledHint: "当前无法进行备弹。",
  source: "character_skill",
  interaction: INSTANT_TOOL_INTERACTION,
  isAvailable: isBlazePrepareBombAvailable,
  defaultCharges: 1,
  defaultParams: {},
  phases: ["turn-start"],
  getTextDescription: () => ({
    title: "备弹",
    description: "放弃本回合移动骰，立刻只投工具骰，并在本回合行动阶段获得投弹。",
    details: ["回合开始阶段使用", "本回合获得投弹"]
  }),
  color: "#d86a42",
  rollable: false,
  debugGrantable: false,
  endsTurnOnUse: false
};

function resolveBlazePrepareBombTool(
  draft: Parameters<ToolModule["execute"]>[0],
  context: Parameters<ToolModule["execute"]>[1]
): void {
  appendDraftSoundEvent(draft, "tool_buff", "blaze-prepare-bomb:activate", {
    anchor: createPlayerAnchor(context.actor.id)
  });
  setDraftActorTags(
    draft,
    setPlayerTagValue(context.actor.tags, BLAZE_BOMB_PREPARED_TAG, true)
  );
  setDraftToolInventory(draft, consumeActiveTool(context));
  setDraftApplied(draft, createUsedSummary(BLAZE_PREPARE_BOMB_TOOL_DEFINITION.label), {
    path: [],
    phaseEffect: {
      rollMode: "tool_only"
    },
    preview: createToolPreview(context, { valid: true })
  });
}

export const BLAZE_PREPARE_BOMB_TOOL_MODULE: ToolModule<"blazePrepareBomb"> = {
  id: "blazePrepareBomb",
  definition: BLAZE_PREPARE_BOMB_TOOL_DEFINITION,
  execute: resolveBlazePrepareBombTool
};
