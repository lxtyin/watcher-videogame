import type { ActionPresentationEvent } from "../types";
import type { ToolContentDefinition } from "../content/schema";
import { createDragDirectionInteraction } from "../toolInteraction";
import {
  buildMotionPositions,
  createPlayerMotionEvent,
  createPresentation,
  createProjectileEvent,
  offsetPresentationEvents
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
import { createMovementDescriptor } from "../rules/displacement";
import { resolveLinearDisplacement } from "../rules/movementSystem";
import { traceProjectile } from "../rules/spatial";
import type { ToolModule } from "./types";
import {
  createToolPreview,
  createUsedSummary,
  getToolParamValue,
  toMovementSubject
} from "./helpers";

export const BASKETBALL_TOOL_DEFINITION: ToolContentDefinition = {
  label: "篮球",
  description: "向所选方向投出篮球，命中的玩家会被击退。",
  disabledHint: "当前不能使用篮球。",
  source: "turn",
  interaction: createDragDirectionInteraction(),
  conditions: [],
  defaultCharges: 1,
  defaultParams: {
    projectileRange: 999,
    projectileBounceCount: 1,
    projectilePushDistance: 1
  },
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
  const pushedMovement = createMovementDescriptor("translate", "passive", {
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
  const motionEvents: ActionPresentationEvent[] = projectileEvent ? [projectileEvent] : [];
  const nestedEvents: ActionPresentationEvent[] = [];

  setDraftToolInventory(draft, consumeActiveTool(context));

  if (trace.collision.kind === "player") {
    for (const [index, hitPlayer] of trace.collision.players.entries()) {
      const presentationMark = markDraftPresentation(draft);
      const pushResolution = resolveLinearDisplacement(draft, {
        direction: trace.collision.direction,
        maxSteps: pushDistance,
        movePoints: pushDistance,
        movement: pushedMovement,
        player: toMovementSubject(hitPlayer),
        trackAffectedPlayerReason: "basketball"
      });

      if (!pushResolution.path.length) {
        continue;
      }

      const triggerEvents = consumeDraftPresentationFrom(draft, presentationMark);
      const motionEvent = createPlayerMotionEvent(
        `${context.activeTool.instanceId}:basketball-hit-${index}`,
        hitPlayer.id,
        buildMotionPositions(hitPlayer.position, pushResolution.path),
        "ground",
        impactStartMs
      );

      nestedEvents.push(
        ...offsetPresentationEvents(
          [...triggerEvents, ...pushResolution.presentationEvents],
          (motionEvent?.startMs ?? impactStartMs) + (motionEvent?.durationMs ?? 0)
        )
      );

      if (motionEvent) {
        motionEvents.push(motionEvent);
      }
    }
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
