import type { ToolContentDefinition } from "../content/schema";
import { attachModifier } from "../modifiers";
import { setPlayerTagValue } from "../playerTags";
import { BONDAGE_MODIFIER_ID, BONDAGE_STACKS_TAG } from "../skills/bondage";
import { createDragDirectionInteraction } from "../toolInteraction";
import type { AffectedPlayerMove, ActionResolution } from "../types";
import {
  buildMotionPositions,
  createPresentation,
  createProjectileEvent
} from "../rules/actionPresentation";
import {
  buildAppliedResolution,
  buildBlockedResolution,
  consumeActiveTool,
  requireDirection
} from "../rules/actionResolution";
import { createMovementDescriptor } from "../rules/displacement";
import { collectDirectionSelectionTiles } from "../rules/previewDescriptor";
import { traceProjectile } from "../rules/spatial";
import type { ToolModule } from "./types";
import {
  createToolPreview,
  createUsedSummary,
  getToolParamValue,
  getTotalMovementPoints,
  toTaggedPlayerPatch
} from "./helpers";

export const AWM_SHOOT_TOOL_DEFINITION: ToolContentDefinition = {
  label: "狙击",
  description: "向一个方向发射子弹，命中的第一格玩家获得等同于你当前总移动点数的束缚。",
  disabledHint: "当前还不能发射这次狙击。",
  source: "character_skill",
  interaction: createDragDirectionInteraction(),
  conditions: [],
  defaultCharges: 1,
  defaultParams: {
    projectileRange: 999
  },
  color: "#4f6ddf",
  rollable: false,
  debugGrantable: false,
  endsTurnOnUse: false
};

const AWM_PROJECTILE_SPEED = 2.6;

function resolveAwmShootTool(context: Parameters<ToolModule["execute"]>[0]): ActionResolution {
  const direction = requireDirection(context);
  const projectileRange = getToolParamValue(context.activeTool, "projectileRange", 999);
  const selectionTiles = collectDirectionSelectionTiles(context.board, context.actor.position);

  if (!direction) {
    return buildBlockedResolution({
      actor: context.actor,
      nextToolDieSeed: context.toolDieSeed,
      preview: createToolPreview(context, {
        selectionTiles,
        valid: false
      }),
      reason: "AWM Shoot needs a direction",
      tools: context.tools
    });
  }

  const trace = traceProjectile(context, direction, projectileRange, 0);
  const bondageStacks = getTotalMovementPoints(context.tools);
  const bondageMovement = createMovementDescriptor("translate", "passive", {
    tags: [`tool:${context.activeTool.toolId}`, "awm:bondage"],
    timing: "out_of_turn"
  });
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

  return buildAppliedResolution({
    actor: context.actor,
    affectedPlayers,
    nextToolDieSeed: context.toolDieSeed,
    path: trace.path,
    presentation: createPresentation(
      context.actor.id,
      context.activeTool.toolId,
      [
        createProjectileEvent(
          `${context.activeTool.instanceId}:awm-projectile`,
          context.actor.id,
          "awm_bullet",
          buildMotionPositions(context.actor.position, trace.path),
          0,
          AWM_PROJECTILE_SPEED
        )
      ].flatMap((event) => (event ? [event] : []))
    ),
    preview: createToolPreview(context, {
      actorPath: trace.path,
      affectedPlayers,
      effectTiles: trace.path,
      selectionTiles,
      valid: true
    }),
    summary: createUsedSummary(AWM_SHOOT_TOOL_DEFINITION.label),
    tools: consumeActiveTool(context)
  });
}

export const AWM_SHOOT_TOOL_MODULE: ToolModule<"awmShoot"> = {
  id: "awmShoot",
  definition: AWM_SHOOT_TOOL_DEFINITION,
  execute: resolveAwmShootTool
};
