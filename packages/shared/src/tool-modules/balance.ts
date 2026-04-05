import type { ToolContentDefinition } from "../content/schema";
import { getPlayerTagNumber, setPlayerTagValue } from "../playerTags";
import { FARTHER_BANKED_MOVEMENT_TAG } from "../skills";
import type { ActionResolution } from "../types";
import { buildAppliedResolution, buildBlockedResolution, consumeActiveTool } from "../rules/actionResolution";
import type { ToolModule } from "./types";
import { adjustMovementTools, clearMovementTools, createUsedSummary, getTotalMovementPoints } from "./helpers";

export const BALANCE_TOOL_DEFINITION: ToolContentDefinition = {
  label: "制衡",
  description: "压缩本回合移动，或把本回合移动转存到下回合之间二选一。",
  disabledHint: "需要保留一个有剩余点数的移动时才能使用。",
  source: "turn",
  targetMode: "choice",
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
  conditions: [{ kind: "tool_present", toolId: "movement" }],
  defaultCharges: 1,
  defaultParams: {},
  color: "#8c6bda",
  rollable: false,
  debugGrantable: true,
  endsTurnOnUse: false
};

function resolveBalanceTool(context: Parameters<ToolModule["execute"]>[0]): ActionResolution {
  const choiceId = context.choiceId;
  const totalMovePoints = getTotalMovementPoints(context.tools);

  if (!choiceId) {
    return buildBlockedResolution(context.actor, context.tools, "Balance needs a choice", context.toolDieSeed);
  }

  if (!BALANCE_TOOL_DEFINITION.choices?.some((choice) => choice.id === choiceId)) {
    return buildBlockedResolution(context.actor, context.tools, "Unknown balance choice", context.toolDieSeed);
  }

  if (totalMovePoints < 1) {
    return buildBlockedResolution(context.actor, context.tools, "No move points available", context.toolDieSeed);
  }

  let nextTools = consumeActiveTool(context);
  const currentPendingBonus = getPlayerTagNumber(context.actor.tags, FARTHER_BANKED_MOVEMENT_TAG);
  const nextBankedMovement =
    choiceId === "trim_and_bank" ? currentPendingBonus + 1 : currentPendingBonus + totalMovePoints;

  nextTools = choiceId === "trim_and_bank" ? adjustMovementTools(nextTools, -1) : clearMovementTools(nextTools);

  return buildAppliedResolution(
    {
      ...context.actor,
      tags: setPlayerTagValue(context.actor.tags, FARTHER_BANKED_MOVEMENT_TAG, nextBankedMovement)
    },
    nextTools,
    createUsedSummary(BALANCE_TOOL_DEFINITION.label),
    context.toolDieSeed,
    []
  );
}

export const BALANCE_TOOL_MODULE: ToolModule<"balance"> = {
  id: "balance",
  definition: BALANCE_TOOL_DEFINITION,
  execute: resolveBalanceTool
};
