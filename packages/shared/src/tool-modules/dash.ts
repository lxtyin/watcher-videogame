import type { ToolContentDefinition } from "../content/schema";
import type { ActionResolution } from "../types";
import { buildAppliedResolution, consumeActiveTool } from "../rules/actionResolution";
import type { ToolModule } from "./types";
import { createUsedSummary, getToolParamValue } from "./helpers";

export const DASH_TOOL_DEFINITION: ToolContentDefinition = {
  label: "冲刺",
  description: "让本回合剩余的所有移动工具额外获得指定点数。",
  disabledHint: "需要保留一个可用的移动时才能使用。",
  source: "turn",
  targetMode: "instant",
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

function resolveDashTool(context: Parameters<ToolModule["execute"]>[0]): ActionResolution {
  const dashBonus = getToolParamValue(context.activeTool, "dashBonus", 2);
  const nextTools = consumeActiveTool(context).map((tool) =>
    tool.toolId === "movement"
      ? {
          ...tool,
          params: {
            ...tool.params,
            movePoints: (typeof tool.params.movePoints === "number" ? tool.params.movePoints : 0) + dashBonus
          }
        }
      : tool
  );

  return buildAppliedResolution(
    context.actor,
    nextTools,
    createUsedSummary(DASH_TOOL_DEFINITION.label),
    context.toolDieSeed,
    []
  );
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
