// src/content/tools.ts
function defineToolRegistry(registry) {
  return registry;
}
function defineToolDieFaces(faces) {
  return faces;
}
var TOOL_PARAMETER_LABELS = {
  movePoints: { label: "\u79FB\u52A8\u70B9\u6570", unit: "point" },
  jumpDistance: { label: "\u98DE\u8DC3\u8DDD\u79BB", unit: "tile" },
  hookLength: { label: "\u94A9\u9501\u957F\u5EA6", unit: "tile" },
  dashBonus: { label: "\u51B2\u523A\u52A0\u6210", unit: "point" },
  brakeRange: { label: "\u5236\u52A8\u8DDD\u79BB", unit: "tile" },
  projectileRange: { label: "\u5C04\u7A0B", unit: "tile" },
  projectileBounceCount: { label: "\u53CD\u5F39\u6B21\u6570", unit: "count" },
  projectilePushDistance: { label: "\u63A8\u52A8\u8DDD\u79BB", unit: "tile" },
  wallDurability: { label: "\u5899\u4F53\u8010\u4E45", unit: "count" },
  targetRange: { label: "\u65BD\u653E\u8303\u56F4", unit: "tile" },
  rocketBlastLeapDistance: { label: "\u70B8\u98DE\u8DDD\u79BB", unit: "tile" },
  rocketSplashPushDistance: { label: "\u7206\u98CE\u63A8\u529B", unit: "tile" },
  pushDistance: { label: "\u4F4D\u79FB\u8DDD\u79BB", unit: "tile" }
};
var TOOL_DIE_FACES = defineToolDieFaces([
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
      projectilePushDistance: 1
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
]);
var TOOL_REGISTRY = defineToolRegistry({
  movement: {
    actorMovement: {
      type: "translate",
      disposition: "active"
    },
    label: "\u79FB\u52A8",
    description: "\u671D\u4E00\u4E2A\u65B9\u5411\u79FB\u52A8\uFF0C\u6700\u591A\u6D88\u8017\u8BE5\u5DE5\u5177\u643A\u5E26\u7684\u70B9\u6570\u3002",
    disabledHint: "\u8FD9\u4E2A\u79FB\u52A8\u5DE5\u5177\u5DF2\u7ECF\u6CA1\u6709\u53EF\u7528\u70B9\u6570\u4E86\u3002",
    source: "turn",
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
    debugGrantable: true,
    endsTurnOnUse: false
  },
  jump: {
    actorMovement: {
      type: "leap",
      disposition: "active"
    },
    label: "\u98DE\u8DC3",
    description: "\u671D\u4E00\u4E2A\u65B9\u5411\u98DE\u8DC3\uFF0C\u53EF\u4EE5\u8D8A\u8FC7\u4E2D\u95F4\u963B\u6321\uFF0C\u4F46\u843D\u70B9\u4E0D\u80FD\u662F\u5899\u3002",
    disabledHint: "\u5F53\u524D\u8FD8\u4E0D\u80FD\u4F7F\u7528\u8FD9\u4E2A\u98DE\u8DC3\u5DE5\u5177\u3002",
    source: "turn",
    targetMode: "direction",
    conditions: [],
    defaultCharges: 1,
    defaultParams: {
      jumpDistance: 2
    },
    color: "#85c772",
    rollable: true,
    debugGrantable: true,
    endsTurnOnUse: false
  },
  hookshot: {
    actorMovement: {
      type: "drag",
      disposition: "active"
    },
    label: "\u94A9\u9501",
    description: "\u671D\u524D\u65B9\u53D1\u5C04\u94A9\u9501\uFF0C\u547D\u4E2D\u5899\u65F6\u62C9\u8FD1\u81EA\u5DF1\uFF0C\u547D\u4E2D\u73A9\u5BB6\u65F6\u62C9\u8FD1\u5BF9\u65B9\u3002",
    disabledHint: "\u5F53\u524D\u8FD8\u4E0D\u80FD\u4F7F\u7528\u8FD9\u4E2A\u94A9\u9501\u5DE5\u5177\u3002",
    source: "turn",
    targetMode: "direction",
    conditions: [],
    defaultCharges: 1,
    defaultParams: {
      hookLength: 3
    },
    color: "#6ca7d9",
    rollable: true,
    debugGrantable: true,
    endsTurnOnUse: false
  },
  dash: {
    label: "\u51B2\u523A",
    description: "\u8BA9\u5F53\u524D\u56DE\u5408\u5DE5\u5177\u5217\u8868\u4E2D\u7684\u6240\u6709\u79FB\u52A8\u5DE5\u5177\u989D\u5916\u83B7\u5F97\u6307\u5B9A\u70B9\u6570\u3002",
    disabledHint: "\u9700\u8981\u4FDD\u7559\u4E00\u4E2A\u53EF\u7528\u7684<\u79FB\u52A8>\u65F6\u624D\u80FD\u4F7F\u7528\u3002",
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
  },
  brake: {
    actorMovement: {
      type: "translate",
      disposition: "active"
    },
    label: "\u5236\u52A8",
    description: "\u6CBF\u4E00\u4E2A\u8F74\u5411\u79FB\u52A8\u81F3\u591A\u6307\u5B9A\u683C\u6570\uFF0C\u5E76\u505C\u5728\u5B9E\u9645\u53EF\u8FBE\u7684\u76EE\u6807\u683C\u3002",
    disabledHint: "\u8FD9\u4E2A\u5236\u52A8\u5DE5\u5177\u5DF2\u7ECF\u6CA1\u6709\u53EF\u7528\u8DDD\u79BB\u4E86\u3002",
    source: "turn",
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
    debugGrantable: true,
    endsTurnOnUse: false
  },
  buildWall: {
    label: "\u780C\u5899",
    description: "\u5728\u5468\u56F4\u516B\u683C\u4E2D\u9009\u62E9\u4E00\u4E2A\u7A7A\u5730\uFF0C\u751F\u6210\u4E00\u9762\u6307\u5B9A\u8010\u4E45\u7684\u571F\u5899\u3002",
    disabledHint: "\u8FD9\u4E2A\u4F4D\u7F6E\u4E0D\u80FD\u780C\u5899\u3002",
    source: "turn",
    targetMode: "tile",
    tileTargeting: "adjacent_ring",
    conditions: [],
    defaultCharges: 1,
    defaultParams: {
      wallDurability: 2
    },
    color: "#be7d4d",
    rollable: true,
    debugGrantable: true,
    endsTurnOnUse: false
  },
  basketball: {
    label: "\u7BEE\u7403",
    description: "\u671D\u4E00\u4E2A\u65B9\u5411\u6295\u51FA\u7BEE\u7403\uFF0C\u9047\u5899\u4F1A\u53CD\u5F39\uFF0C\u547D\u4E2D\u73A9\u5BB6\u4F1A\u63A8\u52A8\u5E76\u8FD4\u8FD8\u65B0\u7684\u7BEE\u7403\u3002",
    disabledHint: "\u5F53\u524D\u8FD8\u4E0D\u80FD\u4F7F\u7528\u8FD9\u4E2A\u7BEE\u7403\u5DE5\u5177\u3002",
    source: "turn",
    targetMode: "direction",
    conditions: [],
    defaultCharges: 1,
    defaultParams: {
      projectileRange: 999,
      projectileBounceCount: 1,
      projectilePushDistance: 1
    },
    color: "#d9824c",
    rollable: true,
    debugGrantable: true,
    endsTurnOnUse: false
  },
  rocket: {
    label: "\u706B\u7BAD",
    description: "\u671D\u4E00\u4E2A\u65B9\u5411\u53D1\u5C04\u706B\u7BAD\uFF0C\u5728\u78B0\u649E\u70B9\u7206\u70B8\u5E76\u51FB\u98DE\u5468\u56F4\u76EE\u6807\u3002",
    disabledHint: "\u5F53\u524D\u8FD8\u4E0D\u80FD\u4F7F\u7528\u8FD9\u4E2A\u706B\u7BAD\u5DE5\u5177\u3002",
    source: "turn",
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
    debugGrantable: true,
    endsTurnOnUse: false
  },
  teleport: {
    actorMovement: {
      type: "teleport",
      disposition: "active"
    },
    label: "\u77AC\u79FB",
    description: "\u9009\u62E9\u5168\u573A\u4EFB\u610F\u4E00\u4E2A\u53EF\u843D\u811A\u5730\u5757\uFF0C\u76F4\u63A5\u77AC\u79FB\u5230\u76EE\u6807\u4F4D\u7F6E\u3002",
    disabledHint: "\u5F53\u524D\u8FD8\u4E0D\u80FD\u77AC\u79FB\u5230\u8FD9\u4E2A\u4F4D\u7F6E\u3002",
    source: "turn",
    targetMode: "tile",
    tileTargeting: "board_any",
    conditions: [],
    defaultCharges: 1,
    defaultParams: {},
    color: "#7b8bff",
    rollable: false,
    debugGrantable: true,
    endsTurnOnUse: false
  },
  deployWallet: {
    label: "\u653E\u7F6E\u94B1\u5305",
    description: "\u5728 5x5 \u8303\u56F4\u5185\u9009\u62E9\u4E00\u4E2A\u53EF\u90E8\u7F72\u5730\u5757\u653E\u7F6E\u94B1\u5305\uFF0C\u5E76\u7ACB\u5373\u7ED3\u675F\u5F53\u524D\u56DE\u5408\u3002",
    disabledHint: "\u5F53\u524D\u65E0\u6CD5\u5728\u8FD9\u4E2A\u4F4D\u7F6E\u653E\u7F6E\u94B1\u5305\u3002",
    source: "character_skill",
    targetMode: "tile",
    tileTargeting: "board_any",
    conditions: [],
    defaultCharges: 1,
    defaultParams: {
      targetRange: 2
    },
    color: "#8d7a3d",
    rollable: false,
    debugGrantable: false,
    endsTurnOnUse: true
  },
  bombThrow: {
    label: "\u6295\u5F39",
    description: "\u9009\u62E9\u5468\u56F4\u516B\u7801\u5185\u7684\u4E00\u683C\uFF0C\u5E76\u6307\u5B9A\u4E00\u4E2A\u65B9\u5411\uFF0C\u8BA9\u5176\u4E2D\u6240\u6709\u73A9\u5BB6\u4F4D\u79FB 2 \u683C\u3002",
    disabledHint: "\u8BF7\u5148\u9009\u62E9\u4E00\u4E2A\u6709\u6548\u76EE\u6807\u683C\uFF0C\u5E76\u6307\u5B9A\u63A8\u52A8\u65B9\u5411\u3002",
    source: "turn",
    targetMode: "tile_direction",
    tileTargeting: "adjacent_ring",
    conditions: [],
    defaultCharges: 1,
    defaultParams: {
      targetRange: 1,
      pushDistance: 2
    },
    color: "#d86a42",
    rollable: false,
    debugGrantable: true,
    endsTurnOnUse: false
  },
  balance: {
    label: "\u5236\u8861",
    description: "\u5728\u538B\u7F29\u672C\u56DE\u5408\u79FB\u52A8\uFF0C\u6216\u628A\u672C\u56DE\u5408\u79FB\u52A8\u8F6C\u5B58\u5230\u4E0B\u56DE\u5408\u4E4B\u95F4\u4E8C\u9009\u4E00\u3002",
    disabledHint: "\u9700\u8981\u4FDD\u7559\u4E00\u4E2A\u6709\u5269\u4F59\u70B9\u6570\u7684<\u79FB\u52A8>\u65F6\u624D\u80FD\u4F7F\u7528\u3002",
    source: "turn",
    targetMode: "choice",
    choices: [
      {
        id: "trim_and_bank",
        label: "\u672C\u56DE\u5408 -1",
        description: "\u672C\u56DE\u5408\u79FB\u52A8\u70B9\u6570 -1\uFF0C\u4E0B\u56DE\u5408\u989D\u5916\u83B7\u5F97 1 \u70B9\u79FB\u52A8\u3002"
      },
      {
        id: "store_all",
        label: "\u8F6C\u5B58\u672C\u56DE\u5408",
        description: "\u672C\u56DE\u5408\u5931\u53BB\u5168\u90E8\u79FB\u52A8\uFF0C\u4E0B\u56DE\u5408\u989D\u5916\u83B7\u5F97\u672C\u56DE\u5408\u7684\u79FB\u52A8\u3002"
      }
    ],
    conditions: [{ kind: "tool_present", toolId: "movement" }],
    defaultCharges: 1,
    defaultParams: {},
    color: "#8c6bda",
    rollable: false,
    debugGrantable: true,
    endsTurnOnUse: false
  }
});

