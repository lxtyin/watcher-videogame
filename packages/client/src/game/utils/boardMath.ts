import {
  findToolInstance,
  resolveToolAction,
  type ActionResolution,
  type BoardDefinition,
  type Direction,
  type GameSnapshot,
  type GridPosition,
  type UseToolCommandPayload
} from "@watcher/shared";

export function toWorldPosition(
  position: GridPosition,
  boardWidth: number,
  boardHeight: number
): [number, number, number] {
  const offsetX = boardWidth / 2 - 0.5;
  const offsetZ = boardHeight / 2 - 0.5;
  return [position.x - offsetX, 0, position.y - offsetZ];
}

export function toGridPositionFromWorld(
  worldX: number,
  worldZ: number,
  boardWidth: number,
  boardHeight: number
): GridPosition {
  const offsetX = boardWidth / 2 - 0.5;
  const offsetY = boardHeight / 2 - 0.5;

  return {
    x: Math.round(worldX + offsetX),
    y: Math.round(worldZ + offsetY)
  };
}

export function clampGridPositionToBoard(
  position: GridPosition,
  boardWidth: number,
  boardHeight: number
): GridPosition {
  return {
    x: Math.min(boardWidth - 1, Math.max(0, position.x)),
    y: Math.min(boardHeight - 1, Math.max(0, position.y))
  };
}

export function directionFromStep(from: GridPosition, to: GridPosition): Direction | null {
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;

  if (deltaX === 1 && deltaY === 0) {
    return "right";
  }

  if (deltaX === -1 && deltaY === 0) {
    return "left";
  }

  if (deltaX === 0 && deltaY === 1) {
    return "down";
  }

  if (deltaX === 0 && deltaY === -1) {
    return "up";
  }

  return null;
}

export function directionFromAxis(from: GridPosition, to: GridPosition): Direction | null {
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;

  if (deltaX !== 0 && deltaY === 0) {
    return deltaX > 0 ? "right" : "left";
  }

  if (deltaY !== 0 && deltaX === 0) {
    return deltaY > 0 ? "down" : "up";
  }

  return null;
}

export function createBoardDefinitionFromSnapshot(snapshot: GameSnapshot): BoardDefinition {
  return {
    width: snapshot.boardWidth,
    height: snapshot.boardHeight,
    tiles: snapshot.tiles
  };
}

export function buildActionPreview(
  snapshot: GameSnapshot,
  sessionId: string | null,
  payload: UseToolCommandPayload
): ActionResolution | null {
  if (!sessionId) {
    return null;
  }

  const activePlayer = snapshot.players.find((player) => player.id === snapshot.turnInfo.currentPlayerId);
  const me = snapshot.players.find((player) => player.id === sessionId);

  if (!activePlayer || !me || activePlayer.id !== sessionId || snapshot.turnInfo.phase !== "action") {
    return null;
  }

  const board = createBoardDefinitionFromSnapshot(snapshot);
  const players = snapshot.players.map((player) => ({
    id: player.id,
    position: player.position,
    spawnPosition: player.spawnPosition,
    turnFlags: player.turnFlags
  }));
  const actor = {
    id: me.id,
    position: me.position,
    spawnPosition: me.spawnPosition,
    turnFlags: me.turnFlags
  };
  const activeTool = findToolInstance(me.tools, payload.toolInstanceId);

  if (!activeTool) {
    return null;
  }

  return resolveToolAction({
    board,
    actor,
    activeTool,
    toolDieSeed: snapshot.turnInfo.toolDieSeed,
    tools: me.tools,
    ...(payload.direction ? { direction: payload.direction } : {}),
    ...(payload.targetPosition ? { targetPosition: payload.targetPosition } : {}),
    players
  });
}
