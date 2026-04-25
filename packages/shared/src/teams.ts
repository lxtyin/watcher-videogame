import { PLAYER_COLORS } from "./constants";
import type { GameMode, TeamId } from "./types";

export const TEAM_IDS = ["white", "black"] as const satisfies readonly TeamId[];

const TEAM_COLOR_PALETTES: Record<TeamId, readonly string[]> = {
  white: ["#f4d7d1", "#f2e2b8", "#d6e8ff", "#d8f0e6"],
  black: ["#675577", "#3d5879", "#6c4d44", "#305f5b"]
};

export function getSequentialTeamId(playerIndex: number): TeamId {
  return TEAM_IDS[Math.abs(playerIndex) % TEAM_IDS.length] ?? "white";
}

export function getTeamSeatIndex(playerIndex: number): number {
  return Math.max(0, Math.floor(playerIndex / TEAM_IDS.length));
}

export function getTeamDisplayLabel(teamId: TeamId): string {
  return teamId === "white" ? "白队" : "黑队";
}

export function getAssignedPlayerColor(
  mode: GameMode,
  playerIndex: number,
  teamId: TeamId | null
): string {
  if (mode !== "bedwars" || !teamId) {
    return PLAYER_COLORS[playerIndex % PLAYER_COLORS.length] ?? "#ec6f5a";
  }

  const palette = TEAM_COLOR_PALETTES[teamId];
  return palette[getTeamSeatIndex(playerIndex) % palette.length] ?? palette[0] ?? "#ec6f5a";
}

export function isTeamId(value: string | null | undefined): value is TeamId {
  return value === "white" || value === "black";
}

