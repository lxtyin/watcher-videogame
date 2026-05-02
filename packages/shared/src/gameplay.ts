import { getGameMapDefinition, resolveGameMapId, type GameMapContentDefinition } from "./content/maps";
import type { GameMapId, GameMode, GameSettlementState, TeamId } from "./types";

interface PlayerProgressLike {
  boardVisible: boolean;
  finishRank: number | null;
  finishedTurnNumber: number | null;
  id: string;
  teamId: TeamId | null;
}

export interface RaceStandingEntry {
  finishedTurnNumber: number;
  playerId: string;
  rank: number;
}

export interface GameMapRuntimeMetadata {
  allowDebugTools: boolean;
  initialSeeds?: import("./content/maps").GameMapInitialSeeds;
  mapId: GameMapId;
  mapLabel: string;
  mode: GameMode;
}

export function buildGameMapRuntimeMetadata(mapId?: string): GameMapRuntimeMetadata {
  const resolvedMapId = resolveGameMapId(mapId);
  const definition: GameMapContentDefinition = getGameMapDefinition(resolvedMapId);

  return {
    allowDebugTools: definition.allowDebugTools,
    ...(definition.initialSeeds ? { initialSeeds: { ...definition.initialSeeds } } : {}),
    mapId: resolvedMapId,
    mapLabel: definition.label,
    mode: definition.mode
  };
}

export function isPlayerFinished(player: Pick<PlayerProgressLike, "finishRank">): boolean {
  return player.finishRank !== null;
}

export function isPlayerActiveForTurn(
  mode: GameMode,
  player: Pick<PlayerProgressLike, "boardVisible" | "finishRank">
): boolean {
  if (mode === "race") {
    return !isPlayerFinished(player);
  }

  if (mode === "bedwars") {
    return player.boardVisible;
  }

  return true;
}

export function getNextFinishRank(players: Pick<PlayerProgressLike, "finishRank">[]): number {
  return players.reduce((highestRank, player) => Math.max(highestRank, player.finishRank ?? 0), 0) + 1;
}

export function buildRaceStandings(players: PlayerProgressLike[]): RaceStandingEntry[] {
  return players
    .filter(
      (player): player is PlayerProgressLike & { finishRank: number; finishedTurnNumber: number } =>
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

export function areAllRacePlayersFinished(players: Pick<PlayerProgressLike, "finishRank">[]): boolean {
  return players.length > 0 && players.every((player) => isPlayerFinished(player));
}

export function getAliveTeamIds(
  players: Pick<PlayerProgressLike, "boardVisible" | "teamId">[]
): TeamId[] {
  return [...new Set(players.filter((player) => player.boardVisible && player.teamId).map((player) => player.teamId!))];
}

export function getBedwarsWinningTeamId(
  players: Pick<PlayerProgressLike, "boardVisible" | "teamId">[]
): TeamId | null {
  const aliveTeams = getAliveTeamIds(players);
  return aliveTeams.length === 1 ? aliveTeams[0] ?? null : null;
}

export function resolveSettlementState(
  mode: GameMode,
  players: PlayerProgressLike[]
): GameSettlementState {
  if (mode === "race") {
    return areAllRacePlayersFinished(players) ? "complete" : "active";
  }

  if (mode === "bedwars") {
    const teamsInMatch = new Set(players.flatMap((player) => (player.teamId ? [player.teamId] : [])));

    if (!teamsInMatch.size) {
      return "active";
    }

    return getAliveTeamIds(players).length <= 1 ? "complete" : "active";
  }

  return "active";
}

export function getNextActivePlayerId(
  playerOrder: string[],
  players: PlayerProgressLike[],
  currentPlayerId: string,
  mode: GameMode
): string | null {
  if (!playerOrder.length) {
    return null;
  }

  const playersById = new Map(players.map((player) => [player.id, player] as const));
  const startIndex = Math.max(0, playerOrder.findIndex((playerId) => playerId === currentPlayerId));

  for (let offset = 1; offset <= playerOrder.length; offset += 1) {
    const candidateId = playerOrder[(startIndex + offset) % playerOrder.length];
    const candidate = candidateId ? playersById.get(candidateId) : null;

    if (candidateId && candidate && isPlayerActiveForTurn(mode, candidate)) {
      return candidateId;
    }
  }

  return null;
}
