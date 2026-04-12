import type { ToolContentDefinition } from "../content/schema";
import { getTile } from "../board";
import { createDragTileInteraction } from "../toolInteraction";
import { createTileMutation } from "../rules/spatial";
import { hasSummonAtPosition } from "../summons";
import {
  appendDraftTileMutations,
  setDraftApplied,
  setDraftBlocked,
  setDraftToolInventory,
} from "../rules/actionDraft";
import {
  consumeActiveTool,
  requireTileSelection
} from "../rules/actionResolution";
import { collectAdjacentSelectionTiles } from "../rules/previewDescriptor";
import { findPlayersAtPosition } from "../rules/spatial";
import type { ToolModule } from "./types";
import {
  createToolPreview,
  createUsedSummary,
  getToolParamValue,
  isChargedToolAvailable
} from "./helpers";

export const BUILD_WALL_TOOL_DEFINITION: ToolContentDefinition = {
  label: "砌墙",
  description: "在周围八格中选择一个空地，生成一面指定耐久的土墙。",
  disabledHint: "这个位置不能砌墙。",
  source: "turn",
  interaction: createDragTileInteraction(),
  isAvailable: isChargedToolAvailable,
  defaultCharges: 1,
  defaultParams: {
    wallDurability: 2
  },
  getTextDescription: ({ params }) => ({
    title: "砌墙",
    description: "在周围八格中选择一个空地，生成一面指定耐久的土墙。",
    details: [`耐久 ${params.wallDurability ?? 0}`]
  }),
  color: "#be7d4d",
  rollable: true,
  debugGrantable: true,
  endsTurnOnUse: false
};

function canBuildWallAtPosition(
  context: Parameters<ToolModule["execute"]>[1],
  targetPosition: { x: number; y: number }
): boolean {
  const tile = getTile(context.board, targetPosition);

  if (!tile || tile.type !== "floor") {
    return false;
  }

  if (findPlayersAtPosition(context.players, targetPosition, []).length > 0) {
    return false;
  }

  return !hasSummonAtPosition(context.summons, targetPosition);
}

function resolveBuildWallTool(
  draft: Parameters<ToolModule["execute"]>[0],
  context: Parameters<ToolModule["execute"]>[1]
): void {
  const targetPosition = requireTileSelection(context);
  const wallDurability = getToolParamValue(context.activeTool, "wallDurability", 2);
  const selectionTiles = collectAdjacentSelectionTiles(context.board, context.actor.position).filter((position) =>
    canBuildWallAtPosition(context, position)
  );

  if (!targetPosition) {
    setDraftBlocked(draft, "Build Wall needs a target tile", {
      preview: createToolPreview(context, {
        selectionTiles,
        valid: false
      })
    });
    return;
  }

  const deltaX = Math.abs(targetPosition.x - context.actor.position.x);
  const deltaY = Math.abs(targetPosition.y - context.actor.position.y);

  if ((deltaX === 0 && deltaY === 0) || deltaX > 1 || deltaY > 1) {
    setDraftBlocked(draft, "Build Wall must target one of the surrounding tiles", {
      preview: createToolPreview(context, {
        selectionTiles,
        valid: false
      })
    });
    return;
  }

  if (!canBuildWallAtPosition(context, targetPosition)) {
    setDraftBlocked(draft, "Build Wall needs an empty floor tile", {
      preview: createToolPreview(context, {
        selectionTiles,
        valid: false
      })
    });
    return;
  }

  appendDraftTileMutations(draft, [createTileMutation(targetPosition, "earthWall", wallDurability)]);
  setDraftToolInventory(draft, consumeActiveTool(context));
  setDraftApplied(draft, createUsedSummary(BUILD_WALL_TOOL_DEFINITION.label), {
    path: [],
    preview: createToolPreview(context, {
      effectTiles: [targetPosition],
      selectionTiles,
      valid: true
    })
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