// src/tools.ts
function materializeToolDefinitions() {
  return Object.fromEntries(
    Object.entries(TOOL_REGISTRY).map(([toolId, definition]) => [
      toolId,
      {
        id: toolId,
        ...definition,
        choices: "choices" in definition ? definition.choices?.map((choice) => ({
          ...choice
        })) : void 0,
        conditions: definition.conditions.map((condition) => ({
          ...condition,
          toolId: condition.toolId
        }))
      }
    ])
  );
}
function materializeToolDieFaces() {
  return TOOL_DIE_FACES.map((face) => ({
    ...face,
    toolId: face.toolId
  }));
}
var TOOL_DEFINITIONS = materializeToolDefinitions();
var TOOL_DIE_FACES2 = materializeToolDieFaces();
function mergeToolParams(toolId, overrides) {
  return {
    ...TOOL_DEFINITIONS[toolId].defaultParams,
    ...overrides ?? {}
  };
}
function getToolDefinition(toolId) {
  return TOOL_DEFINITIONS[toolId];
}
function isDirectionalTool(toolId) {
  return TOOL_DEFINITIONS[toolId].targetMode === "direction";
}
function isTileTargetTool(toolId) {
  return TOOL_DEFINITIONS[toolId].targetMode === "tile";
}
function isChoiceTool(toolId) {
  return TOOL_DEFINITIONS[toolId].targetMode === "choice";
}
function isTileDirectionTool(toolId) {
  return TOOL_DEFINITIONS[toolId].targetMode === "tile_direction";
}
function isAimTool(toolId) {
  const targetMode = TOOL_DEFINITIONS[toolId].targetMode;
  return targetMode === "direction" || targetMode === "tile" || targetMode === "tile_direction";
}
function isCharacterSkillTool(tool) {
  return tool.source === "character_skill";
}
function createToolInstance(instanceId, toolId, overrides = {}) {
  const definition = TOOL_DEFINITIONS[toolId];
  return {
    instanceId,
    toolId,
    charges: overrides.charges ?? definition.defaultCharges,
    params: mergeToolParams(toolId, overrides.params),
    source: overrides.source ?? definition.source
  };
}
function createMovementToolInstance(instanceId, movePoints) {
  return createToolInstance(instanceId, "movement", {
    params: {
      movePoints
    }
  });
}
function createRolledToolInstance(instanceId, face) {
  return createToolInstance(instanceId, face.toolId, face);
}
function createDebugToolInstance(instanceId, toolId) {
  return createToolInstance(instanceId, toolId);
}
function findToolInstance(tools, instanceId) {
  return tools.find((tool) => tool.instanceId === instanceId);
}
function getToolParam(tool, paramId) {
  return tool.params[paramId] ?? TOOL_DEFINITIONS[tool.toolId].defaultParams[paramId] ?? 0;
}
function consumeToolInstance(tools, instanceId) {
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
function satisfiesCondition(condition, currentTool, tools) {
  switch (condition.kind) {
    case "tool_present": {
      const hasMatchingTool = tools.some(
        (candidate) => candidate.instanceId !== currentTool.instanceId && candidate.toolId === condition.toolId && (condition.toolId !== "movement" || getToolParam(candidate, "movePoints") > 0)
      );
      return hasMatchingTool ? { usable: true, reason: null } : {
        usable: false,
        reason: `\u9700\u8981\u4FDD\u7559\u4E00\u4E2A\u53EF\u7528\u7684${TOOL_DEFINITIONS[condition.toolId].label}`
      };
    }
  }
}
function getToolAvailability(tool, tools) {
  if (tool.charges < 1) {
    return {
      usable: false,
      reason: "\u6CA1\u6709\u5269\u4F59\u6B21\u6570"
    };
  }
  if (tool.toolId === "movement" && getToolParam(tool, "movePoints") < 1) {
    return {
      usable: false,
      reason: "\u6CA1\u6709\u5269\u4F59\u70B9\u6570"
    };
  }
  if (tool.toolId === "brake" && getToolParam(tool, "brakeRange") < 1) {
    return {
      usable: false,
      reason: "\u6CA1\u6709\u5269\u4F59\u8DDD\u79BB"
    };
  }
  if (tool.toolId === "bombThrow" && getToolParam(tool, "pushDistance") < 1) {
    return {
      usable: false,
      reason: "\u6CA1\u6709\u53EF\u7528\u7684\u6295\u5F39\u4F4D\u79FB\u8DDD\u79BB"
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
function getToolDisabledMessage(tool, tools) {
  const availability = getToolAvailability(tool, tools);
  if (availability.usable) {
    return null;
  }
  const configuredHint = TOOL_DEFINITIONS[tool.toolId].disabledHint;
  if (!configuredHint) {
    return availability.reason ?? `${TOOL_DEFINITIONS[tool.toolId].label}\u5F53\u524D\u4E0D\u53EF\u7528\u3002`;
  }
  if (!availability.reason) {
    return configuredHint;
  }
  return `${configuredHint} \u5F53\u524D\u9650\u5236\uFF1A${availability.reason}\u3002`;
}
function formatToolButtonValue(unit, value) {
  return unit === "point" ? `${value}` : `${value}`;
}
function formatToolParameterValue(unit, value) {
  if (unit === "point") {
    return `${value} \u70B9`;
  }
  if (unit === "tile") {
    return `${value} \u683C`;
  }
  return `${value} \u6B21`;
}
function describeToolButtonLabel(tool) {
  const definition = TOOL_DEFINITIONS[tool.toolId];
  const buttonValue = definition.buttonValue;
  if (buttonValue) {
    return `${definition.label} ${formatToolButtonValue(buttonValue.unit, getToolParam(tool, buttonValue.paramId))}`;
  }
  return tool.charges > 1 ? `${definition.label} x${tool.charges}` : definition.label;
}
function describeToolButtonValue(tool) {
  const definition = TOOL_DEFINITIONS[tool.toolId];
  const buttonValue = definition.buttonValue;
  if (!buttonValue) {
    return null;
  }
  const value = getToolParam(tool, buttonValue.paramId);
  return buttonValue.unit === "point" ? `${value} \u70B9` : `${value} \u683C`;
}
function describeToolParameters(tool) {
  return Object.keys(TOOL_DEFINITIONS[tool.toolId].defaultParams).map((paramId) => {
    const typedParamId = paramId;
    const descriptor = TOOL_PARAMETER_LABELS[typedParamId];
    const value = getToolParam(tool, typedParamId);
    return `${descriptor.label} ${formatToolParameterValue(descriptor.unit, value)}`;
  });
}
function getToolChoiceDefinitions(toolId) {
  return TOOL_DEFINITIONS[toolId].choices ?? [];
}
function getDebugGrantableToolIds() {
  return Object.values(TOOL_DEFINITIONS).filter((definition) => definition.debugGrantable).map((definition) => definition.id);
}
function getRollableToolIds() {
  return TOOL_DIE_FACES2.map((face) => face.toolId);
}

// src/content/defaultBoard.ts
var DEFAULT_BOARD_LAYOUT = [
  "#########",
  "#.>l#...#",
  "#.v.#...#",
  "#.pe#e..#",
  "#..^....#",
  "#..e....#",
  "#...##..#",
  "#....<..#",
  "#########"
];
var DEFAULT_BOARD_SYMBOLS = {
  ".": { type: "floor" },
  "#": { type: "wall" },
  e: { type: "earthWall", durability: 2 },
  p: { type: "pit" },
  l: { type: "lucky" },
  s: { type: "start" },
  g: { type: "goal" },
  "^": { type: "conveyor", direction: "up" },
  v: { type: "conveyor", direction: "down" },
  "<": { type: "conveyor", direction: "left" },
  ">": { type: "conveyor", direction: "right" }
};

// src/content/raceBoard.ts
var RACE_BOARD_LAYOUT = [
  "########################",
  "#s..v..............ee..#",
  "#....#.............###.#",
  "#..lp###.....#.l..##.g.#",
  "#e.#........#......###.#",
  "#..#.....###...........#",
  "#.ee...................#",
  "#....^................p#",
  "########################"
];
var RACE_BOARD_SYMBOLS = {};

// src/content/maps.ts
function defineGameMapRegistry(registry) {
  return registry;
}
var DEFAULT_GAME_MAP_ID = "free_default";
var RACE_GAME_MAP_ID = "race_sprint";
var GAME_MAP_REGISTRY = defineGameMapRegistry({
  [DEFAULT_GAME_MAP_ID]: {
    label: "\u81EA\u7531\u6A21\u5F0F\u9ED8\u8BA4\u5730\u56FE",
    description: "\u4FDD\u7559\u8C03\u8BD5\u5165\u53E3\u7684\u57FA\u7840\u6C99\u76D2\u5730\u56FE\uFF0C\u9002\u5408\u81EA\u7531\u8BD5\u9A8C\u5DE5\u5177\u3001\u89D2\u8272\u548C\u5730\u5F62\u8054\u52A8\u3002",
    mode: "free",
    allowDebugTools: true,
    layout: DEFAULT_BOARD_LAYOUT,
    symbols: DEFAULT_BOARD_SYMBOLS,
    spawnMode: "cycle",
    spawnPositions: [
      { x: 1, y: 1 },
      { x: 7, y: 7 },
      { x: 1, y: 7 },
      { x: 7, y: 1 }
    ]
  },
  [RACE_GAME_MAP_ID]: {
    label: "\u7ADE\u901F\u6A21\u5F0F\u6D4B\u8BD5\u5730\u56FE",
    description: "\u6240\u6709\u73A9\u5BB6\u5171\u4EAB\u51FA\u751F\u70B9\uFF0C\u6CBF\u7740\u52A0\u901F\u5E26\u4E0E\u673A\u5173\u51B2\u5411\u7EC8\u70B9\uFF0C\u5148\u5230\u5148\u5F97\u3002",
    mode: "race",
    allowDebugTools: false,
    layout: RACE_BOARD_LAYOUT,
    symbols: {
      ...DEFAULT_BOARD_SYMBOLS,
      ...RACE_BOARD_SYMBOLS
    },
    spawnMode: "shared",
    spawnPositions: [{ x: 1, y: 1 }]
  }
});
function getGameMapIds() {
  return Object.keys(GAME_MAP_REGISTRY);
}
function resolveGameMapId(mapId) {
  if (mapId && mapId in GAME_MAP_REGISTRY) {
    return mapId;
  }
  return DEFAULT_GAME_MAP_ID;
}
function getGameMapDefinition(mapId) {
  return GAME_MAP_REGISTRY[resolveGameMapId(mapId)];
}
function getGameMapSpawnPosition(mapId, playerIndex) {
  const definition = getGameMapDefinition(mapId);
  const spawnIndex = definition.spawnMode === "shared" ? 0 : playerIndex % Math.max(1, definition.spawnPositions.length);
  return definition.spawnPositions[spawnIndex] ?? definition.spawnPositions[0] ?? { x: 1, y: 1 };
}

// src/board.ts
function toTileKey(position) {
  return `${position.x},${position.y}`;
}
function buildBoardFromLayout(layout, symbols) {
  if (!layout.length) {
    throw new Error("Board layout must include at least one row.");
  }
  const width = layout[0]?.length ?? 0;
  if (!width || layout.some((row) => row.length !== width)) {
    throw new Error("Board layout rows must all exist and share the same width.");
  }
  const tiles = [];
  for (let y = 0; y < layout.length; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const symbol = layout[y]?.[x] ?? ".";
      const tileConfig = symbols[symbol] ?? symbols["."];
      tiles.push({
        key: toTileKey({ x, y }),
        x,
        y,
        type: tileConfig.type,
        durability: tileConfig.durability ?? 0,
        direction: tileConfig.direction ?? null
      });
    }
  }
  return {
    width,
    height: layout.length,
    tiles
  };
}
function createBoardDefinition(mapId = DEFAULT_GAME_MAP_ID) {
  const definition = getGameMapDefinition(mapId);
  return buildBoardFromLayout(
    definition.layout,
    definition.symbols
  );
}
function createDefaultBoardDefinition() {
  return createBoardDefinition(DEFAULT_GAME_MAP_ID);
}
function getTile(board, position) {
  return board.tiles.find((tile) => tile.x === position.x && tile.y === position.y);
}
function getTilesByType(board, type) {
  return board.tiles.filter((tile) => tile.type === type);
}
function isWithinBoard(board, position) {
  return position.x >= 0 && position.x < board.width && position.y >= 0 && position.y < board.height;
}

// src/rules/actionPresentation.ts
var GROUND_MOTION_MS_PER_STEP = 150;
var ARC_MOTION_MS_PER_STEP = 210;
var FINISH_MOTION_MS_PER_STEP = 820;
var PROJECTILE_MOTION_MS_PER_STEP = 110;
var ROCKET_EXPLOSION_EFFECT_MS = 420;
var ROCKET_BLAST_DELAY_MS = 40;
function createPresentation(actorId, toolId, events) {
  if (!events.length) {
    return null;
  }
  return {
    actorId,
    toolId,
    events,
    durationMs: Math.max(...events.map((event) => event.startMs + event.durationMs))
  };
}
function createPlayerMotionEvent(eventId, playerId, positions, motionStyle, startMs = 0) {
  if (positions.length < 2) {
    return null;
  }
  const stepCount = Math.max(1, positions.length - 1);
  return {
    id: eventId,
    kind: "player_motion",
    playerId,
    motionStyle,
    positions,
    startMs,
    durationMs: stepCount * (motionStyle === "arc" ? ARC_MOTION_MS_PER_STEP : motionStyle === "finish" ? FINISH_MOTION_MS_PER_STEP : GROUND_MOTION_MS_PER_STEP)
  };
}
function createProjectileEvent(eventId, ownerId, projectileType, positions, startMs = 0) {
  if (positions.length < 2) {
    return null;
  }
  return {
    id: eventId,
    kind: "projectile",
    ownerId,
    projectileType,
    positions,
    startMs,
    durationMs: Math.max(1, positions.length - 1) * PROJECTILE_MOTION_MS_PER_STEP
  };
}
function createEffectEvent(eventId, effectType, position, tiles, startMs = 0, durationMs = ROCKET_EXPLOSION_EFFECT_MS) {
  return {
    id: eventId,
    kind: "effect",
    effectType,
    position,
    tiles,
    startMs,
    durationMs
  };
}
function createStateTransitionEvent(eventId, tileTransitions, summonTransitions, playerTransitions = [], startMs = 0) {
  if (!tileTransitions.length && !summonTransitions.length && !playerTransitions.length) {
    return null;
  }
  return {
    id: eventId,
    kind: "state_transition",
    playerTransitions,
    tileTransitions,
    summonTransitions,
    startMs,
    durationMs: 0
  };
}
function appendPresentationEvents(presentation, actorId, toolId, events) {
  if (!presentation && !events.length) {
    return null;
  }
  const nextEvents = [...presentation?.events ?? [], ...events];
  if (!nextEvents.length) {
    return null;
  }
  return {
    actorId: presentation?.actorId ?? actorId,
    toolId: presentation?.toolId ?? toolId,
    events: nextEvents,
    durationMs: Math.max(...nextEvents.map((event) => event.startMs + event.durationMs))
  };
}
function getMotionStepDurationMs(motionStyle) {
  if (motionStyle === "arc") {
    return ARC_MOTION_MS_PER_STEP;
  }
  if (motionStyle === "finish") {
    return FINISH_MOTION_MS_PER_STEP;
  }
  return GROUND_MOTION_MS_PER_STEP;
}
function getMotionArrivalStartMs(positions, motionStyle, targetPosition, startMs = 0) {
  const stepIndex = positions.findIndex(
    (position, index) => index > 0 && position.x === targetPosition.x && position.y === targetPosition.y
  );
  if (stepIndex <= 0) {
    return null;
  }
  return startMs + stepIndex * getMotionStepDurationMs(motionStyle);
}
function buildMotionPositions(startPosition, path) {
  return path.length ? [startPosition, ...path] : [startPosition];
}

// src/rules/actionResolution.ts
function buildBlockedResolution(actor, tools, reason, nextToolDieSeed, path = [], triggeredTerrainEffects = [], previewTiles = []) {
  return {
    kind: "blocked",
    actorMovement: null,
    reason,
    path,
    previewTiles,
    actor: {
      characterState: actor.characterState,
      position: actor.position,
      turnFlags: actor.turnFlags
    },
    tools,
    affectedPlayers: [],
    tileMutations: [],
    summonMutations: [],
    triggeredTerrainEffects,
    triggeredSummonEffects: [],
    presentation: null,
    endsTurn: false,
    nextToolDieSeed
  };
}
function buildAppliedResolution(nextActor, tools, summary, nextToolDieSeed, path, tileMutations = [], affectedPlayers = [], triggeredTerrainEffects = [], previewTiles = [], presentation = null, summonMutations = [], triggeredSummonEffects = [], endsTurn = false, actorMovement = null) {
  return {
    kind: "applied",
    actorMovement,
    summary,
    path,
    previewTiles,
    actor: {
      characterState: nextActor.characterState,
      position: nextActor.position,
      turnFlags: nextActor.turnFlags
    },
    tools,
    affectedPlayers,
    tileMutations,
    summonMutations,
    triggeredTerrainEffects,
    triggeredSummonEffects,
    presentation,
    endsTurn,
    nextToolDieSeed
  };
}
function toTilePresentationState(tile) {
  return {
    type: tile.type,
    durability: tile.durability,
    direction: tile.direction
  };
}
function toSummonPresentationState(summon) {
  return {
    instanceId: summon.instanceId,
    summonId: summon.summonId,
    ownerId: summon.ownerId,
    position: summon.position
  };
}
function getTileTransitionDirection(previousTile, nextType) {
  return nextType === previousTile.type ? previousTile.direction : null;
}
function buildTileStateTransition(context, mutation) {
  const previousTile = getTile(context.board, mutation.position);
  if (!previousTile) {
    return null;
  }
  return {
    key: mutation.key,
    position: mutation.position,
    before: toTilePresentationState(previousTile),
    after: {
      type: mutation.nextType,
      durability: mutation.nextDurability,
      direction: getTileTransitionDirection(previousTile, mutation.nextType)
    }
  };
}
function buildSummonStateTransition(context, mutation) {
  const previousSummon = context.summons.find((summon) => summon.instanceId === mutation.instanceId) ?? null;
  if (mutation.kind === "upsert") {
    return {
      instanceId: mutation.instanceId,
      before: previousSummon ? toSummonPresentationState(previousSummon) : null,
      after: {
        instanceId: mutation.instanceId,
        summonId: mutation.summonId,
        ownerId: mutation.ownerId,
        position: mutation.position
      }
    };
  }
  if (!previousSummon) {
    return null;
  }
  return {
    instanceId: mutation.instanceId,
    before: toSummonPresentationState(previousSummon),
    after: null
  };
}
function findStateTransitionStartMs(presentation, position) {
  if (!presentation) {
    return 0;
  }
  const arrivalTimes = presentation.events.flatMap((event) => {
    if (event.kind !== "player_motion") {
      return [];
    }
    const arrivalMs = getMotionArrivalStartMs(
      event.positions,
      event.motionStyle,
      position,
      event.startMs
    );
    return arrivalMs === null ? [] : [arrivalMs];
  });
  return arrivalTimes.length ? Math.min(...arrivalTimes) : 0;
}
function attachStateTransitionPresentation(context, resolution) {
  if (resolution.kind === "blocked" || !resolution.tileMutations.length && !resolution.summonMutations.length) {
    return resolution;
  }
  const transitionEvents = [
    ...resolution.tileMutations.flatMap((mutation, index) => {
      const transition = buildTileStateTransition(context, mutation);
      if (!transition) {
        return [];
      }
      const event = createStateTransitionEvent(
        `${context.activeTool.instanceId}:tile-transition-${index}`,
        [transition],
        [],
        [],
        findStateTransitionStartMs(resolution.presentation, mutation.position)
      );
      return event ? [event] : [];
    }),
    ...resolution.summonMutations.flatMap((mutation, index) => {
      const transition = buildSummonStateTransition(context, mutation);
      const anchorPosition = transition?.before?.position ?? transition?.after?.position;
      if (!transition || !anchorPosition) {
        return [];
      }
      const event = createStateTransitionEvent(
        `${context.activeTool.instanceId}:summon-transition-${index}`,
        [],
        [transition],
        [],
        findStateTransitionStartMs(resolution.presentation, anchorPosition)
      );
      return event ? [event] : [];
    })
  ];
  if (!transitionEvents.length) {
    return resolution;
  }
  return {
    ...resolution,
    presentation: appendPresentationEvents(
      resolution.presentation,
      context.actor.id,
      context.activeTool.toolId,
      transitionEvents
    )
  };
}
function buildSummonInstanceId(activeTool, summonId) {
  return `${activeTool.instanceId}:${summonId}`;
}
function consumeActiveTool(context) {
  return consumeToolInstance(context.tools, context.activeTool.instanceId);
}
function requireDirection(context) {
  return context.direction ?? null;
}

// src/content/summons.ts
function defineSummonRegistry(registry) {
  return registry;
}
var SUMMON_REGISTRY = defineSummonRegistry({
  wallet: {
    label: "\u94B1\u5305",
    description: "\u9886\u5BFC\u7ECF\u8FC7\u81EA\u5DF1\u653E\u7F6E\u7684\u94B1\u5305\u65F6\u4F1A\u62FE\u53D6\u5E76\u83B7\u5F97\u4E00\u4E2A\u989D\u5916\u5DE5\u5177\u9AB0\u7ED3\u679C\u3002",
    triggerMode: "movement_trigger"
  }
});

// src/constants.ts
var WATCHER_ROOM_NAME = "watcher_room";
var BOARD_WIDTH = 9;
var BOARD_HEIGHT = 9;
var DEFAULT_MOVE_POINTS = 0;
var DEFAULT_MOVEMENT_ACTIONS = 0;
var BASE_MOVEMENT_ACTIONS_PER_TURN = 1;
var MOVEMENT_DIE_FACES = [1, 2, 3, 4, 5, 6];
var PLAYER_COLORS = ["#ec6f5a", "#3d8f85", "#f3c969", "#5d7cf2"];
var PLAYER_SPAWNS = [
  { x: 1, y: 1 },
  { x: BOARD_WIDTH - 2, y: BOARD_HEIGHT - 2 },
  { x: 1, y: BOARD_HEIGHT - 2 },
  { x: BOARD_WIDTH - 2, y: 1 }
];

// src/dice.ts
function nextDeterministicSeed(seed) {
  return seed * 1664525 + 1013904223 >>> 0;
}
function rollFromFaces(faces, seed) {
  const nextSeed = nextDeterministicSeed(seed);
  const faceIndex = nextSeed % faces.length;
  return {
    value: faces[faceIndex],
    nextSeed
  };
}
function rollMovementDie(seed) {
  return rollFromFaces(MOVEMENT_DIE_FACES, seed);
}
function rollToolDie(seed) {
  return rollFromFaces(TOOL_DIE_FACES2, seed);
}

// src/rules/displacement.ts
function createMovementDescriptor(type, disposition, options = {}) {
  return {
    type,
    disposition,
    timing: options.timing ?? (disposition === "active" ? "in_turn" : "out_of_turn"),
    tags: [...options.tags ?? []]
  };
}
function materializeMovementDescriptor(definition, options = {}) {
  return createMovementDescriptor(definition.type, definition.disposition, options);
}
function createResolvedPlayerMovement(playerId, startPosition, path, movement) {
  const target = path[path.length - 1];
  if (!target) {
    return null;
  }
  return {
    playerId,
    startPosition,
    path,
    target,
    movement
  };
}
function isMovementType(movement, type) {
  return movement?.type === type;
}
function isMovementDisposition(movement, disposition) {
  return movement?.disposition === disposition;
}

// src/summons.ts
function positionsEqual(left, right) {
  return left.x === right.x && left.y === right.y;
}
function buildWalletRewardToolInstanceId(instanceId, sourceId, grantedToolId) {
  return `${instanceId}:${sourceId}:pickup:${grantedToolId}`;
}
function canWalletTrigger(context, allowedMovementTypes) {
  return context.summon.ownerId === context.player.id && context.player.characterId === "leader" && !!context.movement && isMovementDisposition(context.movement, "active") && allowedMovementTypes.some((movementType) => isMovementType(context.movement, movementType));
}
function grantWalletReward(context) {
  const toolRoll = rollToolDie(context.toolDieSeed);
  const grantedTool = createRolledToolInstance(
    buildWalletRewardToolInstanceId(
      context.summon.instanceId,
      context.sourceId,
      toolRoll.value.toolId
    ),
    toolRoll.value
  );
  return {
    consumeSummon: true,
    nextToolDieSeed: toolRoll.nextSeed,
    nextTools: [...context.tools, grantedTool],
    triggeredSummonEffects: [
      {
        kind: "wallet_pickup",
        movement: context.movement,
        ownerId: context.summon.ownerId,
        playerId: context.player.id,
        position: context.summon.position,
        summonId: context.summon.summonId,
        summonInstanceId: context.summon.instanceId,
        grantedTool
      }
    ]
  };
}
var SUMMON_DEFINITIONS = {
  wallet: {
    id: "wallet",
    ...SUMMON_REGISTRY.wallet,
    onPassThrough: (context) => {
      if (!canWalletTrigger(context, ["translate", "drag"])) {
        return null;
      }
      return grantWalletReward(context);
    },
    onStop: (context) => {
      if (!canWalletTrigger(context, ["leap"])) {
        return null;
      }
      return grantWalletReward(context);
    }
  }
};
function getSummonDefinition(summonId) {
  return SUMMON_DEFINITIONS[summonId];
}
function collectSummonsAtPosition(summons, position, remainingSummonIds) {
  return summons.filter(
    (summon) => remainingSummonIds.has(summon.instanceId) && positionsEqual(summon.position, position)
  );
}
function applySummonTriggerResult(result, summon, remainingSummonIds, resolution) {
  if (result.nextCharacterState) {
    resolution.nextCharacterState = {
      ...result.nextCharacterState
    };
  }
  if (result.nextDirection) {
    resolution.nextDirection = result.nextDirection;
  }
  if (typeof result.nextRemainingMovePoints === "number") {
    resolution.nextRemainingMovePoints = result.nextRemainingMovePoints;
  }
  if (typeof result.nextToolDieSeed === "number") {
    resolution.nextToolDieSeed = result.nextToolDieSeed;
  }
  if (result.nextTools) {
    resolution.nextTools = result.nextTools;
  }
  if (result.nextTurnFlags) {
    resolution.nextTurnFlags = [...result.nextTurnFlags];
  }
  if (result.consumeSummon && remainingSummonIds.has(summon.instanceId)) {
    remainingSummonIds.delete(summon.instanceId);
    resolution.summonMutations.push({
      instanceId: summon.instanceId,
      kind: "remove"
    });
  }
  resolution.triggeredSummonEffects.push(...result.triggeredSummonEffects);
}
function runSummonPhase(phase, context) {
  const resolution = {
    summonMutations: [],
    triggeredSummonEffects: []
  };
  const remainingSummonIds = new Set(context.summons.map((summon) => summon.instanceId));
  const summonsAtPosition = collectSummonsAtPosition(
    context.summons,
    context.position,
    remainingSummonIds
  );
  for (const summon of summonsAtPosition) {
    const summonDefinition = getSummonDefinition(summon.summonId);
    const trigger = summonDefinition[phase];
    if (!trigger) {
      continue;
    }
    const result = trigger({
      ...context.direction ? { direction: context.direction } : {},
      movement: context.movement,
      player: {
        characterId: context.player.characterId,
        characterState: context.player.characterState,
        id: context.player.id,
        position: context.position,
        spawnPosition: context.player.spawnPosition,
        turnFlags: [...context.player.turnFlags]
      },
      position: context.position,
      ...typeof context.remainingMovePoints === "number" ? { remainingMovePoints: context.remainingMovePoints } : {},
      sourceId: context.sourceId,
      summon,
      toolDieSeed: resolution.nextToolDieSeed ?? context.toolDieSeed,
      tools: resolution.nextTools ?? context.tools
    });
    if (!result) {
      continue;
    }
    applySummonTriggerResult(result, summon, remainingSummonIds, resolution);
  }
  return resolution;
}
function hasSummonAtPosition(summons, position) {
  return summons.some((summon) => positionsEqual(summon.position, position));
}
function createSummonUpsertMutation(instanceId, summonId, ownerId, position) {
  return {
    instanceId,
    kind: "upsert",
    ownerId,
    position,
    summonId
  };
}
function resolvePassThroughSummonEffects(context) {
  return runSummonPhase("onPassThrough", context);
}
function resolveStopSummonEffects(context) {
  return runSummonPhase("onStop", context);
}

// src/rules/spatial.ts
var DIRECTION_VECTORS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 }
};
var CARDINAL_DIRECTIONS = ["up", "right", "down", "left"];
function toPositionKey(position) {
  return `${position.x},${position.y}`;
}
function getDirectionVector(direction) {
  return DIRECTION_VECTORS[direction];
}
function getOppositeDirection(direction) {
  switch (direction) {
    case "up":
      return "down";
    case "down":
      return "up";
    case "left":
      return "right";
    case "right":
      return "left";
  }
}
function stepPosition(position, direction, amount = 1) {
  const vector = getDirectionVector(direction);
  return {
    x: position.x + vector.x * amount,
    y: position.y + vector.y * amount
  };
}
function isSolidTileType(tileType) {
  return tileType === "wall" || tileType === "earthWall";
}
function dedupePositions(positions) {
  const seen = /* @__PURE__ */ new Set();
  return positions.filter((position) => {
    const key = toPositionKey(position);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
function findPlayersAtPosition(players, position, ignoredPlayerIds = []) {
  return players.filter(
    (player) => !ignoredPlayerIds.includes(player.id) && player.position.x === position.x && player.position.y === position.y
  );
}
function getTileAfterMutations(board, tileMutations, position) {
  const tile = getTile(board, position);
  if (!tile) {
    return null;
  }
  const matchingMutation = tileMutations.find((entry) => entry.key === tile.key);
  if (!matchingMutation) {
    return tile;
  }
  return {
    ...tile,
    type: matchingMutation.nextType,
    durability: matchingMutation.nextDurability
  };
}
function isLandablePosition(board, position, tileMutations = []) {
  if (!isWithinBoard(board, position)) {
    return false;
  }
  const tile = getTileAfterMutations(board, tileMutations, position);
  return !!tile && !isSolidTileType(tile.type);
}
function createTileMutation(position, nextType, nextDurability) {
  return {
    key: toTileKey(position),
    position,
    nextType,
    nextDurability
  };
}
function normalizeAxisTarget(from, target) {
  if (!target) {
    return null;
  }
  const deltaX = target.x - from.x;
  const deltaY = target.y - from.y;
  if (!deltaX && !deltaY) {
    return null;
  }
  if (Math.abs(deltaX) >= Math.abs(deltaY) && deltaX !== 0) {
    const direction = deltaX > 0 ? "right" : "left";
    const distance = Math.abs(deltaX);
    return {
      direction,
      distance,
      snappedTarget: stepPosition(from, direction, distance)
    };
  }
  if (deltaY !== 0) {
    const direction = deltaY > 0 ? "down" : "up";
    const distance = Math.abs(deltaY);
    return {
      direction,
      distance,
      snappedTarget: stepPosition(from, direction, distance)
    };
  }
  return null;
}
function resolveLeapLanding(board, startPosition, direction, maxDistance, tileMutations = []) {
  for (let distance = maxDistance; distance >= 1; distance -= 1) {
    const landing = stepPosition(startPosition, direction, distance);
    if (isLandablePosition(board, landing, tileMutations)) {
      return {
        landing,
        path: Array.from(
          { length: distance },
          (_, index) => stepPosition(startPosition, direction, index + 1)
        )
      };
    }
  }
  return {
    landing: null,
    path: Array.from(
      { length: Math.max(0, maxDistance) },
      (_, index) => stepPosition(startPosition, direction, index + 1)
    )
  };
}
function traceProjectile(context, direction, maxDistance, maxBounces) {
  let currentDirection = direction;
  let currentPosition = context.actor.position;
  let remainingBounces = maxBounces;
  const path = [];
  for (let step = 0; step < maxDistance; step += 1) {
    const target = stepPosition(currentPosition, currentDirection);
    if (!isWithinBoard(context.board, target)) {
      return {
        path,
        collision: {
          kind: "edge",
          endPosition: currentPosition,
          direction: currentDirection
        }
      };
    }
    const tile = getTile(context.board, target);
    if (tile && isSolidTileType(tile.type)) {
      if (remainingBounces > 0) {
        remainingBounces -= 1;
        currentDirection = getOppositeDirection(currentDirection);
        currentPosition = target;
        continue;
      }
      return {
        path,
        collision: {
          kind: "solid",
          position: target,
          previousPosition: currentPosition,
          direction: currentDirection,
          tile
        }
      };
    }
    currentPosition = target;
    path.push(target);
    const hitPlayers = findPlayersAtPosition(context.players, target, []);
    if (hitPlayers.length) {
      return {
        path,
        collision: {
          kind: "player",
          position: target,
          previousPosition: path[path.length - 2] ?? context.actor.position,
          direction: currentDirection,
          players: hitPlayers
        }
      };
    }
  }
  return {
    path,
    collision: {
      kind: "none",
      endPosition: currentPosition,
      direction: currentDirection
    }
  };
}
function collectExplosionPreviewTiles(board, center) {
  return dedupePositions([
    center,
    ...CARDINAL_DIRECTIONS.map((direction) => stepPosition(center, direction))
  ]).filter((position) => isWithinBoard(board, position));
}

// src/rules/executors/boardTools.ts
function resolveBuildWallTool(context) {
  const targetPosition = context.targetPosition;
  const wallDurability = getToolParam(context.activeTool, "wallDurability");
  if (!targetPosition) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Build Wall needs a target tile",
      context.toolDieSeed
    );
  }
  const deltaX = Math.abs(targetPosition.x - context.actor.position.x);
  const deltaY = Math.abs(targetPosition.y - context.actor.position.y);
  if (deltaX === 0 && deltaY === 0 || deltaX > 1 || deltaY > 1) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Build Wall must target one of the surrounding tiles",
      context.toolDieSeed,
      [],
      [],
      [targetPosition]
    );
  }
  const tile = getTile(context.board, targetPosition);
  if (!tile || tile.type !== "floor") {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Build Wall needs an empty floor tile",
      context.toolDieSeed,
      [],
      [],
      [targetPosition]
    );
  }
  return buildAppliedResolution(
    context.actor,
    consumeActiveTool(context),
    `Used ${getToolDefinition(context.activeTool.toolId).label}.`,
    context.toolDieSeed,
    [],
    [createTileMutation(targetPosition, "earthWall", wallDurability)],
    [],
    [],
    [targetPosition]
  );
}
function resolveDeployWalletTool(context) {
  const targetPosition = context.targetPosition;
  const targetRange = getToolParam(context.activeTool, "targetRange");
  if (!targetPosition) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Deploy Wallet needs a target tile",
      context.toolDieSeed
    );
  }
  if (Math.abs(targetPosition.x - context.actor.position.x) > targetRange || Math.abs(targetPosition.y - context.actor.position.y) > targetRange) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Target tile is outside the deployment range",
      context.toolDieSeed,
      [],
      [],
      [targetPosition]
    );
  }
  if (!isLandablePosition(context.board, targetPosition)) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Deploy Wallet needs a landable tile",
      context.toolDieSeed,
      [],
      [],
      [targetPosition]
    );
  }
  if (hasSummonAtPosition(context.summons, targetPosition)) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Target tile already contains a summon",
      context.toolDieSeed,
      [],
      [],
      [targetPosition]
    );
  }
  return buildAppliedResolution(
    context.actor,
    consumeActiveTool(context),
    `Used ${getToolDefinition(context.activeTool.toolId).label}.`,
    context.toolDieSeed,
    [],
    [],
    [],
    [],
    [targetPosition],
    null,
    [
      createSummonUpsertMutation(
        buildSummonInstanceId(context.activeTool, "wallet"),
        "wallet",
        context.actor.id,
        targetPosition
      )
    ],
    [],
    true
  );
}

