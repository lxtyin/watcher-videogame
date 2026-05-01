import type { ToolContentDefinition } from "../content/schema";
import { attachModifier } from "../modifiers";
import { setPlayerTagValue } from "../playerTags";
import { BONDAGE_MODIFIER_ID, BONDAGE_STACKS_TAG } from "../buffers";
import { createDragDirectionInteraction } from "../toolInteraction";
import type { AffectedPlayerMove } from "../types";
import {
  buildMotionPositions,
  createProjectileEvent
} from "../rules/actionPresentation";
import {
  appendDraftAffectedPlayerMove,
  appendDraftPresentationEvents,
  setDraftApplied,
  setDraftBlocked,
  setDraftToolInventory
} from "../rules/actionDraft";
import {
  consumeActiveTool,
  requireDirection
} from "../rules/actionResolution";
import { collectDirectionSelectionTiles } from "../rules/previewDescriptor";
import { traceProjectile } from "../rules/spatial";
import { resolveLinearDisplacement } from "../rules/movementSystem";
import { resolveImpactTerrainEffect } from "../terrain";
import type { ToolModule } from "./types";
import {
  clearMovementTools,
  createPassiveMovementDescriptor,
  createToolPreview,
  createDraftSoundEvent,
  createPlayerAnchor,
  createUsedSummary,
  getToolParamValue,
  getTotalMovementPoints,
  isChargedToolAvailable,
  toMovementSubject
} from "./helpers";

export const AWM_SHOOT_TOOL_DEFINITION: ToolContentDefinition = {
  label: "子弹",
  disabledHint: "当前还不能发射这发子弹。",
  source: "character_skill",
  interaction: createDragDirectionInteraction(),
  isAvailable: (context) => {
    const chargeAvailability = isChargedToolAvailable(context);

    if (!chargeAvailability.usable) {
      return chargeAvailability;
    }

    return getTotalMovementPoints(context.tools) > 0
      ? chargeAvailability
      : {
          usable: false,
          reason: "当前没有可用于充能的移动点数"
        };
  },
  defaultCharges: 1,
  defaultParams: {
    projectileRange: 999
  },
  getTextDescription: ({ params }) => ({
    title: "子弹",
    description: "消耗你当前全部未使用移动点数，向一个方向发射子弹，并把命中的玩家推动同样距离。",
    details: [`射程 ${(params.projectileRange ?? 0) >= 999 ? "全场" : `${params.projectileRange ?? 0} 格`}`]
  }),
  color: "#4f6ddf",
  rollable: false,
  debugGrantable: false,
  endsTurnOnUse: false
};

const AWM_PROJECTILE_SPEED = 2.6;

function resolveAwmShootTool(
  draft: Parameters<ToolModule["execute"]>[0],
  context: Parameters<ToolModule["execute"]>[1]
): void {
  const direction = requireDirection(context);
  const projectileRange = getToolParamValue(context.activeTool, "projectileRange", 999);
  // const selectionTiles = collectDirectionSelectionTiles(context.board, context.actor.position);

  if (!direction) {
    setDraftBlocked(draft, "AWM Shoot needs a direction", {
      preview: createToolPreview(context, {
        // selectionTiles,
        valid: false
      })
    });
    return;
  }

  const trace = traceProjectile(context, direction, projectileRange, 0);
  const shotPower = getTotalMovementPoints(context.tools);
  const bulletPushMovement = createPassiveMovementDescriptor(
    context.activeTool.toolId,
    "translate",
    ["awm:push"]
  );
  const affectedPlayers: AffectedPlayerMove[] = [];

  const projectileEvent = createProjectileEvent(
    `${context.activeTool.instanceId}:awm-projectile`,
    context.actor.id,
    "awm_bullet",
    buildMotionPositions(context.actor.position, trace.path),
    0,
    AWM_PROJECTILE_SPEED
  );

  if (projectileEvent) {
    appendDraftPresentationEvents(draft, [
      projectileEvent,
      createDraftSoundEvent(draft, "tool_shot_bullet", "awm:fire", {
        anchor: createPlayerAnchor(context.actor.id)
      })
    ]);
  } else {
    appendDraftPresentationEvents(draft, [
      createDraftSoundEvent(draft, "tool_shot_bullet", "awm:fire", {
        anchor: createPlayerAnchor(context.actor.id)
      })
    ]);
  }

  if (trace.collision.kind === "solid") {
    resolveImpactTerrainEffect(draft, {
      direction: trace.collision.direction,
      position: trace.collision.position,
      source: {
        kind: "projectile",
        ownerId: context.actor.id,
        projectileType: "awm_bullet"
      },
      startMs: projectileEvent ? projectileEvent.startMs + projectileEvent.durationMs : 0,
      strength: 999,
      tile: trace.collision.tile
    });
  }

  if (trace.collision.kind === "player" && shotPower > 0) {
    const pushStartMs = projectileEvent ? projectileEvent.startMs + projectileEvent.durationMs : 0;

    for (const hitPlayer of trace.collision.players) {
      const pushResolution = resolveLinearDisplacement(draft, {
        direction: trace.collision.direction,
        movePoints: shotPower,
        movement: bulletPushMovement,
        player: toMovementSubject(hitPlayer),
        startMs: pushStartMs
      });

      affectedPlayers.push({
        boardVisible: draft.playersById.get(hitPlayer.id)?.boardVisible ?? true,
        movement: bulletPushMovement,
        modifiers: attachModifier(pushResolution.actor.modifiers, BONDAGE_MODIFIER_ID),
        path: pushResolution.path,
        playerId: hitPlayer.id,
        reason: "awm_shot",
        startPosition: hitPlayer.position,
        target: pushResolution.actor.position,
        tags: setPlayerTagValue(pushResolution.actor.tags, BONDAGE_STACKS_TAG, shotPower),
        turnFlags: pushResolution.actor.turnFlags
      });
    }
  }

  for (const affectedPlayer of affectedPlayers) {
    appendDraftAffectedPlayerMove(draft, affectedPlayer);
  }

  setDraftToolInventory(draft, clearMovementTools(consumeActiveTool(context)));
  setDraftApplied(draft, createUsedSummary(AWM_SHOOT_TOOL_DEFINITION.label), {
    path: trace.path,
    preview: createToolPreview(context, {
      actorPath: trace.path,
      affectedPlayers: draft.affectedPlayers,
      effectTiles: trace.path,
      // selectionTiles,
      valid: true
    })
  });
}

export const AWM_SHOOT_TOOL_MODULE: ToolModule<"awmShoot"> = {
  id: "awmShoot",
  definition: AWM_SHOOT_TOOL_DEFINITION,
  execute: resolveAwmShootTool
};
