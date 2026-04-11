import type { ToolContentDefinition } from "../content/schema";
import { createDragAxisTileInteraction } from "../toolInteraction";
import {
  consumeDraftPresentationFrom,
  markDraftPresentation,
  setDraftActionPresentation,
  setDraftApplied,
  setDraftBlocked,
  setDraftToolInventory
} from "../rules/actionDraft";
import { createPresentation } from "../rules/actionPresentation";
import {
  consumeActiveTool,
  requireTileSelection
} from "../rules/actionResolution";
import { createResolvedPlayerMovement } from "../rules/displacement";
import {
  resolveDragDisplacement,
  resolveLeapDisplacement,
  resolveLinearDisplacement
} from "../rules/movementSystem";
import { normalizeAxisTarget } from "../rules/spatial";
import type { ToolModule } from "./types";
import {
  createToolMovementPlan,
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
  defaultCharges: 1,
  defaultParams: {
    movePoints: 3
  },
  buttonValue: {
    paramId: "movePoints",
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
  const maxRange = getToolParamValue(context.activeTool, "movePoints", 3);
  const targetPosition = requireTileSelection(context);
  const axisTarget = normalizeAxisTarget(context.actor.position, targetPosition ?? undefined);
  const movement = createToolMovementPlan(context, BRAKE_TOOL_DEFINITION, "translate");

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
          movement: movement.descriptor,
          player: toMovementSubject(context.actor),
          startMs: 0
        })
      : movement.type === "drag"
        ? resolveDragDisplacement(draft, {
            direction: axisTarget.direction,
            maxSteps: requestedDistance,
            movePoints: requestedDistance,
            movement: movement.descriptor,
            player: toMovementSubject(context.actor),
            startMs: 0
          })
        : resolveLinearDisplacement(draft, {
            direction: axisTarget.direction,
            maxSteps: requestedDistance,
            movePoints: requestedDistance,
            movement: movement.descriptor,
            player: toMovementSubject(context.actor),
            startMs: 0
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

  const presentationEvents = consumeDraftPresentationFrom(draft, presentationMark);
  setDraftActionPresentation(
    draft,
    createPresentation(context.actor.id, context.activeTool.toolId, presentationEvents)
  );
  setDraftApplied(draft, createUsedSummary(BRAKE_TOOL_DEFINITION.label), {
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

export const BRAKE_TOOL_MODULE: ToolModule<"brake"> = {
  id: "brake",
  definition: BRAKE_TOOL_DEFINITION,
  execute: resolveBrakeTool
};
