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
import { createPresentation } from "../rules/actionPresentation";
import {
  consumeActiveTool,
  requireDirection
} from "../rules/actionResolution";
import { createResolvedPlayerMovement } from "../rules/displacement";
import { resolveLeapDisplacement } from "../rules/movementSystem";
import type { ToolModule } from "./types";
import {
  createToolMovementPlan,
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
  defaultCharges: 1,
  defaultParams: {
    jumpDistance: 2
  },
  getTextDescription: ({ params }) => ({
    title: "跳跃",
    description: "沿选择方向飞跃固定距离，忽略途中停留。",
    details: [`飞跃 ${params.jumpDistance ?? 0} 格`]
  }),
  color: "#85c772",
  rollable: true,
  debugGrantable: true,
  endsTurnOnUse: false
};

function resolveJumpTool(
  draft: Parameters<ToolModule["execute"]>[0],
  context: Parameters<ToolModule["execute"]>[1]
): void {
  const direction = requireDirection(context);
  const jumpDistance = getToolParamValue(context.activeTool, "jumpDistance", 2);
  const movement = createToolMovementPlan(context, JUMP_TOOL_DEFINITION, "leap");
  const presentationMark = markDraftPresentation(draft);
  const resolution = direction
    ? (() => {
        setDraftToolInventory(draft, consumeActiveTool(context));
        return resolveLeapDisplacement(draft, {
          direction,
          maxDistance: jumpDistance,
          movement: movement.descriptor,
          player: toMovementSubject(context.actor),
          startMs: 0
        });
      })()
    : null;

  if (!direction || !resolution) {
    setDraftBlocked(draft, "Jump needs a direction", {
      preview: createToolPreview(context, { valid: false }),
    });
    return;
  }

  if (!resolution.path.length) {
    setDraftToolInventory(draft, context.tools);
    setDraftBlocked(draft, resolution.stopReason, {
      path: resolution.path,
      preview: createToolPreview(context, { valid: false })
    });
    return;
  }

  const presentationEvents = consumeDraftPresentationFrom(draft, presentationMark);
  setDraftActionPresentation(
    draft,
    createPresentation(context.actor.id, context.activeTool.toolId, presentationEvents)
  );
  setDraftApplied(draft, createUsedSummary(JUMP_TOOL_DEFINITION.label), {
    actorMovement: createResolvedPlayerMovement(
      context.actor.id,
      context.actor.position,
      resolution.path,
      resolution.movement
    ),
    path: resolution.path,
    preview: createToolPreview(context, {
      actorTarget: draft.actor.position,
      affectedPlayers: draft.affectedPlayers,
      valid: true
    })
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