// src/content/characters.ts
function defineCharacterRegistry(registry) {
  return registry;
}
var CHARACTER_REGISTRY = defineCharacterRegistry({
  late: {
    label: "\u7F57\u7D20\u7684\u5173\u95E8\u5F1F\u5B50",
    summary: "\u4F60\u7684\u6240\u6709<\u79FB\u52A8>\u53D8\u4E3A<\u5236\u52A8>\u3002",
    turnStartGrants: [],
    turnStartActionIds: [],
    activeSkillLoadout: [],
    toolTransforms: [
      {
        fromToolId: "movement",
        toToolId: "brake",
        paramMappings: [
          {
            fromParamId: "movePoints",
            toParamId: "brakeRange"
          }
        ]
      }
    ]
  },
  ehh: {
    label: "\u9E45\u54C8\u54C8",
    summary: "\u6BCF\u56DE\u5408\u989D\u5916\u83B7\u5F97\u4E00\u9897<\u7BEE\u7403>\u3002",
    turnStartGrants: [{ toolId: "basketball" }],
    turnStartActionIds: [],
    activeSkillLoadout: [],
    toolTransforms: []
  },
  leader: {
    label: "\u9886\u5BFC",
    summary: "\u53EF\u4EE5\u90E8\u7F72\u94B1\u5305\uFF0C\u81EA\u5DF1\u7ECF\u8FC7\u65F6\u62FE\u53D6\u5E76\u83B7\u5F97\u4E00\u4E2A\u5DE5\u5177\u9AB0\u3002",
    turnStartGrants: [],
    turnStartActionIds: [],
    activeSkillLoadout: [{ toolId: "deployWallet" }],
    toolTransforms: []
  },
  blaze: {
    label: "\u5E03\u62C9\u6CFD",
    summary: "\u56DE\u5408\u5F00\u59CB\u65F6\u53EF\u4EE5\u8FDB\u5165\u6295\u5F39\u51C6\u5907\uFF0C\u5E76\u5728\u4E0B\u4E2A\u56DE\u5408\u83B7\u5F97<\u6295\u5F39>\u3002",
    turnStartGrants: [],
    turnStartActionIds: ["blazePrepareBomb"],
    activeSkillLoadout: [],
    toolTransforms: []
  },
  volaty: {
    label: "\u8299\u5170\u8FEA",
    summary: "\u56DE\u5408\u5F00\u59CB\u65F6\u53EF\u4EE5\u653E\u5F03\u5DE5\u5177\u9AB0\uFF0C\u5E76\u8BA9\u672C\u56DE\u5408\u7684\u79FB\u52A8\u53D8\u4E3A\u98DE\u8DC3\u3002",
    turnStartGrants: [],
    turnStartActionIds: ["volatySkipToolDie"],
    activeSkillLoadout: [],
    toolTransforms: []
  },
  chain: {
    label: "\u5E38",
    summary: "\u82E5\u4F60\u5728\u56DE\u5408\u5916\u672A\u53D1\u751F\u79FB\u52A8\uFF0C\u672C\u56DE\u5408\u83B7\u5F97\u4E00\u4E2A\u957F\u5EA6\u4E3A 2 \u7684\u5C0F\u94A9\u9501\u3002",
    turnStartGrants: [],
    turnStartActionIds: [],
    activeSkillLoadout: [],
    toolTransforms: []
  },
  farther: {
    label: "\u6CD5\u771F",
    summary: "\u6BCF\u56DE\u5408\u83B7\u5F97\u4E00\u4E2A<\u5236\u8861>\uFF0C\u5E76\u80FD\u628A\u672C\u56DE\u5408\u7684\u79FB\u52A8\u8F6C\u5B58\u5230\u4E0B\u56DE\u5408\u3002",
    turnStartGrants: [],
    turnStartActionIds: [],
    activeSkillLoadout: [],
    toolTransforms: []
  }
});

// src/characters.ts
function materializeCharacterDefinitions() {
  return Object.fromEntries(
    Object.entries(CHARACTER_REGISTRY).map(([characterId, definition]) => [
      characterId,
      {
        id: characterId,
        ...definition,
        activeSkillLoadout: definition.activeSkillLoadout.map((loadout) => ({
          ...loadout,
          toolId: loadout.toolId
        })),
        turnStartActionIds: definition.turnStartActionIds.map(
          (actionId) => actionId
        ),
        turnStartGrants: definition.turnStartGrants.map((loadout) => ({
          ...loadout,
          toolId: loadout.toolId
        })),
        toolTransforms: definition.toolTransforms.map((transform) => ({
          ...transform,
          fromToolId: transform.fromToolId,
          toToolId: transform.toToolId
        }))
      }
    ])
  );
}
var CHARACTER_DEFINITIONS = materializeCharacterDefinitions();
function transformTool(tool, transform) {
  const nextParams = {
    ...TOOL_DEFINITIONS[transform.toToolId].defaultParams
  };
  for (const mapping of transform.paramMappings) {
    const value = tool.params[mapping.fromParamId];
    if (typeof value === "number") {
      nextParams[mapping.toParamId] = value;
    }
  }
  return {
    ...tool,
    toolId: transform.toToolId,
    params: nextParams
  };
}
function getCharacterDefinition(characterId) {
  return CHARACTER_DEFINITIONS[characterId];
}
function getCharacterIds() {
  return Object.keys(CHARACTER_DEFINITIONS);
}
function getNextCharacterId(characterId) {
  const characterIds = getCharacterIds();
  const currentIndex = characterIds.indexOf(characterId);
  if (currentIndex < 0) {
    return characterIds[0] ?? "late";
  }
  return characterIds[(currentIndex + 1) % characterIds.length] ?? characterId;
}
function buildCharacterTurnLoadout(characterId) {
  const definition = getCharacterDefinition(characterId);
  return [...definition.turnStartGrants, ...definition.activeSkillLoadout];
}
function getCharacterActiveSkillToolIds(characterId) {
  return getCharacterDefinition(characterId).activeSkillLoadout.map((entry) => entry.toolId);
}
function getCharacterTurnStartActionIds(characterId) {
  return getCharacterDefinition(characterId).turnStartActionIds;
}
function applyCharacterToolTransforms(characterId, tools) {
  const transforms = getCharacterDefinition(characterId).toolTransforms;
  if (!transforms.length) {
    return tools;
  }
  return tools.map((tool) => {
    const matchingTransform = transforms.find((transform) => transform.fromToolId === tool.toolId);
    return matchingTransform ? transformTool(tool, matchingTransform) : tool;
  });
}

// src/characterRuntime.ts
var BLAZE_BOMB_PREPARED_STATE_KEY = "blazeBombPrepared";
var VOLATY_LEAP_TURN_STATE_KEY = "volatyLeapTurn";
var CHAIN_MOVED_OUT_OF_TURN_STATE_KEY = "chainMovedOutOfTurn";
var CHAIN_HOOK_READY_STATE_KEY = "chainHookReady";
var FARTHER_PENDING_MOVE_BONUS_STATE_KEY = "fartherPendingMoveBonus";
function normalizeCharacterState(characterState) {
  return Object.fromEntries(
    Object.entries(characterState).filter(([, value]) => value !== void 0)
  );
}
function cloneCharacterState(characterState) {
  return {
    ...characterState
  };
}
function getCharacterStateBoolean(characterState, key) {
  return characterState[key] === true;
}
function getCharacterStateNumber(characterState, key) {
  const value = characterState[key];
  return typeof value === "number" ? value : 0;
}
function setCharacterStateValue(characterState, key, value) {
  const nextCharacterState = {
    ...characterState
  };
  if (value === void 0) {
    delete nextCharacterState[key];
  } else {
    nextCharacterState[key] = value;
  }
  return normalizeCharacterState(nextCharacterState);
}
function prepareCharacterTurnStart(characterId, characterState) {
  let nextCharacterState = normalizeCharacterState({
    ...characterState
  });
  if (characterId === "chain") {
    nextCharacterState = setCharacterStateValue(
      nextCharacterState,
      CHAIN_HOOK_READY_STATE_KEY,
      !getCharacterStateBoolean(nextCharacterState, CHAIN_MOVED_OUT_OF_TURN_STATE_KEY)
    );
    nextCharacterState = setCharacterStateValue(
      nextCharacterState,
      CHAIN_MOVED_OUT_OF_TURN_STATE_KEY,
      false
    );
  }
  nextCharacterState = setCharacterStateValue(
    nextCharacterState,
    VOLATY_LEAP_TURN_STATE_KEY,
    void 0
  );
  return {
    nextCharacterState,
    turnStartActions: [...getCharacterTurnStartActionIds(characterId)]
  };
}
function buildCharacterTurnLoadoutRuntime(characterId, characterState) {
  const baseLoadout = [...buildCharacterTurnLoadout(characterId)];
  let nextCharacterState = normalizeCharacterState({
    ...characterState
  });
  if (characterId === "blaze" && getCharacterStateBoolean(nextCharacterState, BLAZE_BOMB_PREPARED_STATE_KEY)) {
    baseLoadout.push({
      toolId: "bombThrow"
    });
    nextCharacterState = setCharacterStateValue(
      nextCharacterState,
      BLAZE_BOMB_PREPARED_STATE_KEY,
      void 0
    );
  }
  if (characterId === "chain" && getCharacterStateBoolean(nextCharacterState, CHAIN_HOOK_READY_STATE_KEY)) {
    baseLoadout.push({
      toolId: "hookshot",
      params: {
        hookLength: 2
      }
    });
    nextCharacterState = setCharacterStateValue(
      nextCharacterState,
      CHAIN_HOOK_READY_STATE_KEY,
      void 0
    );
  }
  if (characterId === "farther") {
    baseLoadout.push({
      toolId: "balance"
    });
    const pendingBonus = getCharacterStateNumber(
      nextCharacterState,
      FARTHER_PENDING_MOVE_BONUS_STATE_KEY
    );
    if (pendingBonus > 0) {
      baseLoadout.push({
        toolId: "movement",
        params: {
          movePoints: pendingBonus
        }
      });
      nextCharacterState = setCharacterStateValue(
        nextCharacterState,
        FARTHER_PENDING_MOVE_BONUS_STATE_KEY,
        void 0
      );
    }
  }
  return {
    loadout: baseLoadout,
    nextCharacterState
  };
}
function resolveCharacterTurnStartAction(characterId, characterState, actionId) {
  let nextCharacterState = normalizeCharacterState({
    ...characterState
  });
  if (characterId === "blaze" && actionId === "blazePrepareBomb") {
    nextCharacterState = setCharacterStateValue(
      nextCharacterState,
      BLAZE_BOMB_PREPARED_STATE_KEY,
      true
    );
    return {
      endTurn: true,
      nextCharacterState,
      skipToolDie: false
    };
  }
  if (characterId === "volaty" && actionId === "volatySkipToolDie") {
    nextCharacterState = setCharacterStateValue(
      nextCharacterState,
      VOLATY_LEAP_TURN_STATE_KEY,
      true
    );
    return {
      endTurn: false,
      nextCharacterState,
      skipToolDie: true
    };
  }
  return null;
}
function getCharacterMovementOverrideType(characterId, characterState) {
  if (characterId === "volaty" && getCharacterStateBoolean(characterState, VOLATY_LEAP_TURN_STATE_KEY)) {
    return "leap";
  }
  return null;
}
function markCharacterMovedOutOfTurn(characterId, characterState) {
  if (characterId !== "chain") {
    return normalizeCharacterState({
      ...characterState
    });
  }
  return setCharacterStateValue(characterState, CHAIN_MOVED_OUT_OF_TURN_STATE_KEY, true);
}
function applyCharacterTurnEndCleanup(characterId, characterState) {
  if (characterId !== "volaty") {
    return normalizeCharacterState({
      ...characterState
    });
  }
  return setCharacterStateValue(characterState, VOLATY_LEAP_TURN_STATE_KEY, void 0);
}
function getTotalMovementPoints(tools) {
  return tools.reduce((total, tool) => {
    if (tool.toolId !== "movement") {
      return total;
    }
    return total + (typeof tool.params.movePoints === "number" ? tool.params.movePoints : 0);
  }, 0);
}
function adjustMovementTools(tools, delta) {
  if (!delta) {
    return tools;
  }
  if (delta > 0) {
    return tools.map(
      (tool, index) => tool.toolId === "movement" && index === tools.findIndex((entry) => entry.toolId === "movement") ? {
        ...tool,
        params: {
          ...tool.params,
          movePoints: (typeof tool.params.movePoints === "number" ? tool.params.movePoints : 0) + delta
        }
      } : tool
    );
  }
  let remainingReduction = Math.abs(delta);
  return tools.map((tool) => {
    if (tool.toolId !== "movement" || remainingReduction < 1) {
      return tool;
    }
    const currentPoints = typeof tool.params.movePoints === "number" ? tool.params.movePoints : 0;
    const appliedReduction = Math.min(currentPoints, remainingReduction);
    remainingReduction -= appliedReduction;
    return {
      ...tool,
      params: {
        ...tool.params,
        movePoints: Math.max(0, currentPoints - appliedReduction)
      }
    };
  });
}
function clearMovementTools(tools) {
  return tools.map(
    (tool) => tool.toolId === "movement" ? {
      ...tool,
      params: {
        ...tool.params,
        movePoints: 0
      }
    } : tool
  );
}

// src/terrain.ts
var LUCKY_TURN_FLAG = "lucky_tile_claimed";
function buildLuckyToolInstanceId(sourceId, tileKey, grantedToolId) {
  return `${sourceId}:lucky:${tileKey}:${grantedToolId}`;
}
var TERRAIN_DEFINITIONS = {
  conveyor: {
    onPassThrough: (context) => {
      if (!context.tile.direction || !context.direction || typeof context.remainingMovePoints !== "number" || !isMovementType(context.movement, "translate")) {
        return {
          triggeredTerrainEffects: []
        };
      }
      if (context.direction === context.tile.direction) {
        return {
          nextRemainingMovePoints: context.remainingMovePoints + 2,
          triggeredTerrainEffects: [
            {
              kind: "conveyor_boost",
              movement: context.movement,
              playerId: context.playerId,
              tileKey: context.tile.key,
              position: context.position,
              direction: context.direction,
              bonusMovePoints: 2
            }
          ]
        };
      }
      return {
        nextDirection: context.tile.direction,
        triggeredTerrainEffects: [
          {
            kind: "conveyor_turn",
            movement: context.movement,
            playerId: context.playerId,
            tileKey: context.tile.key,
            position: context.position,
            fromDirection: context.direction,
            toDirection: context.tile.direction
          }
        ]
      };
    }
  },
  pit: {
    onStop: (context) => ({
      nextPosition: context.player.spawnPosition,
      triggeredTerrainEffects: [
        {
          kind: "pit",
          movement: context.movement,
          playerId: context.player.id,
          tileKey: context.tile.key,
          position: context.player.position,
          respawnPosition: context.player.spawnPosition
        }
      ]
    })
  },
  lucky: {
    onStop: (context) => {
      if (!context.player.isActor || context.player.turnFlags.includes(LUCKY_TURN_FLAG)) {
        return null;
      }
      const toolRoll = rollToolDie(context.toolDieSeed);
      const rewardedTool = createRolledToolInstance(
        buildLuckyToolInstanceId(context.sourceId, context.tile.key, toolRoll.value.toolId),
        toolRoll.value
      );
      return {
        nextToolDieSeed: toolRoll.nextSeed,
        nextTools: [...context.tools, rewardedTool],
        nextTurnFlags: [...context.player.turnFlags, LUCKY_TURN_FLAG],
        triggeredTerrainEffects: [
          {
            kind: "lucky",
            movement: context.movement,
            playerId: context.player.id,
            tileKey: context.tile.key,
            position: context.player.position,
            grantedTool: rewardedTool
          }
        ]
      };
    }
  },
  goal: {
    onStop: (context) => {
      if (!context.player.isActor) {
        return null;
      }
      return {
        triggeredTerrainEffects: [
          {
            kind: "goal",
            movement: context.movement,
            playerId: context.player.id,
            tileKey: context.tile.key,
            position: context.player.position
          }
        ]
      };
    }
  }
};
function resolvePassThroughTerrainEffect(context) {
  const terrainDefinition = TERRAIN_DEFINITIONS[context.tile.type];
  if (!terrainDefinition?.onPassThrough) {
    return {
      triggeredTerrainEffects: []
    };
  }
  return terrainDefinition.onPassThrough(context);
}
function resolveStopTerrainEffect(context) {
  const terrainDefinition = TERRAIN_DEFINITIONS[context.tile.type];
  if (!terrainDefinition?.onStop) {
    return null;
  }
  return terrainDefinition.onStop(context);
}
function isLuckyTurnFlag(flag) {
  return flag === LUCKY_TURN_FLAG;
}
function getTerrainTileKey(position) {
  return toTileKey(position);
}
function createTerrainStopTarget(actor, position, isActor) {
  return {
    characterId: actor.characterId,
    characterState: actor.characterState,
    id: actor.id,
    isActor,
    position,
    spawnPosition: actor.spawnPosition,
    turnFlags: [...actor.turnFlags]
  };
}

// src/rules/movementSystem.ts
function clonePosition(position) {
  return {
    x: position.x,
    y: position.y
  };
}
function cloneCharacterState2(characterState) {
  return {
    ...characterState
  };
}
function cloneSubject(player) {
  return {
    characterId: player.characterId,
    characterState: cloneCharacterState2(player.characterState),
    id: player.id,
    position: clonePosition(player.position),
    spawnPosition: clonePosition(player.spawnPosition),
    turnFlags: [...player.turnFlags]
  };
}
function buildState(player, tools, toolDieSeed, direction, remainingMovePoints) {
  return {
    direction,
    nextToolDieSeed: toolDieSeed,
    player: cloneSubject(player),
    remainingMovePoints,
    summonMutations: [],
    tileMutations: [],
    tools,
    triggeredSummonEffects: [],
    triggeredTerrainEffects: []
  };
}
function applyToolStatePatch(state, patch) {
  if (patch.nextCharacterState) {
    state.player.characterState = cloneCharacterState2(patch.nextCharacterState);
  }
  if (patch.nextDirection) {
    state.direction = patch.nextDirection;
  }
  if (typeof patch.nextRemainingMovePoints === "number") {
    state.remainingMovePoints = patch.nextRemainingMovePoints;
  }
  if (typeof patch.nextToolDieSeed === "number") {
    state.nextToolDieSeed = patch.nextToolDieSeed;
  }
  if (patch.nextTools) {
    state.tools = patch.nextTools;
  }
  if (patch.nextTurnFlags) {
    state.player.turnFlags = [...patch.nextTurnFlags];
  }
}
function appendEffectArrays(state, patch) {
  if (patch.summonMutations?.length) {
    state.summonMutations.push(...patch.summonMutations);
  }
  if (patch.triggeredSummonEffects?.length) {
    state.triggeredSummonEffects.push(...patch.triggeredSummonEffects);
  }
  if (patch.triggeredTerrainEffects?.length) {
    state.triggeredTerrainEffects.push(...patch.triggeredTerrainEffects);
  }
}
function applyStopPatch(state, patch) {
  applyToolStatePatch(state, patch);
  if (patch.nextPosition) {
    state.player.position = clonePosition(patch.nextPosition);
  }
}
function applySummonMutationsToMap(summonsById, summonMutations) {
  for (const mutation of summonMutations) {
    if (mutation.kind === "remove") {
      summonsById.delete(mutation.instanceId);
      continue;
    }
    summonsById.set(mutation.instanceId, {
      instanceId: mutation.instanceId,
      ownerId: mutation.ownerId,
      position: clonePosition(mutation.position),
      summonId: mutation.summonId
    });
  }
}
function buildLiveSummons(context, priorSummonMutations, localSummonMutations) {
  const summonsById = new Map(
    context.summons.map((summon) => [summon.instanceId, summon])
  );
  applySummonMutationsToMap(summonsById, priorSummonMutations);
  applySummonMutationsToMap(summonsById, localSummonMutations);
  return [...summonsById.values()];
}
function buildTileMutationSet(priorTileMutations, localTileMutations) {
  return [...priorTileMutations, ...localTileMutations];
}
function runPassThroughTriggers(context, state, movement, priorTileMutations, priorSummonMutations) {
  const tile = getTileAfterMutations(
    context.board,
    buildTileMutationSet(priorTileMutations, state.tileMutations),
    state.player.position
  );
  if (!tile) {
    return;
  }
  const terrainResolution = resolvePassThroughTerrainEffect({
    ...state.direction ? { direction: state.direction } : {},
    movement,
    playerId: state.player.id,
    position: state.player.position,
    ...typeof state.remainingMovePoints === "number" ? { remainingMovePoints: state.remainingMovePoints } : {},
    tile
  });
  applyToolStatePatch(state, terrainResolution);
  appendEffectArrays(state, terrainResolution);
  const summonResolution = resolvePassThroughSummonEffects({
    movement,
    player: state.player,
    position: state.player.position,
    sourceId: context.sourceId,
    summons: buildLiveSummons(context, priorSummonMutations, state.summonMutations),
    toolDieSeed: state.nextToolDieSeed,
    tools: state.tools,
    ...state.direction ? { direction: state.direction } : {},
    ...typeof state.remainingMovePoints === "number" ? { remainingMovePoints: state.remainingMovePoints } : {}
  });
  applyToolStatePatch(state, summonResolution);
  appendEffectArrays(state, summonResolution);
}
function runStopTriggers(context, state, movement, priorTileMutations, priorSummonMutations) {
  const liveSummons = buildLiveSummons(context, priorSummonMutations, state.summonMutations);
  const summonResolution = resolveStopSummonEffects({
    movement,
    player: state.player,
    position: state.player.position,
    sourceId: context.sourceId,
    summons: liveSummons,
    toolDieSeed: state.nextToolDieSeed,
    tools: state.tools
  });
  applyStopPatch(state, summonResolution);
  appendEffectArrays(state, summonResolution);
  const tile = getTileAfterMutations(
    context.board,
    buildTileMutationSet(priorTileMutations, state.tileMutations),
    state.player.position
  );
  if (!tile) {
    return;
  }
  const terrainResolution = resolveStopTerrainEffect({
    movement,
    player: {
      characterId: state.player.characterId,
      characterState: state.player.characterState,
      id: state.player.id,
      isActor: state.player.id === context.actorId,
      position: state.player.position,
      spawnPosition: state.player.spawnPosition,
      turnFlags: [...state.player.turnFlags]
    },
    sourceId: context.sourceId,
    tile,
    toolDieSeed: state.nextToolDieSeed,
    tools: state.tools
  });
  if (!terrainResolution) {
    return;
  }
  applyStopPatch(state, terrainResolution);
  appendEffectArrays(state, terrainResolution);
}
function buildResolution(state, path, stopReason) {
  return {
    actor: {
      characterState: cloneCharacterState2(state.player.characterState),
      position: clonePosition(state.player.position),
      turnFlags: [...state.player.turnFlags]
    },
    nextToolDieSeed: state.nextToolDieSeed,
    path,
    stopReason,
    summonMutations: state.summonMutations,
    tileMutations: state.tileMutations,
    tools: state.tools,
    triggeredSummonEffects: state.triggeredSummonEffects,
    triggeredTerrainEffects: state.triggeredTerrainEffects
  };
}
function resolveLinearDisplacement(context, options) {
  const state = buildState(
    options.player,
    options.tools,
    options.toolDieSeed,
    options.direction,
    options.movePoints
  );
  const priorTileMutations = options.priorTileMutations ?? [];
  const priorSummonMutations = options.priorSummonMutations ?? [];
  const path = [];
  const maxSteps = options.maxSteps ?? Number.POSITIVE_INFINITY;
  let stepsTaken = 0;
  let stopReason = "Movement ended";
  while ((state.remainingMovePoints ?? 0) > 0 && stepsTaken < maxSteps) {
    const direction = state.direction;
    if (!direction) {
      stopReason = "No direction";
      break;
    }
    const target = stepPosition(state.player.position, direction);
    if (!isWithinBoard(context.board, target)) {
      stopReason = "Board edge";
      break;
    }
    const tile = getTileAfterMutations(
      context.board,
      buildTileMutationSet(priorTileMutations, state.tileMutations),
      target
    );
    if (!tile) {
      stopReason = "Missing tile";
      break;
    }
    if (tile.type === "wall") {
      stopReason = "Wall";
      break;
    }
    const moveCost = tile.type === "earthWall" ? 1 + tile.durability : 1;
    if ((state.remainingMovePoints ?? 0) < moveCost) {
      stopReason = "Not enough move points";
      break;
    }
    state.remainingMovePoints = (state.remainingMovePoints ?? 0) - moveCost;
    state.player.position = target;
    path.push(target);
    stepsTaken += 1;
    if (tile.type === "earthWall") {
      state.tileMutations.push(createTileMutation(target, "floor", 0));
    }
    runPassThroughTriggers(context, state, options.movement, priorTileMutations, priorSummonMutations);
  }
  if (path.length) {
    runStopTriggers(context, state, options.movement, priorTileMutations, priorSummonMutations);
  }
  return buildResolution(state, path, stopReason);
}
function resolveLeapDisplacement(context, options) {
  const state = buildState(
    options.player,
    options.tools,
    options.toolDieSeed,
    options.direction,
    null
  );
  const priorTileMutations = options.priorTileMutations ?? [];
  const priorSummonMutations = options.priorSummonMutations ?? [];
  const leap = resolveLeapLanding(
    context.board,
    options.player.position,
    options.direction,
    options.maxDistance,
    priorTileMutations
  );
  if (!leap.landing) {
    return buildResolution(state, leap.path, "No landing tile");
  }
  for (const position of leap.path) {
    state.player.position = position;
    runPassThroughTriggers(context, state, options.movement, priorTileMutations, priorSummonMutations);
  }
  runStopTriggers(context, state, options.movement, priorTileMutations, priorSummonMutations);
  return buildResolution(state, leap.path, "Movement ended");
}
function resolveTeleportDisplacement(context, options) {
  const state = buildState(options.player, options.tools, options.toolDieSeed, null, null);
  const priorTileMutations = options.priorTileMutations ?? [];
  const priorSummonMutations = options.priorSummonMutations ?? [];
  if (!isLandablePosition(context.board, options.targetPosition, priorTileMutations)) {
    return buildResolution(state, [], "Teleport target is not landable");
  }
  state.player.position = clonePosition(options.targetPosition);
  const path = [clonePosition(options.targetPosition)];
  runPassThroughTriggers(context, state, options.movement, priorTileMutations, priorSummonMutations);
  runStopTriggers(context, state, options.movement, priorTileMutations, priorSummonMutations);
  return buildResolution(state, path, "Movement ended");
}
function resolveCurrentTileStop(context, options) {
  const state = buildState(options.player, options.tools, options.toolDieSeed, null, null);
  runStopTriggers(
    context,
    state,
    null,
    options.priorTileMutations ?? [],
    options.priorSummonMutations ?? []
  );
  return buildResolution(state, [], "Current tile stop");
}

