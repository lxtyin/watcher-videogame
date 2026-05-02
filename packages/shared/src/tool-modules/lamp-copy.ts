import type { ToolContentDefinition } from "../content/schema";
import {
  buildLampCopyChoiceId,
  getLampEligibleHistoryEntries,
  getLampCopyCandidates,
  parseLampCopyChoiceId,
  toLampCopiedToolLoadout,
  LAMP_COPY_HISTORY_INDEX_TAG
} from "../lamp-copy";
import { setPlayerTagValue } from "../playerTags";
import {
  setDraftActorTags,
  setDraftApplied,
  setDraftBlocked,
  setDraftToolInventory
} from "../rules/actionDraft";
import { consumeActiveTool, requireChoiceSelection } from "../rules/actionResolution";
import { createModalChoiceInteraction } from "../toolInteraction";
import { getToolDefinition, getToolTextDescription } from "../tools";
import type { ToolChoiceDefinition } from "../types";
import type { ToolModule } from "./types";
import {
  appendDraftSoundEvent,
  createPlayerAnchor,
  createToolPreview,
  createToolUnavailableResult,
  createUsedSummary,
  isChargedToolAvailable
} from "./helpers";

function createLampCopyChoiceDefinition(
  candidate: ReturnType<typeof getLampCopyCandidates>[number]
): ToolChoiceDefinition {
  const copiedTool = toLampCopiedToolLoadout(candidate);
  const copiedToolDefinition = getToolDefinition(copiedTool.toolId);
  const textDescription = getToolTextDescription({
    charges: copiedToolDefinition.defaultCharges,
    instanceId: `lamp-copy-preview:${candidate.historyIndex}`,
    params: copiedTool.params ?? {},
    source: copiedTool.source ?? copiedToolDefinition.source,
    toolId: copiedTool.toolId
  });

  return {
    id: buildLampCopyChoiceId(candidate.historyIndex),
    label: textDescription.title,
    description: textDescription.description
  };
}

function getLampCopyChoices(
  context: Parameters<NonNullable<ToolModule["getChoices"]>>[0]
): readonly ToolChoiceDefinition[] {
  return getLampCopyCandidates(
    context.actor.id,
    context.actor.tags,
    context.toolHistory,
    context.turnNumber,
    context.toolDieSeed
  ).map(createLampCopyChoiceDefinition);
}

function getLampCopyCandidatesForContext(
  context:
    | Parameters<NonNullable<ToolModule["getChoices"]>>[0]
    | Parameters<ToolModule["execute"]>[1]
): ReturnType<typeof getLampCopyCandidates> {
  return getLampCopyCandidates(
    context.actor.id,
    context.actor.tags,
    context.toolHistory,
    context.turnNumber,
    context.toolDieSeed
  );
}

function isLampCopyAvailable(
  context: Parameters<NonNullable<ToolContentDefinition["isAvailable"]>>[0]
) {
  const chargeAvailability = isChargedToolAvailable(context);

  if (!chargeAvailability.usable) {
    return chargeAvailability;
  }

  if (context.phase !== "turn-start") {
    return createToolUnavailableResult("只能在回合开始阶段使用");
  }

  if (!context.actorId || !context.actorTags || !context.toolHistory || !context.turnNumber) {
    return createToolUnavailableResult("当前缺少复制目标信息");
  }

  return getLampEligibleHistoryEntries(
    context.actorId,
    context.actorTags,
    context.toolHistory,
    context.turnNumber
  ).length < 1
    ? createToolUnavailableResult("当前没有可复制的工具记录")
    : chargeAvailability;
}

export const LAMP_COPY_TOOL_DEFINITION: ToolContentDefinition = {
  label: "复制",
  disabledHint: "没有可复制的工具",
  source: "character_skill",
  interaction: createModalChoiceInteraction(),
  isAvailable: isLampCopyAvailable,
  defaultCharges: 1,
  defaultParams: {},
  phases: ["turn-start"],
  getTextDescription: () => ({
    title: "复制",
    description: "放弃本回合工具骰，改为在行动阶段获得一个复制工具。",
    details: ["偷走工具"]
  }),
  color: "#c98e44",
  rollable: false,
  debugGrantable: false,
  endsTurnOnUse: false
};

function resolveLampCopyTool(
  draft: Parameters<ToolModule["execute"]>[0],
  context: Parameters<ToolModule["execute"]>[1]
): void {
  const choiceId = requireChoiceSelection(context);
  const historyIndex = choiceId ? parseLampCopyChoiceId(choiceId) : null;

  if (historyIndex === null) {
    setDraftBlocked(draft, "Lamp copy needs a choice", {
      preview: createToolPreview(context, { valid: false })
    });
    return;
  }

  const candidate =
    getLampCopyCandidatesForContext(context).find((entry) => entry.historyIndex === historyIndex) ?? null;

  if (!candidate) {
    setDraftBlocked(draft, "Lamp copy choice no longer exists", {
      preview: createToolPreview(context, { valid: false })
    });
    return;
  }

  appendDraftSoundEvent(draft, "tool_buff", "lamp-copy:activate", {
    anchor: createPlayerAnchor(context.actor.id)
  });
  setDraftActorTags(
    draft,
    setPlayerTagValue(context.actor.tags, LAMP_COPY_HISTORY_INDEX_TAG, candidate.historyIndex)
  );
  setDraftToolInventory(draft, consumeActiveTool(context));
  setDraftApplied(draft, createUsedSummary(LAMP_COPY_TOOL_DEFINITION.label), {
    path: [],
    phaseEffect: {
      rollMode: "movement_only"
    },
    preview: createToolPreview(context, { valid: true })
  });
}

export const LAMP_COPY_TOOL_MODULE: ToolModule<"lampCopy"> = {
  id: "lampCopy",
  definition: LAMP_COPY_TOOL_DEFINITION,
  getChoices: getLampCopyChoices,
  execute: resolveLampCopyTool
};
