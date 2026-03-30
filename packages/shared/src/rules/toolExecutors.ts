import { getTile, isWithinBoard } from "../board";
import { createSummonUpsertMutation, hasSummonAtPosition } from "../summons";
import { getToolDefinition, getToolParam } from "../tools";
import type {
  ActionResolution,
  ToolActionContext,
  ToolId
} from "../types";
import {
  buildMotionPositions,
  createEffectEvent,
  createPlayerMotionEvent,
  createPresentation,
  createProjectileEvent,
  ROCKET_BLAST_DELAY_MS
} from "./actionPresentation";
import {
  buildAppliedResolution,
  buildBlockedResolution,
  buildSummonInstanceId,
  consumeActiveTool,
  requireDirection
} from "./actionResolution";
import {
  findPlayersAtPosition,
  getOppositeDirection,
  isLandablePosition,
  isSolidTileType,
  normalizeAxisTarget,
  positionsEqual,
  resolvePushTarget,
  resolveGroundTraversal,
  resolveLeapLanding,
  stepPosition,
  traceProjectile,
  CARDINAL_DIRECTIONS,
  collectExplosionPreviewTiles
} from "./spatial";
import { createTileMutation } from "./spatial";

type ToolExecutor = (context: ToolActionContext) => ActionResolution;

// Movement spends the tool's stored move points on the grounded traversal pipeline.
function resolveMovementTool(context: ToolActionContext): ActionResolution {
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
function resolveJumpTool(context: ToolActionContext): ActionResolution {
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
function resolveHookshotTool(context: ToolActionContext): ActionResolution {
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

  const rayPath: import("../types").GridPosition[] = [];

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
        const pullPath: import("../types").GridPosition[] = [];

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
      const affectedPlayers = affectedPlayerResults.map(({ playerId, target, reason }) => ({
        playerId,
        target,
        reason
      }));

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
function resolveDashTool(context: ToolActionContext): ActionResolution {
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
function resolveBrakeTool(context: ToolActionContext): ActionResolution {
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

// Wall building turns a nearby floor tile into a new earth wall.
function resolveBuildWallTool(context: ToolActionContext): ActionResolution {
  const targetPosition = context.targetPosition;
  const wallDurability = getToolParam(context.activeTool, "wallDurability");

  if (!targetPosition) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Build Wall needs a target tile",
      context.toolDieSeed
    );
  }

  const deltaX = Math.abs(targetPosition.x - context.actor.position.x);
  const deltaY = Math.abs(targetPosition.y - context.actor.position.y);

  if ((deltaX === 0 && deltaY === 0) || deltaX > 1 || deltaY > 1) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Build Wall must target one of the surrounding tiles",
      context.toolDieSeed,
      [],
      [],
      [targetPosition]
    );
  }

  const tile = getTile(context.board, targetPosition);

  if (!tile || tile.type !== "floor") {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Build Wall needs an empty floor tile",
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
    [createTileMutation(targetPosition, "earthWall", wallDurability)],
    [],
    [],
    [targetPosition]
  );
}

// Wallet deployment is implemented as a role-owned tool so it reuses the normal aim pipeline.
function resolveDeployWalletTool(context: ToolActionContext): ActionResolution {
  const targetPosition = context.targetPosition;
  const targetRange = getToolParam(context.activeTool, "targetRange");

  if (!targetPosition) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Deploy Wallet needs a target tile",
      context.toolDieSeed
    );
  }

  if (
    Math.abs(targetPosition.x - context.actor.position.x) > targetRange ||
    Math.abs(targetPosition.y - context.actor.position.y) > targetRange
  ) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Target tile is outside the deployment range",
      context.toolDieSeed,
      [],
      [],
      [targetPosition]
    );
  }

  if (!isLandablePosition(context.board, targetPosition)) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Deploy Wallet needs a landable tile",
      context.toolDieSeed,
      [],
      [],
      [targetPosition]
    );
  }

  if (hasSummonAtPosition(context.summons, targetPosition)) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Target tile already contains a summon",
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
    [],
    [],
    [],
    [targetPosition],
    null,
    [
      createSummonUpsertMutation(
        buildSummonInstanceId(context.activeTool, "wallet"),
        "wallet",
        context.actor.id,
        targetPosition
      )
    ],
    [],
    true
  );
}

