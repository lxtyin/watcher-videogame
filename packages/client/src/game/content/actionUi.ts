import {
  TOOL_DEFINITIONS,
  type ToolId
} from "@watcher/shared";

export type ActionUiId = "roll" | ToolId | "end";

interface ActionUiConfig {
  accent: string;
  detail: string;
  token: string;
}

// Scene action chips stay as a small registry of labels, accents, and tokens only.
const ACTION_UI_CONFIG: Record<ActionUiId, ActionUiConfig> = {
  roll: {
    token: "掷",
    accent: "#efc66d",
    detail: "开始投骰"
  },
  movement: {
    token: "移",
    accent: "#6abf69",
    detail: "按住拖拽"
  },
  jump: {
    token: "跃",
    accent: TOOL_DEFINITIONS.jump.color,
    detail: "按住定向"
  },
  hookshot: {
    token: "钩",
    accent: TOOL_DEFINITIONS.hookshot.color,
    detail: "按住瞄准"
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
    detail: "按住定向"
  },
  rocket: {
    token: "箭",
    accent: TOOL_DEFINITIONS.rocket.color,
    detail: "按住定向"
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
    detail: "按住选格定向"
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
  awmShoot: {
    token: "狙",
    accent: TOOL_DEFINITIONS.awmShoot.color,
    detail: "按住瞄准"
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
