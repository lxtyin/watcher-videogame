import { getToolAvailability, getToolDefinition } from "./tools";
import type { ActionResolution, ToolActionContext } from "./types";
import {
  attachStateTransitionPresentation,
  buildBlockedResolution
} from "./rules/actionResolution";
import { attachPreviewDescriptor } from "./rules/previewDescriptor";
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
  const buildPreviewBlockedResolution = (reason: string) =>
    attachPreviewDescriptor(
      context,
      buildBlockedResolution(
        context.actor,
        context.tools,
        reason,
        context.toolDieSeed
      )
    );

  if (!availability.usable) {
    return buildPreviewBlockedResolution(
      availability.reason ?? "Tool cannot be used right now"
    );
  }

  if (toolDefinition.targetMode === "direction" && !context.direction) {
    return buildPreviewBlockedResolution(`${toolDefinition.label} needs a direction`);
  }

  if (toolDefinition.targetMode === "tile" && !context.targetPosition) {
    return buildPreviewBlockedResolution(`${toolDefinition.label} needs a target tile`);
  }

  if (toolDefinition.targetMode === "choice" && !context.choiceId) {
    return buildPreviewBlockedResolution(`${toolDefinition.label} needs a choice`);
  }

  if (
    toolDefinition.targetMode === "tile_direction" &&
    (!context.targetPosition || !context.direction)
  ) {
    return buildPreviewBlockedResolution(
      `${toolDefinition.label} needs both a target tile and a direction`
    );
  }

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

  return attachPreviewDescriptor(
    context,
    attachStateTransitionPresentation(context, definitionAdjustedResolution)
  );
}
