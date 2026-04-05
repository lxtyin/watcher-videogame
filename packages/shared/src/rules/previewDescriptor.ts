import { isWithinBoard } from "../board";
import { getToolDefinition } from "../tools";
import type {
  ActionResolution,
  GridPosition,
  PreviewDescriptor,
  PreviewPlayerTarget,
  ToolActionContext
} from "../types";
import { CARDINAL_DIRECTIONS, stepPosition } from "./spatial";

function dedupePositions(positions: GridPosition[]): GridPosition[] {
  const seen = new Set<string>();

  return positions.filter((position) => {
    const key = `${position.x},${position.y}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function collectDirectionSelectionTiles(context: ToolActionContext): GridPosition[] {
  return CARDINAL_DIRECTIONS.map((direction) => stepPosition(context.actor.position, direction)).filter(
    (position) => isWithinBoard(context.board, position)
  );
}

function collectAdjacentRingSelectionTiles(context: ToolActionContext): GridPosition[] {
  const positions: GridPosition[] = [];

  for (let deltaY = -1; deltaY <= 1; deltaY += 1) {
    for (let deltaX = -1; deltaX <= 1; deltaX += 1) {
      if (!deltaX && !deltaY) {
        continue;
      }

      const position = {
        x: context.actor.position.x + deltaX,
        y: context.actor.position.y + deltaY
      };

      if (isWithinBoard(context.board, position)) {
        positions.push(position);
      }
    }
  }

  return positions;
}

function collectAxisLineSelectionTiles(context: ToolActionContext): GridPosition[] {
  const positions: GridPosition[] = [];

  for (let x = 0; x < context.board.width; x += 1) {
    if (x === context.actor.position.x) {
      continue;
    }

    positions.push({
      x,
      y: context.actor.position.y
    });
  }

  for (let y = 0; y < context.board.height; y += 1) {
    if (y === context.actor.position.y) {
      continue;
    }

    positions.push({
      x: context.actor.position.x,
      y
    });
  }

  return positions;
}

function collectBoardSelectionTiles(context: ToolActionContext): GridPosition[] {
  const positions: GridPosition[] = [];

  for (let y = 0; y < context.board.height; y += 1) {
    for (let x = 0; x < context.board.width; x += 1) {
      if (x === context.actor.position.x && y === context.actor.position.y) {
        continue;
      }

      positions.push({ x, y });
    }
  }

  return positions;
}

function buildSelectionTiles(context: ToolActionContext): GridPosition[] {
  const toolDefinition = getToolDefinition(context.activeTool.toolId);

  if (toolDefinition.targetMode === "direction") {
    return collectDirectionSelectionTiles(context);
  }

  if (toolDefinition.targetMode !== "tile" && toolDefinition.targetMode !== "tile_direction") {
    return [];
  }

  switch (toolDefinition.tileTargeting ?? "board_any") {
    case "adjacent_ring":
      return collectAdjacentRingSelectionTiles(context);
    case "axis_line":
      return collectAxisLineSelectionTiles(context);
    case "board_any":
      return collectBoardSelectionTiles(context);
  }
}

function buildPlayerTargets(
  context: ToolActionContext,
  resolution: ActionResolution
): PreviewPlayerTarget[] {
  const targetsById = new Map(
    context.players.map((player) => [
      player.id,
      {
        boardVisible: player.boardVisible,
        playerId: player.id,
        startPosition: player.position,
        targetPosition: player.position
      } satisfies PreviewPlayerTarget
    ] as const)
  );

  targetsById.set(context.actor.id, {
    boardVisible: true,
    playerId: context.actor.id,
    startPosition: context.actor.position,
    targetPosition: resolution.actor.position
  });

  for (const affectedPlayer of resolution.affectedPlayers) {
    const currentTarget = targetsById.get(affectedPlayer.playerId);

    targetsById.set(affectedPlayer.playerId, {
      boardVisible: currentTarget?.boardVisible ?? true,
      playerId: affectedPlayer.playerId,
      startPosition: affectedPlayer.startPosition,
      targetPosition: affectedPlayer.target
    });
  }

  return [...targetsById.values()];
}

export function createPreviewDescriptor(
  context: ToolActionContext,
  resolution: ActionResolution,
  effectTiles: GridPosition[]
): PreviewDescriptor {
  return {
    actorPath: [...resolution.path],
    effectTiles: dedupePositions(effectTiles),
    playerTargets: buildPlayerTargets(context, resolution),
    selectionTiles: dedupePositions(buildSelectionTiles(context)),
    valid: resolution.kind === "applied"
  };
}

export function createPlaceholderPreview(
  valid: boolean,
  actorPath: GridPosition[],
  effectTiles: GridPosition[]
): PreviewDescriptor {
  return {
    actorPath: [...actorPath],
    effectTiles: dedupePositions(effectTiles),
    playerTargets: [],
    selectionTiles: [],
    valid
  };
}

export function attachPreviewDescriptor(
  context: ToolActionContext,
  resolution: ActionResolution
): ActionResolution {
  return {
    ...resolution,
    preview: createPreviewDescriptor(context, resolution, resolution.preview.effectTiles)
  };
}
