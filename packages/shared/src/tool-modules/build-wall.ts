import type { ToolContentDefinition } from "../content/schema";
import { getTile } from "../board";
import { createDragTileInteraction } from "../toolInteraction";
import { createTileMutation } from "../rules/spatial";
import type { ActionResolution } from "../types";
import {
  buildAppliedResolution,
  buildBlockedResolution,
  consumeActiveTool,
  requireTileSelection
} from "../rules/actionResolution";
import { collectAdjacentSelectionTiles } from "../rules/previewDescriptor";
import type { ToolModule } from "./types";
import { createToolPreview, createUsedSummary, getToolParamValue } from "./helpers";

export const BUILD_WALL_TOOL_DEFINITION: ToolContentDefinition = {
  label: "砌墙",
  description: "在周围八格中选择一个空地，生成一面指定耐久的土墙。",
  disabledHint: "这个位置不能砌墙。",
  source: "turn",
  interaction: createDragTileInteraction(),
  conditions: [],
  defaultCharges: 1,
  defaultParams: {
    wallDurability: 2
  },
  color: "#be7d4d",
  rollable: true,
  debugGrantable: true,
  endsTurnOnUse: false
};

function resolveBuildWallTool(context: Parameters<ToolModule["execute"]>[0]): ActionResolution {
  const targetPosition = requireTileSelection(context);
  const wallDurability = getToolParamValue(context.activeTool, "wallDurability", 2);
  const selectionTiles = collectAdjacentSelectionTiles(context.board, context.actor.position);

  if (!targetPosition) {
    return buildBlockedResolution({
      actor: context.actor,
      nextToolDieSeed: context.toolDieSeed,
      preview: createToolPreview(context, {
        selectionTiles,
        valid: false
      }),
      reason: "Build Wall needs a target tile",
      tools: context.tools
    });
  }

  const deltaX = Math.abs(targetPosition.x - context.actor.position.x);
  const deltaY = Math.abs(targetPosition.y - context.actor.position.y);

  if ((deltaX === 0 && deltaY === 0) || deltaX > 1 || deltaY > 1) {
    return buildBlockedResolution({
      actor: context.actor,
      nextToolDieSeed: context.toolDieSeed,
      preview: createToolPreview(context, {
        // effectTiles: [targetPosition],
        selectionTiles,
        valid: false
      }),
      reason: "Build Wall must target one of the surrounding tiles",
      tools: context.tools
    });
  }

  const tile = getTile(context.board, targetPosition);

  if (!tile || tile.type !== "floor") {
    return buildBlockedResolution({
      actor: context.actor,
      nextToolDieSeed: context.toolDieSeed,
      preview: createToolPreview(context, {
        // effectTiles: [targetPosition],
        selectionTiles,
        valid: false
      }),
      reason: "Build Wall needs an empty floor tile",
      tools: context.tools
    });
  }

  return buildAppliedResolution({
    actor: context.actor,
    nextToolDieSeed: context.toolDieSeed,
    path: [],
    preview: createToolPreview(context, {
      effectTiles: [targetPosition],
      selectionTiles,
      valid: true
    }),
    summary: createUsedSummary(BUILD_WALL_TOOL_DEFINITION.label),
    tileMutations: [createTileMutation(targetPosition, "earthWall", wallDurability)],
    tools: consumeActiveTool(context)
  });
}

export const BUILD_WALL_TOOL_MODULE: ToolModule<"buildWall"> = {
  id: "buildWall",
  definition: BUILD_WALL_TOOL_DEFINITION,
  dieFace: {
    params: {
      wallDurability: 2
    }
  },
  execute: resolveBuildWallTool
};
