import {
  TOOL_DEFINITIONS,
  type ToolId
} from "@watcher/shared";

export type ActionUiId = "roll" | ToolId | "end";

interface ActionUiConfig {
  accent: string;
  detail?: string;
  token: string;
}

const ACTION_UI_CONFIG: Record<ActionUiId, ActionUiConfig> = {
  roll: {
    token: "掷",
    accent: "#efc66d",
    detail: "开始投骰"
  },
  movement: {
    token: "移",
    accent: "#6abf69"
  },
  jump: {
    token: "跃",
    accent: TOOL_DEFINITIONS.jump.color
  },
  hookshot: {
    token: "钩",
    accent: TOOL_DEFINITIONS.hookshot.color
  },
  dash: {
    token: "冲",
    accent: TOOL_DEFINITIONS.dash.color
  },
  brake: {
    token: "刹",
    accent: TOOL_DEFINITIONS.brake.color
  },
  buildWall: {
    token: "墙",
    accent: TOOL_DEFINITIONS.buildWall.color
  },
  basketball: {
    token: "球",
    accent: TOOL_DEFINITIONS.basketball.color
  },
  rocket: {
    token: "箭",
    accent: TOOL_DEFINITIONS.rocket.color
  },
  punch: {
    token: "拳",
    accent: TOOL_DEFINITIONS.punch.color
  },
  teleport: {
    token: "瞬",
    accent: TOOL_DEFINITIONS.teleport.color
  },
  deployWallet: {
    token: "包",
    accent: TOOL_DEFINITIONS.deployWallet.color
  },
  bombThrow: {
    token: "爆",
    accent: TOOL_DEFINITIONS.bombThrow.color
  },
  balance: {
    token: "衡",
    accent: TOOL_DEFINITIONS.balance.color
  },
  blazePrepareBomb: {
    token: "备",
    accent: "#d86a42"
  },
  volatySkipToolDie: {
    token: "跃",
    accent: "#77b8ff"
  },
  lampPrepareCopy: {
    token: "复",
    accent: "#c98e44"
  },
  lampCopy: {
    token: "复",
    accent: "#c98e44"
  },
  awmShoot: {
    token: "狙",
    accent: TOOL_DEFINITIONS.awmShoot.color
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
