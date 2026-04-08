import type { ActionPresentationEvent } from "../types";
import type { ToolContentDefinition } from "../content/schema";
import { createDragDirectionInteraction } from "../toolInteraction";
import {
  createLinkReactionEvent,
  createPlayerMotionEvent,
  createPresentation,
  getProjectileTravelDurationMs,
  HOOKSHOT_PULL_DELAY_MS,
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
import { createResolvedPlayerMovement } from "../rules/displacement";
import { resolveLinearDisplacement } from "../rules/movementSystem";
import { collectDirectionSelectionTiles } from "../rules/previewDescriptor";
import {
  findPlayersAtPosition,
  getOppositeDirection,
  isProjectileBlockingTileType,
  stepPosition
} from "../rules/spatial";
import type { ToolModule } from "./types";
import {
  createPassiveToolMovementDescriptor,
  createToolMovementDescriptor,
  createToolPreview,
  createUsedSummary,
  getToolParamValue,
  getTile,
  isWithinBoard,
  toMovementSubject
} from "./helpers";

export const HOOKSHOT_TOOL_DEFINITION: ToolContentDefinition = {
  actorMovement: {
    type: "drag",
    disposition: "active"
  },
  label: "钩锁",
  description: "沿所选方向发射钩锁，命中墙体时拉自己过去，命中玩家时把对方拖回来。",
  disabledHint: "当前不能使用钩锁。",
  source: "turn",
  interaction: createDragDirectionInteraction(),
  conditions: [],
  defaultCharges: 1,
  defaultParams: {
    hookLength: 3
  },
  color: "#6ca7d9",
  rollable: true,
  debugGrantable: true,
  endsTurnOnUse: false
};

const HOOKSHOT_FLIGHT_SPEED = 1.8;

function resolveHookshotTool(
  draft: Parameters<ToolModule["execute"]>[0],
  context: Parameters<ToolModule["execute"]>[1]
): void {
  const direction = requireDirection(context);
  const hookLength = getToolParamValue(context.activeTool, "hookLength", 3);
  const actorMovement = createToolMovementDescriptor(
    context,
    HOOKSHOT_TOOL_DEFINITION,
    "drag",
    ["hookshot:self"]
  );
  const pulledMovement = createPassiveToolMovementDescriptor(
    context.activeTool.toolId,
    "drag",
    ["hookshot:pull"]
  );
  const selectionTiles = collectDirectionSelectionTiles(context.board, context.actor.position);

  if (!direction) {
    setDraftBlocked(draft, "Hookshot needs a direction", {
      preview: createToolPreview(context, {
        selectionTiles,
        valid: false
      })
    });
    return;
  }

  const rayPath: typeof context.actor.position[] = [];

  for (let distance = 1; distance <= hookLength; distance += 1) {
    const target = stepPosition(context.actor.position, direction, distance);

    if (!isWithinBoard(context.board, target)) {
      break;
    }

    const tile = getTile(context.board, target);

    if (tile && isProjectileBlockingTileType(tile.type)) {
      const pullDistance = distance - 1;

      if (pullDistance < 1) {
        setDraftBlocked(draft, "No hookshot landing space", {
          path: rayPath,
          preview: createToolPreview(context, {
            actorPath: rayPath,
            effectTiles: rayPath,
            selectionTiles,
            valid: false
          })
        });
        return;
      }

      setDraftToolInventory(draft, consumeActiveTool(context));
      const presentationMark = markDraftPresentation(draft);
      const actorResolution = resolveLinearDisplacement(draft, {
        direction,
        maxSteps: pullDistance,
        movePoints: pullDistance,
        movement: actorMovement,
        player: toMovementSubject(context.actor)
      });

      if (!actorResolution.path.length) {
        setDraftToolInventory(draft, context.tools);
        setDraftBlocked(draft, actorResolution.stopReason, {
          path: rayPath,
          preview: createToolPreview(context, {
            actorPath: rayPath,
            effectTiles: rayPath,
            selectionTiles,
            valid: false
          })
        });
        return;
      }

      const triggerEvents = consumeDraftPresentationFrom(draft, presentationMark);
      const outboundDurationMs = getProjectileTravelDurationMs(
        rayPath.length + 1,
        HOOKSHOT_FLIGHT_SPEED
      );
      const motionEvents: ActionPresentationEvent[] = [
        createLinkReactionEvent(
          `${context.activeTool.instanceId}:hookshot-outbound`,
          {
            kind: "player",
            playerId: context.actor.id
          },
          {
            kind: "position",
            position: target
          },
          "chain",
          0,
          outboundDurationMs,
          "extend_from_from"
        )
      ];
      const pullStartMs = outboundDurationMs + HOOKSHOT_PULL_DELAY_MS;
      const actorMotionEvent = createPlayerMotionEvent(
        `${context.activeTool.instanceId}:actor-hook`,
        context.actor.id,
        [context.actor.position, ...actorResolution.path],
        "ground",
        pullStartMs
      );

      if (actorMotionEvent) {
        motionEvents.push(
          createLinkReactionEvent(
            `${context.activeTool.instanceId}:hookshot-link-wall`,
            {
              kind: "player",
              playerId: context.actor.id
            },
            {
              kind: "position",
              position: target
            },
            "chain",
            pullStartMs,
            actorMotionEvent.durationMs
          )
        );
        motionEvents.push(actorMotionEvent);
      }

      setDraftActionPresentation(
        draft,
        createPresentation(context.actor.id, context.activeTool.toolId, motionEvents)
      );
      appendDraftPresentationEvents(
        draft,
        offsetPresentationEvents(
          [...triggerEvents, ...actorResolution.presentationEvents],
          (actorMotionEvent?.startMs ?? pullStartMs) + (actorMotionEvent?.durationMs ?? 0)
        )
      );
      setDraftApplied(draft, createUsedSummary(HOOKSHOT_TOOL_DEFINITION.label), {
        actorMovement: createResolvedPlayerMovement(
          context.actor.id,
          context.actor.position,
          actorResolution.path,
          actorMovement
        ),
        path: actorResolution.path,
        preview: createToolPreview(context, {
          actorPath: actorResolution.path,
          actorTarget: draft.actor.position,
          affectedPlayers: draft.affectedPlayers,
          effectTiles: rayPath,
          selectionTiles,
          valid: true
        })
      });
      return;
    }

    rayPath.push(target);
    const hitPlayers = findPlayersAtPosition(context.players, target, [context.actor.id]);

    if (!hitPlayers.length) {
      continue;
    }

    setDraftToolInventory(draft, consumeActiveTool(context));
    const outboundTarget = rayPath[rayPath.length - 1] ?? target;
    const outboundDurationMs = getProjectileTravelDurationMs(
      rayPath.length,
      HOOKSHOT_FLIGHT_SPEED
    );
    const motionEvents: ActionPresentationEvent[] = [
      createLinkReactionEvent(
        `${context.activeTool.instanceId}:hookshot-outbound`,
        {
          kind: "player",
          playerId: context.actor.id
        },
        {
          kind: "position",
          position: outboundTarget
        },
        "chain",
        0,
        outboundDurationMs,
        "extend_from_from"
      )
    ];
    const pullStartMs = outboundDurationMs + HOOKSHOT_PULL_DELAY_MS;
    const nestedEvents: ActionPresentationEvent[] = [];
    let pullSucceeded = false;

    for (const [index, hitPlayer] of hitPlayers.entries()) {
      const pullDistance = Math.max(0, distance - 1);

      if (pullDistance < 1) {
        continue;
      }

      const presentationMark = markDraftPresentation(draft);
      const pullResolution = resolveLinearDisplacement(draft, {
        direction: getOppositeDirection(direction),
        maxSteps: pullDistance,
        movePoints: pullDistance,
        movement: pulledMovement,
        player: toMovementSubject(hitPlayer),
        trackAffectedPlayerReason: "hookshot"
      });

      if (!pullResolution.path.length) {
        continue;
      }

      pullSucceeded = true;
      const triggerEvents = consumeDraftPresentationFrom(draft, presentationMark);

      const motionEvent = createPlayerMotionEvent(
        `${context.activeTool.instanceId}:hooked-${index}`,
        hitPlayer.id,
        [hitPlayer.position, ...pullResolution.path],
        "ground",
        pullStartMs
      );

      nestedEvents.push(
        ...offsetPresentationEvents(
          [...triggerEvents, ...pullResolution.presentationEvents],
          (motionEvent?.startMs ?? pullStartMs) + (motionEvent?.durationMs ?? 0)
        )
      );

      if (motionEvent) {
        motionEvents.push(
          createLinkReactionEvent(
            `${context.activeTool.instanceId}:hookshot-link-player-${index}`,
            {
              kind: "player",
              playerId: context.actor.id
            },
            {
              kind: "player",
              playerId: hitPlayer.id
            },
            "chain",
            pullStartMs,
            motionEvent.durationMs
          )
        );
        motionEvents.push(motionEvent);
      }
    }

    if (!pullSucceeded) {
      setDraftToolInventory(draft, context.tools);
      setDraftBlocked(draft, "Target cannot be pulled", {
        path: rayPath,
        preview: createToolPreview(context, {
          actorPath: rayPath,
          effectTiles: rayPath,
          selectionTiles,
          valid: false
        })
      });
      return;
    }

    setDraftActionPresentation(
      draft,
      createPresentation(context.actor.id, context.activeTool.toolId, motionEvents)
    );
    appendDraftPresentationEvents(draft, nestedEvents);
    setDraftApplied(draft, createUsedSummary(HOOKSHOT_TOOL_DEFINITION.label), {
      path: rayPath,
      preview: createToolPreview(context, {
        affectedPlayers: draft.affectedPlayers,
        effectTiles: rayPath,
        selectionTiles,
        valid: true
      })
    });
    return;
  }

  setDraftBlocked(draft, "No hookshot target", {
    path: rayPath,
    preview: createToolPreview(context, {
      actorPath: rayPath,
      effectTiles: rayPath,
      selectionTiles,
      valid: false
    })
  });
}

export const HOOKSHOT_TOOL_MODULE: ToolModule<"hookshot"> = {
  id: "hookshot",
  definition: HOOKSHOT_TOOL_DEFINITION,
  dieFace: {
    params: {
      hookLength: 3
    }
  },
  execute: resolveHookshotTool
};
