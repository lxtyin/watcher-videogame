import { isWithinBoard, getTile } from "../board";
import { resolveToolMovementType } from "../skills";
import type {
  ToolContentDefinition,
  ToolUsabilityContext,
  ToolUsabilityResult
} from "../content/schema";
import type {
  ActionPresentation,
  ActionPresentationEvent,
  AffectedPlayerMove,
  GridPosition,
  MovementActor,
  MovementDescriptor,
  MovementDescriptorInput,
  MovementType,
  PreviewDescriptor,
  ToolActionContext,
  TurnToolSnapshot
} from "../types";
import {
  appendPresentationEvents,
  buildMotionPositions,
  createPlayerMotionEvent,
  createPresentation
} from "../rules/actionPresentation";
import {
  createMovementDescriptorInput
} from "../rules/displacement";
import {
  createPreviewDescriptor,
  createPreviewPlayerTargets
} from "../rules/previewDescriptor";
import type {
  resolveLeapDisplacement,
  resolveLinearDisplacement
} from "../rules/movementSystem";

export function createUsedSummary(label: string): string {
  return `Used ${label}.`;
}

export function createToolAvailableResult(): ToolUsabilityResult {
  return {
    usable: true,
    reason: null
  };
}

export function createToolUnavailableResult(reason: string): ToolUsabilityResult {
  return {
    usable: false,
    reason
  };
}

export function isChargedToolAvailable(context: ToolUsabilityContext): ToolUsabilityResult {
  return context.tool.charges < 1
    ? createToolUnavailableResult("没有剩余次数")
    : createToolAvailableResult();
}

export function isMovePointToolAvailable(context: ToolUsabilityContext): ToolUsabilityResult {
  const chargeAvailability = isChargedToolAvailable(context);

  if (!chargeAvailability.usable) {
    return chargeAvailability;
  }

  return getToolParamValue(context.tool, "movePoints") < 1
    ? createToolUnavailableResult("没有剩余点数")
    : createToolAvailableResult();
}

export function getToolParamValue(
  tool: Pick<TurnToolSnapshot, "params">,
  paramId: string,
  fallback = 0
): number {
  const value = tool.params[paramId];

  return typeof value === "number" ? value : fallback;
}

export function toMovementSubject(actor: MovementActor | ToolActionContext["players"][number]) {
  return {
    characterId: actor.characterId,
    id: actor.id,
    modifiers: actor.modifiers,
    position: actor.position,
    spawnPosition: actor.spawnPosition,
    tags: actor.tags,
    turnFlags: actor.turnFlags
  };
}

export interface ToolMovementPlan {
  descriptor: MovementDescriptorInput;
  type: MovementType;
}

export function createToolMovementPlan(
  context: ToolActionContext,
  definition: ToolContentDefinition,
  fallbackType: "drag" | "leap" | "teleport" | "translate",
  extraTags: string[] = []
): ToolMovementPlan {
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
            modifiers: context.actor.modifiers,
            phase: context.phase,
            position: context.actor.position,
            tags: context.actor.tags,
            tools: context.tools
          },
          context.activeTool,
          definitionMovement.type
        )
      : definitionMovement.type;

  return {
    descriptor: createMovementDescriptorInput(definitionMovement.disposition, {
      tags: [`tool:${context.activeTool.toolId}`, ...extraTags],
      timing: "in_turn"
    }),
    type
  };
}

export function createPassiveToolMovementPlan(
  toolId: ToolActionContext["activeTool"]["toolId"],
  type: "drag" | "leap" | "translate",
  extraTags: string[] = []
): ToolMovementPlan {
  return {
    descriptor: createMovementDescriptorInput("passive", {
      tags: [`tool:${toolId}`, ...extraTags],
      timing: "out_of_turn"
    }),
    type
  };
}

export function createActorMotionPresentation(
  context: ToolActionContext,
  eventSuffix: string,
  path: ToolActionContext["actor"]["position"][],
  motionStyle: "arc" | "ground",
  extraEvents: ActionPresentationEvent[] = []
) {
  return appendPresentationEvents(
    createPresentation(context.actor.id, context.activeTool.toolId, [
    createPlayerMotionEvent(
      `${context.activeTool.instanceId}:${eventSuffix}`,
      context.actor.id,
      buildMotionPositions(context.actor.position, path),
      motionStyle
    )
    ].flatMap((event) => (event ? [event] : []))),
    context.actor.id,
    context.activeTool.toolId,
    extraEvents
  );
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
    modifiers: resolution.actor.modifiers,
    target: resolution.actor.position,
    tags: resolution.actor.tags,
    turnFlags: resolution.actor.turnFlags
  };
}

export function createToolPreview(
  context: ToolActionContext,
  {
    actorPath = [],
    actorTarget = context.actor.position,
    affectedPlayers = [],
    effectTiles = [],
    selectionTiles = [],
    valid
  }: {
    actorPath?: GridPosition[];
    actorTarget?: GridPosition;
    affectedPlayers?: AffectedPlayerMove[];
    effectTiles?: GridPosition[];
    selectionTiles?: GridPosition[];
    valid: boolean;
  }
): PreviewDescriptor {
  const boardVisibleByPlayerId = Object.fromEntries(
    context.players.map((player) => [player.id, player.boardVisible] as const)
  );

  // let playerTargets = affectedPlayers.map((player) => (
  //   {
  //     boardVisible: true,
  //     playerId: player.playerId,
  //     startPosition: clonePosition(player.startPosition),
  //     targetPosition: clonePosition(player.target
  //   }
  // ));

  return createPreviewDescriptor({
    actorPath,
    effectTiles,
    playerTargets: createPreviewPlayerTargets(
      context.actor,
      actorTarget,
      affectedPlayers,
      boardVisibleByPlayerId
    ),
    selectionTiles,
    valid
  });
}

export function toTaggedPlayerPatch(
  player: ToolActionContext["players"][number],
  movement: MovementDescriptor,
  nextModifiers: ToolActionContext["players"][number]["modifiers"],
  nextTags: ToolActionContext["players"][number]["tags"],
  reason: string
): AffectedPlayerMove {
  return {
    movement,
    path: [],
    playerId: player.id,
    reason,
    startPosition: player.position,
    modifiers: nextModifiers,
    target: player.position,
    tags: nextTags,
    turnFlags: player.turnFlags
  };
}

export function getTotalMovementPoints(tools: readonly Pick<TurnToolSnapshot, "params">[]): number {
  return tools.reduce((total, tool) => {
    if (typeof tool.params.movePoints !== "number") {
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
    return tools.map((tool) =>
      typeof tool.params.movePoints === "number"
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
    if (typeof tool.params.movePoints !== "number" || remainingReduction < 1) {
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
    typeof tool.params.movePoints === "number"
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
