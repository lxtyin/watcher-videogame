import { applyPassThroughSummonEffects } from "../summons";
import { applyStopTerrainEffects } from "../terrain";
import { consumeToolInstance, getToolDefinition } from "../tools";
import type {
  ActionPresentation,
  ActionResolution,
  AffectedPlayerMove,
  Direction,
  GridPosition,
  MovementActor,
  SummonMutation,
  TileMutation,
  ToolActionContext,
  TriggeredSummonEffect,
  TriggeredTerrainEffect,
  TurnToolSnapshot
} from "../types";

// Blocked resolutions preserve tool inventory so previews can explain why an action failed.
export function buildBlockedResolution(
  actor: MovementActor,
  tools: TurnToolSnapshot[],
  reason: string,
  nextToolDieSeed: number,
  path: GridPosition[] = [],
  triggeredTerrainEffects: TriggeredTerrainEffect[] = [],
  previewTiles: GridPosition[] = []
): ActionResolution {
  return {
    kind: "blocked",
    reason,
    path,
    previewTiles,
    actor: {
      position: actor.position,
      turnFlags: actor.turnFlags
    },
    tools,
    affectedPlayers: [],
    tileMutations: [],
    summonMutations: [],
    triggeredTerrainEffects,
    triggeredSummonEffects: [],
    presentation: null,
    endsTurn: false,
    nextToolDieSeed
  };
}

// Applied resolutions capture the immediate tool result before stop-terrain post-processing.
export function buildAppliedResolution(
  nextActor: MovementActor,
  tools: TurnToolSnapshot[],
  summary: string,
  nextToolDieSeed: number,
  path: GridPosition[],
  tileMutations: TileMutation[] = [],
  affectedPlayers: AffectedPlayerMove[] = [],
  triggeredTerrainEffects: TriggeredTerrainEffect[] = [],
  previewTiles: GridPosition[] = [],
  presentation: ActionPresentation | null = null,
  summonMutations: SummonMutation[] = [],
  triggeredSummonEffects: TriggeredSummonEffect[] = [],
  endsTurn = false
): ActionResolution {
  return {
    kind: "applied",
    summary,
    path,
    previewTiles,
    actor: {
      position: nextActor.position,
      turnFlags: nextActor.turnFlags
    },
    tools,
    affectedPlayers,
    tileMutations,
    summonMutations,
    triggeredTerrainEffects,
    triggeredSummonEffects,
    presentation,
    endsTurn,
    nextToolDieSeed
  };
}

// Stop terrain runs after tool mechanics so every executor inherits the same landing rules.
export function finalizeAppliedResolution(
  context: ToolActionContext,
  resolution: ActionResolution
): ActionResolution {
  if (resolution.kind === "blocked") {
    return resolution;
  }

  const stopResolution = applyStopTerrainEffects({
    activeTool: context.activeTool,
    actor: context.actor,
    actorPosition: resolution.actor.position,
    affectedPlayers: resolution.affectedPlayers,
    board: context.board,
    players: context.players,
    tileMutations: resolution.tileMutations,
    toolDieSeed: resolution.nextToolDieSeed,
    tools: resolution.tools
  });

  return {
    ...resolution,
    actor: stopResolution.actor,
    affectedPlayers: stopResolution.affectedPlayers,
    tools: stopResolution.tools,
    triggeredTerrainEffects: [
      ...resolution.triggeredTerrainEffects,
      ...stopResolution.triggeredTerrainEffects
    ],
    nextToolDieSeed: stopResolution.nextToolDieSeed
  };
}

export function applyPassThroughBoardEffects(
  context: ToolActionContext,
  resolution: ActionResolution
): ActionResolution {
  if (resolution.kind === "blocked") {
    return resolution;
  }

  if (
    !resolution.path.length ||
    getToolDefinition(context.activeTool.toolId).passThroughEffectMode !== "ground"
  ) {
    return resolution;
  }

  const summonResolution = applyPassThroughSummonEffects({
    actor: context.actor,
    path: resolution.path,
    summons: context.summons,
    toolDieSeed: resolution.nextToolDieSeed,
    tools: resolution.tools
  });

  if (!summonResolution.summonMutations.length && !summonResolution.triggeredSummonEffects.length) {
    return resolution;
  }

  return {
    ...resolution,
    tools: summonResolution.tools,
    summonMutations: [...resolution.summonMutations, ...summonResolution.summonMutations],
    triggeredSummonEffects: [
      ...resolution.triggeredSummonEffects,
      ...summonResolution.triggeredSummonEffects
    ],
    nextToolDieSeed: summonResolution.nextToolDieSeed
  };
}

export function buildSummonInstanceId(activeTool: TurnToolSnapshot, summonId: string): string {
  return `${activeTool.instanceId}:${summonId}`;
}

// Tool consumption stays centralized so executors do not rewrite inventory logic.
export function consumeActiveTool(context: ToolActionContext): TurnToolSnapshot[] {
  return consumeToolInstance(context.tools, context.activeTool.instanceId);
}

// Directional executors read from the optional payload through one shared helper.
export function requireDirection(context: ToolActionContext): Direction | null {
  return context.direction ?? null;
}
