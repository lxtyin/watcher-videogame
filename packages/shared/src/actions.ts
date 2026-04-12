import { getToolDefinition } from "./tools";
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
  const toolDefinition = getToolDefinition(context.activeTool.toolId);
  const availability = toolDefinition.isAvailable({
    tool: context.activeTool,
    tools: context.tools
  });

  if (!availability.usable) {
    const blockedDraft = createToolActionDraft(context);
    setDraftBlocked(blockedDraft, availability.reason ?? "Tool cannot be used right now");
    return finalizeToolActionDraft(blockedDraft);
  }

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
