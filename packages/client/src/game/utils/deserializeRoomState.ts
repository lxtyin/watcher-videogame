import type { GameSnapshot, ToolId } from "@watcher/shared";

interface SchemaCollection<T> extends Iterable<T> {
  values(): IterableIterator<T>;
}

interface RoomTileState {
  key: string;
  x: number;
  y: number;
  type: "floor" | "wall" | "earthWall";
  durability: number;
}

interface RoomPlayerState {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  remainingMovePoints: number;
  movementActionsRemaining: number;
  availableTools: Iterable<RoomToolChargeState>;
}

interface RoomToolChargeState {
  id: ToolId;
  charges: number;
}

interface RoomTurnInfo {
  currentPlayerId: string;
  phase: "roll" | "action";
  remainingMovePoints: number;
  movementActionsRemaining: number;
  turnNumber: number;
  moveRoll: number;
  lastRolledToolId: ToolId | "";
}

interface RoomEventLogEntry {
  id: string;
  type:
    | "piece_moved"
    | "move_blocked"
    | "earth_wall_broken"
    | "turn_started"
    | "dice_rolled"
    | "tool_used"
    | "turn_ended";
  message: string;
  createdAt: number;
}

interface RoomStateShape {
  boardWidth: number;
  boardHeight: number;
  board: SchemaCollection<RoomTileState>;
  players: SchemaCollection<RoomPlayerState>;
  turnInfo: RoomTurnInfo;
  eventLog: Iterable<RoomEventLogEntry>;
}

export function deserializeRoomState(state: unknown): GameSnapshot {
  const roomState = state as RoomStateShape;

  return {
    boardWidth: roomState.boardWidth,
    boardHeight: roomState.boardHeight,
    tiles: Array.from(roomState.board.values()).map((tile) => ({
      key: tile.key,
      x: tile.x,
      y: tile.y,
      type: tile.type,
      durability: tile.durability
    })),
    players: Array.from(roomState.players.values()).map((player) => ({
      id: player.id,
      name: player.name,
      color: player.color,
      position: {
        x: player.x,
        y: player.y
      },
      remainingMovePoints: player.remainingMovePoints,
      movementActionsRemaining: player.movementActionsRemaining,
      availableTools: Array.from(player.availableTools).map((tool) => ({
        id: tool.id,
        charges: tool.charges
      }))
    })),
    turnInfo: {
      currentPlayerId: roomState.turnInfo.currentPlayerId,
      phase: roomState.turnInfo.phase,
      remainingMovePoints: roomState.turnInfo.remainingMovePoints,
      movementActionsRemaining: roomState.turnInfo.movementActionsRemaining,
      turnNumber: roomState.turnInfo.turnNumber,
      moveRoll: roomState.turnInfo.moveRoll,
      lastRolledToolId:
        roomState.turnInfo.lastRolledToolId === ""
          ? null
          : roomState.turnInfo.lastRolledToolId
    },
    eventLog: Array.from(roomState.eventLog).map((entry) => ({
      id: entry.id,
      type: entry.type,
      message: entry.message,
      createdAt: entry.createdAt
    }))
  };
}
