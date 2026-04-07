import type {
  AffectedPlayerMove,
  ActionPresentationEvent,
  ActionResolution,
  SummonMutation,
  TileMutation,
  TriggeredSummonEffect,
  TriggeredTerrainEffect
} from "../types";
import type { ToolContentDefinition } from "../content/schema";
import { createSequentialInteraction } from "../toolInteraction";
import {
  buildMotionPositions,
  createPlayerMotionEvent,
  createPresentation,
  offsetPresentationEvents
} from "../rules/actionPresentation";
import {
  buildAppliedResolution,
  buildBlockedResolution,
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
  buildMovementSystemContext,
  createToolPreview,
  createUsedSummary,
  getToolParamValue,
  toAffectedPlayerMove,
  toMovementSubject
} from "./helpers";

export const BOMB_THROW_TOOL_DEFINITION: ToolContentDefinition = {
  label: "投弹",
  description: "先选择周围一格作为投弹点，再选择一个方向，将该格上的玩家推出去。",
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

function resolveBombThrowTool(context: Parameters<ToolModule["execute"]>[0]): ActionResolution {
  const targetPosition = requireTileSelection(context);
  const direction = requireDirection(context);
  const targetRange = getToolParamValue(context.activeTool, "targetRange", 1);
  const pushDistance = getToolParamValue(context.activeTool, "pushDistance", 2);
  const pushMovement = createMovementDescriptor("translate", "passive", {
    tags: [`tool:${context.activeTool.toolId}`, "bomb:push"],
    timing: "out_of_turn"
  });
  const selectionTiles = collectAdjacentSelectionTiles(context.board, context.actor.position, targetRange);

  if (!targetPosition) {
    return buildBlockedResolution({
      actor: context.actor,
      nextToolDieSeed: context.toolDieSeed,
      preview: createToolPreview(context, {
        selectionTiles,
        valid: false
      }),
      reason: "Bomb Throw needs a target tile",
      tools: context.tools
    });
  }

  if (!direction) {
    return buildBlockedResolution({
      actor: context.actor,
      nextToolDieSeed: context.toolDieSeed,
      preview: createToolPreview(context, {
        effectTiles: [targetPosition],
        selectionTiles,
        valid: false
      }),
      reason: "Bomb Throw needs a direction",
      tools: context.tools
    });
  }

  const deltaX = Math.abs(targetPosition.x - context.actor.position.x);
  const deltaY = Math.abs(targetPosition.y - context.actor.position.y);

  if ((deltaX === 0 && deltaY === 0) || deltaX > targetRange || deltaY > targetRange) {
    return buildBlockedResolution({
      actor: context.actor,
      nextToolDieSeed: context.toolDieSeed,
      preview: createToolPreview(context, {
        // effectTiles: [targetPosition],
        selectionTiles,
        valid: false
      }),
      reason: "Target tile is outside the bomb range",
      tools: context.tools
    });
  }

  const targetPlayers = findPlayersAtPosition(context.players, targetPosition, []);

  if (!targetPlayers.length) {
    return buildBlockedResolution({
      actor: context.actor,
      nextToolDieSeed: context.toolDieSeed,
      preview: createToolPreview(context, {
        effectTiles: [targetPosition],
        selectionTiles,
        valid: false
      }),
      reason: "No players are standing on the target tile",
      tools: context.tools
    });
  }

  const affectedPlayers: AffectedPlayerMove[] = [];
  const tileMutations: TileMutation[] = [];
  const summonMutations: SummonMutation[] = [];
  const triggeredTerrainEffects: TriggeredTerrainEffect[] = [];
  const triggeredSummonEffects: TriggeredSummonEffect[] = [];
  const motionEvents: ActionPresentationEvent[] = [];
  let nextTools = consumeActiveTool(context);
  let nextToolDieSeed = context.toolDieSeed;

  for (const [index, targetPlayer] of targetPlayers.entries()) {
    const pushResolution = resolveLinearDisplacement(buildMovementSystemContext(context), {
      direction,
      maxSteps: pushDistance,
      movePoints: pushDistance,
      movement: pushMovement,
      player: toMovementSubject(targetPlayer),
      priorSummonMutations: summonMutations,
      priorTileMutations: tileMutations,
      toolDieSeed: nextToolDieSeed,
      tools: nextTools
    });

    if (!pushResolution.path.length) {
      continue;
    }

    affectedPlayers.push(
      toAffectedPlayerMove(targetPlayer.id, targetPlayer.position, pushMovement, pushResolution, "bomb_throw")
    );
    nextTools = pushResolution.tools;
    nextToolDieSeed = pushResolution.nextToolDieSeed;
    tileMutations.push(...pushResolution.tileMutations);
    summonMutations.push(...pushResolution.summonMutations);
    triggeredTerrainEffects.push(...pushResolution.triggeredTerrainEffects);
    triggeredSummonEffects.push(...pushResolution.triggeredSummonEffects);

    const motionEvent = createPlayerMotionEvent(
      `${context.activeTool.instanceId}:bomb-push-${targetPlayer.id}-${index}`,
      targetPlayer.id,
      buildMotionPositions(targetPlayer.position, pushResolution.path),
      "ground"
    );

    affectedPlayers.push(...pushResolution.affectedPlayers);
    motionEvents.push(
      ...offsetPresentationEvents(
        pushResolution.presentationEvents,
        (motionEvent?.startMs ?? 0) + (motionEvent?.durationMs ?? 0)
      )
    );

    if (motionEvent) {
      motionEvents.push(motionEvent);
    }
  }

  if (!affectedPlayers.length) {
    return buildBlockedResolution({
      actor: context.actor,
      nextToolDieSeed: context.toolDieSeed,
      preview: createToolPreview(context, {
        effectTiles: [targetPosition],
        selectionTiles,
        valid: false
      }),
      reason: "Targets cannot be displaced",
      tools: context.tools
    });
  }

  return buildAppliedResolution({
    actor: context.actor,
    affectedPlayers,
    nextToolDieSeed,
    path: [],
    presentation: createPresentation(context.actor.id, context.activeTool.toolId, motionEvents),
    preview: createToolPreview(context, {
      affectedPlayers,
      effectTiles: [targetPosition],
      selectionTiles,
      valid: true
    }),
    summonMutations,
    summary: createUsedSummary(BOMB_THROW_TOOL_DEFINITION.label),
    tileMutations,
    tools: nextTools,
    triggeredSummonEffects,
    triggeredTerrainEffects
  });
}

export const BOMB_THROW_TOOL_MODULE: ToolModule<"bombThrow"> = {
  id: "bombThrow",
  definition: BOMB_THROW_TOOL_DEFINITION,
  execute: resolveBombThrowTool
};
