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
  createSoundEvent,
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
  board: ToolActionContext["board"],
  mutation: TileMutation
): TileStateTransition | null {
  const previousTile = getTile(board, mutation.position);

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
  summons: BoardSummonState[],
  mutation: SummonMutation
): SummonStateTransition | null {
  const previousSummon =
    summons.find((summon) => summon.instanceId === mutation.instanceId) ?? null;

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

export function buildStateTransitionPresentationEvents(options: {
  activePresentation: ActionPresentation | null;
  board: ToolActionContext["board"];
  sourceId: string;
  summonMutations: SummonMutation[];
  summons: BoardSummonState[];
  tileMutations: TileMutation[];
}): ActionPresentationEvent[] {
  const tileEvents: ActionPresentationEvent[] = options.tileMutations.flatMap((mutation, index) => {
    const transition = buildTileStateTransition(options.board, mutation);

    if (!transition) {
      return [];
    }

    const startMs = findStateTransitionStartMs(options.activePresentation, mutation.position);
    const events: ActionPresentationEvent[] = [];
    const earthWallBreakEffectMs = 320;

    if (transition.before.type === "earthWall" && transition.after.type === "floor") {
      events.push(
        createEffectEvent(
          `${options.sourceId}:earth-wall-break-${index}`,
          "earth_wall_break",
          mutation.position,
          [mutation.position],
          startMs,
          earthWallBreakEffectMs
        )
      );
      events.push(
        createSoundEvent(
          `${options.sourceId}:earth-wall-break-sound-${index}`,
          "terrain_earth_wall_break",
          {
            kind: "position",
            position: mutation.position
          },
          startMs
        )
      );
    }

    const event = createStateTransitionEvent(
      `${options.sourceId}:tile-transition-${index}`,
      [transition],
      [],
      [],
      startMs
    );

    return event ? [...events, event] : events;
  });
  const summonEvents: ActionPresentationEvent[] = options.summonMutations.flatMap((mutation, index) => {
    const transition = buildSummonStateTransition(options.summons, mutation);
    const anchorPosition = transition?.before?.position ?? transition?.after?.position;

    if (!transition || !anchorPosition) {
      return [];
    }

    const event = createStateTransitionEvent(
      `${options.sourceId}:summon-transition-${index}`,
      [],
      [transition],
      [],
      findStateTransitionStartMs(options.activePresentation, anchorPosition)
    );

    return event ? [event] : [];
  });

  return [...tileEvents, ...summonEvents];
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
  const transitionEvents = buildStateTransitionPresentationEvents({
    activePresentation: resolution.presentation,
    board: context.board,
    sourceId: context.activeTool.instanceId,
    summonMutations: resolution.summonMutations,
    summons: context.summons,
    tileMutations: resolution.tileMutations
  });

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
