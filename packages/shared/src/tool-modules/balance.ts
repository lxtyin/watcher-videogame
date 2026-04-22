import type { ToolContentDefinition } from "../content/schema";
import { getPlayerTagNumber, setPlayerTagValue } from "../playerTags";
import { FARTHER_BANKED_MOVEMENT_TAG } from "../skills";
import { createModalChoiceInteraction } from "../toolInteraction";
import {
  setDraftActorTags,
  setDraftApplied,
  setDraftBlocked,
  setDraftToolInventory,
} from "../rules/actionDraft";
import {
  consumeActiveTool,
  requireChoiceSelection
} from "../rules/actionResolution";
import type { ToolModule } from "./types";
import {
  appendDraftSoundEvent,
  adjustMovementTools,
  clearMovementTools,
  createPlayerAnchor,
  createToolPreview,
  createToolUnavailableResult,
  createUsedSummary,
  getTotalMovementPoints,
  isChargedToolAvailable
} from "./helpers";

export const BALANCE_TOOL_DEFINITION: ToolContentDefinition = {
  label: "制衡",
  description: "压缩本回合移动，或把本回合移动转存到下回合，二选一。",
  disabledHint: "需要保留一个有剩余点数的移动时才能使用。",
  source: "turn",
  interaction: createModalChoiceInteraction(),
  isAvailable: (context) => {
    const chargeAvailability = isChargedToolAvailable(context);

    if (!chargeAvailability.usable) {
      return chargeAvailability;
    }

    return getTotalMovementPoints(context.tools) < 1
      ? createToolUnavailableResult("没有可储存的移动点数")
      : chargeAvailability;
  },
  choices: [
    {
      id: "trim_and_bank",
      label: "本回合 -1",
      description: "本回合移动点数 -1，下回合额外获得 1 点移动。"
    },
    {
      id: "store_all",
      label: "转存本回合",
      description: "本回合失去全部移动，下回合额外获得本回合的移动。"
    }
  ],
  defaultCharges: 1,
  defaultParams: {},
  getTextDescription: () => ({
    title: "制衡",
    description: "压缩本回合移动，或把本回合移动转存到下回合，二选一。",
    details: [
      " ",
    ]
  }),
  color: "#8c6bda",
  rollable: false,
  debugGrantable: true,
  endsTurnOnUse: false
};

function resolveBalanceTool(
  draft: Parameters<ToolModule["execute"]>[0],
  context: Parameters<ToolModule["execute"]>[1]
): void {
  const choiceId = requireChoiceSelection(context);
  const totalMovePoints = getTotalMovementPoints(context.tools);

  if (!choiceId) {
    setDraftBlocked(draft, "Balance needs a choice", {
      preview: createToolPreview(context, { valid: false }),
    });
    return;
  }

  if (!BALANCE_TOOL_DEFINITION.choices?.some((choice) => choice.id === choiceId)) {
    setDraftBlocked(draft, "Unknown balance choice", {
      preview: createToolPreview(context, { valid: false }),
    });
    return;
  }

  if (totalMovePoints < 1) {
    setDraftBlocked(draft, "No move points available", {
      preview: createToolPreview(context, { valid: false }),
    });
    return;
  }

  let nextTools = consumeActiveTool(context);
  const currentPendingBonus = getPlayerTagNumber(context.actor.tags, FARTHER_BANKED_MOVEMENT_TAG);
  const nextBankedMovement =
    choiceId === "trim_and_bank" ? currentPendingBonus + 1 : currentPendingBonus + totalMovePoints;

  nextTools = choiceId === "trim_and_bank" ? adjustMovementTools(nextTools, -1) : clearMovementTools(nextTools);

  appendDraftSoundEvent(draft, "tool_buff", "balance:activate", {
    anchor: createPlayerAnchor(context.actor.id)
  });
  setDraftActorTags(
    draft,
    setPlayerTagValue(context.actor.tags, FARTHER_BANKED_MOVEMENT_TAG, nextBankedMovement)
  );
  setDraftToolInventory(draft, nextTools);
  setDraftApplied(draft, createUsedSummary(BALANCE_TOOL_DEFINITION.label), {
    path: [],
    preview: createToolPreview(context, { valid: true })
  });
}

export const BALANCE_TOOL_MODULE: ToolModule<"balance"> = {
  id: "balance",
  definition: BALANCE_TOOL_DEFINITION,
  execute: resolveBalanceTool
};
