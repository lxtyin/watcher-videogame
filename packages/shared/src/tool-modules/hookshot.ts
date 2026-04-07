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
  createLinkReactionEvent,
  createPlayerMotionEvent,
  createPresentation,
  getProjectileTravelDurationMs,
  HOOKSHOT_PULL_DELAY_MS
} from "../rules/actionPresentation";
import {
  buildAppliedResolution,
  buildBlockedResolution,
  consumeActiveTool,
  requireDirection
} from "../rules/actionResolution";
import { createResolvedPlayerMovement } from "../rules/displacement";
import { resolveLinearDisplacement } from "../rules/movementSystem";
import { collectDirectionSelectionTiles } from "../rules/previewDescriptor";
import {
  findPlayersAtPosition,
  getOppositeDirection,
  isSolidTileType,
  stepPosition
} from "../rules/spatial";
import type { ToolModule } from "./types";
import {
  buildMovementSystemContext,
  createPassiveToolMovementDescriptor,
  createToolMovementDescriptor,
  createToolPreview,
  createUsedSummary,
  getToolParamValue,
  getTile,
  isWithinBoard,
  toAffectedPlayerMove,
  toMovementSubject
} from "./helpers";

export const HOOKSHOT_TOOL_DEFINITION: ToolContentDefinition = {
  actorMovement: {
    type: "drag",
    disposition: "active"
  },
  label: "钩锁",
  description: "沿选择方向发射钩锁。命中墙体时把自己拉过去，命中玩家时把对方拖回。",
  disabledHint: "当前不能使用钩锁。",
  source: "turn",
  interaction: createDragDirectionInteraction(),
  conditions: [],
  defaultCharges: 1,
  defaultParams: {
    hookLength: 3
  },
  color: "#6ca7d9",
  rollable: true,
  debugGrantable: true,
  endsTurnOnUse: false
};

const HOOKSHOT_FLIGHT_SPEED = 1.8;

