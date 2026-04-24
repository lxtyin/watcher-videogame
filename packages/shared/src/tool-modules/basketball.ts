import type { ActionPresentationEvent } from "../types";
import type { ToolContentDefinition } from "../content/schema";
import { createDragDirectionInteraction } from "../toolInteraction";
import {
  createPresentation,
  createProjectileEvent,
  buildMotionPositions
} from "../rules/actionPresentation";
import {
  appendDraftPresentationEvents,
  consumeDraftPresentationFrom,
  markDraftPresentation,
  setDraftActionPresentation,
  setDraftApplied,
  setDraftBlocked,
  setDraftToolInventory
} from "../rules/actionDraft";
import { consumeActiveTool, requireDirection } from "../rules/actionResolution";
import { createMovementDescriptorInput } from "../rules/displacement";
import { resolveLinearDisplacement } from "../rules/movementSystem";
import { traceProjectile } from "../rules/spatial";
import { resolveImpactTerrainEffect } from "../terrain";
import type { ToolModule } from "./types";
import {
  createToolPreview,
  createDraftSoundEvent,
  createPlayerAnchor,
  createUsedSummary,
  getToolParamValue,
  isChargedToolAvailable,
  toMovementSubject
} from "./helpers";

export const BASKETBALL_TOOL_DEFINITION: ToolContentDefinition = {
  label: "篮球",
  description: "向所选方向投出篮球，命中的玩家会被击退。",
  disabledHint: "当前不能使用篮球。",
  source: "turn",
  interaction: createDragDirectionInteraction(),
  isAvailable: isChargedToolAvailable,
  defaultCharges: 1,
  defaultParams: {
    projectileRange: 999,
    projectileBounceCount: 1,
    projectilePushDistance: 1
  },
  getTextDescription: ({ params }) => ({
    title: "篮球",
    description: "向所选方向投出篮球，命中的玩家会被击退。",
    details: [
      `击退 ${params.projectilePushDistance ?? 0} 格`,
      `射程 ${(params.projectileRange ?? 0) >= 999 ? "全场" : `${params.projectileRange ?? 0} 格`}`,
      `反弹次数 ${params.projectileBounceCount ?? 0} 次`,
    ]
  }),
  color: "#d9824c",
  rollable: true,
  debugGrantable: true,
  endsTurnOnUse: false
};

function resolveBasketballTool(
  draft: Parameters<ToolModule["execute"]>[0],
  context: Parameters<ToolModule["execute"]>[1]
): void {
  const direction = requireDirection(context);
  const projectileRange = getToolParamValue(context.activeTool, "projectileRange", 999);
  const bounceCount = getToolParamValue(context.activeTool, "projectileBounceCount", 1);
  const pushDistance = getToolParamValue(context.activeTool, "projectilePushDistance", 1);
  const pushedMovement = createMovementDescriptorInput("passive", {
    tags: [`tool:${context.activeTool.toolId}`, "basketball:push"],
    timing: "out_of_turn"
  });

  if (!direction) {
    setDraftBlocked(draft, "Basketball needs a direction", {
      preview: createToolPreview(context, { valid: false })
    });
    return;
  }

  const trace = traceProjectile(context, direction, projectileRange, bounceCount);
  const projectileEvent = createProjectileEvent(
    `${context.activeTool.instanceId}:projectile`,
    context.actor.id,
    "basketball",
    buildMotionPositions(context.actor.position, trace.path)
  );
  const impactStartMs = projectileEvent ? projectileEvent.startMs + projectileEvent.durationMs : 0;
  const motionEvents: ActionPresentationEvent[] = [
    ...(projectileEvent ? [projectileEvent] : []),
    createDraftSoundEvent(draft, "tool_throw", "basketball:throw", {
      anchor: createPlayerAnchor(context.actor.id)
    })
  ];
  const nestedEvents: ActionPresentationEvent[] = [];

  setDraftToolInventory(draft, consumeActiveTool(context));

  if (trace.collision.kind === "player") {
    for (const hitPlayer of trace.collision.players) {
      const presentationMark = markDraftPresentation(draft);
      const pushResolution = resolveLinearDisplacement(draft, {
        direction: trace.collision.direction,
        movePoints: pushDistance,
        movement: pushedMovement,
        player: toMovementSubject(hitPlayer),
        startMs: impactStartMs,
        trackAffectedPlayerReason: "basketball"
      });

      if (!pushResolution.path.length) {
        continue;
      }

      nestedEvents.push(...consumeDraftPresentationFrom(draft, presentationMark));
    }
  }

  if (trace.collision.kind === "solid") {
    resolveImpactTerrainEffect(draft, {
      direction: trace.collision.direction,
      position: trace.collision.position,
      source: {
        kind: "projectile",
        ownerId: context.actor.id,
        projectileType: "basketball"
      },
      startMs: impactStartMs,
      strength: 999,
      tile: trace.collision.tile
    });
  }

  setDraftActionPresentation(
    draft,
    createPresentation(context.actor.id, context.activeTool.toolId, motionEvents)
  );
  appendDraftPresentationEvents(draft, nestedEvents);
  setDraftApplied(draft, createUsedSummary(BASKETBALL_TOOL_DEFINITION.label), {
    path: trace.path,
    preview: createToolPreview(context, {
      affectedPlayers: draft.affectedPlayers,
      effectTiles: trace.path,
      valid: true
    })
  });
}

export const BASKETBALL_TOOL_MODULE: ToolModule<"basketball"> = {
  id: "basketball",
  definition: BASKETBALL_TOOL_DEFINITION,
  dieFace: {
    params: {
      projectileRange: 999,
      projectileBounceCount: 1,
      projectilePushDistance: 1
    }
  },
  execute: resolveBasketballTool
};
