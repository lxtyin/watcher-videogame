import { Camera, Plane, Raycaster, Vector2, Vector3 } from "three";
import type { Direction, GridPosition } from "@watcher/shared";
import {
  clampGridPositionToBoard,
  toGridPositionFromWorld
} from "../utils/boardMath";

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

// Tile stages only snap to board cells. Legality is resolved entirely by shared preview logic.
export function resolveBoardTileAimTarget(
  worldX: number,
  worldZ: number,
  boardWidth: number,
  boardHeight: number
): GridPosition {
  return clampGridPositionToBoard(
    toGridPositionFromWorld(worldX, worldZ, boardWidth, boardHeight),
    boardWidth,
    boardHeight
  );
}

export function resolveAxisTileAimTarget(
  worldX: number,
  worldZ: number,
  actorPosition: GridPosition,
  boardWidth: number,
  boardHeight: number
): GridPosition | null {
  const snappedPointer = resolveBoardTileAimTarget(worldX, worldZ, boardWidth, boardHeight);
  const deltaX = snappedPointer.x - actorPosition.x;
  const deltaY = snappedPointer.y - actorPosition.y;

  if (!deltaX && !deltaY) {
    return null;
  }

  if (Math.abs(deltaX) >= Math.abs(deltaY) && deltaX !== 0) {
    return {
      x: snappedPointer.x,
      y: actorPosition.y
    };
  }

  return {
    x: actorPosition.x,
    y: snappedPointer.y
  };
}
