import type {
  RolledToolId,
  ToolAvailability,
  ToolCondition,
  ToolDefinition,
  ToolId,
  TurnToolSnapshot
} from "./types";

const DEFAULT_BRAKE_RANGE = 3;

export const TOOL_DIE_FACES: readonly RolledToolId[] = ["jump", "hookshot", "pivot", "brake", "dash"];

export const TOOL_DEFINITIONS: Record<ToolId, ToolDefinition> = {
  movement: {
    id: "movement",
    label: "移动",
    description: "沿一个方向移动，最多消耗该工具携带的点数。",
    disabledHint: "这个移动工具已经没有可用点数了。",
    targetMode: "direction",
    conditions: [],
    chargesPerRoll: 1,
    color: "#6abf69"
  },
  jump: {
    id: "jump",
    label: "飞跃",
    description: "朝一个方向飞跃，最多跨越 2 格，并无视中间阻挡。",
    disabledHint: "当前还不能使用这个飞跃工具。",
    targetMode: "direction",
    conditions: [],
    chargesPerRoll: 1,
    color: "#85c772"
  },
  hookshot: {
    id: "hookshot",
    label: "钩锁",
    description: "朝前方发射钩锁，命中墙体会把自己拉近，命中玩家会把对方拉近。",
    disabledHint: "当前还不能使用这个钩锁工具。",
    targetMode: "direction",
    conditions: [],
    chargesPerRoll: 1,
    color: "#6ca7d9"
  },
  pivot: {
    id: "pivot",
    label: "枢转",
    description: "额外获得一个点数为 2 的移动工具。",
    disabledHint: "当前还不能使用这个枢转工具。",
    targetMode: "instant",
    conditions: [],
    chargesPerRoll: 1,
    color: "#c89cf1"
  },
  dash: {
    id: "dash",
    label: "冲刺",
    description: "让当前回合工具列表中的所有移动工具额外获得 2 点。",
    disabledHint: "冲刺需要当前工具列表里仍然保留至少一个可用的移动工具。",
    targetMode: "instant",
    conditions: [{ kind: "tool_present", toolId: "movement" }],
    chargesPerRoll: 1,
    color: "#f0ad4e"
  },
  brake: {
    id: "brake",
    label: "制动",
    description: "沿一个轴向移动至多 3 格，并停在高亮出的目标格。",
    disabledHint: "这个制动工具已经没有可用距离了。",
    targetMode: "tile",
    conditions: [],
    chargesPerRoll: 1,
    color: "#53a6b9"
  }
};

export function getToolDefinition(toolId: ToolId): ToolDefinition {
  return TOOL_DEFINITIONS[toolId];
}

export function isDirectionalTool(toolId: ToolId): boolean {
  return TOOL_DEFINITIONS[toolId].targetMode === "direction";
}

export function isTileTargetTool(toolId: ToolId): boolean {
  return TOOL_DEFINITIONS[toolId].targetMode === "tile";
}

export function isAimTool(toolId: ToolId): boolean {
  return TOOL_DEFINITIONS[toolId].targetMode !== "instant";
}

export function createMovementToolInstance(
  instanceId: string,
  movePoints: number
): TurnToolSnapshot {
  return {
    instanceId,
    toolId: "movement",
    charges: 1,
    movePoints,
    range: null
  };
}

export function createBrakeToolInstance(
  instanceId: string,
  range: number
): TurnToolSnapshot {
  return {
    instanceId,
    toolId: "brake",
    charges: 1,
    movePoints: null,
    range
  };
}

export function createRolledToolInstance(
  instanceId: string,
  toolId: RolledToolId
): TurnToolSnapshot {
  return {
    instanceId,
    toolId,
    charges: TOOL_DEFINITIONS[toolId].chargesPerRoll,
    movePoints: null,
    range: toolId === "brake" ? DEFAULT_BRAKE_RANGE : null
  };
}

export function findToolInstance(
  tools: TurnToolSnapshot[],
  instanceId: string
): TurnToolSnapshot | undefined {
  return tools.find((tool) => tool.instanceId === instanceId);
}

export function consumeToolInstance(
  tools: TurnToolSnapshot[],
  instanceId: string
): TurnToolSnapshot[] {
  return tools.flatMap((tool) => {
    if (tool.instanceId !== instanceId) {
      return [tool];
    }

    if (tool.charges <= 1) {
      return [];
    }

    return [
      {
        ...tool,
        charges: tool.charges - 1
      }
    ];
  });
}

function satisfiesCondition(
  condition: ToolCondition,
  currentTool: TurnToolSnapshot,
  tools: TurnToolSnapshot[]
): ToolAvailability {
  switch (condition.kind) {
    case "tool_present": {
      const hasMatchingTool = tools.some(
        (candidate) =>
          candidate.instanceId !== currentTool.instanceId &&
          candidate.toolId === condition.toolId &&
          (condition.toolId !== "movement" || (candidate.movePoints ?? 0) > 0)
      );

      return hasMatchingTool
        ? { usable: true, reason: null }
        : {
            usable: false,
            reason: `需要保留${TOOL_DEFINITIONS[condition.toolId].label}`
          };
    }
  }
}

export function getToolAvailability(
  tool: TurnToolSnapshot,
  tools: TurnToolSnapshot[]
): ToolAvailability {
  if (tool.toolId === "movement" && (tool.movePoints ?? 0) < 1) {
    return {
      usable: false,
      reason: "没有剩余点数"
    };
  }

  if (tool.toolId === "brake" && (tool.range ?? 0) < 1) {
    return {
      usable: false,
      reason: "没有剩余距离"
    };
  }

  for (const condition of TOOL_DEFINITIONS[tool.toolId].conditions) {
    const result = satisfiesCondition(condition, tool, tools);

    if (!result.usable) {
      return result;
    }
  }

  return {
    usable: true,
    reason: null
  };
}

export function getToolDisabledMessage(
  tool: TurnToolSnapshot,
  tools: TurnToolSnapshot[]
): string | null {
  const availability = getToolAvailability(tool, tools);

  if (availability.usable) {
    return null;
  }

  const configuredHint = TOOL_DEFINITIONS[tool.toolId].disabledHint;

  if (!configuredHint) {
    return availability.reason ?? `${TOOL_DEFINITIONS[tool.toolId].label}当前不可用。`;
  }

  if (!availability.reason) {
    return configuredHint;
  }

  return `${configuredHint} 当前限制：${availability.reason}。`;
}