// src/rules/executors/characterTools.ts
function buildMovementSystemContext(context) {
  return {
    activeTool: context.activeTool,
    actorId: context.actor.id,
    board: context.board,
    players: context.players,
    sourceId: context.activeTool.instanceId,
    summons: context.summons
  };
}
function toAffectedPlayerMove(playerId, startPosition, movement, resolution, reason) {
  return {
    characterState: resolution.actor.characterState,
    movement,
    path: resolution.path,
    playerId,
    reason,
    startPosition,
    target: resolution.actor.position,
    turnFlags: resolution.actor.turnFlags
  };
}
function resolveBalanceTool(context) {
  const choiceId = context.choiceId;
  const totalMovePoints = getTotalMovementPoints(context.tools);
  if (!choiceId) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Balance needs a choice",
      context.toolDieSeed
    );
  }
  if (!getToolChoiceDefinitions(context.activeTool.toolId).some((choice) => choice.id === choiceId)) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Unknown balance choice",
      context.toolDieSeed
    );
  }
  if (totalMovePoints < 1) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "No move points available",
      context.toolDieSeed
    );
  }
  let nextTools = consumeActiveTool(context);
  let nextCharacterState = {
    ...context.actor.characterState
  };
  const currentPendingBonus = getCharacterStateNumber(
    context.actor.characterState,
    FARTHER_PENDING_MOVE_BONUS_STATE_KEY
  );
  if (choiceId === "trim_and_bank") {
    nextTools = adjustMovementTools(nextTools, -1);
    nextCharacterState = setCharacterStateValue(
      nextCharacterState,
      FARTHER_PENDING_MOVE_BONUS_STATE_KEY,
      currentPendingBonus + 1
    );
  } else {
    nextTools = clearMovementTools(nextTools);
    nextCharacterState = setCharacterStateValue(
      nextCharacterState,
      FARTHER_PENDING_MOVE_BONUS_STATE_KEY,
      currentPendingBonus + totalMovePoints
    );
  }
  return buildAppliedResolution(
    {
      ...context.actor,
      characterState: nextCharacterState
    },
    nextTools,
    `Used ${getToolDefinition(context.activeTool.toolId).label}.`,
    context.toolDieSeed,
    []
  );
}
function resolveBombThrowTool(context) {
  const targetPosition = context.targetPosition;
  const direction = requireDirection(context);
  const targetRange = getToolParam(context.activeTool, "targetRange");
  const pushDistance = getToolParam(context.activeTool, "pushDistance");
  const pushMovement = createMovementDescriptor("translate", "passive", {
    tags: [`tool:${context.activeTool.toolId}`, "bomb:push"],
    timing: "out_of_turn"
  });
  if (!targetPosition) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Bomb Throw needs a target tile",
      context.toolDieSeed
    );
  }
  if (!direction) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Bomb Throw needs a direction",
      context.toolDieSeed,
      [],
      [],
      [targetPosition]
    );
  }
  const deltaX = Math.abs(targetPosition.x - context.actor.position.x);
  const deltaY = Math.abs(targetPosition.y - context.actor.position.y);
  if (deltaX === 0 && deltaY === 0 || deltaX > targetRange || deltaY > targetRange) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Target tile is outside the bomb range",
      context.toolDieSeed,
      [],
      [],
      [targetPosition]
    );
  }
  const targetPlayers = findPlayersAtPosition(context.players, targetPosition, []);
  if (!targetPlayers.length) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "No players are standing on the target tile",
      context.toolDieSeed,
      [],
      [],
      [targetPosition]
    );
  }
  const affectedPlayers = [];
  const tileMutations = [];
  const summonMutations = [];
  const triggeredTerrainEffects = [];
  const triggeredSummonEffects = [];
  const motionEvents = [];
  let nextTools = consumeActiveTool(context);
  let nextToolDieSeed = context.toolDieSeed;
  for (const [index, targetPlayer] of targetPlayers.entries()) {
    const pushResolution = resolveLinearDisplacement(buildMovementSystemContext(context), {
      direction,
      maxSteps: pushDistance,
      movePoints: pushDistance,
      movement: pushMovement,
      player: {
        characterId: targetPlayer.characterId,
        characterState: targetPlayer.characterState,
        id: targetPlayer.id,
        position: targetPlayer.position,
        spawnPosition: targetPlayer.spawnPosition,
        turnFlags: targetPlayer.turnFlags
      },
      priorSummonMutations: summonMutations,
      priorTileMutations: tileMutations,
      toolDieSeed: nextToolDieSeed,
      tools: nextTools
    });
    if (!pushResolution.path.length) {
      continue;
    }
    affectedPlayers.push(
      toAffectedPlayerMove(
        targetPlayer.id,
        targetPlayer.position,
        pushMovement,
        pushResolution,
        "bomb_throw"
      )
    );
    nextTools = pushResolution.tools;
    nextToolDieSeed = pushResolution.nextToolDieSeed;
    tileMutations.push(...pushResolution.tileMutations);
    summonMutations.push(...pushResolution.summonMutations);
    triggeredTerrainEffects.push(...pushResolution.triggeredTerrainEffects);
    triggeredSummonEffects.push(...pushResolution.triggeredSummonEffects);
    const motionEvent = createPlayerMotionEvent(
      `${context.activeTool.instanceId}:bomb-push-${targetPlayer.id}-${index}`,
      targetPlayer.id,
      buildMotionPositions(targetPlayer.position, pushResolution.path),
      "ground"
    );
    if (motionEvent) {
      motionEvents.push(motionEvent);
    }
  }
  if (!affectedPlayers.length) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Targets cannot be displaced",
      context.toolDieSeed,
      [],
      [],
      [targetPosition]
    );
  }
  return buildAppliedResolution(
    context.actor,
    nextTools,
    `Used ${getToolDefinition(context.activeTool.toolId).label}.`,
    nextToolDieSeed,
    [],
    tileMutations,
    affectedPlayers,
    triggeredTerrainEffects,
    [targetPosition],
    createPresentation(context.actor.id, context.activeTool.toolId, motionEvents),
    summonMutations,
    triggeredSummonEffects
  );
}

// src/rules/executors/movementTools.ts
function buildMovementSystemContext2(context) {
  return {
    activeTool: context.activeTool,
    actorId: context.actor.id,
    board: context.board,
    players: context.players,
    sourceId: context.activeTool.instanceId,
    summons: context.summons
  };
}
function toMovementSubject(actor) {
  return {
    characterId: actor.characterId,
    characterState: actor.characterState,
    id: actor.id,
    position: actor.position,
    spawnPosition: actor.spawnPosition,
    turnFlags: actor.turnFlags
  };
}
function getToolMovementDescriptor(context, fallbackType, extraTags = []) {
  const definitionMovement = getToolDefinition(context.activeTool.toolId).actorMovement ?? {
    type: fallbackType,
    disposition: "active"
  };
  const overrideType = getCharacterMovementOverrideType(
    context.actor.characterId,
    context.actor.characterState
  );
  const type = definitionMovement.disposition === "active" && definitionMovement.type === "translate" && overrideType === "leap" ? "leap" : definitionMovement.type;
  return materializeMovementDescriptor(
    {
      ...definitionMovement,
      type
    },
    {
      tags: [`tool:${context.activeTool.toolId}`, ...extraTags],
      timing: "in_turn"
    }
  );
}
function createPassiveToolMovementDescriptor(toolId, type, extraTags = []) {
  return createMovementDescriptor(type, "passive", {
    tags: [`tool:${toolId}`, ...extraTags],
    timing: "out_of_turn"
  });
}
function createActorMotionPresentation(context, eventSuffix, path, motionStyle) {
  return createPresentation(context.actor.id, context.activeTool.toolId, [
    createPlayerMotionEvent(
      `${context.activeTool.instanceId}:${eventSuffix}`,
      context.actor.id,
      buildMotionPositions(context.actor.position, path),
      motionStyle
    )
  ].flatMap((event) => event ? [event] : []));
}
function toAffectedPlayerMove2(playerId, startPosition, movement, resolution, reason) {
  return {
    characterState: resolution.actor.characterState,
    movement,
    path: resolution.path,
    playerId,
    reason,
    startPosition,
    target: resolution.actor.position,
    turnFlags: resolution.actor.turnFlags
  };
}
function resolveMovementTool(context) {
  const direction = requireDirection(context);
  const movePoints = getToolParam(context.activeTool, "movePoints");
  const movement = getToolMovementDescriptor(context, "translate");
  const nextTools = consumeActiveTool(context);
  if (!direction) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Movement needs a direction",
      context.toolDieSeed
    );
  }
  if (movePoints < 1) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "No move points left",
      context.toolDieSeed
    );
  }
  const resolution = movement.type === "leap" ? resolveLeapDisplacement(buildMovementSystemContext2(context), {
    direction,
    maxDistance: movePoints,
    movement,
    player: toMovementSubject(context.actor),
    toolDieSeed: context.toolDieSeed,
    tools: nextTools
  }) : resolveLinearDisplacement(buildMovementSystemContext2(context), {
    direction,
    movePoints,
    movement,
    player: toMovementSubject(context.actor),
    toolDieSeed: context.toolDieSeed,
    tools: nextTools
  });
  if (!resolution.path.length) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      resolution.stopReason,
      context.toolDieSeed,
      resolution.path,
      [],
      resolution.path
    );
  }
  return buildAppliedResolution(
    {
      ...context.actor,
      characterState: resolution.actor.characterState,
      position: resolution.actor.position,
      turnFlags: resolution.actor.turnFlags
    },
    resolution.tools,
    `Used ${getToolDefinition(context.activeTool.toolId).label}.`,
    resolution.nextToolDieSeed,
    resolution.path,
    resolution.tileMutations,
    [],
    resolution.triggeredTerrainEffects,
    resolution.path,
    createActorMotionPresentation(
      context,
      "actor-move",
      resolution.path,
      movement.type === "leap" ? "arc" : "ground"
    ),
    resolution.summonMutations,
    resolution.triggeredSummonEffects,
    false,
    createResolvedPlayerMovement(context.actor.id, context.actor.position, resolution.path, movement)
  );
}
function resolveJumpTool(context) {
  const direction = requireDirection(context);
  const jumpDistance = getToolParam(context.activeTool, "jumpDistance");
  const movement = getToolMovementDescriptor(context, "leap");
  const resolution = direction ? resolveLeapDisplacement(buildMovementSystemContext2(context), {
    direction,
    maxDistance: jumpDistance,
    movement,
    player: toMovementSubject(context.actor),
    toolDieSeed: context.toolDieSeed,
    tools: consumeActiveTool(context)
  }) : null;
  if (!direction || !resolution) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Jump needs a direction",
      context.toolDieSeed
    );
  }
  if (!resolution.path.length) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      resolution.stopReason,
      context.toolDieSeed,
      resolution.path,
      [],
      resolution.path
    );
  }
  return buildAppliedResolution(
    {
      ...context.actor,
      characterState: resolution.actor.characterState,
      position: resolution.actor.position,
      turnFlags: resolution.actor.turnFlags
    },
    resolution.tools,
    `Used ${getToolDefinition(context.activeTool.toolId).label}.`,
    resolution.nextToolDieSeed,
    resolution.path,
    resolution.tileMutations,
    [],
    resolution.triggeredTerrainEffects,
    resolution.path,
    createActorMotionPresentation(context, "actor-jump", resolution.path, "arc"),
    resolution.summonMutations,
    resolution.triggeredSummonEffects,
    false,
    createResolvedPlayerMovement(context.actor.id, context.actor.position, resolution.path, movement)
  );
}
function resolveHookshotTool(context) {
  const direction = requireDirection(context);
  const hookLength = getToolParam(context.activeTool, "hookLength");
  const actorMovement = getToolMovementDescriptor(context, "drag", ["hookshot:self"]);
  const pulledMovement = createPassiveToolMovementDescriptor(context.activeTool.toolId, "drag", [
    "hookshot:pull"
  ]);
  if (!direction) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Hookshot needs a direction",
      context.toolDieSeed
    );
  }
  const rayPath = [];
  for (let distance = 1; distance <= hookLength; distance += 1) {
    const target = stepPosition(context.actor.position, direction, distance);
    if (!isWithinBoard(context.board, target)) {
      break;
    }
    const tile = getTile(context.board, target);
    if (tile && isSolidTileType(tile.type)) {
      const pullDistance = distance - 1;
      if (pullDistance < 1) {
        return buildBlockedResolution(
          context.actor,
          context.tools,
          "No hookshot landing space",
          context.toolDieSeed,
          rayPath,
          [],
          rayPath
        );
      }
      const actorResolution = resolveLinearDisplacement(buildMovementSystemContext2(context), {
        direction,
        maxSteps: pullDistance,
        movePoints: pullDistance,
        movement: actorMovement,
        player: toMovementSubject(context.actor),
        toolDieSeed: context.toolDieSeed,
        tools: consumeActiveTool(context)
      });
      if (!actorResolution.path.length) {
        return buildBlockedResolution(
          context.actor,
          context.tools,
          actorResolution.stopReason,
          context.toolDieSeed,
          rayPath,
          [],
          rayPath
        );
      }
      return buildAppliedResolution(
        {
          ...context.actor,
          characterState: actorResolution.actor.characterState,
          position: actorResolution.actor.position,
          turnFlags: actorResolution.actor.turnFlags
        },
        actorResolution.tools,
        `Used ${getToolDefinition(context.activeTool.toolId).label}.`,
        actorResolution.nextToolDieSeed,
        actorResolution.path,
        actorResolution.tileMutations,
        [],
        actorResolution.triggeredTerrainEffects,
        rayPath,
        createActorMotionPresentation(context, "actor-hook", actorResolution.path, "ground"),
        actorResolution.summonMutations,
        actorResolution.triggeredSummonEffects,
        false,
        createResolvedPlayerMovement(
          context.actor.id,
          context.actor.position,
          actorResolution.path,
          actorMovement
        )
      );
    }
    rayPath.push(target);
    const hitPlayers = findPlayersAtPosition(context.players, target, [context.actor.id]);
    if (!hitPlayers.length) {
      continue;
    }
    let nextTools = consumeActiveTool(context);
    let nextToolDieSeed = context.toolDieSeed;
    const tileMutations = [];
    const summonMutations = [];
    const triggeredTerrainEffects = [];
    const triggeredSummonEffects = [];
    const affectedPlayers = [];
    const motionEvents = [];
    for (const [index, hitPlayer] of hitPlayers.entries()) {
      const pullDistance = Math.max(0, distance - 1);
      if (pullDistance < 1) {
        continue;
      }
      const pullResolution = resolveLinearDisplacement(buildMovementSystemContext2(context), {
        direction: getOppositeDirection(direction),
        maxSteps: pullDistance,
        movePoints: pullDistance,
        movement: pulledMovement,
        player: toMovementSubject(hitPlayer),
        priorSummonMutations: summonMutations,
        priorTileMutations: tileMutations,
        toolDieSeed: nextToolDieSeed,
        tools: nextTools
      });
      if (!pullResolution.path.length) {
        continue;
      }
      affectedPlayers.push(
        toAffectedPlayerMove2(
          hitPlayer.id,
          hitPlayer.position,
          pulledMovement,
          pullResolution,
          "hookshot"
        )
      );
      nextTools = pullResolution.tools;
      nextToolDieSeed = pullResolution.nextToolDieSeed;
      tileMutations.push(...pullResolution.tileMutations);
      summonMutations.push(...pullResolution.summonMutations);
      triggeredTerrainEffects.push(...pullResolution.triggeredTerrainEffects);
      triggeredSummonEffects.push(...pullResolution.triggeredSummonEffects);
      const motionEvent = createPlayerMotionEvent(
        `${context.activeTool.instanceId}:hooked-${index}`,
        hitPlayer.id,
        buildMotionPositions(hitPlayer.position, pullResolution.path),
        "ground"
      );
      if (motionEvent) {
        motionEvents.push(motionEvent);
      }
    }
    if (!affectedPlayers.length) {
      return buildBlockedResolution(
        context.actor,
        context.tools,
        "Target cannot be pulled",
        context.toolDieSeed,
        rayPath,
        [],
        rayPath
      );
    }
    return buildAppliedResolution(
      context.actor,
      nextTools,
      `Used ${getToolDefinition(context.activeTool.toolId).label}.`,
      nextToolDieSeed,
      rayPath,
      tileMutations,
      affectedPlayers,
      triggeredTerrainEffects,
      rayPath,
      createPresentation(context.actor.id, context.activeTool.toolId, motionEvents),
      summonMutations,
      triggeredSummonEffects
    );
  }
  return buildBlockedResolution(
    context.actor,
    context.tools,
    "No hookshot target",
    context.toolDieSeed,
    rayPath,
    [],
    rayPath
  );
}
function resolveDashTool(context) {
  const dashBonus = getToolParam(context.activeTool, "dashBonus");
  const nextTools = consumeActiveTool(context).map(
    (tool) => tool.toolId === "movement" ? {
      ...tool,
      params: {
        ...tool.params,
        movePoints: getToolParam(tool, "movePoints") + dashBonus
      }
    } : tool
  );
  return buildAppliedResolution(
    context.actor,
    nextTools,
    `Used ${getToolDefinition(context.activeTool.toolId).label}.`,
    context.toolDieSeed,
    []
  );
}
function resolveBrakeTool(context) {
  const maxRange = getToolParam(context.activeTool, "brakeRange");
  const axisTarget = normalizeAxisTarget(context.actor.position, context.targetPosition);
  const movement = getToolMovementDescriptor(context, "translate");
  const nextTools = consumeActiveTool(context);
  if (!axisTarget) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Brake needs a target tile",
      context.toolDieSeed
    );
  }
  if (maxRange < 1) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "No brake range left",
      context.toolDieSeed
    );
  }
  const requestedDistance = Math.min(maxRange, axisTarget.distance);
  const resolution = movement.type === "leap" ? resolveLeapDisplacement(buildMovementSystemContext2(context), {
    direction: axisTarget.direction,
    maxDistance: requestedDistance,
    movement,
    player: toMovementSubject(context.actor),
    toolDieSeed: context.toolDieSeed,
    tools: nextTools
  }) : resolveLinearDisplacement(buildMovementSystemContext2(context), {
    direction: axisTarget.direction,
    maxSteps: requestedDistance,
    movePoints: requestedDistance,
    movement,
    player: toMovementSubject(context.actor),
    toolDieSeed: context.toolDieSeed,
    tools: nextTools
  });
  if (!resolution.path.length) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      resolution.stopReason,
      context.toolDieSeed,
      resolution.path,
      [],
      [axisTarget.snappedTarget]
    );
  }
  return buildAppliedResolution(
    {
      ...context.actor,
      characterState: resolution.actor.characterState,
      position: resolution.actor.position,
      turnFlags: resolution.actor.turnFlags
    },
    resolution.tools,
    `Used ${getToolDefinition(context.activeTool.toolId).label}.`,
    resolution.nextToolDieSeed,
    resolution.path,
    resolution.tileMutations,
    [],
    resolution.triggeredTerrainEffects,
    resolution.path,
    createActorMotionPresentation(
      context,
      "actor-brake",
      resolution.path,
      movement.type === "leap" ? "arc" : "ground"
    ),
    resolution.summonMutations,
    resolution.triggeredSummonEffects,
    false,
    createResolvedPlayerMovement(context.actor.id, context.actor.position, resolution.path, movement)
  );
}
function resolveTeleportTool(context) {
  const targetPosition = context.targetPosition;
  const movement = getToolMovementDescriptor(context, "teleport");
  if (!targetPosition) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Teleport needs a target tile",
      context.toolDieSeed
    );
  }
  const resolution = resolveTeleportDisplacement(buildMovementSystemContext2(context), {
    movement,
    player: toMovementSubject(context.actor),
    targetPosition,
    toolDieSeed: context.toolDieSeed,
    tools: consumeActiveTool(context)
  });
  if (!resolution.path.length) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      resolution.stopReason,
      context.toolDieSeed,
      [],
      [],
      [targetPosition]
    );
  }
  return buildAppliedResolution(
    {
      ...context.actor,
      characterState: resolution.actor.characterState,
      position: resolution.actor.position,
      turnFlags: resolution.actor.turnFlags
    },
    resolution.tools,
    `Used ${getToolDefinition(context.activeTool.toolId).label}.`,
    resolution.nextToolDieSeed,
    resolution.path,
    resolution.tileMutations,
    [],
    resolution.triggeredTerrainEffects,
    [targetPosition],
    null,
    resolution.summonMutations,
    resolution.triggeredSummonEffects,
    false,
    createResolvedPlayerMovement(context.actor.id, context.actor.position, resolution.path, movement)
  );
}

