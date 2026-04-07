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
import { resolveLeapDisplacement } from "../rules/movementSystem";
import { offsetPresentationEvents } from "../rules/actionPresentation";
import { collectDirectionSelectionTiles } from "../rules/previewDescriptor";
import type { ToolModule } from "./types";
import {
  appendToolPresentationEvents,
  buildMovementSystemContext,
  createActorMotionPresentation,
  createToolMovementDescriptor,
  createToolPreview,
  createUsedSummary,
  getToolParamValue,
  toMovementSubject
} from "./helpers";

export const JUMP_TOOL_DEFINITION: ToolContentDefinition = {
  actorMovement: {
    type: "leap",
    disposition: "active"
  },
  label: "跳跃",
  description: "沿选择方向飞跃固定距离，忽略途中停留。",
  disabledHint: "当前不能使用跳跃。",
  source: "turn",
  interaction: createDragDirectionInteraction(),
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
  // const selectionTiles = collectDirectionSelectionTiles(context.board, context.actor.position);
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
    return buildBlockedResolution({
      actor: context.actor,
      nextToolDieSeed: context.toolDieSeed,
      preview: createToolPreview(context, { valid: false }),
      reason: "Jump needs a direction",
      tools: context.tools
    });
  }

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

  const actorPresentation = createActorMotionPresentation(context, "actor-jump", resolution.path, "arc");

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
    affectedPlayers: resolution.affectedPlayers,
    nextToolDieSeed: resolution.nextToolDieSeed,
    path: resolution.path,
    presentation: appendToolPresentationEvents(
      context,
      actorPresentation,
      offsetPresentationEvents(resolution.presentationEvents, actorPresentation?.durationMs ?? 0)
    ),
    preview: createToolPreview(context, {
      // actorPath: resolution.path,
      actorTarget: resolution.actor.position,
      affectedPlayers: resolution.affectedPlayers,
      // effectTiles: resolution.path,
      // selectionTiles,
      valid: true
    }),
    summonMutations: resolution.summonMutations,
    summary: createUsedSummary(JUMP_TOOL_DEFINITION.label),
    tileMutations: resolution.tileMutations,
    tools: resolution.tools,
    triggeredSummonEffects: resolution.triggeredSummonEffects,
    triggeredTerrainEffects: resolution.triggeredTerrainEffects
  });
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
