import type { Room } from "colyseus.js";
import type { CharacterId, Direction, GameSnapshot, GridPosition, ToolId } from "@watcher/shared";
import {
  getUsableDirectionalToolState,
  getUsableInstantToolState,
  getUsableTileToolState
} from "./toolSelection";

type SelectedToolInstanceId = string | null;

export function sendRollDice(room: Room | null): void {
  if (!room) {
    return;
  }

  room.send("rollDice");
}

export function sendEndTurn(room: Room | null): void {
  if (!room) {
    return;
  }

  room.send("endTurn");
}

export function sendSetCharacter(room: Room | null, characterId: CharacterId): void {
  if (!room) {
    return;
  }

  room.send("setCharacter", { characterId });
}

export function sendGrantDebugTool(room: Room | null, toolId: ToolId): void {
  if (!room) {
    return;
  }

  room.send("grantDebugTool", { toolId });
}

// Tool command helpers keep store actions thin and centralize local usability guards.
export function sendInstantToolIfUsable(
  room: Room | null,
  snapshot: GameSnapshot | null,
  sessionId: string | null,
  selectedToolInstanceId: SelectedToolInstanceId
): boolean {
  if (!room || !selectedToolInstanceId) {
    return false;
  }

  const selectedToolState = getUsableInstantToolState(snapshot, sessionId, selectedToolInstanceId);

  if (!selectedToolState) {
    return false;
  }

  room.send("useTool", { toolInstanceId: selectedToolState.tool.instanceId });
  return true;
}

export function sendDirectionalToolIfUsable(
  room: Room | null,
  snapshot: GameSnapshot | null,
  sessionId: string | null,
  selectedToolInstanceId: SelectedToolInstanceId,
  direction: Direction
): boolean {
  if (!room || !selectedToolInstanceId) {
    return false;
  }

  const selectedToolState = getUsableDirectionalToolState(
    snapshot,
    sessionId,
    selectedToolInstanceId
  );

  if (!selectedToolState) {
    return false;
  }

  room.send("useTool", {
    toolInstanceId: selectedToolState.tool.instanceId,
    direction
  });
  return true;
}

export function sendTileTargetToolIfUsable(
  room: Room | null,
  snapshot: GameSnapshot | null,
  sessionId: string | null,
  selectedToolInstanceId: SelectedToolInstanceId,
  targetPosition: GridPosition
): boolean {
  if (!room || !selectedToolInstanceId) {
    return false;
  }

  const selectedToolState = getUsableTileToolState(snapshot, sessionId, selectedToolInstanceId);

  if (!selectedToolState) {
    return false;
  }

  room.send("useTool", {
    toolInstanceId: selectedToolState.tool.instanceId,
    targetPosition
  });
  return true;
}
