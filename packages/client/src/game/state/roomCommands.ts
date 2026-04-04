import type { Room } from "colyseus.js";
import type {
  CharacterId,
  Direction,
  GameSnapshot,
  GridPosition,
  SetReadyCommandPayload,
  ToolId,
  TurnStartActionId
} from "@watcher/shared";
import {
  getUsableChoiceToolState,
  getUsableDirectionalToolState,
  getUsableInstantToolState,
  getUsableTileDirectionToolState,
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

export function sendSetReady(room: Room | null, payload: SetReadyCommandPayload): void {
  if (!room) {
    return;
  }

  room.send("setReady", payload);
}

export function sendKickPlayer(room: Room | null, playerId: string): void {
  if (!room) {
    return;
  }

  room.send("kickPlayer", { playerId });
}

export function sendStartGame(room: Room | null): void {
  if (!room) {
    return;
  }

  room.send("startGame");
}

export function sendReturnToRoom(room: Room | null): void {
  if (!room) {
    return;
  }

  room.send("returnToRoom");
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

export function sendUseTurnStartAction(
  room: Room | null,
  actionId: TurnStartActionId
): void {
  if (!room) {
    return;
  }

  room.send("useTurnStartAction", { actionId });
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

export function sendTileDirectionToolIfUsable(
  room: Room | null,
  snapshot: GameSnapshot | null,
  sessionId: string | null,
  selectedToolInstanceId: SelectedToolInstanceId,
  targetPosition: GridPosition,
  direction: Direction
): boolean {
  if (!room || !selectedToolInstanceId) {
    return false;
  }

  const selectedToolState = getUsableTileDirectionToolState(
    snapshot,
    sessionId,
    selectedToolInstanceId
  );

  if (!selectedToolState) {
    return false;
  }

  room.send("useTool", {
    toolInstanceId: selectedToolState.tool.instanceId,
    targetPosition,
    direction
  });
  return true;
}

export function sendChoiceToolIfUsable(
  room: Room | null,
  snapshot: GameSnapshot | null,
  sessionId: string | null,
  selectedToolInstanceId: SelectedToolInstanceId,
  choiceId: string
): boolean {
  if (!room || !selectedToolInstanceId) {
    return false;
  }

  const selectedToolState = getUsableChoiceToolState(
    snapshot,
    sessionId,
    selectedToolInstanceId
  );

  if (!selectedToolState) {
    return false;
  }

  room.send("useTool", {
    toolInstanceId: selectedToolState.tool.instanceId,
    choiceId
  });
  return true;
}
