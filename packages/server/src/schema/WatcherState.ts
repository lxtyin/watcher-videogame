import { ArraySchema, MapSchema, Schema, type } from "@colyseus/schema";
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  DEFAULT_MOVEMENT_ACTIONS,
  DEFAULT_MOVE_POINTS,
  type ToolId
} from "@watcher/shared";

// This schema mirrors the authoritative state that Colyseus syncs to every client.
export class TileState extends Schema {
  @type("string") key = "";
  @type("number") x = 0;
  @type("number") y = 0;
  @type("string") type = "floor";
  @type("number") durability = 0;
}

export class ToolChargeState extends Schema {
  @type("string") id = "";
  @type("number") charges = 0;
}

export class PlayerState extends Schema {
  @type("string") id = "";
  @type("string") name = "";
  @type("string") color = "";
  @type("number") x = 0;
  @type("number") y = 0;
  @type("number") remainingMovePoints = DEFAULT_MOVE_POINTS;
  @type("number") movementActionsRemaining = DEFAULT_MOVEMENT_ACTIONS;
  @type([ToolChargeState]) availableTools = new ArraySchema<ToolChargeState>();
}

export class TurnInfoState extends Schema {
  @type("string") currentPlayerId = "";
  @type("string") phase = "roll";
  @type("number") remainingMovePoints = DEFAULT_MOVE_POINTS;
  @type("number") movementActionsRemaining = DEFAULT_MOVEMENT_ACTIONS;
  @type("number") turnNumber = 1;
  @type("number") moveRoll = 0;
  @type("string") lastRolledToolId: ToolId | "" = "";
}

export class EventLogEntryState extends Schema {
  @type("string") id = "";
  @type("string") type = "";
  @type("string") message = "";
  @type("number") createdAt = 0;
}

export class WatcherState extends Schema {
  @type("number") boardWidth = BOARD_WIDTH;
  @type("number") boardHeight = BOARD_HEIGHT;
  @type({ map: TileState }) board = new MapSchema<TileState>();
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
  @type(TurnInfoState) turnInfo = new TurnInfoState();
  @type([EventLogEntryState]) eventLog = new ArraySchema<EventLogEntryState>();
}
