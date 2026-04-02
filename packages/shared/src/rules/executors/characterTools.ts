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
  MovementDescriptor,
  SummonMutation,
  TileMutation,
  ToolActionContext,
  TriggeredSummonEffect,
  TriggeredTerrainEffect
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
import { resolveLinearDisplacement } from "../movementSystem";
import { findPlayersAtPosition } from "../spatial";

function buildMovementSystemContext(context: ToolActionContext) {
  return {
    activeTool: context.activeTool,
    actorId: context.actor.id,
    board: context.board,
    players: context.players,
    sourceId: context.activeTool.instanceId,
    summons: context.summons
  };
}

function toAffectedPlayerMove(
  playerId: string,
  startPosition: ToolActionContext["actor"]["position"],
  movement: MovementDescriptor,
  resolution: ReturnType<typeof resolveLinearDisplacement>,
  reason: string
): AffectedPlayerMove {
  return {
    characterState: resolution.actor.characterState,
    movement,
    path: resolution.path,
    playerId,
    reason,
    startPosition,
    target: resolution.actor.position,
    turnFlags: resolution.actor.turnFlags
  };
}

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

// Bomb Throw selects one nearby tile, then resolves every pushed player through shared passive translation.
export function resolveBombThrowTool(context: ToolActionContext): ActionResolution {
  const targetPosition = context.targetPosition;
  const direction = requireDirection(context);
  const targetRange = getToolParam(context.activeTool, "targetRange");
  const pushDistance = getToolParam(context.activeTool, "pushDistance");
  const pushMovement = createMovementDescriptor("translate", "passive", {
    tags: [`tool:${context.activeTool.toolId}`, "bomb:push"],
    timing: "out_of_turn"
  });

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
        characterState: targetPlayer.characterState,
        id: targetPlayer.id,
        position: targetPlayer.position,
        spawnPosition: targetPlayer.spawnPosition,
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
      toAffectedPlayerMove(
        targetPlayer.id,
        targetPlayer.position,
        pushMovement,
        pushResolution,
        "bomb_throw"
      )
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
    nextTools,
    `Used ${getToolDefinition(context.activeTool.toolId).label}.`,
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
