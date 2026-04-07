import type { ToolContentDefinition } from "../content/schema";
import { createDragAxisTileInteraction } from "../toolInteraction";
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
  requireTileSelection
} from "../rules/actionResolution";
import { createResolvedPlayerMovement } from "../rules/displacement";
import { resolveLeapDisplacement, resolveLinearDisplacement } from "../rules/movementSystem";
import { offsetPresentationEvents } from "../rules/actionPresentation";
import { collectAxisSelectionTiles } from "../rules/previewDescriptor";
import { normalizeAxisTarget } from "../rules/spatial";
import type { ToolModule } from "./types";
import {
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

function resolveBrakeTool(
  draft: Parameters<ToolModule["execute"]>[0],
  context: Parameters<ToolModule["execute"]>[1]
): void {
  const maxRange = getToolParamValue(context.activeTool, "brakeRange", 3);
  const targetPosition = requireTileSelection(context);
  const axisTarget = normalizeAxisTarget(context.actor.position, targetPosition ?? undefined);
  const movement = createToolMovementDescriptor(context, BRAKE_TOOL_DEFINITION, "translate");

  if (!axisTarget) {
    setDraftBlocked(draft, "Brake needs a target tile", {
      preview: createToolPreview(context, {
        valid: false
      })
    });
    return;
  }

  if (maxRange < 1) {
    setDraftBlocked(draft, "No brake range left", {
      preview: createToolPreview(context, {
        valid: false
      })
    });
    return;
  }

  const requestedDistance = Math.min(maxRange, axisTarget.distance);
  setDraftToolInventory(draft, consumeActiveTool(context));
  const presentationMark = markDraftPresentation(draft);
  const resolution =
    movement.type === "leap"
      ? resolveLeapDisplacement(draft, {
          direction: axisTarget.direction,
          maxDistance: requestedDistance,
          movement,
          player: toMovementSubject(context.actor)
        })
      : resolveLinearDisplacement(draft, {
          direction: axisTarget.direction,
          maxSteps: requestedDistance,
          movePoints: requestedDistance,
          movement,
          player: toMovementSubject(context.actor)
        });

  if (!resolution.path.length) {
    setDraftToolInventory(draft, context.tools);
    setDraftBlocked(draft, resolution.stopReason, {
      path: resolution.path,
      preview: createToolPreview(context, {
        actorPath: resolution.path,
        effectTiles: resolution.path,
        valid: false
      })
    });
    return;
  }

  const triggerEvents = consumeDraftPresentationFrom(draft, presentationMark);
  const actorPresentation = createActorMotionPresentation(
    context,
    "actor-brake",
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
  setDraftApplied(draft, createUsedSummary(BRAKE_TOOL_DEFINITION.label), {
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

export const BRAKE_TOOL_MODULE: ToolModule<"brake"> = {
  id: "brake",
  definition: BRAKE_TOOL_DEFINITION,
  execute: resolveBrakeTool
};
