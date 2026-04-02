import { getTile, isWithinBoard } from "../../board";
import { getCharacterMovementOverrideType } from "../../characterRuntime";
import { getToolDefinition, getToolParam } from "../../tools";
import type {
  ActionResolution,
  AffectedPlayerMove,
  MovementActor,
  MovementDescriptor,
  ToolActionContext
} from "../../types";
import {
  buildMotionPositions,
  createPlayerMotionEvent,
  createPresentation
} from "../actionPresentation";
import {
  createMovementDescriptor,
  createResolvedPlayerMovement,
  materializeMovementDescriptor
} from "../displacement";
import {
  buildAppliedResolution,
  buildBlockedResolution,
  consumeActiveTool,
  requireDirection
} from "../actionResolution";
import {
  resolveLeapDisplacement,
  resolveLinearDisplacement,
  resolveTeleportDisplacement
} from "../movementSystem";
import {
  findPlayersAtPosition,
  getOppositeDirection,
  isSolidTileType,
  normalizeAxisTarget,
  stepPosition
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

function toMovementSubject(actor: MovementActor | ToolActionContext["players"][number]) {
  return {
    characterId: actor.characterId,
    characterState: actor.characterState,
    id: actor.id,
    position: actor.position,
    spawnPosition: actor.spawnPosition,
    turnFlags: actor.turnFlags
  };
}

function getToolMovementDescriptor(
  context: ToolActionContext,
  fallbackType: "translate" | "leap" | "drag" | "teleport",
  extraTags: string[] = []
): MovementDescriptor {
  const definitionMovement =
    getToolDefinition(context.activeTool.toolId).actorMovement ?? {
      type: fallbackType,
      disposition: "active" as const
    };
  const overrideType = getCharacterMovementOverrideType(
    context.actor.characterId,
    context.actor.characterState
  );
  const type =
    definitionMovement.disposition === "active" &&
    definitionMovement.type === "translate" &&
    overrideType === "leap"
      ? "leap"
      : definitionMovement.type;

  return materializeMovementDescriptor(
    {
      ...definitionMovement,
      type
    },
    {
      tags: [`tool:${context.activeTool.toolId}`, ...extraTags],
      timing: "in_turn"
    }
  );
}

function createPassiveToolMovementDescriptor(
  toolId: ToolActionContext["activeTool"]["toolId"],
  type: "translate" | "leap" | "drag",
  extraTags: string[] = []
): MovementDescriptor {
  return createMovementDescriptor(type, "passive", {
    tags: [`tool:${toolId}`, ...extraTags],
    timing: "out_of_turn"
  });
}

function createActorMotionPresentation(
  context: ToolActionContext,
  eventSuffix: string,
  path: ToolActionContext["actor"]["position"][],
  motionStyle: "ground" | "arc"
) {
  return createPresentation(context.actor.id, context.activeTool.toolId, [
    createPlayerMotionEvent(
      `${context.activeTool.instanceId}:${eventSuffix}`,
      context.actor.id,
      buildMotionPositions(context.actor.position, path),
      motionStyle
    )
  ].flatMap((event) => (event ? [event] : [])));
}

function toAffectedPlayerMove(
  playerId: string,
  startPosition: MovementActor["position"],
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

// Movement spends the tool's stored move points on the shared displacement system.
export function resolveMovementTool(context: ToolActionContext): ActionResolution {
  const direction = requireDirection(context);
  const movePoints = getToolParam(context.activeTool, "movePoints");
  const movement = getToolMovementDescriptor(context, "translate");
  const nextTools = consumeActiveTool(context);

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

  const resolution =
    movement.type === "leap"
      ? resolveLeapDisplacement(buildMovementSystemContext(context), {
          direction,
          maxDistance: movePoints,
          movement,
          player: toMovementSubject(context.actor),
          toolDieSeed: context.toolDieSeed,
          tools: nextTools
        })
      : resolveLinearDisplacement(buildMovementSystemContext(context), {
          direction,
          movePoints,
          movement,
          player: toMovementSubject(context.actor),
          toolDieSeed: context.toolDieSeed,
          tools: nextTools
        });

  if (!resolution.path.length) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      resolution.stopReason,
      context.toolDieSeed,
      resolution.path,
      [],
      resolution.path
    );
  }

  return buildAppliedResolution(
    {
      ...context.actor,
      characterState: resolution.actor.characterState,
      position: resolution.actor.position,
      turnFlags: resolution.actor.turnFlags
    },
    resolution.tools,
    `Used ${getToolDefinition(context.activeTool.toolId).label}.`,
    resolution.nextToolDieSeed,
    resolution.path,
    resolution.tileMutations,
    [],
    resolution.triggeredTerrainEffects,
    resolution.path,
    createActorMotionPresentation(
      context,
      "actor-move",
      resolution.path,
      movement.type === "leap" ? "arc" : "ground"
    ),
    resolution.summonMutations,
    resolution.triggeredSummonEffects,
    false,
    createResolvedPlayerMovement(context.actor.id, context.actor.position, resolution.path, movement)
  );
}

