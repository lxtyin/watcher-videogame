import type { ToolContentDefinition } from "../content/schema";
import { setPlayerTagValue } from "../playerTags";
import { VOLATY_LEAP_TURN_TAG } from "../skills";
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

function isVolatySkipToolDieAvailable(
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

export const VOLATY_SKIP_TOOL_DIE_TOOL_DEFINITION: ToolContentDefinition = {
  label: "飞跃",
  disabledHint: "无法使用",
  source: "character_skill",
  interaction: INSTANT_TOOL_INTERACTION,
  isAvailable: isVolatySkipToolDieAvailable,
  defaultCharges: 1,
  defaultParams: {},
  phases: ["turn-start"],
  getTextDescription: () => ({
    title: "飞跃",
    description: "跳过工具骰，只获得移动骰，并把本回合平移改成飞跃。",
    details: ["进入飞跃模式"]
  }),
  color: "#77b8ff",
  rollable: false,
  debugGrantable: false,
  endsTurnOnUse: false
};

function resolveVolatySkipToolDieTool(
  draft: Parameters<ToolModule["execute"]>[0],
  context: Parameters<ToolModule["execute"]>[1]
): void {
  appendDraftSoundEvent(draft, "tool_buff", "volaty-skip-tool-die:activate", {
    anchor: createPlayerAnchor(context.actor.id)
  });
  setDraftActorTags(
    draft,
    setPlayerTagValue(context.actor.tags, VOLATY_LEAP_TURN_TAG, true)
  );
  setDraftToolInventory(draft, consumeActiveTool(context));
  setDraftApplied(draft, createUsedSummary(VOLATY_SKIP_TOOL_DIE_TOOL_DEFINITION.label), {
    phaseEffect: {
      rollMode: "movement_only"
    },
    path: [],
    preview: createToolPreview(context, { valid: true })
  });
}

export const VOLATY_SKIP_TOOL_DIE_TOOL_MODULE: ToolModule<"volatySkipToolDie"> = {
  id: "volatySkipToolDie",
  definition: VOLATY_SKIP_TOOL_DIE_TOOL_DEFINITION,
  execute: resolveVolatySkipToolDieTool
};
