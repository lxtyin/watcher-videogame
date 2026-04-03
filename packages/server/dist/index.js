var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __decorateClass = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc(target, key) : target;
  for (var i = decorators.length - 1, decorator; i >= 0; i--)
    if (decorator = decorators[i])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result) __defProp(target, key, result);
  return result;
};

// src/index.ts
import http from "http";
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import cors from "cors";
import express from "express";
import { WATCHER_ROOM_NAME } from "@watcher/shared";

// src/rooms/WatcherRoom.ts
import { Room } from "colyseus";
import {
  applyCharacterToolTransforms,
  applyCharacterTurnEndCleanup,
  buildCharacterTurnLoadoutRuntime,
  buildGameMapRuntimeMetadata,
  cloneCharacterState,
  createToolInstance,
  createTurnStartActionSnapshot,
  getCharacterDefinition,
  getCharacterIds,
  getGameMapSpawnPosition,
  getNextActiveRacePlayerId,
  getNextFinishRank,
  markCharacterMovedOutOfTurn,
  prepareCharacterTurnStart,
  PLAYER_COLORS,
  createDebugToolInstance,
  createBoardDefinition,
  createMovementToolInstance,
  createRolledToolInstance,
  findToolInstance,
  getToolDefinition as getToolDefinition2,
  resolveCurrentTileStop,
  resolveToolAction,
  rollMovementDie,
  rollToolDie,
  resolveSettlementState,
  resolveCharacterTurnStartAction
} from "@watcher/shared";

// src/schema/WatcherState.ts
import { ArraySchema, MapSchema, Schema, type } from "@colyseus/schema";
import {
  BOARD_HEIGHT,
  BOARD_WIDTH
} from "@watcher/shared";
var TileState = class extends Schema {
  constructor() {
    super(...arguments);
    this.key = "";
    this.x = 0;
    this.y = 0;
    this.type = "floor";
    this.durability = 0;
    this.direction = "";
  }
};
__decorateClass([
  type("string")
], TileState.prototype, "key", 2);
__decorateClass([
  type("number")
], TileState.prototype, "x", 2);
__decorateClass([
  type("number")
], TileState.prototype, "y", 2);
__decorateClass([
  type("string")
], TileState.prototype, "type", 2);
__decorateClass([
  type("number")
], TileState.prototype, "durability", 2);
__decorateClass([
  type("string")
], TileState.prototype, "direction", 2);
var TurnToolState = class extends Schema {
  constructor() {
    super(...arguments);
    this.instanceId = "";
    this.toolId = "";
    this.charges = 0;
    this.paramsJson = "{}";
    this.source = "turn";
  }
};
__decorateClass([
  type("string")
], TurnToolState.prototype, "instanceId", 2);
__decorateClass([
  type("string")
], TurnToolState.prototype, "toolId", 2);
__decorateClass([
  type("number")
], TurnToolState.prototype, "charges", 2);
__decorateClass([
  type("string")
], TurnToolState.prototype, "paramsJson", 2);
__decorateClass([
  type("string")
], TurnToolState.prototype, "source", 2);
var PlayerState = class extends Schema {
  constructor() {
    super(...arguments);
    this.id = "";
    this.name = "";
    this.petId = "";
    this.color = "";
    this.characterId = "late";
    this.characterStateJson = "{}";
    this.finishRank = 0;
    this.finishedTurnNumber = 0;
    this.isConnected = true;
    this.isReady = false;
    this.x = 0;
    this.y = 0;
    this.spawnX = 0;
    this.spawnY = 0;
    this.turnFlags = new ArraySchema();
    this.tools = new ArraySchema();
  }
};
__decorateClass([
  type("string")
], PlayerState.prototype, "id", 2);
__decorateClass([
  type("string")
], PlayerState.prototype, "name", 2);
__decorateClass([
  type("string")
], PlayerState.prototype, "petId", 2);
__decorateClass([
  type("string")
], PlayerState.prototype, "color", 2);
__decorateClass([
  type("string")
], PlayerState.prototype, "characterId", 2);
__decorateClass([
  type("string")
], PlayerState.prototype, "characterStateJson", 2);
__decorateClass([
  type("number")
], PlayerState.prototype, "finishRank", 2);
__decorateClass([
  type("number")
], PlayerState.prototype, "finishedTurnNumber", 2);
__decorateClass([
  type("boolean")
], PlayerState.prototype, "isConnected", 2);
__decorateClass([
  type("boolean")
], PlayerState.prototype, "isReady", 2);
__decorateClass([
  type("number")
], PlayerState.prototype, "x", 2);
__decorateClass([
  type("number")
], PlayerState.prototype, "y", 2);
__decorateClass([
  type("number")
], PlayerState.prototype, "spawnX", 2);
__decorateClass([
  type("number")
], PlayerState.prototype, "spawnY", 2);
__decorateClass([
  type(["string"])
], PlayerState.prototype, "turnFlags", 2);
__decorateClass([
  type([TurnToolState])
], PlayerState.prototype, "tools", 2);
var SummonState = class extends Schema {
  constructor() {
    super(...arguments);
    this.instanceId = "";
    this.summonId = "";
    this.ownerId = "";
    this.x = 0;
    this.y = 0;
  }
};
__decorateClass([
  type("string")
], SummonState.prototype, "instanceId", 2);
__decorateClass([
  type("string")
], SummonState.prototype, "summonId", 2);
__decorateClass([
  type("string")
], SummonState.prototype, "ownerId", 2);
__decorateClass([
  type("number")
], SummonState.prototype, "x", 2);
__decorateClass([
  type("number")
], SummonState.prototype, "y", 2);
var TurnInfoState = class extends Schema {
  constructor() {
    super(...arguments);
    this.currentPlayerId = "";
    this.phase = "roll";
    this.turnNumber = 1;
    this.moveRoll = 0;
    this.lastRolledToolId = "";
    this.turnStartActionsJson = "[]";
    this.toolDieSeed = 1;
  }
};
__decorateClass([
  type("string")
], TurnInfoState.prototype, "currentPlayerId", 2);
__decorateClass([
  type("string")
], TurnInfoState.prototype, "phase", 2);
__decorateClass([
  type("number")
], TurnInfoState.prototype, "turnNumber", 2);
__decorateClass([
  type("number")
], TurnInfoState.prototype, "moveRoll", 2);
__decorateClass([
  type("string")
], TurnInfoState.prototype, "lastRolledToolId", 2);
__decorateClass([
  type("string")
], TurnInfoState.prototype, "turnStartActionsJson", 2);
__decorateClass([
  type("number")
], TurnInfoState.prototype, "toolDieSeed", 2);
var EventLogEntryState = class extends Schema {
  constructor() {
    super(...arguments);
    this.id = "";
    this.type = "";
    this.message = "";
    this.createdAt = 0;
  }
};
__decorateClass([
  type("string")
], EventLogEntryState.prototype, "id", 2);
__decorateClass([
  type("string")
], EventLogEntryState.prototype, "type", 2);
__decorateClass([
  type("string")
], EventLogEntryState.prototype, "message", 2);
__decorateClass([
  type("number")
], EventLogEntryState.prototype, "createdAt", 2);
var WatcherState = class extends Schema {
  constructor() {
    super(...arguments);
    this.mapId = "free_default";
    this.mapLabel = "";
    this.mode = "free";
    this.roomCode = "";
    this.roomPhase = "lobby";
    this.hostPlayerId = "";
    this.allowDebugTools = true;
    this.settlementState = "active";
    this.boardWidth = BOARD_WIDTH;
    this.boardHeight = BOARD_HEIGHT;
    this.board = new MapSchema();
    this.summons = new MapSchema();
    this.players = new MapSchema();
    this.turnInfo = new TurnInfoState();
    this.eventLog = new ArraySchema();
    this.latestPresentationSequence = 0;
    this.latestPresentationJson = "";
  }
};
__decorateClass([
  type("string")
], WatcherState.prototype, "mapId", 2);
__decorateClass([
  type("string")
], WatcherState.prototype, "mapLabel", 2);
__decorateClass([
  type("string")
], WatcherState.prototype, "mode", 2);
__decorateClass([
  type("string")
], WatcherState.prototype, "roomCode", 2);
__decorateClass([
  type("string")
], WatcherState.prototype, "roomPhase", 2);
__decorateClass([
  type("string")
], WatcherState.prototype, "hostPlayerId", 2);
__decorateClass([
  type("boolean")
], WatcherState.prototype, "allowDebugTools", 2);
__decorateClass([
  type("string")
], WatcherState.prototype, "settlementState", 2);
__decorateClass([
  type("number")
], WatcherState.prototype, "boardWidth", 2);
__decorateClass([
  type("number")
], WatcherState.prototype, "boardHeight", 2);
__decorateClass([
  type({ map: TileState })
], WatcherState.prototype, "board", 2);
__decorateClass([
  type({ map: SummonState })
], WatcherState.prototype, "summons", 2);
__decorateClass([
  type({ map: PlayerState })
], WatcherState.prototype, "players", 2);
__decorateClass([
  type(TurnInfoState)
], WatcherState.prototype, "turnInfo", 2);
__decorateClass([
  type([EventLogEntryState])
], WatcherState.prototype, "eventLog", 2);
__decorateClass([
  type("number")
], WatcherState.prototype, "latestPresentationSequence", 2);
__decorateClass([
  type("string")
], WatcherState.prototype, "latestPresentationJson", 2);

