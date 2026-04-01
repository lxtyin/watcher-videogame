import { type Client, Room } from "colyseus";
import {
  type ActionPresentation,
  adjustMovementTools,
  applyCharacterToolTransforms,
  applyCharacterTurnEndCleanup,
  buildCharacterTurnLoadoutRuntime,
  cloneCharacterState,
  createToolInstance,
  createTurnStartActionSnapshot,
  FARTHER_PENDING_MOVE_BONUS_STATE_KEY,
  getCharacterDefinition,
  getCharacterIds,
  getTotalMovementPoints,
  markCharacterMovedOutOfTurn,
  prepareCharacterTurnStart,
  PLAYER_COLORS,
  PLAYER_SPAWNS,
  createDebugToolInstance,
  createDefaultBoardDefinition,
  createMovementToolInstance,
  createRolledToolInstance,
  clearMovementTools,
  findToolInstance,
  getToolDefinition,
  getToolParam,
  type PlayerTurnFlag,
  resolveToolAction,
  rollMovementDie,
  rollToolDie,
  resolveCharacterTurnStartAction,
  type CharacterId,
  type CharacterStateMap,
  type GrantDebugToolPayload,
  type SetCharacterCommandPayload,
  type ToolId,
  type ToolLoadoutDefinition,
  type UseTurnStartActionCommandPayload,
  type TurnToolSnapshot,
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
  requestedPlayerName?: string;
}

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
  }

  // Joining players receive a spawn, empty turn resources, and possibly the first turn.
  override onJoin(client: Client, options: JoinOptions): void {
    const spawnIndex = this.state.players.size % PLAYER_SPAWNS.length;
    const characterIds = getCharacterIds();
    const spawn = PLAYER_SPAWNS[spawnIndex] ?? PLAYER_SPAWNS[0]!;
    const player = new PlayerState();

    player.id = client.sessionId;
    player.name = options.requestedPlayerName?.trim() || `Player ${this.state.players.size + 1}`;
    player.color = pickRandomPlayerColor(this.state.players.values() as Iterable<PlayerState>);
    player.characterId = characterIds[spawnIndex % characterIds.length] ?? "late";
    player.characterStateJson = "{}";
    player.x = spawn.x;
    player.y = spawn.y;
    player.spawnX = spawn.x;
    player.spawnY = spawn.y;

    clearPlayerTurnResources(player);
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
      this.state.turnInfo.turnStartActionsJson = "[]";
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
    clearPlayerTurnResources(player);
    applyToolInventory(
      player,
      this.buildTurnActionTools(player, [
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
    this.beginTurnFor(this.getNextPlayerId(player.id), true);
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

    if (activeTool.toolId === "movement") {
      this.pushEvent(
        "piece_moved",
        `${player.name} used Movement ${payload.direction} to (${player.x}, ${player.y}).`
      );
    } else {
      this.pushEvent("tool_used", `${player.name} used ${toolDefinition.label}.`);
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
    const player = this.ensureActivePlayer(client);

    if (!player) {
      return;
    }

    if (this.state.turnInfo.phase !== "roll") {
      this.pushEvent("move_blocked", `${player.name} can only switch character before rolling.`);
      return;
    }

    if (!getCharacterIds().includes(payload.characterId)) {
      this.pushEvent("move_blocked", `${player.name} tried to switch to an unknown character.`);
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
