import type { ToolContentDefinition } from "../content/schema";
import { getPlayerTagNumber, setPlayerTagValue } from "../playerTags";
import { FARTHER_BANKED_MOVEMENT_TAG } from "../skills";
import {
  setDraftActorTags,
  setDraftApplied,
  setDraftBlocked,
  setDraftToolInventory
} from "../rules/actionDraft";
import { consumeActiveTool, requireChoiceSelection } from "../rules/actionResolution";
import { createModalChoiceInteraction } from "../toolInteraction";
import type { ToolChoiceDefinition } from "../types";
import type { ToolModule } from "./types";
import {
  adjustMovementTools,
  appendDraftSoundEvent,
  createPlayerAnchor,
  createToolPreview,
  createToolUnavailableResult,
  createUsedSummary,
  getToolParamValue,
  getTotalMovementPoints,
  isChargedToolAvailable
} from "./helpers";

function hasUsableMovementTool(
  tools: readonly { params: Record<string, number | undefined>; toolId: string }[]
): boolean {
  return tools.some((tool) => tool.toolId === "movement" && getToolParamValue(tool, "movePoints") > 0);
}

function getBalanceBankLimit(totalMovePoints: number): number {
  return Math.floor(totalMovePoints / 2);
}

function buildBalanceChoiceId(movePoints: number): string {
  return `bank:${movePoints}`;
}

function parseBalanceChoiceId(choiceId: string): number | null {
  const match = /^bank:(\d+)$/.exec(choiceId);

  if (!match) {
    return null;
  }

  const parsed = Number(match[1]);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function createBalanceChoiceDefinition(movePoints: number): ToolChoiceDefinition {
  const iconId = movePoints <= 6 ? `point:${movePoints}` : null;

  return {
    id: buildBalanceChoiceId(movePoints),
    label: `扣除 ${movePoints} 点`,
    description: `本回合减少 ${movePoints} 点移动，下回合获得等量【移动】。`,
    ...(iconId ? { iconId } : {})
  };
}

function getBalanceChoices(
  context: Parameters<NonNullable<ToolModule["getChoices"]>>[0]
): readonly ToolChoiceDefinition[] {
  const totalMovePoints = getTotalMovementPoints(context.tools);
  const bankLimit = getBalanceBankLimit(totalMovePoints);

  return Array.from({ length: bankLimit }, (_, index) => createBalanceChoiceDefinition(index + 1));
}

export const FARTHER_BALANCE_TOOL_DEFINITION: ToolContentDefinition = {
  label: "制衡",
  disabledHint: "点数不足",
  source: "character_skill",
  interaction: createModalChoiceInteraction(),
  isAvailable: (context) => {
    const chargeAvailability = isChargedToolAvailable(context);

    if (!chargeAvailability.usable) {
      return chargeAvailability;
    }

    if (!hasUsableMovementTool(context.tools)) {
      return createToolUnavailableResult("需要先持有带有剩余点数的【移动】。");
    }

    return getBalanceBankLimit(getTotalMovementPoints(context.tools)) < 1
      ? createToolUnavailableResult("至少要有 2 点移动点数才能制衡。")
      : chargeAvailability;
  },
  defaultCharges: 1,
  defaultParams: {},
  getTextDescription: () => ({
    title: "制衡",
    description: "持有【移动】时才能使用。扣除不超过一半的移动点数，下回合获得等量【移动】。",
    details: ["转移点数"]
  }),
  color: "#8c6bda",
  rollable: false,
  debugGrantable: true,
  endsTurnOnUse: false
};

function resolveFartherBalanceTool(
  draft: Parameters<ToolModule["execute"]>[0],
  context: Parameters<ToolModule["execute"]>[1]
): void {
  const choiceId = requireChoiceSelection(context);
  const totalMovePoints = getTotalMovementPoints(context.tools);
  const bankLimit = getBalanceBankLimit(totalMovePoints);

  if (!choiceId) {
    setDraftBlocked(draft, "Balance needs a choice", {
      preview: createToolPreview(context, { valid: false })
    });
    return;
  }

  if (!hasUsableMovementTool(context.tools)) {
    setDraftBlocked(draft, "Balance requires movement", {
      preview: createToolPreview(context, { valid: false })
    });
    return;
  }

  const selectedMovePoints = parseBalanceChoiceId(choiceId);

  if (!selectedMovePoints || selectedMovePoints > bankLimit) {
    setDraftBlocked(draft, "Unknown balance choice", {
      preview: createToolPreview(context, { valid: false })
    });
    return;
  }

  const currentPendingBonus = getPlayerTagNumber(context.actor.tags, FARTHER_BANKED_MOVEMENT_TAG);
  const nextBankedMovement = currentPendingBonus + selectedMovePoints;
  const nextTools = adjustMovementTools(consumeActiveTool(context), -selectedMovePoints);

  appendDraftSoundEvent(draft, "tool_buff", "farther-balance:activate", {
    anchor: createPlayerAnchor(context.actor.id)
  });
  setDraftActorTags(
    draft,
    setPlayerTagValue(context.actor.tags, FARTHER_BANKED_MOVEMENT_TAG, nextBankedMovement)
  );
  setDraftToolInventory(draft, nextTools);
  setDraftApplied(draft, createUsedSummary(FARTHER_BALANCE_TOOL_DEFINITION.label), {
    path: [],
    preview: createToolPreview(context, { valid: true })
  });
}

export const FARTHER_BALANCE_TOOL_MODULE: ToolModule<"fartherBalance"> = {
  id: "fartherBalance",
  definition: FARTHER_BALANCE_TOOL_DEFINITION,
  getChoices: getBalanceChoices,
  execute: resolveFartherBalanceTool
};
