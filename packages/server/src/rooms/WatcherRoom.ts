import { type Client, Room } from "colyseus";
import {
  BASE_MOVEMENT_ACTIONS_PER_TURN,
  PLAYER_COLORS,
  PLAYER_SPAWNS,
  createDefaultBoardDefinition,
  getToolDefinition,
  resolveMovementAction,
  resolveToolAction,
  rollMovementDie,
  rollToolDie,
  type AffectedPlayerMove,
  type BoardPlayerState,
  type Direction,
  type EventType,
  type MoveCommandPayload,
  type TileMutation,
  type TileType,
  type ToolId,
  type UseToolCommandPayload
} from "@watcher/shared";
import {
  EventLogEntryState,
  PlayerState,
  TileState,
  ToolChargeState,
  WatcherState
} from "../schema/WatcherState";

interface JoinOptions {
  requestedPlayerName?: string;
}

export class WatcherRoom extends Room<WatcherState> {
  private moveDieSeed = 11;
  private toolDieSeed = 1;

  override onCreate(): void {
    this.autoDispose = false;
    this.maxClients = 4;
    this.setPatchRate(1000 / 15);
    this.setState(new WatcherState());

    // The room owns board setup so every client joins the same authoritative map.
    this.seedBoard();

    this.onMessage("rollDice", (client) => {
      this.handleRollDice(client);
    });

    this.onMessage("move", (client, payload: MoveCommandPayload) => {
      this.handleMove(client, payload.direction);
    });

    this.onMessage("useTool", (client, payload: UseToolCommandPayload) => {
      this.handleUseTool(client, payload);
    });

    this.onMessage("endTurn", (client) => {
      this.handleEndTurn(client);
    });
  }

  override onJoin(client: Client, options: JoinOptions): void {
    const spawnIndex = this.state.players.size % PLAYER_SPAWNS.length;
    const spawn = PLAYER_SPAWNS[spawnIndex] ?? PLAYER_SPAWNS[0]!;
    const player = new PlayerState();

    player.id = client.sessionId;
    player.name = options.requestedPlayerName?.trim() || `Player ${this.state.players.size + 1}`;
    player.color = PLAYER_COLORS[spawnIndex] ?? PLAYER_COLORS[0] ?? "#ec6f5a";
    player.x = spawn.x;
    player.y = spawn.y;

    this.clearPlayerTurnResources(player);
    this.state.players.set(client.sessionId, player);

    if (!this.state.turnInfo.currentPlayerId) {
      this.beginTurnFor(client.sessionId, false);
    } else {
      this.pushEvent("turn_started", `${player.name} joined the room.`);
    }
  }

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
      this.state.turnInfo.remainingMovePoints = 0;
      this.state.turnInfo.movementActionsRemaining = 0;
      this.state.turnInfo.moveRoll = 0;
      this.state.turnInfo.lastRolledToolId = "";
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

  private seedBoard(): void {
    const board = createDefaultBoardDefinition();

    for (const tile of board.tiles) {
      const tileState = new TileState();
      tileState.key = tile.key;
      tileState.x = tile.x;
      tileState.y = tile.y;
      tileState.type = tile.type;
      tileState.durability = tile.durability;
      this.state.board.set(tile.key, tileState);
    }
  }

  private clearPlayerTurnResources(player: PlayerState): void {
    player.remainingMovePoints = 0;
    player.movementActionsRemaining = 0;

    while (player.availableTools.length > 0) {
      player.availableTools.pop();
    }
  }

  private beginTurnFor(playerId: string, shouldAdvanceTurnNumber: boolean): void {
    const player = this.state.players.get(playerId);

    if (!player) {
      return;
    }

    this.clearPlayerTurnResources(player);
    this.state.turnInfo.currentPlayerId = playerId;
    this.state.turnInfo.phase = "roll";
    this.state.turnInfo.remainingMovePoints = 0;
    this.state.turnInfo.movementActionsRemaining = 0;
    this.state.turnInfo.moveRoll = 0;
    this.state.turnInfo.lastRolledToolId = "";

    if (shouldAdvanceTurnNumber) {
      this.state.turnInfo.turnNumber += 1;
    }

    this.pushEvent("turn_started", `${player.name}'s turn started. Roll the dice.`);
  }

  private getPlayerOrder(): string[] {
    return Array.from(this.state.players.values() as Iterable<PlayerState>).map((player) => player.id);
  }

  private getNextPlayerId(currentPlayerId: string): string {
    const playerOrder = this.getPlayerOrder();
    const currentIndex = playerOrder.findIndex((playerId) => playerId === currentPlayerId);

    if (currentIndex === -1) {
      return playerOrder[0] ?? currentPlayerId;
    }

    return playerOrder[(currentIndex + 1) % playerOrder.length] ?? currentPlayerId;
  }

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
    player.remainingMovePoints = moveRoll.value;
    player.movementActionsRemaining = BASE_MOVEMENT_ACTIONS_PER_TURN;

    const toolCharge = new ToolChargeState();
    toolCharge.id = toolRoll.value;
    toolCharge.charges = getToolDefinition(toolRoll.value).chargesPerRoll;
    player.availableTools.push(toolCharge);

    this.state.turnInfo.phase = "action";
    this.state.turnInfo.remainingMovePoints = player.remainingMovePoints;
    this.state.turnInfo.movementActionsRemaining = player.movementActionsRemaining;
    this.state.turnInfo.moveRoll = moveRoll.value;
    this.state.turnInfo.lastRolledToolId = toolRoll.value;

