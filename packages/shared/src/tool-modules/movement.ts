import type { ToolContentDefinition } from "../content/schema";
import { createDragDirectionInteraction } from "../toolInteraction";
import {
  consumeDraftPresentationFrom,
  markDraftPresentation,
  setDraftActionPresentation,
  setDraftApplied,
  setDraftBlocked,
  setDraftToolInventory
} from "../rules/actionDraft";
import {
  consumeActiveTool,
  requireDirection
} from "../rules/actionResolution";
import { createPresentation } from "../rules/actionPresentation";
import { createResolvedPlayerMovement } from "../rules/displacement";
import {
  didDisplacementTakeEffect,
  resolveDragDisplacement,
  resolveLeapDisplacement,
  resolveLinearDisplacement
} from "../rules/movementSystem";
import type { ToolModule } from "./types";
import {
  createToolPreview,
  createUsedSummary,
  getToolParamValue,
  isMovePointToolAvailable,
  resolveToolMovementDescriptor,
  toMovementSubject
} from "./helpers";

export const MOVEMENT_TOOL_DEFINITION: ToolContentDefinition = {
  label: "移动",
  disabledHint: "点数不足",
  source: "turn",
  interaction: createDragDirectionInteraction(),
  isAvailable: isMovePointToolAvailable,
  defaultCharges: 1,
  defaultParams: {
    movePoints: 4
  },
  getTextDescription: ({ params }) => ({
    title: "移动",
    description: "沿选择方向前进，消耗本工具的移动点数。",
    details: [`移动 ${params.movePoints ?? 0} 格`]
  }),
  color: "#6abf69",
  rollable: false,
  debugGrantable: true,
  endsTurnOnUse: false
};

function resolveMovementTool(
  draft: Parameters<ToolModule["execute"]>[0],
  context: Parameters<ToolModule["execute"]>[1]
): void {
  const direction = requireDirection(context);
  const movePoints = getToolParamValue(context.activeTool, "movePoints", 4);
  const movement = resolveToolMovementDescriptor(context, "translate");

  if (!direction) {
    setDraftBlocked(draft, "Movement needs a direction", {
      preview: createToolPreview(context, { valid: false }),
    });
    return;
  }

  setDraftToolInventory(draft, consumeActiveTool(context));
  const presentationMark = markDraftPresentation(draft);

  const resolution =
    movement.type === "leap"
      ? resolveLeapDisplacement(draft, {
          direction,
          maxDistance: movePoints,
          movement,
          player: toMovementSubject(context.actor),
          startMs: 0
        })
      : movement.type === "drag"
        ? resolveDragDisplacement(draft, {
            direction,
            movePoints,
            movement,
            player: toMovementSubject(context.actor),
            startMs: 0
          })
        : resolveLinearDisplacement(draft, {
            direction,
            movePoints,
            movement,
            player: toMovementSubject(context.actor),
            startMs: 0
          });

  if (!didDisplacementTakeEffect(resolution)) {
    setDraftToolInventory(draft, context.tools);
    setDraftBlocked(draft, resolution.stopReason, {
      path: resolution.path,
      preview: createToolPreview(context, { valid: false }),
    });
    return;
  }

  const presentationEvents = consumeDraftPresentationFrom(draft, presentationMark);
  setDraftActionPresentation(
    draft,
    createPresentation(context.actor.id, context.activeTool.toolId, presentationEvents)
  );
  setDraftApplied(draft, createUsedSummary(MOVEMENT_TOOL_DEFINITION.label), {
    actorMovement: createResolvedPlayerMovement(
      context.actor.id,
      context.actor.position,
      resolution.path,
      resolution.movement
    ),
    path: resolution.path,
    preview: createToolPreview(context, {
      actorPath: resolution.path,
      actorTarget: draft.actor.position,
      affectedPlayers: draft.affectedPlayers,
      effectTiles: resolution.path,
      valid: true
    })
  });
}

export const MOVEMENT_TOOL_MODULE: ToolModule<"movement"> = {
  id: "movement",
  definition: MOVEMENT_TOOL_DEFINITION,
  execute: resolveMovementTool
};
