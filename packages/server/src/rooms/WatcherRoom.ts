import { type Client, Room } from "colyseus";
import type { Delayed } from "@colyseus/timer";
import {
  buildGameMapRuntimeMetadata,
  createBoardDefinitionFromLayout,
  createBoardDefinition,
  createGameOrchestrator,
  createInitialGameRuntimeState,
  getBoardSpawnPosition,
  getCharacterDefinition,
  getCharacterIds,
  type BoardDefinition,
  type CustomMapDefinition,
  type GameOrchestrator,
  type GameRuntimeState,
  getAssignedPlayerColor,
  getSequentialTeamId,
  type GrantDebugToolPayload,
  type KickPlayerCommandPayload,
  type SetCharacterCommandPayload,
  type SetReadyCommandPayload,
  type SimulationCommand,
  type UseToolCommandPayload
} from "@watcher/shared";
import { PlayerState, TileState, WatcherState } from "../schema/WatcherState";
import { pushRoomEvent } from "./roomEventLog";
import { createGameSnapshotFromState } from "./roomStateMappers";
import { applyGameSnapshotToState, clearPlayerTurnResources } from "./roomStateMutations";

interface JoinOptions {
  mapId?: string;
  requestedPetId?: string;
  requestedPlayerName?: string;
}

interface CreateOptions {
  customMap?: CustomMapDefinition;
  mapId?: string;
}

const RECONNECTION_WINDOW_SECONDS = 45;

export class WatcherRoom extends Room<WatcherState> {
  private customBoard: BoardDefinition | null = null;
  private pendingKickMessages = new Map<string, string>();
  private pendingRaceAdvanceTimer: Delayed | null = null;
  private runtimeState = createInitialGameRuntimeState();

  override onCreate(options: CreateOptions = {}): void {
    this.autoDispose = false;
    this.maxClients = 8;
    this.setPatchRate(1000 / 15);
    this.setState(new WatcherState());

    if (options.customMap) {
      this.customBoard = createBoardDefinitionFromLayout(options.customMap.layout);
      this.state.mapId = "custom";
      this.state.mapLabel = options.customMap.mapLabel.trim() || "自定义地图";
      this.state.mode = options.customMap.mode;
      this.state.allowDebugTools = options.customMap.allowDebugTools;
    } else {
      const mapMetadata = buildGameMapRuntimeMetadata(options.mapId);
      this.state.mapId = mapMetadata.mapId;
      this.state.mapLabel = mapMetadata.mapLabel;
      this.state.mode = mapMetadata.mode;
      this.state.allowDebugTools = mapMetadata.allowDebugTools;
    }

    this.state.roomCode = this.roomId;
    this.state.roomPhase = "lobby";
    this.state.hostPlayerId = "";
    this.state.settlementState = "active";

    this.seedBoard();
    this.resetTurnState(1);

    this.onMessage("rollDice", (client) => {
      this.handleRollDice(client);
    });

    this.onMessage("useTool", (client, payload: UseToolCommandPayload) => {
      this.handleUseTool(client, payload);
    });

    this.onMessage("endTurn", (client) => {
      this.handleEndTurn(client);
    });

    this.onMessage("grantDebugTool", (client, payload: GrantDebugToolPayload) => {
      this.handleGrantDebugTool(client, payload);
    });

    this.onMessage("setCharacter", (client, payload: SetCharacterCommandPayload) => {
      this.handleSetCharacter(client, payload);
    });

    this.onMessage("setReady", (client, payload: SetReadyCommandPayload) => {
      this.handleSetReady(client, payload);
    });

    this.onMessage("startGame", (client) => {
      this.handleStartGame(client);
    });

    this.onMessage("returnToRoom", (client) => {
      this.handleReturnToRoom(client);
    });

    this.onMessage("kickPlayer", (client, payload: KickPlayerCommandPayload) => {
      this.handleKickPlayer(client, payload);
    });
  }

