import { getToolAvailability, getToolDefinition } from "./tools";
import type { ActionResolution, ToolActionContext } from "./types";
import { attachStateTransitionPresentation } from "./rules/actionResolution";
import {
  createToolActionDraft,
  finalizeToolActionDraft,
  setDraftBlocked
} from "./rules/actionDraft";
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
    const blockedDraft = createToolActionDraft(context);
    setDraftBlocked(blockedDraft, availability.reason ?? "Tool cannot be used right now");
    return finalizeToolActionDraft(blockedDraft);
  }

  const toolDefinition = getToolDefinition(context.activeTool.toolId);
  const draft = createToolActionDraft(context);
  TOOL_EXECUTORS[context.activeTool.toolId](draft, context);
  const executedResolution = finalizeToolActionDraft(draft);
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
