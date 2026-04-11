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
import { createToolPreview, createUsedSummary } from "./helpers";

export const VOLATY_SKIP_TOOL_DIE_TOOL_DEFINITION: ToolContentDefinition = {
  label: "飞跃",
  description: "跳过工具骰，只获得移动骰，并把本回合平移改成飞跃。",
  disabledHint: "当前无法进入飞跃模式。",
  source: "character_skill",
  interaction: INSTANT_TOOL_INTERACTION,
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
  setDraftActorTags(
    draft,
    setPlayerTagValue(context.actor.tags, VOLATY_LEAP_TURN_TAG, true)
  );
  setDraftToolInventory(draft, consumeActiveTool(context));
  setDraftApplied(draft, createUsedSummary(VOLATY_SKIP_TOOL_DIE_TOOL_DEFINITION.label), {
    path: [],
    preview: createToolPreview(context, { valid: true })
  });
}

export const VOLATY_SKIP_TOOL_DIE_TOOL_MODULE: ToolModule<"volatySkipToolDie"> = {
  id: "volatySkipToolDie",
  definition: VOLATY_SKIP_TOOL_DIE_TOOL_DEFINITION,
  execute: resolveVolatySkipToolDieTool
};
