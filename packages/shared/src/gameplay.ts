import { getGameMapDefinition, resolveGameMapId } from "./content/maps";
import type { GameMapId, GameMode, GameSettlementState } from "./types";

interface FinishedPlayerLike {
  finishRank: number | null;
  finishedTurnNumber: number | null;
  id: string;
}

export interface RaceStandingEntry {
  finishedTurnNumber: number;
  playerId: string;
  rank: number;
}

export interface GameMapRuntimeMetadata {
  allowDebugTools: boolean;
  mapId: GameMapId;
  mapLabel: string;
  mode: GameMode;
}

export function buildGameMapRuntimeMetadata(mapId?: string): GameMapRuntimeMetadata {
  const resolvedMapId = resolveGameMapId(mapId);
  const definition = getGameMapDefinition(resolvedMapId);

  return {
    allowDebugTools: definition.allowDebugTools,
    mapId: resolvedMapId,
    mapLabel: definition.label,
    mode: definition.mode
  };
}

export function isPlayerFinished(player: Pick<FinishedPlayerLike, "finishRank">): boolean {
  return player.finishRank !== null;
}

export function getNextFinishRank(players: FinishedPlayerLike[]): number {
  return (
    players.reduce((highestRank, player) => Math.max(highestRank, player.finishRank ?? 0), 0) + 1
  );
}

export function buildRaceStandings(players: FinishedPlayerLike[]): RaceStandingEntry[] {
  return players
    .filter(
      (player): player is FinishedPlayerLike & { finishRank: number; finishedTurnNumber: number } =>
        player.finishRank !== null && player.finishedTurnNumber !== null
    )
    .sort((left, right) => {
      if (left.finishRank !== right.finishRank) {
        return left.finishRank - right.finishRank;
      }

      if (left.finishedTurnNumber !== right.finishedTurnNumber) {
        return left.finishedTurnNumber - right.finishedTurnNumber;
      }

      return left.id.localeCompare(right.id);
    })
    .map((player) => ({
      playerId: player.id,
      rank: player.finishRank,
      finishedTurnNumber: player.finishedTurnNumber
    }));
}

export function areAllRacePlayersFinished(players: FinishedPlayerLike[]): boolean {
  return players.length > 0 && players.every((player) => isPlayerFinished(player));
}

export function resolveSettlementState(
  mode: GameMode,
  players: FinishedPlayerLike[]
): GameSettlementState {
  if (mode !== "race") {
    return "active";
  }

  return areAllRacePlayersFinished(players) ? "complete" : "active";
}

export function getNextActiveRacePlayerId(
  playerOrder: string[],
  players: FinishedPlayerLike[],
  currentPlayerId: string
): string | null {
  if (!playerOrder.length) {
    return null;
  }

  const finishedIds = new Set(players.filter(isPlayerFinished).map((player) => player.id));
  const startIndex = Math.max(0, playerOrder.findIndex((playerId) => playerId === currentPlayerId));

  for (let offset = 1; offset <= playerOrder.length; offset += 1) {
    const candidateId = playerOrder[(startIndex + offset) % playerOrder.length];

    if (candidateId && !finishedIds.has(candidateId)) {
      return candidateId;
    }
  }

  return null;
}
