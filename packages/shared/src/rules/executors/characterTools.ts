import {
  adjustMovementTools,
  clearMovementTools,
  FARTHER_PENDING_MOVE_BONUS_STATE_KEY,
  getCharacterStateNumber,
  getTotalMovementPoints,
  setCharacterStateValue
} from "../../characterRuntime";
import { getToolChoiceDefinitions, getToolDefinition, getToolParam } from "../../tools";
import type {
  ActionPresentationEvent,
  ActionResolution,
  AffectedPlayerMove,
  TileMutation,
  ToolActionContext
} from "../../types";
import {
  buildMotionPositions,
  createPlayerMotionEvent,
  createPresentation
} from "../actionPresentation";
import { createMovementDescriptor } from "../displacement";
import {
  buildAppliedResolution,
  buildBlockedResolution,
  consumeActiveTool,
  requireDirection
} from "../actionResolution";
import { findPlayersAtPosition, resolvePushTarget } from "../spatial";

// Balance converts the current turn's move stock into a deferred bonus for a later turn.
export function resolveBalanceTool(context: ToolActionContext): ActionResolution {
  const choiceId = context.choiceId;
  const totalMovePoints = getTotalMovementPoints(context.tools);

  if (!choiceId) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Balance needs a choice",
      context.toolDieSeed
    );
  }

  if (!getToolChoiceDefinitions(context.activeTool.toolId).some((choice) => choice.id === choiceId)) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Unknown balance choice",
      context.toolDieSeed
    );
  }

  if (totalMovePoints < 1) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "No move points available",
      context.toolDieSeed
    );
  }

  let nextTools = consumeActiveTool(context);
  let nextCharacterState = {
    ...context.actor.characterState
  };
  const currentPendingBonus = getCharacterStateNumber(
    context.actor.characterState,
    FARTHER_PENDING_MOVE_BONUS_STATE_KEY
  );

  if (choiceId === "trim_and_bank") {
    nextTools = adjustMovementTools(nextTools, -1);
    nextCharacterState = setCharacterStateValue(
      nextCharacterState,
      FARTHER_PENDING_MOVE_BONUS_STATE_KEY,
      currentPendingBonus + 1
    );
  } else {
    nextTools = clearMovementTools(nextTools);
    nextCharacterState = setCharacterStateValue(
      nextCharacterState,
      FARTHER_PENDING_MOVE_BONUS_STATE_KEY,
      currentPendingBonus + totalMovePoints
    );
  }

  return buildAppliedResolution(
    {
      ...context.actor,
      characterState: nextCharacterState
    },
    nextTools,
    `Used ${getToolDefinition(context.activeTool.toolId).label}.`,
    context.toolDieSeed,
    []
  );
}

// Bomb Throw selects one adjacent tile, then pushes every player on it in the chosen direction.
export function resolveBombThrowTool(context: ToolActionContext): ActionResolution {
  const targetPosition = context.targetPosition;
  const direction = requireDirection(context);
  const targetRange = getToolParam(context.activeTool, "targetRange");
  const pushDistance = getToolParam(context.activeTool, "pushDistance");
  const pushMovement = createMovementDescriptor("translate", "passive");

  if (!targetPosition) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Bomb Throw needs a target tile",
      context.toolDieSeed
    );
  }

  if (!direction) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Bomb Throw needs a direction",
      context.toolDieSeed,
      [],
      [],
      [targetPosition]
    );
  }

  const deltaX = Math.abs(targetPosition.x - context.actor.position.x);
  const deltaY = Math.abs(targetPosition.y - context.actor.position.y);

  if ((deltaX === 0 && deltaY === 0) || deltaX > targetRange || deltaY > targetRange) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Target tile is outside the bomb range",
      context.toolDieSeed,
      [],
      [],
      [targetPosition]
    );
  }

  const targetPlayers = findPlayersAtPosition(context.players, targetPosition, []);

  if (!targetPlayers.length) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "No players are standing on the target tile",
      context.toolDieSeed,
      [],
      [],
      [targetPosition]
    );
  }

  const affectedPlayers: AffectedPlayerMove[] = [];
  const tileMutations: TileMutation[] = [];
  const triggeredTerrainEffects = [];
  const motionEvents: ActionPresentationEvent[] = [];

  for (const [index, targetPlayer] of targetPlayers.entries()) {
    const traversal = resolvePushTarget(context, targetPlayer, direction, pushDistance, tileMutations);

    if (!traversal.path.length) {
      continue;
    }

    affectedPlayers.push({
      movement: pushMovement,
      path: traversal.path,
      playerId: targetPlayer.id,
      reason: "bomb_throw",
      startPosition: targetPlayer.position,
      target: traversal.position
    });
    tileMutations.push(...traversal.tileMutations);
    triggeredTerrainEffects.push(...traversal.triggeredTerrainEffects);

    const motionEvent = createPlayerMotionEvent(
      `${context.activeTool.instanceId}:bomb-push-${targetPlayer.id}-${index}`,
      targetPlayer.id,
      buildMotionPositions(targetPlayer.position, traversal.path),
      "ground"
    );

    if (motionEvent) {
      motionEvents.push(motionEvent);
    }
  }

  if (!affectedPlayers.length) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Targets cannot be displaced",
      context.toolDieSeed,
      [],
      [],
      [targetPosition]
    );
  }

  return buildAppliedResolution(
    context.actor,
    consumeActiveTool(context),
    `Used ${getToolDefinition(context.activeTool.toolId).label}.`,
    context.toolDieSeed,
    [],
    tileMutations,
    affectedPlayers,
    triggeredTerrainEffects,
    [targetPosition],
    createPresentation(context.actor.id, context.activeTool.toolId, motionEvents)
  );
}
