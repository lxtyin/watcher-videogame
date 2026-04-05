import type { ToolContentDefinition } from "../content/schema";
import type { ActionResolution } from "../types";
import {
  buildAppliedResolution,
  buildBlockedResolution,
  consumeActiveTool,
  requireDirection
} from "../rules/actionResolution";
import { createResolvedPlayerMovement } from "../rules/displacement";
import { resolveLeapDisplacement } from "../rules/movementSystem";
import type { ToolModule } from "./types";
import {
  buildMovementSystemContext,
  createActorMotionPresentation,
  createToolMovementDescriptor,
  createUsedSummary,
  getToolParamValue,
  toMovementSubject
} from "./helpers";

export const JUMP_TOOL_DEFINITION: ToolContentDefinition = {
  actorMovement: {
    type: "leap",
    disposition: "active"
  },
  label: "飞跃",
  description: "朝一个方向飞跃，可以越过中间阻挡，但落点不能是墙。",
  disabledHint: "当前还不能使用这个飞跃工具。",
  source: "turn",
  targetMode: "direction",
  conditions: [],
  defaultCharges: 1,
  defaultParams: {
    jumpDistance: 2
  },
  color: "#85c772",
  rollable: true,
  debugGrantable: true,
  endsTurnOnUse: false
};

function resolveJumpTool(context: Parameters<ToolModule["execute"]>[0]): ActionResolution {
  const direction = requireDirection(context);
  const jumpDistance = getToolParamValue(context.activeTool, "jumpDistance", 2);
  const movement = createToolMovementDescriptor(context, JUMP_TOOL_DEFINITION, "leap");
  const resolution = direction
    ? resolveLeapDisplacement(buildMovementSystemContext(context), {
        direction,
        maxDistance: jumpDistance,
        movement,
        player: toMovementSubject(context.actor),
        toolDieSeed: context.toolDieSeed,
        tools: consumeActiveTool(context)
      })
    : null;

  if (!direction || !resolution) {
    return buildBlockedResolution(context.actor, context.tools, "Jump needs a direction", context.toolDieSeed);
  }

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
    createUsedSummary(JUMP_TOOL_DEFINITION.label),
    resolution.nextToolDieSeed,
    resolution.path,
    resolution.tileMutations,
    [],
    resolution.triggeredTerrainEffects,
    resolution.path,
    createActorMotionPresentation(context, "actor-jump", resolution.path, "arc"),
    resolution.summonMutations,
    resolution.triggeredSummonEffects,
    false,
    createResolvedPlayerMovement(context.actor.id, context.actor.position, resolution.path, movement)
  );
}

export const JUMP_TOOL_MODULE: ToolModule<"jump"> = {
  id: "jump",
  definition: JUMP_TOOL_DEFINITION,
  dieFace: {
    params: {
      jumpDistance: 2
    }
  },
  execute: resolveJumpTool
};
