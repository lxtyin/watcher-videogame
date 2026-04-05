import {
  findToolInstance,
  resolveToolAction,
  type ActionResolution,
  type BoardDefinition,
  type Direction,
  type GameSnapshot,
  type GridPosition,
  type TurnPhase,
  type UseToolCommandPayload
} from "@watcher/shared";

// Board coordinates are centered in world space so the prototype camera stays symmetrical.
export function toWorldPosition(
  position: GridPosition,
  boardWidth: number,
  boardHeight: number
): [number, number, number] {
  const offsetX = boardWidth / 2 - 0.5;
  const offsetZ = boardHeight / 2 - 0.5;
  return [position.x - offsetX, 0, position.y - offsetZ];
}

// World coordinates snap back to the nearest board cell for drag targeting.
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

// Pointer-derived cells are clamped so previews never drift outside the board.
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

// Single-step direction detection is used by path previews and diagnostics.
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

// Axis direction detection is used by tile-target tools that snap along one lane.
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

// Client previews rebuild the shared board shape from the latest room snapshot.
export function createBoardDefinitionFromSnapshot(snapshot: GameSnapshot): BoardDefinition {
  return {
    width: snapshot.boardWidth,
    height: snapshot.boardHeight,
    tiles: snapshot.tiles
  };
}

// Preview generation reuses the shared action resolver so UI hints match server authority.
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

  if (!activePlayer || !me || activePlayer.id !== sessionId) {
    return null;
  }

  const board = createBoardDefinitionFromSnapshot(snapshot);
  const players = snapshot.players
    .filter((player) => player.boardVisible)
    .map((player) => ({
      id: player.id,
      boardVisible: player.boardVisible,
      characterId: player.characterId,
      modifiers: player.modifiers,
      tags: player.tags,
      position: player.position,
      spawnPosition: player.spawnPosition,
      turnFlags: player.turnFlags
    }));
  const summons = snapshot.summons.map((summon) => ({
    instanceId: summon.instanceId,
    summonId: summon.summonId,
    ownerId: summon.ownerId,
    position: summon.position
  }));
  const actor = {
    id: me.id,
    characterId: me.characterId,
    modifiers: me.modifiers,
    tags: me.tags,
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
    phase: snapshot.turnInfo.phase as TurnPhase,
    toolDieSeed: snapshot.turnInfo.toolDieSeed,
    tools: me.tools,
    summons,
    ...(payload.choiceId ? { choiceId: payload.choiceId } : {}),
    ...(payload.direction ? { direction: payload.direction } : {}),
    ...(payload.targetPosition ? { targetPosition: payload.targetPosition } : {}),
    players
  });
}