    this.pushEvent(
      "dice_rolled",
      `${player.name} rolled ${moveRoll.value} move and ${getToolDefinition(toolRoll.value).label}.`
    );
  }

  private handleMove(client: Client, direction: Direction): void {
    const player = this.ensureActivePlayer(client);

    if (!player) {
      return;
    }

    if (this.state.turnInfo.phase !== "action") {
      this.pushEvent("move_blocked", `${player.name} must roll dice first.`);
      return;
    }

    // Convert Colyseus schema data into plain shared-layer inputs before validation.
    const resolution = resolveMovementAction({
      board: this.createBoardDefinition(),
      actor: {
        id: player.id,
        position: { x: player.x, y: player.y },
        remainingMovePoints: player.remainingMovePoints,
        movementActionsRemaining: player.movementActionsRemaining
      },
      direction,
      players: this.createBoardPlayers()
    });

    if (resolution.kind === "blocked") {
      this.pushEvent("move_blocked", `${player.name} cannot move ${direction}: ${resolution.reason}.`);
      return;
    }

    player.x = resolution.actor.position.x;
    player.y = resolution.actor.position.y;
    player.remainingMovePoints = resolution.actor.remainingMovePoints;
    player.movementActionsRemaining = resolution.actor.movementActionsRemaining;

    this.state.turnInfo.remainingMovePoints = player.remainingMovePoints;
    this.state.turnInfo.movementActionsRemaining = player.movementActionsRemaining;

    this.applyTileMutations(resolution.tileMutations);

    if (resolution.tileMutations.length) {
      this.pushEvent("earth_wall_broken", `${player.name} broke an earth wall while moving.`);
    }

    this.pushEvent(
      "piece_moved",
      `${player.name} moved ${direction} to (${player.x}, ${player.y}).`
    );
  }

  private handleUseTool(client: Client, payload: UseToolCommandPayload): void {
    const player = this.ensureActivePlayer(client);

    if (!player) {
      return;
    }

    if (this.state.turnInfo.phase !== "action") {
      this.pushEvent("move_blocked", `${player.name} must roll dice first.`);
      return;
    }

    const toolCharge = this.findToolCharge(player, payload.toolId);

    if (!toolCharge) {
      this.pushEvent("move_blocked", `${player.name} does not have that tool this turn.`);
      return;
    }

    const toolDefinition = getToolDefinition(payload.toolId);

    if (toolDefinition.targetMode === "direction" && !payload.direction) {
      this.pushEvent("move_blocked", `${toolDefinition.label} needs a direction.`);
      return;
    }

    const resolution = resolveToolAction({
      board: this.createBoardDefinition(),
      actor: {
        id: player.id,
        position: { x: player.x, y: player.y },
        remainingMovePoints: player.remainingMovePoints,
        movementActionsRemaining: player.movementActionsRemaining
      },
      toolId: payload.toolId,
      direction: payload.direction ?? "up",
      players: this.createBoardPlayers()
    });

    if (resolution.kind === "blocked") {
      this.pushEvent(
        "move_blocked",
        `${player.name} cannot use ${toolDefinition.label}: ${resolution.reason}.`
      );
      return;
    }

    this.consumeToolCharge(player, payload.toolId);

    player.x = resolution.actor.position.x;
    player.y = resolution.actor.position.y;
    player.remainingMovePoints = resolution.actor.remainingMovePoints;
    player.movementActionsRemaining = resolution.actor.movementActionsRemaining;

    this.state.turnInfo.remainingMovePoints = player.remainingMovePoints;
    this.state.turnInfo.movementActionsRemaining = player.movementActionsRemaining;

    this.applyTileMutations(resolution.tileMutations);
    this.applyAffectedPlayerMoves(resolution.affectedPlayers);

    this.pushEvent(
      "tool_used",
      `${player.name} used ${toolDefinition.label}.`
    );
  }

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

  private findToolCharge(player: PlayerState, toolId: ToolId): ToolChargeState | undefined {
    return Array.from(player.availableTools as Iterable<ToolChargeState>).find((tool) => tool.id === toolId);
  }

  private consumeToolCharge(player: PlayerState, toolId: ToolId): void {
    for (let index = 0; index < player.availableTools.length; index += 1) {
      const tool = player.availableTools[index];

      if (!tool || tool.id !== toolId) {
        continue;
      }

      tool.charges -= 1;

      if (tool.charges <= 0) {
        player.availableTools.splice(index, 1);
      }

      return;
    }
  }

  private createBoardDefinition() {
    return {
      width: this.state.boardWidth,
      height: this.state.boardHeight,
      tiles: Array.from(this.state.board.values() as Iterable<TileState>).map((tile) => ({
        key: tile.key,
        x: tile.x,
        y: tile.y,
        type: tile.type as TileType,
        durability: tile.durability
      }))
    };
  }

  private createBoardPlayers(): BoardPlayerState[] {
    return Array.from(this.state.players.values() as Iterable<PlayerState>).map((entry) => ({
      id: entry.id,
      position: {
        x: entry.x,
        y: entry.y
      }
    }));
  }

  private applyTileMutations(tileMutations: TileMutation[]): void {
    for (const mutation of tileMutations) {
      const tile = this.state.board.get(mutation.key);

      if (!tile) {
        continue;
      }

      // A broken earth wall becomes a permanent floor tile for the whole room.
      tile.type = mutation.nextType;
      tile.durability = mutation.nextDurability;
    }
  }

  private applyAffectedPlayerMoves(affectedPlayers: AffectedPlayerMove[]): void {
    for (const affectedPlayer of affectedPlayers) {
      const player = this.state.players.get(affectedPlayer.playerId);

      if (!player) {
        continue;
      }

      player.x = affectedPlayer.target.x;
      player.y = affectedPlayer.target.y;
    }
  }

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
