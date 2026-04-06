import { getToolAvailability, getToolDefinition } from "./tools";
import type { ActionResolution, ToolActionContext } from "./types";
import {
  attachStateTransitionPresentation,
  buildBlockedResolution
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

  if (!availability.usable) {
    return buildBlockedResolution({
      actor: context.actor,
      nextToolDieSeed: context.toolDieSeed,
      reason: availability.reason ?? "Tool cannot be used right now",
      tools: context.tools
    });
  }

  const toolDefinition = getToolDefinition(context.activeTool.toolId);
  const executedResolution = TOOL_EXECUTORS[context.activeTool.toolId](context);
  const definitionAdjustedResolution =
    executedResolution.kind === "applied" && toolDefinition.endsTurnOnUse
      ? {
          ...executedResolution,
          endsTurn: executedResolution.endsTurn || toolDefinition.endsTurnOnUse,
          phaseEffect: {
            ...(executedResolution.phaseEffect ?? {}),
            finishTurn: true
          }
        }
      : executedResolution;

  return attachStateTransitionPresentation(context, definitionAdjustedResolution);
}
