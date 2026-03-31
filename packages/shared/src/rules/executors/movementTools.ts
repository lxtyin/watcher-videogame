import { getTile, isWithinBoard } from "../../board";
import { getToolDefinition, getToolParam } from "../../tools";
import type {
  ActionResolution,
  AffectedPlayerMove,
  GridPosition,
  ToolActionContext
} from "../../types";
import {
  buildMotionPositions,
  createPlayerMotionEvent,
  createPresentation
} from "../actionPresentation";
import {
  buildAppliedResolution,
  buildBlockedResolution,
  consumeActiveTool,
  requireDirection
} from "../actionResolution";
import {
  findPlayersAtPosition,
  getOppositeDirection,
  isLandablePosition,
  isSolidTileType,
  normalizeAxisTarget,
  positionsEqual,
  resolveGroundTraversal,
  resolveLeapLanding,
  stepPosition
} from "../spatial";

// Movement spends the tool's stored move points on the grounded traversal pipeline.
export function resolveMovementTool(context: ToolActionContext): ActionResolution {
  const direction = requireDirection(context);
  const movePoints = getToolParam(context.activeTool, "movePoints");

  if (!direction) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Movement needs a direction",
      context.toolDieSeed
    );
  }

  if (movePoints < 1) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "No move points left",
      context.toolDieSeed
    );
  }

  const traversal = resolveGroundTraversal({
    actorId: context.actor.id,
    board: context.board,
    direction,
    movePoints,
    position: context.actor.position
  });
  const presentation = createPresentation(context.actor.id, context.activeTool.toolId, [
    createPlayerMotionEvent(
      `${context.activeTool.instanceId}:actor-move`,
      context.actor.id,
      buildMotionPositions(context.actor.position, traversal.path),
      "ground"
    )
  ].flatMap((event) => (event ? [event] : [])));

  return buildAppliedResolution(
    {
      ...context.actor,
      position: traversal.position
    },
    consumeActiveTool(context),
    `Used ${getToolDefinition(context.activeTool.toolId).label}.`,
    context.toolDieSeed,
    traversal.path,
    traversal.tileMutations,
    [],
    traversal.triggeredTerrainEffects,
    traversal.path,
    presentation
  );
}

// Jump checks multiple landings without triggering grounded pass-through terrain.
export function resolveJumpTool(context: ToolActionContext): ActionResolution {
  const direction = requireDirection(context);
  const jumpDistance = getToolParam(context.activeTool, "jumpDistance");

  if (!direction) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Jump needs a direction",
      context.toolDieSeed
    );
  }

  const leap = resolveLeapLanding(
    context.board,
    context.actor.position,
    direction,
    jumpDistance
  );

  if (!leap.landing) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "No landing tile",
      context.toolDieSeed,
      leap.path,
      [],
      leap.path
    );
  }

  const presentation = createPresentation(context.actor.id, context.activeTool.toolId, [
    createPlayerMotionEvent(
      `${context.activeTool.instanceId}:actor-jump`,
      context.actor.id,
      buildMotionPositions(context.actor.position, leap.path),
      "arc"
    )
  ].flatMap((event) => (event ? [event] : [])));

  return buildAppliedResolution(
    {
      ...context.actor,
      position: leap.landing
    },
    consumeActiveTool(context),
    `Used ${getToolDefinition(context.activeTool.toolId).label}.`,
    context.toolDieSeed,
    leap.path,
    [],
    [],
    [],
    leap.path,
    presentation
  );
}

