import { getTile } from "../board";
import {
  getChoiceSelection,
  getDirectionSelection,
  getTileSelection
} from "../toolInteraction";
import { consumeToolInstance } from "../tools";
import type {
  ActionPresentation,
  ActionResolution,
  ActionPresentationEvent,
  BoardSummonState,
  Direction,
  GridPosition,
  SummonPresentationState,
  SummonStateTransition,
  SummonMutation,
  TilePresentationState,
  TileStateTransition,
  TileMutation,
  ToolActionContext,
  TurnToolSnapshot
} from "../types";
import {
  appendPresentationEvents,
  createEffectEvent,
  createStateTransitionEvent,
  getMotionArrivalStartMs
} from "./actionPresentation";

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
    if (event.kind !== "motion" || event.subject.kind !== "player") {
      return [];
    }

    const arrivalMs = getMotionArrivalStartMs(
      event.positions,
      event.subject.motionStyle,
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

  const tileEvents: ActionPresentationEvent[] = resolution.tileMutations.flatMap((mutation, index) => {
      const transition = buildTileStateTransition(context, mutation);

      if (!transition) {
        return [];
      }

      const startMs = findStateTransitionStartMs(resolution.presentation, mutation.position);
      const events: ActionPresentationEvent[] = [];

      if (transition.before.type === "earthWall" && transition.after.type === "floor") {
        events.push(
          createEffectEvent(
            `${context.activeTool.instanceId}:earth-wall-break-${index}`,
            "earth_wall_break",
            mutation.position,
            [mutation.position],
            startMs
          )
        );
      }

      const event = createStateTransitionEvent(
        `${context.activeTool.instanceId}:tile-transition-${index}`,
        [transition],
        [],
        [],
        startMs
      );

      return event ? [...events, event] : events;
    });
  const summonEvents: ActionPresentationEvent[] = resolution.summonMutations.flatMap((mutation, index) => {
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
    });
  const transitionEvents: ActionPresentationEvent[] = [...tileEvents, ...summonEvents];

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
export function requireDirection(
  context: ToolActionContext,
  selectionKey = "direction"
): Direction | null {
  return getDirectionSelection(context.input, selectionKey);
}

export function requireTileSelection(
  context: ToolActionContext,
  selectionKey = "targetPosition"
): GridPosition | null {
  return getTileSelection(context.input, selectionKey);
}

export function requireChoiceSelection(
  context: ToolActionContext,
  selectionKey = "choiceId"
): string | null {
  return getChoiceSelection(context.input, selectionKey);
}
