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
  createPlayerMotionEvent,
  createPresentation,
  createProjectileEvent
} from "../rules/actionPresentation";
import {
  buildAppliedResolution,
  buildBlockedResolution,
  consumeActiveTool,
  requireDirection
} from "../rules/actionResolution";
import { createMovementDescriptor } from "../rules/displacement";
import { resolveLinearDisplacement } from "../rules/movementSystem";
import { traceProjectile } from "../rules/spatial";
import type { ToolModule } from "./types";
import {
  buildMovementSystemContext,
  createUsedSummary,
  getToolParamValue,
  toAffectedPlayerMove,
  toMovementSubject
} from "./helpers";

export const BASKETBALL_TOOL_DEFINITION: ToolContentDefinition = {
  label: "篮球",
  description: "向一个方向投出篮球，遇墙会反弹，命中玩家会推开并返还新的篮球。",
  disabledHint: "当前还不能使用这个篮球工具。",
  source: "turn",
  targetMode: "direction",
  conditions: [],
  defaultCharges: 1,
  defaultParams: {
    projectileRange: 999,
    projectileBounceCount: 1,
    projectilePushDistance: 1
  },
  color: "#d9824c",
  rollable: true,
  debugGrantable: true,
  endsTurnOnUse: false
};

function resolveBasketballTool(context: Parameters<ToolModule["execute"]>[0]): ActionResolution {
  const direction = requireDirection(context);
  const projectileRange = getToolParamValue(context.activeTool, "projectileRange", 999);
  const bounceCount = getToolParamValue(context.activeTool, "projectileBounceCount", 1);
  const pushDistance = getToolParamValue(context.activeTool, "projectilePushDistance", 1);
  const pushedMovement = createMovementDescriptor("translate", "passive", {
    tags: [`tool:${context.activeTool.toolId}`, "basketball:push"],
    timing: "out_of_turn"
  });

  if (!direction) {
    return buildBlockedResolution(context.actor, context.tools, "Basketball needs a direction", context.toolDieSeed);
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
        player: toMovementSubject(hitPlayer),
        priorSummonMutations: summonMutations,
        priorTileMutations: tileMutations,
        toolDieSeed: nextToolDieSeed,
        tools: nextTools
      });

      if (!pushResolution.path.length) {
        continue;
      }

      affectedPlayers.push(
        toAffectedPlayerMove(hitPlayer.id, hitPlayer.position, pushedMovement, pushResolution, "basketball")
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
    createUsedSummary(BASKETBALL_TOOL_DEFINITION.label),
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

export const BASKETBALL_TOOL_MODULE: ToolModule<"basketball"> = {
  id: "basketball",
  definition: BASKETBALL_TOOL_DEFINITION,
  dieFace: {
    params: {
      projectileRange: 999,
      projectileBounceCount: 1,
      projectilePushDistance: 1
    }
  },
  execute: resolveBasketballTool
};
