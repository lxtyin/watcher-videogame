import type { ToolContentDefinition } from "../content/schema";
import { createDragAxisTileInteraction } from "../toolInteraction";
import type { ActionResolution } from "../types";
import {
  buildAppliedResolution,
  buildBlockedResolution,
  consumeActiveTool,
  requireTileSelection
} from "../rules/actionResolution";
import { createResolvedPlayerMovement } from "../rules/displacement";
import { resolveLeapDisplacement, resolveLinearDisplacement } from "../rules/movementSystem";
import { collectAxisSelectionTiles } from "../rules/previewDescriptor";
import { normalizeAxisTarget } from "../rules/spatial";
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

export const BRAKE_TOOL_DEFINITION: ToolContentDefinition = {
  actorMovement: {
    type: "translate",
    disposition: "active"
  },
  label: "制动",
  description: "先选方向，再在该方向上指定一格，立即沿该轴线移动过去。",
  disabledHint: "当前不能使用制动。",
  source: "turn",
  interaction: createDragAxisTileInteraction(),
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
  const targetPosition = requireTileSelection(context);
  const axisTarget = normalizeAxisTarget(context.actor.position, targetPosition ?? undefined);
  const movement = createToolMovementDescriptor(context, BRAKE_TOOL_DEFINITION, "translate");
  const nextTools = consumeActiveTool(context);
  // const selectionTiles = collectAxisSelectionTiles(context.board, context.actor.position);

  if (!axisTarget) {
    return buildBlockedResolution({
      actor: context.actor,
      nextToolDieSeed: context.toolDieSeed,
      preview: createToolPreview(context, {
        // selectionTiles,
        valid: false
      }),
      reason: "Brake needs a target tile",
      tools: context.tools
    });
  }

  if (maxRange < 1) {
    return buildBlockedResolution({
      actor: context.actor,
      nextToolDieSeed: context.toolDieSeed,
      preview: createToolPreview(context, {
        valid: false
      }),
      reason: "No brake range left",
      tools: context.tools
    });
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
    return buildBlockedResolution({
      actor: context.actor,
      nextToolDieSeed: context.toolDieSeed,
      path: resolution.path,
      preview: createToolPreview(context, {
        actorPath: resolution.path,
        effectTiles: resolution.path,
        // selectionTiles,
        valid: false
      }),
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
      "actor-brake",
      resolution.path,
      movement.type === "leap" ? "arc" : "ground"
    ),
    preview: createToolPreview(context, {
      actorPath: resolution.path,
      actorTarget: resolution.actor.position,
      effectTiles: resolution.path,
      // selectionTiles,
      valid: true
    }),
    summonMutations: resolution.summonMutations,
    summary: createUsedSummary(BRAKE_TOOL_DEFINITION.label),
    tileMutations: resolution.tileMutations,
    tools: resolution.tools,
    triggeredSummonEffects: resolution.triggeredSummonEffects,
    triggeredTerrainEffects: resolution.triggeredTerrainEffects
  });
}

export const BRAKE_TOOL_MODULE: ToolModule<"brake"> = {
  id: "brake",
  definition: BRAKE_TOOL_DEFINITION,
  execute: resolveBrakeTool
};
