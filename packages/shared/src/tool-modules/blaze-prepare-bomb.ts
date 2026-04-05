import type { ToolContentDefinition } from "../content/schema";
import { setPlayerTagValue } from "../playerTags";
import { BLAZE_BOMB_PREPARED_TAG } from "../skills";
import type { ActionResolution } from "../types";
import { buildAppliedResolution, consumeActiveTool } from "../rules/actionResolution";
import type { ToolModule } from "./types";
import { createUsedSummary } from "./helpers";

export const BLAZE_PREPARE_BOMB_TOOL_DEFINITION: ToolContentDefinition = {
  label: "备弹",
  description: "跳过本回合后续阶段，并在下回合行动阶段获得投弹。",
  disabledHint: "当前无法进行备弹。",
  source: "character_skill",
  targetMode: "instant",
  conditions: [],
  defaultCharges: 1,
  defaultParams: {},
  phases: ["turn-start"],
  color: "#d86a42",
  rollable: false,
  debugGrantable: false,
  endsTurnOnUse: false
};

function resolveBlazePrepareBombTool(context: Parameters<ToolModule["execute"]>[0]): ActionResolution {
  return buildAppliedResolution(
    {
      ...context.actor,
      tags: setPlayerTagValue(context.actor.tags, BLAZE_BOMB_PREPARED_TAG, true)
    },
    consumeActiveTool(context),
    createUsedSummary(BLAZE_PREPARE_BOMB_TOOL_DEFINITION.label),
    context.toolDieSeed,
    [],
    [],
    [],
    [],
    [],
    null,
    [],
    [],
    false,
    null,
    {
      finishTurn: true
    }
  );
}

export const BLAZE_PREPARE_BOMB_TOOL_MODULE: ToolModule<"blazePrepareBomb"> = {
  id: "blazePrepareBomb",
  definition: BLAZE_PREPARE_BOMB_TOOL_DEFINITION,
  execute: resolveBlazePrepareBombTool
};
