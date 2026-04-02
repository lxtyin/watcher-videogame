import { getToolDefinition, getToolParam } from "../../tools";
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
  createEffectEvent,
  createPlayerMotionEvent,
  createPresentation,
  createProjectileEvent,
  ROCKET_BLAST_DELAY_MS
} from "../actionPresentation";
import { createMovementDescriptor } from "../displacement";
import {
  buildAppliedResolution,
  buildBlockedResolution,
  consumeActiveTool,
  requireDirection
} from "../actionResolution";
import {
  resolveLeapDisplacement,
  resolveLinearDisplacement
} from "../movementSystem";
import {
  CARDINAL_DIRECTIONS,
  collectExplosionPreviewTiles,
  findPlayersAtPosition,
  getOppositeDirection,
  stepPosition,
  traceProjectile
} from "../spatial";

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

function toSubject(player: ToolActionContext["actor"] | ToolActionContext["players"][number]) {
  return {
    characterId: player.characterId,
    characterState: player.characterState,
    id: player.id,
    position: player.position,
    spawnPosition: player.spawnPosition,
    turnFlags: player.turnFlags
  };
}

function toAffectedPlayerMove(
  playerId: string,
  startPosition: ToolActionContext["actor"]["position"],
  movement: MovementDescriptor,
  resolution: ReturnType<typeof resolveLinearDisplacement> | ReturnType<typeof resolveLeapDisplacement>,
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

// Basketball uses a bouncing projectile and resolves each hit push through the shared translation system.
export function resolveBasketballTool(context: ToolActionContext): ActionResolution {
  const direction = requireDirection(context);
  const projectileRange = getToolParam(context.activeTool, "projectileRange");
  const bounceCount = getToolParam(context.activeTool, "projectileBounceCount");
  const pushDistance = getToolParam(context.activeTool, "projectilePushDistance");
  const pushedMovement = createMovementDescriptor("translate", "passive", {
    tags: [`tool:${context.activeTool.toolId}`, "basketball:push"],
    timing: "out_of_turn"
  });

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
  const motionEvents: ActionPresentationEvent[] = projectileEvent ? [projectileEvent] : [];
  const affectedPlayers: AffectedPlayerMove[] = [];
  const tileMutations: TileMutation[] = [];
  const summonMutations: SummonMutation[] = [];
  const triggeredTerrainEffects: TriggeredTerrainEffect[] = [];
  const triggeredSummonEffects: TriggeredSummonEffect[] = [];
  let nextTools = consumeActiveTool(context);
  let nextToolDieSeed = context.toolDieSeed;

  if (trace.collision.kind === "player") {
    for (const [index, hitPlayer] of trace.collision.players.entries()) {
      const pushResolution = resolveLinearDisplacement(buildMovementSystemContext(context), {
        direction: trace.collision.direction,
        maxSteps: pushDistance,
        movePoints: pushDistance,
        movement: pushedMovement,
        player: toSubject(hitPlayer),
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
          hitPlayer.id,
          hitPlayer.position,
          pushedMovement,
          pushResolution,
          "basketball"
        )
      );
      nextTools = pushResolution.tools;
      nextToolDieSeed = pushResolution.nextToolDieSeed;
      tileMutations.push(...pushResolution.tileMutations);
      summonMutations.push(...pushResolution.summonMutations);
      triggeredTerrainEffects.push(...pushResolution.triggeredTerrainEffects);
      triggeredSummonEffects.push(...pushResolution.triggeredSummonEffects);

      const motionEvent = createPlayerMotionEvent(
        `${context.activeTool.instanceId}:basketball-hit-${index}`,
        hitPlayer.id,
        buildMotionPositions(hitPlayer.position, pushResolution.path),
        "ground",
        impactStartMs
      );

      if (motionEvent) {
        motionEvents.push(motionEvent);
      }
    }
  }

  return buildAppliedResolution(
    context.actor,
    nextTools,
    `Used ${getToolDefinition(context.activeTool.toolId).label}.`,
    nextToolDieSeed,
    trace.path,
    tileMutations,
    affectedPlayers,
    triggeredTerrainEffects,
    [],
    createPresentation(context.actor.id, context.activeTool.toolId, motionEvents),
    summonMutations,
    triggeredSummonEffects
  );
}

// Rocket resolves a line trace, then applies leap and push displacement through the shared movement system.
export function resolveRocketTool(context: ToolActionContext): ActionResolution {
  const direction = requireDirection(context);
  const projectileRange = getToolParam(context.activeTool, "projectileRange");
  const blastLeapDistance = getToolParam(context.activeTool, "rocketBlastLeapDistance");
  const splashPushDistance = getToolParam(context.activeTool, "rocketSplashPushDistance");
  const blastMovement = createMovementDescriptor("leap", "passive", {
    tags: [`tool:${context.activeTool.toolId}`, "rocket:blast"],
    timing: "out_of_turn"
  });
  const splashMovement = createMovementDescriptor("translate", "passive", {
    tags: [`tool:${context.activeTool.toolId}`, "rocket:splash"],
    timing: "out_of_turn"
  });

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
  const motionEvents: ActionPresentationEvent[] = projectileEvent ? [projectileEvent] : [];
  const affectedPlayers: AffectedPlayerMove[] = [];
  const tileMutations: TileMutation[] = [];
  const summonMutations: SummonMutation[] = [];
  const triggeredTerrainEffects: TriggeredTerrainEffect[] = [];
  const triggeredSummonEffects: TriggeredSummonEffect[] = [];
  let nextTools = consumeActiveTool(context);
  let nextToolDieSeed = context.toolDieSeed;
  const centerPlayers =
    trace.collision.kind === "player"
      ? trace.collision.players
      : findPlayersAtPosition(context.players, explosionPosition, []);

  centerPlayers.forEach((hitPlayer, index) => {
    const leapResolution = resolveLeapDisplacement(buildMovementSystemContext(context), {
      direction: centerLeapDirection,
      maxDistance: blastLeapDistance,
      movement: blastMovement,
      player: toSubject(hitPlayer),
      priorSummonMutations: summonMutations,
      priorTileMutations: tileMutations,
      toolDieSeed: nextToolDieSeed,
      tools: nextTools
    });

    if (!leapResolution.path.length) {
      return;
    }

    affectedPlayers.push(
      toAffectedPlayerMove(
        hitPlayer.id,
        hitPlayer.position,
        blastMovement,
        leapResolution,
        "rocket_blast"
      )
    );
    nextTools = leapResolution.tools;
    nextToolDieSeed = leapResolution.nextToolDieSeed;
    tileMutations.push(...leapResolution.tileMutations);
    summonMutations.push(...leapResolution.summonMutations);
    triggeredTerrainEffects.push(...leapResolution.triggeredTerrainEffects);
    triggeredSummonEffects.push(...leapResolution.triggeredSummonEffects);

    const motionEvent = createPlayerMotionEvent(
      `${context.activeTool.instanceId}:blast-${index}`,
      hitPlayer.id,
      buildMotionPositions(hitPlayer.position, leapResolution.path),
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
      const pushResolution = resolveLinearDisplacement(buildMovementSystemContext(context), {
        direction: splashDirection,
        maxSteps: splashPushDistance,
        movePoints: splashPushDistance,
        movement: splashMovement,
        player: toSubject(splashPlayer),
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
          splashPlayer.id,
          splashPlayer.position,
          splashMovement,
          pushResolution,
          "rocket_splash"
        )
      );
      nextTools = pushResolution.tools;
      nextToolDieSeed = pushResolution.nextToolDieSeed;
      tileMutations.push(...pushResolution.tileMutations);
      summonMutations.push(...pushResolution.summonMutations);
      triggeredTerrainEffects.push(...pushResolution.triggeredTerrainEffects);
      triggeredSummonEffects.push(...pushResolution.triggeredSummonEffects);

      const motionEvent = createPlayerMotionEvent(
        `${context.activeTool.instanceId}:splash-${splashPlayer.id}-${splashDirection}`,
        splashPlayer.id,
        buildMotionPositions(splashPlayer.position, pushResolution.path),
        "ground",
        explosionStartMs + ROCKET_BLAST_DELAY_MS
      );

      if (motionEvent) {
        motionEvents.push(motionEvent);
      }
    }
  }

  const previewTiles = collectExplosionPreviewTiles(context.board, explosionPosition);
  motionEvents.push(
    createEffectEvent(
      `${context.activeTool.instanceId}:explosion`,
      "rocket_explosion",
      explosionPosition,
      previewTiles,
      explosionStartMs
    )
  );

  return buildAppliedResolution(
    context.actor,
    nextTools,
    `Used ${getToolDefinition(context.activeTool.toolId).label}.`,
    nextToolDieSeed,
    trace.path,
    tileMutations,
    affectedPlayers,
    triggeredTerrainEffects,
    previewTiles,
    createPresentation(context.actor.id, context.activeTool.toolId, motionEvents),
    summonMutations,
    triggeredSummonEffects
  );
}