  override onJoin(client: Client, options: JoinOptions): void {
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
    const player = new PlayerState();

    player.id = client.sessionId;
    player.name = options.requestedPlayerName?.trim() || `Player ${this.state.players.size + 1}`;
    player.petId = options.requestedPetId?.trim() || "";
    player.boardVisible = true;
    player.characterId = characterIds[spawnIndex % characterIds.length] ?? "late";
    player.tagsJson = "{}";
    while (player.modifiers.length > 0) {
      player.modifiers.pop();
    }
    player.finishRank = 0;
    player.finishedTurnNumber = 0;
    player.isConnected = true;
    player.isReady = false;
    this.assignPlayerSeatState(player, spawnIndex);

    clearPlayerTurnResources(player);
    this.state.players.set(client.sessionId, player);
    this.state.hostPlayerId ||= client.sessionId;
    this.pushEvent("turn_started", `${player.name} joined room ${this.state.roomCode}.`);
  }

  override async onLeave(client: Client, consented: boolean): Promise<void> {
    const leavingPlayer = this.state.players.get(client.sessionId);
    const kickedMessage = this.pendingKickMessages.get(client.sessionId) ?? null;

    if (!leavingPlayer) {
      return;
    }

    leavingPlayer.isConnected = false;
    leavingPlayer.isReady = false;

    if (kickedMessage) {
      this.pendingKickMessages.delete(client.sessionId);
      this.removePlayer(client.sessionId, kickedMessage, "player_kicked");
      return;
    }

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
        // Timed-out seats fall through to the normal removal path.
      }
    }

    this.removePlayer(
      client.sessionId,
      consented
        ? `${leavingPlayer.name} left room ${this.state.roomCode}.`
        : `${leavingPlayer.name} did not reconnect in time and was removed.`,
      "turn_started"
    );
  }

  private seedBoard(): void {
    const board = this.getRoomBoard();

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
      tileState.faction = tile.faction ?? "";
      this.state.board.set(tile.key, tileState);
    }
  }

  private getRoomBoard(): BoardDefinition {
    return this.customBoard ?? createBoardDefinition(this.state.mapId);
  }

  private getSpawnPosition(playerIndex: number, teamId: PlayerState["teamId"]): { x: number; y: number } {
    return getBoardSpawnPosition(
      this.getRoomBoard(),
      this.state.mode,
      playerIndex,
      teamId === "" ? null : teamId
    );
  }

  private findClientBySessionId(sessionId: string): Client | null {
    return this.clients.find((client) => client.sessionId === sessionId) ?? null;
  }

  private resetTurnState(turnNumber: number): void {
    this.state.turnInfo.currentPlayerId = "";
    this.state.turnInfo.phase = "turn-start";
    this.state.turnInfo.lastRolledMoveDieValue = 0;
    this.state.turnInfo.moveRoll = 0;
    this.state.turnInfo.lastRolledToolId = "";
    this.state.turnInfo.toolDieSeed = this.runtimeState.toolDieSeed;
    this.state.turnInfo.turnNumber = turnNumber;
  }

  private clearEventLog(): void {
    while (this.state.eventLog.length > 0) {
      this.state.eventLog.pop();
    }
  }

  private clearPresentationState(): void {
    this.state.latestPresentationSequence = 0;
    this.state.latestPresentationJson = "";
  }

  private clearSummonsState(): void {
    this.state.summons.clear();
  }

  private clearPendingRaceAdvanceTimer(): void {
    if (!this.pendingRaceAdvanceTimer) {
      return;
    }

    this.pendingRaceAdvanceTimer.clear();
    this.pendingRaceAdvanceTimer = null;
  }

  private resetMatchRuntimeState(): void {
    this.runtimeState = createInitialGameRuntimeState();
    this.clearPendingRaceAdvanceTimer();
    this.clearSummonsState();
    this.clearPresentationState();
    this.seedBoard();
    this.state.settlementState = "active";
  }

  private resetPlayersForCurrentMap(clearReady: boolean): void {
    const playerOrder = this.getPlayerOrder();

    playerOrder.forEach((playerId, index) => {
      const player = this.state.players.get(playerId);

      if (!player) {
        return;
      }

      this.assignPlayerSeatState(player, index);
      player.boardVisible = true;
      player.finishRank = 0;
      player.finishedTurnNumber = 0;
      player.tagsJson = "{}";
      while (player.modifiers.length > 0) {
        player.modifiers.pop();
      }

      if (clearReady) {
        player.isReady = false;
      }

      clearPlayerTurnResources(player);
    });
  }

  private resetRoomToLobbyState(): void {
    this.state.roomPhase = "lobby";
    this.resetMatchRuntimeState();
    this.resetPlayersForCurrentMap(true);
    this.resetTurnState(1);
    this.clearEventLog();
    void this.unlock();
  }

  private reassignHostIfNeeded(): void {
    if (this.state.hostPlayerId && this.state.players.has(this.state.hostPlayerId)) {
      return;
    }

    this.state.hostPlayerId = this.getPlayerOrder()[0] ?? "";
  }

  private cloneRuntimeState(runtime: GameRuntimeState): GameRuntimeState {
    return {
      ...runtime,
      pendingAdvance: runtime.pendingAdvance ? { ...runtime.pendingAdvance } : null
    };
  }

  private applyRuntimeState(runtime: GameRuntimeState): void {
    this.runtimeState = this.cloneRuntimeState(runtime);
  }

  private createRoomOrchestrator(): GameOrchestrator {
    return createGameOrchestrator({
      snapshot: createGameSnapshotFromState(this.state),
      runtime: this.runtimeState
    });
  }

  private schedulePendingAdvanceIfNeeded(): void {
    this.clearPendingRaceAdvanceTimer();

    if (!this.runtimeState.pendingAdvance || this.state.roomPhase !== "in_game") {
      return;
    }

    const delayMs = createGameSnapshotFromState(this.state).latestPresentation?.durationMs ?? 0;

    if (delayMs <= 0) {
      this.advanceSharedTurn();
      return;
    }

    this.pendingRaceAdvanceTimer = this.clock.setTimeout(() => {
      this.pendingRaceAdvanceTimer = null;
      this.advanceSharedTurn();
    }, delayMs);
  }

  private applyOrchestrationResult(orchestrator: GameOrchestrator): void {
    applyGameSnapshotToState(this.state, orchestrator.getSnapshot());
    this.applyRuntimeState(orchestrator.getRuntimeState());
    this.schedulePendingAdvanceIfNeeded();
  }

  private runGameOrchestration(
    execute: (orchestrator: GameOrchestrator) => void
  ): void {
    const orchestrator = this.createRoomOrchestrator();
    execute(orchestrator);
    this.applyOrchestrationResult(orchestrator);
  }

  private advanceSharedTurn(): void {
    if (this.state.roomPhase !== "in_game") {
      return;
    }

    this.runGameOrchestration((orchestrator) => {
      orchestrator.advanceTurn();
    });
  }

  private dispatchInGameCommand(command: SimulationCommand): void {
    this.runGameOrchestration((orchestrator) => {
      orchestrator.dispatch(command);
    });
  }

  private removePlayer(
    playerId: string,
    message: string,
    eventType: "player_kicked" | "turn_started" = "turn_started"
  ): void {
    const wasActivePlayer = this.state.turnInfo.currentPlayerId === playerId;

    if (wasActivePlayer) {
      this.clearPendingRaceAdvanceTimer();
    }

    this.state.players.delete(playerId);
    this.reassignHostIfNeeded();

    if (!this.state.players.size) {
      this.resetRoomToLobbyState();
      this.state.hostPlayerId = "";
      this.clearEventLog();
      return;
    }

    if (this.state.roomPhase === "lobby") {
      this.resetPlayersForCurrentMap(false);
    }

    if (this.state.roomPhase === "in_game" && wasActivePlayer) {
      this.advanceSharedTurn();
    }

    this.pushEvent(eventType, message);
  }

  private getPlayerOrder(): string[] {
    return Array.from(this.state.players.values() as Iterable<PlayerState>).map((player) => player.id);
  }

  private assignPlayerSeatState(player: PlayerState, playerIndex: number): void {
    const teamId = this.state.mode === "bedwars" ? getSequentialTeamId(playerIndex) : null;
    const spawn = this.getSpawnPosition(playerIndex, teamId ?? "");

    player.teamId = teamId ?? "";
    player.color = getAssignedPlayerColor(this.state.mode, playerIndex, teamId);
    player.x = spawn.x;
    player.y = spawn.y;
    player.spawnX = spawn.x;
    player.spawnY = spawn.y;
  }

  private getConnectedPlayers(): PlayerState[] {
    return Array.from(this.state.players.values() as Iterable<PlayerState>).filter(
      (player) => player.isConnected
    );
  }

  private areAllConnectedPlayersReady(): boolean {
    const connectedPlayers = this.getConnectedPlayers();

    return connectedPlayers.length > 0 && connectedPlayers.every((player) => player.isReady);
  }

  private hasRequiredBedwarsTeams(): boolean {
    if (this.state.mode !== "bedwars") {
      return true;
    }

    const teams = new Set(
      this.getConnectedPlayers()
        .map((player) => player.teamId)
        .filter((teamId) => teamId !== "")
    );

    return teams.has("white") && teams.has("black");
  }

  private startMatch(): void {
    this.state.roomPhase = "in_game";
    this.resetMatchRuntimeState();
    this.resetPlayersForCurrentMap(true);
    this.resetTurnState(1);
    this.clearEventLog();
    void this.lock();
    this.advanceSharedTurn();
  }

  private handleSetReady(client: Client, payload: SetReadyCommandPayload): void {
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

  private handleStartGame(client: Client): void {
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

    if (!this.hasRequiredBedwarsTeams()) {
      this.pushEvent("move_blocked", `${player.name} cannot start bedwars without both teams present.`);
      return;
    }

    this.startMatch();
  }

  private handleReturnToRoom(client: Client): void {
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

  private handleKickPlayer(client: Client, payload: KickPlayerCommandPayload): void {
    const actor = this.state.players.get(client.sessionId);

    if (!actor) {
      return;
    }

    if (this.state.hostPlayerId !== client.sessionId) {
      this.pushEvent("move_blocked", `${actor.name} is not allowed to remove players.`);
      return;
    }

    if (payload.playerId === client.sessionId) {
      this.pushEvent("move_blocked", `${actor.name} cannot remove the host seat.`);
      return;
    }

    const target = this.state.players.get(payload.playerId);

    if (!target) {
      this.pushEvent("move_blocked", `${actor.name} tried to remove a missing player.`);
      return;
    }

    const kickMessage = `${target.name} was removed from room ${this.state.roomCode} by ${actor.name}.`;
    const targetClient = this.findClientBySessionId(payload.playerId);

    if (!targetClient) {
      this.removePlayer(payload.playerId, kickMessage, "player_kicked");
      return;
    }

    this.pendingKickMessages.set(payload.playerId, kickMessage);
    targetClient.error(4001, "You were removed from the room.");
    void targetClient.leave(4001);
  }

  private handleRollDice(client: Client): void {
    this.dispatchInGameCommand({
      kind: "rollDice",
      actorId: client.sessionId
    });
  }

  private handleUseTool(client: Client, payload: UseToolCommandPayload): void {
    this.dispatchInGameCommand({
      kind: "useTool",
      actorId: client.sessionId,
      payload
    });
  }

  private handleEndTurn(client: Client): void {
    this.dispatchInGameCommand({
      kind: "endTurn",
      actorId: client.sessionId
    });
  }

  private handleSetCharacter(client: Client, payload: SetCharacterCommandPayload): void {
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
      player.tagsJson = "{}";
      while (player.modifiers.length > 0) {
        player.modifiers.pop();
      }
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

    this.dispatchInGameCommand({
      kind: "setCharacter",
      actorId: client.sessionId,
      payload
    });
  }

  private handleGrantDebugTool(client: Client, payload: GrantDebugToolPayload): void {
    this.dispatchInGameCommand({
      kind: "grantDebugTool",
      actorId: client.sessionId,
      payload
    });
  }

  private pushEvent(type: Parameters<typeof pushRoomEvent>[1], message: string): void {
    pushRoomEvent(this.state, type, message);
  }
}
