import type { ToolContentDefinition } from "../content/schema";
import { getTile } from "../board";
import { createTileMutation } from "../rules/spatial";
import type { ActionResolution } from "../types";
import { buildAppliedResolution, buildBlockedResolution, consumeActiveTool } from "../rules/actionResolution";
import type { ToolModule } from "./types";
import { createUsedSummary, getToolParamValue } from "./helpers";

export const BUILD_WALL_TOOL_DEFINITION: ToolContentDefinition = {
  label: "砌墙",
  description: "在周围八格中选择一个空地，生成一面指定耐久的土墙。",
  disabledHint: "这个位置不能砌墙。",
  source: "turn",
  targetMode: "tile",
  tileTargeting: "adjacent_ring",
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
  const targetPosition = context.targetPosition;
  const wallDurability = getToolParamValue(context.activeTool, "wallDurability", 2);

  if (!targetPosition) {
    return buildBlockedResolution(context.actor, context.tools, "Build Wall needs a target tile", context.toolDieSeed);
  }

  const deltaX = Math.abs(targetPosition.x - context.actor.position.x);
  const deltaY = Math.abs(targetPosition.y - context.actor.position.y);

  if ((deltaX === 0 && deltaY === 0) || deltaX > 1 || deltaY > 1) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Build Wall must target one of the surrounding tiles",
      context.toolDieSeed,
      [],
      [],
      [targetPosition]
    );
  }

  const tile = getTile(context.board, targetPosition);

  if (!tile || tile.type !== "floor") {
    return buildBlockedResolution(context.actor, context.tools, "Build Wall needs an empty floor tile", context.toolDieSeed, [], [], [targetPosition]);
  }

  return buildAppliedResolution(
    context.actor,
    consumeActiveTool(context),
    createUsedSummary(BUILD_WALL_TOOL_DEFINITION.label),
    context.toolDieSeed,
    [],
    [createTileMutation(targetPosition, "earthWall", wallDurability)],
    [],
    [],
    [targetPosition]
  );
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
