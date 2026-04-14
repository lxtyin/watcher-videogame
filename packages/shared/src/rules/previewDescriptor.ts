import { isWithinBoard } from "../board";
import type {
  AffectedPlayerMove,
  BoardDefinition,
  GridPosition,
  MovementActor,
  PreviewDescriptor,
  PreviewPlayerTarget
} from "../types";
import { CARDINAL_DIRECTIONS, stepPosition } from "./spatial";

function clonePosition(position: GridPosition): GridPosition {
  return {
    x: position.x,
    y: position.y
  };
}

export function dedupePreviewPositions(positions: GridPosition[]): GridPosition[] {
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

export function createPreviewPlayerTargets(
  actor: MovementActor,
  actorTarget: GridPosition,
  affectedPlayers: AffectedPlayerMove[] = [],
  boardVisibleByPlayerId: Partial<Record<string, boolean>> = {}
): PreviewPlayerTarget[] {
  const targetsById = new Map<string, PreviewPlayerTarget>();

  targetsById.set(actor.id, {
    boardVisible: true,
    playerId: actor.id,
    startPosition: clonePosition(actor.position),
    targetPosition: clonePosition(actorTarget)
  });

  for (const affectedPlayer of affectedPlayers) {
    targetsById.set(affectedPlayer.playerId, {
      boardVisible: boardVisibleByPlayerId[affectedPlayer.playerId] ?? true,
      playerId: affectedPlayer.playerId,
      startPosition: clonePosition(affectedPlayer.startPosition),
      targetPosition: clonePosition(affectedPlayer.target)
    });
  }

  return [...targetsById.values()];
}

export function createPreviewDescriptor(
  preview: Partial<PreviewDescriptor> & Pick<PreviewDescriptor, "valid">
): PreviewDescriptor {
  return {
    actorPath: dedupePreviewPositions([...(preview.actorPath ?? [])]),
    effectTiles: dedupePreviewPositions([...(preview.effectTiles ?? [])]),
    highlightTiles: dedupePreviewPositions([...(preview.highlightTiles ?? [])]),
    playerTargets: (preview.playerTargets ?? []).map((target) => ({
      boardVisible: target.boardVisible,
      playerId: target.playerId,
      startPosition: clonePosition(target.startPosition),
      targetPosition: clonePosition(target.targetPosition)
    })),
    selectionTiles: dedupePreviewPositions([...(preview.selectionTiles ?? [])]),
    valid: preview.valid
  };
}

export function createEmptyPreview(valid = false): PreviewDescriptor {
  return createPreviewDescriptor({
    valid
  });
}

export function collectDirectionSelectionTiles(
  board: BoardDefinition,
  origin: GridPosition
): GridPosition[] {
  return CARDINAL_DIRECTIONS.map((direction) => stepPosition(origin, direction)).filter((position) =>
    isWithinBoard(board, position)
  );
}

export function collectAdjacentSelectionTiles(
  board: BoardDefinition,
  origin: GridPosition,
  range = 1
): GridPosition[] {
  const positions: GridPosition[] = [];

  for (let deltaY = -range; deltaY <= range; deltaY += 1) {
    for (let deltaX = -range; deltaX <= range; deltaX += 1) {
      if (!deltaX && !deltaY) {
        continue;
      }

      const position = {
        x: origin.x + deltaX,
        y: origin.y + deltaY
      };

      if (isWithinBoard(board, position)) {
        positions.push(position);
      }
    }
  }

  return positions;
}

export function collectAxisSelectionTiles(
  board: BoardDefinition,
  origin: GridPosition
): GridPosition[] {
  const positions: GridPosition[] = [];

  for (let x = 0; x < board.width; x += 1) {
    if (x !== origin.x) {
      positions.push({
        x,
        y: origin.y
      });
    }
  }

  for (let y = 0; y < board.height; y += 1) {
    if (y !== origin.y) {
      positions.push({
        x: origin.x,
        y
      });
    }
  }

  return positions;
}

export function collectBoardSelectionTiles(
  board: BoardDefinition,
  excludedPosition?: GridPosition
): GridPosition[] {
  const positions: GridPosition[] = [];

  for (let y = 0; y < board.height; y += 1) {
    for (let x = 0; x < board.width; x += 1) {
      if (excludedPosition && x === excludedPosition.x && y === excludedPosition.y) {
        continue;
      }

      positions.push({ x, y });
    }
  }

  return positions;
}