// src/rules/executors/projectileTools.ts
function buildMovementSystemContext3(context) {
  return {
    activeTool: context.activeTool,
    actorId: context.actor.id,
    board: context.board,
    players: context.players,
    sourceId: context.activeTool.instanceId,
    summons: context.summons
  };
}
function toSubject(player) {
  return {
    characterId: player.characterId,
    characterState: player.characterState,
    id: player.id,
    position: player.position,
    spawnPosition: player.spawnPosition,
    turnFlags: player.turnFlags
  };
}
function toAffectedPlayerMove3(playerId, startPosition, movement, resolution, reason) {
  return {
    characterState: resolution.actor.characterState,
    movement,
    path: resolution.path,
    playerId,
    reason,
    startPosition,
    target: resolution.actor.position,
    turnFlags: resolution.actor.turnFlags
  };
}
function resolveBasketballTool(context) {
  const direction = requireDirection(context);
  const projectileRange = getToolParam(context.activeTool, "projectileRange");
  const bounceCount = getToolParam(context.activeTool, "projectileBounceCount");
  const pushDistance = getToolParam(context.activeTool, "projectilePushDistance");
  const pushedMovement = createMovementDescriptor("translate", "passive", {
    tags: [`tool:${context.activeTool.toolId}`, "basketball:push"],
    timing: "out_of_turn"
  });
  if (!direction) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Basketball needs a direction",
      context.toolDieSeed
    );
  }
  const trace = traceProjectile(context, direction, projectileRange, bounceCount);
  const projectileEvent = createProjectileEvent(
    `${context.activeTool.instanceId}:projectile`,
    context.actor.id,
    "basketball",
    buildMotionPositions(context.actor.position, trace.path)
  );
  const impactStartMs = projectileEvent ? projectileEvent.startMs + projectileEvent.durationMs : 0;
  const motionEvents = projectileEvent ? [projectileEvent] : [];
  const affectedPlayers = [];
  const tileMutations = [];
  const summonMutations = [];
  const triggeredTerrainEffects = [];
  const triggeredSummonEffects = [];
  let nextTools = consumeActiveTool(context);
  let nextToolDieSeed = context.toolDieSeed;
  if (trace.collision.kind === "player") {
    for (const [index, hitPlayer] of trace.collision.players.entries()) {
      const pushResolution = resolveLinearDisplacement(buildMovementSystemContext3(context), {
        direction: trace.collision.direction,
        maxSteps: pushDistance,
        movePoints: pushDistance,
        movement: pushedMovement,
        player: toSubject(hitPlayer),
        priorSummonMutations: summonMutations,
        priorTileMutations: tileMutations,
        toolDieSeed: nextToolDieSeed,
        tools: nextTools
      });
      if (!pushResolution.path.length) {
        continue;
      }
      affectedPlayers.push(
        toAffectedPlayerMove3(
          hitPlayer.id,
          hitPlayer.position,
          pushedMovement,
          pushResolution,
          "basketball"
        )
      );
      nextTools = pushResolution.tools;
      nextToolDieSeed = pushResolution.nextToolDieSeed;
      tileMutations.push(...pushResolution.tileMutations);
      summonMutations.push(...pushResolution.summonMutations);
      triggeredTerrainEffects.push(...pushResolution.triggeredTerrainEffects);
      triggeredSummonEffects.push(...pushResolution.triggeredSummonEffects);
      const motionEvent = createPlayerMotionEvent(
        `${context.activeTool.instanceId}:basketball-hit-${index}`,
        hitPlayer.id,
        buildMotionPositions(hitPlayer.position, pushResolution.path),
        "ground",
        impactStartMs
      );
      if (motionEvent) {
        motionEvents.push(motionEvent);
      }
    }
  }
  return buildAppliedResolution(
    context.actor,
    nextTools,
    `Used ${getToolDefinition(context.activeTool.toolId).label}.`,
    nextToolDieSeed,
    trace.path,
    tileMutations,
    affectedPlayers,
    triggeredTerrainEffects,
    [],
    createPresentation(context.actor.id, context.activeTool.toolId, motionEvents),
    summonMutations,
    triggeredSummonEffects
  );
}
function resolveRocketTool(context) {
  const direction = requireDirection(context);
  const projectileRange = getToolParam(context.activeTool, "projectileRange");
  const blastLeapDistance = getToolParam(context.activeTool, "rocketBlastLeapDistance");
  const splashPushDistance = getToolParam(context.activeTool, "rocketSplashPushDistance");
  const blastMovement = createMovementDescriptor("leap", "passive", {
    tags: [`tool:${context.activeTool.toolId}`, "rocket:blast"],
    timing: "out_of_turn"
  });
  const splashMovement = createMovementDescriptor("translate", "passive", {
    tags: [`tool:${context.activeTool.toolId}`, "rocket:splash"],
    timing: "out_of_turn"
  });
  if (!direction) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Rocket needs a direction",
      context.toolDieSeed
    );
  }
  const trace = traceProjectile(context, direction, projectileRange, 0);
  const explosionPosition = trace.collision.kind === "player" ? trace.collision.position : trace.collision.kind === "solid" ? trace.collision.previousPosition : trace.path[trace.path.length - 1] ?? null;
  const centerLeapDirection = trace.collision.kind === "player" ? trace.collision.direction : getOppositeDirection(trace.collision.direction);
  if (!explosionPosition) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "No rocket flight path",
      context.toolDieSeed
    );
  }
  const projectileEvent = createProjectileEvent(
    `${context.activeTool.instanceId}:projectile`,
    context.actor.id,
    "rocket",
    buildMotionPositions(context.actor.position, trace.path)
  );
  const explosionStartMs = projectileEvent ? projectileEvent.startMs + projectileEvent.durationMs : 0;
  const motionEvents = projectileEvent ? [projectileEvent] : [];
  const affectedPlayers = [];
  const tileMutations = [];
  const summonMutations = [];
  const triggeredTerrainEffects = [];
  const triggeredSummonEffects = [];
  let nextTools = consumeActiveTool(context);
  let nextToolDieSeed = context.toolDieSeed;
  const centerPlayers = trace.collision.kind === "player" ? trace.collision.players : findPlayersAtPosition(context.players, explosionPosition, []);
  centerPlayers.forEach((hitPlayer, index) => {
    const leapResolution = resolveLeapDisplacement(buildMovementSystemContext3(context), {
      direction: centerLeapDirection,
      maxDistance: blastLeapDistance,
      movement: blastMovement,
      player: toSubject(hitPlayer),
      priorSummonMutations: summonMutations,
      priorTileMutations: tileMutations,
      toolDieSeed: nextToolDieSeed,
      tools: nextTools
    });
    if (!leapResolution.path.length) {
      return;
    }
    affectedPlayers.push(
      toAffectedPlayerMove3(
        hitPlayer.id,
        hitPlayer.position,
        blastMovement,
        leapResolution,
        "rocket_blast"
      )
    );
    nextTools = leapResolution.tools;
    nextToolDieSeed = leapResolution.nextToolDieSeed;
    tileMutations.push(...leapResolution.tileMutations);
    summonMutations.push(...leapResolution.summonMutations);
    triggeredTerrainEffects.push(...leapResolution.triggeredTerrainEffects);
    triggeredSummonEffects.push(...leapResolution.triggeredSummonEffects);
    const motionEvent = createPlayerMotionEvent(
      `${context.activeTool.instanceId}:blast-${index}`,
      hitPlayer.id,
      buildMotionPositions(hitPlayer.position, leapResolution.path),
      "arc",
      explosionStartMs + ROCKET_BLAST_DELAY_MS
    );
    if (motionEvent) {
      motionEvents.push(motionEvent);
    }
  });
  for (const splashDirection of CARDINAL_DIRECTIONS) {
    const splashPosition = stepPosition(explosionPosition, splashDirection);
    const splashPlayers = findPlayersAtPosition(
      context.players,
      splashPosition,
      centerPlayers.map((player) => player.id)
    );
    for (const splashPlayer of splashPlayers) {
      const pushResolution = resolveLinearDisplacement(buildMovementSystemContext3(context), {
        direction: splashDirection,
        maxSteps: splashPushDistance,
        movePoints: splashPushDistance,
        movement: splashMovement,
        player: toSubject(splashPlayer),
        priorSummonMutations: summonMutations,
        priorTileMutations: tileMutations,
        toolDieSeed: nextToolDieSeed,
        tools: nextTools
      });
      if (!pushResolution.path.length) {
        continue;
      }
      affectedPlayers.push(
        toAffectedPlayerMove3(
          splashPlayer.id,
          splashPlayer.position,
          splashMovement,
          pushResolution,
          "rocket_splash"
        )
      );
      nextTools = pushResolution.tools;
      nextToolDieSeed = pushResolution.nextToolDieSeed;
      tileMutations.push(...pushResolution.tileMutations);
      summonMutations.push(...pushResolution.summonMutations);
      triggeredTerrainEffects.push(...pushResolution.triggeredTerrainEffects);
      triggeredSummonEffects.push(...pushResolution.triggeredSummonEffects);
      const motionEvent = createPlayerMotionEvent(
        `${context.activeTool.instanceId}:splash-${splashPlayer.id}-${splashDirection}`,
        splashPlayer.id,
        buildMotionPositions(splashPlayer.position, pushResolution.path),
        "ground",
        explosionStartMs + ROCKET_BLAST_DELAY_MS
      );
      if (motionEvent) {
        motionEvents.push(motionEvent);
      }
    }
  }
  const previewTiles = collectExplosionPreviewTiles(context.board, explosionPosition);
  motionEvents.push(
    createEffectEvent(
      `${context.activeTool.instanceId}:explosion`,
      "rocket_explosion",
      explosionPosition,
      previewTiles,
      explosionStartMs
    )
  );
  return buildAppliedResolution(
    context.actor,
    nextTools,
    `Used ${getToolDefinition(context.activeTool.toolId).label}.`,
    nextToolDieSeed,
    trace.path,
    tileMutations,
    affectedPlayers,
    triggeredTerrainEffects,
    previewTiles,
    createPresentation(context.actor.id, context.activeTool.toolId, motionEvents),
    summonMutations,
    triggeredSummonEffects
  );
}

// src/rules/toolExecutors.ts
var TOOL_EXECUTORS = {
  movement: resolveMovementTool,
  jump: resolveJumpTool,
  hookshot: resolveHookshotTool,
  dash: resolveDashTool,
  brake: resolveBrakeTool,
  buildWall: resolveBuildWallTool,
  bombThrow: resolveBombThrowTool,
  balance: resolveBalanceTool,
  deployWallet: resolveDeployWalletTool,
  basketball: resolveBasketballTool,
  rocket: resolveRocketTool,
  teleport: resolveTeleportTool
};

// src/actions.ts
function resolveToolAction(context) {
  const availability = getToolAvailability(context.activeTool, context.tools);
  const toolDefinition = getToolDefinition(context.activeTool.toolId);
  if (!availability.usable) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      availability.reason ?? "Tool cannot be used right now",
      context.toolDieSeed
    );
  }
  if (toolDefinition.targetMode === "direction" && !context.direction) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      `${toolDefinition.label} needs a direction`,
      context.toolDieSeed
    );
  }
  if (toolDefinition.targetMode === "tile" && !context.targetPosition) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      `${toolDefinition.label} needs a target tile`,
      context.toolDieSeed
    );
  }
  if (toolDefinition.targetMode === "choice" && !context.choiceId) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      `${toolDefinition.label} needs a choice`,
      context.toolDieSeed
    );
  }
  if (toolDefinition.targetMode === "tile_direction" && (!context.targetPosition || !context.direction)) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      `${toolDefinition.label} needs both a target tile and a direction`,
      context.toolDieSeed
    );
  }
  const executedResolution = TOOL_EXECUTORS[context.activeTool.toolId](context);
  const definitionAdjustedResolution = executedResolution.kind === "applied" && toolDefinition.endsTurnOnUse ? {
    ...executedResolution,
    endsTurn: executedResolution.endsTurn || toolDefinition.endsTurnOnUse
  } : executedResolution;
  return attachStateTransitionPresentation(context, definitionAdjustedResolution);
}

// src/content/effects.ts
function defineEffectRegistry(registry) {
  return registry;
}
var EFFECT_REGISTRY = defineEffectRegistry({
  rocket_explosion: {
    label: "\u706B\u7BAD\u7206\u70B8",
    description: "\u706B\u7BAD\u547D\u4E2D\u540E\u7684\u8303\u56F4\u7206\u70B8\u8868\u73B0\u3002"
  }
});

// src/effects.ts
var PRESENTATION_EFFECT_DEFINITIONS = Object.fromEntries(
  Object.entries(EFFECT_REGISTRY).map(([effectId, definition]) => [
    effectId,
    {
      id: effectId,
      ...definition
    }
  ])
);
function getPresentationEffectDefinition(effectType) {
  return PRESENTATION_EFFECT_DEFINITIONS[effectType];
}

// src/goldens/types.ts
function defineGoldenCase(caseDefinition) {
  return caseDefinition;
}

// src/goldens/cases/characters.ts
var GOLDEN_CHARACTER_CASES = [
  defineGoldenCase({
    id: "blaze-prepares-bomb-and-throws-next-turn",
    title: "Blaze prepares a bomb and receives Bomb Throw next turn",
    description: "Using Blaze's roll-phase action should end the turn immediately and grant Bomb Throw on the next turn.",
    scene: {
      layout: [
        "########",
        "#......#",
        "#......#",
        "#......#",
        "########"
      ],
      players: [
        {
          id: "blaze",
          name: "Blaze",
          characterId: "blaze",
          position: { x: 1, y: 1 }
        },
        {
          id: "target",
          name: "Target",
          characterId: "late",
          position: { x: 2, y: 1 }
        }
      ],
      turn: {
        currentPlayerId: "blaze",
        phase: "roll"
      }
    },
    steps: [
      {
        kind: "useTurnStartAction",
        actorId: "blaze",
        actionId: "blazePrepareBomb",
        label: "Blaze prepares the next-turn bomb"
      },
      {
        kind: "rollDice",
        actorId: "target",
        label: "Target takes the intervening turn"
      },
      {
        kind: "endTurn",
        actorId: "target",
        label: "Target ends the turn"
      },
      {
        kind: "rollDice",
        actorId: "blaze",
        label: "Blaze rolls and receives Bomb Throw"
      },
      {
        kind: "useTool",
        actorId: "blaze",
        tool: "bombThrow",
        targetPosition: { x: 2, y: 1 },
        direction: "right",
        label: "Blaze throws the bomb at the adjacent target tile"
      }
    ],
    expect: {
      players: {
        blaze: {
          position: { x: 1, y: 1 },
          toolIds: ["movement", "buildWall"]
        },
        target: {
          position: { x: 4, y: 1 }
        }
      },
      turnInfo: {
        currentPlayerId: "blaze",
        phase: "action",
        moveRoll: 4,
        lastRolledToolId: "buildWall"
      },
      latestPresentation: {
        toolId: "bombThrow",
        eventKinds: ["player_motion"]
      }
    }
  }),
  defineGoldenCase({
    id: "volaty-skips-tool-die-and-leaps",
    title: "Volaty skips the tool die and turns movement into a leap",
    description: "Volaty's roll-phase action should roll only movement and resolve the turn's Movement tool as a leap.",
    scene: {
      layout: [
        "#######",
        "#..#..#",
        "#.....#",
        "#######"
      ],
      players: [
        {
          id: "volaty",
          name: "Volaty",
          characterId: "volaty",
          position: { x: 1, y: 1 }
        }
      ],
      turn: {
        currentPlayerId: "volaty",
        phase: "roll"
      }
    },
    steps: [
      {
        kind: "useTurnStartAction",
        actorId: "volaty",
        actionId: "volatySkipToolDie",
        label: "Volaty skips the tool die"
      },
      {
        kind: "useTool",
        actorId: "volaty",
        tool: "movement",
        direction: "right",
        label: "Volaty leaps across the wall with Movement"
      }
    ],
    expect: {
      players: {
        volaty: {
          position: { x: 4, y: 1 },
          toolCount: 0
        }
      },
      turnInfo: {
        currentPlayerId: "volaty",
        phase: "action",
        moveRoll: 3,
        lastRolledToolId: null
      },
      latestPresentation: {
        toolId: "movement",
        eventKinds: ["player_motion"]
      }
    }
  }),
  defineGoldenCase({
    id: "chain-gains-hookshot-when-still-out-of-turn",
    title: "Chain gains a small Hookshot after staying still out of turn",
    description: "If Chain was not moved between turns, the next roll should include a Hookshot with length 2.",
    scene: {
      layout: [
        "#######",
        "#.....#",
        "#.....#",
        "#######"
      ],
      players: [
        {
          id: "chain",
          name: "Chain",
          characterId: "chain",
          position: { x: 1, y: 1 }
        }
      ],
      turn: {
        currentPlayerId: "chain",
        phase: "roll"
      }
    },
    steps: [
      {
        kind: "rollDice",
        actorId: "chain",
        label: "Chain rolls after staying still"
      }
    ],
    expect: {
      players: {
        chain: {
          toolIds: ["movement", "jump", "hookshot"]
        }
      },
      turnInfo: {
        phase: "action",
        moveRoll: 3,
        lastRolledToolId: "jump"
      }
    }
  }),
  defineGoldenCase({
    id: "chain-loses-hookshot-after-out-of-turn-move",
    title: "Chain does not gain the small Hookshot after being moved out of turn",
    description: "Any out-of-turn movement should clear Chain's next-turn Hookshot reward.",
    scene: {
      layout: [
        "#######",
        "#.....#",
        "#.....#",
        "#######"
      ],
      players: [
        {
          id: "dummy",
          name: "Dummy",
          characterId: "ehh",
          position: { x: 1, y: 1 },
          tools: [
            {
              toolId: "basketball",
              params: {
                projectileRange: 4,
                projectileBounceCount: 0,
                projectilePushDistance: 1
              }
            }
          ]
        },
        {
          id: "chain",
          name: "Chain",
          characterId: "chain",
          position: { x: 3, y: 1 }
        }
      ],
      turn: {
        currentPlayerId: "dummy",
        phase: "action"
      }
    },
    steps: [
      {
        kind: "useTool",
        actorId: "dummy",
        tool: "basketball",
        direction: "right",
        label: "Dummy pushes Chain out of turn"
      },
      {
        kind: "endTurn",
        actorId: "dummy",
        label: "Dummy ends the turn"
      },
      {
        kind: "rollDice",
        actorId: "chain",
        label: "Chain rolls after being moved"
      }
    ],
    expect: {
      players: {
        chain: {
          position: { x: 4, y: 1 },
          toolIds: ["movement", "jump"]
        }
      },
      turnInfo: {
        currentPlayerId: "chain",
        phase: "action",
        moveRoll: 3,
        lastRolledToolId: "jump"
      }
    }
  }),
  defineGoldenCase({
    id: "farther-balance-trim-and-bank",
    title: "Farther banks one movement point for the next turn",
    description: "Balance option one should reduce this turn's movement by 1 and grant a Movement 1 tool next turn.",
    scene: {
      layout: [
        "#########",
        "#.......#",
        "#.......#",
        "#########"
      ],
      players: [
        {
          id: "farther",
          name: "Farther",
          characterId: "farther",
          position: { x: 1, y: 1 },
          tools: [
            {
              toolId: "movement",
              params: {
                movePoints: 3
              }
            },
            {
              toolId: "balance"
            }
          ]
        },
        {
          id: "dummy",
          name: "Dummy",
          characterId: "late",
          position: { x: 1, y: 2 }
        }
      ],
      turn: {
        currentPlayerId: "farther",
        phase: "action"
      }
    },
    steps: [
      {
        kind: "useTool",
        actorId: "farther",
        tool: "balance",
        choiceId: "trim_and_bank",
        label: "Farther trims one point and banks it"
      },
      {
        kind: "endTurn",
        actorId: "farther",
        label: "Farther ends the turn"
      },
      {
        kind: "rollDice",
        actorId: "dummy",
        label: "Dummy takes the intervening turn"
      },
      {
        kind: "endTurn",
        actorId: "dummy",
        label: "Dummy ends the turn"
      },
      {
        kind: "rollDice",
        actorId: "farther",
        label: "Farther rolls again"
      },
      {
        kind: "useTool",
        actorId: "farther",
        tool: { toolId: "movement", nth: 1 },
        direction: "right",
        label: "Farther spends the banked Movement 1"
      }
    ],
    expect: {
      players: {
        farther: {
          position: { x: 2, y: 1 },
          toolIds: ["movement", "buildWall", "balance"]
        }
      },
      latestPresentation: {
        toolId: "movement",
        eventKinds: ["player_motion"]
      }
    }
  }),
  defineGoldenCase({
    id: "farther-balance-store-all",
    title: "Farther stores the whole movement pool for the next turn",
    description: "Balance option two should zero this turn's movement and return the whole amount as a Movement tool next turn.",
    scene: {
      layout: [
        "#########",
        "#.......#",
        "#.......#",
        "#########"
      ],
      players: [
        {
          id: "farther",
          name: "Farther",
          characterId: "farther",
          position: { x: 1, y: 1 },
          tools: [
            {
              toolId: "movement",
              params: {
                movePoints: 3
              }
            },
            {
              toolId: "balance"
            }
          ]
        },
        {
          id: "dummy",
          name: "Dummy",
          characterId: "late",
          position: { x: 1, y: 2 }
        }
      ],
      turn: {
        currentPlayerId: "farther",
        phase: "action"
      }
    },
    steps: [
      {
        kind: "useTool",
        actorId: "farther",
        tool: "balance",
        choiceId: "store_all",
        label: "Farther stores the whole movement pool"
      },
      {
        kind: "endTurn",
        actorId: "farther",
        label: "Farther ends the turn"
      },
      {
        kind: "rollDice",
        actorId: "dummy",
        label: "Dummy takes the intervening turn"
      },
      {
        kind: "endTurn",
        actorId: "dummy",
        label: "Dummy ends the turn"
      },
      {
        kind: "rollDice",
        actorId: "farther",
        label: "Farther rolls again"
      },
      {
        kind: "useTool",
        actorId: "farther",
        tool: { toolId: "movement", nth: 1 },
        direction: "right",
        label: "Farther spends the stored Movement 3"
      }
    ],
    expect: {
      players: {
        farther: {
          position: { x: 4, y: 1 },
          toolIds: ["movement", "buildWall", "balance"]
        }
      },
      latestPresentation: {
        toolId: "movement",
        eventKinds: ["player_motion"]
      }
    }
  })
];

// src/goldens/cases/multiplayer.ts
var GOLDEN_MULTIPLAYER_CASES = [
  defineGoldenCase({
    id: "hookshot-pulls-stacked-players",
    title: "Hookshot pulls multiple stacked players",
    description: "Hookshot should pull every player on the hit cell with the same passive drag resolution.",
    scene: {
      layout: [
        "#######",
        "#.....#",
        "#.....#",
        "#######"
      ],
      players: [
        {
          id: "hooker",
          name: "Hooker",
          characterId: "late",
          position: { x: 1, y: 1 },
          tools: [
            {
              toolId: "hookshot",
              params: {
                hookLength: 4
              }
            }
          ]
        },
        {
          id: "target-a",
          name: "Target A",
          characterId: "ehh",
          position: { x: 4, y: 1 }
        },
        {
          id: "target-b",
          name: "Target B",
          characterId: "leader",
          position: { x: 4, y: 1 }
        }
      ],
      turn: {
        currentPlayerId: "hooker",
        phase: "action"
      }
    },
    steps: [
      {
        kind: "useTool",
        actorId: "hooker",
        tool: "hookshot",
        direction: "right",
        label: "Pull the stacked targets"
      }
    ],
    expect: {
      boardLayout: [
        "#######",
        "#.....#",
        "#.....#",
        "#######"
      ],
      players: {
        hooker: {
          position: { x: 1, y: 1 },
          toolCount: 0
        },
        "target-a": {
          position: { x: 2, y: 1 }
        },
        "target-b": {
          position: { x: 2, y: 1 }
        }
      },
      latestPresentation: {
        toolId: "hookshot",
        eventKinds: ["player_motion", "player_motion"]
      }
    }
  }),
  defineGoldenCase({
    id: "rocket-hits-stacked-center-and-splashes-neighbors",
    title: "Rocket affects stacked center and multiple splash targets",
    description: "Rocket should launch all players on the impact cell and also push players on each adjacent splash cell.",
    scene: {
      layout: [
        "#########",
        "#.......#",
        "#.......#",
        "#.......#",
        "#.......#",
        "#.......#",
        "#########"
      ],
      players: [
        {
          id: "rocketeer",
          name: "Rocketeer",
          characterId: "ehh",
          position: { x: 1, y: 3 },
          tools: [
            {
              toolId: "rocket",
              params: {
                projectileRange: 6,
                rocketBlastLeapDistance: 2,
                rocketSplashPushDistance: 1
              }
            }
          ]
        },
        {
          id: "center-a",
          name: "Center A",
          characterId: "late",
          position: { x: 4, y: 3 }
        },
        {
          id: "center-b",
          name: "Center B",
          characterId: "leader",
          position: { x: 4, y: 3 }
        },
        {
          id: "splash-up",
          name: "Splash Up",
          characterId: "ehh",
          position: { x: 4, y: 2 }
        },
        {
          id: "splash-down",
          name: "Splash Down",
          characterId: "late",
          position: { x: 4, y: 4 }
        }
      ],
      turn: {
        currentPlayerId: "rocketeer",
        phase: "action"
      }
    },
    steps: [
      {
        kind: "useTool",
        actorId: "rocketeer",
        tool: "rocket",
        direction: "right",
        label: "Fire through the center stack"
      }
    ],
    expect: {
      boardLayout: [
        "#########",
        "#.......#",
        "#.......#",
        "#.......#",
        "#.......#",
        "#.......#",
        "#########"
      ],
      players: {
        rocketeer: {
          position: { x: 1, y: 3 },
          toolCount: 0
        },
        "center-a": {
          position: { x: 6, y: 3 }
        },
        "center-b": {
          position: { x: 6, y: 3 }
        },
        "splash-up": {
          position: { x: 4, y: 1 }
        },
        "splash-down": {
          position: { x: 4, y: 5 }
        }
      },
      latestPresentation: {
        toolId: "rocket",
        eventKinds: [
          "projectile",
          "player_motion",
          "player_motion",
          "player_motion",
          "player_motion",
          "effect"
        ]
      }
    }
  }),
  defineGoldenCase({
    id: "rocket-pushes-stacked-splash-players",
    title: "Rocket pushes every player on one splash cell",
    description: "Splash knockback should apply independently to multiple players stacked on the same adjacent cell.",
    scene: {
      layout: [
        "#########",
        "#.......#",
        "#.......#",
        "#.......#",
        "#.......#",
        "#.......#",
        "#########"
      ],
      players: [
        {
          id: "rocketeer",
          name: "Rocketeer",
          characterId: "ehh",
          position: { x: 1, y: 3 },
          tools: [
            {
              toolId: "rocket",
              params: {
                projectileRange: 6,
                rocketBlastLeapDistance: 2,
                rocketSplashPushDistance: 1
              }
            }
          ]
        },
        {
          id: "center",
          name: "Center",
          characterId: "late",
          position: { x: 4, y: 3 }
        },
        {
          id: "stack-up-a",
          name: "Stack Up A",
          characterId: "ehh",
          position: { x: 4, y: 2 }
        },
        {
          id: "stack-up-b",
          name: "Stack Up B",
          characterId: "leader",
          position: { x: 4, y: 2 }
        }
      ],
      turn: {
        currentPlayerId: "rocketeer",
        phase: "action"
      }
    },
    steps: [
      {
        kind: "useTool",
        actorId: "rocketeer",
        tool: "rocket",
        direction: "right",
        label: "Push the stacked splash targets"
      }
    ],
    expect: {
      boardLayout: [
        "#########",
        "#.......#",
        "#.......#",
        "#.......#",
        "#.......#",
        "#.......#",
        "#########"
      ],
      players: {
        rocketeer: {
          position: { x: 1, y: 3 },
          toolCount: 0
        },
        center: {
          position: { x: 6, y: 3 }
        },
        "stack-up-a": {
          position: { x: 4, y: 1 }
        },
        "stack-up-b": {
          position: { x: 4, y: 1 }
        }
      }
    }
  })
];