function resolveHookshotTool(context: Parameters<ToolModule["execute"]>[0]): ActionResolution {
  const direction = requireDirection(context);
  const hookLength = getToolParamValue(context.activeTool, "hookLength", 3);
  const actorMovement = createToolMovementDescriptor(context, HOOKSHOT_TOOL_DEFINITION, "drag", ["hookshot:self"]);
  const pulledMovement = createPassiveToolMovementDescriptor(context.activeTool.toolId, "drag", ["hookshot:pull"]);
  const selectionTiles = collectDirectionSelectionTiles(context.board, context.actor.position);

  if (!direction) {
    return buildBlockedResolution({
      actor: context.actor,
      nextToolDieSeed: context.toolDieSeed,
      preview: createToolPreview(context, {
        selectionTiles,
        valid: false
      }),
      reason: "Hookshot needs a direction",
      tools: context.tools
    });
  }

  const rayPath: typeof context.actor.position[] = [];

  for (let distance = 1; distance <= hookLength; distance += 1) {
    const target = stepPosition(context.actor.position, direction, distance);

    if (!isWithinBoard(context.board, target)) {
      break;
    }

    const tile = getTile(context.board, target);

    if (tile && isSolidTileType(tile.type)) {
      const pullDistance = distance - 1;

      if (pullDistance < 1) {
        return buildBlockedResolution({
          actor: context.actor,
          nextToolDieSeed: context.toolDieSeed,
          path: rayPath,
          preview: createToolPreview(context, {
            actorPath: rayPath,
            effectTiles: rayPath,
            selectionTiles,
            valid: false
          }),
          reason: "No hookshot landing space",
          tools: context.tools
        });
      }

      const actorResolution = resolveLinearDisplacement(buildMovementSystemContext(context), {
        direction,
        maxSteps: pullDistance,
        movePoints: pullDistance,
        movement: actorMovement,
        player: toMovementSubject(context.actor),
        toolDieSeed: context.toolDieSeed,
        tools: consumeActiveTool(context)
      });

      if (!actorResolution.path.length) {
        return buildBlockedResolution({
          actor: context.actor,
          nextToolDieSeed: context.toolDieSeed,
          path: rayPath,
          preview: createToolPreview(context, {
            actorPath: rayPath,
            effectTiles: rayPath,
            selectionTiles,
            valid: false
          }),
          reason: actorResolution.stopReason,
          tools: context.tools
        });
      }

      const outboundDurationMs = getProjectileTravelDurationMs(rayPath.length + 1, HOOKSHOT_FLIGHT_SPEED);
      const motionEvents: ActionPresentationEvent[] = [
        createLinkReactionEvent(
          `${context.activeTool.instanceId}:hookshot-outbound`,
          {
            kind: "player",
            playerId: context.actor.id
          },
          {
            kind: "position",
            position: target
          },
          "chain",
          0,
          outboundDurationMs,
          "extend_from_from"
        )
      ];
      const pullStartMs = outboundDurationMs + HOOKSHOT_PULL_DELAY_MS;
      const actorMotionEvent = createPlayerMotionEvent(
        `${context.activeTool.instanceId}:actor-hook`,
        context.actor.id,
        [context.actor.position, ...actorResolution.path],
        "ground",
        pullStartMs
      );

      if (actorMotionEvent) {
        motionEvents.push(
          createLinkReactionEvent(
            `${context.activeTool.instanceId}:hookshot-link-wall`,
            {
              kind: "player",
              playerId: context.actor.id
            },
            {
              kind: "position",
              position: target
            },
            "chain",
            pullStartMs,
            actorMotionEvent.durationMs
          )
        );
        motionEvents.push(actorMotionEvent);
      }

      return buildAppliedResolution({
        actor: {
          ...context.actor,
          position: actorResolution.actor.position,
          tags: actorResolution.actor.tags,
          turnFlags: actorResolution.actor.turnFlags
        },
        actorMovement: createResolvedPlayerMovement(
          context.actor.id,
          context.actor.position,
          actorResolution.path,
          actorMovement
        ),
        nextToolDieSeed: actorResolution.nextToolDieSeed,
        path: actorResolution.path,
        presentation: createPresentation(context.actor.id, context.activeTool.toolId, motionEvents),
        preview: createToolPreview(context, {
          actorPath: actorResolution.path,
          actorTarget: actorResolution.actor.position,
          effectTiles: rayPath,
          selectionTiles,
          valid: true
        }),
        summonMutations: actorResolution.summonMutations,
        summary: createUsedSummary(HOOKSHOT_TOOL_DEFINITION.label),
        tileMutations: actorResolution.tileMutations,
        tools: actorResolution.tools,
        triggeredSummonEffects: actorResolution.triggeredSummonEffects,
        triggeredTerrainEffects: actorResolution.triggeredTerrainEffects
      });
    }

    rayPath.push(target);
    const hitPlayers = findPlayersAtPosition(context.players, target, [context.actor.id]);

    if (!hitPlayers.length) {
      continue;
    }

    let nextTools = consumeActiveTool(context);
    let nextToolDieSeed = context.toolDieSeed;
    const tileMutations: TileMutation[] = [];
    const summonMutations: SummonMutation[] = [];
    const triggeredTerrainEffects: TriggeredTerrainEffect[] = [];
    const triggeredSummonEffects: TriggeredSummonEffect[] = [];
    const affectedPlayers: AffectedPlayerMove[] = [];
    const outboundTarget = rayPath[rayPath.length - 1] ?? target;
    const outboundDurationMs = getProjectileTravelDurationMs(rayPath.length, HOOKSHOT_FLIGHT_SPEED);
    const motionEvents: ActionPresentationEvent[] = [
      createLinkReactionEvent(
        `${context.activeTool.instanceId}:hookshot-outbound`,
        {
          kind: "player",
          playerId: context.actor.id
        },
        {
          kind: "position",
          position: outboundTarget
        },
        "chain",
        0,
        outboundDurationMs,
        "extend_from_from"
      )
    ];
    const pullStartMs = outboundDurationMs + HOOKSHOT_PULL_DELAY_MS;

    for (const [index, hitPlayer] of hitPlayers.entries()) {
      const pullDistance = Math.max(0, distance - 1);

      if (pullDistance < 1) {
        continue;
      }

      const pullResolution = resolveLinearDisplacement(buildMovementSystemContext(context), {
        direction: getOppositeDirection(direction),
        maxSteps: pullDistance,
        movePoints: pullDistance,
        movement: pulledMovement,
        player: toMovementSubject(hitPlayer),
        priorSummonMutations: summonMutations,
        priorTileMutations: tileMutations,
        toolDieSeed: nextToolDieSeed,
        tools: nextTools
      });

      if (!pullResolution.path.length) {
        continue;
      }

      affectedPlayers.push(
        toAffectedPlayerMove(hitPlayer.id, hitPlayer.position, pulledMovement, pullResolution, "hookshot")
      );
      nextTools = pullResolution.tools;
      nextToolDieSeed = pullResolution.nextToolDieSeed;
      tileMutations.push(...pullResolution.tileMutations);
      summonMutations.push(...pullResolution.summonMutations);
      triggeredTerrainEffects.push(...pullResolution.triggeredTerrainEffects);
      triggeredSummonEffects.push(...pullResolution.triggeredSummonEffects);

      const motionEvent = createPlayerMotionEvent(
        `${context.activeTool.instanceId}:hooked-${index}`,
        hitPlayer.id,
        [hitPlayer.position, ...pullResolution.path],
        "ground",
        pullStartMs
      );

      if (motionEvent) {
        motionEvents.push(
          createLinkReactionEvent(
            `${context.activeTool.instanceId}:hookshot-link-player-${index}`,
            {
              kind: "player",
              playerId: context.actor.id
            },
            {
              kind: "player",
              playerId: hitPlayer.id
            },
            "chain",
            pullStartMs,
            motionEvent.durationMs
          )
        );
        motionEvents.push(motionEvent);
      }
    }

    if (!affectedPlayers.length) {
      return buildBlockedResolution({
        actor: context.actor,
        nextToolDieSeed: context.toolDieSeed,
        path: rayPath,
        preview: createToolPreview(context, {
          actorPath: rayPath,
          effectTiles: rayPath,
          selectionTiles,
          valid: false
        }),
        reason: "Target cannot be pulled",
        tools: context.tools
      });
    }

    return buildAppliedResolution({
      actor: context.actor,
      affectedPlayers,
      nextToolDieSeed,
      path: rayPath,
      presentation: createPresentation(context.actor.id, context.activeTool.toolId, motionEvents),
      preview: createToolPreview(context, {
        affectedPlayers,
        effectTiles: rayPath,
        selectionTiles,
        valid: true
      }),
      summonMutations,
      summary: createUsedSummary(HOOKSHOT_TOOL_DEFINITION.label),
      tileMutations,
      tools: nextTools,
      triggeredSummonEffects,
      triggeredTerrainEffects
    });
  }

  return buildBlockedResolution({
    actor: context.actor,
    nextToolDieSeed: context.toolDieSeed,
    path: rayPath,
    preview: createToolPreview(context, {
      actorPath: rayPath,
      effectTiles: rayPath,
      selectionTiles,
      valid: false
    }),
    reason: "No hookshot target",
    tools: context.tools
  });
}

export const HOOKSHOT_TOOL_MODULE: ToolModule<"hookshot"> = {
  id: "hookshot",
  definition: HOOKSHOT_TOOL_DEFINITION,
  dieFace: {
    params: {
      hookLength: 3
    }
  },
  execute: resolveHookshotTool
};
