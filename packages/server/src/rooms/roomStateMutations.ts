import type {
  AffectedPlayerMove,
  CharacterStateMap,
  SummonMutation,
  TileMutation,
  TurnToolSnapshot
} from "@watcher/shared";
import {
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

export function applyCharacterState(player: PlayerState, characterState: CharacterStateMap): void {
  player.characterStateJson = JSON.stringify(characterState);
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
  applyCharacterStatePatch: (player: PlayerState, characterState: CharacterStateMap) => void
): void {
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
