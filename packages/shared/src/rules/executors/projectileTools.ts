import { getToolDefinition, getToolParam } from "../../tools";
import type {
  ActionPresentationEvent,
  ActionResolution,
  AffectedPlayerMove,
  TileMutation,
  ToolActionContext,
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
import {
  buildAppliedResolution,
  buildBlockedResolution,
  consumeActiveTool,
  requireDirection
} from "../actionResolution";
import {
  CARDINAL_DIRECTIONS,
  collectExplosionPreviewTiles,
  findPlayersAtPosition,
  getOppositeDirection,
  resolveLeapLanding,
  resolvePushTarget,
  stepPosition,
  traceProjectile
} from "../spatial";

// Basketball uses a bouncing projectile and can reward extra charges after a player hit.
export function resolveBasketballTool(context: ToolActionContext): ActionResolution {
  const direction = requireDirection(context);
  const projectileRange = getToolParam(context.activeTool, "projectileRange");
  const bounceCount = getToolParam(context.activeTool, "projectileBounceCount");
  const pushDistance = getToolParam(context.activeTool, "projectilePushDistance");
  const affectedPlayers: AffectedPlayerMove[] = [];
  const tileMutations: TileMutation[] = [];
  const triggeredTerrainEffects: TriggeredTerrainEffect[] = [];

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
export function resolveRocketTool(context: ToolActionContext): ActionResolution {
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
  const affectedPlayers: AffectedPlayerMove[] = [];
  const tileMutations: TileMutation[] = [];
  const triggeredTerrainEffects: TriggeredTerrainEffect[] = [];
  const motionEvents: ActionPresentationEvent[] = projectileEvent ? [projectileEvent] : [];
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