// src/goldens/cases/movement.ts
var GOLDEN_MOVEMENT_CASES = [
  defineGoldenCase({
    id: "basic-movement-right",
    title: "Movement updates the actor position",
    description: "A simple grounded move should consume the movement tool and land on the next floor tile.",
    scene: {
      layout: [
        "#####",
        "#...#",
        "#...#",
        "#####"
      ],
      players: [
        {
          id: "hero",
          name: "Hero",
          characterId: "ehh",
          position: { x: 1, y: 1 },
          tools: [
            {
              toolId: "movement",
              params: {
                movePoints: 3
              }
            }
          ]
        }
      ],
      turn: {
        currentPlayerId: "hero",
        phase: "action"
      }
    },
    steps: [
      {
        kind: "useTool",
        actorId: "hero",
        tool: "movement",
        direction: "right",
        label: "Move right once"
      }
    ],
    expect: {
      boardLayout: [
        "#####",
        "#...#",
        "#...#",
        "#####"
      ],
      players: {
        hero: {
          position: { x: 3, y: 1 },
          toolCount: 0
        }
      },
      latestPresentation: {
        toolId: "movement",
        eventKinds: ["player_motion"]
      }
    }
  }),
  defineGoldenCase({
    id: "earth-wall-break",
    title: "Movement breaks an earth wall",
    description: "Ground movement into an earth wall should remove the wall and attach a delayed state transition event.",
    scene: {
      layout: [
        "#####",
        "#.e.#",
        "#...#",
        "#####"
      ],
      players: [
        {
          id: "hero",
          name: "Hero",
          characterId: "ehh",
          position: { x: 1, y: 1 },
          tools: [
            {
              toolId: "movement",
              params: {
                movePoints: 3
              }
            }
          ]
        }
      ],
      turn: {
        currentPlayerId: "hero",
        phase: "action"
      }
    },
    steps: [
      {
        kind: "useTool",
        actorId: "hero",
        tool: "movement",
        direction: "right"
      }
    ],
    expect: {
      boardLayout: [
        "#####",
        "#...#",
        "#...#",
        "#####"
      ],
      players: {
        hero: {
          position: { x: 2, y: 1 },
          toolCount: 0
        }
      }
    }
  }),
  defineGoldenCase({
    id: "turn-start-lucky-grants-pre-roll-tool",
    title: "Turn start stop triggers lucky before the roll",
    description: "Starting a turn on a lucky tile should immediately grant one rolled tool during the roll phase.",
    scene: {
      layout: [
        "#####",
        "#.l.#",
        "#...#",
        "#####"
      ],
      players: [
        {
          id: "hero",
          name: "Hero",
          characterId: "ehh",
          position: { x: 2, y: 1 },
          spawnPosition: { x: 1, y: 2 }
        }
      ],
      turn: {
        currentPlayerId: "hero",
        phase: "action",
        turnNumber: 1
      },
      seeds: {
        toolDieSeed: 1
      }
    },
    steps: [
      {
        kind: "endTurn",
        actorId: "hero",
        label: "End the turn while standing on lucky"
      }
    ],
    expect: {
      boardLayout: [
        "#####",
        "#.l.#",
        "#...#",
        "#####"
      ],
      players: {
        hero: {
          position: { x: 2, y: 1 },
          toolCount: 1,
          turnFlags: ["lucky_tile_claimed"]
        }
      },
      turnInfo: {
        currentPlayerId: "hero",
        phase: "roll",
        turnNumber: 2
      }
    }
  }),
  defineGoldenCase({
    id: "turn-start-pit-respawns-before-roll",
    title: "Turn start stop triggers pit before the roll",
    description: "Starting a turn on a pit should immediately respawn the player to their spawn tile before rolling.",
    scene: {
      layout: [
        "#####",
        "#.p.#",
        "#...#",
        "#####"
      ],
      players: [
        {
          id: "hero",
          name: "Hero",
          characterId: "ehh",
          position: { x: 2, y: 1 },
          spawnPosition: { x: 1, y: 2 }
        }
      ],
      turn: {
        currentPlayerId: "hero",
        phase: "action",
        turnNumber: 1
      }
    },
    steps: [
      {
        kind: "endTurn",
        actorId: "hero",
        label: "End the turn while standing on pit"
      }
    ],
    expect: {
      boardLayout: [
        "#####",
        "#.p.#",
        "#...#",
        "#####"
      ],
      players: {
        hero: {
          position: { x: 1, y: 2 },
          toolCount: 0
        }
      },
      turnInfo: {
        currentPlayerId: "hero",
        phase: "roll",
        turnNumber: 2
      },
      eventTypes: ["turn_ended", "turn_started", "player_respawned"]
    }
  })
];

// src/goldens/cases/race.ts
var GOLDEN_RACE_CASES = [
  defineGoldenCase({
    id: "race-goal-finishes-and-passes-turn",
    title: "Race: reaching goal finishes the player and passes the turn",
    description: "When the active player reaches the goal, they should receive a rank and the next unfinished player should begin immediately.",
    scene: {
      mapId: RACE_GAME_MAP_ID,
      layout: [
        "#####",
        "#s.g#",
        "#...#",
        "#####"
      ],
      players: [
        {
          id: "p1",
          name: "P1",
          characterId: "ehh",
          position: { x: 1, y: 1 },
          spawnPosition: { x: 1, y: 1 },
          tools: [{ toolId: "movement", params: { movePoints: 2 } }]
        },
        {
          id: "p2",
          name: "P2",
          characterId: "ehh",
          position: { x: 1, y: 2 },
          spawnPosition: { x: 1, y: 1 }
        }
      ],
      turn: {
        currentPlayerId: "p1",
        phase: "action",
        turnNumber: 1
      }
    },
    steps: [
      {
        kind: "useTool",
        actorId: "p1",
        tool: "movement",
        direction: "right"
      }
    ],
    expect: {
      allowDebugTools: false,
      mapId: RACE_GAME_MAP_ID,
      mode: "race",
      settlementState: "active",
      players: {
        p1: {
          position: { x: 3, y: 1 },
          finishRank: 1,
          finishedTurnNumber: 1,
          toolCount: 0
        },
        p2: {
          finishRank: null,
          finishedTurnNumber: null
        }
      },
      turnInfo: {
        currentPlayerId: "p2",
        phase: "roll",
        turnNumber: 2
      }
    }
  }),
  defineGoldenCase({
    id: "race-goal-settlement-after-last-player",
    title: "Race: settlement starts after the last player reaches goal",
    description: "The last unfinished player should complete the race, receive the next rank, and leave the match in settlement state.",
    scene: {
      mapId: RACE_GAME_MAP_ID,
      layout: [
        "#####",
        "#s..#",
        "#..g#",
        "#####"
      ],
      players: [
        {
          id: "p1",
          name: "P1",
          characterId: "ehh",
          position: { x: 3, y: 2 },
          spawnPosition: { x: 1, y: 1 },
          finishRank: 1,
          finishedTurnNumber: 1
        },
        {
          id: "p2",
          name: "P2",
          characterId: "ehh",
          position: { x: 1, y: 2 },
          spawnPosition: { x: 1, y: 1 },
          tools: [{ toolId: "movement", params: { movePoints: 2 } }]
        }
      ],
      turn: {
        currentPlayerId: "p2",
        phase: "action",
        turnNumber: 2
      }
    },
    steps: [
      {
        kind: "useTool",
        actorId: "p2",
        tool: "movement",
        direction: "right"
      }
    ],
    expect: {
      allowDebugTools: false,
      mapId: RACE_GAME_MAP_ID,
      mode: "race",
      settlementState: "complete",
      players: {
        p1: {
          finishRank: 1,
          finishedTurnNumber: 1
        },
        p2: {
          position: { x: 3, y: 2 },
          finishRank: 2,
          finishedTurnNumber: 2,
          toolCount: 0
        }
      },
      turnInfo: {
        currentPlayerId: "",
        phase: "roll",
        turnNumber: 2
      }
    }
  })
];

// src/goldens/cases/wallet.ts
var GOLDEN_WALLET_CASES = [
  defineGoldenCase({
    id: "leader-deploy-wallet",
    title: "Leader wallet deploy ends the turn",
    description: "Deploying a wallet should create a summon and immediately advance to the next roll phase.",
    scene: {
      layout: [
        "#####",
        "#...#",
        "#...#",
        "#####"
      ],
      players: [
        {
          id: "leader",
          name: "Leader",
          characterId: "leader",
          position: { x: 1, y: 1 },
          tools: [
            {
              toolId: "deployWallet",
              source: "character_skill",
              params: {
                targetRange: 2
              }
            }
          ]
        }
      ],
      turn: {
        currentPlayerId: "leader",
        phase: "action",
        turnNumber: 1
      }
    },
    steps: [
      {
        kind: "useTool",
        actorId: "leader",
        tool: {
          toolId: "deployWallet",
          source: "character_skill"
        },
        targetPosition: { x: 2, y: 1 },
        label: "Deploy wallet"
      }
    ],
    expect: {
      boardLayout: [
        "#####",
        "#...#",
        "#...#",
        "#####"
      ],
      players: {
        leader: {
          position: { x: 1, y: 1 },
          toolCount: 0
        }
      },
      summonCount: 1,
      summons: [
        {
          summonId: "wallet",
          ownerId: "leader",
          position: { x: 2, y: 1 }
        }
      ],
      turnInfo: {
        currentPlayerId: "leader",
        phase: "roll",
        turnNumber: 2
      },
      latestPresentation: {
        toolId: "deployWallet",
        eventKinds: ["state_transition"]
      }
    }
  }),
  defineGoldenCase({
    id: "leader-wallet-active-translate-pass",
    title: "Leader picks up a wallet while translating",
    description: "Active grounded movement should trigger wallet pickup when the actor passes through the wallet tile.",
    scene: {
      layout: [
        "#####",
        "#...#",
        "#...#",
        "#####"
      ],
      players: [
        {
          id: "leader",
          name: "Leader",
          characterId: "leader",
          position: { x: 1, y: 1 },
          tools: [
            {
              toolId: "movement",
              params: {
                movePoints: 1
              }
            }
          ]
        }
      ],
      summons: [
        {
          summonId: "wallet",
          ownerId: "leader",
          position: { x: 2, y: 1 }
        }
      ],
      turn: {
        currentPlayerId: "leader",
        phase: "action"
      },
      seeds: {
        toolDieSeed: 1
      }
    },
    steps: [
      {
        kind: "useTool",
        actorId: "leader",
        tool: "movement",
        direction: "right",
        label: "Walk through wallet"
      }
    ],
    expect: {
      boardLayout: [
        "#####",
        "#...#",
        "#...#",
        "#####"
      ],
      players: {
        leader: {
          position: { x: 2, y: 1 },
          toolCount: 1
        }
      },
      summonCount: 0,
      latestPresentation: {
        toolId: "movement",
        eventKinds: ["player_motion", "state_transition"]
      }
    }
  }),
  defineGoldenCase({
    id: "leader-wallet-active-drag-pass",
    title: "Leader picks up a wallet while dragging",
    description: "Active hookshot self-movement should trigger wallet pickup while passing over the wallet tile.",
    scene: {
      layout: [
        "######",
        "#...##",
        "#....#",
        "######"
      ],
      players: [
        {
          id: "leader",
          name: "Leader",
          characterId: "leader",
          position: { x: 1, y: 1 },
          tools: [
            {
              toolId: "hookshot",
              params: {
                hookLength: 4
              }
            }
          ]
        }
      ],
      summons: [
        {
          summonId: "wallet",
          ownerId: "leader",
          position: { x: 2, y: 1 }
        }
      ],
      turn: {
        currentPlayerId: "leader",
        phase: "action"
      },
      seeds: {
        toolDieSeed: 1
      }
    },
    steps: [
      {
        kind: "useTool",
        actorId: "leader",
        tool: "hookshot",
        direction: "right",
        label: "Hook toward the wall"
      }
    ],
    expect: {
      boardLayout: [
        "######",
        "#...##",
        "#....#",
        "######"
      ],
      players: {
        leader: {
          position: { x: 3, y: 1 },
          toolCount: 1
        }
      },
      summonCount: 0,
      latestPresentation: {
        toolId: "hookshot",
        eventKinds: ["player_motion", "state_transition"]
      }
    }
  }),
  defineGoldenCase({
    id: "leader-wallet-active-leap-stop",
    title: "Leader picks up a wallet on leap landing",
    description: "Active leap movement should trigger wallet pickup on stop when the landing tile contains the wallet.",
    scene: {
      layout: [
        "#####",
        "#...#",
        "#...#",
        "#####"
      ],
      players: [
        {
          id: "leader",
          name: "Leader",
          characterId: "leader",
          position: { x: 1, y: 1 },
          tools: [
            {
              toolId: "jump",
              params: {
                jumpDistance: 2
              }
            }
          ]
        }
      ],
      summons: [
        {
          summonId: "wallet",
          ownerId: "leader",
          position: { x: 3, y: 1 }
        }
      ],
      turn: {
        currentPlayerId: "leader",
        phase: "action"
      },
      seeds: {
        toolDieSeed: 1
      }
    },
    steps: [
      {
        kind: "useTool",
        actorId: "leader",
        tool: "jump",
        direction: "right",
        label: "Jump onto wallet"
      }
    ],
    expect: {
      boardLayout: [
        "#####",
        "#...#",
        "#...#",
        "#####"
      ],
      players: {
        leader: {
          position: { x: 3, y: 1 },
          toolCount: 1
        }
      },
      summonCount: 0,
      latestPresentation: {
        toolId: "jump",
        eventKinds: ["player_motion", "state_transition"]
      }
    }
  }),
  defineGoldenCase({
    id: "leader-wallet-ignores-passive-translate",
    title: "Wallet ignores passive translation",
    description: "Being pushed across a wallet should not trigger pickup because the displacement is passive.",
    scene: {
      layout: [
        "#######",
        "#.....#",
        "#.....#",
        "#######"
      ],
      players: [
        {
          id: "enemy",
          name: "Enemy",
          characterId: "ehh",
          position: { x: 5, y: 1 },
          tools: [
            {
              toolId: "basketball",
              params: {
                projectileRange: 4,
                projectileBounceCount: 0,
                projectilePushDistance: 1
              }
            }
          ]
        },
        {
          id: "leader",
          name: "Leader",
          characterId: "leader",
          position: { x: 3, y: 1 }
        }
      ],
      summons: [
        {
          summonId: "wallet",
          ownerId: "leader",
          position: { x: 2, y: 1 }
        }
      ],
      turn: {
        currentPlayerId: "enemy",
        phase: "action"
      },
      seeds: {
        toolDieSeed: 1
      }
    },
    steps: [
      {
        kind: "useTool",
        actorId: "enemy",
        tool: "basketball",
        direction: "left",
        label: "Push leader onto wallet"
      }
    ],
    expect: {
      boardLayout: [
        "#######",
        "#.....#",
        "#.....#",
        "#######"
      ],
      players: {
        enemy: {
          position: { x: 5, y: 1 },
          toolCount: 0
        },
        leader: {
          position: { x: 2, y: 1 },
          toolCount: 0
        }
      },
      summonCount: 1,
      summons: [
        {
          summonId: "wallet",
          ownerId: "leader",
          position: { x: 2, y: 1 }
        }
      ],
      latestPresentation: {
        toolId: "basketball",
        eventKinds: ["projectile", "player_motion"]
      }
    }
  })
];

// src/goldens/cases/index.ts
var GOLDEN_CASES = [
  ...GOLDEN_CHARACTER_CASES,
  ...GOLDEN_WALLET_CASES,
  ...GOLDEN_MOVEMENT_CASES,
  ...GOLDEN_MULTIPLAYER_CASES,
  ...GOLDEN_RACE_CASES
];

// src/goldens/layout.ts
function clonePosition2(position) {
  return {
    x: position.x,
    y: position.y
  };
}
function toTileKey2(position) {
  return `${position.x},${position.y}`;
}
function buildGoldenLayoutSymbols(overrides = {}) {
  return {
    ...DEFAULT_BOARD_SYMBOLS,
    ...overrides
  };
}
function createBoardDefinitionFromGoldenLayout(layout, symbolOverrides = {}) {
  if (!layout.length) {
    throw new Error("Golden layout must include at least one row.");
  }
  const width = layout[0]?.length ?? 0;
  if (!width) {
    throw new Error("Golden layout rows must not be empty.");
  }
  if (layout.some((row) => row.length !== width)) {
    throw new Error("Golden layout rows must all have the same width.");
  }
  const symbols = buildGoldenLayoutSymbols(symbolOverrides);
  const tiles = [];
  layout.forEach((row, y) => {
    row.split("").forEach((symbol, x) => {
      const definition = symbols[symbol];
      if (!definition) {
        throw new Error(`Unknown golden layout symbol "${symbol}" at (${x}, ${y}).`);
      }
      const position = { x, y };
      tiles.push({
        key: toTileKey2(position),
        x,
        y,
        type: definition.type,
        durability: definition.durability ?? 0,
        direction: definition.direction ?? null
      });
    });
  });
  return {
    width,
    height: layout.length,
    tiles
  };
}
function symbolMatchesTile(symbolDefinition, tile) {
  return symbolDefinition.type === tile.type && (symbolDefinition.durability ?? 0) === tile.durability && (symbolDefinition.direction ?? null) === tile.direction;
}
function serializeGoldenBoardLayout(board, symbolOverrides = {}) {
  const symbols = buildGoldenLayoutSymbols(symbolOverrides);
  const tilesByKey = new Map(
    board.tiles.map((tile) => [tile.key, tile])
  );
  return Array.from(
    { length: board.height },
    (_, y) => Array.from({ length: board.width }, (_2, x) => {
      const position = clonePosition2({ x, y });
      const tile = tilesByKey.get(toTileKey2(position));
      if (!tile) {
        return "?";
      }
      const matchingSymbol = Object.entries(symbols).find(
        ([, symbolDefinition]) => symbolMatchesTile(symbolDefinition, tile)
      );
      return matchingSymbol?.[0] ?? "?";
    }).join("")
  );
}

// src/gameplay.ts
function buildGameMapRuntimeMetadata(mapId) {
  const resolvedMapId = resolveGameMapId(mapId);
  const definition = getGameMapDefinition(resolvedMapId);
  return {
    allowDebugTools: definition.allowDebugTools,
    mapId: resolvedMapId,
    mapLabel: definition.label,
    mode: definition.mode
  };
}
function isPlayerFinished(player) {
  return player.finishRank !== null;
}
function getNextFinishRank(players) {
  return players.reduce((highestRank, player) => Math.max(highestRank, player.finishRank ?? 0), 0) + 1;
}
function buildRaceStandings(players) {
  return players.filter(
    (player) => player.finishRank !== null && player.finishedTurnNumber !== null
  ).sort((left, right) => {
    if (left.finishRank !== right.finishRank) {
      return left.finishRank - right.finishRank;
    }
    if (left.finishedTurnNumber !== right.finishedTurnNumber) {
      return left.finishedTurnNumber - right.finishedTurnNumber;
    }
    return left.id.localeCompare(right.id);
  }).map((player) => ({
    playerId: player.id,
    rank: player.finishRank,
    finishedTurnNumber: player.finishedTurnNumber
  }));
}
function areAllRacePlayersFinished(players) {
  return players.length > 0 && players.every((player) => isPlayerFinished(player));
}
function resolveSettlementState(mode, players) {
  if (mode !== "race") {
    return "active";
  }
  return areAllRacePlayersFinished(players) ? "complete" : "active";
}
function getNextActiveRacePlayerId(playerOrder, players, currentPlayerId) {
  if (!playerOrder.length) {
    return null;
  }
  const finishedIds = new Set(players.filter(isPlayerFinished).map((player) => player.id));
  const startIndex = Math.max(0, playerOrder.findIndex((playerId) => playerId === currentPlayerId));
  for (let offset = 1; offset <= playerOrder.length; offset += 1) {
    const candidateId = playerOrder[(startIndex + offset) % playerOrder.length];
    if (candidateId && !finishedIds.has(candidateId)) {
      return candidateId;
    }
  }
  return null;
}

// src/content/turnStartActions.ts
function defineTurnStartActionRegistry(registry) {
  return registry;
}
var TURN_START_ACTION_REGISTRY = defineTurnStartActionRegistry({
  blazePrepareBomb: {
    label: "\u6295\u5F39\u51C6\u5907",
    description: "\u7ACB\u5373\u7ED3\u675F\u672C\u56DE\u5408\uFF0C\u5E76\u5728\u4F60\u7684\u4E0B\u4E2A\u56DE\u5408\u5F00\u59CB\u65F6\u83B7\u5F97\u4E00\u4E2A\u3010\u6295\u5F39\u3011\u5DE5\u5177\u3002",
    color: "#d86a42"
  },
  volatySkipToolDie: {
    label: "\u5F03\u9AB0\u98DE\u8DC3",
    description: "\u653E\u5F03\u672C\u56DE\u5408\u5DE5\u5177\u9AB0\uFF0C\u4EC5\u63B7\u79FB\u52A8\u9AB0\uFF0C\u5E76\u8BA9\u672C\u56DE\u5408\u7684\u79FB\u52A8\u884C\u52A8\u6309\u98DE\u8DC3\u7ED3\u7B97\u3002",
    color: "#77b8ff"
  }
});

// src/turnStartActions.ts
function materializeTurnStartActionDefinitions() {
  return Object.fromEntries(
    Object.entries(TURN_START_ACTION_REGISTRY).map(([actionId, definition]) => [
      actionId,
      {
        id: actionId,
        ...definition
      }
    ])
  );
}
var TURN_START_ACTION_DEFINITIONS = materializeTurnStartActionDefinitions();
function getTurnStartActionDefinition(actionId) {
  return TURN_START_ACTION_DEFINITIONS[actionId];
}
function createTurnStartActionSnapshot(actionId, characterId) {
  return {
    actionId,
    characterId
  };
}