// Basketball uses a bouncing projectile and can reward extra charges after a player hit.
function resolveBasketballTool(context: ToolActionContext): ActionResolution {
  const direction = requireDirection(context);
  const projectileRange = getToolParam(context.activeTool, "projectileRange");
  const bounceCount = getToolParam(context.activeTool, "projectileBounceCount");
  const pushDistance = getToolParam(context.activeTool, "projectilePushDistance");
  const affectedPlayers: import("../types").AffectedPlayerMove[] = [];
  const tileMutations: import("../types").TileMutation[] = [];
  const triggeredTerrainEffects: import("../types").TriggeredTerrainEffect[] = [];

  if (!direction) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Basketball needs a direction",
      context.toolDieSeed
    );
  }

  const trace = traceProjectile(context, direction, projectileRange, bounceCount);
  const projectileEvent = createProjectileEvent(
    `${context.activeTool.instanceId}:projectile`,
    context.actor.id,
    "basketball",
    buildMotionPositions(context.actor.position, trace.path)
  );
  const impactStartMs = projectileEvent ? projectileEvent.startMs + projectileEvent.durationMs : 0;
  const motionEvents: import("../types").ActionPresentationEvent[] = projectileEvent ? [projectileEvent] : [];

  if (trace.collision.kind === "player") {
    for (const [index, hitPlayer] of trace.collision.players.entries()) {
      const traversal = resolvePushTarget(
        context,
        hitPlayer,
        trace.collision.direction,
        pushDistance,
        tileMutations
      );

      if (!traversal.path.length) {
        continue;
      }

      affectedPlayers.push({
        playerId: hitPlayer.id,
        target: traversal.position,
        reason: "basketball"
      });
      tileMutations.push(...traversal.tileMutations);
      triggeredTerrainEffects.push(...traversal.triggeredTerrainEffects);
      const motionEvent = createPlayerMotionEvent(
        `${context.activeTool.instanceId}:basketball-hit-${index}`,
        hitPlayer.id,
        buildMotionPositions(hitPlayer.position, traversal.path),
        "ground",
        impactStartMs
      );

      if (motionEvent) {
        motionEvents.push(motionEvent);
      }
    }
  }

  const presentation = createPresentation(context.actor.id, context.activeTool.toolId, motionEvents);

  return buildAppliedResolution(
    context.actor,
    consumeActiveTool(context),
    `Used ${getToolDefinition(context.activeTool.toolId).label}.`,
    context.toolDieSeed,
    trace.path,
    tileMutations,
    affectedPlayers,
    triggeredTerrainEffects,
    [],
    presentation
  );
}

