import type {
  RolledToolId,
  ToolAvailability,
  ToolCondition,
  ToolDefinition,
  ToolDieFaceDefinition,
  ToolId,
  ToolLoadoutDefinition,
  ToolParameterId,
  ToolParameterValueMap,
  TurnToolSnapshot
} from "./types";

const TOOL_PARAMETER_LABELS: Record<ToolParameterId, { label: string; unit: "point" | "tile" | "count" }> = {
  movePoints: { label: "移动点数", unit: "point" },
  jumpDistance: { label: "飞跃距离", unit: "tile" },
  hookLength: { label: "钩锁长度", unit: "tile" },
  dashBonus: { label: "冲刺加值", unit: "point" },
  brakeRange: { label: "制动距离", unit: "tile" },
  projectileRange: { label: "射程", unit: "tile" },
  projectileBounceCount: { label: "反弹次数", unit: "count" },
  projectilePushDistance: { label: "推动距离", unit: "tile" },
  wallDurability: { label: "墙体耐久", unit: "count" },
  rocketBlastLeapDistance: { label: "炸飞距离", unit: "tile" },
  rocketSplashPushDistance: { label: "爆风推力", unit: "tile" }
};

export const TOOL_DIE_FACES: readonly ToolDieFaceDefinition[] = [
  {
    toolId: "jump",
    params: {
      jumpDistance: 2
    }
  },
  {
    toolId: "hookshot",
    params: {
      hookLength: 3
    }
  },
  {
    toolId: "dash",
    params: {
      dashBonus: 2
    }
  },
  {
    toolId: "buildWall",
    params: {
      wallDurability: 2
    }
  },
  {
    toolId: "basketball",
    params: {
      projectileRange: 999,
      projectileBounceCount: 1,
      projectilePushDistance: 1,
    }
  },
  {
    toolId: "rocket",
    params: {
      projectileRange: 999,
      rocketBlastLeapDistance: 3,
      rocketSplashPushDistance: 1
    }
  }
] as const;

