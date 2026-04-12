import {
  findToolInstance,
  getToolDefinition,
  type GameSnapshot,
  type ToolUsabilityResult,
  type TurnToolSnapshot
} from "@watcher/shared";

type SelectedToolInstanceId = string | null;

type SnapshotPlayer = GameSnapshot["players"][number];

export interface SelectedToolState {
  availability: ToolUsabilityResult;
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
    availability: getToolDefinition(tool.toolId).isAvailable({
      tool,
      tools: player.tools
    }),
    player,
    tool
  };
}
