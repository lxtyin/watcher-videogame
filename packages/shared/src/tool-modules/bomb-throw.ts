import type { ToolContentDefinition } from "../content/schema";
import type {
  AffectedPlayerMove,
  ActionPresentationEvent,
  ActionResolution,
  SummonMutation,
  TileMutation,
  TriggeredSummonEffect,
  TriggeredTerrainEffect
} from "../types";
import { buildMotionPositions, createPlayerMotionEvent, createPresentation } from "../rules/actionPresentation";
import {
  buildAppliedResolution,
  buildBlockedResolution,
  consumeActiveTool,
  requireDirection
} from "../rules/actionResolution";
import { createMovementDescriptor } from "../rules/displacement";
import { resolveLinearDisplacement } from "../rules/movementSystem";
import { findPlayersAtPosition } from "../rules/spatial";
import type { ToolModule } from "./types";
import {
  buildMovementSystemContext,
  createUsedSummary,
  getToolParamValue,
  toAffectedPlayerMove
} from "./helpers";

export const BOMB_THROW_TOOL_DEFINITION: ToolContentDefinition = {
  label: "投弹",
  description: "选择周围八格内的一格，并指定一个方向，让其中所有玩家位移 2 格。",
  disabledHint: "请先选择一个有效目标格，并指定推动方向。",
  source: "turn",
  targetMode: "tile_direction",
  tileTargeting: "adjacent_ring",
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
  const targetPosition = context.targetPosition;
  const direction = requireDirection(context);
  const targetRange = getToolParamValue(context.activeTool, "targetRange", 1);
  const pushDistance = getToolParamValue(context.activeTool, "pushDistance", 2);
  const pushMovement = createMovementDescriptor("translate", "passive", {
    tags: [`tool:${context.activeTool.toolId}`, "bomb:push"],
    timing: "out_of_turn"
  });

  if (!targetPosition) {
    return buildBlockedResolution(context.actor, context.tools, "Bomb Throw needs a target tile", context.toolDieSeed);
  }

  if (!direction) {
    return buildBlockedResolution(context.actor, context.tools, "Bomb Throw needs a direction", context.toolDieSeed, [], [], [targetPosition]);
  }

  const deltaX = Math.abs(targetPosition.x - context.actor.position.x);
  const deltaY = Math.abs(targetPosition.y - context.actor.position.y);

  if ((deltaX === 0 && deltaY === 0) || deltaX > targetRange || deltaY > targetRange) {
    return buildBlockedResolution(context.actor, context.tools, "Target tile is outside the bomb range", context.toolDieSeed, [], [], [targetPosition]);
  }

  const targetPlayers = findPlayersAtPosition(context.players, targetPosition, []);

  if (!targetPlayers.length) {
    return buildBlockedResolution(context.actor, context.tools, "No players are standing on the target tile", context.toolDieSeed, [], [], [targetPosition]);
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
      player: {
        characterId: targetPlayer.characterId,
        id: targetPlayer.id,
        position: targetPlayer.position,
        spawnPosition: targetPlayer.spawnPosition,
        tags: targetPlayer.tags,
        turnFlags: targetPlayer.turnFlags
      },
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

    if (motionEvent) {
      motionEvents.push(motionEvent);
    }
  }

  if (!affectedPlayers.length) {
    return buildBlockedResolution(context.actor, context.tools, "Targets cannot be displaced", context.toolDieSeed, [], [], [targetPosition]);
  }

  return buildAppliedResolution(
    context.actor,
    nextTools,
    createUsedSummary(BOMB_THROW_TOOL_DEFINITION.label),
    nextToolDieSeed,
    [],
    tileMutations,
    affectedPlayers,
    triggeredTerrainEffects,
    [targetPosition],
    createPresentation(context.actor.id, context.activeTool.toolId, motionEvents),
    summonMutations,
    triggeredSummonEffects
  );
}

export const BOMB_THROW_TOOL_MODULE: ToolModule<"bombThrow"> = {
  id: "bombThrow",
  definition: BOMB_THROW_TOOL_DEFINITION,
  execute: resolveBombThrowTool
};
