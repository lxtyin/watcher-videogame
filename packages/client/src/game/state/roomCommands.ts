import type { Room } from "colyseus.js";
import type {
  CharacterId,
  GameSnapshot,
  SetReadyCommandPayload,
  ToolId,
  UseToolCommandPayload
} from "@watcher/shared";
import { cloneToolSelectionRecord } from "@watcher/shared";
import { getSelectedToolState } from "./toolSelection";

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

function cloneToolPayload(
  payload: Omit<UseToolCommandPayload, "toolInstanceId">
): Omit<UseToolCommandPayload, "toolInstanceId"> {
  return {
    input: cloneToolSelectionRecord(payload.input)
  }
}

// Tool command helpers keep store actions thin and centralize local usability guards.
export function sendToolPayloadIfUsable(
  room: Room | null,
  snapshot: GameSnapshot | null,
  sessionId: string | null,
  selectedToolInstanceId: SelectedToolInstanceId,
  payload: Omit<UseToolCommandPayload, "toolInstanceId">
): boolean {
  if (!room || !selectedToolInstanceId) {
    return false;
  }

  const selectedToolState = getSelectedToolState(snapshot, sessionId, selectedToolInstanceId);

  if (!selectedToolState || !selectedToolState.availability.usable) {
    return false;
  }

  room.send("useTool", {
    toolInstanceId: selectedToolState.tool.instanceId,
    ...cloneToolPayload(payload)
  });
  return true;
}
