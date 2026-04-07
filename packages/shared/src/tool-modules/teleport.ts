import type { ToolContentDefinition } from "../content/schema";
import { createDragTileInteraction } from "../toolInteraction";
import type { ActionResolution } from "../types";
import {
  buildAppliedResolution,
  buildBlockedResolution,
  consumeActiveTool,
  requireTileSelection
} from "../rules/actionResolution";
import { createResolvedPlayerMovement } from "../rules/displacement";
import { resolveTeleportDisplacement } from "../rules/movementSystem";
import { collectBoardSelectionTiles } from "../rules/previewDescriptor";
import type { ToolModule } from "./types";
import {
  appendToolPresentationEvents,
  buildMovementSystemContext,
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

function resolveTeleportTool(context: Parameters<ToolModule["execute"]>[0]): ActionResolution {
  const targetPosition = requireTileSelection(context);
  const movement = createToolMovementDescriptor(context, TELEPORT_TOOL_DEFINITION, "teleport");
  // const selectionTiles = collectBoardSelectionTiles(context.board, context.actor.position);

  if (!targetPosition) {
    return buildBlockedResolution({
      actor: context.actor,
      nextToolDieSeed: context.toolDieSeed,
      preview: createToolPreview(context, {
        // selectionTiles,
        valid: false
      }),
      reason: "Teleport needs a target tile",
      tools: context.tools
    });
  }

  const resolution = resolveTeleportDisplacement(buildMovementSystemContext(context), {
    movement,
    player: toMovementSubject(context.actor),
    targetPosition,
    toolDieSeed: context.toolDieSeed,
    tools: consumeActiveTool(context)
  });

  if (!resolution.path.length) {
    return buildBlockedResolution({
      actor: context.actor,
      nextToolDieSeed: context.toolDieSeed,
      preview: createToolPreview(context, {
        effectTiles: [targetPosition],
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
    affectedPlayers: resolution.affectedPlayers,
    nextToolDieSeed: resolution.nextToolDieSeed,
    path: resolution.path,
    presentation: appendToolPresentationEvents(context, null, resolution.presentationEvents),
    preview: createToolPreview(context, {
      actorPath: resolution.path,
      actorTarget: resolution.actor.position,
      affectedPlayers: resolution.affectedPlayers,
      effectTiles: [targetPosition],
      // selectionTiles,
      valid: true
    }),
    summonMutations: resolution.summonMutations,
    summary: createUsedSummary(TELEPORT_TOOL_DEFINITION.label),
    tileMutations: resolution.tileMutations,
    tools: resolution.tools,
    triggeredSummonEffects: resolution.triggeredSummonEffects,
    triggeredTerrainEffects: resolution.triggeredTerrainEffects
  });
}

export const TELEPORT_TOOL_MODULE: ToolModule<"teleport"> = {
  id: "teleport",
  definition: TELEPORT_TOOL_DEFINITION,
  execute: resolveTeleportTool
};