// Jump resolves through the same leap system as other arc movement effects.
export function resolveJumpTool(context: ToolActionContext): ActionResolution {
  const direction = requireDirection(context);
  const jumpDistance = getToolParam(context.activeTool, "jumpDistance");
  const movement = getToolMovementDescriptor(context, "leap");
  const resolution = direction
    ? resolveLeapDisplacement(buildMovementSystemContext(context), {
        direction,
        maxDistance: jumpDistance,
        movement,
        player: toMovementSubject(context.actor),
        toolDieSeed: context.toolDieSeed,
        tools: consumeActiveTool(context)
      })
    : null;

  if (!direction || !resolution) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Jump needs a direction",
      context.toolDieSeed
    );
  }

  if (!resolution.path.length) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      resolution.stopReason,
      context.toolDieSeed,
      resolution.path,
      [],
      resolution.path
    );
  }

  return buildAppliedResolution(
    {
      ...context.actor,
      characterState: resolution.actor.characterState,
      position: resolution.actor.position,
      turnFlags: resolution.actor.turnFlags
    },
    resolution.tools,
    `Used ${getToolDefinition(context.activeTool.toolId).label}.`,
    resolution.nextToolDieSeed,
    resolution.path,
    resolution.tileMutations,
    [],
    resolution.triggeredTerrainEffects,
    resolution.path,
    createActorMotionPresentation(context, "actor-jump", resolution.path, "arc"),
    resolution.summonMutations,
    resolution.triggeredSummonEffects,
    false,
    createResolvedPlayerMovement(context.actor.id, context.actor.position, resolution.path, movement)
  );
}

