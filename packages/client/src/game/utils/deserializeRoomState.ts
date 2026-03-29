import type {
  Direction,
  GameSnapshot,
  PlayerTurnFlag,
  RolledToolId,
  ToolId,
  ToolParameterValueMap
} from "@watcher/shared";

interface SchemaCollection<T> extends Iterable<T> {
  values(): IterableIterator<T>;
}

interface RoomTileState {
  key: string;
  x: number;
  y: number;
  type: "floor" | "wall" | "earthWall" | "pit" | "lucky" | "conveyor";
  durability: number;
  direction: Direction | "";
}

interface RoomPlayerState {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  spawnX: number;
  spawnY: number;
  turnFlags: Iterable<PlayerTurnFlag>;
  tools: Iterable<RoomTurnToolState>;
}

interface RoomTurnToolState {
  instanceId: string;
  toolId: ToolId;
  charges: number;
  paramsJson: string;
}

interface RoomTurnInfo {
  currentPlayerId: string;
  phase: "roll" | "action";
  turnNumber: number;
  moveRoll: number;
  lastRolledToolId: RolledToolId | "";
  toolDieSeed: number;
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
    | "turn_ended"
    | "terrain_triggered"
    | "player_respawned"
    | "debug_granted";
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

// Colyseus schema objects are flattened into plain data for React and Zustand consumption.
export function deserializeRoomState(state: unknown): GameSnapshot {
  const roomState = state as RoomStateShape;
  const parseToolParams = (paramsJson: string): ToolParameterValueMap => {
    try {
      return JSON.parse(paramsJson) as ToolParameterValueMap;
    } catch {
      return {};
    }
  };

  return {
    boardWidth: roomState.boardWidth,
    boardHeight: roomState.boardHeight,
    tiles: Array.from(roomState.board.values()).map((tile) => ({
      key: tile.key,
      x: tile.x,
      y: tile.y,
      type: tile.type,
      durability: tile.durability,
      direction: tile.direction === "" ? null : tile.direction
    })),
    players: Array.from(roomState.players.values()).map((player) => ({
      id: player.id,
      name: player.name,
      color: player.color,
      position: {
        x: player.x,
        y: player.y
      },
      spawnPosition: {
        x: player.spawnX,
        y: player.spawnY
      },
      turnFlags: Array.from(player.turnFlags),
      tools: Array.from(player.tools).map((tool) => ({
        instanceId: tool.instanceId,
        toolId: tool.toolId,
        charges: tool.charges,
        params: parseToolParams(tool.paramsJson)
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
          : roomState.turnInfo.lastRolledToolId,
      toolDieSeed: roomState.turnInfo.toolDieSeed
    },
    eventLog: Array.from(roomState.eventLog).map((entry) => ({
      id: entry.id,
      type: entry.type,
      message: entry.message,
      createdAt: entry.createdAt
    }))
  };
}