export const TOOL_DEFINITIONS: Record<ToolId, ToolDefinition> = {
  movement: {
    id: "movement",
    label: "移动",
    description: "沿一个方向移动，最多消耗该工具携带的点数。",
    disabledHint: "这个移动工具已经没有可用点数了。",
    targetMode: "direction",
    conditions: [],
    defaultCharges: 1,
    defaultParams: {
      movePoints: 4
    },
    buttonValue: {
      paramId: "movePoints",
      unit: "point"
    },
    color: "#6abf69",
    rollable: false,
    debugGrantable: true
  },
  jump: {
    id: "jump",
    label: "飞跃",
    description: "朝一个方向飞跃，可跨过中间墙体，落脚点不能是墙体。",
    disabledHint: "当前还不能使用这个飞跃工具。",
    targetMode: "direction",
    conditions: [],
    defaultCharges: 1,
    defaultParams: {
      jumpDistance: 2
    },
    color: "#85c772",
    rollable: true,
    debugGrantable: true
  },
  hookshot: {
    id: "hookshot",
    label: "钩锁",
    description: "朝前方发射钩锁，命中墙体会把自己拉近，命中玩家会把对方拉近。",
    disabledHint: "当前还不能使用这个钩锁工具。",
    targetMode: "direction",
    conditions: [],
    defaultCharges: 1,
    defaultParams: {
      hookLength: 3
    },
    color: "#6ca7d9",
    rollable: true,
    debugGrantable: true
  },
  dash: {
    id: "dash",
    label: "冲刺",
    description: "让当前回合工具列表中的所有移动工具额外获得指定点数。",
    disabledHint: "需要 <移动> 才可以使用。",
    targetMode: "instant",
    conditions: [{ kind: "tool_present", toolId: "movement" }],
    defaultCharges: 1,
    defaultParams: {
      dashBonus: 2
    },
    color: "#f0ad4e",
    rollable: true,
    debugGrantable: true
  },
  brake: {
    id: "brake",
    label: "制动",
    description: "沿一个轴向移动至多指定格数，并停在高亮出的目标格。",
    disabledHint: "这个制动工具已经没有可用距离了。",
    targetMode: "tile",
    tileTargeting: "axis_line",
    conditions: [],
    defaultCharges: 1,
    defaultParams: {
      brakeRange: 3
    },
    buttonValue: {
      paramId: "brakeRange",
      unit: "tile"
    },
    color: "#53a6b9",
    rollable: false,
    debugGrantable: true
  },
  buildWall: {
    id: "buildWall",
    label: "砌墙",
    description: "在周围八格选择一格空地，搭建一个指定耐久的土墙。",
    disabledHint: "这个位置不能砌墙。",
    targetMode: "tile",
    tileTargeting: "adjacent_ring",
    conditions: [],
    defaultCharges: 1,
    defaultParams: {
      wallDurability: 2
    },
    color: "#be7d4d",
    rollable: true,
    debugGrantable: true
  },
  basketball: {
    id: "basketball",
    label: "篮球",
    description: "朝一个方向投出篮球，击中墙会反弹，击中玩家会推动并返还新的篮球。",
    disabledHint: "当前还不能使用这个篮球工具。",
    targetMode: "direction",
    conditions: [],
    defaultCharges: 1,
    defaultParams: {
      projectileRange: 999,
      projectileBounceCount: 1,
      projectilePushDistance: 1,
    },
    color: "#d9824c",
    rollable: true,
    debugGrantable: true
  },
  rocket: {
    id: "rocket",
    label: "火箭",
    description: "朝一个方向发射火箭，爆炸会炸飞中心目标并把周围玩家推出去。",
    disabledHint: "当前还不能使用这个火箭工具。",
    targetMode: "direction",
    conditions: [],
    defaultCharges: 1,
    defaultParams: {
      projectileRange: 999,
      rocketBlastLeapDistance: 3,
      rocketSplashPushDistance: 1
    },
    color: "#dc5f56",
    rollable: true,
    debugGrantable: true
  },
  teleport: {
    id: "teleport",
    label: "瞬移",
    description: "选择全场任意一个可落脚地块，直接瞬移到目标位置。",
    disabledHint: "当前还不能瞬移到这个位置。",
    targetMode: "tile",
    tileTargeting: "board_any",
    conditions: [],
    defaultCharges: 1,
    defaultParams: {},
    color: "#7b8bff",
    rollable: false,
    debugGrantable: true
  }
};

function mergeToolParams(
  toolId: ToolId,
  overrides: ToolParameterValueMap | undefined
): ToolParameterValueMap {
  return {
    ...TOOL_DEFINITIONS[toolId].defaultParams,
    ...(overrides ?? {})
  };
}

// Tool definitions are the canonical metadata source for both rules and UI.
export function getToolDefinition(toolId: ToolId): ToolDefinition {
  return TOOL_DEFINITIONS[toolId];
}

// Directional tools need a cardinal input before they can execute.
export function isDirectionalTool(toolId: ToolId): boolean {
  return TOOL_DEFINITIONS[toolId].targetMode === "direction";
}

// Tile-target tools aim at a snapped board cell instead of a plain direction.
export function isTileTargetTool(toolId: ToolId): boolean {
  return TOOL_DEFINITIONS[toolId].targetMode === "tile";
}

// Aim tools share the same press-drag-release interaction path in the client.
export function isAimTool(toolId: ToolId): boolean {
  return TOOL_DEFINITIONS[toolId].targetMode !== "instant";
}

// Tool instances are built from one helper so rolls, debug grants, and spawned tools stay consistent.
export function createToolInstance(
  instanceId: string,
  toolId: ToolId,
  overrides: Omit<ToolLoadoutDefinition, "toolId"> = {}
): TurnToolSnapshot {
  const definition = TOOL_DEFINITIONS[toolId];

  return {
    instanceId,
    toolId,
    charges: overrides.charges ?? definition.defaultCharges,
    params: mergeToolParams(toolId, overrides.params)
  };
}

// Movement is still created through a helper because the movement die supplies its point value directly.
export function createMovementToolInstance(
  instanceId: string,
  movePoints: number
): TurnToolSnapshot {
  return createToolInstance(instanceId, "movement", {
    params: {
      movePoints
    }
  });
}

// Rolled tools use the configured die face payload so both type and base values stay configurable.
export function createRolledToolInstance(
  instanceId: string,
  face: ToolDieFaceDefinition
): TurnToolSnapshot {
  return createToolInstance(instanceId, face.toolId, face);
}