// Hookshot either pulls a player or snaps the actor toward the first solid obstacle hit.
export function resolveHookshotTool(context: ToolActionContext): ActionResolution {
  const direction = requireDirection(context);
  const hookLength = getToolParam(context.activeTool, "hookLength");

  if (!direction) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Hookshot needs a direction",
      context.toolDieSeed
    );
  }

  const rayPath: GridPosition[] = [];

  for (let distance = 1; distance <= hookLength; distance += 1) {
    const target = stepPosition(context.actor.position, direction, distance);

    if (!isWithinBoard(context.board, target)) {
      break;
    }

    const tile = getTile(context.board, target);

    if (tile && isSolidTileType(tile.type)) {
      if (distance === 1) {
        return buildBlockedResolution(
          context.actor,
          context.tools,
          "No hookshot landing space",
          context.toolDieSeed,
          rayPath,
          [],
          rayPath
        );
      }

      const landing = stepPosition(context.actor.position, direction, distance - 1);
      const presentation = createPresentation(context.actor.id, context.activeTool.toolId, [
        createPlayerMotionEvent(
          `${context.activeTool.instanceId}:actor-hook`,
          context.actor.id,
          buildMotionPositions(context.actor.position, rayPath),
          "ground"
        )
      ].flatMap((event) => (event ? [event] : [])));

      return buildAppliedResolution(
        {
          ...context.actor,
          position: landing
        },
        consumeActiveTool(context),
        `Used ${getToolDefinition(context.activeTool.toolId).label}.`,
        context.toolDieSeed,
        rayPath,
        [],
        [],
        [],
        rayPath,
        presentation
      );
    }

    rayPath.push(target);

    const hitPlayers = findPlayersAtPosition(context.players, target, [context.actor.id]);

    if (hitPlayers.length) {
      const pullDirection = getOppositeDirection(direction);
      const affectedPlayerResults = hitPlayers.flatMap((hitPlayer) => {
        let currentTarget = hitPlayer.position;
        const pullPath: GridPosition[] = [];

        while (true) {
          const nextTarget = stepPosition(currentTarget, pullDirection);

          if (positionsEqual(nextTarget, context.actor.position)) {
            break;
          }

          if (!isLandablePosition(context.board, nextTarget)) {
            break;
          }

          currentTarget = nextTarget;
          pullPath.push(currentTarget);
        }

        if (positionsEqual(currentTarget, hitPlayer.position)) {
          return [];
        }

        return [
          {
            path: pullPath,
            playerId: hitPlayer.id,
            target: currentTarget,
            reason: "hookshot"
          }
        ];
      });
      const affectedPlayers: AffectedPlayerMove[] = affectedPlayerResults.map(
        ({ playerId, target, reason }) => ({
          playerId,
          target,
          reason
        })
      );

      if (!affectedPlayers.length) {
        return buildBlockedResolution(
          context.actor,
          context.tools,
          "Target cannot be pulled",
          context.toolDieSeed,
          rayPath,
          [],
          rayPath
        );
      }

      const presentation = createPresentation(
        context.actor.id,
        context.activeTool.toolId,
        affectedPlayerResults.flatMap((result, index) => {
          const event = createPlayerMotionEvent(
            `${context.activeTool.instanceId}:hooked-${index}`,
            result.playerId,
            buildMotionPositions(
              hitPlayers.find((player) => player.id === result.playerId)?.position ?? result.target,
              result.path
            ),
            "ground"
          );

          return event ? [event] : [];
        })
      );

      return buildAppliedResolution(
        context.actor,
        consumeActiveTool(context),
        `Used ${getToolDefinition(context.activeTool.toolId).label}.`,
        context.toolDieSeed,
        rayPath,
        [],
        affectedPlayers,
        [],
        rayPath,
        presentation
      );
    }
  }

  return buildBlockedResolution(
    context.actor,
    context.tools,
    "No hookshot target",
    context.toolDieSeed,
    rayPath,
    [],
    rayPath
  );
}

// Dash buffs every remaining Movement tool so execution order stays meaningful.
export function resolveDashTool(context: ToolActionContext): ActionResolution {
  const dashBonus = getToolParam(context.activeTool, "dashBonus");
  const nextTools = consumeActiveTool(context).map((tool) =>
    tool.toolId === "movement"
      ? {
          ...tool,
          params: {
            ...tool.params,
            movePoints: getToolParam(tool, "movePoints") + dashBonus
          }
        }
      : tool
  );

  return buildAppliedResolution(
    context.actor,
    nextTools,
    `Used ${getToolDefinition(context.activeTool.toolId).label}.`,
    context.toolDieSeed,
    []
  );
}

// Brake is a tile-target move that stops early on the actual reachable tile.
export function resolveBrakeTool(context: ToolActionContext): ActionResolution {
  const maxRange = getToolParam(context.activeTool, "brakeRange");
  const axisTarget = normalizeAxisTarget(context.actor.position, context.targetPosition);

  if (!axisTarget) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Brake needs a target tile",
      context.toolDieSeed
    );
  }

  if (maxRange < 1) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "No brake range left",
      context.toolDieSeed
    );
  }

  const requestedDistance = Math.min(maxRange, axisTarget.distance);
  const traversal = resolveGroundTraversal({
    actorId: context.actor.id,
    board: context.board,
    direction: axisTarget.direction,
    movePoints: requestedDistance,
    maxSteps: requestedDistance,
    position: context.actor.position
  });

  if (!traversal.path.length) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      traversal.stopReason,
      context.toolDieSeed,
      [],
      [],
      [axisTarget.snappedTarget]
    );
  }

  const presentation = createPresentation(context.actor.id, context.activeTool.toolId, [
    createPlayerMotionEvent(
      `${context.activeTool.instanceId}:actor-brake`,
      context.actor.id,
      buildMotionPositions(context.actor.position, traversal.path),
      "ground"
    )
  ].flatMap((event) => (event ? [event] : [])));

  return buildAppliedResolution(
    {
      ...context.actor,
      position: traversal.position
    },
    consumeActiveTool(context),
    `Used ${getToolDefinition(context.activeTool.toolId).label}.`,
    context.toolDieSeed,
    traversal.path,
    traversal.tileMutations,
    [],
    traversal.triggeredTerrainEffects,
    traversal.path,
    presentation
  );
}

// Teleport moves directly onto any valid landing tile on the board.
export function resolveTeleportTool(context: ToolActionContext): ActionResolution {
  const targetPosition = context.targetPosition;

  if (!targetPosition) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Teleport needs a target tile",
      context.toolDieSeed
    );
  }

  if (!isLandablePosition(context.board, targetPosition)) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Teleport target is not landable",
      context.toolDieSeed,
      [],
      [],
      [targetPosition]
    );
  }

  return buildAppliedResolution(
    {
      ...context.actor,
      position: targetPosition
    },
    consumeActiveTool(context),
    `Used ${getToolDefinition(context.activeTool.toolId).label}.`,
    context.toolDieSeed,
    [targetPosition],
    [],
    [],
    [],
    [targetPosition]
  );
}
