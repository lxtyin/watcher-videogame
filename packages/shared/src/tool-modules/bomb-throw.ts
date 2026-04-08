import type { ActionPresentationEvent } from "../types";
import type { ToolContentDefinition } from "../content/schema";
import { createSequentialInteraction } from "../toolInteraction";
import {
  createPresentation,
} from "../rules/actionPresentation";
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
  requireDirection,
  requireTileSelection
} from "../rules/actionResolution";
import { createMovementDescriptor } from "../rules/displacement";
import { resolveLinearDisplacement } from "../rules/movementSystem";
import { collectAdjacentSelectionTiles } from "../rules/previewDescriptor";
import { findPlayersAtPosition } from "../rules/spatial";
import type { ToolModule } from "./types";
import {
  createToolPreview,
  createUsedSummary,
  getToolParamValue,
  toMovementSubject
} from "./helpers";

export const BOMB_THROW_TOOL_DEFINITION: ToolContentDefinition = {
  label: "投弹",
  description: "先选择一格目标，再选择一个方向，将目标格上的玩家推开。",
  disabledHint: "当前不能使用投弹。",
  source: "turn",
  interaction: createSequentialInteraction([
    {
      kind: "drag-tile-release",
      tileKey: "targetPosition"
    },
    {
      anchor: {
        kind: "tile_slot",
        slotKey: "targetPosition"
      },
      directionKey: "direction",
      kind: "drag-direction-release"
    }
  ]),
  conditions: [],
  defaultCharges: 1,
  defaultParams: {
    targetRange: 1,
    pushDistance: 2
  },
  color: "#d86a42",
  rollable: false,
  debugGrantable: true,
  endsTurnOnUse: false
};

function resolveBombThrowTool(
  draft: Parameters<ToolModule["execute"]>[0],
  context: Parameters<ToolModule["execute"]>[1]
): void {
  const targetPosition = requireTileSelection(context);
  const direction = requireDirection(context);
  const targetRange = getToolParamValue(context.activeTool, "targetRange", 1);
  const pushDistance = getToolParamValue(context.activeTool, "pushDistance", 2);
  const pushMovement = createMovementDescriptor("translate", "passive", {
    tags: [`tool:${context.activeTool.toolId}`, "bomb:push"],
    timing: "out_of_turn"
  });
  const selectionTiles = collectAdjacentSelectionTiles(
    context.board,
    context.actor.position,
    targetRange
  );

  if (!targetPosition) {
    setDraftBlocked(draft, "Bomb Throw needs a target tile", {
      preview: createToolPreview(context, {
        selectionTiles,
        valid: false
      })
    });
    return;
  }

  if (!direction) {
    setDraftBlocked(draft, "Bomb Throw needs a direction", {
      preview: createToolPreview(context, {
        effectTiles: [targetPosition],
        selectionTiles,
        valid: false
      })
    });
    return;
  }

  const deltaX = Math.abs(targetPosition.x - context.actor.position.x);
  const deltaY = Math.abs(targetPosition.y - context.actor.position.y);

  if ((deltaX === 0 && deltaY === 0) || deltaX > targetRange || deltaY > targetRange) {
    setDraftBlocked(draft, "Target tile is outside the bomb range", {
      preview: createToolPreview(context, {
        selectionTiles,
        valid: false
      })
    });
    return;
  }

  const targetPlayers = findPlayersAtPosition(context.players, targetPosition, []);

  if (!targetPlayers.length) {
    setDraftBlocked(draft, "No players are standing on the target tile", {
      preview: createToolPreview(context, {
        effectTiles: [targetPosition],
        selectionTiles,
        valid: false
      })
    });
    return;
  }

  const motionEvents: ActionPresentationEvent[] = [];
  const nestedEvents: ActionPresentationEvent[] = [];
  setDraftToolInventory(draft, consumeActiveTool(context));

  for (const [index, targetPlayer] of targetPlayers.entries()) {
    const presentationMark = markDraftPresentation(draft);
    const pushResolution = resolveLinearDisplacement(draft, {
      direction,
      maxSteps: pushDistance,
      movePoints: pushDistance,
      movement: pushMovement,
      player: toMovementSubject(targetPlayer),
      startMs: 0,
      trackAffectedPlayerReason: "bomb_throw"
    });

    if (!pushResolution.path.length) {
      continue;
    }

    motionEvents.push(...consumeDraftPresentationFrom(draft, presentationMark));
  }

  if (!draft.affectedPlayers.length) {
    setDraftToolInventory(draft, context.tools);
    setDraftBlocked(draft, "Targets cannot be displaced", {
      preview: createToolPreview(context, {
        effectTiles: [targetPosition],
        selectionTiles,
        valid: false
      })
    });
    return;
  }

  setDraftActionPresentation(
    draft,
    createPresentation(context.actor.id, context.activeTool.toolId, motionEvents)
  );
  setDraftApplied(draft, createUsedSummary(BOMB_THROW_TOOL_DEFINITION.label), {
    path: [],
    preview: createToolPreview(context, {
      affectedPlayers: draft.affectedPlayers,
      effectTiles: [targetPosition],
      selectionTiles,
      valid: true
    })
  });
}

export const BOMB_THROW_TOOL_MODULE: ToolModule<"bombThrow"> = {
  id: "bombThrow",
  definition: BOMB_THROW_TOOL_DEFINITION,
  execute: resolveBombThrowTool
};