// Debug grants use the tool definition defaults unless the caller supplies an override later.
export function createDebugToolInstance(
  instanceId: string,
  toolId: ToolId
): TurnToolSnapshot {
  return createToolInstance(instanceId, toolId);
}

// Tool lookup is shared by the room, preview layer, and HUD selection flow.
export function findToolInstance(
  tools: TurnToolSnapshot[],
  instanceId: string
): TurnToolSnapshot | undefined {
  return tools.find((tool) => tool.instanceId === instanceId);
}

// Parameter access always falls back to the tool definition defaults.
export function getToolParam(
  tool: TurnToolSnapshot,
  paramId: ToolParameterId
): number {
  return tool.params[paramId] ?? TOOL_DEFINITIONS[tool.toolId].defaultParams[paramId] ?? 0;
}

// Consuming a tool removes depleted instances while preserving multi-charge support.
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

// Tool conditions return a reusable availability object instead of scattering checks.
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
          (condition.toolId !== "movement" || getToolParam(candidate, "movePoints") > 0)
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

// Availability checks centralize all runtime use requirements for tool instances.
export function getToolAvailability(
  tool: TurnToolSnapshot,
  tools: TurnToolSnapshot[]
): ToolAvailability {
  if (tool.charges < 1) {
    return {
      usable: false,
      reason: "没有剩余次数"
    };
  }

  if (tool.toolId === "movement" && getToolParam(tool, "movePoints") < 1) {
    return {
      usable: false,
      reason: "没有剩余点数"
    };
  }

  if (tool.toolId === "brake" && getToolParam(tool, "brakeRange") < 1) {
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

// Disabled messages combine tool-specific guidance with the current blocking reason.
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

function formatToolButtonValue(unit: "point" | "tile", value: number): string {
  return unit === "point" ? `${value}` : `${value}`;
}

function formatToolParameterValue(
  unit: "point" | "tile" | "count",
  value: number
): string {
  if (unit === "point") {
    return `${value} 点`;
  }

  if (unit === "tile") {
    return `${value} 格`;
  }

  return `${value} 次`;
}

// Button labels derive from shared metadata so new parameterized tools do not need UI branches.
export function describeToolButtonLabel(tool: TurnToolSnapshot): string {
  const definition = TOOL_DEFINITIONS[tool.toolId];
  const buttonValue = definition.buttonValue;

  if (buttonValue) {
    return `${definition.label} ${formatToolButtonValue(buttonValue.unit, getToolParam(tool, buttonValue.paramId))}`;
  }

  return tool.charges > 1 ? `${definition.label} x${tool.charges}` : definition.label;
}

// Ring details can reuse the same metadata while keeping units visible for short labels.
export function describeToolButtonValue(tool: TurnToolSnapshot): string | null {
  const definition = TOOL_DEFINITIONS[tool.toolId];
  const buttonValue = definition.buttonValue;

  if (!buttonValue) {
    return null;
  }

  const value = getToolParam(tool, buttonValue.paramId);
  return buttonValue.unit === "point" ? `${value} 点` : `${value} 格`;
}

// Tool details expose the current parameter payload in a UI-friendly order.
export function describeToolParameters(tool: TurnToolSnapshot): string[] {
  return Object.keys(TOOL_DEFINITIONS[tool.toolId].defaultParams).map((paramId) => {
    const typedParamId = paramId as ToolParameterId;
    const descriptor = TOOL_PARAMETER_LABELS[typedParamId];
    const value = getToolParam(tool, typedParamId);

    return `${descriptor.label} ${formatToolParameterValue(descriptor.unit, value)}`;
  });
}

// Debug menus list every tool that can be spawned directly in the current prototype.
export function getDebugGrantableToolIds(): ToolId[] {
  return (Object.values(TOOL_DEFINITIONS) as ToolDefinition[])
    .filter((definition) => definition.debugGrantable)
    .map((definition) => definition.id);
}

// Tool dice read from the configured face list instead of hardcoded ids.
export function getRollableToolIds(): RolledToolId[] {
  return TOOL_DIE_FACES.map((face) => face.toolId);
}
