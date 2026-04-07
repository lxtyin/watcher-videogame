import type { ToolContentDefinition } from "../content/schema";
import { createSummonUpsertMutation, hasSummonAtPosition } from "../summons";
import { createDragTileInteraction } from "../toolInteraction";
import {
  buildSummonInstanceId,
  buildAppliedResolution,
  buildBlockedResolution,
  consumeActiveTool,
  requireTileSelection
} from "../rules/actionResolution";
import { isLandablePosition } from "../rules/spatial";
import type { ActionResolution } from "../types";
import { collectAdjacentSelectionTiles } from "../rules/previewDescriptor";
import type { ToolModule } from "./types";
import { createToolPreview, createUsedSummary, getToolParamValue } from "./helpers";

export const DEPLOY_WALLET_TOOL_DEFINITION: ToolContentDefinition = {
  label: "放置钱包",
  description: "在 5x5 范围内选择一个可部署地块放置钱包，并立即结束当前回合。",
  disabledHint: "当前无法在这个位置放置钱包。",
  source: "character_skill",
  interaction: createDragTileInteraction(),
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
  const targetPosition = requireTileSelection(context);
  const targetRange = getToolParamValue(context.activeTool, "targetRange", 2);
  const selectionTiles = collectAdjacentSelectionTiles(context.board, context.actor.position, targetRange);

  if (!targetPosition) {
    return buildBlockedResolution({
      actor: context.actor,
      nextToolDieSeed: context.toolDieSeed,
      preview: createToolPreview(context, {
        selectionTiles,
        valid: false
      }),
      reason: "Deploy Wallet needs a target tile",
      tools: context.tools
    });
  }

  if (
    Math.abs(targetPosition.x - context.actor.position.x) > targetRange ||
    Math.abs(targetPosition.y - context.actor.position.y) > targetRange
  ) {
    return buildBlockedResolution({
      actor: context.actor,
      nextToolDieSeed: context.toolDieSeed,
      preview: createToolPreview(context, {
        // effectTiles: [targetPosition],
        selectionTiles,
        valid: false
      }),
      reason: "Target tile is outside the deployment range",
      tools: context.tools
    });
  }

  if (!isLandablePosition(context.board, targetPosition)) {
    return buildBlockedResolution({
      actor: context.actor,
      nextToolDieSeed: context.toolDieSeed,
      preview: createToolPreview(context, {
        effectTiles: [targetPosition],
        selectionTiles,
        valid: false
      }),
      reason: "Deploy Wallet needs a landable tile",
      tools: context.tools
    });
  }

  if (hasSummonAtPosition(context.summons, targetPosition)) {
    return buildBlockedResolution({
      actor: context.actor,
      nextToolDieSeed: context.toolDieSeed,
      preview: createToolPreview(context, {
        effectTiles: [targetPosition],
        selectionTiles,
        valid: false
      }),
      reason: "Target tile already contains a summon",
      tools: context.tools
    });
  }

  return buildAppliedResolution({
    actor: context.actor,
    endsTurn: true,
    nextToolDieSeed: context.toolDieSeed,
    path: [],
    preview: createToolPreview(context, {
      effectTiles: [targetPosition],
      selectionTiles,
      valid: true
    }),
    summary: createUsedSummary(DEPLOY_WALLET_TOOL_DEFINITION.label),
    summonMutations: [
      createSummonUpsertMutation(
        buildSummonInstanceId(context.activeTool, "wallet"),
        "wallet",
        context.actor.id,
        targetPosition
      )
    ],
    tools: consumeActiveTool(context)
  });
}

export const DEPLOY_WALLET_TOOL_MODULE: ToolModule<"deployWallet"> = {
  id: "deployWallet",
  definition: DEPLOY_WALLET_TOOL_DEFINITION,
  execute: resolveDeployWalletTool
};
