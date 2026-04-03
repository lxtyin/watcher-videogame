import { type Client, Room } from "colyseus";
import {
  type ActionPresentation,
  adjustMovementTools,
  applyCharacterToolTransforms,
  applyCharacterTurnEndCleanup,
  buildCharacterTurnLoadoutRuntime,
  buildGameMapRuntimeMetadata,
  cloneCharacterState,
  createToolInstance,
  createTurnStartActionSnapshot,
  FARTHER_PENDING_MOVE_BONUS_STATE_KEY,
  getCharacterDefinition,
  getCharacterIds,
  getGameMapSpawnPosition,
  getNextActiveRacePlayerId,
  getNextFinishRank,
  getTotalMovementPoints,
  markCharacterMovedOutOfTurn,
  prepareCharacterTurnStart,
  PLAYER_COLORS,
  createDebugToolInstance,
  createBoardDefinition,
  createMovementToolInstance,
  createRolledToolInstance,
  clearMovementTools,
  findToolInstance,
  getToolDefinition,
  getToolParam,
  type PlayerTurnFlag,
  resolveCurrentTileStop,
  resolveToolAction,
  rollMovementDie,
  rollToolDie,
  resolveSettlementState,
  resolveCharacterTurnStartAction,
  type CharacterId,
  type CharacterStateMap,
  type GrantDebugToolPayload,
  type SetCharacterCommandPayload,
  type SetReadyCommandPayload,
  type ToolId,
  type ToolLoadoutDefinition,
  type TurnToolSnapshot,
  type UseTurnStartActionCommandPayload,
  type UseToolCommandPayload
} from "@watcher/shared";
import { PlayerState, TileState, WatcherState } from "../schema/WatcherState";
import { pushRoomEvent, pushSummonEvents, pushTerrainEvents } from "./roomEventLog";
import {
  parseCharacterState,
  createBoardDefinitionFromState,
  createBoardPlayersFromState,
  createBoardSummonsFromState,
  createPlayerToolsFromState
} from "./roomStateMappers";
import {
  applyCharacterState,
  applyAffectedPlayerMoves,
  applyPlayerTurnFlags,
  applySummonMutations,
  applyTileMutations,
  applyToolInventory,
  clearPlayerTurnResources
} from "./roomStateMutations";

interface JoinOptions {
  mapId?: string;
  requestedPetId?: string;
  requestedPlayerName?: string;
}

interface CreateOptions {
  mapId?: string;
}

const RECONNECTION_WINDOW_SECONDS = 45;

function pickRandomPlayerColor(players: Iterable<PlayerState>): string {
  const usedColors = new Set(Array.from(players).map((player) => player.color));
  const availableColors = PLAYER_COLORS.filter((color) => !usedColors.has(color));
  const palette = availableColors.length ? availableColors : PLAYER_COLORS;
  const randomIndex = Math.floor(Math.random() * palette.length);

  return palette[randomIndex] ?? "#ec6f5a";
}

export class WatcherRoom extends Room<WatcherState> {
  private moveDieSeed = 11;
  private toolDieSeed = 1;
  private nextToolInstanceSerial = 1;
  private nextPresentationSequence = 1;

  // Room bootstrap wires the authoritative board state and all gameplay messages.
  override onCreate(options: CreateOptions = {}): void {
    this.autoDispose = false;
    this.maxClients = 8;
    this.setPatchRate(1000 / 15);
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

    // The room owns board setup so every client joins the same authoritative map.
    this.seedBoard();
    this.resetTurnState(1);
    this.state.turnInfo.toolDieSeed = this.toolDieSeed;

    this.onMessage("rollDice", (client) => {
      this.handleRollDice(client);
    });

    this.onMessage("useTurnStartAction", (client, payload: UseTurnStartActionCommandPayload) => {
      this.handleUseTurnStartAction(client, payload);
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
  }

  // Joining players enter the lobby first, while reconnects reclaim the previous seat.
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
    const spawn = getGameMapSpawnPosition(this.state.mapId, spawnIndex);
    const player = new PlayerState();

    player.id = client.sessionId;
    player.name = options.requestedPlayerName?.trim() || `Player ${this.state.players.size + 1}`;
    player.petId = options.requestedPetId?.trim() || "";
    player.color = pickRandomPlayerColor(this.state.players.values() as Iterable<PlayerState>);
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
  override async onLeave(client: Client, consented: boolean): Promise<void> {
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
        // Timed-out seats fall through to the normal removal path.
      }
    }

    this.removePlayer(
      client.sessionId,
      consented
        ? `${leavingPlayer.name} left room ${this.state.roomCode}.`
        : `${leavingPlayer.name} did not reconnect in time and was removed.`
    );
  }

