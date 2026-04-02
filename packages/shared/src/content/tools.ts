import type {
  ToolContentDefinition,
  ToolDieFaceContentDefinition,
  ToolParameterId
} from "./schema";

function defineToolRegistry<const Registry extends Record<string, ToolContentDefinition>>(
  registry: Registry
): Registry {
  return registry;
}

function defineToolDieFaces<const Faces extends readonly ToolDieFaceContentDefinition[]>(
  faces: Faces
): Faces {
  return faces;
}

export const TOOL_PARAMETER_LABELS: Record<
  ToolParameterId,
  { label: string; unit: "point" | "tile" | "count" }
> = {
  movePoints: { label: "移动点数", unit: "point" },
  jumpDistance: { label: "飞跃距离", unit: "tile" },
  hookLength: { label: "钩锁长度", unit: "tile" },
  dashBonus: { label: "冲刺加成", unit: "point" },
  brakeRange: { label: "制动距离", unit: "tile" },
  projectileRange: { label: "射程", unit: "tile" },
  projectileBounceCount: { label: "反弹次数", unit: "count" },
  projectilePushDistance: { label: "推动距离", unit: "tile" },
  wallDurability: { label: "墙体耐久", unit: "count" },
  targetRange: { label: "施放范围", unit: "tile" },
  rocketBlastLeapDistance: { label: "炸飞距离", unit: "tile" },
  rocketSplashPushDistance: { label: "爆风推力", unit: "tile" },
  pushDistance: { label: "位移距离", unit: "tile" }
};

export const TOOL_DIE_FACES = defineToolDieFaces([
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
] as const);

export const TOOL_REGISTRY = defineToolRegistry({
  movement: {
    actorMovement: {
      type: "translate",
      disposition: "active"
    },
    label: "移动",
    description: "朝一个方向移动，最多消耗该工具携带的点数。",
    disabledHint: "这个移动工具已经没有可用点数了。",
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
    label: "飞跃",
    description: "朝一个方向飞跃，可以越过中间阻挡，但落点不能是墙。",
    disabledHint: "当前还不能使用这个飞跃工具。",
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
    label: "钩锁",
    description: "朝前方发射钩锁，命中墙时拉近自己，命中玩家时拉近对方。",
    disabledHint: "当前还不能使用这个钩锁工具。",
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
    label: "冲刺",
    description: "让当前回合工具列表中的所有移动工具额外获得指定点数。",
    disabledHint: "需要保留一个可用的<移动>时才能使用。",
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
    label: "制动",
    description: "沿一个轴向移动至多指定格数，并停在实际可达的目标格。",
    disabledHint: "这个制动工具已经没有可用距离了。",
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
    label: "砌墙",
    description: "在周围八格中选择一个空地，生成一面指定耐久的土墙。",
    disabledHint: "这个位置不能砌墙。",
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
    label: "篮球",
    description: "朝一个方向投出篮球，遇墙会反弹，命中玩家会推动并返还新的篮球。",
    disabledHint: "当前还不能使用这个篮球工具。",
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
    label: "火箭",
    description: "朝一个方向发射火箭，在碰撞点爆炸并击飞周围目标。",
    disabledHint: "当前还不能使用这个火箭工具。",
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
    label: "瞬移",
    description: "选择全场任意一个可落脚地块，直接瞬移到目标位置。",
    disabledHint: "当前还不能瞬移到这个位置。",
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
    label: "放置钱包",
    description: "在 5x5 范围内选择一个可部署地块放置钱包，并立即结束当前回合。",
    disabledHint: "当前无法在这个位置放置钱包。",
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
    label: "投弹",
    description: "选择周围八码内的一格，并指定一个方向，让其中所有玩家位移 2 格。",
    disabledHint: "请先选择一个有效目标格，并指定推动方向。",
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
    label: "制衡",
    description: "在压缩本回合移动，或把本回合移动转存到下回合之间二选一。",
    disabledHint: "需要保留一个有剩余点数的<移动>时才能使用。",
    source: "turn",
    targetMode: "choice",
    choices: [
      {
        id: "trim_and_bank",
        label: "本回合 -1",
        description: "本回合移动点数 -1，下回合额外获得 1 点移动。"
      },
      {
        id: "store_all",
        label: "转存本回合",
        description: "本回合失去全部移动，下回合额外获得本回合的移动。"
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
} as const);