// src/rooms/roomEventLog.ts
import {
  getToolDefinition
} from "@watcher/shared";
function pushRoomEvent(state, type2, message) {
  const entry = new EventLogEntryState();
  entry.id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  entry.type = type2;
  entry.message = message;
  entry.createdAt = Date.now();
  state.eventLog.push(entry);
  while (state.eventLog.length > 10) {
    state.eventLog.shift();
  }
}
function pushTerrainEvents(state, actorId, triggeredTerrainEffects) {
  for (const terrainEffect of triggeredTerrainEffects) {
    const affectedPlayer = state.players.get(terrainEffect.playerId);
    const actor = state.players.get(actorId);
    if (!affectedPlayer) {
      continue;
    }
    if (terrainEffect.kind === "pit") {
      pushRoomEvent(
        state,
        "player_respawned",
        `${affectedPlayer.name} fell into a pit and respawned at (${terrainEffect.respawnPosition.x}, ${terrainEffect.respawnPosition.y}).`
      );
      continue;
    }
    if (terrainEffect.kind === "lucky") {
      pushRoomEvent(
        state,
        "terrain_triggered",
        `${affectedPlayer.name} landed on a lucky block and gained ${getToolDefinition(terrainEffect.grantedTool.toolId).label}.`
      );
      continue;
    }
    if (terrainEffect.kind === "conveyor_boost" && actor) {
      pushRoomEvent(
        state,
        "terrain_triggered",
        `${actor.name} rode a conveyor for +${terrainEffect.bonusMovePoints} move points.`
      );
      continue;
    }
    if (terrainEffect.kind === "conveyor_turn" && actor) {
      pushRoomEvent(
        state,
        "terrain_triggered",
        `${actor.name} was redirected from ${terrainEffect.fromDirection} to ${terrainEffect.toDirection}.`
      );
    }
  }
}
function pushSummonEvents(state, triggeredSummonEffects) {
  for (const summonEffect of triggeredSummonEffects) {
    if (summonEffect.kind !== "wallet_pickup") {
      continue;
    }
    const player = state.players.get(summonEffect.playerId);
    if (!player) {
      continue;
    }
    pushRoomEvent(
      state,
      "summon_triggered",
      `${player.name} picked up a wallet and gained ${getToolDefinition(summonEffect.grantedTool.toolId).label}.`
    );
  }
}

