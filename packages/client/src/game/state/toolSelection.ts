import {
  findToolInstance,
  getToolAvailability,
  isDirectionalTool,
  isTileTargetTool,
  type GameSnapshot,
  type TurnToolSnapshot
} from "@watcher/shared";

type SelectedToolInstanceId = string | null;

type SnapshotPlayer = GameSnapshot["players"][number];

export interface SelectedToolState {
  availability: ReturnType<typeof getToolAvailability>;
  player: SnapshotPlayer;
  tool: TurnToolSnapshot;
}

// Selected tool lookup is reused across sidebar UI, keyboard input, and room command guards.
export function findSelectedTool(
  snapshot: GameSnapshot | null,
  sessionId: string | null,
  selectedToolInstanceId: SelectedToolInstanceId
): TurnToolSnapshot | null {
  if (!snapshot || !sessionId || !selectedToolInstanceId) {
    return null;
  }

  const player = snapshot.players.find((entry) => entry.id === sessionId);

  return player ? findToolInstance(player.tools, selectedToolInstanceId) ?? null : null;
}

export function getSelectedToolState(
  snapshot: GameSnapshot | null,
  sessionId: string | null,
  selectedToolInstanceId: SelectedToolInstanceId
): SelectedToolState | null {
  if (!snapshot || !sessionId || !selectedToolInstanceId) {
    return null;
  }

  const player = snapshot.players.find((entry) => entry.id === sessionId);

  if (!player) {
    return null;
  }

  const tool = findToolInstance(player.tools, selectedToolInstanceId);

  if (!tool) {
    return null;
  }

  return {
    availability: getToolAvailability(tool, player.tools),
    player,
    tool
  };
}

export function getUsableDirectionalToolState(
  snapshot: GameSnapshot | null,
  sessionId: string | null,
  selectedToolInstanceId: SelectedToolInstanceId
): SelectedToolState | null {
  const selectedToolState = getSelectedToolState(snapshot, sessionId, selectedToolInstanceId);

  if (
    !selectedToolState ||
    !isDirectionalTool(selectedToolState.tool.toolId) ||
    !selectedToolState.availability.usable
  ) {
    return null;
  }

  return selectedToolState;
}

export function getUsableTileToolState(
  snapshot: GameSnapshot | null,
  sessionId: string | null,
  selectedToolInstanceId: SelectedToolInstanceId
): SelectedToolState | null {
  const selectedToolState = getSelectedToolState(snapshot, sessionId, selectedToolInstanceId);

  if (
    !selectedToolState ||
    !isTileTargetTool(selectedToolState.tool.toolId) ||
    !selectedToolState.availability.usable
  ) {
    return null;
  }

  return selectedToolState;
}

export function getUsableInstantToolState(
  snapshot: GameSnapshot | null,
  sessionId: string | null,
  selectedToolInstanceId: SelectedToolInstanceId
): SelectedToolState | null {
  const selectedToolState = getSelectedToolState(snapshot, sessionId, selectedToolInstanceId);

  if (
    !selectedToolState ||
    isDirectionalTool(selectedToolState.tool.toolId) ||
    isTileTargetTool(selectedToolState.tool.toolId) ||
    !selectedToolState.availability.usable
  ) {
    return null;
  }

  return selectedToolState;
}
