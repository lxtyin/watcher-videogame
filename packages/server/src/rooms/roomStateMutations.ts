import type {
  AffectedPlayerMove,
  GameSnapshot,
  ModifierId,
  PlayerTagMap,
  SummonMutation,
  TileMutation,
  TurnToolSnapshot
} from "@watcher/shared";
import {
  EventLogEntryState,
  PlayerState,
  SummonState,
  TileState,
  TurnToolState,
  WatcherState
} from "../schema/WatcherState";

type NormalizeTools = (tools: TurnToolSnapshot[]) => TurnToolSnapshot[];

// Turn-scoped resources are cleared in place so schema arrays stay stable for syncing.
export function clearPlayerTurnResources(player: PlayerState): void {
  while (player.tools.length > 0) {
    player.tools.pop();
  }

  while (player.turnFlags.length > 0) {
    player.turnFlags.pop();
  }
}

// Shared tool snapshots are written back into schema state after each authoritative action.
export function applyToolInventory(
  player: PlayerState,
  tools: TurnToolSnapshot[],
  normalizeTools: NormalizeTools
): void {
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

// Turn flags are synced explicitly so terrain side effects stay deterministic across turns.
export function applyPlayerTurnFlags(player: PlayerState, turnFlags: string[]): void {
  while (player.turnFlags.length > 0) {
    player.turnFlags.pop();
  }

  for (const turnFlag of turnFlags) {
    player.turnFlags.push(turnFlag);
  }
}

export function applyPlayerTags(player: PlayerState, tags: PlayerTagMap): void {
  player.tagsJson = JSON.stringify(tags);
}

export function applyPlayerModifiers(player: PlayerState, modifiers: readonly ModifierId[]): void {
  while (player.modifiers.length > 0) {
    player.modifiers.pop();
  }

  for (const modifier of modifiers) {
    player.modifiers.push(modifier);
  }
}

// Tile mutations persist permanent board changes such as broken earth walls.
export function applyTileMutations(state: WatcherState, tileMutations: TileMutation[]): void {
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

export function applySummonMutations(state: WatcherState, summonMutations: SummonMutation[]): void {
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

// Secondary player movement applies shared effects such as hookshot pulls and pit respawns.
export function applyAffectedPlayerMoves(
  state: WatcherState,
  affectedPlayers: AffectedPlayerMove[],
  applyFlags: (player: PlayerState, turnFlags: string[]) => void,
  applyPlayerTagsPatch: (player: PlayerState, tags: PlayerTagMap) => void,
  applyPlayerModifiersPatch: (player: PlayerState, modifiers: readonly ModifierId[]) => void
): void {
  for (const affectedPlayer of affectedPlayers) {
    const player = state.players.get(affectedPlayer.playerId);

    if (!player) {
      continue;
    }

    player.x = affectedPlayer.target.x;
    player.y = affectedPlayer.target.y;

    if (affectedPlayer.boardVisible !== undefined) {
      player.boardVisible = affectedPlayer.boardVisible;
    }

    if (affectedPlayer.turnFlags) {
      applyFlags(player, affectedPlayer.turnFlags);
    }

    if (affectedPlayer.tags) {
      applyPlayerTagsPatch(player, affectedPlayer.tags);
    }

    if (affectedPlayer.modifiers) {
      applyPlayerModifiersPatch(player, affectedPlayer.modifiers);
    }
  }
}

export function applyGameSnapshotToState(
  state: WatcherState,
  snapshot: GameSnapshot
): void {
  state.allowDebugTools = snapshot.allowDebugTools;
  state.boardWidth = snapshot.boardWidth;
  state.boardHeight = snapshot.boardHeight;
  state.hostPlayerId = snapshot.hostPlayerId ?? "";
  state.mapId = snapshot.mapId;
  state.mapLabel = snapshot.mapLabel;
  state.mode = snapshot.mode;
  state.roomCode = snapshot.roomCode;
  state.roomPhase = snapshot.roomPhase;
  state.settlementState = snapshot.settlementState;
  state.roundUsedToolsJson = JSON.stringify(snapshot.roundUsedTools);

  const activeTileKeys = new Set(snapshot.tiles.map((tile) => tile.key));
  for (const key of Array.from(state.board.keys())) {
    if (!activeTileKeys.has(key)) {
      state.board.delete(key);
    }
  }

  for (const tile of snapshot.tiles) {
    const tileState = state.board.get(tile.key) ?? new TileState();
    tileState.key = tile.key;
    tileState.x = tile.x;
    tileState.y = tile.y;
    tileState.type = tile.type;
    tileState.durability = tile.durability;
    tileState.direction = tile.direction ?? "";
    tileState.faction = tile.faction ?? "";
    state.board.set(tile.key, tileState);
  }

  const activeSummonIds = new Set(snapshot.summons.map((summon) => summon.instanceId));
  for (const summonId of Array.from(state.summons.keys())) {
    if (!activeSummonIds.has(summonId)) {
      state.summons.delete(summonId);
    }
  }

  for (const summon of snapshot.summons) {
    const summonState = state.summons.get(summon.instanceId) ?? new SummonState();
    summonState.instanceId = summon.instanceId;
    summonState.summonId = summon.summonId;
    summonState.ownerId = summon.ownerId;
    summonState.x = summon.position.x;
    summonState.y = summon.position.y;
    state.summons.set(summon.instanceId, summonState);
  }

  const activePlayerIds = new Set(snapshot.players.map((player) => player.id));
  for (const playerId of Array.from(state.players.keys())) {
    if (!activePlayerIds.has(playerId)) {
      state.players.delete(playerId);
    }
  }

  for (const player of snapshot.players) {
    const playerState = state.players.get(player.id) ?? new PlayerState();
    playerState.id = player.id;
    playerState.name = player.name;
    playerState.petId = player.petId;
    playerState.color = player.color;
    playerState.boardVisible = player.boardVisible;
    playerState.characterId = player.characterId;
    playerState.tagsJson = JSON.stringify(player.tags);
    applyPlayerModifiers(playerState, player.modifiers);
    playerState.finishRank = player.finishRank ?? 0;
    playerState.finishedTurnNumber = player.finishedTurnNumber ?? 0;
    playerState.isConnected = player.isConnected;
    playerState.isReady = player.isReady;
    playerState.x = player.position.x;
    playerState.y = player.position.y;
    playerState.spawnX = player.spawnPosition.x;
    playerState.spawnY = player.spawnPosition.y;
    playerState.teamId = player.teamId ?? "";

    while (playerState.turnFlags.length > 0) {
      playerState.turnFlags.pop();
    }
    for (const turnFlag of player.turnFlags) {
      playerState.turnFlags.push(turnFlag);
    }

    while (playerState.tools.length > 0) {
      playerState.tools.pop();
    }
    for (const tool of player.tools) {
      const toolState = new TurnToolState();
      toolState.instanceId = tool.instanceId;
      toolState.toolId = tool.toolId;
      toolState.charges = tool.charges;
      toolState.paramsJson = JSON.stringify(tool.params);
      toolState.source = tool.source;
      playerState.tools.push(toolState);
    }

    state.players.set(player.id, playerState);
  }

  state.turnInfo.currentPlayerId = snapshot.turnInfo.currentPlayerId;
  state.turnInfo.phase = snapshot.turnInfo.phase;
  state.turnInfo.turnNumber = snapshot.turnInfo.turnNumber;
  state.turnInfo.lastRolledMoveDieValue = snapshot.turnInfo.lastRolledMoveDieValue;
  state.turnInfo.moveRoll = snapshot.turnInfo.moveRoll;
  state.turnInfo.lastRolledToolId = snapshot.turnInfo.lastRolledToolId ?? "";
  state.turnInfo.toolDieSeed = snapshot.turnInfo.toolDieSeed;

  while (state.eventLog.length > 0) {
    state.eventLog.pop();
  }
  for (const event of snapshot.eventLog) {
    const entry = new EventLogEntryState();
    entry.id = event.id;
    entry.type = event.type;
    entry.message = event.message;
    entry.createdAt = event.createdAt;
    state.eventLog.push(entry);
  }

  if (!snapshot.latestPresentation) {
    state.latestPresentationSequence = 0;
    state.latestPresentationJson = "";
    return;
  }

  state.latestPresentationSequence = snapshot.latestPresentation.sequence;
  state.latestPresentationJson = JSON.stringify({
    actorId: snapshot.latestPresentation.actorId,
    toolId: snapshot.latestPresentation.toolId,
    durationMs: snapshot.latestPresentation.durationMs,
    events: snapshot.latestPresentation.events
  });
}
