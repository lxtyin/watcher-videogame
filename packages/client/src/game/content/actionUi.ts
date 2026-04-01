import {
  TOOL_DEFINITIONS,
  type ToolId,
  type TurnStartActionId
} from "@watcher/shared";

export type ActionUiId = "roll" | ToolId | TurnStartActionId | "end";
export type DirectionVisualVariant =
  | "move"
  | "jump"
  | "hookshot"
  | "basketball"
  | "rocket"
  | "special";

interface ActionUiConfig {
  accent: string;
  detail: string;
  directionalVariant?: DirectionVisualVariant;
  token: string;
}

// Scene action chips live in a content registry so future tools only need one UI entry.
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
  buildWall: {
    token: "墙",
    accent: TOOL_DEFINITIONS.buildWall.color,
    detail: "按住选格"
  },
  basketball: {
    token: "球",
    accent: TOOL_DEFINITIONS.basketball.color,
    detail: "按住定向",
    directionalVariant: "basketball"
  },
  rocket: {
    token: "箭",
    accent: TOOL_DEFINITIONS.rocket.color,
    detail: "按住定向",
    directionalVariant: "rocket"
  },
  teleport: {
    token: "瞬",
    accent: TOOL_DEFINITIONS.teleport.color,
    detail: "按住选格"
  },
  deployWallet: {
    token: "包",
    accent: TOOL_DEFINITIONS.deployWallet.color,
    detail: "按住选格"
  },
  bombThrow: {
    token: "弹",
    accent: TOOL_DEFINITIONS.bombThrow.color,
    detail: "按住选格定向",
    directionalVariant: "special"
  },
  balance: {
    token: "衡",
    accent: TOOL_DEFINITIONS.balance.color,
    detail: "点击二选一"
  },
  blazePrepareBomb: {
    token: "备",
    accent: "#d86a42",
    detail: "准备投弹"
  },
  volatySkipToolDie: {
    token: "跃",
    accent: "#77b8ff",
    detail: "弃骰飞跃"
  },
  end: {
    token: "结",
    accent: "#607087",
    detail: "结束回合"
  }
};

// Action UI config keeps scene ring labels and accents in one registry.
export function getActionUiConfig(actionId: ActionUiId): ActionUiConfig {
  return ACTION_UI_CONFIG[actionId];
}

// Directional variants map tools onto reusable world-space arrow silhouettes.
export function getDirectionalActionVariant(actionId: ToolId): DirectionVisualVariant {
  return ACTION_UI_CONFIG[actionId].directionalVariant ?? "special";
}
