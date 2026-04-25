import type { TeamId } from "@watcher/shared";

export function getTeamAccentColor(teamId: TeamId | null): string {
  if (teamId === "black") {
    return "#5f5470";
  }

  return "#e9e0d4";
}

export function getTeamTrimColor(teamId: TeamId | null): string {
  if (teamId === "black") {
    return "#2c3244";
  }

  return "#c78f80";
}

