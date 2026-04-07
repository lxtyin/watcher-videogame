import type { ActionResolution } from "../types";
import type { ToolContentDefinition } from "../content/schema";
import { createDragDirectionInteraction } from "../toolInteraction";
import { createPresentation } from "../rules/actionPresentation";
import {
  buildAppliedResolution,
  buildBlockedResolution,
  consumeActiveTool,
  requireDirection
} from "../rules/actionResolution";
import { createRocketResolutionDraft, resolveRocketIntoDraft } from "../rules/rocketResolution";
import { collectDirectionSelectionTiles } from "../rules/previewDescriptor";
import { traceProjectileFromPosition } from "../rules/spatial";
import type { ToolModule } from "./types";
import {
  createToolPreview,
  createUsedSummary,
  getToolParamValue,
} from "./helpers";

export const ROCKET_TOOL_DEFINITION: ToolContentDefinition = {
  label: "火箭",
  description: "沿选择方向发射火箭，命中后在落点爆炸并击飞周围玩家。",
  disabledHint: "当前不能使用火箭。",
  source: "turn",
  interaction: createDragDirectionInteraction(),
  conditions: [],
  defaultCharges: 1,
  defaultParams: {
    projectileRange: 999,
    rocketBlastLeapDistance: 3,
    rocketSplashPushDistance: 1
  },
  color: "#dc5f56",
  rollable: true,
  debugGrantable: true,
  endsTurnOnUse: false
};

function resolveRocketTool(context: Parameters<ToolModule["execute"]>[0]): ActionResolution {
  const direction = requireDirection(context);
  const projectileRange = getToolParamValue(context.activeTool, "projectileRange", 999);
  const blastLeapDistance = getToolParamValue(context.activeTool, "rocketBlastLeapDistance", 3);
  const splashPushDistance = getToolParamValue(context.activeTool, "rocketSplashPushDistance", 1);
  const selectionTiles = collectDirectionSelectionTiles(context.board, context.actor.position);

  if (!direction) {
    return buildBlockedResolution({
      actor: context.actor,
      nextToolDieSeed: context.toolDieSeed,
      preview: createToolPreview(context, {
        selectionTiles,
        valid: false
      }),
      reason: "Rocket needs a direction",
      tools: context.tools
    });
  }

  const trace = traceProjectileFromPosition(
    {
      board: context.board,
      players: context.players
    },
    context.actor.position,
    direction,
    projectileRange,
    0
  );
  const explosionPosition =
    trace.collision.kind === "player"
      ? trace.collision.position
      : trace.collision.kind === "solid"
        ? trace.collision.previousPosition
        : trace.path[trace.path.length - 1] ?? null;

  if (!explosionPosition) {
    return buildBlockedResolution({
      actor: context.actor,
      nextToolDieSeed: context.toolDieSeed,
      preview: createToolPreview(context, {
        actorPath: trace.path,
        selectionTiles,
        valid: false
      }),
      reason: "No rocket flight path",
      tools: context.tools
    });
  }

  const draft = createRocketResolutionDraft(
    consumeActiveTool(context),
    context.toolDieSeed
  );
  const rocketResolution = resolveRocketIntoDraft(
    {
      actorId: context.actor.id,
      board: context.board,
      players: context.players,
      sourceId: context.activeTool.instanceId,
      summons: context.summons
    },
    {
      blastLeapDistance,
      direction,
      eventIdPrefix: context.activeTool.instanceId,
      originPosition: context.actor.position,
      projectileOwnerId: context.actor.id,
      projectileRange,
      splashPushDistance,
      tagBase: `tool:${context.activeTool.toolId}`
    },
    draft
  );

  return buildAppliedResolution({
    actor: context.actor,
    affectedPlayers: draft.affectedPlayers,
    nextToolDieSeed: draft.nextToolDieSeed,
    path: trace.path,
    presentation: createPresentation(
      context.actor.id,
      context.activeTool.toolId,
      draft.presentationEvents
    ),
    preview: createToolPreview(context, {
      actorPath: trace.path,
      affectedPlayers: draft.affectedPlayers,
      effectTiles: rocketResolution.effectTiles,
      selectionTiles,
      valid: true
    }),
    summonMutations: draft.summonMutations,
    summary: createUsedSummary(ROCKET_TOOL_DEFINITION.label),
    tileMutations: draft.tileMutations,
    tools: draft.tools,
    triggeredSummonEffects: draft.triggeredSummonEffects,
    triggeredTerrainEffects: draft.triggeredTerrainEffects
  });
}

export const ROCKET_TOOL_MODULE: ToolModule<"rocket"> = {
  id: "rocket",
  definition: ROCKET_TOOL_DEFINITION,
  dieFace: {
    params: {
      projectileRange: 999,
      rocketBlastLeapDistance: 3,
      rocketSplashPushDistance: 1
    }
  },
  execute: resolveRocketTool
};