// src/rooms/roomStateMappers.ts
function createBoardDefinitionFromState(state) {
  return {
    width: state.boardWidth,
    height: state.boardHeight,
    tiles: Array.from(state.board.values()).map((tile) => ({
      key: tile.key,
      x: tile.x,
      y: tile.y,
      type: tile.type,
      durability: tile.durability,
      direction: tile.direction === "" ? null : tile.direction
    }))
  };
}
function createBoardPlayersFromState(state) {
  return Array.from(state.players.values()).map((entry) => ({
    id: entry.id,
    characterId: entry.characterId,
    characterState: parseCharacterState(entry.characterStateJson),
    position: {
      x: entry.x,
      y: entry.y
    },
    spawnPosition: {
      x: entry.spawnX,
      y: entry.spawnY
    },
    turnFlags: Array.from(entry.turnFlags)
  }));
}
function parseCharacterState(characterStateJson) {
  try {
    return JSON.parse(characterStateJson);
  } catch {
    return {};
  }
}
function createBoardSummonsFromState(state) {
  return Array.from(state.summons.values()).map((entry) => ({
    instanceId: entry.instanceId,
    summonId: entry.summonId,
    ownerId: entry.ownerId,
    position: {
      x: entry.x,
      y: entry.y
    }
  }));
}
function createPlayerToolsFromState(player) {
  const parseToolParams = (paramsJson) => {
    try {
      return JSON.parse(paramsJson);
    } catch {
      return {};
    }
  };
  return Array.from(player.tools).map((tool) => ({
    instanceId: tool.instanceId,
    toolId: tool.toolId,
    charges: tool.charges,
    params: parseToolParams(tool.paramsJson),
    source: tool.source === "character_skill" ? "character_skill" : "turn"
  }));
}

// src/rooms/roomStateMutations.ts
function clearPlayerTurnResources(player) {
  while (player.tools.length > 0) {
    player.tools.pop();
  }
  while (player.turnFlags.length > 0) {
    player.turnFlags.pop();
  }
}
function applyToolInventory(player, tools, normalizeTools) {
  const normalizedTools = normalizeTools(tools);
  while (player.tools.length > 0) {
    player.tools.pop();
  }
  for (const tool of normalizedTools) {
    const toolState = new TurnToolState();
    toolState.instanceId = tool.instanceId;
    toolState.toolId = tool.toolId;
    toolState.charges = tool.charges;
    toolState.paramsJson = JSON.stringify(tool.params);
    toolState.source = tool.source;
    player.tools.push(toolState);
  }
}
function applyPlayerTurnFlags(player, turnFlags) {
  while (player.turnFlags.length > 0) {
    player.turnFlags.pop();
  }
  for (const turnFlag of turnFlags) {
    player.turnFlags.push(turnFlag);
  }
}
function applyCharacterState(player, characterState) {
  player.characterStateJson = JSON.stringify(characterState);
}
function applyTileMutations(state, tileMutations) {
  for (const mutation of tileMutations) {
    const tile = state.board.get(mutation.key);
    if (!tile) {
      continue;
    }
    tile.type = mutation.nextType;
    tile.durability = mutation.nextDurability;
    tile.direction = "";
  }
}
function applySummonMutations(state, summonMutations) {
  for (const mutation of summonMutations) {
    if (mutation.kind === "remove") {
      state.summons.delete(mutation.instanceId);
      continue;
    }
    const summonState = state.summons.get(mutation.instanceId) ?? new SummonState();
    summonState.instanceId = mutation.instanceId;
    summonState.summonId = mutation.summonId;
    summonState.ownerId = mutation.ownerId;
    summonState.x = mutation.position.x;
    summonState.y = mutation.position.y;
    state.summons.set(mutation.instanceId, summonState);
  }
}
function applyAffectedPlayerMoves(state, affectedPlayers, applyFlags, applyCharacterStatePatch) {
  for (const affectedPlayer of affectedPlayers) {
    const player = state.players.get(affectedPlayer.playerId);
    if (!player) {
      continue;
    }
    player.x = affectedPlayer.target.x;
    player.y = affectedPlayer.target.y;
    if (affectedPlayer.turnFlags) {
      applyFlags(player, affectedPlayer.turnFlags);
    }
    if (affectedPlayer.characterState) {
      applyCharacterStatePatch(player, affectedPlayer.characterState);
    }
  }
}

