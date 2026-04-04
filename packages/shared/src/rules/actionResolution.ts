import { getTile } from "../board";
import { consumeToolInstance } from "../tools";
import type {
  ActionPresentation,
  ActionResolution,
  ActionPresentationEvent,
  AffectedPlayerMove,
  BoardSummonState,
  Direction,
  GridPosition,
  MovementActor,
  ResolvedPlayerMovement,
  SummonPresentationState,
  SummonStateTransition,
  SummonMutation,
  TilePresentationState,
  TileStateTransition,
  TileMutation,
  ToolActionContext,
  TriggeredSummonEffect,
  TriggeredTerrainEffect,
  TurnToolSnapshot
} from "../types";
import {
  appendPresentationEvents,
  createStateTransitionEvent,
  getMotionArrivalStartMs
} from "./actionPresentation";

// Blocked resolutions preserve tool inventory so previews can explain why an action failed.
export function buildBlockedResolution(
  actor: MovementActor,
  tools: TurnToolSnapshot[],
  reason: string,
  nextToolDieSeed: number,
  path: GridPosition[] = [],
  triggeredTerrainEffects: TriggeredTerrainEffect[] = [],
  previewTiles: GridPosition[] = []
): ActionResolution {
  return {
    kind: "blocked",
    actorMovement: null,
    reason,
    path,
    previewTiles,
    actor: {
      characterState: actor.characterState,
      position: actor.position,
      turnFlags: actor.turnFlags
    },
    tools,
    affectedPlayers: [],
    tileMutations: [],
    summonMutations: [],
    triggeredTerrainEffects,
    triggeredSummonEffects: [],
    presentation: null,
    endsTurn: false,
    nextToolDieSeed
  };
}

// Applied resolutions capture the fully resolved tool result after movement-trigger processing.
export function buildAppliedResolution(
  nextActor: MovementActor,
  tools: TurnToolSnapshot[],
  summary: string,
  nextToolDieSeed: number,
  path: GridPosition[],
  tileMutations: TileMutation[] = [],
  affectedPlayers: AffectedPlayerMove[] = [],
  triggeredTerrainEffects: TriggeredTerrainEffect[] = [],
  previewTiles: GridPosition[] = [],
  presentation: ActionPresentation | null = null,
  summonMutations: SummonMutation[] = [],
  triggeredSummonEffects: TriggeredSummonEffect[] = [],
  endsTurn = false,
  actorMovement: ResolvedPlayerMovement | null = null
): ActionResolution {
  return {
    kind: "applied",
    actorMovement,
    summary,
    path,
    previewTiles,
    actor: {
      characterState: nextActor.characterState,
      position: nextActor.position,
      turnFlags: nextActor.turnFlags
    },
    tools,
    affectedPlayers,
    tileMutations,
    summonMutations,
    triggeredTerrainEffects,
    triggeredSummonEffects,
    presentation,
    endsTurn,
    nextToolDieSeed
  };
}

// Presentation snapshots normalize tiles so delayed transitions can compare before and after states.
function toTilePresentationState(tile: {
  direction: Direction | null;
  durability: number;
  type: TilePresentationState["type"];
}): TilePresentationState {
  return {
    type: tile.type,
    durability: tile.durability,
    direction: tile.direction
  };
}

function toSummonPresentationState(summon: BoardSummonState): SummonPresentationState {
  return {
    instanceId: summon.instanceId,
    summonId: summon.summonId,
    ownerId: summon.ownerId,
    position: summon.position
  };
}

function getTileTransitionDirection(
  previousTile: { direction: Direction | null; type: TilePresentationState["type"] },
  nextType: TilePresentationState["type"]
): Direction | null {
  return nextType === previousTile.type ? previousTile.direction : null;
}