// Rocket resolves a line trace, then applies an explosion-centered knockback pattern.
function resolveRocketTool(context: ToolActionContext): ActionResolution {
  const direction = requireDirection(context);
  const projectileRange = getToolParam(context.activeTool, "projectileRange");
  const blastLeapDistance = getToolParam(context.activeTool, "rocketBlastLeapDistance");
  const splashPushDistance = getToolParam(context.activeTool, "rocketSplashPushDistance");

  if (!direction) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Rocket needs a direction",
      context.toolDieSeed
    );
  }

  const trace = traceProjectile(context, direction, projectileRange, 0);

  const explosionPosition =
    trace.collision.kind === "player"
      ? trace.collision.position
      : trace.collision.kind === "solid"
        ? trace.collision.previousPosition
        : trace.path[trace.path.length - 1] ?? null;
  const centerLeapDirection =
    trace.collision.kind === "player"
      ? trace.collision.direction
      : getOppositeDirection(trace.collision.direction);

  if (!explosionPosition) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "No rocket flight path",
      context.toolDieSeed
    );
  }

  const projectileEvent = createProjectileEvent(
    `${context.activeTool.instanceId}:projectile`,
    context.actor.id,
    "rocket",
    buildMotionPositions(context.actor.position, trace.path)
  );
  const explosionStartMs = projectileEvent ? projectileEvent.startMs + projectileEvent.durationMs : 0;
  const affectedPlayers: import("../types").AffectedPlayerMove[] = [];
  const tileMutations: import("../types").TileMutation[] = [];
  const triggeredTerrainEffects: import("../types").TriggeredTerrainEffect[] = [];
  const motionEvents: import("../types").ActionPresentationEvent[] = projectileEvent ? [projectileEvent] : [];
  const centerPlayers =
    trace.collision.kind === "player"
      ? trace.collision.players
      : findPlayersAtPosition(context.players, explosionPosition, []);

  centerPlayers.forEach((hitPlayer, index) => {
    const leap = resolveLeapLanding(
      context.board,
      hitPlayer.position,
      centerLeapDirection,
      blastLeapDistance,
      tileMutations
    );

    if (!leap.landing) {
      return;
    }

    affectedPlayers.push({
      playerId: hitPlayer.id,
      target: leap.landing,
      reason: "rocket_blast"
    });
    const motionEvent = createPlayerMotionEvent(
      `${context.activeTool.instanceId}:blast-${index}`,
      hitPlayer.id,
      buildMotionPositions(hitPlayer.position, leap.path),
      "arc",
      explosionStartMs + ROCKET_BLAST_DELAY_MS
    );

    if (motionEvent) {
      motionEvents.push(motionEvent);
    }
  });

  for (const splashDirection of CARDINAL_DIRECTIONS) {
    const splashPosition = stepPosition(explosionPosition, splashDirection);
    const splashPlayers = findPlayersAtPosition(
      context.players,
      splashPosition,
      centerPlayers.map((player) => player.id)
    );

    for (const splashPlayer of splashPlayers) {
      const traversal = resolvePushTarget(
        context,
        splashPlayer,
        splashDirection,
        splashPushDistance,
        tileMutations
      );

      if (!traversal.path.length) {
        continue;
      }

      affectedPlayers.push({
        playerId: splashPlayer.id,
        target: traversal.position,
        reason: "rocket_splash"
      });
      tileMutations.push(...traversal.tileMutations);
      triggeredTerrainEffects.push(...traversal.triggeredTerrainEffects);
      const motionEvent = createPlayerMotionEvent(
        `${context.activeTool.instanceId}:splash-${splashPlayer.id}-${splashDirection}`,
        splashPlayer.id,
        buildMotionPositions(splashPlayer.position, traversal.path),
        "ground",
        explosionStartMs + ROCKET_BLAST_DELAY_MS
      );

      if (motionEvent) {
        motionEvents.push(motionEvent);
      }
    }
  }

  motionEvents.push(
    createEffectEvent(
      `${context.activeTool.instanceId}:explosion`,
      "rocket_explosion",
      explosionPosition,
      collectExplosionPreviewTiles(context.board, explosionPosition),
      explosionStartMs
    )
  );
  const previewTiles = collectExplosionPreviewTiles(context.board, explosionPosition);
  const presentation = createPresentation(context.actor.id, context.activeTool.toolId, motionEvents);

  return buildAppliedResolution(
    context.actor,
    consumeActiveTool(context),
    `Used ${getToolDefinition(context.activeTool.toolId).label}.`,
    context.toolDieSeed,
    trace.path,
    tileMutations,
    affectedPlayers,
    triggeredTerrainEffects,
    previewTiles,
    presentation
  );
}

// Teleport moves directly onto any valid landing tile on the board.
function resolveTeleportTool(context: ToolActionContext): ActionResolution {
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

export const TOOL_EXECUTORS: Record<ToolId, ToolExecutor> = {
  movement: resolveMovementTool,
  jump: resolveJumpTool,
  hookshot: resolveHookshotTool,
  dash: resolveDashTool,
  brake: resolveBrakeTool,
  buildWall: resolveBuildWallTool,
  deployWallet: resolveDeployWalletTool,
  basketball: resolveBasketballTool,
  rocket: resolveRocketTool,
  teleport: resolveTeleportTool
};
