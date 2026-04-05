import { isWithinBoard, getTile } from "../board";
import { resolveToolMovementType } from "../skills";
import type { ToolContentDefinition } from "../content/schema";
import type {
  AffectedPlayerMove,
  MovementActor,
  MovementDescriptor,
  ToolActionContext,
  TurnToolSnapshot
} from "../types";
import {
  buildMotionPositions,
  createPlayerMotionEvent,
  createPresentation
} from "../rules/actionPresentation";
import {
  createMovementDescriptor,
  materializeMovementDescriptor
} from "../rules/displacement";
import type {
  resolveLeapDisplacement,
  resolveLinearDisplacement
} from "../rules/movementSystem";

export function createUsedSummary(label: string): string {
  return `Used ${label}.`;
}

export function getToolParamValue(
  tool: TurnToolSnapshot,
  paramId: keyof TurnToolSnapshot["params"],
  fallback = 0
): number {
  const value = tool.params[paramId];

  return typeof value === "number" ? value : fallback;
}

export function buildMovementSystemContext(context: ToolActionContext) {
  return {
    activeTool: context.activeTool,
    actorId: context.actor.id,
    board: context.board,
    players: context.players,
    sourceId: context.activeTool.instanceId,
    summons: context.summons
  };
}

export function toMovementSubject(actor: MovementActor | ToolActionContext["players"][number]) {
  return {
    characterId: actor.characterId,
    id: actor.id,
    position: actor.position,
    spawnPosition: actor.spawnPosition,
    tags: actor.tags,
    turnFlags: actor.turnFlags
  };
}

export function createToolMovementDescriptor(
  context: ToolActionContext,
  definition: ToolContentDefinition,
  fallbackType: "drag" | "leap" | "teleport" | "translate",
  extraTags: string[] = []
): MovementDescriptor {
  const definitionMovement =
    definition.actorMovement ?? {
      type: fallbackType,
      disposition: "active" as const
    };
  const type =
    definitionMovement.disposition === "active"
      ? resolveToolMovementType(
          context.actor.characterId,
          {
            id: context.actor.id,
            phase: context.phase,
            position: context.actor.position,
            tags: context.actor.tags,
            tools: context.tools
          },
          context.activeTool,
          definitionMovement.type
        )
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

export function createPassiveToolMovementDescriptor(
  toolId: ToolActionContext["activeTool"]["toolId"],
  type: "drag" | "leap" | "translate",
  extraTags: string[] = []
): MovementDescriptor {
  return createMovementDescriptor(type, "passive", {
    tags: [`tool:${toolId}`, ...extraTags],
    timing: "out_of_turn"
  });
}

export function createActorMotionPresentation(
  context: ToolActionContext,
  eventSuffix: string,
  path: ToolActionContext["actor"]["position"][],
  motionStyle: "arc" | "ground"
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

export function toAffectedPlayerMove(
  playerId: string,
  startPosition: MovementActor["position"],
  movement: MovementDescriptor,
  resolution: ReturnType<typeof resolveLinearDisplacement> | ReturnType<typeof resolveLeapDisplacement>,
  reason: string
): AffectedPlayerMove {
  return {
    movement,
    path: resolution.path,
    playerId,
    reason,
    startPosition,
    target: resolution.actor.position,
    tags: resolution.actor.tags,
    turnFlags: resolution.actor.turnFlags
  };
}

export function toTaggedPlayerPatch(
  player: ToolActionContext["players"][number],
  movement: MovementDescriptor,
  nextTags: ToolActionContext["players"][number]["tags"],
  reason: string
): AffectedPlayerMove {
  return {
    movement,
    path: [],
    playerId: player.id,
    reason,
    startPosition: player.position,
    target: player.position,
    tags: nextTags,
    turnFlags: player.turnFlags
  };
}

export function getTotalMovementPoints(tools: TurnToolSnapshot[]): number {
  return tools.reduce((total, tool) => {
    if (tool.toolId !== "movement") {
      return total;
    }

    return total + getToolParamValue(tool, "movePoints");
  }, 0);
}

export function adjustMovementTools(tools: TurnToolSnapshot[], delta: number): TurnToolSnapshot[] {
  if (!delta) {
    return tools;
  }

  if (delta > 0) {
    const firstMovementIndex = tools.findIndex((tool) => tool.toolId === "movement");

    return tools.map((tool, index) =>
      tool.toolId === "movement" && index === firstMovementIndex
        ? {
            ...tool,
            params: {
              ...tool.params,
              movePoints: getToolParamValue(tool, "movePoints") + delta
            }
          }
        : tool
    );
  }

  let remainingReduction = Math.abs(delta);

  return tools.map((tool) => {
    if (tool.toolId !== "movement" || remainingReduction < 1) {
      return tool;
    }

    const currentPoints = getToolParamValue(tool, "movePoints");
    const appliedReduction = Math.min(currentPoints, remainingReduction);
    remainingReduction -= appliedReduction;

    return {
      ...tool,
      params: {
        ...tool.params,
        movePoints: Math.max(0, currentPoints - appliedReduction)
      }
    };
  });
}

export function clearMovementTools(tools: TurnToolSnapshot[]): TurnToolSnapshot[] {
  return tools.map((tool) =>
    tool.toolId === "movement"
      ? {
          ...tool,
          params: {
            ...tool.params,
            movePoints: 0
          }
        }
      : tool
  );
}

export { getTile, isWithinBoard };
