import type { ToolContentDefinition } from "../content/schema";
import type { ActionResolution } from "../types";
import {
  buildAppliedResolution,
  buildBlockedResolution,
  consumeActiveTool,
  requireDirection
} from "../rules/actionResolution";
import { createResolvedPlayerMovement } from "../rules/displacement";
import { resolveLeapDisplacement, resolveLinearDisplacement } from "../rules/movementSystem";
import type { ToolModule } from "./types";
import {
  buildMovementSystemContext,
  createActorMotionPresentation,
  createToolMovementDescriptor,
  createUsedSummary,
  getToolParamValue,
  toMovementSubject
} from "./helpers";

export const MOVEMENT_TOOL_DEFINITION: ToolContentDefinition = {
  actorMovement: {
    type: "translate",
    disposition: "active"
  },
  label: "移动",
  description: "朝一个方向移动，最多消耗该工具携带的点数。",
  disabledHint: "这个移动工具已经没有可用点数了。",
  source: "turn",
  targetMode: "direction",
  conditions: [],
  defaultCharges: 1,
  defaultParams: {
    movePoints: 4
  },
  buttonValue: {
    paramId: "movePoints",
    unit: "point"
  },
  color: "#6abf69",
  rollable: false,
  debugGrantable: true,
  endsTurnOnUse: false
};

function resolveMovementTool(context: Parameters<ToolModule["execute"]>[0]): ActionResolution {
  const direction = requireDirection(context);
  const movePoints = getToolParamValue(context.activeTool, "movePoints", 4);
  const movement = createToolMovementDescriptor(context, MOVEMENT_TOOL_DEFINITION, "translate");
  const nextTools = consumeActiveTool(context);

  if (!direction) {
    return buildBlockedResolution(context.actor, context.tools, "Movement needs a direction", context.toolDieSeed);
  }

  if (movePoints < 1) {
    return buildBlockedResolution(context.actor, context.tools, "No move points left", context.toolDieSeed);
  }

  const resolution =
    movement.type === "leap"
      ? resolveLeapDisplacement(buildMovementSystemContext(context), {
          direction,
          maxDistance: movePoints,
          movement,
          player: toMovementSubject(context.actor),
          toolDieSeed: context.toolDieSeed,
          tools: nextTools
        })
      : resolveLinearDisplacement(buildMovementSystemContext(context), {
          direction,
          movePoints,
          movement,
          player: toMovementSubject(context.actor),
          toolDieSeed: context.toolDieSeed,
          tools: nextTools
        });

  if (!resolution.path.length) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      resolution.stopReason,
      context.toolDieSeed,
      resolution.path,
      [],
      resolution.path
    );
  }

  return buildAppliedResolution(
    {
      ...context.actor,
      position: resolution.actor.position,
      tags: resolution.actor.tags,
      turnFlags: resolution.actor.turnFlags
    },
    resolution.tools,
    createUsedSummary(MOVEMENT_TOOL_DEFINITION.label),
    resolution.nextToolDieSeed,
    resolution.path,
    resolution.tileMutations,
    [],
    resolution.triggeredTerrainEffects,
    resolution.path,
    createActorMotionPresentation(
      context,
      "actor-move",
      resolution.path,
      movement.type === "leap" ? "arc" : "ground"
    ),
    resolution.summonMutations,
    resolution.triggeredSummonEffects,
    false,
    createResolvedPlayerMovement(context.actor.id, context.actor.position, resolution.path, movement)
  );
}

export const MOVEMENT_TOOL_MODULE: ToolModule<"movement"> = {
  id: "movement",
  definition: MOVEMENT_TOOL_DEFINITION,
  execute: resolveMovementTool
};
