import type {
  BoardPlayerState,
  BoardSummonState,
  CharacterStateMap,
  Direction,
  PlayerTurnFlag,
  TileType,
  TurnStartActionSnapshot,
  TurnToolSnapshot
} from "@watcher/shared";
import {
  PlayerState,
  SummonState,
  TileState,
  TurnToolState,
  WatcherState
} from "../schema/WatcherState";

// Schema board state is materialized into the shared board shape right before rule resolution.
export function createBoardDefinitionFromState(state: WatcherState) {
  return {
    width: state.boardWidth,
    height: state.boardHeight,
    tiles: Array.from(state.board.values() as Iterable<TileState>).map((tile) => ({
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
export function createBoardPlayersFromState(state: WatcherState): BoardPlayerState[] {
  return Array.from(state.players.values() as Iterable<PlayerState>).map((entry) => ({
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
    turnFlags: Array.from(entry.turnFlags) as PlayerTurnFlag[]
  }));
}

export function parseCharacterState(characterStateJson: string): CharacterStateMap {
  try {
    return JSON.parse(characterStateJson) as CharacterStateMap;
  } catch {
    return {};
  }
}

export function parseTurnStartActions(turnStartActionsJson: string): TurnStartActionSnapshot[] {
  try {
    return JSON.parse(turnStartActionsJson) as TurnStartActionSnapshot[];
  } catch {
    return [];
  }
}

export function createBoardSummonsFromState(state: WatcherState): BoardSummonState[] {
  return Array.from(state.summons.values() as Iterable<SummonState>).map((entry) => ({
    instanceId: entry.instanceId,
    summonId: entry.summonId as BoardSummonState["summonId"],
    ownerId: entry.ownerId,
    position: {
      x: entry.x,
      y: entry.y
    }
  }));
}

// Schema tool state is converted into plain snapshots before shared resolution.
export function createPlayerToolsFromState(player: PlayerState): TurnToolSnapshot[] {
  const parseToolParams = (paramsJson: string) => {
    try {
      return JSON.parse(paramsJson);
    } catch {
      return {};
    }
  };

  return Array.from(player.tools as Iterable<TurnToolState>).map((tool) => ({
    instanceId: tool.instanceId,
    toolId: tool.toolId as TurnToolSnapshot["toolId"],
    charges: tool.charges,
    params: parseToolParams(tool.paramsJson),
    source: tool.source === "character_skill" ? "character_skill" : "turn"
  }));
}