// src/simulation/engine.ts
function clonePosition3(position) {
  return {
    x: position.x,
    y: position.y
  };
}
function cloneTurnInfo(turnInfo) {
  return {
    currentPlayerId: turnInfo.currentPlayerId,
    phase: turnInfo.phase,
    turnNumber: turnInfo.turnNumber,
    moveRoll: turnInfo.moveRoll,
    lastRolledToolId: turnInfo.lastRolledToolId,
    turnStartActions: turnInfo.turnStartActions.map((action) => ({
      ...action
    })),
    toolDieSeed: turnInfo.toolDieSeed
  };
}
function cloneGameSnapshot(snapshot) {
  return {
    ...snapshot,
    hostPlayerId: snapshot.hostPlayerId,
    tiles: snapshot.tiles.map((tile) => ({ ...tile })),
    players: snapshot.players.map((player) => ({
      ...player,
      boardVisible: player.boardVisible,
      characterState: cloneCharacterState(player.characterState),
      finishRank: player.finishRank,
      finishedTurnNumber: player.finishedTurnNumber,
      isConnected: player.isConnected,
      isReady: player.isReady,
      petId: player.petId,
      position: clonePosition3(player.position),
      spawnPosition: clonePosition3(player.spawnPosition),
      tools: player.tools.map((tool) => ({
        ...tool,
        params: {
          ...tool.params
        }
      })),
      turnFlags: [...player.turnFlags]
    })),
    summons: snapshot.summons.map((summon) => ({
      ...summon,
      position: clonePosition3(summon.position)
    })),
    eventLog: snapshot.eventLog.map((entry) => ({ ...entry })),
    turnInfo: cloneTurnInfo(snapshot.turnInfo),
    latestPresentation: snapshot.latestPresentation ? {
      ...snapshot.latestPresentation,
      events: snapshot.latestPresentation.events.map(
        (event) => event.kind === "state_transition" ? {
          ...event,
          tileTransitions: event.tileTransitions.map((transition) => ({
            ...transition,
            before: { ...transition.before },
            after: { ...transition.after }
          })),
          summonTransitions: event.summonTransitions.map((transition) => ({
            ...transition,
            before: transition.before ? { ...transition.before, position: { ...transition.before.position } } : null,
            after: transition.after ? { ...transition.after, position: { ...transition.after.position } } : null
          })),
          playerTransitions: event.playerTransitions.map((transition) => ({
            ...transition,
            before: { ...transition.before },
            after: { ...transition.after }
          }))
        } : {
          ...event
        }
      )
    } : null
  };
}
function buildBoardDefinition(snapshot) {
  return {
    width: snapshot.boardWidth,
    height: snapshot.boardHeight,
    tiles: snapshot.tiles.map((tile) => ({
      ...tile,
      direction: tile.direction
    }))
  };
}
function buildBoardPlayers(snapshot) {
  return snapshot.players.filter((player) => player.boardVisible).map((player) => ({
    id: player.id,
    boardVisible: player.boardVisible,
    characterId: player.characterId,
    characterState: cloneCharacterState(player.characterState),
    position: clonePosition3(player.position),
    spawnPosition: clonePosition3(player.spawnPosition),
    turnFlags: [...player.turnFlags]
  }));
}
function buildBoardSummons(snapshot) {
  return snapshot.summons.map((summon) => ({
    instanceId: summon.instanceId,
    ownerId: summon.ownerId,
    position: clonePosition3(summon.position),
    summonId: summon.summonId
  }));
}
function findPlayer(snapshot, playerId) {
  return snapshot.players.find((player) => player.id === playerId);
}
function isRaceMode(state) {
  return state.snapshot.mode === "race";
}
function normalizePlayerTools(player, tools) {
  return applyCharacterToolTransforms(player.characterId, tools);
}
function clearPlayerTurnResources(player) {
  player.tools = [];
  player.turnFlags = [];
}
function applyPlayerTurnFlags(player, turnFlags) {
  player.turnFlags = [...turnFlags];
}
function applyToolInventory(player, tools) {
  player.tools = normalizePlayerTools(player, tools);
}
function applyCharacterState(player, characterState) {
  player.characterState = cloneCharacterState(characterState);
}
function applyTileMutations(snapshot, tileMutations) {
  const tilesByKey = new Map(snapshot.tiles.map((tile) => [tile.key, tile]));
  for (const mutation of tileMutations) {
    const tile = tilesByKey.get(mutation.key);
    if (!tile) {
      continue;
    }
    tile.type = mutation.nextType;
    tile.durability = mutation.nextDurability;
    tile.direction = null;
  }
}
function applySummonMutations(snapshot, summonMutations) {
  const summonsById = new Map(
    snapshot.summons.map((summon) => [summon.instanceId, summon])
  );
  for (const mutation of summonMutations) {
    if (mutation.kind === "remove") {
      summonsById.delete(mutation.instanceId);
      continue;
    }
    summonsById.set(mutation.instanceId, {
      instanceId: mutation.instanceId,
      summonId: mutation.summonId,
      ownerId: mutation.ownerId,
      position: clonePosition3(mutation.position)
    });
  }
  snapshot.summons = Array.from(summonsById.values());
}
function applyAffectedPlayerMoves(snapshot, affectedPlayers) {
  for (const affectedPlayer of affectedPlayers) {
    const player = findPlayer(snapshot, affectedPlayer.playerId);
    if (!player) {
      continue;
    }
    player.position = clonePosition3(affectedPlayer.target);
    if (affectedPlayer.turnFlags) {
      applyPlayerTurnFlags(player, affectedPlayer.turnFlags);
    }
    if (affectedPlayer.characterState) {
      applyCharacterState(player, affectedPlayer.characterState);
    }
  }
}
function markOutOfTurnMovement(snapshot, activePlayerId, affectedPlayers) {
  for (const affectedPlayer of affectedPlayers) {
    if (affectedPlayer.playerId === activePlayerId) {
      continue;
    }
    const player = findPlayer(snapshot, affectedPlayer.playerId);
    if (!player) {
      continue;
    }
    applyCharacterState(
      player,
      markCharacterMovedOutOfTurn(player.characterId, player.characterState)
    );
  }
}
function pushEvent(state, type, message) {
  const entry = {
    id: `simulation-event-${state.eventSerial}`,
    type,
    message,
    createdAt: state.eventSerial
  };
  state.eventSerial += 1;
  state.snapshot.eventLog = [...state.snapshot.eventLog, entry].slice(-10);
}
function pushTerrainEvents(state, actorId, triggeredTerrainEffects) {
  const actor = findPlayer(state.snapshot, actorId);
  for (const terrainEffect of triggeredTerrainEffects) {
    const affectedPlayer = findPlayer(state.snapshot, terrainEffect.playerId);
    if (!affectedPlayer) {
      continue;
    }
    if (terrainEffect.kind === "pit") {
      pushEvent(
        state,
        "player_respawned",
        `${affectedPlayer.name} fell into a pit and respawned at (${terrainEffect.respawnPosition.x}, ${terrainEffect.respawnPosition.y}).`
      );
      continue;
    }
    if (terrainEffect.kind === "lucky") {
      pushEvent(
        state,
        "terrain_triggered",
        `${affectedPlayer.name} landed on a lucky block and gained ${getToolDefinition(terrainEffect.grantedTool.toolId).label}.`
      );
      continue;
    }
    if (terrainEffect.kind === "conveyor_boost" && actor) {
      pushEvent(
        state,
        "terrain_triggered",
        `${actor.name} rode a conveyor for +${terrainEffect.bonusMovePoints} move points.`
      );
      continue;
    }
    if (terrainEffect.kind === "conveyor_turn" && actor) {
      pushEvent(
        state,
        "terrain_triggered",
        `${actor.name} was redirected from ${terrainEffect.fromDirection} to ${terrainEffect.toDirection}.`
      );
    }
  }
}
function pushSummonEvents(state, triggeredSummonEffects) {
  for (const summonEffect of triggeredSummonEffects) {
    if (summonEffect.kind !== "wallet_pickup") {
      continue;
    }
    const player = findPlayer(state.snapshot, summonEffect.playerId);
    if (!player) {
      continue;
    }
    pushEvent(
      state,
      "summon_triggered",
      `${player.name} picked up a wallet and gained ${getToolDefinition(summonEffect.grantedTool.toolId).label}.`
    );
  }
}
function enterSettlementState(state) {
  state.snapshot.turnInfo.currentPlayerId = "";
  state.snapshot.turnInfo.phase = "roll";
  state.snapshot.turnInfo.moveRoll = 0;
  state.snapshot.turnInfo.lastRolledToolId = null;
  state.snapshot.turnInfo.turnStartActions = [];
  state.snapshot.settlementState = "complete";
}
function applyRaceGoalProgress(state, actorId, triggeredTerrainEffects) {
  if (!isRaceMode(state)) {
    return {
      actorFinished: false,
      settlementComplete: false
    };
  }
  let actorFinished = false;
  const goalPlayerIds = [
    ...new Set(
      triggeredTerrainEffects.filter((effect) => effect.kind === "goal").map((effect) => effect.playerId)
    )
  ];
  for (const playerId of goalPlayerIds) {
    const player = findPlayer(state.snapshot, playerId);
    if (!player || player.finishRank !== null) {
      continue;
    }
    player.finishRank = getNextFinishRank(state.snapshot.players);
    player.finishedTurnNumber = state.snapshot.turnInfo.turnNumber;
    player.boardVisible = false;
    actorFinished = actorFinished || player.id === actorId;
    pushEvent(
      state,
      "player_finished",
      `${player.name} reached the goal on turn ${state.snapshot.turnInfo.turnNumber} and finished #${player.finishRank}.`
    );
  }
  const settlementState = resolveSettlementState(state.snapshot.mode, state.snapshot.players);
  const settlementComplete = settlementState === "complete";
  if (settlementComplete && state.snapshot.settlementState !== "complete") {
    enterSettlementState(state);
    pushEvent(state, "match_finished", "All players reached the goal. Settlement is ready.");
  } else {
    state.snapshot.settlementState = settlementState;
  }
  return {
    actorFinished,
    settlementComplete
  };
}
function publishActionPresentation(state, presentation) {
  if (!presentation) {
    return;
  }
  state.snapshot.latestPresentation = {
    ...presentation,
    sequence: state.nextPresentationSequence
  };
  state.nextPresentationSequence += 1;
}
function detectNextToolInstanceSerial(players) {
  const serials = players.flatMap(
    (player) => player.tools.map((tool) => {
      const match = tool.instanceId.match(/-(\d+)$/);
      return match ? Number(match[1]) : 0;
    })
  );
  return Math.max(1, ...serials.length ? serials.map((value) => value + 1) : [1]);
}
function createToolInstanceId(state, toolId) {
  const instanceId = `${toolId}-${state.nextToolInstanceSerial}`;
  state.nextToolInstanceSerial += 1;
  return instanceId;
}
function materializeSceneTool(state, toolDefinition) {
  return createToolInstance(
    toolDefinition.instanceId ?? createToolInstanceId(state, toolDefinition.toolId),
    toolDefinition.toolId,
    {
      ...toolDefinition.charges !== void 0 ? { charges: toolDefinition.charges } : {},
      ...toolDefinition.params ? { params: toolDefinition.params } : {},
      ...toolDefinition.source ? { source: toolDefinition.source } : {}
    }
  );
}
function buildTurnActionTools(state, player, baseTools) {
  const runtimeLoadout = buildCharacterTurnLoadoutRuntime(
    player.characterId,
    player.characterState
  );
  applyCharacterState(player, runtimeLoadout.nextCharacterState);
  return normalizePlayerTools(player, [
    ...baseTools,
    ...runtimeLoadout.loadout.map((tool) => materializeSceneTool(state, tool))
  ]);
}
function refreshTurnStartActions(state, player, actionIds) {
  state.snapshot.turnInfo.turnStartActions = actionIds.map(
    (actionId) => createTurnStartActionSnapshot(actionId, player.characterId)
  );
}
function applyTurnStartStop(state, player) {
  const stopResolution = resolveCurrentTileStop(
    {
      activeTool: null,
      actorId: player.id,
      board: buildBoardDefinition(state.snapshot),
      players: buildBoardPlayers(state.snapshot),
      sourceId: `turn-start:${player.id}:${state.snapshot.turnInfo.turnNumber}`,
      summons: buildBoardSummons(state.snapshot)
    },
    {
      player: {
        characterId: player.characterId,
        characterState: cloneCharacterState(player.characterState),
        id: player.id,
        position: clonePosition3(player.position),
        spawnPosition: clonePosition3(player.spawnPosition),
        turnFlags: [...player.turnFlags]
      },
      toolDieSeed: state.toolDieSeed,
      tools: [...player.tools]
    }
  );
  player.position = clonePosition3(stopResolution.actor.position);
  applyCharacterState(player, stopResolution.actor.characterState);
  applyPlayerTurnFlags(player, stopResolution.actor.turnFlags);
  applyToolInventory(player, stopResolution.tools);
  applyTileMutations(state.snapshot, stopResolution.tileMutations);
  applySummonMutations(state.snapshot, stopResolution.summonMutations);
  state.toolDieSeed = stopResolution.nextToolDieSeed;
  state.snapshot.turnInfo.toolDieSeed = state.toolDieSeed;
  pushTerrainEvents(state, player.id, stopResolution.triggeredTerrainEffects);
  pushSummonEvents(state, stopResolution.triggeredSummonEffects);
  return stopResolution.triggeredTerrainEffects;
}
function prepareTurnStartState(player) {
  const preparation = prepareCharacterTurnStart(player.characterId, player.characterState);
  applyCharacterState(player, preparation.nextCharacterState);
  return preparation;
}
function enterActionPhaseWithRoll(state, player, moveRoll, rolledTool) {
  applyToolInventory(
    player,
    buildTurnActionTools(
      state,
      player,
      [
        ...player.tools,
        createMovementToolInstance(createToolInstanceId(state, "movement"), moveRoll),
        ...rolledTool ? [rolledTool] : []
      ]
    )
  );
  state.snapshot.turnInfo.phase = "action";
  state.snapshot.turnInfo.moveRoll = moveRoll;
  state.snapshot.turnInfo.lastRolledToolId = rolledTool?.toolId ?? null;
  state.snapshot.turnInfo.turnStartActions = [];
  state.snapshot.turnInfo.toolDieSeed = state.toolDieSeed;
}
function finishTurn(state, player, message) {
  pushEvent(state, "turn_ended", message);
  applyCharacterState(
    player,
    applyCharacterTurnEndCleanup(player.characterId, player.characterState)
  );
  clearPlayerTurnResources(player);
  beginTurnFor(state, getNextPlayerId(state, player.id), true);
}
function beginTurnFor(state, playerId, shouldAdvanceTurnNumber) {
  const player = findPlayer(state.snapshot, playerId);
  if (!player) {
    return;
  }
  const preparation = prepareTurnStartState(player);
  clearPlayerTurnResources(player);
  state.snapshot.turnInfo.currentPlayerId = playerId;
  state.snapshot.turnInfo.phase = "roll";
  state.snapshot.turnInfo.moveRoll = 0;
  state.snapshot.turnInfo.lastRolledToolId = null;
  refreshTurnStartActions(state, player, preparation.turnStartActions);
  state.snapshot.turnInfo.toolDieSeed = state.toolDieSeed;
  if (shouldAdvanceTurnNumber) {
    state.snapshot.turnInfo.turnNumber += 1;
  }
  pushEvent(state, "turn_started", `${player.name}'s turn started. Roll the dice.`);
  const triggeredTerrainEffects = applyTurnStartStop(state, player);
  const goalProgress = applyRaceGoalProgress(state, player.id, triggeredTerrainEffects);
  if (!goalProgress.actorFinished || goalProgress.settlementComplete) {
    return;
  }
  clearPlayerTurnResources(player);
  const nextPlayerId = getNextPlayerId(state, player.id);
  if (nextPlayerId === player.id) {
    enterSettlementState(state);
    pushEvent(state, "match_finished", "All players reached the goal. Settlement is ready.");
    return;
  }
  beginTurnFor(state, nextPlayerId, true);
}
function getNextPlayerId(state, currentPlayerId) {
  if (isRaceMode(state)) {
    return getNextActiveRacePlayerId(
      state.playerOrder,
      state.snapshot.players,
      currentPlayerId
    ) ?? currentPlayerId;
  }
  const currentIndex = state.playerOrder.findIndex((playerId) => playerId === currentPlayerId);
  if (currentIndex < 0) {
    return state.playerOrder[0] ?? currentPlayerId;
  }
  return state.playerOrder[(currentIndex + 1) % state.playerOrder.length] ?? currentPlayerId;
}
function ensureActivePlayer(state, actorId) {
  const player = findPlayer(state.snapshot, actorId);
  if (!player) {
    return null;
  }
  if (state.snapshot.turnInfo.currentPlayerId !== actorId) {
    return null;
  }
  return player;
}
function buildBlockedOutcome(reason) {
  return {
    status: "blocked",
    reason,
    message: reason
  };
}
function runRollDiceCommand(state, actorId) {
  const player = ensureActivePlayer(state, actorId);
  if (!player) {
    return buildBlockedOutcome(`Player ${actorId} cannot roll right now.`);
  }
  if (state.snapshot.turnInfo.phase !== "roll") {
    return buildBlockedOutcome(`${player.name} cannot roll right now.`);
  }
  const movementRoll = rollMovementDie(state.moveDieSeed);
  state.moveDieSeed = movementRoll.nextSeed;
  const toolRoll = rollToolDie(state.toolDieSeed);
  state.toolDieSeed = toolRoll.nextSeed;
  enterActionPhaseWithRoll(
    state,
    player,
    movementRoll.value,
    createRolledToolInstance(createToolInstanceId(state, toolRoll.value.toolId), toolRoll.value)
  );
  pushEvent(
    state,
    "dice_rolled",
    `${player.name} rolled Movement ${movementRoll.value} and ${getToolDefinition(toolRoll.value.toolId).label}.`
  );
  return {
    status: "ok",
    message: `${player.name} rolled successfully.`
  };
}
function runUseTurnStartActionCommand(state, actorId, payload) {
  const player = ensureActivePlayer(state, actorId);
  if (!player) {
    return buildBlockedOutcome(`Player ${actorId} cannot act right now.`);
  }
  if (state.snapshot.turnInfo.phase !== "roll") {
    return buildBlockedOutcome(`${player.name} can only use this action before rolling.`);
  }
  const availableAction = state.snapshot.turnInfo.turnStartActions.find(
    (action) => action.actionId === payload.actionId
  );
  if (!availableAction) {
    return buildBlockedOutcome(`${player.name} cannot use that roll-phase action right now.`);
  }
  const resolution = resolveCharacterTurnStartAction(
    player.characterId,
    player.characterState,
    payload.actionId
  );
  if (!resolution) {
    return buildBlockedOutcome(`${player.name} cannot use that roll-phase action right now.`);
  }
  applyCharacterState(player, resolution.nextCharacterState);
  pushEvent(
    state,
    "character_action_used",
    `${player.name} used ${getTurnStartActionDefinition(availableAction.actionId).label}.`
  );
  if (resolution.endTurn) {
    finishTurn(state, player, `${player.name} ended the turn.`);
    return {
      status: "ok",
      message: `${player.name} prepared the next turn.`
    };
  }
  if (resolution.skipToolDie) {
    const movementRoll = rollMovementDie(state.moveDieSeed);
    state.moveDieSeed = movementRoll.nextSeed;
    enterActionPhaseWithRoll(state, player, movementRoll.value, null);
    pushEvent(
      state,
      "dice_rolled",
      `${player.name} rolled Movement ${movementRoll.value} and skipped the tool die.`
    );
    return {
      status: "ok",
      message: `${player.name} entered leap mode for this turn.`
    };
  }
  return {
    status: "ok",
    message: `${player.name} used a roll-phase action.`
  };
}
function runUseToolCommand(state, actorId, payload) {
  const player = ensureActivePlayer(state, actorId);
  if (!player) {
    return buildBlockedOutcome(`Player ${actorId} cannot act right now.`);
  }
  if (state.snapshot.turnInfo.phase !== "action") {
    return buildBlockedOutcome(`${player.name} must roll dice first.`);
  }
  const activeTool = findToolInstance(player.tools, payload.toolInstanceId);
  if (!activeTool) {
    return buildBlockedOutcome(`${player.name} does not have the selected tool.`);
  }
  const resolution = resolveToolAction({
    board: buildBoardDefinition(state.snapshot),
    actor: {
      id: player.id,
      characterId: player.characterId,
      characterState: cloneCharacterState(player.characterState),
      position: clonePosition3(player.position),
      spawnPosition: clonePosition3(player.spawnPosition),
      turnFlags: [...player.turnFlags]
    },
    activeTool,
    ...payload.direction ? { direction: payload.direction } : {},
    ...payload.choiceId ? { choiceId: payload.choiceId } : {},
    ...payload.targetPosition ? { targetPosition: clonePosition3(payload.targetPosition) } : {},
    players: buildBoardPlayers(state.snapshot),
    summons: buildBoardSummons(state.snapshot),
    toolDieSeed: state.toolDieSeed,
    tools: [...player.tools]
  });
  if (resolution.kind === "blocked") {
    pushEvent(
      state,
      "move_blocked",
      `${player.name} cannot use ${getToolDefinition(activeTool.toolId).label}: ${resolution.reason}.`
    );
    return buildBlockedOutcome(resolution.reason);
  }
  player.position = clonePosition3(resolution.actor.position);
  applyCharacterState(player, resolution.actor.characterState);
  applyPlayerTurnFlags(player, resolution.actor.turnFlags);
  applyToolInventory(player, resolution.tools);
  applyTileMutations(state.snapshot, resolution.tileMutations);
  applySummonMutations(state.snapshot, resolution.summonMutations);
  applyAffectedPlayerMoves(state.snapshot, resolution.affectedPlayers);
  markOutOfTurnMovement(state.snapshot, player.id, resolution.affectedPlayers);
  state.toolDieSeed = resolution.nextToolDieSeed;
  state.snapshot.turnInfo.toolDieSeed = state.toolDieSeed;
  publishActionPresentation(state, resolution.presentation);
  if (resolution.tileMutations.some((mutation) => mutation.nextType === "floor")) {
    pushEvent(state, "earth_wall_broken", `${player.name} broke an earth wall while moving.`);
  }
  pushTerrainEvents(state, player.id, resolution.triggeredTerrainEffects);
  pushSummonEvents(state, resolution.triggeredSummonEffects);
  const goalProgress = applyRaceGoalProgress(state, player.id, resolution.triggeredTerrainEffects);
  if (activeTool.toolId === "movement") {
    pushEvent(
      state,
      "piece_moved",
      `${player.name} used Movement ${payload.direction} to (${player.position.x}, ${player.position.y}).`
    );
  } else {
    pushEvent(state, "tool_used", `${player.name} used ${getToolDefinition(activeTool.toolId).label}.`);
  }
  if (goalProgress.actorFinished) {
    clearPlayerTurnResources(player);
    if (!goalProgress.settlementComplete) {
      const nextPlayerId = getNextPlayerId(state, player.id);
      if (nextPlayerId !== player.id) {
        beginTurnFor(state, nextPlayerId, true);
      }
    }
    return {
      status: "ok",
      message: resolution.summary
    };
  }
  if (!resolution.endsTurn) {
    return {
      status: "ok",
      message: resolution.summary
    };
  }
  finishTurn(state, player, `${player.name} ended the turn.`);
  return {
    status: "ok",
    message: resolution.summary
  };
}
function runEndTurnCommand(state, actorId) {
  const player = ensureActivePlayer(state, actorId);
  if (!player) {
    return buildBlockedOutcome(`Player ${actorId} cannot end the turn right now.`);
  }
  if (state.snapshot.turnInfo.phase !== "action") {
    return buildBlockedOutcome(`${player.name} must roll before ending the turn.`);
  }
  finishTurn(state, player, `${player.name} ended the turn.`);
  return {
    status: "ok",
    message: `${player.name} ended the turn.`
  };
}
function runSetCharacterCommand(state, actorId, characterId) {
  const player = ensureActivePlayer(state, actorId);
  if (!player) {
    return buildBlockedOutcome(`Player ${actorId} cannot switch character right now.`);
  }
  if (state.snapshot.turnInfo.phase !== "roll") {
    return buildBlockedOutcome(`${player.name} can only switch character before rolling.`);
  }
  if (!getCharacterIds().includes(characterId)) {
    return buildBlockedOutcome(`${player.name} tried to switch to an unknown character.`);
  }
  player.characterId = characterId;
  applyCharacterState(player, {});
  refreshTurnStartActions(
    state,
    player,
    [...getCharacterDefinition(player.characterId).turnStartActionIds]
  );
  pushEvent(
    state,
    "character_switched",
    `${player.name} switched to ${getCharacterDefinition(player.characterId).label}.`
  );
  return {
    status: "ok",
    message: `${player.name} switched to ${player.characterId}.`
  };
}
function runGrantDebugToolCommand(state, actorId, toolId) {
  const player = ensureActivePlayer(state, actorId);
  if (!player) {
    return buildBlockedOutcome(`Player ${actorId} cannot receive a debug tool right now.`);
  }
  if (state.snapshot.turnInfo.phase !== "action") {
    return buildBlockedOutcome(`${player.name} must roll before granting a debug tool.`);
  }
  if (!state.snapshot.allowDebugTools) {
    return buildBlockedOutcome("Debug tools are disabled on this map.");
  }
  const definition = getToolDefinition(toolId);
  if (!definition.debugGrantable) {
    return buildBlockedOutcome(`${definition.label} cannot be debug-granted right now.`);
  }
  const grantedTool = toolId === "movement" ? createMovementToolInstance(createToolInstanceId(state, "movement"), 4) : createDebugToolInstance(createToolInstanceId(state, toolId), toolId);
  applyToolInventory(player, [...player.tools, grantedTool]);
  pushEvent(state, "debug_granted", `${player.name} debug gained ${definition.label}.`);
  return {
    status: "ok",
    message: `${player.name} gained ${definition.label}.`
  };
}
function dispatchSimulationCommand(state, command) {
  switch (command.kind) {
    case "rollDice":
      return runRollDiceCommand(state, command.actorId);
    case "useTurnStartAction":
      return runUseTurnStartActionCommand(state, command.actorId, command.payload);
    case "useTool":
      return runUseToolCommand(state, command.actorId, command.payload);
    case "endTurn":
      return runEndTurnCommand(state, command.actorId);
    case "setCharacter":
      return runSetCharacterCommand(state, command.actorId, command.payload.characterId);
    case "grantDebugTool":
      return runGrantDebugToolCommand(state, command.actorId, command.payload.toolId);
  }
}
function createInitialState(sceneDefinition) {
  if (!sceneDefinition.players.length) {
    throw new Error("Simulation scene must define at least one player.");
  }
  const mapMetadata = sceneDefinition.mapId === "custom" ? {
    allowDebugTools: sceneDefinition.allowDebugTools ?? false,
    mapId: "custom",
    mapLabel: sceneDefinition.mapLabel ?? "\u81EA\u5B9A\u4E49\u573A\u666F",
    mode: sceneDefinition.mode ?? "free"
  } : buildGameMapRuntimeMetadata(sceneDefinition.mapId);
  const board = createBoardDefinitionFromGoldenLayout(
    sceneDefinition.layout,
    sceneDefinition.symbols
  );
  const firstPlayerId = sceneDefinition.players[0]?.id ?? "";
  const players = sceneDefinition.players.map((player, index) => ({
    id: player.id,
    name: player.name ?? player.id,
    petId: player.petId ?? "",
    color: player.color ?? PLAYER_COLORS[index % PLAYER_COLORS.length] ?? "#ec6f5a",
    boardVisible: player.boardVisible ?? player.finishRank == null,
    characterId: player.characterId ?? "late",
    characterState: cloneCharacterState(player.characterState ?? {}),
    finishRank: player.finishRank ?? null,
    finishedTurnNumber: player.finishedTurnNumber ?? null,
    isConnected: true,
    isReady: false,
    position: clonePosition3(player.position),
    spawnPosition: clonePosition3(player.spawnPosition ?? player.position),
    tools: [],
    turnFlags: [...player.turnFlags ?? []]
  }));
  const state = {
    eventSerial: 1,
    moveDieSeed: sceneDefinition.seeds?.moveDieSeed ?? 11,
    nextPresentationSequence: sceneDefinition.seeds?.nextPresentationSequence ?? 1,
    nextToolInstanceSerial: sceneDefinition.seeds?.nextToolInstanceSerial ?? 1,
    playerOrder: players.map((player) => player.id),
    snapshot: {
      allowDebugTools: mapMetadata.allowDebugTools,
      boardWidth: board.width,
      boardHeight: board.height,
      hostPlayerId: players[0]?.id ?? null,
      tiles: board.tiles,
      players,
      mapId: mapMetadata.mapId,
      mapLabel: mapMetadata.mapLabel,
      mode: mapMetadata.mode,
      roomCode: sceneDefinition.mapId ?? "local-sim",
      roomPhase: "in_game",
      settlementState: sceneDefinition.settlementState ?? resolveSettlementState(mapMetadata.mode, players),
      summons: [],
      eventLog: [],
      latestPresentation: null,
      turnInfo: {
        currentPlayerId: sceneDefinition.turn?.currentPlayerId ?? firstPlayerId,
        phase: sceneDefinition.turn?.phase ?? "action",
        moveRoll: sceneDefinition.turn?.moveRoll ?? 0,
        lastRolledToolId: sceneDefinition.turn?.lastRolledToolId ?? null,
        turnStartActions: [],
        toolDieSeed: sceneDefinition.turn?.toolDieSeed ?? sceneDefinition.seeds?.toolDieSeed ?? 1,
        turnNumber: sceneDefinition.turn?.turnNumber ?? 1
      }
    },
    toolDieSeed: sceneDefinition.seeds?.toolDieSeed ?? sceneDefinition.turn?.toolDieSeed ?? 1
  };
  for (const scenePlayer of sceneDefinition.players) {
    const player = findPlayer(state.snapshot, scenePlayer.id);
    if (!player) {
      continue;
    }
    applyToolInventory(
      player,
      (scenePlayer.tools ?? []).map((tool) => materializeSceneTool(state, tool))
    );
  }
  state.snapshot.summons = (sceneDefinition.summons ?? []).map((summon, index) => ({
    instanceId: summon.instanceId ?? `${summon.summonId}-${index + 1}`,
    summonId: summon.summonId,
    ownerId: summon.ownerId,
    position: clonePosition3(summon.position)
  }));
  if (sceneDefinition.seeds?.nextToolInstanceSerial === void 0) {
    state.nextToolInstanceSerial = detectNextToolInstanceSerial(state.snapshot.players);
  }
  if (state.snapshot.turnInfo.phase === "roll") {
    const activePlayer = findPlayer(state.snapshot, state.snapshot.turnInfo.currentPlayerId);
    if (activePlayer) {
      const preparation = prepareTurnStartState(activePlayer);
      refreshTurnStartActions(state, activePlayer, preparation.turnStartActions);
      const triggeredTerrainEffects = applyTurnStartStop(state, activePlayer);
      const goalProgress = applyRaceGoalProgress(state, activePlayer.id, triggeredTerrainEffects);
      if (goalProgress.actorFinished && !goalProgress.settlementComplete) {
        clearPlayerTurnResources(activePlayer);
        const nextPlayerId = getNextPlayerId(state, activePlayer.id);
        if (nextPlayerId !== activePlayer.id) {
          beginTurnFor(state, nextPlayerId, true);
        }
      }
    }
  }
  return state;
}
var LocalGameSimulation = class {
  constructor(sceneDefinition) {
    this.state = createInitialState(sceneDefinition);
  }
  // Callers receive a cloned snapshot so test assertions cannot mutate simulator state.
  getSnapshot() {
    return cloneGameSnapshot(this.state.snapshot);
  }
  // Commands mirror the same high-level user intents used by the room protocol.
  dispatch(command) {
    const outcome = dispatchSimulationCommand(this.state, command);
    return {
      outcome,
      snapshot: this.getSnapshot()
    };
  }
};
function createGameSimulation(sceneDefinition) {
  return new LocalGameSimulation(sceneDefinition);
}

