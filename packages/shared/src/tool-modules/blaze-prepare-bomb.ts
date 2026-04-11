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
import { createToolPreview, createUsedSummary } from "./helpers";

export const BLAZE_PREPARE_BOMB_TOOL_DEFINITION: ToolContentDefinition = {
  label: "备弹",
  description: "跳过本回合后续阶段，并在下回合行动阶段获得投弹。",
  disabledHint: "当前无法进行备弹。",
  source: "character_skill",
  interaction: INSTANT_TOOL_INTERACTION,
  defaultCharges: 1,
  defaultParams: {},
  phases: ["turn-start"],
  getTextDescription: () => ({
    title: "备弹",
    description: "跳过本回合后续阶段，并在下回合行动阶段获得投弹。",
    details: ["准备投弹"]
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
  setDraftActorTags(
    draft,
    setPlayerTagValue(context.actor.tags, BLAZE_BOMB_PREPARED_TAG, true)
  );
  setDraftToolInventory(draft, consumeActiveTool(context));
  setDraftApplied(draft, createUsedSummary(BLAZE_PREPARE_BOMB_TOOL_DEFINITION.label), {
    path: [],
    phaseEffect: {
      finishTurn: true
    },
    preview: createToolPreview(context, { valid: true })
  });
}

export const BLAZE_PREPARE_BOMB_TOOL_MODULE: ToolModule<"blazePrepareBomb"> = {
  id: "blazePrepareBomb",
  definition: BLAZE_PREPARE_BOMB_TOOL_DEFINITION,
  execute: resolveBlazePrepareBombTool
};
