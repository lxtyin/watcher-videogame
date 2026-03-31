import { Camera, Plane, Raycaster, Vector2, Vector3 } from "three";
import {
  getToolDefinition,
  type Direction,
  type GridPosition,
  type TileTargetingMode,
  type ToolId
} from "@watcher/shared";
import {
  clampGridPositionToBoard,
  toGridPositionFromWorld
} from "../utils/boardMath";

interface TileAimStrategyContext {
  actorPosition: GridPosition;
  deltaX: number;
  deltaY: number;
  snappedPointer: GridPosition;
}

type TileAimStrategy = (context: TileAimStrategyContext) => GridPosition | null;

const TILE_AIM_STRATEGIES: Record<TileTargetingMode, TileAimStrategy> = {
  axis_line: ({ actorPosition, deltaX, deltaY, snappedPointer }) => {
    if (!deltaX && !deltaY) {
      return null;
    }

    if (Math.abs(deltaX) >= Math.abs(deltaY) && deltaX !== 0) {
      return {
        x: snappedPointer.x,
        y: actorPosition.y
      };
    }

    if (deltaY !== 0) {
      return {
        x: actorPosition.x,
        y: snappedPointer.y
      };
    }

    return null;
  },
  adjacent_ring: ({ actorPosition, deltaX, deltaY }) => {
    const clampedX = Math.max(-1, Math.min(1, deltaX));
    const clampedY = Math.max(-1, Math.min(1, deltaY));

    if (!clampedX && !clampedY) {
      return null;
    }

    return {
      x: actorPosition.x + clampedX,
      y: actorPosition.y + clampedY
    };
  },
  board_any: ({ deltaX, deltaY, snappedPointer }) => (deltaX || deltaY ? snappedPointer : null)
};

// Dragging resolves to one cardinal direction once the pointer leaves a dead zone.
export function getDragDirection(deltaX: number, deltaZ: number): Direction | null {
  const threshold = 0.24;

  if (Math.abs(deltaX) < threshold && Math.abs(deltaZ) < threshold) {
    return null;
  }

  if (Math.abs(deltaX) >= Math.abs(deltaZ)) {
    return deltaX >= 0 ? "right" : "left";
  }

  return deltaZ >= 0 ? "down" : "up";
}

// The aiming system projects screen coordinates onto the board plane before snapping.
export function projectClientToGround(
  clientX: number,
  clientY: number,
  domElement: HTMLCanvasElement,
  camera: Camera,
  raycaster: Raycaster,
  pointer: Vector2,
  plane: Plane,
  intersection: Vector3
): { x: number; z: number } | null {
  const bounds = domElement.getBoundingClientRect();

  if (!bounds.width || !bounds.height) {
    return null;
  }

  if (
    clientX < bounds.left ||
    clientX > bounds.right ||
    clientY < bounds.top ||
    clientY > bounds.bottom
  ) {
    return null;
  }

  pointer.set(
    ((clientX - bounds.left) / bounds.width) * 2 - 1,
    -(((clientY - bounds.top) / bounds.height) * 2 - 1)
  );
  raycaster.setFromCamera(pointer, camera);

  if (!raycaster.ray.intersectPlane(plane, intersection)) {
    return null;
  }

  return {
    x: intersection.x,
    z: intersection.z
  };
}

// Tile-target tools route through a targeting-mode registry instead of per-scene branches.
export function resolveTileAimTarget(
  worldX: number,
  worldZ: number,
  toolId: ToolId,
  actorPosition: GridPosition,
  boardWidth: number,
  boardHeight: number
): GridPosition | null {
  const targetingMode = getToolDefinition(toolId).tileTargeting ?? "board_any";
  const snappedPointer = clampGridPositionToBoard(
    toGridPositionFromWorld(worldX, worldZ, boardWidth, boardHeight),
    boardWidth,
    boardHeight
  );
  const deltaX = snappedPointer.x - actorPosition.x;
  const deltaY = snappedPointer.y - actorPosition.y;

  return TILE_AIM_STRATEGIES[targetingMode]({
    actorPosition,
    deltaX,
    deltaY,
    snappedPointer
  });
}
