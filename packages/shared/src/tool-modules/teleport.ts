import type { ToolContentDefinition } from "../content/schema";
import { createDragTileInteraction } from "../toolInteraction";
import {
  appendDraftPresentationEvents,
  setDraftApplied,
  setDraftBlocked,
  setDraftToolInventory
} from "../rules/actionDraft";
import {
  consumeActiveTool,
  requireTileSelection
} from "../rules/actionResolution";
import { createResolvedPlayerMovement } from "../rules/displacement";
import { resolveTeleportDisplacement } from "../rules/movementSystem";
import { collectBoardSelectionTiles } from "../rules/previewDescriptor";
import type { ToolModule } from "./types";
import {
  createToolMovementDescriptor,
  createToolPreview,
  createUsedSummary,
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
  conditions: [],
  defaultCharges: 1,
  defaultParams: {},
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
  const movement = createToolMovementDescriptor(context, TELEPORT_TOOL_DEFINITION, "teleport");

  if (!targetPosition) {
    setDraftBlocked(draft, "Teleport needs a target tile", {
      preview: createToolPreview(context, {
        valid: false
      })
    });
    return;
  }

  setDraftToolInventory(draft, consumeActiveTool(context));
  const resolution = resolveTeleportDisplacement(draft, {
    movement,
    player: toMovementSubject(context.actor),
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

  appendDraftPresentationEvents(draft, resolution.presentationEvents);
  setDraftApplied(draft, createUsedSummary(TELEPORT_TOOL_DEFINITION.label), {
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
