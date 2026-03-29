import { type Client, Room } from "colyseus";
import {
  PLAYER_COLORS,
  PLAYER_SPAWNS,
  createDebugToolInstance,
  createDefaultBoardDefinition,
  createMovementToolInstance,
  createRolledToolInstance,
  findToolInstance,
  getToolDefinition,
  resolveToolAction,
  rollMovementDie,
  rollToolDie,
  type AffectedPlayerMove,
  type BoardPlayerState,
  type Direction,
  type EventType,
  type GrantDebugToolPayload,
  type PlayerTurnFlag,
  type TileMutation,
  type TileType,
  type ToolId,
  type TriggeredTerrainEffect,
  type TurnToolSnapshot,
  type UseToolCommandPayload
} from "@watcher/shared";
import {
  EventLogEntryState,
  PlayerState,
  TileState,
  TurnToolState,
  WatcherState
} from "../schema/WatcherState";

interface JoinOptions {
  requestedPlayerName?: string;
}

export class WatcherRoom extends Room<WatcherState> {
  private moveDieSeed = 11;
  private toolDieSeed = 1;
  private nextToolInstanceSerial = 1;

  // Room bootstrap wires the authoritative board state and all gameplay messages.
  override onCreate(): void {
    this.autoDispose = false;
    this.maxClients = 4;
    this.setPatchRate(1000 / 15);
    this.setState(new WatcherState());

    // The room owns board setup so every client joins the same authoritative map.
    this.seedBoard();
    this.state.turnInfo.toolDieSeed = this.toolDieSeed;

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
  }

  // Joining players receive a spawn, empty turn resources, and possibly the first turn.
  override onJoin(client: Client, options: JoinOptions): void {
    const spawnIndex = this.state.players.size % PLAYER_SPAWNS.length;
    const spawn = PLAYER_SPAWNS[spawnIndex] ?? PLAYER_SPAWNS[0]!;
    const player = new PlayerState();

    player.id = client.sessionId;
    player.name = options.requestedPlayerName?.trim() || `Player ${this.state.players.size + 1}`;
    player.color = PLAYER_COLORS[spawnIndex] ?? PLAYER_COLORS[0] ?? "#ec6f5a";
    player.x = spawn.x;
    player.y = spawn.y;
    player.spawnX = spawn.x;
    player.spawnY = spawn.y;

    this.clearPlayerTurnResources(player);
    this.state.players.set(client.sessionId, player);

    if (!this.state.turnInfo.currentPlayerId) {
      this.beginTurnFor(client.sessionId, false);
    } else {
      this.pushEvent("turn_started", `${player.name} joined the room.`);
    }
  }

  // Leaving players are removed cleanly, and the turn advances if the active player exits.
  override onLeave(client: Client): void {
    const leavingPlayer = this.state.players.get(client.sessionId);

    if (!leavingPlayer) {
      return;
    }

    const playerOrderBeforeLeave = this.getPlayerOrder();
    this.state.players.delete(client.sessionId);

    if (!this.state.players.size) {
      this.state.turnInfo.currentPlayerId = "";
      this.state.turnInfo.phase = "roll";
      this.state.turnInfo.moveRoll = 0;
      this.state.turnInfo.lastRolledToolId = "";
      this.state.turnInfo.toolDieSeed = this.toolDieSeed;
      return;
    }

    if (this.state.turnInfo.currentPlayerId === client.sessionId) {
      const leavingIndex = playerOrderBeforeLeave.findIndex((playerId) => playerId === client.sessionId);
      const nextIndex = leavingIndex >= 0 ? leavingIndex % this.state.players.size : 0;
      const nextPlayer = Array.from(this.state.players.values() as Iterable<PlayerState>)[nextIndex];

      if (nextPlayer) {
        this.beginTurnFor(nextPlayer.id, true);
      }
    }

    this.pushEvent("turn_started", `${leavingPlayer.name} left the room.`);
  }

