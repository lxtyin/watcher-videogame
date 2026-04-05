import type { ToolContentDefinition } from "../content/schema";
import { attachModifier } from "../modifiers";
import { setPlayerTagValue } from "../playerTags";
import { BONDAGE_MODIFIER_ID, BONDAGE_STACKS_TAG } from "../skills/bondage";
import type { AffectedPlayerMove, ActionResolution } from "../types";
import {
  buildAppliedResolution,
  buildBlockedResolution,
  consumeActiveTool,
  requireDirection
} from "../rules/actionResolution";
import { createMovementDescriptor } from "../rules/displacement";
import { traceProjectile } from "../rules/spatial";
import type { ToolModule } from "./types";
import {
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
  targetMode: "direction",
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

function resolveAwmShootTool(context: Parameters<ToolModule["execute"]>[0]): ActionResolution {
  const direction = requireDirection(context);
  const projectileRange = getToolParamValue(context.activeTool, "projectileRange", 999);

  if (!direction) {
    return buildBlockedResolution(context.actor, context.tools, "AWM Shoot needs a direction", context.toolDieSeed);
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

  return buildAppliedResolution(
    context.actor,
    consumeActiveTool(context),
    createUsedSummary(AWM_SHOOT_TOOL_DEFINITION.label),
    context.toolDieSeed,
    trace.path,
    [],
    affectedPlayers,
    [],
    trace.path
  );
}

export const AWM_SHOOT_TOOL_MODULE: ToolModule<"awmShoot"> = {
  id: "awmShoot",
  definition: AWM_SHOOT_TOOL_DEFINITION,
  execute: resolveAwmShootTool
};
