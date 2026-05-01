import {
  cloneToolSelectionRecord,
  getToolDefinition,
  type GameSnapshot,
  type ToolActionContext,
  type ToolSelectionRecord,
  type ToolUsabilityContext,
  type ToolUsabilityResult,
  type TurnToolSnapshot
} from "@watcher/shared";

export function buildToolUsabilityContextFromSnapshot(
  snapshot: GameSnapshot | null,
  actorId: string | null,
  tool: TurnToolSnapshot,
  tools: TurnToolSnapshot[]
): ToolUsabilityContext {
  const actor = actorId ? snapshot?.players.find((player) => player.id === actorId) : null;

  return {
    ...(snapshot
      ? {
          phase: snapshot.turnInfo.phase
        }
      : {}),
    ...(actorId && actor
      ? {
          actorId,
          actorTags: actor.tags,
          turnNumber: snapshot!.turnInfo.turnNumber
        }
      : {}),
    tool,
    toolHistory: snapshot?.toolHistory ?? [],
    tools
  };
}

export function getToolAvailabilityFromSnapshot(
  snapshot: GameSnapshot | null,
  actorId: string | null,
  tool: TurnToolSnapshot,
  tools: TurnToolSnapshot[]
): ToolUsabilityResult {
  return getToolDefinition(tool.toolId).isAvailable(
    buildToolUsabilityContextFromSnapshot(snapshot, actorId, tool, tools)
  );
}

export function buildToolActionContextFromSnapshot(
  snapshot: GameSnapshot | null,
  actorId: string | null,
  activeTool: TurnToolSnapshot | null,
  input: ToolSelectionRecord = {}
): ToolActionContext | null {
  if (!snapshot || !actorId || !activeTool) {
    return null;
  }

  const actor = snapshot.players.find((player) => player.id === actorId);

  if (!actor) {
    return null;
  }

  return {
    activeTool,
    actor: {
      id: actor.id,
      characterId: actor.characterId,
      modifiers: actor.modifiers,
      position: actor.position,
      spawnPosition: actor.spawnPosition,
      tags: actor.tags,
      teamId: actor.teamId,
      turnFlags: actor.turnFlags
    },
    board: {
      width: snapshot.boardWidth,
      height: snapshot.boardHeight,
      tiles: snapshot.tiles
    },
    input: cloneToolSelectionRecord(input),
    mode: snapshot.mode,
    phase: snapshot.turnInfo.phase,
    players: snapshot.players
      .filter((player) => player.boardVisible)
      .map((player) => ({
        id: player.id,
        boardVisible: player.boardVisible,
        characterId: player.characterId,
        modifiers: player.modifiers,
        position: player.position,
        spawnPosition: player.spawnPosition,
        tags: player.tags,
        teamId: player.teamId,
        turnFlags: player.turnFlags
      })),
    toolHistory: snapshot.toolHistory,
    summons: snapshot.summons.map((summon) => ({
      instanceId: summon.instanceId,
      summonId: summon.summonId,
      ownerId: summon.ownerId,
      position: summon.position
    })),
    toolDieSeed: snapshot.turnInfo.toolDieSeed,
    turnNumber: snapshot.turnInfo.turnNumber,
    tools: actor.tools
  };
}
