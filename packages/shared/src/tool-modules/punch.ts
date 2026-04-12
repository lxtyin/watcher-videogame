import type { ActionPresentationEvent, GridPosition } from "../types";
import type { ToolContentDefinition } from "../content/schema";
import { createDragDirectionInteraction } from "../toolInteraction";
import { createEffectEvent } from "../rules/actionPresentation";
import {
  appendDraftPresentationEvents,
  consumeDraftPresentationFrom,
  createDraftEventId,
  markDraftPresentation,
  setDraftApplied,
  setDraftBlocked,
  setDraftToolInventory
} from "../rules/actionDraft";
import { consumeActiveTool, requireDirection } from "../rules/actionResolution";
import { createMovementDescriptorInput } from "../rules/displacement";
import { resolveLinearDisplacement } from "../rules/movementSystem";
import { getOppositeDirection, traceProjectile } from "../rules/spatial";
import type { ToolModule } from "./types";
import {
  createToolPreview,
  createUsedSummary,
  getToolParamValue,
  toMovementSubject
} from "./helpers";

const PUNCH_IMPACT_DURATION_MS = 360;
const PUNCH_DEFAULT_RANGE = 2;
const PUNCH_DEFAULT_PUSH_DISTANCE = 3;
const PUNCH_PUSH_START_MS = 80;

export const PUNCH_TOOL_DEFINITION: ToolContentDefinition = {
  label: "拳击",
  description: "向所选方向出拳，命中的玩家会被击退，命中墙壁时反推自身。",
  disabledHint: "当前不能使用拳击。",
  source: "turn",
  interaction: createDragDirectionInteraction(),
  defaultCharges: 1,
  defaultParams: {
    projectileRange: PUNCH_DEFAULT_RANGE,
    projectilePushDistance: PUNCH_DEFAULT_PUSH_DISTANCE
  },
  getTextDescription: ({ params }) => ({
    title: "拳击",
    description: "向所选方向出拳，命中的玩家会被击退，命中墙壁时反推自身。",
    details: [
      `射程 ${params.projectileRange ?? PUNCH_DEFAULT_RANGE} 格`,
      `击退 ${params.projectilePushDistance ?? PUNCH_DEFAULT_PUSH_DISTANCE} 格`
    ]
  }),
  color: "#ff3270",
  rollable: true,
  debugGrantable: true,
  endsTurnOnUse: false
};

function appendUniquePosition(positions: GridPosition[], position: GridPosition): GridPosition[] {
  if (positions.some((entry) => entry.x === position.x && entry.y === position.y)) {
    return positions;
  }

  return [...positions, position];
}

function getPunchEffectTiles(trace: ReturnType<typeof traceProjectile>): GridPosition[] {
  if (trace.collision.kind === "player" || trace.collision.kind === "solid") {
    return appendUniquePosition(trace.path, trace.collision.position);
  }

  return trace.path;
}

function resolvePunchTool(
  draft: Parameters<ToolModule["execute"]>[0],
  context: Parameters<ToolModule["execute"]>[1]
): void {
  const direction = requireDirection(context);
  const punchRange = getToolParamValue(context.activeTool, "projectileRange", PUNCH_DEFAULT_RANGE);
  const pushDistance = getToolParamValue(
    context.activeTool,
    "projectilePushDistance",
    PUNCH_DEFAULT_PUSH_DISTANCE
  );
  const pushedOtherMovement = createMovementDescriptorInput("passive", {
    timing: "out_of_turn"
  });
  const pushedSelfMovement = createMovementDescriptorInput("passive", {
    timing: "in_turn"
  });

  if (!direction) {
    setDraftBlocked(draft, "Punch needs a direction", {
      preview: createToolPreview(context, { valid: false })
    });
    return;
  }

  const trace = traceProjectile(context, direction, punchRange, 0);
  const effectTiles = getPunchEffectTiles(trace);
  const nestedEvents: ActionPresentationEvent[] = [];

  setDraftToolInventory(draft, consumeActiveTool(context));

  if (trace.collision.kind === "player") {
    nestedEvents.push(
      createEffectEvent(
        createDraftEventId(draft, "punch:player-hit"),
        "punch_player_hit",
        trace.collision.position,
        [trace.collision.position],
        0,
        PUNCH_IMPACT_DURATION_MS
      )
    );

    for (const hitPlayer of trace.collision.players) {
      const presentationMark = markDraftPresentation(draft);
      const pushResolution = resolveLinearDisplacement(draft, {
        direction: trace.collision.direction,
        maxSteps: pushDistance,
        movePoints: pushDistance,
        movement: pushedOtherMovement,
        player: toMovementSubject(hitPlayer),
        startMs: PUNCH_PUSH_START_MS,
        trackAffectedPlayerReason: "punch"
      });

      if (!pushResolution.path.length) {
        continue;
      }

      nestedEvents.push(...consumeDraftPresentationFrom(draft, presentationMark));
    }
  } else if (trace.collision.kind === "solid") {
    nestedEvents.push(
      createEffectEvent(
        createDraftEventId(draft, "punch:wall-hit"),
        "punch_wall_hit",
        trace.collision.position,
        [trace.collision.position],
        0,
        PUNCH_IMPACT_DURATION_MS
      )
    );

    const presentationMark = markDraftPresentation(draft);
    const pushResolution = resolveLinearDisplacement(draft, {
      direction: getOppositeDirection(trace.collision.direction),
      maxSteps: pushDistance,
      movePoints: pushDistance,
      movement: pushedSelfMovement,
      player: toMovementSubject(context.actor),
      startMs: PUNCH_PUSH_START_MS,
      trackAffectedPlayerReason: "punch"
    });

    if (pushResolution.path.length) {
      nestedEvents.push(...consumeDraftPresentationFrom(draft, presentationMark));
    }
  }

  appendDraftPresentationEvents(draft, nestedEvents);
  setDraftApplied(draft, createUsedSummary(PUNCH_TOOL_DEFINITION.label), {
    path: trace.path,
    preview: createToolPreview(context, {
      affectedPlayers: draft.affectedPlayers,
      effectTiles,
      valid: true
    })
  });
}

export const PUNCH_TOOL_MODULE: ToolModule<"punch"> = {
  id: "punch",
  definition: PUNCH_TOOL_DEFINITION,
  dieFace: {
    params: {
      projectileRange: PUNCH_DEFAULT_RANGE,
      projectilePushDistance: PUNCH_DEFAULT_PUSH_DISTANCE
    }
  },
  execute: resolvePunchTool
};