// src/rooms/WatcherRoom.ts
var RECONNECTION_WINDOW_SECONDS = 45;
function pickRandomPlayerColor(players) {
  const usedColors = new Set(Array.from(players).map((player) => player.color));
  const availableColors = PLAYER_COLORS.filter((color) => !usedColors.has(color));
  const palette = availableColors.length ? availableColors : PLAYER_COLORS;
  const randomIndex = Math.floor(Math.random() * palette.length);
  return palette[randomIndex] ?? "#ec6f5a";
}
var WatcherRoom = class extends Room {
  constructor() {
    super(...arguments);
    this.moveDieSeed = 11;
    this.toolDieSeed = 1;
    this.nextToolInstanceSerial = 1;
    this.nextPresentationSequence = 1;
  }
  // Room bootstrap wires the authoritative board state and all gameplay messages.
  onCreate(options = {}) {
    this.autoDispose = false;
    this.maxClients = 8;
    this.setPatchRate(1e3 / 15);
    this.setState(new WatcherState());
    const mapMetadata = buildGameMapRuntimeMetadata(options.mapId);
    this.state.mapId = mapMetadata.mapId;
    this.state.mapLabel = mapMetadata.mapLabel;
    this.state.mode = mapMetadata.mode;
    this.state.roomCode = this.roomId;
    this.state.roomPhase = "lobby";
    this.state.hostPlayerId = "";
    this.state.allowDebugTools = mapMetadata.allowDebugTools;
    this.state.settlementState = "active";
    this.seedBoard();
    this.resetTurnState(1);
    this.state.turnInfo.toolDieSeed = this.toolDieSeed;
    this.onMessage("rollDice", (client) => {
      this.handleRollDice(client);
    });
    this.onMessage("useTurnStartAction", (client, payload) => {
      this.handleUseTurnStartAction(client, payload);
    });
    this.onMessage("useTool", (client, payload) => {
      this.handleUseTool(client, payload);
    });
    this.onMessage("endTurn", (client) => {
      this.handleEndTurn(client);
    });
    this.onMessage("grantDebugTool", (client, payload) => {
      this.handleGrantDebugTool(client, payload);
    });
    this.onMessage("setCharacter", (client, payload) => {
      this.handleSetCharacter(client, payload);
    });
    this.onMessage("setReady", (client, payload) => {
      this.handleSetReady(client, payload);
    });
    this.onMessage("startGame", (client) => {
      this.handleStartGame(client);
    });
    this.onMessage("returnToRoom", (client) => {
      this.handleReturnToRoom(client);
    });
  }
  // Joining players enter the lobby first, while reconnects reclaim the previous seat.
  onJoin(client, options) {
    const existingPlayer = this.state.players.get(client.sessionId);
    if (existingPlayer) {
      existingPlayer.isConnected = true;
      if (options.requestedPlayerName?.trim()) {
        existingPlayer.name = options.requestedPlayerName.trim();
      }
      if (options.requestedPetId?.trim()) {
        existingPlayer.petId = options.requestedPetId.trim();
      }
      this.pushEvent("turn_started", `${existingPlayer.name} reconnected to room ${this.state.roomCode}.`);
      return;
    }
    const spawnIndex = this.state.players.size;
    const characterIds = getCharacterIds();
    const spawn = getGameMapSpawnPosition(this.state.mapId, spawnIndex);
    const player = new PlayerState();
    player.id = client.sessionId;
    player.name = options.requestedPlayerName?.trim() || `Player ${this.state.players.size + 1}`;
    player.petId = options.requestedPetId?.trim() || "";
    player.color = pickRandomPlayerColor(this.state.players.values());
    player.characterId = characterIds[spawnIndex % characterIds.length] ?? "late";
    player.characterStateJson = "{}";
    player.finishRank = 0;
    player.finishedTurnNumber = 0;
    player.isConnected = true;
    player.isReady = false;
    player.x = spawn.x;
    player.y = spawn.y;
    player.spawnX = spawn.x;
    player.spawnY = spawn.y;
    clearPlayerTurnResources(player);
    this.state.players.set(client.sessionId, player);
    this.state.hostPlayerId ||= client.sessionId;
    this.pushEvent("turn_started", `${player.name} joined room ${this.state.roomCode}.`);
  }
  // Disconnects reserve the seat briefly so refreshes can reconnect without losing state.
  async onLeave(client, consented) {
    const leavingPlayer = this.state.players.get(client.sessionId);
    if (!leavingPlayer) {
      return;
    }
    leavingPlayer.isConnected = false;
    leavingPlayer.isReady = false;
    if (!consented) {
      this.pushEvent("turn_started", `${leavingPlayer.name} disconnected. Waiting to reconnect.`);
      try {
        await this.allowReconnection(client, RECONNECTION_WINDOW_SECONDS);
        const reconnectedPlayer = this.state.players.get(client.sessionId);
        if (reconnectedPlayer) {
          reconnectedPlayer.isConnected = true;
          this.pushEvent(
            "turn_started",
            `${reconnectedPlayer.name} returned to room ${this.state.roomCode}.`
          );
        }
        return;
      } catch {
      }
    }
    this.removePlayer(
      client.sessionId,
      consented ? `${leavingPlayer.name} left room ${this.state.roomCode}.` : `${leavingPlayer.name} did not reconnect in time and was removed.`
    );
  }
  // Board seeding mirrors the shared default layout into Colyseus schema state.
  seedBoard() {
    const board = createBoardDefinition(this.state.mapId);
    this.state.boardWidth = board.width;
    this.state.boardHeight = board.height;
    this.state.board.clear();
    for (const tile of board.tiles) {
      const tileState = new TileState();
      tileState.key = tile.key;
      tileState.x = tile.x;
      tileState.y = tile.y;
      tileState.type = tile.type;
      tileState.durability = tile.durability;
      tileState.direction = tile.direction ?? "";
      this.state.board.set(tile.key, tileState);
    }
  }
  // Presentation payloads are serialized once so clients can replay the same semantic timeline.
  publishActionPresentation(presentation) {
    if (!presentation) {
      return;
    }
    this.state.latestPresentationSequence = this.nextPresentationSequence;
    this.nextPresentationSequence += 1;
    this.state.latestPresentationJson = JSON.stringify(presentation);
  }
  createLoadoutTool(loadout) {
    return createToolInstance(this.createToolInstanceId(loadout.toolId), loadout.toolId, {
      ...loadout.charges !== void 0 ? { charges: loadout.charges } : {},
      ...loadout.params ? { params: loadout.params } : {},
      ...loadout.source ? { source: loadout.source } : {}
    });
  }
  getPlayerCharacterState(player) {
    return parseCharacterState(player.characterStateJson);
  }
  applyPlayerCharacterState(player, characterState) {
    applyCharacterState(player, characterState);
  }
  resetTurnState(turnNumber) {
    this.state.turnInfo.currentPlayerId = "";
    this.state.turnInfo.phase = "roll";
    this.state.turnInfo.moveRoll = 0;
    this.state.turnInfo.lastRolledToolId = "";
    this.state.turnInfo.turnStartActionsJson = "[]";
    this.state.turnInfo.toolDieSeed = this.toolDieSeed;
    this.state.turnInfo.turnNumber = turnNumber;
  }
  clearEventLog() {
    while (this.state.eventLog.length > 0) {
      this.state.eventLog.pop();
    }
  }
  clearPresentationState() {
    this.state.latestPresentationSequence = 0;
    this.state.latestPresentationJson = "";
    this.nextPresentationSequence = 1;
  }
  clearSummonsState() {
    this.state.summons.clear();
  }
  resetMatchRuntimeState() {
    this.moveDieSeed = 11;
    this.toolDieSeed = 1;
    this.nextToolInstanceSerial = 1;
    this.clearSummonsState();
    this.clearPresentationState();
    this.seedBoard();
    this.state.settlementState = "active";
  }
  resetPlayersForCurrentMap(clearReady) {
    const playerOrder = this.getPlayerOrder();
    playerOrder.forEach((playerId, index) => {
      const player = this.state.players.get(playerId);
      if (!player) {
        return;
      }
      const spawn = getGameMapSpawnPosition(this.state.mapId, index);
      player.x = spawn.x;
      player.y = spawn.y;
      player.spawnX = spawn.x;
      player.spawnY = spawn.y;
      player.finishRank = 0;
      player.finishedTurnNumber = 0;
      player.characterStateJson = "{}";
      if (clearReady) {
        player.isReady = false;
      }
      clearPlayerTurnResources(player);
    });
  }
  resetRoomToLobbyState() {
    this.state.roomPhase = "lobby";
    this.resetMatchRuntimeState();
    this.resetPlayersForCurrentMap(true);
    this.resetTurnState(1);
    this.clearEventLog();
    void this.unlock();
  }
  reassignHostIfNeeded() {
    if (this.state.hostPlayerId && this.state.players.has(this.state.hostPlayerId)) {
      return;
    }
    this.state.hostPlayerId = this.getPlayerOrder()[0] ?? "";
  }
  removePlayer(playerId, message) {
    const wasActivePlayer = this.state.turnInfo.currentPlayerId === playerId;
    this.state.players.delete(playerId);
    this.reassignHostIfNeeded();
    if (!this.state.players.size) {
      this.resetRoomToLobbyState();
      this.state.hostPlayerId = "";
      this.clearEventLog();
      return;
    }
    if (this.state.roomPhase === "in_game" && wasActivePlayer) {
      const nextPlayerId = this.getNextPlayerId(playerId);
      if (nextPlayerId) {
        this.beginTurnFor(nextPlayerId, true);
      } else if (this.isRaceMode()) {
        this.enterSettlementState();
      } else {
        this.resetTurnState(this.state.turnInfo.turnNumber);
      }
    }
    this.pushEvent("turn_started", message);
  }
  getConnectedPlayers() {
    return Array.from(this.state.players.values()).filter(
      (player) => player.isConnected
    );
  }
  areAllConnectedPlayersReady() {
    const connectedPlayers = this.getConnectedPlayers();
    return connectedPlayers.length > 0 && connectedPlayers.every((player) => player.isReady);
  }
  startMatch() {
    this.state.roomPhase = "in_game";
    this.resetMatchRuntimeState();
    this.resetPlayersForCurrentMap(true);
    this.resetTurnState(1);
    this.clearEventLog();
    void this.lock();
    const firstPlayerId = this.getPlayerOrder()[0];
    if (firstPlayerId) {
      this.beginTurnFor(firstPlayerId, false);
    }
  }
  // Character loadouts are added at roll time, while passive transforms are reused on every inventory write.
  buildTurnActionTools(player, baseTools) {
    const runtimeLoadout = buildCharacterTurnLoadoutRuntime(
      player.characterId,
      this.getPlayerCharacterState(player)
    );
    this.applyPlayerCharacterState(player, runtimeLoadout.nextCharacterState);
    return applyCharacterToolTransforms(player.characterId, [
      ...baseTools,
      ...runtimeLoadout.loadout.map((loadout) => this.createLoadoutTool(loadout))
    ]);
  }
  isRaceMode() {
    return this.state.mode === "race";
  }
  isPlayerFinished(player) {
    return player.finishRank > 0;
  }
  enterSettlementState() {
    this.state.roomPhase = "settlement";
    this.resetTurnState(this.state.turnInfo.turnNumber);
    this.state.settlementState = "complete";
  }
  applyRaceGoalProgress(actorId, triggeredTerrainEffects) {
    if (!this.isRaceMode()) {
      return {
        actorFinished: false,
        settlementComplete: false
      };
    }
    let actorFinished = false;
    const goalPlayerIds = [
      ...new Set(
        triggeredTerrainEffects.filter((effect) => effect.kind === "goal").map((effect) => effect.playerId)
      )
    ];
    for (const playerId of goalPlayerIds) {
      const player = this.state.players.get(playerId);
      if (!player || this.isPlayerFinished(player)) {
        continue;
      }
      player.finishRank = getNextFinishRank(
        Array.from(this.state.players.values()).map((entry) => ({
          id: entry.id,
          finishRank: entry.finishRank || null,
          finishedTurnNumber: entry.finishedTurnNumber || null
        }))
      );
      player.finishedTurnNumber = this.state.turnInfo.turnNumber;
      actorFinished = actorFinished || player.id === actorId;
      this.pushEvent(
        "player_finished",
        `${player.name} reached the goal on turn ${this.state.turnInfo.turnNumber} and finished #${player.finishRank}.`
      );
    }
    const settlementState = resolveSettlementState(
      this.state.mode,
      Array.from(this.state.players.values()).map((entry) => ({
        id: entry.id,
        finishRank: entry.finishRank || null,
        finishedTurnNumber: entry.finishedTurnNumber || null
      }))
    );
    const settlementComplete = settlementState === "complete";
    if (settlementComplete && this.state.settlementState !== "complete") {
      this.enterSettlementState();
      this.pushEvent("match_finished", "All players reached the goal. Settlement is ready.");
    } else {
      this.state.settlementState = settlementState;
    }
    return {
      actorFinished,
      settlementComplete
    };
  }
  applyTurnStartStop(player) {
    const stopResolution = resolveCurrentTileStop(
      {
        activeTool: null,
        actorId: player.id,
        board: createBoardDefinitionFromState(this.state),
        players: createBoardPlayersFromState(this.state),
        sourceId: `turn-start:${player.id}:${this.state.turnInfo.turnNumber}`,
        summons: createBoardSummonsFromState(this.state)
      },
      {
        player: {
          characterId: player.characterId,
          characterState: cloneCharacterState(this.getPlayerCharacterState(player)),
          id: player.id,
          position: { x: player.x, y: player.y },
          spawnPosition: { x: player.spawnX, y: player.spawnY },
          turnFlags: Array.from(player.turnFlags)
        },
        toolDieSeed: this.toolDieSeed,
        tools: createPlayerToolsFromState(player)
      }
    );
    player.x = stopResolution.actor.position.x;
    player.y = stopResolution.actor.position.y;
    this.applyPlayerCharacterState(player, stopResolution.actor.characterState);
    applyPlayerTurnFlags(player, stopResolution.actor.turnFlags);
    applyToolInventory(player, stopResolution.tools, (tools) => this.normalizePlayerTools(player, tools));
    applyTileMutations(this.state, stopResolution.tileMutations);
    applySummonMutations(this.state, stopResolution.summonMutations);
    this.toolDieSeed = stopResolution.nextToolDieSeed;
    this.state.turnInfo.toolDieSeed = this.toolDieSeed;
    pushTerrainEvents(this.state, player.id, stopResolution.triggeredTerrainEffects);
    pushSummonEvents(this.state, stopResolution.triggeredSummonEffects);
    return stopResolution.triggeredTerrainEffects;
  }
  normalizePlayerTools(player, tools) {
    return applyCharacterToolTransforms(player.characterId, tools);
  }
  refreshTurnStartActions(player, actionIds) {
    this.state.turnInfo.turnStartActionsJson = JSON.stringify(
      actionIds.map((actionId) => createTurnStartActionSnapshot(actionId, player.characterId))
    );
  }
  prepareTurnStartState(player) {
    const preparation = prepareCharacterTurnStart(
      player.characterId,
      this.getPlayerCharacterState(player)
    );
    this.applyPlayerCharacterState(player, preparation.nextCharacterState);
    return preparation;
  }
  enterActionPhaseWithRoll(player, moveRoll, rolledTool) {
    applyToolInventory(
      player,
      this.buildTurnActionTools(player, [
        ...createPlayerToolsFromState(player),
        createMovementToolInstance(this.createToolInstanceId("movement"), moveRoll),
        ...rolledTool ? [rolledTool] : []
      ]),
      (tools) => this.normalizePlayerTools(player, tools)
    );
    this.state.turnInfo.phase = "action";
    this.state.turnInfo.moveRoll = moveRoll;
    this.state.turnInfo.lastRolledToolId = rolledTool?.toolId ?? "";
    this.state.turnInfo.turnStartActionsJson = "[]";
    this.state.turnInfo.toolDieSeed = this.toolDieSeed;
  }
  finishTurn(player) {
    this.pushEvent("turn_ended", `${player.name} ended the turn.`);
    this.applyPlayerCharacterState(
      player,
      applyCharacterTurnEndCleanup(player.characterId, this.getPlayerCharacterState(player))
    );
    clearPlayerTurnResources(player);
    const nextPlayerId = this.getNextPlayerId(player.id);
    if (nextPlayerId) {
      this.beginTurnFor(nextPlayerId, true);
    } else {
      this.enterSettlementState();
    }
  }
  // Starting a turn resets dice results and tool inventory for the chosen player.
  beginTurnFor(playerId, shouldAdvanceTurnNumber) {
    const player = this.state.players.get(playerId);
    if (!player) {
      return;
    }
    const preparation = this.prepareTurnStartState(player);
    clearPlayerTurnResources(player);
    this.state.turnInfo.currentPlayerId = playerId;
    this.state.turnInfo.phase = "roll";
    this.state.turnInfo.moveRoll = 0;
    this.state.turnInfo.lastRolledToolId = "";
    this.refreshTurnStartActions(player, preparation.turnStartActions);
    this.state.turnInfo.toolDieSeed = this.toolDieSeed;
    if (shouldAdvanceTurnNumber) {
      this.state.turnInfo.turnNumber += 1;
    }
    this.pushEvent("turn_started", `${player.name}'s turn started. Roll the dice.`);
    const triggeredTerrainEffects = this.applyTurnStartStop(player);
    const goalProgress = this.applyRaceGoalProgress(player.id, triggeredTerrainEffects);
    if (!goalProgress.actorFinished || goalProgress.settlementComplete) {
      return;
    }
    clearPlayerTurnResources(player);
    const nextPlayerId = this.getNextPlayerId(player.id);
    if (nextPlayerId) {
      this.beginTurnFor(nextPlayerId, true);
    } else {
      this.enterSettlementState();
      this.pushEvent("match_finished", "All players reached the goal. Settlement is ready.");
    }
  }
  // Player order follows the current schema insertion order.
  getPlayerOrder() {
    return Array.from(this.state.players.values()).map((player) => player.id);
  }
  // Next-player lookup wraps around the active player list after removals.
  getNextPlayerId(currentPlayerId) {
    if (this.isRaceMode()) {
      return getNextActiveRacePlayerId(
        this.getPlayerOrder(),
        Array.from(this.state.players.values()).map((player) => ({
          id: player.id,
          finishRank: player.finishRank || null,
          finishedTurnNumber: player.finishedTurnNumber || null
        })),
        currentPlayerId
      );
    }
    const playerOrder = this.getPlayerOrder();
    const currentIndex = playerOrder.findIndex((playerId) => playerId === currentPlayerId);
    if (currentIndex === -1) {
      return playerOrder[0] ?? null;
    }
    return playerOrder[(currentIndex + 1) % playerOrder.length] ?? null;
  }
  // Action handlers reuse one turn guard so out-of-turn input never reaches the resolver.
  ensureActivePlayer(client) {
    const player = this.state.players.get(client.sessionId);
    if (!player) {
      return null;
    }
    if (this.state.roomPhase !== "in_game") {
      this.pushEvent("move_blocked", `${player.name} cannot act before the game starts.`);
      return null;
    }
    if (this.state.turnInfo.currentPlayerId !== client.sessionId) {
      this.pushEvent("move_blocked", `${player.name} tried to act out of turn.`);
      return null;
    }
    return player;
  }
  handleSetReady(client, payload) {
    const player = this.state.players.get(client.sessionId);
    if (!player) {
      return;
    }
    if (this.state.roomPhase !== "lobby") {
      this.pushEvent("move_blocked", `${player.name} cannot change ready state right now.`);
      return;
    }
    player.isReady = payload.isReady;
    this.pushEvent(
      "turn_started",
      payload.isReady ? `${player.name} is ready.` : `${player.name} is no longer ready.`
    );
  }
  handleStartGame(client) {
    const player = this.state.players.get(client.sessionId);
    if (!player) {
      return;
    }
    if (this.state.roomPhase !== "lobby") {
      this.pushEvent("move_blocked", `${player.name} cannot start the match right now.`);
      return;
    }
    if (this.state.hostPlayerId !== client.sessionId) {
      this.pushEvent("move_blocked", `${player.name} is not the host.`);
      return;
    }
    if (!this.areAllConnectedPlayersReady()) {
      this.pushEvent("move_blocked", `${player.name} cannot start until everyone is ready.`);
      return;
    }
    this.startMatch();
  }
  handleReturnToRoom(client) {
    const player = this.state.players.get(client.sessionId);
    if (!player) {
      return;
    }
    if (this.state.roomPhase !== "settlement") {
      this.pushEvent("move_blocked", `${player.name} can only return after settlement.`);
      return;
    }
    this.resetRoomToLobbyState();
    this.pushEvent("turn_started", `${player.name} reopened room ${this.state.roomCode}.`);
  }
  // Rolling creates the per-turn Movement tool and one additional rolled tool.
  handleRollDice(client) {
    const player = this.ensureActivePlayer(client);
    if (!player) {
      return;
    }
    if (this.state.turnInfo.phase !== "roll") {
      this.pushEvent("move_blocked", `${player.name} cannot roll right now.`);
      return;
    }
    const moveRoll = rollMovementDie(this.moveDieSeed);
    this.moveDieSeed = moveRoll.nextSeed;
    const toolRoll = rollToolDie(this.toolDieSeed);
    this.toolDieSeed = toolRoll.nextSeed;
    this.enterActionPhaseWithRoll(
      player,
      moveRoll.value,
      createRolledToolInstance(this.createToolInstanceId(toolRoll.value.toolId), toolRoll.value)
    );
    this.pushEvent(
      "dice_rolled",
      `${player.name} rolled Movement ${moveRoll.value} and ${getToolDefinition2(toolRoll.value.toolId).label}.`
    );
  }
  handleUseTurnStartAction(client, payload) {
    const player = this.ensureActivePlayer(client);
    if (!player) {
      return;
    }
    if (this.state.turnInfo.phase !== "roll") {
      this.pushEvent("move_blocked", `${player.name} can only use this action before rolling.`);
      return;
    }
    const availableActions = JSON.parse(this.state.turnInfo.turnStartActionsJson);
    if (!availableActions.some((action) => action.actionId === payload.actionId)) {
      this.pushEvent("move_blocked", `${player.name} cannot use that roll-phase action right now.`);
      return;
    }
    const resolution = resolveCharacterTurnStartAction(
      player.characterId,
      this.getPlayerCharacterState(player),
      payload.actionId
    );
    if (!resolution) {
      this.pushEvent("move_blocked", `${player.name} cannot use that roll-phase action right now.`);
      return;
    }
    this.applyPlayerCharacterState(player, resolution.nextCharacterState);
    this.pushEvent("character_action_used", `${player.name} used ${payload.actionId}.`);
    if (resolution.endTurn) {
      this.finishTurn(player);
      return;
    }
    if (resolution.skipToolDie) {
      const moveRoll = rollMovementDie(this.moveDieSeed);
      this.moveDieSeed = moveRoll.nextSeed;
      this.enterActionPhaseWithRoll(player, moveRoll.value, null);
      this.pushEvent(
        "dice_rolled",
        `${player.name} rolled Movement ${moveRoll.value} and skipped the tool die.`
      );
    }
  }
  // Tool usage delegates rule resolution to the shared layer, then mirrors the result into schema state.
  handleUseTool(client, payload) {
    const player = this.ensureActivePlayer(client);
    if (!player) {
      return;
    }
    if (this.state.turnInfo.phase !== "action") {
      this.pushEvent("move_blocked", `${player.name} must roll dice first.`);
      return;
    }
    const tools = createPlayerToolsFromState(player);
    const activeTool = findToolInstance(tools, payload.toolInstanceId);
    if (!activeTool) {
      this.pushEvent("move_blocked", `${player.name} does not have that tool this turn.`);
      return;
    }
    const toolDefinition = getToolDefinition2(activeTool.toolId);
    if (toolDefinition.targetMode === "direction" && !payload.direction) {
      this.pushEvent("move_blocked", `${toolDefinition.label} needs a direction.`);
      return;
    }
    if (toolDefinition.targetMode === "tile" && !payload.targetPosition) {
      this.pushEvent("move_blocked", `${toolDefinition.label} needs a target tile.`);
      return;
    }
    if (toolDefinition.targetMode === "choice" && !payload.choiceId) {
      this.pushEvent("move_blocked", `${toolDefinition.label} needs a choice.`);
      return;
    }
    if (toolDefinition.targetMode === "tile_direction" && (!payload.targetPosition || !payload.direction)) {
      this.pushEvent("move_blocked", `${toolDefinition.label} needs both a tile and a direction.`);
      return;
    }
    const resolution = resolveToolAction({
      board: createBoardDefinitionFromState(this.state),
      actor: {
        id: player.id,
        characterId: player.characterId,
        characterState: cloneCharacterState(this.getPlayerCharacterState(player)),
        position: { x: player.x, y: player.y },
        spawnPosition: { x: player.spawnX, y: player.spawnY },
        turnFlags: Array.from(player.turnFlags)
      },
      activeTool,
      toolDieSeed: this.toolDieSeed,
      tools,
      summons: createBoardSummonsFromState(this.state),
      ...payload.direction ? { direction: payload.direction } : {},
      ...payload.choiceId ? { choiceId: payload.choiceId } : {},
      ...payload.targetPosition ? { targetPosition: payload.targetPosition } : {},
      players: createBoardPlayersFromState(this.state)
    });
    if (resolution.kind === "blocked") {
      this.pushEvent(
        "move_blocked",
        `${player.name} cannot use ${toolDefinition.label}: ${resolution.reason}.`
      );
      return;
    }
    player.x = resolution.actor.position.x;
    player.y = resolution.actor.position.y;
    this.applyPlayerCharacterState(player, resolution.actor.characterState);
    applyPlayerTurnFlags(player, resolution.actor.turnFlags);
    applyToolInventory(player, resolution.tools, (tools2) => this.normalizePlayerTools(player, tools2));
    applyTileMutations(this.state, resolution.tileMutations);
    applySummonMutations(this.state, resolution.summonMutations);
    applyAffectedPlayerMoves(
      this.state,
      resolution.affectedPlayers,
      applyPlayerTurnFlags,
      applyCharacterState
    );
    for (const affectedPlayer of resolution.affectedPlayers) {
      if (affectedPlayer.playerId === player.id) {
        continue;
      }
      const movedPlayer = this.state.players.get(affectedPlayer.playerId);
      if (!movedPlayer) {
        continue;
      }
      this.applyPlayerCharacterState(
        movedPlayer,
        markCharacterMovedOutOfTurn(
          movedPlayer.characterId,
          this.getPlayerCharacterState(movedPlayer)
        )
      );
    }
    this.toolDieSeed = resolution.nextToolDieSeed;
    this.state.turnInfo.toolDieSeed = this.toolDieSeed;
    this.publishActionPresentation(resolution.presentation);
    if (resolution.tileMutations.some(
      (mutation) => mutation.nextType === "floor"
    )) {
      this.pushEvent("earth_wall_broken", `${player.name} broke an earth wall while moving.`);
    }
    pushTerrainEvents(this.state, player.id, resolution.triggeredTerrainEffects);
    pushSummonEvents(this.state, resolution.triggeredSummonEffects);
    const goalProgress = this.applyRaceGoalProgress(player.id, resolution.triggeredTerrainEffects);
    if (activeTool.toolId === "movement") {
      this.pushEvent(
        "piece_moved",
        `${player.name} used Movement ${payload.direction} to (${player.x}, ${player.y}).`
      );
    } else {
      this.pushEvent("tool_used", `${player.name} used ${toolDefinition.label}.`);
    }
    if (goalProgress.actorFinished) {
      clearPlayerTurnResources(player);
      if (!goalProgress.settlementComplete) {
        const nextPlayerId = this.getNextPlayerId(player.id);
        if (nextPlayerId) {
          this.beginTurnFor(nextPlayerId, true);
        }
      }
      return;
    }
    if (!resolution.endsTurn) {
      return;
    }
    this.finishTurn(player);
  }
  // Ending a turn clears transient resources and advances authority to the next player.
  handleEndTurn(client) {
    const player = this.ensureActivePlayer(client);
    if (!player) {
      return;
    }
    if (this.state.turnInfo.phase !== "action") {
      this.pushEvent("move_blocked", `${player.name} must roll before ending the turn.`);
      return;
    }
    this.finishTurn(player);
  }
  // Character switching is treated as a turn-setup choice so passive/loadout semantics stay deterministic.
  handleSetCharacter(client, payload) {
    const player = this.state.players.get(client.sessionId);
    if (!player) {
      return;
    }
    if (!getCharacterIds().includes(payload.characterId)) {
      this.pushEvent("move_blocked", `${player.name} tried to switch to an unknown character.`);
      return;
    }
    if (this.state.roomPhase === "lobby") {
      player.characterId = payload.characterId;
      this.applyPlayerCharacterState(player, {});
      this.pushEvent(
        "character_switched",
        `${player.name} selected ${getCharacterDefinition(payload.characterId).label}.`
      );
      return;
    }
    if (this.state.roomPhase !== "in_game") {
      this.pushEvent("move_blocked", `${player.name} cannot switch character right now.`);
      return;
    }
    if (this.state.turnInfo.currentPlayerId !== client.sessionId) {
      this.pushEvent("move_blocked", `${player.name} tried to act out of turn.`);
      return;
    }
    if (this.state.turnInfo.phase !== "roll") {
      this.pushEvent("move_blocked", `${player.name} can only switch character before rolling.`);
      return;
    }
    player.characterId = payload.characterId;
    this.applyPlayerCharacterState(player, {});
    this.refreshTurnStartActions(player, [...getCharacterDefinition(payload.characterId).turnStartActionIds]);
    this.pushEvent(
      "character_switched",
      `${player.name} switched to ${getCharacterDefinition(payload.characterId).label}.`
    );
  }
  // Debug grants append a chosen tool to the current turn without touching the dice flow.
  handleGrantDebugTool(client, payload) {
    const player = this.ensureActivePlayer(client);
    if (!player) {
      return;
    }
    if (this.state.turnInfo.phase !== "action") {
      this.pushEvent("move_blocked", `${player.name} must roll before granting a debug tool.`);
      return;
    }
    if (!this.state.allowDebugTools) {
      this.pushEvent("move_blocked", `${player.name} cannot use debug tools on this map.`);
      return;
    }
    const definition = getToolDefinition2(payload.toolId);
    if (!definition.debugGrantable) {
      this.pushEvent("move_blocked", `${definition.label} cannot be debug-granted right now.`);
      return;
    }
    const grantedTool = payload.toolId === "movement" ? createMovementToolInstance(this.createToolInstanceId("movement"), 4) : createDebugToolInstance(this.createToolInstanceId(payload.toolId), payload.toolId);
    applyToolInventory(
      player,
      [...createPlayerToolsFromState(player), grantedTool],
      (tools) => this.normalizePlayerTools(player, tools)
    );
    this.pushEvent("debug_granted", `${player.name} debug gained ${definition.label}.`);
  }
  // Tool instance ids stay unique within the room so client selection remains stable.
  createToolInstanceId(toolId) {
    const serial = this.nextToolInstanceSerial;
    this.nextToolInstanceSerial += 1;
    return `${toolId}-${serial}`;
  }
  // Event logging keeps the synced room feed short so state patches stay lightweight.
  pushEvent(type2, message) {
    pushRoomEvent(this.state, type2, message);
  }
};

// src/index.ts
var port = Number(process.env.PORT ?? 2567);
var app = express();
app.use(cors());
app.get("/", (_request, response) => {
  response.json({
    name: "Watcher authoritative server",
    room: WATCHER_ROOM_NAME,
    health: "/health"
  });
});
app.get("/health", (_request, response) => {
  response.json({
    ok: true,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
var server = http.createServer(app);
var gameServer = new Server({
  transport: new WebSocketTransport({ server })
});
gameServer.define(WATCHER_ROOM_NAME, WatcherRoom).filterBy(["mapId"]);
await gameServer.listen(port);
console.log(`Watcher server ready at ws://localhost:${port}`);
