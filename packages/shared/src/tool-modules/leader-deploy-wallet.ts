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
import {
  appendDraftSoundEvent,
  createPositionAnchor,
  createToolPreview,
  createUsedSummary,
  getToolParamValue,
  isChargedToolAvailable
} from "./helpers";

export const LEADER_DEPLOY_WALLET_TOOL_DEFINITION: ToolContentDefinition = {
  label: "放置钱包",
  disabledHint: "当前无法在这个位置放置钱包。",
  source: "character_skill",
  interaction: createDragTileInteraction(),
  isAvailable: isChargedToolAvailable,
  defaultCharges: 1,
  phases: ["turn-action", "turn-end"],
  defaultParams: {
    targetRange: 2
  },
  getTextDescription: ({ params }) => ({
    title: "放置钱包",
    description: "放置钱包",
  }),
  color: "#8d7a3d",
  rollable: false,
  debugGrantable: false,
  endsTurnOnUse: false
};

function resolveLeaderDeployWalletTool(
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
  appendDraftSoundEvent(draft, "tool_build", "leader-deploy-wallet:activate", {
    anchor: createPositionAnchor(targetPosition)
  });
  setDraftToolInventory(draft, consumeActiveTool(context));
  setDraftApplied(draft, createUsedSummary(LEADER_DEPLOY_WALLET_TOOL_DEFINITION.label), {
    path: [],
    preview: createToolPreview(context, {
      effectTiles: [targetPosition],
      selectionTiles,
      valid: true
    })
  });
}

export const LEADER_DEPLOY_WALLET_TOOL_MODULE: ToolModule<"leaderDeployWallet"> = {
  id: "leaderDeployWallet",
  definition: LEADER_DEPLOY_WALLET_TOOL_DEFINITION,
  execute: resolveLeaderDeployWalletTool
};