// src/goldens/runner.ts
function clonePosition4(position) {
  return {
    x: position.x,
    y: position.y
  };
}
function cloneTurnInfo2(turnInfo) {
  return {
    currentPlayerId: turnInfo.currentPlayerId,
    phase: turnInfo.phase,
    turnNumber: turnInfo.turnNumber,
    moveRoll: turnInfo.moveRoll,
    lastRolledToolId: turnInfo.lastRolledToolId,
    turnStartActions: turnInfo.turnStartActions.map((action) => ({
      ...action
    })),
    toolDieSeed: turnInfo.toolDieSeed
  };
}
function resolveToolSelector(toolSelector) {
  return typeof toolSelector === "string" ? { toolId: toolSelector } : toolSelector;
}
function findToolBySelector(tools, toolSelector) {
  const normalizedSelector = resolveToolSelector(toolSelector);
  if (normalizedSelector.instanceId) {
    return findToolInstance(tools, normalizedSelector.instanceId);
  }
  const candidates = tools.filter((tool) => {
    if (normalizedSelector.toolId && tool.toolId !== normalizedSelector.toolId) {
      return false;
    }
    if (normalizedSelector.source && tool.source !== normalizedSelector.source) {
      return false;
    }
    return true;
  });
  return candidates[normalizedSelector.nth ?? 0];
}
function buildBlockedOutcome2(message) {
  return {
    message,
    reason: message,
    status: "blocked"
  };
}
function executeGoldenStep(snapshot, simulation, step) {
  switch (step.kind) {
    case "rollDice":
      return simulation.dispatch({
        kind: "rollDice",
        actorId: step.actorId
      });
    case "useTurnStartAction":
      return simulation.dispatch({
        kind: "useTurnStartAction",
        actorId: step.actorId,
        payload: {
          actionId: step.actionId
        }
      });
    case "endTurn":
      return simulation.dispatch({
        kind: "endTurn",
        actorId: step.actorId
      });
    case "setCharacter":
      return simulation.dispatch({
        kind: "setCharacter",
        actorId: step.actorId,
        payload: {
          characterId: step.characterId
        }
      });
    case "grantDebugTool":
      return simulation.dispatch({
        kind: "grantDebugTool",
        actorId: step.actorId,
        payload: {
          toolId: step.toolId
        }
      });
    case "useTool": {
      const actor = snapshot.players.find((player) => player.id === step.actorId);
      if (!actor) {
        return {
          outcome: buildBlockedOutcome2(`Player ${step.actorId} cannot act right now.`),
          snapshot
        };
      }
      const activeTool = findToolBySelector(actor.tools, step.tool);
      if (!activeTool) {
        return {
          outcome: buildBlockedOutcome2(`${actor.name} does not have the selected tool.`),
          snapshot
        };
      }
      return simulation.dispatch({
        kind: "useTool",
        actorId: step.actorId,
        payload: {
          toolInstanceId: activeTool.instanceId,
          ...step.choiceId ? { choiceId: step.choiceId } : {},
          ...step.direction ? { direction: step.direction } : {},
          ...step.targetPosition ? { targetPosition: clonePosition4(step.targetPosition) } : {}
        }
      });
    }
  }
}
function handleStepExpectation(step, outcome) {
  const blockedReason = step.expect?.blockedReasonIncludes;
  if (!blockedReason) {
    return {
      label: step.label ?? `${step.kind}:${step.actorId}`,
      message: outcome.message,
      passed: outcome.status === "ok",
      status: outcome.status
    };
  }
  return {
    label: step.label ?? `${step.kind}:${step.actorId}`,
    message: outcome.message,
    passed: outcome.status === "blocked" && Boolean(outcome.reason?.includes(blockedReason)),
    status: outcome.status
  };
}
function summarizePlayers(players) {
  return Object.fromEntries(
    players.map((player) => [
      player.id,
      {
        characterId: player.characterId,
        color: player.color,
        finishRank: player.finishRank,
        finishedTurnNumber: player.finishedTurnNumber,
        position: clonePosition4(player.position),
        spawnPosition: clonePosition4(player.spawnPosition),
        toolCount: player.tools.length,
        toolIds: player.tools.map((tool) => tool.toolId),
        turnFlags: [...player.turnFlags]
      }
    ])
  );
}
function buildCaseStateSummary(caseDefinition, snapshot) {
  return {
    allowDebugTools: snapshot.allowDebugTools,
    boardLayout: serializeGoldenBoardLayout(
      {
        width: snapshot.boardWidth,
        height: snapshot.boardHeight,
        tiles: snapshot.tiles.map((tile) => ({
          ...tile,
          direction: tile.direction
        }))
      },
      caseDefinition.scene.symbols
    ),
    eventTypes: snapshot.eventLog.map((entry) => entry.type),
    mapId: snapshot.mapId,
    mapLabel: snapshot.mapLabel,
    mode: snapshot.mode,
    latestPresentation: {
      toolId: snapshot.latestPresentation?.toolId ?? null,
      sequence: snapshot.latestPresentation?.sequence ?? null,
      eventKinds: snapshot.latestPresentation?.events.map((event) => event.kind) ?? []
    },
    players: summarizePlayers(snapshot.players),
    settlementState: snapshot.settlementState,
    summons: snapshot.summons.map((summon) => ({
      ...summon,
      position: clonePosition4(summon.position)
    })),
    turnInfo: cloneTurnInfo2(snapshot.turnInfo)
  };
}
function positionsEqual2(left, right) {
  return left.x === right.x && left.y === right.y;
}
function compareExpectedPlayerState(playerId, expected, actual, mismatches) {
  if (!actual) {
    mismatches.push(`Expected player "${playerId}" to exist.`);
    return;
  }
  if (expected.characterId && actual.characterId !== expected.characterId) {
    mismatches.push(
      `Player "${playerId}" character mismatch: expected ${expected.characterId}, got ${actual.characterId}.`
    );
  }
  if (expected.finishRank !== void 0 && actual.finishRank !== expected.finishRank) {
    mismatches.push(
      `Player "${playerId}" finish rank mismatch: expected ${String(expected.finishRank)}, got ${String(actual.finishRank)}.`
    );
  }
  if (expected.finishedTurnNumber !== void 0 && actual.finishedTurnNumber !== expected.finishedTurnNumber) {
    mismatches.push(
      `Player "${playerId}" finished turn mismatch: expected ${String(expected.finishedTurnNumber)}, got ${String(actual.finishedTurnNumber)}.`
    );
  }
  if (expected.position && !positionsEqual2(expected.position, actual.position)) {
    mismatches.push(
      `Player "${playerId}" position mismatch: expected (${expected.position.x}, ${expected.position.y}), got (${actual.position.x}, ${actual.position.y}).`
    );
  }
  if (expected.spawnPosition && !positionsEqual2(expected.spawnPosition, actual.spawnPosition)) {
    mismatches.push(
      `Player "${playerId}" spawn mismatch: expected (${expected.spawnPosition.x}, ${expected.spawnPosition.y}), got (${actual.spawnPosition.x}, ${actual.spawnPosition.y}).`
    );
  }
  if (expected.toolCount !== void 0 && actual.toolCount !== expected.toolCount) {
    mismatches.push(
      `Player "${playerId}" tool count mismatch: expected ${expected.toolCount}, got ${actual.toolCount}.`
    );
  }
  if (expected.toolIds && JSON.stringify(expected.toolIds) !== JSON.stringify(actual.toolIds)) {
    mismatches.push(
      `Player "${playerId}" tool ids mismatch: expected [${expected.toolIds.join(", ")}], got [${actual.toolIds.join(", ")}].`
    );
  }
  if (expected.turnFlags && JSON.stringify(expected.turnFlags) !== JSON.stringify(actual.turnFlags)) {
    mismatches.push(
      `Player "${playerId}" turn flags mismatch: expected [${expected.turnFlags.join(", ")}], got [${actual.turnFlags.join(", ")}].`
    );
  }
}
function matchesExpectedSummon(actual, expected) {
  if (actual.summonId !== expected.summonId) {
    return false;
  }
  if (expected.ownerId && actual.ownerId !== expected.ownerId) {
    return false;
  }
  if (expected.instanceId && actual.instanceId !== expected.instanceId) {
    return false;
  }
  return positionsEqual2(actual.position, expected.position);
}
function compareCaseExpectation(caseDefinition, actual, stepResults) {
  const mismatches = stepResults.filter((stepResult) => !stepResult.passed).map((stepResult) => `Step "${stepResult.label}" failed: ${stepResult.message}`);
  const expectation = caseDefinition.expect;
  if (expectation.allowDebugTools !== void 0 && actual.allowDebugTools !== expectation.allowDebugTools) {
    mismatches.push(
      `allowDebugTools mismatch: expected ${String(expectation.allowDebugTools)}, got ${String(actual.allowDebugTools)}.`
    );
  }
  if (expectation.boardLayout && JSON.stringify(expectation.boardLayout) !== JSON.stringify(actual.boardLayout)) {
    mismatches.push("Board layout mismatch.");
  }
  if (expectation.mapId !== void 0 && actual.mapId !== expectation.mapId) {
    mismatches.push(`Map id mismatch: expected ${expectation.mapId}, got ${actual.mapId}.`);
  }
  if (expectation.mapLabel !== void 0 && actual.mapLabel !== expectation.mapLabel) {
    mismatches.push(
      `Map label mismatch: expected "${expectation.mapLabel}", got "${actual.mapLabel}".`
    );
  }
  if (expectation.mode !== void 0 && actual.mode !== expectation.mode) {
    mismatches.push(`Mode mismatch: expected ${expectation.mode}, got ${actual.mode}.`);
  }
  if (expectation.settlementState !== void 0 && actual.settlementState !== expectation.settlementState) {
    mismatches.push(
      `Settlement state mismatch: expected ${expectation.settlementState}, got ${actual.settlementState}.`
    );
  }
  if (expectation.players) {
    for (const [playerId, expectedPlayer] of Object.entries(expectation.players)) {
      compareExpectedPlayerState(playerId, expectedPlayer, actual.players[playerId], mismatches);
    }
  }
  if (expectation.summonCount !== void 0 && actual.summons.length !== expectation.summonCount) {
    mismatches.push(
      `Summon count mismatch: expected ${expectation.summonCount}, got ${actual.summons.length}.`
    );
  }
  if (expectation.summons) {
    const missingExpectedSummons = expectation.summons.filter(
      (expectedSummon) => !actual.summons.some(
        (actualSummon) => matchesExpectedSummon(actualSummon, expectedSummon)
      )
    );
    if (missingExpectedSummons.length) {
      mismatches.push(
        `Missing expected summons: ${missingExpectedSummons.map(
          (summon) => `${summon.summonId}@(${summon.position.x}, ${summon.position.y})`
        ).join(", ")}.`
      );
    }
  }
  if (expectation.turnInfo) {
    for (const [key, value] of Object.entries(expectation.turnInfo)) {
      if (JSON.stringify(actual.turnInfo[key]) !== JSON.stringify(value)) {
        mismatches.push(
          `Turn info mismatch for "${key}": expected ${JSON.stringify(value)}, got ${JSON.stringify(actual.turnInfo[key])}.`
        );
      }
    }
  }
  if (expectation.eventTypes && JSON.stringify(expectation.eventTypes) !== JSON.stringify(actual.eventTypes)) {
    mismatches.push(
      `Event types mismatch: expected [${expectation.eventTypes.join(", ")}], got [${actual.eventTypes.join(", ")}].`
    );
  }
  if (expectation.latestPresentation) {
    if (expectation.latestPresentation.toolId !== void 0 && actual.latestPresentation.toolId !== expectation.latestPresentation.toolId) {
      mismatches.push(
        `Latest presentation tool mismatch: expected ${String(expectation.latestPresentation.toolId)}, got ${String(actual.latestPresentation.toolId)}.`
      );
    }
    if (expectation.latestPresentation.eventKinds && JSON.stringify(expectation.latestPresentation.eventKinds) !== JSON.stringify(actual.latestPresentation.eventKinds)) {
      mismatches.push(
        `Latest presentation event kinds mismatch: expected [${expectation.latestPresentation.eventKinds.join(", ")}], got [${actual.latestPresentation.eventKinds.join(", ")}].`
      );
    }
  }
  return mismatches;
}
function buildGoldenCasePlayback(caseDefinition) {
  const simulation = createGameSimulation(caseDefinition.scene);
  const initialSnapshot = simulation.getSnapshot();
  let currentSnapshot = initialSnapshot;
  const playbackSteps = [];
  for (const step of caseDefinition.steps) {
    const execution = executeGoldenStep(currentSnapshot, simulation, step);
    const stepResult = handleStepExpectation(step, execution.outcome);
    playbackSteps.push({
      label: stepResult.label,
      outcome: execution.outcome,
      snapshot: execution.snapshot,
      step,
      stepResult
    });
    currentSnapshot = execution.snapshot;
  }
  const actual = buildCaseStateSummary(caseDefinition, currentSnapshot);
  const stepResults = playbackSteps.map((step) => step.stepResult);
  const mismatches = compareCaseExpectation(caseDefinition, actual, stepResults);
  const result = {
    caseId: caseDefinition.id,
    title: caseDefinition.title,
    ...caseDefinition.description ? { description: caseDefinition.description } : {},
    actual,
    snapshot: currentSnapshot,
    stepResults,
    mismatches,
    passed: mismatches.length === 0
  };
  return {
    initialSnapshot,
    result,
    steps: playbackSteps
  };
}
function runGoldenCase(caseDefinition) {
  return buildGoldenCasePlayback(caseDefinition).result;
}
function runGoldenCases(caseDefinitions) {
  return caseDefinitions.map((caseDefinition) => runGoldenCase(caseDefinition));
}
export {
  BASE_MOVEMENT_ACTIONS_PER_TURN,
  BLAZE_BOMB_PREPARED_STATE_KEY,
  BOARD_HEIGHT,
  BOARD_WIDTH,
  CHAIN_HOOK_READY_STATE_KEY,
  CHAIN_MOVED_OUT_OF_TURN_STATE_KEY,
  CHARACTER_DEFINITIONS,
  DEFAULT_GAME_MAP_ID,
  DEFAULT_MOVEMENT_ACTIONS,
  DEFAULT_MOVE_POINTS,
  FARTHER_PENDING_MOVE_BONUS_STATE_KEY,
  GAME_MAP_REGISTRY,
  GOLDEN_CASES,
  MOVEMENT_DIE_FACES,
  PLAYER_COLORS,
  PLAYER_SPAWNS,
  PRESENTATION_EFFECT_DEFINITIONS,
  RACE_GAME_MAP_ID,
  ROCKET_BLAST_DELAY_MS,
  SUMMON_DEFINITIONS,
  TOOL_DEFINITIONS,
  TOOL_DIE_FACES2 as TOOL_DIE_FACES,
  TURN_START_ACTION_DEFINITIONS,
  VOLATY_LEAP_TURN_STATE_KEY,
  WATCHER_ROOM_NAME,
  adjustMovementTools,
  appendPresentationEvents,
  applyCharacterToolTransforms,
  applyCharacterTurnEndCleanup,
  areAllRacePlayersFinished,
  buildCharacterTurnLoadout,
  buildCharacterTurnLoadoutRuntime,
  buildGameMapRuntimeMetadata,
  buildGoldenCasePlayback,
  buildGoldenLayoutSymbols,
  buildMotionPositions,
  buildRaceStandings,
  clearMovementTools,
  cloneCharacterState,
  cloneGameSnapshot,
  consumeToolInstance,
  createBoardDefinition,
  createBoardDefinitionFromGoldenLayout,
  createDebugToolInstance,
  createDefaultBoardDefinition,
  createEffectEvent,
  createGameSimulation,
  createMovementToolInstance,
  createPlayerMotionEvent,
  createPresentation,
  createProjectileEvent,
  createRolledToolInstance,
  createStateTransitionEvent,
  createSummonUpsertMutation,
  createTerrainStopTarget,
  createToolInstance,
  createTurnStartActionSnapshot,
  defineGoldenCase,
  describeToolButtonLabel,
  describeToolButtonValue,
  describeToolParameters,
  findToolInstance,
  getCharacterActiveSkillToolIds,
  getCharacterDefinition,
  getCharacterIds,
  getCharacterMovementOverrideType,
  getCharacterStateBoolean,
  getCharacterStateNumber,
  getCharacterTurnStartActionIds,
  getDebugGrantableToolIds,
  getDirectionVector,
  getGameMapDefinition,
  getGameMapIds,
  getGameMapSpawnPosition,
  getMotionArrivalStartMs,
  getNextActiveRacePlayerId,
  getNextCharacterId,
  getNextFinishRank,
  getOppositeDirection,
  getPresentationEffectDefinition,
  getRollableToolIds,
  getSummonDefinition,
  getTerrainTileKey,
  getTile,
  getTilesByType,
  getToolAvailability,
  getToolChoiceDefinitions,
  getToolDefinition,
  getToolDisabledMessage,
  getToolParam,
  getTotalMovementPoints,
  getTurnStartActionDefinition,
  hasSummonAtPosition,
  isAimTool,
  isCharacterSkillTool,
  isChoiceTool,
  isDirectionalTool,
  isLuckyTurnFlag,
  isPlayerFinished,
  isSolidTileType,
  isTileDirectionTool,
  isTileTargetTool,
  isWithinBoard,
  markCharacterMovedOutOfTurn,
  nextDeterministicSeed,
  prepareCharacterTurnStart,
  resolveCharacterTurnStartAction,
  resolveCurrentTileStop,
  resolveGameMapId,
  resolvePassThroughSummonEffects,
  resolvePassThroughTerrainEffect,
  resolveSettlementState,
  resolveStopSummonEffects,
  resolveStopTerrainEffect,
  resolveToolAction,
  rollMovementDie,
  rollToolDie,
  runGoldenCase,
  runGoldenCases,
  serializeGoldenBoardLayout,
  setCharacterStateValue,
  stepPosition,
  toTileKey
};