// Hookshot keeps its trace selection, but every resulting displacement resolves through the shared movement system.
export function resolveHookshotTool(context: ToolActionContext): ActionResolution {
  const direction = requireDirection(context);
  const hookLength = getToolParam(context.activeTool, "hookLength");
  const actorMovement = getToolMovementDescriptor(context, "drag", ["hookshot:self"]);
  const pulledMovement = createPassiveToolMovementDescriptor(context.activeTool.toolId, "drag", [
    "hookshot:pull"
  ]);

  if (!direction) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Hookshot needs a direction",
      context.toolDieSeed
    );
  }

  const rayPath: MovementActor["position"][] = [];

  for (let distance = 1; distance <= hookLength; distance += 1) {
    const target = stepPosition(context.actor.position, direction, distance);

    if (!isWithinBoard(context.board, target)) {
      break;
    }

    const tile = getTile(context.board, target);

    if (tile && isSolidTileType(tile.type)) {
      const pullDistance = distance - 1;

      if (pullDistance < 1) {
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
        return buildBlockedResolution(
          context.actor,
          context.tools,
          actorResolution.stopReason,
          context.toolDieSeed,
          rayPath,
          [],
          rayPath
        );
      }

      return buildAppliedResolution(
        {
          ...context.actor,
          characterState: actorResolution.actor.characterState,
          position: actorResolution.actor.position,
          turnFlags: actorResolution.actor.turnFlags
        },
        actorResolution.tools,
        `Used ${getToolDefinition(context.activeTool.toolId).label}.`,
        actorResolution.nextToolDieSeed,
        actorResolution.path,
        actorResolution.tileMutations,
        [],
        actorResolution.triggeredTerrainEffects,
        rayPath,
        createActorMotionPresentation(context, "actor-hook", actorResolution.path, "ground"),
        actorResolution.summonMutations,
        actorResolution.triggeredSummonEffects,
        false,
        createResolvedPlayerMovement(
          context.actor.id,
          context.actor.position,
          actorResolution.path,
          actorMovement
        )
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
        toAffectedPlayerMove(
          hitPlayer.id,
          hitPlayer.position,
          pulledMovement,
          pullResolution,
          "hookshot"
        )
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

    return buildAppliedResolution(
      context.actor,
      nextTools,
      `Used ${getToolDefinition(context.activeTool.toolId).label}.`,
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
  const movement = getToolMovementDescriptor(context, "translate");
  const nextTools = consumeActiveTool(context);

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
  const resolution =
    movement.type === "leap"
      ? resolveLeapDisplacement(buildMovementSystemContext(context), {
          direction: axisTarget.direction,
          maxDistance: requestedDistance,
          movement,
          player: toMovementSubject(context.actor),
          toolDieSeed: context.toolDieSeed,
          tools: nextTools
        })
      : resolveLinearDisplacement(buildMovementSystemContext(context), {
          direction: axisTarget.direction,
          maxSteps: requestedDistance,
          movePoints: requestedDistance,
          movement,
          player: toMovementSubject(context.actor),
          toolDieSeed: context.toolDieSeed,
          tools: nextTools
        });

  if (!resolution.path.length) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      resolution.stopReason,
      context.toolDieSeed,
      resolution.path,
      [],
      [axisTarget.snappedTarget]
    );
  }

  return buildAppliedResolution(
    {
      ...context.actor,
      characterState: resolution.actor.characterState,
      position: resolution.actor.position,
      turnFlags: resolution.actor.turnFlags
    },
    resolution.tools,
    `Used ${getToolDefinition(context.activeTool.toolId).label}.`,
    resolution.nextToolDieSeed,
    resolution.path,
    resolution.tileMutations,
    [],
    resolution.triggeredTerrainEffects,
    resolution.path,
    createActorMotionPresentation(
      context,
      "actor-brake",
      resolution.path,
      movement.type === "leap" ? "arc" : "ground"
    ),
    resolution.summonMutations,
    resolution.triggeredSummonEffects,
    false,
    createResolvedPlayerMovement(context.actor.id, context.actor.position, resolution.path, movement)
  );
}

// Teleport goes through the shared teleport displacement so stop triggers still apply.
export function resolveTeleportTool(context: ToolActionContext): ActionResolution {
  const targetPosition = context.targetPosition;
  const movement = getToolMovementDescriptor(context, "teleport");

  if (!targetPosition) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Teleport needs a target tile",
      context.toolDieSeed
    );
  }

  const resolution = resolveTeleportDisplacement(buildMovementSystemContext(context), {
    movement,
    player: toMovementSubject(context.actor),
    targetPosition,
    toolDieSeed: context.toolDieSeed,
    tools: consumeActiveTool(context)
  });

  if (!resolution.path.length) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      resolution.stopReason,
      context.toolDieSeed,
      [],
      [],
      [targetPosition]
    );
  }

  return buildAppliedResolution(
    {
      ...context.actor,
      characterState: resolution.actor.characterState,
      position: resolution.actor.position,
      turnFlags: resolution.actor.turnFlags
    },
    resolution.tools,
    `Used ${getToolDefinition(context.activeTool.toolId).label}.`,
    resolution.nextToolDieSeed,
    resolution.path,
    resolution.tileMutations,
    [],
    resolution.triggeredTerrainEffects,
    [targetPosition],
    null,
    resolution.summonMutations,
    resolution.triggeredSummonEffects,
    false,
    createResolvedPlayerMovement(context.actor.id, context.actor.position, resolution.path, movement)
  );
}
