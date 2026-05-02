import type { ActionPresentationEvent } from "../types";
import type { ToolContentDefinition } from "../content/schema";
import { createDragDirectionInteraction } from "../toolInteraction";
import {
  createLinkReactionEvent,
  createPresentation,
  getProjectileTravelDurationMs,
  HOOKSHOT_PULL_DELAY_MS
} from "../rules/actionPresentation";
import {
  consumeDraftPresentationFrom,
  markDraftPresentation,
  setDraftActionPresentation,
  setDraftApplied,
  setDraftBlocked,
  setDraftToolInventory
} from "../rules/actionDraft";
import { consumeActiveTool, requireDirection } from "../rules/actionResolution";
import { createResolvedPlayerMovement } from "../rules/displacement";
import { resolveDragDisplacement } from "../rules/movementSystem";
import { collectDirectionSelectionTiles } from "../rules/previewDescriptor";
import {
  findMovableEntitiesAtPosition,
  getOppositeDirection,
  isSolidTileType,
  stepPosition
} from "../rules/spatial";
import type { ToolModule } from "./types";
import {
  createDraftSoundEvent,
  createPlayerAnchor,
  createSummonAnchor,
  createToolPreview,
  createUsedSummary,
  getToolParamValue,
  getTile,
  isChargedToolAvailable,
  isWithinBoard,
  resolveToolMovementDescriptor,
  toMovementSubject
} from "./helpers";