  // Board seeding mirrors the shared default layout into Colyseus schema state.
  private seedBoard(): void {
    const board = createDefaultBoardDefinition();

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

  // Turn-scoped resources are cleared in place so schema arrays stay stable for syncing.
  private clearPlayerTurnResources(player: PlayerState): void {
    while (player.tools.length > 0) {
      player.tools.pop();
    }

    while (player.turnFlags.length > 0) {
      player.turnFlags.pop();
    }
  }

  // Starting a turn resets dice results and tool inventory for the chosen player.
  private beginTurnFor(playerId: string, shouldAdvanceTurnNumber: boolean): void {
    const player = this.state.players.get(playerId);

    if (!player) {
      return;
    }

    this.clearPlayerTurnResources(player);
    this.state.turnInfo.currentPlayerId = playerId;
    this.state.turnInfo.phase = "roll";
    this.state.turnInfo.moveRoll = 0;
    this.state.turnInfo.lastRolledToolId = "";
    this.state.turnInfo.toolDieSeed = this.toolDieSeed;

    if (shouldAdvanceTurnNumber) {
      this.state.turnInfo.turnNumber += 1;
    }

    this.pushEvent("turn_started", `${player.name}'s turn started. Roll the dice.`);
  }

  // Player order follows the current schema insertion order.
  private getPlayerOrder(): string[] {
    return Array.from(this.state.players.values() as Iterable<PlayerState>).map((player) => player.id);
  }

  // Next-player lookup wraps around the active player list after removals.
  private getNextPlayerId(currentPlayerId: string): string {
    const playerOrder = this.getPlayerOrder();
    const currentIndex = playerOrder.findIndex((playerId) => playerId === currentPlayerId);

    if (currentIndex === -1) {
      return playerOrder[0] ?? currentPlayerId;
    }

    return playerOrder[(currentIndex + 1) % playerOrder.length] ?? currentPlayerId;
  }

  // Action handlers reuse one turn guard so out-of-turn input never reaches the resolver.
  private ensureActivePlayer(client: Client): PlayerState | null {
    const player = this.state.players.get(client.sessionId);

    if (!player) {
      return null;
    }

    if (this.state.turnInfo.currentPlayerId !== client.sessionId) {
      this.pushEvent("move_blocked", `${player.name} tried to act out of turn.`);
      return null;
    }

    return player;
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

    this.clearPlayerTurnResources(player);
    this.applyToolInventory(player, [
      createMovementToolInstance(this.createToolInstanceId("movement"), moveRoll.value),
      createRolledToolInstance(this.createToolInstanceId(toolRoll.value.toolId), toolRoll.value)
    ]);

    this.state.turnInfo.phase = "action";
    this.state.turnInfo.moveRoll = moveRoll.value;
    this.state.turnInfo.lastRolledToolId = toolRoll.value.toolId;
    this.state.turnInfo.toolDieSeed = this.toolDieSeed;

    this.pushEvent(
      "dice_rolled",
      `${player.name} rolled Movement ${moveRoll.value} and ${getToolDefinition(toolRoll.value.toolId).label}.`
    );
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

    const tools = this.createPlayerTools(player);
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

    const resolution = resolveToolAction({
      board: this.createBoardDefinition(),
      actor: {
        id: player.id,
        position: { x: player.x, y: player.y },
        spawnPosition: { x: player.spawnX, y: player.spawnY },
        turnFlags: Array.from(player.turnFlags) as PlayerTurnFlag[]
      },
      activeTool,
      toolDieSeed: this.toolDieSeed,
      tools,
      direction: payload.direction ?? "up",
      ...(payload.targetPosition ? { targetPosition: payload.targetPosition } : {}),
      players: this.createBoardPlayers()
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
    this.applyPlayerTurnFlags(player, resolution.actor.turnFlags);

    this.applyToolInventory(player, resolution.tools);
    this.applyTileMutations(resolution.tileMutations);
    this.applyAffectedPlayerMoves(resolution.affectedPlayers);
    this.toolDieSeed = resolution.nextToolDieSeed;
    this.state.turnInfo.toolDieSeed = this.toolDieSeed;

    if (
      resolution.tileMutations.some(
        (mutation) => mutation.nextType === "floor"
      )
    ) {
      this.pushEvent("earth_wall_broken", `${player.name} broke an earth wall while moving.`);
    }

    this.pushTerrainEvents(player.id, resolution.triggeredTerrainEffects);

    if (activeTool.toolId === "movement") {
      this.pushEvent(
        "piece_moved",
        `${player.name} used Movement ${payload.direction} to (${player.x}, ${player.y}).`
      );
      return;
    }

    this.pushEvent("tool_used", `${player.name} used ${toolDefinition.label}.`);
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

    this.pushEvent("turn_ended", `${player.name} ended the turn.`);
    this.clearPlayerTurnResources(player);

    const nextPlayerId = this.getNextPlayerId(player.id);
    this.beginTurnFor(nextPlayerId, true);
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

    const definition = getToolDefinition(payload.toolId);

    if (!definition.debugGrantable) {
      this.pushEvent("move_blocked", `${definition.label} cannot be debug-granted right now.`);
      return;
    }

    const grantedTool =
      payload.toolId === "movement"
        ? createMovementToolInstance(this.createToolInstanceId("movement"), 4)
        : createDebugToolInstance(this.createToolInstanceId(payload.toolId), payload.toolId);

    this.applyToolInventory(player, [...this.createPlayerTools(player), grantedTool]);
    this.pushEvent("debug_granted", `${player.name} debug gained ${definition.label}.`);
  }

  // Tool instance ids stay unique within the room so client selection remains stable.
  private createToolInstanceId(toolId: ToolId): string {
    const serial = this.nextToolInstanceSerial;
    this.nextToolInstanceSerial += 1;
    return `${toolId}-${serial}`;
  }

  // Schema tool state is converted into plain snapshots before shared resolution.
  private createPlayerTools(player: PlayerState): TurnToolSnapshot[] {
    const parseToolParams = (paramsJson: string) => {
      try {
        return JSON.parse(paramsJson);
      } catch {
        return {};
      }
    };

    return Array.from(player.tools as Iterable<TurnToolState>).map((tool) => ({
      instanceId: tool.instanceId,
      toolId: tool.toolId as ToolId,
      charges: tool.charges,
      params: parseToolParams(tool.paramsJson)
    }));
  }

  // Shared tool snapshots are written back into schema state after each authoritative action.
  private applyToolInventory(player: PlayerState, tools: TurnToolSnapshot[]): void {
    while (player.tools.length > 0) {
      player.tools.pop();
    }

    for (const tool of tools) {
      const toolState = new TurnToolState();
      toolState.instanceId = tool.instanceId;
      toolState.toolId = tool.toolId;
      toolState.charges = tool.charges;
      toolState.paramsJson = JSON.stringify(tool.params);
      player.tools.push(toolState);
    }
  }

  // Turn flags are synced explicitly so terrain side effects stay deterministic across turns.
  private applyPlayerTurnFlags(player: PlayerState, turnFlags: string[]): void {
    while (player.turnFlags.length > 0) {
      player.turnFlags.pop();
    }

    for (const turnFlag of turnFlags) {
      player.turnFlags.push(turnFlag);
    }
  }

  // Board schema is materialized into the shared board shape right before rule resolution.
  private createBoardDefinition() {
    return {
      width: this.state.boardWidth,
      height: this.state.boardHeight,
      tiles: Array.from(this.state.board.values() as Iterable<TileState>).map((tile) => ({
        key: tile.key,
        x: tile.x,
        y: tile.y,
        type: tile.type as TileType,
        durability: tile.durability,
        direction: tile.direction === "" ? null : (tile.direction as Direction)
      }))
    };
  }

  // Player schema state is mirrored into shared snapshots for collision and terrain logic.
  private createBoardPlayers(): BoardPlayerState[] {
    return Array.from(this.state.players.values() as Iterable<PlayerState>).map((entry) => ({
      id: entry.id,
      position: {
        x: entry.x,
        y: entry.y
      },
      spawnPosition: {
        x: entry.spawnX,
        y: entry.spawnY
      },
      turnFlags: Array.from(entry.turnFlags) as PlayerTurnFlag[]
    }));
  }

  // Tile mutations persist permanent board changes such as broken earth walls.
  private applyTileMutations(tileMutations: TileMutation[]): void {
    for (const mutation of tileMutations) {
      const tile = this.state.board.get(mutation.key);

      if (!tile) {
        continue;
      }

      // A broken earth wall becomes a permanent floor tile for the whole room.
      tile.type = mutation.nextType;
      tile.durability = mutation.nextDurability;
      tile.direction = "";
    }
  }

  // Secondary player movement applies shared effects such as hookshot pulls and pit respawns.
  private applyAffectedPlayerMoves(affectedPlayers: AffectedPlayerMove[]): void {
    for (const affectedPlayer of affectedPlayers) {
      const player = this.state.players.get(affectedPlayer.playerId);

      if (!player) {
        continue;
      }

      player.x = affectedPlayer.target.x;
      player.y = affectedPlayer.target.y;

      if (affectedPlayer.turnFlags) {
        this.applyPlayerTurnFlags(player, affectedPlayer.turnFlags);
      }
    }
  }

  // Terrain effect logs are derived from shared effect payloads instead of custom room logic.
  private pushTerrainEvents(actorId: string, triggeredTerrainEffects: TriggeredTerrainEffect[]): void {
    for (const terrainEffect of triggeredTerrainEffects) {
      const affectedPlayer = this.state.players.get(terrainEffect.playerId);
      const actor = this.state.players.get(actorId);

      if (!affectedPlayer) {
        continue;
      }

      if (terrainEffect.kind === "pit") {
        this.pushEvent(
          "player_respawned",
          `${affectedPlayer.name} fell into a pit and respawned at (${terrainEffect.respawnPosition.x}, ${terrainEffect.respawnPosition.y}).`
        );
        continue;
      }

      if (terrainEffect.kind === "lucky") {
        this.pushEvent(
          "terrain_triggered",
          `${affectedPlayer.name} landed on a lucky block and gained ${getToolDefinition(terrainEffect.grantedTool.toolId).label}.`
        );
        continue;
      }

      if (terrainEffect.kind === "conveyor_boost" && actor) {
        this.pushEvent(
          "terrain_triggered",
          `${actor.name} rode a conveyor for +${terrainEffect.bonusMovePoints} move points.`
        );
        continue;
      }

      if (terrainEffect.kind === "conveyor_turn" && actor) {
        this.pushEvent(
          "terrain_triggered",
          `${actor.name} was redirected from ${terrainEffect.fromDirection} to ${terrainEffect.toDirection}.`
        );
      }
    }
  }

  // Event logging keeps the synced room feed short so state patches stay lightweight.
  private pushEvent(type: EventType, message: string): void {
    const entry = new EventLogEntryState();
    entry.id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    entry.type = type;
    entry.message = message;
    entry.createdAt = Date.now();

    this.state.eventLog.push(entry);

    // Keep the log short so the synced room payload stays lightweight.
    while (this.state.eventLog.length > 10) {
      this.state.eventLog.shift();
    }
  }
}
