import type { ToolContentDefinition } from "../content/schema";
import { INSTANT_TOOL_INTERACTION } from "../toolInteraction";
import { setDraftApplied, setDraftToolInventory } from "../rules/actionDraft";
import { consumeActiveTool } from "../rules/actionResolution";
import type { ToolModule } from "./types";
import {
  appendDraftSoundEvent,
  createPlayerAnchor,
  createToolPreview,
  createUsedSummary,
  getToolParamValue,
  isChargedToolAvailable
} from "./helpers";

export const DASH_TOOL_DEFINITION: ToolContentDefinition = {
  label: "冲刺",
  disabledHint: "当前不能使用冲刺。",
  source: "turn",
  interaction: INSTANT_TOOL_INTERACTION,
  isAvailable: isChargedToolAvailable,
  defaultCharges: 1,
  defaultParams: {
    dashBonus: 2
  },
  getTextDescription: ({ params }) => ({
    title: "冲刺",
    description: "让本回合剩余的所有移动工具额外获得指定点数。",
    details: [`移动增加 ${params.dashBonus ?? 0} 点`]
  }),
  color: "#f0ad4e",
  rollable: true,
  debugGrantable: true,
  endsTurnOnUse: false
};

function resolveDashTool(
  draft: Parameters<ToolModule["execute"]>[0],
  context: Parameters<ToolModule["execute"]>[1]
): void {
  const dashBonus = getToolParamValue(context.activeTool, "dashBonus", 2);
  const nextTools = consumeActiveTool(context).map((tool) =>
    typeof tool.params.movePoints === "number"
      ? {
          ...tool,
          params: {
            ...tool.params,
            movePoints: tool.params.movePoints + dashBonus
          }
        }
      : tool
  );

  appendDraftSoundEvent(draft, "tool_buff", "dash:activate", {
    anchor: createPlayerAnchor(context.actor.id)
  });
  setDraftToolInventory(draft, nextTools);
  setDraftApplied(draft, createUsedSummary(DASH_TOOL_DEFINITION.label), {
    path: [],
    preview: createToolPreview(context, {
      valid: true
    })
  });
}

export const DASH_TOOL_MODULE: ToolModule<"dash"> = {
  id: "dash",
  definition: DASH_TOOL_DEFINITION,
  dieFace: {
    params: {
      dashBonus: 2
    }
  },
  execute: resolveDashTool
};
