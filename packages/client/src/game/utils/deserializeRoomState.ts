import type {
  CharacterId,
  Direction,
  GameMode,
  GameSnapshot,
  ModifierId,
  TurnPhase,
  RoomPhase,
  PlayerTagMap,
  PlayerTurnFlag,
  RolledToolId,
  SequencedActionPresentation,
  SummonId,
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
  type:
    | "floor"
    | "wall"
    | "earthWall"
    | "highwall"
    | "poison"
    | "pit"
    | "cannon"
    | "lucky"
    | "emptyLucky"
    | "conveyor"
    | "start"
    | "goal";
  durability: number;
  direction: Direction | "";
}

interface RoomPlayerState {
  id: string;
  name: string;
  petId: string;
  color: string;
  boardVisible: boolean;
  characterId: CharacterId;
  modifiers: Iterable<ModifierId>;
  tagsJson: string;
  finishRank: number;
  finishedTurnNumber: number;
  x: number;
  y: number;
  isConnected: boolean;
  isReady: boolean;
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
  source: "turn" | "character_skill";
}

interface RoomSummonState {
  instanceId: string;
  summonId: SummonId;
  ownerId: string;
  x: number;
  y: number;
}

interface RoomTurnInfo {
  currentPlayerId: string;
  phase: TurnPhase;
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
    | "debug_granted"
    | "character_switched"
    | "summon_triggered"
    | "character_action_used"
    | "player_kicked"
    | "player_finished"
    | "match_finished";
  message: string;
  createdAt: number;
}

interface RoomStateShape {
  allowDebugTools: boolean;
  boardWidth: number;
  boardHeight: number;
  hostPlayerId: string;
  mapId: string;
  mapLabel: string;
  mode: GameMode;
  roomCode: string;
  roomPhase: RoomPhase;
  board: SchemaCollection<RoomTileState>;
  summons: SchemaCollection<RoomSummonState>;
  players: SchemaCollection<RoomPlayerState>;
  turnInfo: RoomTurnInfo;
  eventLog: Iterable<RoomEventLogEntry>;
  latestPresentationSequence: number;
  latestPresentationJson: string;
  settlementState: "active" | "complete";
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
  const parsePlayerTags = (tagsJson: string): PlayerTagMap => {
    try {
      return JSON.parse(tagsJson) as PlayerTagMap;
    } catch {
      return {};
    }
  };
  const parseLatestPresentation = (): SequencedActionPresentation | null => {
    if (!roomState.latestPresentationSequence || !roomState.latestPresentationJson) {
      return null;
    }

    try {
      return {
        ...(JSON.parse(roomState.latestPresentationJson) as Omit<SequencedActionPresentation, "sequence">),
        sequence: roomState.latestPresentationSequence
      };
    } catch {
      return null;
    }
  };

  return {
    allowDebugTools: roomState.allowDebugTools,
    boardWidth: roomState.boardWidth,
    boardHeight: roomState.boardHeight,
    hostPlayerId: roomState.hostPlayerId || null,
    mapId: roomState.mapId as GameSnapshot["mapId"],
    mapLabel: roomState.mapLabel,
    mode: roomState.mode,
    roomCode: roomState.roomCode,
    roomPhase: roomState.roomPhase,
    tiles: Array.from(roomState.board.values()).map((tile) => ({
      key: tile.key,
      x: tile.x,
      y: tile.y,
      type: tile.type,
      durability: tile.durability,
      direction: tile.direction === "" ? null : tile.direction
    })),
    summons: Array.from(roomState.summons.values()).map((summon) => ({
      instanceId: summon.instanceId,
      summonId: summon.summonId,
      ownerId: summon.ownerId,
      position: {
        x: summon.x,
        y: summon.y
      }
    })),
    players: Array.from(roomState.players.values()).map((player) => ({
      id: player.id,
      name: player.name,
      petId: player.petId ?? "",
      color: player.color,
      boardVisible: player.boardVisible,
      characterId: player.characterId,
      modifiers: Array.from(player.modifiers),
      tags: parsePlayerTags(player.tagsJson),
      finishRank: player.finishRank > 0 ? player.finishRank : null,
      finishedTurnNumber: player.finishedTurnNumber > 0 ? player.finishedTurnNumber : null,
      isConnected: player.isConnected,
      isReady: player.isReady,
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
        params: parseToolParams(tool.paramsJson),
        source: tool.source === "character_skill" ? "character_skill" : "turn"
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
    })),
    settlementState: roomState.settlementState,
    latestPresentation: parseLatestPresentation()
  };
}
