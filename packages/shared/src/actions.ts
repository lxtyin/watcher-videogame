import { getToolDefinition } from "./tools";
import type { ActionResolution, ToolActionContext } from "./types";
import { attachStateTransitionPresentation } from "./rules/actionResolution";
import {
  createToolActionDraft,
  finalizeToolActionDraft,
  setDraftBlocked
} from "./rules/actionDraft";
import { TOOL_EXECUTORS } from "./rules/toolExecutors";
import { applyToolPrepareModifiers } from "./skills";

export {
  getDirectionVector,
  getOppositeDirection,
  isSolidTileType,
  stepPosition
} from "./rules/spatial";

// Tool resolution is shared by the room and preview layer so both follow one ruleset.
export function resolveToolAction(context: ToolActionContext): ActionResolution {
  const prepared = applyToolPrepareModifiers(
    context.actor.characterId,
    {
      id: context.actor.id,
      modifiers: context.actor.modifiers,
      phase: context.phase,
      position: context.actor.position,
      tags: context.actor.tags,
      toolHistory: context.toolHistory,
      tools: context.tools,
      turnNumber: context.turnNumber
    },
    context.activeTool
  );

  const preparedTool = prepared.tool;
  const preparedContext: ToolActionContext = {
    ...context,
    actor: {
      ...context.actor,
      modifiers: prepared.nextModifiers,
      tags: prepared.nextTags
    },
    activeTool: preparedTool ?? context.activeTool
  };

  if (!preparedTool) {
    const blockedDraft = createToolActionDraft(preparedContext);
    setDraftBlocked(blockedDraft, "Tool cannot be prepared right now");
    return finalizeToolActionDraft(blockedDraft);
  }

  const toolDefinition = getToolDefinition(preparedContext.activeTool.toolId);
  const availability = toolDefinition.isAvailable({
    actorId: preparedContext.actor.id,
    actorTags: preparedContext.actor.tags,
    phase: preparedContext.phase,
    tool: preparedContext.activeTool,
    toolHistory: preparedContext.toolHistory,
    turnNumber: preparedContext.turnNumber,
    tools: preparedContext.tools
  });

  if (!availability.usable) {
    const blockedDraft = createToolActionDraft(preparedContext);
    setDraftBlocked(blockedDraft, availability.reason ?? "Tool cannot be used right now");
    return finalizeToolActionDraft(blockedDraft);
  }

  const draft = createToolActionDraft(preparedContext);
  TOOL_EXECUTORS[preparedContext.activeTool.toolId](draft, preparedContext);
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
