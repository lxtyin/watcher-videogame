import { getToolAvailability, getToolDefinition } from "./tools";
import type { ActionResolution, ToolActionContext } from "./types";
import {
  applyPassThroughBoardEffects,
  buildBlockedResolution,
  finalizeAppliedResolution
} from "./rules/actionResolution";
import { TOOL_EXECUTORS } from "./rules/toolExecutors";

export {
  getDirectionVector,
  getOppositeDirection,
  isSolidTileType,
  stepPosition
} from "./rules/spatial";

// Tool resolution is shared by the room and preview layer so both follow one ruleset.
export function resolveToolAction(context: ToolActionContext): ActionResolution {
  const availability = getToolAvailability(context.activeTool, context.tools);
  const toolDefinition = getToolDefinition(context.activeTool.toolId);

  if (!availability.usable) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      availability.reason ?? "Tool cannot be used right now",
      context.toolDieSeed
    );
  }

  if (toolDefinition.targetMode === "direction" && !context.direction) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      `${toolDefinition.label} needs a direction`,
      context.toolDieSeed
    );
  }

  if (toolDefinition.targetMode === "tile" && !context.targetPosition) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      `${toolDefinition.label} needs a target tile`,
      context.toolDieSeed
    );
  }

  const executedResolution = TOOL_EXECUTORS[context.activeTool.toolId](context);
  const definitionAdjustedResolution =
    executedResolution.kind === "applied" && toolDefinition.endsTurnOnUse
      ? {
          ...executedResolution,
          endsTurn: executedResolution.endsTurn || toolDefinition.endsTurnOnUse
        }
      : executedResolution;

  return finalizeAppliedResolution(
    context,
    applyPassThroughBoardEffects(context, definitionAdjustedResolution)
  );
}
