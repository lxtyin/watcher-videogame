import type { ToolContentDefinition } from "../content/schema";
import { createDragTileInteraction } from "../toolInteraction";
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
import { resolveTeleportDisplacement } from "../rules/movementSystem";
import { collectBoardSelectionTiles } from "../rules/previewDescriptor";
import type { ToolModule } from "./types";
import {
  createToolMovementPlan,
  createToolPreview,
  createUsedSummary,
  isChargedToolAvailable,
  toMovementSubject
} from "./helpers";

export const TELEPORT_TOOL_DEFINITION: ToolContentDefinition = {
  actorMovement: {
    type: "teleport",
    disposition: "active"
  },
  label: "瞬移",
  description: "选择全场任意一个可落脚地块，直接瞬移到目标位置。",
  disabledHint: "当前还不能瞬移到这个位置。",
  source: "turn",
  interaction: createDragTileInteraction(),
  isAvailable: isChargedToolAvailable,
  defaultCharges: 1,
  defaultParams: {},
  getTextDescription: () => ({
    title: "瞬移",
    description: "选择全场任意一个可落脚地块，直接瞬移到目标位置。",
    details: ["全场传送"]
  }),
  color: "#7b8bff",
  rollable: false,
  debugGrantable: true,
  endsTurnOnUse: false
};

function resolveTeleportTool(
  draft: Parameters<ToolModule["execute"]>[0],
  context: Parameters<ToolModule["execute"]>[1]
): void {
  const targetPosition = requireTileSelection(context);
  const movement = createToolMovementPlan(context, TELEPORT_TOOL_DEFINITION, "teleport");

  if (!targetPosition) {
    setDraftBlocked(draft, "Teleport needs a target tile", {
      preview: createToolPreview(context, {
        valid: false
      })
    });
    return;
  }

  setDraftToolInventory(draft, consumeActiveTool(context));
  const presentationMark = markDraftPresentation(draft);
  const resolution = resolveTeleportDisplacement(draft, {
    movement: movement.descriptor,
    player: toMovementSubject(context.actor),
    startMs: 0,
    targetPosition
  });

  if (!resolution.path.length) {
    setDraftToolInventory(draft, context.tools);
    setDraftBlocked(draft, resolution.stopReason, {
      preview: createToolPreview(context, {
        effectTiles: [targetPosition],
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
  setDraftApplied(draft, createUsedSummary(TELEPORT_TOOL_DEFINITION.label), {
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
      effectTiles: [targetPosition],
      valid: true
    })
  });
}

export const TELEPORT_TOOL_MODULE: ToolModule<"teleport"> = {
  id: "teleport",
  definition: TELEPORT_TOOL_DEFINITION,
  execute: resolveTeleportTool
};