export const HOOKSHOT_TOOL_DEFINITION: ToolContentDefinition = {
  label: "钩锁",
  disabledHint: "当前不能使用钩锁。",
  source: "turn",
  interaction: createDragDirectionInteraction(),
  isAvailable: isChargedToolAvailable,
  defaultCharges: 1,
  defaultParams: {
    hookLength: 4
  },
  getTextDescription: ({ params }) => ({
    title: "钩锁",
    description: "沿所选方向发射钩锁，命中墙体时拉自己过去，命中玩家时把对方拖回来。",
    details: [`距离 ${params.hookLength ?? 0} `]
  }),
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
  const actorMovement = resolveToolMovementDescriptor(
    context,
    "drag",
    {
      extraTags: ["hookshot:self"]
    }
  );
  const pulledMovement = resolveToolMovementDescriptor(
    context,
    "drag",
    {
      disposition: "passive",
      extraTags: ["hookshot:pull"]
    }
  );
  // const selectionTiles = collectDirectionSelectionTiles(context.board, context.actor.position);

  if (!direction) {
    setDraftBlocked(draft, "Hookshot needs a direction", {
      preview: createToolPreview(context, {
        // selectionTiles,
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

    if (tile && isSolidTileType(tile.type)) {
      const pullDistance = distance - 1;

      if (pullDistance < 1) {
        setDraftBlocked(draft, "No hookshot landing space", {
          path: rayPath,
          preview: createToolPreview(context, {
            actorPath: rayPath,
            effectTiles: rayPath,
            // selectionTiles,
            valid: false
          })
        });
        return;
      }

      setDraftToolInventory(draft, consumeActiveTool(context));
      const outboundDurationMs = getProjectileTravelDurationMs(
        rayPath.length + 1,
        HOOKSHOT_FLIGHT_SPEED
      );
      const pullStartMs = outboundDurationMs + HOOKSHOT_PULL_DELAY_MS;
      const presentationMark = markDraftPresentation(draft);
      const actorResolution = resolveDragDisplacement(draft, {
        direction,
        movePoints: pullDistance,
        movement: actorMovement,
        player: toMovementSubject(context.actor),
        startMs: pullStartMs
      });

      if (!actorResolution.path.length) {
        setDraftToolInventory(draft, context.tools);
        setDraftBlocked(draft, actorResolution.stopReason, {
          path: rayPath,
          preview: createToolPreview(context, {
            actorPath: rayPath,
            effectTiles: rayPath,
            // selectionTiles,
            valid: false
          })
        });
        return;
      }

      const movementEvents = consumeDraftPresentationFrom(draft, presentationMark);
      const motionEvents: ActionPresentationEvent[] = [
        createLinkReactionEvent(
          `${context.activeTool.instanceId}:hookshot-outbound`,
          {
            kind: "player",
            playerId: context.actor.id
          },
          {
            kind: "position",
            position: stepPosition(target, direction, -0.5) // hook the edge of the wall
          },
          "chain",
          0,
          outboundDurationMs,
          "extend_from_from"
        ),
        createDraftSoundEvent(draft, "tool_chain", "hookshot:activate", {
          anchor: createPlayerAnchor(context.actor.id)
        })
      ];
      const pullDurationMs =
        actorResolution.motionStartMs !== null && actorResolution.motionEndMs !== null
          ? actorResolution.motionEndMs - actorResolution.motionStartMs
          : 0;

      if (pullDurationMs > 0) {
        motionEvents.push(
          createLinkReactionEvent(
            `${context.activeTool.instanceId}:hookshot-link-wall`,
            {
              kind: "player",
              playerId: context.actor.id
            },
            {
              kind: "position",
              position: stepPosition(target, direction, -0.5)
            },
            "chain",
            pullStartMs,
            pullDurationMs
          )
        );
      }

      setDraftActionPresentation(
        draft,
        createPresentation(
          context.actor.id,
          context.activeTool.toolId,
          [...motionEvents, ...movementEvents]
        )
      );
      setDraftApplied(draft, createUsedSummary(HOOKSHOT_TOOL_DEFINITION.label), {
        actorMovement: createResolvedPlayerMovement(
          context.actor.id,
          context.actor.position,
          actorResolution.path,
          actorResolution.movement
        ),
        path: actorResolution.path,
        preview: createToolPreview(context, {
          actorPath: actorResolution.path,
          actorTarget: draft.actor.position,
          affectedPlayers: draft.affectedPlayers,
          effectTiles: rayPath,
          // selectionTiles,
          valid: true
        })
      });
      return;
    }

    rayPath.push(target);
    const hitEntities = findMovableEntitiesAtPosition(
      context.players,
      context.summons,
      target,
      [context.actor.id]
    );

    if (!hitEntities.length) {
      continue;
    }

    setDraftToolInventory(draft, consumeActiveTool(context));
    const outboundTarget = rayPath[rayPath.length - 1] ?? target;
    const outboundDurationMs = getProjectileTravelDurationMs(
      rayPath.length,
      HOOKSHOT_FLIGHT_SPEED
    );
    const presentationEvents: ActionPresentationEvent[] = [
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
      ),
      createDraftSoundEvent(draft, "tool_chain", "hookshot:activate", {
        anchor: createPlayerAnchor(context.actor.id)
      })
    ];
    const pullStartMs = outboundDurationMs + HOOKSHOT_PULL_DELAY_MS;
    let pullSucceeded = false;

    for (const [index, hitEntity] of hitEntities.entries()) {
      const pullDistance = Math.max(0, distance - 1);

      if (pullDistance < 1) {
        continue;
      }

      const presentationMark = markDraftPresentation(draft);
      const pullResolution = resolveDragDisplacement(draft, {
        direction: getOppositeDirection(direction),
        movePoints: pullDistance,
        movement: pulledMovement,
        player: toMovementSubject(hitEntity),
        startMs: pullStartMs,
        trackAffectedPlayerReason: "hookshot"
      });

      if (!pullResolution.path.length) {
        continue;
      }

      pullSucceeded = true;
      const pulledPlayerEvents = consumeDraftPresentationFrom(draft, presentationMark);
      const pullDurationMs =
        pullResolution.motionStartMs !== null && pullResolution.motionEndMs !== null
          ? pullResolution.motionEndMs - pullResolution.motionStartMs
          : 0;

      if (pullDurationMs > 0) {
        presentationEvents.push(
          createLinkReactionEvent(
            `${context.activeTool.instanceId}:hookshot-link-player-${index}`,
            {
              kind: "player",
              playerId: context.actor.id
            },
            hitEntity.kind === "player"
              ? {
                  kind: "player",
                  playerId: hitEntity.id
                }
              : createSummonAnchor(hitEntity.id),
            "chain",
            pullStartMs,
            pullDurationMs
          )
        );
      }

      presentationEvents.push(...pulledPlayerEvents);
    }

    if (!pullSucceeded) {
      setDraftToolInventory(draft, context.tools);
      setDraftBlocked(draft, "Target cannot be pulled", {
        path: rayPath,
        preview: createToolPreview(context, {
          actorPath: rayPath,
          effectTiles: rayPath,
          // selectionTiles,
          valid: false
        })
      });
      return;
    }

    setDraftActionPresentation(
      draft,
      createPresentation(context.actor.id, context.activeTool.toolId, presentationEvents)
    );
    setDraftApplied(draft, createUsedSummary(HOOKSHOT_TOOL_DEFINITION.label), {
      path: rayPath,
      preview: createToolPreview(context, {
        affectedPlayers: draft.affectedPlayers,
        effectTiles: rayPath,
        // selectionTiles,
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
      // selectionTiles,
      valid: false
    })
  });
}

export const HOOKSHOT_TOOL_MODULE: ToolModule<"hookshot"> = {
  id: "hookshot",
  definition: HOOKSHOT_TOOL_DEFINITION,
  dieFace: {
    params: {
      hookLength: 4
    }
  },
  execute: resolveHookshotTool
};
