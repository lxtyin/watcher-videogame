import { TOOL_DEFINITIONS, type ToolId } from "@watcher/shared";

export type ActionUiId = "roll" | ToolId | "end";
export type DirectionVisualVariant = "move" | "jump" | "hookshot" | "special";

interface ActionUiConfig {
  accent: string;
  detail: string;
  directionalVariant?: DirectionVisualVariant;
  token: string;
}

const ACTION_UI_CONFIG: Record<ActionUiId, ActionUiConfig> = {
  roll: {
    token: "掷",
    accent: "#efc66d",
    detail: "开始掷骰"
  },
  movement: {
    token: "移",
    accent: "#6abf69",
    detail: "按住拖拽",
    directionalVariant: "move"
  },
  jump: {
    token: "跃",
    accent: TOOL_DEFINITIONS.jump.color,
    detail: "按住定向",
    directionalVariant: "jump"
  },
  hookshot: {
    token: "钩",
    accent: TOOL_DEFINITIONS.hookshot.color,
    detail: "按住瞄准",
    directionalVariant: "hookshot"
  },
  pivot: {
    token: "枢",
    accent: TOOL_DEFINITIONS.pivot.color,
    detail: "立即使用"
  },
  dash: {
    token: "冲",
    accent: TOOL_DEFINITIONS.dash.color,
    detail: "立即使用"
  },
  brake: {
    token: "制",
    accent: TOOL_DEFINITIONS.brake.color,
    detail: "按住选格"
  },
  end: {
    token: "结",
    accent: "#607087",
    detail: "结束回合"
  }
};

export function getActionUiConfig(actionId: ActionUiId): ActionUiConfig {
  return ACTION_UI_CONFIG[actionId];
}

export function getDirectionalActionVariant(actionId: ToolId): DirectionVisualVariant {
  return ACTION_UI_CONFIG[actionId].directionalVariant ?? "special";
}
