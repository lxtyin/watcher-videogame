import { getTile } from "../../board";
import { createSummonUpsertMutation, hasSummonAtPosition } from "../../summons";
import { getToolDefinition, getToolParam } from "../../tools";
import type { ActionResolution, ToolActionContext } from "../../types";
import {
  buildAppliedResolution,
  buildBlockedResolution,
  buildSummonInstanceId,
  consumeActiveTool
} from "../actionResolution";
import { createTileMutation, isLandablePosition } from "../spatial";

// Wall building turns a nearby floor tile into a new earth wall.
export function resolveBuildWallTool(context: ToolActionContext): ActionResolution {
  const targetPosition = context.targetPosition;
  const wallDurability = getToolParam(context.activeTool, "wallDurability");

  if (!targetPosition) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Build Wall needs a target tile",
      context.toolDieSeed
    );
  }

  const deltaX = Math.abs(targetPosition.x - context.actor.position.x);
  const deltaY = Math.abs(targetPosition.y - context.actor.position.y);

  if ((deltaX === 0 && deltaY === 0) || deltaX > 1 || deltaY > 1) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Build Wall must target one of the surrounding tiles",
      context.toolDieSeed,
      [],
      [],
      [targetPosition]
    );
  }

  const tile = getTile(context.board, targetPosition);

  if (!tile || tile.type !== "floor") {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Build Wall needs an empty floor tile",
      context.toolDieSeed,
      [],
      [],
      [targetPosition]
    );
  }

  return buildAppliedResolution(
    context.actor,
    consumeActiveTool(context),
    `Used ${getToolDefinition(context.activeTool.toolId).label}.`,
    context.toolDieSeed,
    [],
    [createTileMutation(targetPosition, "earthWall", wallDurability)],
    [],
    [],
    [targetPosition]
  );
}

// Wallet deployment is implemented as a role-owned tool so it reuses the normal aim pipeline.
export function resolveDeployWalletTool(context: ToolActionContext): ActionResolution {
  const targetPosition = context.targetPosition;
  const targetRange = getToolParam(context.activeTool, "targetRange");

  if (!targetPosition) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Deploy Wallet needs a target tile",
      context.toolDieSeed
    );
  }

  if (
    Math.abs(targetPosition.x - context.actor.position.x) > targetRange ||
    Math.abs(targetPosition.y - context.actor.position.y) > targetRange
  ) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Target tile is outside the deployment range",
      context.toolDieSeed,
      [],
      [],
      [targetPosition]
    );
  }

  if (!isLandablePosition(context.board, targetPosition)) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Deploy Wallet needs a landable tile",
      context.toolDieSeed,
      [],
      [],
      [targetPosition]
    );
  }

  if (hasSummonAtPosition(context.summons, targetPosition)) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Target tile already contains a summon",
      context.toolDieSeed,
      [],
      [],
      [targetPosition]
    );
  }

  return buildAppliedResolution(
    context.actor,
    consumeActiveTool(context),
    `Used ${getToolDefinition(context.activeTool.toolId).label}.`,
    context.toolDieSeed,
    [],
    [],
    [],
    [],
    [targetPosition],
    null,
    [
      createSummonUpsertMutation(
        buildSummonInstanceId(context.activeTool, "wallet"),
        "wallet",
        context.actor.id,
        targetPosition
      )
    ],
    [],
    true
  );
}
