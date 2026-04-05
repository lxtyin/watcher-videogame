import type {
  BoardPlayerState,
  BoardSummonState,
  Direction,
  GameSnapshot,
  ModifierId,
  PlayerTagMap,
  PlayerTurnFlag,
  SequencedActionPresentation,
  TileType,
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
  return Array.from(state.players.values() as Iterable<PlayerState>)
    .filter((entry) => entry.boardVisible)
    .map((entry) => ({
      id: entry.id,
      boardVisible: entry.boardVisible,
      characterId: entry.characterId,
      modifiers: Array.from(entry.modifiers) as ModifierId[],
      tags: parsePlayerTags(entry.tagsJson),
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

export function parsePlayerTags(tagsJson: string): PlayerTagMap {
  try {
    return JSON.parse(tagsJson) as PlayerTagMap;
  } catch {
    return {};
  }
}

export function parseLatestPresentation(
  state: WatcherState
): SequencedActionPresentation | null {
  if (!state.latestPresentationSequence || !state.latestPresentationJson) {
    return null;
  }

  try {
    return {
      ...(JSON.parse(state.latestPresentationJson) as Omit<SequencedActionPresentation, "sequence">),
      sequence: state.latestPresentationSequence
    };
  } catch {
    return null;
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

export function createGameSnapshotFromState(state: WatcherState): GameSnapshot {
  return {
    allowDebugTools: state.allowDebugTools,
    boardWidth: state.boardWidth,
    boardHeight: state.boardHeight,
    eventLog: Array.from(state.eventLog as Iterable<EventLogEntryState>).map((entry) => ({
      id: entry.id,
      type: entry.type as GameSnapshot["eventLog"][number]["type"],
      message: entry.message,
      createdAt: entry.createdAt
    })),
    hostPlayerId: state.hostPlayerId || null,
    latestPresentation: parseLatestPresentation(state),
    mapId: state.mapId as GameSnapshot["mapId"],
    mapLabel: state.mapLabel,
    mode: state.mode,
    players: Array.from(state.players.values() as Iterable<PlayerState>).map((player) => ({
      id: player.id,
      name: player.name,
      petId: player.petId ?? "",
      color: player.color,
      boardVisible: player.boardVisible,
      characterId: player.characterId,
      modifiers: Array.from(player.modifiers) as ModifierId[],
      tags: parsePlayerTags(player.tagsJson),
      finishRank: player.finishRank > 0 ? player.finishRank : null,
      finishedTurnNumber: player.finishedTurnNumber > 0 ? player.finishedTurnNumber : null,
      isConnected: player.isConnected,
      isReady: player.isReady,
      position: {
        x: player.x,
        y: player.y
      },
      spawnPosition: {
        x: player.spawnX,
        y: player.spawnY
      },
      turnFlags: Array.from(player.turnFlags) as PlayerTurnFlag[],
      tools: createPlayerToolsFromState(player)
    })),
    roomCode: state.roomCode,
    roomPhase: state.roomPhase,
    settlementState: state.settlementState as GameSnapshot["settlementState"],
    summons: createBoardSummonsFromState(state),
    tiles: createBoardDefinitionFromState(state).tiles,
    turnInfo: {
      currentPlayerId: state.turnInfo.currentPlayerId,
      phase: state.turnInfo.phase as GameSnapshot["turnInfo"]["phase"],
      turnNumber: state.turnInfo.turnNumber,
      moveRoll: state.turnInfo.moveRoll,
      lastRolledToolId:
        state.turnInfo.lastRolledToolId === ""
          ? null
          : state.turnInfo.lastRolledToolId,
      toolDieSeed: state.turnInfo.toolDieSeed
    }
  };
}
