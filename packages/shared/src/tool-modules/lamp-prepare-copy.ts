import type { ToolContentDefinition } from "../content/schema";
import { setPlayerTagValue } from "../playerTags";
import { LAMP_COPY_ROLL_READY_TAG } from "../skills/lamp";
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
  createUsedSummary,
  isChargedToolAvailable
} from "./helpers";

export const LAMP_PREPARE_COPY_TOOL_DEFINITION: ToolContentDefinition = {
  label: "复制",
  disabledHint: "当前无法替换本回合的工具骰。",
  source: "character_skill",
  interaction: INSTANT_TOOL_INTERACTION,
  isAvailable: isChargedToolAvailable,
  defaultCharges: 1,
  defaultParams: {},
  phases: ["turn-start"],
  getTextDescription: () => ({
    title: "复制",
    description: "放弃本回合工具骰，在本回合行动阶段获得一个可供选择的复制工具。",
    details: ["复制工具"]
  }),
  color: "#c98e44",
  rollable: false,
  debugGrantable: false,
  endsTurnOnUse: false
};

function resolveLampPrepareCopyTool(
  draft: Parameters<ToolModule["execute"]>[0],
  context: Parameters<ToolModule["execute"]>[1]
): void {
  appendDraftSoundEvent(draft, "tool_buff", "lamp-prepare-copy:activate", {
    anchor: createPlayerAnchor(context.actor.id)
  });
  setDraftActorTags(
    draft,
    setPlayerTagValue(context.actor.tags, LAMP_COPY_ROLL_READY_TAG, true)
  );
  setDraftToolInventory(draft, consumeActiveTool(context));
  setDraftApplied(draft, createUsedSummary(LAMP_PREPARE_COPY_TOOL_DEFINITION.label), {
    path: [],
    preview: createToolPreview(context, { valid: true })
  });
}

export const LAMP_PREPARE_COPY_TOOL_MODULE: ToolModule<"lampPrepareCopy"> = {
  id: "lampPrepareCopy",
  definition: LAMP_PREPARE_COPY_TOOL_DEFINITION,
  execute: resolveLampPrepareCopyTool
};
