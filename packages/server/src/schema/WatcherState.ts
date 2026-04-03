import { ArraySchema, MapSchema, Schema, type } from "@colyseus/schema";
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  type CharacterId,
  type GameMode,
  type RoomPhase,
  type RolledToolId,
  type ToolId
} from "@watcher/shared";

// This schema mirrors the authoritative state that Colyseus syncs to every client.
export class TileState extends Schema {
  @type("string") key = "";
  @type("number") x = 0;
  @type("number") y = 0;
  @type("string") type = "floor";
  @type("number") durability = 0;
  @type("string") direction = "";
}

export class TurnToolState extends Schema {
  @type("string") instanceId = "";
  @type("string") toolId: ToolId | "" = "";
  @type("number") charges = 0;
  @type("string") paramsJson = "{}";
  @type("string") source = "turn";
}

export class PlayerState extends Schema {
  @type("string") id = "";
  @type("string") name = "";
  @type("string") petId = "";
  @type("string") color = "";
  @type("string") characterId: CharacterId = "late";
  @type("string") characterStateJson = "{}";
  @type("number") finishRank = 0;
  @type("number") finishedTurnNumber = 0;
  @type("boolean") isConnected = true;
  @type("boolean") isReady = false;
  @type("number") x = 0;
  @type("number") y = 0;
  @type("number") spawnX = 0;
  @type("number") spawnY = 0;
  @type(["string"]) turnFlags = new ArraySchema<string>();
  @type([TurnToolState]) tools = new ArraySchema<TurnToolState>();
}

export class SummonState extends Schema {
  @type("string") instanceId = "";
  @type("string") summonId = "";
  @type("string") ownerId = "";
  @type("number") x = 0;
  @type("number") y = 0;
}

export class TurnInfoState extends Schema {
  @type("string") currentPlayerId = "";
  @type("string") phase = "roll";
  @type("number") turnNumber = 1;
  @type("number") moveRoll = 0;
  @type("string") lastRolledToolId: RolledToolId | "" = "";
  @type("string") turnStartActionsJson = "[]";
  @type("number") toolDieSeed = 1;
}

export class EventLogEntryState extends Schema {
  @type("string") id = "";
  @type("string") type = "";
  @type("string") message = "";
  @type("number") createdAt = 0;
}

export class WatcherState extends Schema {
  @type("string") mapId = "free_default";
  @type("string") mapLabel = "";
  @type("string") mode: GameMode = "free";
  @type("string") roomCode = "";
  @type("string") roomPhase: RoomPhase = "lobby";
  @type("string") hostPlayerId = "";
  @type("boolean") allowDebugTools = true;
  @type("string") settlementState = "active";
  @type("number") boardWidth = BOARD_WIDTH;
  @type("number") boardHeight = BOARD_HEIGHT;
  @type({ map: TileState }) board = new MapSchema<TileState>();
  @type({ map: SummonState }) summons = new MapSchema<SummonState>();
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
  @type(TurnInfoState) turnInfo = new TurnInfoState();
  @type([EventLogEntryState]) eventLog = new ArraySchema<EventLogEntryState>();
  @type("number") latestPresentationSequence = 0;
  @type("string") latestPresentationJson = "";
}