function buildTileStateTransition(
  context: ToolActionContext,
  mutation: TileMutation
): TileStateTransition | null {
  const previousTile = getTile(context.board, mutation.position);

  if (!previousTile) {
    return null;
  }

  return {
    key: mutation.key,
    position: mutation.position,
    before: toTilePresentationState(previousTile),
    after: {
      type: mutation.nextType,
      durability: mutation.nextDurability,
      direction: getTileTransitionDirection(previousTile, mutation.nextType)
    }
  };
}

function buildSummonStateTransition(
  context: ToolActionContext,
  mutation: SummonMutation
): SummonStateTransition | null {
  const previousSummon =
    context.summons.find((summon) => summon.instanceId === mutation.instanceId) ?? null;

  if (mutation.kind === "upsert") {
    return {
      instanceId: mutation.instanceId,
      before: previousSummon ? toSummonPresentationState(previousSummon) : null,
      after: {
        instanceId: mutation.instanceId,
        summonId: mutation.summonId,
        ownerId: mutation.ownerId,
        position: mutation.position
      }
    };
  }

  if (!previousSummon) {
    return null;
  }

  return {
    instanceId: mutation.instanceId,
    before: toSummonPresentationState(previousSummon),
    after: null
  };
}

// State transitions align with motion arrival so visuals change at the semantic impact frame.
function findStateTransitionStartMs(
  presentation: ActionPresentation | null,
  position: GridPosition
): number {
  if (!presentation) {
    return 0;
  }

  const arrivalTimes = presentation.events.flatMap((event) => {
    if (event.kind !== "player_motion") {
      return [];
    }

    const arrivalMs = getMotionArrivalStartMs(
      event.positions,
      event.motionStyle,
      position,
      event.startMs
    );

    return arrivalMs === null ? [] : [arrivalMs];
  });

  return arrivalTimes.length ? Math.min(...arrivalTimes) : 0;
}

// Presentation state transitions let the client delay board/summon visuals until the semantic moment they occur.
export function attachStateTransitionPresentation(
  context: ToolActionContext,
  resolution: ActionResolution
): ActionResolution {
  if (
    resolution.kind === "blocked" ||
    (!resolution.tileMutations.length && !resolution.summonMutations.length)
  ) {
    return resolution;
  }

  const transitionEvents: ActionPresentationEvent[] = [
    ...resolution.tileMutations.flatMap((mutation, index) => {
      const transition = buildTileStateTransition(context, mutation);

      if (!transition) {
        return [];
      }

      const event = createStateTransitionEvent(
        `${context.activeTool.instanceId}:tile-transition-${index}`,
        [transition],
        [],
        [],
        findStateTransitionStartMs(resolution.presentation, mutation.position)
      );

      return event ? [event] : [];
    }),
    ...resolution.summonMutations.flatMap((mutation, index) => {
      const transition = buildSummonStateTransition(context, mutation);
      const anchorPosition = transition?.before?.position ?? transition?.after?.position;

      if (!transition || !anchorPosition) {
        return [];
      }

      const event = createStateTransitionEvent(
        `${context.activeTool.instanceId}:summon-transition-${index}`,
        [],
        [transition],
        [],
        findStateTransitionStartMs(resolution.presentation, anchorPosition)
      );

      return event ? [event] : [];
    })
  ];

  if (!transitionEvents.length) {
    return resolution;
  }

  return {
    ...resolution,
    presentation: appendPresentationEvents(
      resolution.presentation,
      context.actor.id,
      context.activeTool.toolId,
      transitionEvents
    )
  };
}

export function buildSummonInstanceId(activeTool: TurnToolSnapshot, summonId: string): string {
  return `${activeTool.instanceId}:${summonId}`;
}

// Tool consumption stays centralized so executors do not rewrite inventory logic.
export function consumeActiveTool(context: ToolActionContext): TurnToolSnapshot[] {
  return consumeToolInstance(context.tools, context.activeTool.instanceId);
}

// Directional executors read from the optional payload through one shared helper.
export function requireDirection(context: ToolActionContext): Direction | null {
  return context.direction ?? null;
}
