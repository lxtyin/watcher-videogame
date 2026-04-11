import type { ToolContentDefinition } from "../content/schema";
import { createSummonUpsertMutation, hasSummonAtPosition } from "../summons";
import { createDragTileInteraction } from "../toolInteraction";
import {
  buildSummonInstanceId,
  consumeActiveTool,
  requireTileSelection
} from "../rules/actionResolution";
import {
  appendDraftSummonMutations,
  setDraftApplied,
  setDraftBlocked,
  setDraftToolInventory
} from "../rules/actionDraft";
import { isLandablePosition } from "../rules/spatial";
import { collectAdjacentSelectionTiles } from "../rules/previewDescriptor";
import type { ToolModule } from "./types";
import { createToolPreview, createUsedSummary, getToolParamValue } from "./helpers";

export const DEPLOY_WALLET_TOOL_DEFINITION: ToolContentDefinition = {
  label: "放置钱包",
  description: "在 5x5 范围内选择一个可部署地块放置钱包，并立即结束当前回合。",
  disabledHint: "当前无法在这个位置放置钱包。",
  source: "character_skill",
  interaction: createDragTileInteraction(),
  defaultCharges: 1,
  defaultParams: {
    targetRange: 2
  },
  getTextDescription: ({ params }) => ({
    title: "放置钱包",
    description: "在 5x5 范围内选择一个可部署地块放置钱包，并立即结束当前回合。",
    details: [` `]
  }),
  color: "#8d7a3d",
  rollable: false,
  debugGrantable: false,
  endsTurnOnUse: true
};

function resolveDeployWalletTool(
  draft: Parameters<ToolModule["execute"]>[0],
  context: Parameters<ToolModule["execute"]>[1]
): void {
  const targetPosition = requireTileSelection(context);
  const targetRange = getToolParamValue(context.activeTool, "targetRange", 2);
  const selectionTiles = collectAdjacentSelectionTiles(context.board, context.actor.position, targetRange);

  if (!targetPosition) {
    setDraftBlocked(draft, "Deploy Wallet needs a target tile", {
      preview: createToolPreview(context, {
        selectionTiles,
        valid: false
      })
    });
    return;
  }

  if (
    Math.abs(targetPosition.x - context.actor.position.x) > targetRange ||
    Math.abs(targetPosition.y - context.actor.position.y) > targetRange
  ) {
    setDraftBlocked(draft, "Target tile is outside the deployment range", {
      preview: createToolPreview(context, {
        selectionTiles,
        valid: false
      })
    });
    return;
  }

  if (!isLandablePosition(context.board, targetPosition)) {
    setDraftBlocked(draft, "Deploy Wallet needs a landable tile", {
      preview: createToolPreview(context, {
        effectTiles: [targetPosition],
        selectionTiles,
        valid: false
      })
    });
    return;
  }

  if (hasSummonAtPosition(context.summons, targetPosition)) {
    setDraftBlocked(draft, "Target tile already contains a summon", {
      preview: createToolPreview(context, {
        effectTiles: [targetPosition],
        selectionTiles,
        valid: false
      })
    });
    return;
  }

  appendDraftSummonMutations(draft, [
      createSummonUpsertMutation(
        buildSummonInstanceId(context.activeTool, "wallet"),
        "wallet",
        context.actor.id,
        targetPosition
      )
    ]);
  setDraftToolInventory(draft, consumeActiveTool(context));
  setDraftApplied(draft, createUsedSummary(DEPLOY_WALLET_TOOL_DEFINITION.label), {
    endsTurn: true,
    path: [],
    preview: createToolPreview(context, {
      effectTiles: [targetPosition],
      selectionTiles,
      valid: true
    })
  });
}

export const DEPLOY_WALLET_TOOL_MODULE: ToolModule<"deployWallet"> = {
  id: "deployWallet",
  definition: DEPLOY_WALLET_TOOL_DEFINITION,
  execute: resolveDeployWalletTool
};
