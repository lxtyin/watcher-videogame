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
import { createDragDirectionInteraction } from "../toolInteraction";
import {
  buildMotionPositions,
  createPlayerMotionEvent,
  offsetPresentationEvents,
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
import { collectDirectionSelectionTiles } from "../rules/previewDescriptor";
import { traceProjectile } from "../rules/spatial";
import type { ToolModule } from "./types";
import {
  buildMovementSystemContext,
  createToolPreview,
  createUsedSummary,
  getToolParamValue,
  toAffectedPlayerMove,
  toMovementSubject
} from "./helpers";

export const BASKETBALL_TOOL_DEFINITION: ToolContentDefinition = {
  label: "篮球",
  description: "朝一个方向投出篮球，命中的玩家会被击退。",
  disabledHint: "当前不能使用篮球。",
  source: "turn",
  interaction: createDragDirectionInteraction(),
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
  // const selectionTiles = collectDirectionSelectionTiles(context.board, context.actor.position);

  if (!direction) {
    return buildBlockedResolution({
      actor: context.actor,
      nextToolDieSeed: context.toolDieSeed,
      preview: createToolPreview(context, { valid: false }),
      reason: "Basketball needs a direction",
      tools: context.tools
    });
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

      affectedPlayers.push(...pushResolution.affectedPlayers);
      motionEvents.push(
        ...offsetPresentationEvents(
          pushResolution.presentationEvents,
          (motionEvent?.startMs ?? impactStartMs) + (motionEvent?.durationMs ?? 0)
        )
      );

      if (motionEvent) {
        motionEvents.push(motionEvent);
      }
    }
  }

  return buildAppliedResolution({
    actor: context.actor,
    affectedPlayers,
    nextToolDieSeed,
    path: trace.path,
    presentation: createPresentation(context.actor.id, context.activeTool.toolId, motionEvents),
    preview: createToolPreview(context, {
      // actorPath: trace.path,
      affectedPlayers,
      effectTiles: trace.path,
      // selectionTiles,
      valid: true
    }),
    summonMutations,
    summary: createUsedSummary(BASKETBALL_TOOL_DEFINITION.label),
    tileMutations,
    tools: nextTools,
    triggeredSummonEffects,
    triggeredTerrainEffects
  });
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
