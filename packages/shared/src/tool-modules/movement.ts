import type { ToolContentDefinition } from "../content/schema";
import { createDragDirectionInteraction } from "../toolInteraction";
import type { ActionResolution } from "../types";
import {
  buildAppliedResolution,
  buildBlockedResolution,
  consumeActiveTool,
  requireDirection
} from "../rules/actionResolution";
import { createResolvedPlayerMovement } from "../rules/displacement";
import { resolveLeapDisplacement, resolveLinearDisplacement } from "../rules/movementSystem";
import { collectDirectionSelectionTiles, createPreviewDescriptor } from "../rules/previewDescriptor";
import type { ToolModule } from "./types";
import {
  buildMovementSystemContext,
  createActorMotionPresentation,
  createToolMovementDescriptor,
  createToolPreview,
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
  description: "沿选择方向前进，消耗本工具的移动点数。",
  disabledHint: "没有可用的移动点数时不能使用移动。",
  source: "turn",
  interaction: createDragDirectionInteraction(),
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
  // const selectionTiles = collectDirectionSelectionTiles(context.board, context.actor.position);
  
  if (!direction) {
    return buildBlockedResolution({
      actor: context.actor,
      nextToolDieSeed: context.toolDieSeed,
      preview: createToolPreview(context, { valid: false }),
      reason: "Movement needs a direction",
      tools: context.tools
    });
  }

  if (movePoints < 1) {
    return buildBlockedResolution({
      actor: context.actor,
      nextToolDieSeed: context.toolDieSeed,
      preview: createToolPreview(context, { valid: false }),
      reason: "No move points left",
      tools: context.tools
    });
  }

  const resolution = resolveLinearDisplacement(buildMovementSystemContext(context), {
    direction,
    movePoints,
    movement,
    player: toMovementSubject(context.actor),
    toolDieSeed: context.toolDieSeed,
    tools: nextTools
  });

  if (!resolution.path.length) {
    return buildBlockedResolution({
      actor: context.actor,
      nextToolDieSeed: context.toolDieSeed,
      path: resolution.path,
      preview: createToolPreview(context, { valid: false }),
      reason: resolution.stopReason,
      tools: context.tools
    });
  }

  return buildAppliedResolution({
    actor: {
      ...context.actor,
      position: resolution.actor.position,
      tags: resolution.actor.tags,
      turnFlags: resolution.actor.turnFlags
    },
    actorMovement: createResolvedPlayerMovement(
      context.actor.id,
      context.actor.position,
      resolution.path,
      movement
    ),
    nextToolDieSeed: resolution.nextToolDieSeed,
    path: resolution.path,
    presentation: createActorMotionPresentation(
      context,
      "actor-move",
      resolution.path,
      movement.type === "leap" ? "arc" : "ground"
    ),
    preview: createToolPreview(context, {
      actorPath: resolution.path,
      actorTarget: resolution.actor.position,
      effectTiles: resolution.path,
      valid: true
    }),
    summonMutations: resolution.summonMutations,
    summary: createUsedSummary(MOVEMENT_TOOL_DEFINITION.label),
    tileMutations: resolution.tileMutations,
    tools: resolution.tools,
    triggeredSummonEffects: resolution.triggeredSummonEffects,
    triggeredTerrainEffects: resolution.triggeredTerrainEffects
  });
}

export const MOVEMENT_TOOL_MODULE: ToolModule<"movement"> = {
  id: "movement",
  definition: MOVEMENT_TOOL_DEFINITION,
  execute: resolveMovementTool
};
