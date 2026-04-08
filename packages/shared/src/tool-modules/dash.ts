import type { ToolContentDefinition } from "../content/schema";
import { INSTANT_TOOL_INTERACTION } from "../toolInteraction";
import { setDraftApplied, setDraftToolInventory } from "../rules/actionDraft";
import { consumeActiveTool } from "../rules/actionResolution";
import type { ToolModule } from "./types";
import { createToolPreview, createUsedSummary, getToolParamValue } from "./helpers";

export const DASH_TOOL_DEFINITION: ToolContentDefinition = {
  label: "冲刺",
  description: "让本回合剩余的所有移动工具额外获得指定点数。",
  disabledHint: "需要保留一个可用的移动时才能使用。",
  source: "turn",
  interaction: INSTANT_TOOL_INTERACTION,
  conditions: [{ kind: "tool_present", toolId: "movement" }],
  defaultCharges: 1,
  defaultParams: {
    dashBonus: 2
  },
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
    tool.toolId === "movement" || tool.toolId === "brake"
      ? {
          ...tool,
          params: {
            ...tool.params,
            movePoints: (typeof tool.params.movePoints === "number" ? tool.params.movePoints : 0) + dashBonus
          }
      } : tool
  );

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
