import type { ToolContentDefinition } from "../content/schema";
import { createSummonUpsertMutation, hasSummonAtPosition } from "../summons";
import { buildSummonInstanceId, buildAppliedResolution, buildBlockedResolution, consumeActiveTool } from "../rules/actionResolution";
import { isLandablePosition } from "../rules/spatial";
import type { ActionResolution } from "../types";
import type { ToolModule } from "./types";
import { createUsedSummary, getToolParamValue } from "./helpers";

export const DEPLOY_WALLET_TOOL_DEFINITION: ToolContentDefinition = {
  label: "放置钱包",
  description: "在 5x5 范围内选择一个可部署地块放置钱包，并立即结束当前回合。",
  disabledHint: "当前无法在这个位置放置钱包。",
  source: "character_skill",
  targetMode: "tile",
  tileTargeting: "board_any",
  conditions: [],
  defaultCharges: 1,
  defaultParams: {
    targetRange: 2
  },
  color: "#8d7a3d",
  rollable: false,
  debugGrantable: false,
  endsTurnOnUse: true
};

function resolveDeployWalletTool(context: Parameters<ToolModule["execute"]>[0]): ActionResolution {
  const targetPosition = context.targetPosition;
  const targetRange = getToolParamValue(context.activeTool, "targetRange", 2);

  if (!targetPosition) {
    return buildBlockedResolution(context.actor, context.tools, "Deploy Wallet needs a target tile", context.toolDieSeed);
  }

  if (
    Math.abs(targetPosition.x - context.actor.position.x) > targetRange ||
    Math.abs(targetPosition.y - context.actor.position.y) > targetRange
  ) {
    return buildBlockedResolution(context.actor, context.tools, "Target tile is outside the deployment range", context.toolDieSeed, [], [], [targetPosition]);
  }

  if (!isLandablePosition(context.board, targetPosition)) {
    return buildBlockedResolution(context.actor, context.tools, "Deploy Wallet needs a landable tile", context.toolDieSeed, [], [], [targetPosition]);
  }

  if (hasSummonAtPosition(context.summons, targetPosition)) {
    return buildBlockedResolution(context.actor, context.tools, "Target tile already contains a summon", context.toolDieSeed, [], [], [targetPosition]);
  }

  return buildAppliedResolution(
    context.actor,
    consumeActiveTool(context),
    createUsedSummary(DEPLOY_WALLET_TOOL_DEFINITION.label),
    context.toolDieSeed,
    [],
    [],
    [],
    [],
    [targetPosition],
    null,
    [
      createSummonUpsertMutation(
        buildSummonInstanceId(context.activeTool, "wallet"),
        "wallet",
        context.actor.id,
        targetPosition
      )
    ],
    [],
    true
  );
}

export const DEPLOY_WALLET_TOOL_MODULE: ToolModule<"deployWallet"> = {
  id: "deployWallet",
  definition: DEPLOY_WALLET_TOOL_DEFINITION,
  execute: resolveDeployWalletTool
};
