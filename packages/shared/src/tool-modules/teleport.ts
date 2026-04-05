import type { ToolContentDefinition } from "../content/schema";
import type { ActionResolution } from "../types";
import { buildAppliedResolution, buildBlockedResolution, consumeActiveTool } from "../rules/actionResolution";
import { createResolvedPlayerMovement } from "../rules/displacement";
import { resolveTeleportDisplacement } from "../rules/movementSystem";
import type { ToolModule } from "./types";
import {
  buildMovementSystemContext,
  createToolMovementDescriptor,
  createUsedSummary,
  toMovementSubject
} from "./helpers";

export const TELEPORT_TOOL_DEFINITION: ToolContentDefinition = {
  actorMovement: {
    type: "teleport",
    disposition: "active"
  },
  label: "瞬移",
  description: "选择全场任意一个可落脚地块，直接瞬移到目标位置。",
  disabledHint: "当前还不能瞬移到这个位置。",
  source: "turn",
  targetMode: "tile",
  tileTargeting: "board_any",
  conditions: [],
  defaultCharges: 1,
  defaultParams: {},
  color: "#7b8bff",
  rollable: false,
  debugGrantable: true,
  endsTurnOnUse: false
};

function resolveTeleportTool(context: Parameters<ToolModule["execute"]>[0]): ActionResolution {
  const targetPosition = context.targetPosition;
  const movement = createToolMovementDescriptor(context, TELEPORT_TOOL_DEFINITION, "teleport");

  if (!targetPosition) {
    return buildBlockedResolution(context.actor, context.tools, "Teleport needs a target tile", context.toolDieSeed);
  }

  const resolution = resolveTeleportDisplacement(buildMovementSystemContext(context), {
    movement,
    player: toMovementSubject(context.actor),
    targetPosition,
    toolDieSeed: context.toolDieSeed,
    tools: consumeActiveTool(context)
  });

  if (!resolution.path.length) {
    return buildBlockedResolution(context.actor, context.tools, resolution.stopReason, context.toolDieSeed, [], [], [targetPosition]);
  }

  return buildAppliedResolution(
    {
      ...context.actor,
      position: resolution.actor.position,
      tags: resolution.actor.tags,
      turnFlags: resolution.actor.turnFlags
    },
    resolution.tools,
    createUsedSummary(TELEPORT_TOOL_DEFINITION.label),
    resolution.nextToolDieSeed,
    resolution.path,
    resolution.tileMutations,
    [],
    resolution.triggeredTerrainEffects,
    [targetPosition],
    null,
    resolution.summonMutations,
    resolution.triggeredSummonEffects,
    false,
    createResolvedPlayerMovement(context.actor.id, context.actor.position, resolution.path, movement)
  );
}

export const TELEPORT_TOOL_MODULE: ToolModule<"teleport"> = {
  id: "teleport",
  definition: TELEPORT_TOOL_DEFINITION,
  execute: resolveTeleportTool
};