  // Board seeding mirrors the shared default layout into Colyseus schema state.
  private seedBoard(): void {
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
  private publishActionPresentation(presentation: ActionPresentation | null): void {
    if (!presentation) {
      return;
    }

    this.state.latestPresentationSequence = this.nextPresentationSequence;
    this.nextPresentationSequence += 1;
    this.state.latestPresentationJson = JSON.stringify(presentation);
  }

  private createLoadoutTool(loadout: ToolLoadoutDefinition): TurnToolSnapshot {
    return createToolInstance(this.createToolInstanceId(loadout.toolId), loadout.toolId, {
      ...(loadout.charges !== undefined ? { charges: loadout.charges } : {}),
      ...(loadout.params ? { params: loadout.params } : {}),
      ...(loadout.source ? { source: loadout.source } : {})
    });
  }

  private getPlayerCharacterState(player: PlayerState): CharacterStateMap {
    return parseCharacterState(player.characterStateJson);
  }

  private applyPlayerCharacterState(player: PlayerState, characterState: CharacterStateMap): void {
    applyCharacterState(player, characterState);
  }

  private resetTurnState(turnNumber: number): void {
    this.state.turnInfo.currentPlayerId = "";
    this.state.turnInfo.phase = "roll";
    this.state.turnInfo.moveRoll = 0;
    this.state.turnInfo.lastRolledToolId = "";
    this.state.turnInfo.turnStartActionsJson = "[]";
    this.state.turnInfo.toolDieSeed = this.toolDieSeed;
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
    this.nextPresentationSequence = 1;
  }

  private clearSummonsState(): void {
    this.state.summons.clear();
  }

  private resetMatchRuntimeState(): void {
    this.moveDieSeed = 11;
    this.toolDieSeed = 1;
    this.nextToolInstanceSerial = 1;
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

  private removePlayer(playerId: string, message: string): void {
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

  private getConnectedPlayers(): PlayerState[] {
    return Array.from(this.state.players.values() as Iterable<PlayerState>).filter(
      (player) => player.isConnected
    );
  }

  private areAllConnectedPlayersReady(): boolean {
    const connectedPlayers = this.getConnectedPlayers();

    return connectedPlayers.length > 0 && connectedPlayers.every((player) => player.isReady);
  }

  private startMatch(): void {
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
  private buildTurnActionTools(player: PlayerState, baseTools: TurnToolSnapshot[]): TurnToolSnapshot[] {
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

  private isRaceMode(): boolean {
    return this.state.mode === "race";
  }

  private isPlayerFinished(player: PlayerState): boolean {
    return player.finishRank > 0;
  }

  private enterSettlementState(): void {
    this.state.roomPhase = "settlement";
    this.resetTurnState(this.state.turnInfo.turnNumber);
    this.state.settlementState = "complete";
  }

  private applyRaceGoalProgress(
    actorId: string,
    triggeredTerrainEffects: import("@watcher/shared").TriggeredTerrainEffect[]
  ): {
    actorFinished: boolean;
    settlementComplete: boolean;
  } {
    if (!this.isRaceMode()) {
      return {
        actorFinished: false,
        settlementComplete: false
      };
    }

    let actorFinished = false;
    const goalPlayerIds = [
      ...new Set(
        triggeredTerrainEffects
          .filter((effect): effect is Extract<import("@watcher/shared").TriggeredTerrainEffect, { kind: "goal" }> => effect.kind === "goal")
          .map((effect) => effect.playerId)
      )
    ];

    for (const playerId of goalPlayerIds) {
      const player = this.state.players.get(playerId);

      if (!player || this.isPlayerFinished(player)) {
        continue;
      }

      player.finishRank = getNextFinishRank(
        Array.from(this.state.players.values() as Iterable<PlayerState>).map((entry) => ({
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
      Array.from(this.state.players.values() as Iterable<PlayerState>).map((entry) => ({
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

  private applyTurnStartStop(player: PlayerState): import("@watcher/shared").TriggeredTerrainEffect[] {
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
          turnFlags: Array.from(player.turnFlags) as PlayerTurnFlag[]
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

  private normalizePlayerTools(player: PlayerState, tools: TurnToolSnapshot[]): TurnToolSnapshot[] {
    return applyCharacterToolTransforms(player.characterId, tools);
  }

  private refreshTurnStartActions(player: PlayerState, actionIds: readonly import("@watcher/shared").TurnStartActionId[]): void {
    this.state.turnInfo.turnStartActionsJson = JSON.stringify(
      actionIds.map((actionId) => createTurnStartActionSnapshot(actionId, player.characterId))
    );
  }

  private prepareTurnStartState(player: PlayerState) {
    const preparation = prepareCharacterTurnStart(
      player.characterId,
      this.getPlayerCharacterState(player)
    );

    this.applyPlayerCharacterState(player, preparation.nextCharacterState);
    return preparation;
  }

  private enterActionPhaseWithRoll(
    player: PlayerState,
    moveRoll: number,
    rolledTool: TurnToolSnapshot | null
  ): void {
    applyToolInventory(
      player,
      this.buildTurnActionTools(player, [
        ...createPlayerToolsFromState(player),
        createMovementToolInstance(this.createToolInstanceId("movement"), moveRoll),
        ...(rolledTool ? [rolledTool] : [])
      ]),
      (tools) => this.normalizePlayerTools(player, tools)
    );

    this.state.turnInfo.phase = "action";
    this.state.turnInfo.moveRoll = moveRoll;
    this.state.turnInfo.lastRolledToolId =
      (rolledTool?.toolId as typeof this.state.turnInfo.lastRolledToolId) ?? "";
    this.state.turnInfo.turnStartActionsJson = "[]";
    this.state.turnInfo.toolDieSeed = this.toolDieSeed;
  }

  private finishTurn(player: PlayerState): void {
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
  private beginTurnFor(playerId: string, shouldAdvanceTurnNumber: boolean): void {
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
  private getPlayerOrder(): string[] {
    return Array.from(this.state.players.values() as Iterable<PlayerState>).map((player) => player.id);
  }

  // Next-player lookup wraps around the active player list after removals.
  private getNextPlayerId(currentPlayerId: string): string | null {
    if (this.isRaceMode()) {
      return getNextActiveRacePlayerId(
        this.getPlayerOrder(),
        Array.from(this.state.players.values() as Iterable<PlayerState>).map((player) => ({
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
  private ensureActivePlayer(client: Client): PlayerState | null {
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

  // Rolling creates the per-turn Movement tool and one additional rolled tool.
  private handleRollDice(client: Client): void {
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
      `${player.name} rolled Movement ${moveRoll.value} and ${getToolDefinition(toolRoll.value.toolId).label}.`
    );
  }

  private handleUseTurnStartAction(
    client: Client,
    payload: UseTurnStartActionCommandPayload
  ): void {
    const player = this.ensureActivePlayer(client);

    if (!player) {
      return;
    }

    if (this.state.turnInfo.phase !== "roll") {
      this.pushEvent("move_blocked", `${player.name} can only use this action before rolling.`);
      return;
    }

    const availableActions = JSON.parse(this.state.turnInfo.turnStartActionsJson) as Array<{
      actionId: UseTurnStartActionCommandPayload["actionId"];
    }>;

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
  private handleUseTool(client: Client, payload: UseToolCommandPayload): void {
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

    const toolDefinition = getToolDefinition(activeTool.toolId);

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
        turnFlags: Array.from(player.turnFlags) as PlayerTurnFlag[]
      },
      activeTool,
      toolDieSeed: this.toolDieSeed,
      tools,
      summons: createBoardSummonsFromState(this.state),
      ...(payload.direction ? { direction: payload.direction } : {}),
      ...(payload.choiceId ? { choiceId: payload.choiceId } : {}),
      ...(payload.targetPosition ? { targetPosition: payload.targetPosition } : {}),
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

    applyToolInventory(player, resolution.tools, (tools) => this.normalizePlayerTools(player, tools));
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

    if (
      resolution.tileMutations.some(
        (mutation) => mutation.nextType === "floor"
      )
    ) {
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
  private handleEndTurn(client: Client): void {
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
  private handleGrantDebugTool(client: Client, payload: GrantDebugToolPayload): void {
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

    const definition = getToolDefinition(payload.toolId);

    if (!definition.debugGrantable) {
      this.pushEvent("move_blocked", `${definition.label} cannot be debug-granted right now.`);
      return;
    }

    const grantedTool =
      payload.toolId === "movement"
        ? createMovementToolInstance(this.createToolInstanceId("movement"), 4)
        : createDebugToolInstance(this.createToolInstanceId(payload.toolId), payload.toolId);

    applyToolInventory(
      player,
      [...createPlayerToolsFromState(player), grantedTool],
      (tools) => this.normalizePlayerTools(player, tools)
    );
    this.pushEvent("debug_granted", `${player.name} debug gained ${definition.label}.`);
  }

  // Tool instance ids stay unique within the room so client selection remains stable.
  private createToolInstanceId(toolId: ToolId): string {
    const serial = this.nextToolInstanceSerial;
    this.nextToolInstanceSerial += 1;
    return `${toolId}-${serial}`;
  }

  // Event logging keeps the synced room feed short so state patches stay lightweight.
  private pushEvent(type: Parameters<typeof pushRoomEvent>[1], message: string): void {
    pushRoomEvent(this.state, type, message);
  }
}
