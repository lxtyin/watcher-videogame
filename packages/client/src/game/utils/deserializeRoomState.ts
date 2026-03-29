import type { GameSnapshot, RolledToolId, ToolId } from "@watcher/shared";

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
  tools: Iterable<RoomTurnToolState>;
}

interface RoomTurnToolState {
  instanceId: string;
  toolId: ToolId;
  charges: number;
  movePoints: number;
  range: number;
}

interface RoomTurnInfo {
  currentPlayerId: string;
  phase: "roll" | "action";
  turnNumber: number;
  moveRoll: number;
  lastRolledToolId: RolledToolId | "";
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
      tools: Array.from(player.tools).map((tool) => ({
        instanceId: tool.instanceId,
        toolId: tool.toolId,
        charges: tool.charges,
        movePoints: tool.toolId === "movement" ? tool.movePoints : null,
        range: tool.toolId === "brake" ? tool.range : null
      }))
    })),
    turnInfo: {
      currentPlayerId: roomState.turnInfo.currentPlayerId,
      phase: roomState.turnInfo.phase,
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
