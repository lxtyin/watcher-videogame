import type { ToolContentDefinition } from "../content/schema";
import type { AffectedPlayerMove, ActionResolution } from "../types";
import {
  buildAppliedResolution,
  buildBlockedResolution,
  consumeActiveTool,
  requireDirection
} from "../rules/actionResolution";
import { createResolvedPlayerMovement } from "../rules/displacement";
import { resolveLinearDisplacement } from "../rules/movementSystem";
import {
  findPlayersAtPosition,
  getOppositeDirection,
  isSolidTileType,
  stepPosition
} from "../rules/spatial";
import { buildMotionPositions, createPlayerMotionEvent, createPresentation } from "../rules/actionPresentation";
import type { ToolModule } from "./types";
import {
  buildMovementSystemContext,
  createPassiveToolMovementDescriptor,
  createToolMovementDescriptor,
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
  description: "向前发射钩锁，命中墙时拉近自己，命中玩家时拉近对方。",
  disabledHint: "当前还不能使用这个钩锁工具。",
  source: "turn",
  targetMode: "direction",
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

function resolveHookshotTool(context: Parameters<ToolModule["execute"]>[0]): ActionResolution {
  const direction = requireDirection(context);
  const hookLength = getToolParamValue(context.activeTool, "hookLength", 3);
  const actorMovement = createToolMovementDescriptor(context, HOOKSHOT_TOOL_DEFINITION, "drag", ["hookshot:self"]);
  const pulledMovement = createPassiveToolMovementDescriptor(context.activeTool.toolId, "drag", ["hookshot:pull"]);

  if (!direction) {
    return buildBlockedResolution(context.actor, context.tools, "Hookshot needs a direction", context.toolDieSeed);
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
        return buildBlockedResolution(context.actor, context.tools, "No hookshot landing space", context.toolDieSeed, rayPath, [], rayPath);
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
        return buildBlockedResolution(context.actor, context.tools, actorResolution.stopReason, context.toolDieSeed, rayPath, [], rayPath);
      }

      return buildAppliedResolution(
        {
          ...context.actor,
          position: actorResolution.actor.position,
          tags: actorResolution.actor.tags,
          turnFlags: actorResolution.actor.turnFlags
        },
        actorResolution.tools,
        createUsedSummary(HOOKSHOT_TOOL_DEFINITION.label),
        actorResolution.nextToolDieSeed,
        actorResolution.path,
        actorResolution.tileMutations,
        [],
        actorResolution.triggeredTerrainEffects,
        rayPath,
        createPresentation(context.actor.id, context.activeTool.toolId, [
          createPlayerMotionEvent(
            `${context.activeTool.instanceId}:actor-hook`,
            context.actor.id,
            buildMotionPositions(context.actor.position, actorResolution.path),
            "ground"
          )
        ].flatMap((event) => (event ? [event] : []))),
        actorResolution.summonMutations,
        actorResolution.triggeredSummonEffects,
        false,
        createResolvedPlayerMovement(context.actor.id, context.actor.position, actorResolution.path, actorMovement)
      );
    }

    rayPath.push(target);
    const hitPlayers = findPlayersAtPosition(context.players, target, [context.actor.id]);

    if (!hitPlayers.length) {
      continue;
    }

    let nextTools = consumeActiveTool(context);
    let nextToolDieSeed = context.toolDieSeed;
    const tileMutations = [];
    const summonMutations = [];
    const triggeredTerrainEffects = [];
    const triggeredSummonEffects = [];
    const affectedPlayers: AffectedPlayerMove[] = [];
    const motionEvents = [];

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
        buildMotionPositions(hitPlayer.position, pullResolution.path),
        "ground"
      );

      if (motionEvent) {
        motionEvents.push(motionEvent);
      }
    }

    if (!affectedPlayers.length) {
      return buildBlockedResolution(context.actor, context.tools, "Target cannot be pulled", context.toolDieSeed, rayPath, [], rayPath);
    }

    return buildAppliedResolution(
      context.actor,
      nextTools,
      createUsedSummary(HOOKSHOT_TOOL_DEFINITION.label),
      nextToolDieSeed,
      rayPath,
      tileMutations,
      affectedPlayers,
      triggeredTerrainEffects,
      rayPath,
      createPresentation(context.actor.id, context.activeTool.toolId, motionEvents),
      summonMutations,
      triggeredSummonEffects
    );
  }

  return buildBlockedResolution(context.actor, context.tools, "No hookshot target", context.toolDieSeed, rayPath, [], rayPath);
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
