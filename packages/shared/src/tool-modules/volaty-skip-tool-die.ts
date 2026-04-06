import type { ToolContentDefinition } from "../content/schema";
import { setPlayerTagValue } from "../playerTags";
import { VOLATY_LEAP_PENDING_TAG } from "../skills";
import { INSTANT_TOOL_INTERACTION } from "../toolInteraction";
import type { ActionResolution } from "../types";
import { buildAppliedResolution, consumeActiveTool } from "../rules/actionResolution";
import type { ToolModule } from "./types";
import { createToolPreview, createUsedSummary } from "./helpers";

export const VOLATY_SKIP_TOOL_DIE_TOOL_DEFINITION: ToolContentDefinition = {
  label: "飞跃",
  description: "跳过工具骰，只获得移动骰，并把本回合平移改成飞跃。",
  disabledHint: "当前无法进入飞跃模式。",
  source: "character_skill",
  interaction: INSTANT_TOOL_INTERACTION,
  conditions: [],
  defaultCharges: 1,
  defaultParams: {},
  phases: ["turn-start"],
  color: "#77b8ff",
  rollable: false,
  debugGrantable: false,
  endsTurnOnUse: false
};

function resolveVolatySkipToolDieTool(context: Parameters<ToolModule["execute"]>[0]): ActionResolution {
  return buildAppliedResolution({
    actor: {
      ...context.actor,
      tags: setPlayerTagValue(context.actor.tags, VOLATY_LEAP_PENDING_TAG, true)
    },
    nextToolDieSeed: context.toolDieSeed,
    path: [],
    phaseEffect: {
      nextPhase: "turn-action",
      rollMode: "movement_only"
    },
    preview: createToolPreview(context, { valid: true }),
    summary: createUsedSummary(VOLATY_SKIP_TOOL_DIE_TOOL_DEFINITION.label),
    tools: consumeActiveTool(context)
  });
}

export const VOLATY_SKIP_TOOL_DIE_TOOL_MODULE: ToolModule<"volatySkipToolDie"> = {
  id: "volatySkipToolDie",
  definition: VOLATY_SKIP_TOOL_DIE_TOOL_DEFINITION,
  execute: resolveVolatySkipToolDieTool
};
