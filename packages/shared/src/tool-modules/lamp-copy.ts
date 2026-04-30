import type { RoundUsedToolContentDefinition, ToolContentDefinition } from "../content/schema";
import {
  setDraftApplied,
  setDraftBlocked,
  setDraftToolInventory
} from "../rules/actionDraft";
import { consumeActiveTool, requireChoiceSelection } from "../rules/actionResolution";
import { createModalChoiceInteraction } from "../toolInteraction";
import type { RoundUsedToolSnapshot, ToolChoiceDefinition, TurnToolSnapshot } from "../types";
import type { ToolModule } from "./types";
import {
  appendDraftSoundEvent,
  createPlayerAnchor,
  createToolPreview,
  createToolUnavailableResult,
  createUsedSummary,
  isChargedToolAvailable
} from "./helpers";

type LampCopyCandidate = Pick<
  RoundUsedToolContentDefinition,
  "description" | "label" | "params" | "playerId" | "source" | "toolId" | "usableInTurnAction"
>;

function buildLampCopySignature(usedTool: Pick<LampCopyCandidate, "params" | "source" | "toolId">): string {
  const paramsSignature = Object.entries(usedTool.params)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value ?? 0}`)
    .join(",");

  return `${usedTool.toolId}|${usedTool.source}|${paramsSignature}`;
}

function buildLampCopyChoiceId(usedTool: Pick<LampCopyCandidate, "params" | "source" | "toolId">): string {
  return `copy:${buildLampCopySignature(usedTool)}`;
}

function buildLampCopiedToolInstanceId(activeToolInstanceId: string, choiceId: string): string {
  return `${activeToolInstanceId}:${choiceId}`;
}

function isLampCopyCandidate(usedTool: LampCopyCandidate, actorId: string): boolean {
  return (
    usedTool.playerId !== actorId &&
    usedTool.toolId !== "movement" &&
    usedTool.toolId !== "lampCopy" &&
    usedTool.usableInTurnAction
  );
}

function getLampCopyCandidates<TCandidate extends LampCopyCandidate>(
  actorId: string,
  roundUsedTools: readonly TCandidate[]
): TCandidate[] {
  const uniqueCandidates = new Map<string, TCandidate>();

  for (const usedTool of roundUsedTools) {
    if (!isLampCopyCandidate(usedTool, actorId)) {
      continue;
    }

    const signature = buildLampCopySignature(usedTool);

    if (!uniqueCandidates.has(signature)) {
      uniqueCandidates.set(signature, {
        ...usedTool,
        params: {
          ...usedTool.params
        }
      } as TCandidate);
    }
  }

  return [...uniqueCandidates.values()];
}

function createLampCopyChoiceDefinition(usedTool: LampCopyCandidate): ToolChoiceDefinition {
  return {
    id: buildLampCopyChoiceId(usedTool),
    iconId: `tool:${usedTool.toolId}`,
    label: usedTool.label,
    description: usedTool.description
  };
}

function getLampCopyChoices(
  context: Parameters<NonNullable<ToolModule["getChoices"]>>[0]
): readonly ToolChoiceDefinition[] {
  return getLampCopyCandidates(context.actor.id, context.roundUsedTools).map(createLampCopyChoiceDefinition);
}

function findLampCopiedTool(
  choiceId: string,
  actorId: string,
  roundUsedTools: readonly RoundUsedToolSnapshot[]
): RoundUsedToolSnapshot | null {
  return (
    getLampCopyCandidates(actorId, roundUsedTools).find(
      (usedTool) => buildLampCopyChoiceId(usedTool) === choiceId
    ) ?? null
  );
}

export const LAMP_COPY_TOOL_DEFINITION: ToolContentDefinition = {
  label: "复制",
  disabledHint: "本轮内需要先有其他玩家使用过可在行动阶段使用的工具。",
  source: "character_skill",
  interaction: createModalChoiceInteraction(),
  isAvailable: (context) => {
    const chargeAvailability = isChargedToolAvailable(context);

    if (!chargeAvailability.usable) {
      return chargeAvailability;
    }

    if (!context.actorId) {
      return createToolUnavailableResult("当前缺少复制目标信息。");
    }

    return getLampCopyCandidates(context.actorId, context.roundUsedTools ?? []).length < 1
      ? createToolUnavailableResult("本轮还没有其他玩家使用过可复制的工具。")
      : chargeAvailability;
  },
  defaultCharges: 1,
  defaultParams: {},
  getTextDescription: () => ({
    title: "复制",
    description: "放弃本回合工具骰，改为选择一件本轮其他玩家用过的工具并加入手牌。",
    details: ["只能复制其他玩家本轮已经使用过的行动阶段工具。"]
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

  if (!choiceId) {
    setDraftBlocked(draft, "Lamp copy needs a choice", {
      preview: createToolPreview(context, { valid: false })
    });
    return;
  }

  const copiedTool = findLampCopiedTool(choiceId, context.actor.id, context.roundUsedTools);

  if (!copiedTool) {
    setDraftBlocked(draft, "Lamp copy choice no longer exists", {
      preview: createToolPreview(context, { valid: false })
    });
    return;
  }

  const nextTools = [
    ...consumeActiveTool(context),
    {
      instanceId: buildLampCopiedToolInstanceId(context.activeTool.instanceId, choiceId),
      toolId: copiedTool.toolId,
      charges: 1,
      params: {
        ...copiedTool.params
      },
      source: copiedTool.source
    } satisfies TurnToolSnapshot
  ];

  appendDraftSoundEvent(draft, "tool_buff", "lamp-copy:activate", {
    anchor: createPlayerAnchor(context.actor.id)
  });
  setDraftToolInventory(draft, nextTools);
  setDraftApplied(draft, createUsedSummary(LAMP_COPY_TOOL_DEFINITION.label), {
    path: [],
    preview: createToolPreview(context, { valid: true })
  });
}

export const LAMP_COPY_TOOL_MODULE: ToolModule<"lampCopy"> = {
  id: "lampCopy",
  definition: LAMP_COPY_TOOL_DEFINITION,
  getChoices: getLampCopyChoices,
  execute: resolveLampCopyTool
};
