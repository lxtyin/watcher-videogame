import type { ToolContentDefinition } from "../content/schema";
import { createDragDirectionInteraction } from "../toolInteraction";
import {
  appendDraftPresentationEvents,
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
import { createResolvedPlayerMovement } from "../rules/displacement";
import { resolveLeapDisplacement, resolveLinearDisplacement } from "../rules/movementSystem";
import { offsetPresentationEvents } from "../rules/actionPresentation";
import { collectDirectionSelectionTiles, createPreviewDescriptor } from "../rules/previewDescriptor";
import type { ToolModule } from "./types";
import {
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

function resolveMovementTool(
  draft: Parameters<ToolModule["execute"]>[0],
  context: Parameters<ToolModule["execute"]>[1]
): void {
  const direction = requireDirection(context);
  const movePoints = getToolParamValue(context.activeTool, "movePoints", 4);
  const movement = createToolMovementDescriptor(context, MOVEMENT_TOOL_DEFINITION, "translate");
  
  if (!direction) {
    setDraftBlocked(draft, "Movement needs a direction", {
      preview: createToolPreview(context, { valid: false }),
    });
    return;
  }

  if (movePoints < 1) {
    setDraftBlocked(draft, "No move points left", {
      preview: createToolPreview(context, { valid: false }),
    });
    return;
  }

  setDraftToolInventory(draft, consumeActiveTool(context));
  const presentationMark = markDraftPresentation(draft);

  const resolution = resolveLinearDisplacement(draft, {
    direction,
    movePoints,
    movement,
    player: toMovementSubject(context.actor)
  });

  if (!resolution.path.length) {
    setDraftToolInventory(draft, context.tools);
    setDraftBlocked(draft, resolution.stopReason, {
      path: resolution.path,
      preview: createToolPreview(context, { valid: false }),
    });
    return;
  }

  const triggerEvents = consumeDraftPresentationFrom(draft, presentationMark);
  const actorPresentation = createActorMotionPresentation(
    context,
    "actor-move",
    resolution.path,
    movement.type === "leap" ? "arc" : "ground"
  );

  setDraftActionPresentation(draft, actorPresentation);
  appendDraftPresentationEvents(
    draft,
    offsetPresentationEvents(
      [...triggerEvents, ...resolution.presentationEvents],
      actorPresentation?.durationMs ?? 0
    )
  );
  setDraftApplied(draft, createUsedSummary(MOVEMENT_TOOL_DEFINITION.label), {
    actorMovement: createResolvedPlayerMovement(
      context.actor.id,
      context.actor.position,
      resolution.path,
      movement
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
