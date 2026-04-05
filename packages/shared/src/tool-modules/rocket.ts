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
import {
  buildMotionPositions,
  createEffectEvent,
  createPlayerMotionEvent,
  createPresentation,
  createProjectileEvent,
  ROCKET_BLAST_DELAY_MS
} from "../rules/actionPresentation";
import {
  buildAppliedResolution,
  buildBlockedResolution,
  consumeActiveTool,
  requireDirection
} from "../rules/actionResolution";
import { createMovementDescriptor } from "../rules/displacement";
import { resolveLeapDisplacement, resolveLinearDisplacement } from "../rules/movementSystem";
import {
  CARDINAL_DIRECTIONS,
  collectExplosionPreviewTiles,
  findPlayersAtPosition,
  getOppositeDirection,
  stepPosition,
  traceProjectile
} from "../rules/spatial";
import type { ToolModule } from "./types";
import {
  buildMovementSystemContext,
  createUsedSummary,
  getToolParamValue,
  toAffectedPlayerMove,
  toMovementSubject
} from "./helpers";

export const ROCKET_TOOL_DEFINITION: ToolContentDefinition = {
  label: "火箭",
  description: "向一个方向发射火箭，在碰撞点爆炸并击飞周围目标。",
  disabledHint: "当前还不能使用这个火箭工具。",
  source: "turn",
  targetMode: "direction",
  conditions: [],
  defaultCharges: 1,
  defaultParams: {
    projectileRange: 999,
    rocketBlastLeapDistance: 3,
    rocketSplashPushDistance: 1
  },
  color: "#dc5f56",
  rollable: true,
  debugGrantable: true,
  endsTurnOnUse: false
};

function resolveRocketTool(context: Parameters<ToolModule["execute"]>[0]): ActionResolution {
  const direction = requireDirection(context);
  const projectileRange = getToolParamValue(context.activeTool, "projectileRange", 999);
  const blastLeapDistance = getToolParamValue(context.activeTool, "rocketBlastLeapDistance", 3);
  const splashPushDistance = getToolParamValue(context.activeTool, "rocketSplashPushDistance", 1);
  const blastMovement = createMovementDescriptor("leap", "passive", {
    tags: [`tool:${context.activeTool.toolId}`, "rocket:blast"],
    timing: "out_of_turn"
  });
  const splashMovement = createMovementDescriptor("translate", "passive", {
    tags: [`tool:${context.activeTool.toolId}`, "rocket:splash"],
    timing: "out_of_turn"
  });

  if (!direction) {
    return buildBlockedResolution(context.actor, context.tools, "Rocket needs a direction", context.toolDieSeed);
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
    return buildBlockedResolution(context.actor, context.tools, "No rocket flight path", context.toolDieSeed);
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
      player: toMovementSubject(hitPlayer),
      priorSummonMutations: summonMutations,
      priorTileMutations: tileMutations,
      toolDieSeed: nextToolDieSeed,
      tools: nextTools
    });

    if (!leapResolution.path.length) {
      return;
    }

    affectedPlayers.push(
      toAffectedPlayerMove(hitPlayer.id, hitPlayer.position, blastMovement, leapResolution, "rocket_blast")
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
        player: toMovementSubject(splashPlayer),
        priorSummonMutations: summonMutations,
        priorTileMutations: tileMutations,
        toolDieSeed: nextToolDieSeed,
        tools: nextTools
      });

      if (!pushResolution.path.length) {
        continue;
      }

      affectedPlayers.push(
        toAffectedPlayerMove(splashPlayer.id, splashPlayer.position, splashMovement, pushResolution, "rocket_splash")
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
    createUsedSummary(ROCKET_TOOL_DEFINITION.label),
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

export const ROCKET_TOOL_MODULE: ToolModule<"rocket"> = {
  id: "rocket",
  definition: ROCKET_TOOL_DEFINITION,
  dieFace: {
    params: {
      projectileRange: 999,
      rocketBlastLeapDistance: 3,
      rocketSplashPushDistance: 1
    }
  },
  execute: resolveRocketTool
};
