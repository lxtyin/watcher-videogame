import type { ToolContentDefinition } from "../content/schema";
import type { ActionResolution } from "../types";
import {
  buildAppliedResolution,
  buildBlockedResolution,
  consumeActiveTool
} from "../rules/actionResolution";
import { createResolvedPlayerMovement } from "../rules/displacement";
import { resolveLeapDisplacement, resolveLinearDisplacement } from "../rules/movementSystem";
import { normalizeAxisTarget } from "../rules/spatial";
import type { ToolModule } from "./types";
import {
  buildMovementSystemContext,
  createActorMotionPresentation,
  createToolMovementDescriptor,
  createUsedSummary,
  getToolParamValue,
  toMovementSubject
} from "./helpers";

export const BRAKE_TOOL_DEFINITION: ToolContentDefinition = {
  actorMovement: {
    type: "translate",
    disposition: "active"
  },
  label: "制动",
  description: "沿一个轴向移动至多指定格数，并停在实际可达的目标格。",
  disabledHint: "这个制动工具已经没有可用距离了。",
  source: "turn",
  targetMode: "tile",
  tileTargeting: "axis_line",
  conditions: [],
  defaultCharges: 1,
  defaultParams: {
    brakeRange: 3
  },
  buttonValue: {
    paramId: "brakeRange",
    unit: "tile"
  },
  color: "#53a6b9",
  rollable: false,
  debugGrantable: true,
  endsTurnOnUse: false
};

function resolveBrakeTool(context: Parameters<ToolModule["execute"]>[0]): ActionResolution {
  const maxRange = getToolParamValue(context.activeTool, "brakeRange", 3);
  const axisTarget = normalizeAxisTarget(context.actor.position, context.targetPosition);
  const movement = createToolMovementDescriptor(context, BRAKE_TOOL_DEFINITION, "translate");
  const nextTools = consumeActiveTool(context);

  if (!axisTarget) {
    return buildBlockedResolution(context.actor, context.tools, "Brake needs a target tile", context.toolDieSeed);
  }

  if (maxRange < 1) {
    return buildBlockedResolution(context.actor, context.tools, "No brake range left", context.toolDieSeed);
  }

  const requestedDistance = Math.min(maxRange, axisTarget.distance);
  const resolution =
    movement.type === "leap"
      ? resolveLeapDisplacement(buildMovementSystemContext(context), {
          direction: axisTarget.direction,
          maxDistance: requestedDistance,
          movement,
          player: toMovementSubject(context.actor),
          toolDieSeed: context.toolDieSeed,
          tools: nextTools
        })
      : resolveLinearDisplacement(buildMovementSystemContext(context), {
          direction: axisTarget.direction,
          maxSteps: requestedDistance,
          movePoints: requestedDistance,
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
      [axisTarget.snappedTarget]
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
    createUsedSummary(BRAKE_TOOL_DEFINITION.label),
    resolution.nextToolDieSeed,
    resolution.path,
    resolution.tileMutations,
    [],
    resolution.triggeredTerrainEffects,
    resolution.path,
    createActorMotionPresentation(
      context,
      "actor-brake",
      resolution.path,
      movement.type === "leap" ? "arc" : "ground"
    ),
    resolution.summonMutations,
    resolution.triggeredSummonEffects,
    false,
    createResolvedPlayerMovement(context.actor.id, context.actor.position, resolution.path, movement)
  );
}

export const BRAKE_TOOL_MODULE: ToolModule<"brake"> = {
  id: "brake",
  definition: BRAKE_TOOL_DEFINITION,
  execute: resolveBrakeTool
};
