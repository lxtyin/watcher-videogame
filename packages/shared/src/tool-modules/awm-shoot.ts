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
import { createMovementDescriptor, createMovementDescriptorInput } from "../rules/displacement";
import { collectDirectionSelectionTiles } from "../rules/previewDescriptor";
import { traceProjectile } from "../rules/spatial";
import { resolveImpactTerrainEffect } from "../terrain";
import type { ToolModule } from "./types";
import {
  createToolPreview,
  createDraftSoundEvent,
  createPlayerAnchor,
  createUsedSummary,
  getToolParamValue,
  getTotalMovementPoints,
  isChargedToolAvailable,
  toTaggedPlayerPatch
} from "./helpers";

export const AWM_SHOOT_TOOL_DEFINITION: ToolContentDefinition = {
  label: "狙击",
  disabledHint: "当前还不能发射这次狙击。",
  source: "character_skill",
  interaction: createDragDirectionInteraction(),
  isAvailable: isChargedToolAvailable,
  defaultCharges: 1,
  defaultParams: {
    projectileRange: 999
  },
  getTextDescription: ({ params }) => ({
    title: "狙击",
    description: "向一个方向发射子弹，命中的第一格玩家获得等同于你当前总移动点数的束缚。",
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
  const bondageStacks = getTotalMovementPoints(context.tools);
  const bondageMovement = createMovementDescriptor(
    "translate",
    createMovementDescriptorInput("passive", {
      tags: [`tool:${context.activeTool.toolId}`, "awm:bondage"],
      timing: "out_of_turn"
    })
  );
  const affectedPlayers: AffectedPlayerMove[] =
    trace.collision.kind === "player" && bondageStacks > 0
      ? trace.collision.players.map((hitPlayer) =>
          toTaggedPlayerPatch(
            hitPlayer,
            bondageMovement,
            attachModifier(hitPlayer.modifiers, BONDAGE_MODIFIER_ID),
            setPlayerTagValue(hitPlayer.tags, BONDAGE_STACKS_TAG, bondageStacks),
            "awm_shot"
          )
        )
      : [];

  for (const affectedPlayer of affectedPlayers) {
    appendDraftAffectedPlayerMove(draft, affectedPlayer);
  }

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

  setDraftToolInventory(draft, consumeActiveTool(context));
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
