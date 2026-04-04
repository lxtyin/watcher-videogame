declare const EFFECT_REGISTRY: {
    readonly rocket_explosion: {
        readonly label: "火箭爆炸";
        readonly description: "火箭命中后的范围爆炸表现。";
    };
};

declare const TURN_START_ACTION_REGISTRY: {
    readonly blazePrepareBomb: {
        readonly label: "投弹准备";
        readonly description: "立即结束本回合，并在你的下个回合开始时获得一个【投弹】工具。";
        readonly color: "#d86a42";
    };
    readonly volatySkipToolDie: {
        readonly label: "弃骰飞跃";
        readonly description: "放弃本回合工具骰，仅掷移动骰，并让本回合的移动行动按飞跃结算。";
        readonly color: "#77b8ff";
    };
};

type TileType$1 = "floor" | "wall" | "earthWall" | "pit" | "lucky" | "conveyor" | "start" | "goal";
type GameMode$1 = "free" | "race";
type TurnPhase$1 = "roll" | "action";
type Direction$1 = "up" | "down" | "left" | "right";
type ToolSource$1 = "turn" | "character_skill";
type ToolTargetMode$1 = "direction" | "tile" | "instant" | "choice" | "tile_direction";
type TileTargetingMode$1 = "axis_line" | "adjacent_ring" | "board_any";
type MovementType$1 = "translate" | "leap" | "drag" | "teleport";
type MovementDisposition$1 = "active" | "passive";
type ToolParameterId$1 = "movePoints" | "jumpDistance" | "hookLength" | "dashBonus" | "brakeRange" | "projectileRange" | "projectileBounceCount" | "projectilePushDistance" | "wallDurability" | "targetRange" | "rocketBlastLeapDistance" | "rocketSplashPushDistance" | "pushDistance";
type ToolParameterValueMap$1 = Partial<Record<ToolParameterId$1, number>>;
interface ToolButtonValueContentDefinition {
    paramId: ToolParameterId$1;
    unit: "point" | "tile";
}
interface ToolChoiceContentDefinition {
    description: string;
    id: string;
    label: string;
}
interface MovementContentDefinition {
    disposition: MovementDisposition$1;
    type: MovementType$1;
}

interface LayoutSymbolDefinition {
    type: TileType;
    direction?: Direction;
    durability?: number;
}

interface MapGridPosition {
    x: number;
    y: number;
}
interface GameMapContentDefinition {
    allowDebugTools: boolean;
    description: string;
    label: string;
    layout: readonly string[];
    mode: GameMode$1;
    spawnMode: "cycle" | "shared";
    spawnPositions: readonly MapGridPosition[];
    symbols?: Partial<Record<string, LayoutSymbolDefinition>>;
}
declare const DEFAULT_GAME_MAP_ID: "free_default";
declare const RACE_GAME_MAP_ID: "race_sprint";
declare const GAME_MAP_REGISTRY: {
    readonly free_default: {
        readonly label: "自由模式默认地图";
        readonly description: "保留调试入口的基础沙盒地图，适合自由试验工具、角色和地形联动。";
        readonly mode: "free";
        readonly allowDebugTools: true;
        readonly layout: readonly ["#########", "#.>l#...#", "#.v.#...#", "#.pe#e..#", "#..^....#", "#..e....#", "#...##..#", "#....<..#", "#########"];
        readonly symbols: Record<string, LayoutSymbolDefinition>;
        readonly spawnMode: "cycle";
        readonly spawnPositions: readonly [{
            readonly x: 1;
            readonly y: 1;
        }, {
            readonly x: 7;
            readonly y: 7;
        }, {
            readonly x: 1;
            readonly y: 7;
        }, {
            readonly x: 7;
            readonly y: 1;
        }];
    };
    readonly race_sprint: {
        readonly label: "竞速模式测试地图";
        readonly description: "所有玩家共享出生点，沿着加速带与机关冲向终点，先到先得。";
        readonly mode: "race";
        readonly allowDebugTools: false;
        readonly layout: readonly ["########################", "#s..v..............ee..#", "#....#.............###.#", "#..lp###.....#.l..##.g.#", "#e.#........#......###.#", "#..#.....###...........#", "#.ee...................#", "#....^................p#", "########################"];
        readonly symbols: {
            readonly [x: string]: LayoutSymbolDefinition | undefined;
        };
        readonly spawnMode: "shared";
        readonly spawnPositions: readonly [{
            readonly x: 1;
            readonly y: 1;
        }];
    };
};
type GameMapRegistry = typeof GAME_MAP_REGISTRY;
declare function getGameMapIds(): Array<keyof GameMapRegistry>;
declare function resolveGameMapId(mapId?: string): keyof GameMapRegistry;
declare function getGameMapDefinition(mapId?: string): GameMapRegistry[keyof GameMapRegistry];
declare function getGameMapSpawnPosition(mapId: string | undefined, playerIndex: number): MapGridPosition;

declare const TOOL_DIE_FACES$1: readonly [{
    readonly toolId: "jump";
    readonly params: {
        readonly jumpDistance: 2;
    };
}, {
    readonly toolId: "hookshot";
    readonly params: {
        readonly hookLength: 3;
    };
}, {
    readonly toolId: "dash";
    readonly params: {
        readonly dashBonus: 2;
    };
}, {
    readonly toolId: "buildWall";
    readonly params: {
        readonly wallDurability: 2;
    };
}, {
    readonly toolId: "basketball";
    readonly params: {
        readonly projectileRange: 999;
        readonly projectileBounceCount: 1;
        readonly projectilePushDistance: 1;
    };
}, {
    readonly toolId: "rocket";
    readonly params: {
        readonly projectileRange: 999;
        readonly rocketBlastLeapDistance: 3;
        readonly rocketSplashPushDistance: 1;
    };
}];
declare const TOOL_REGISTRY: {
    readonly movement: {
        readonly actorMovement: {
            readonly type: "translate";
            readonly disposition: "active";
        };
        readonly label: "移动";
        readonly description: "朝一个方向移动，最多消耗该工具携带的点数。";
        readonly disabledHint: "这个移动工具已经没有可用点数了。";
        readonly source: "turn";
        readonly targetMode: "direction";
        readonly conditions: [];
        readonly defaultCharges: 1;
        readonly defaultParams: {
            readonly movePoints: 4;
        };
        readonly buttonValue: {
            readonly paramId: "movePoints";
            readonly unit: "point";
        };
        readonly color: "#6abf69";
        readonly rollable: false;
        readonly debugGrantable: true;
        readonly endsTurnOnUse: false;
    };
    readonly jump: {
        readonly actorMovement: {
            readonly type: "leap";
            readonly disposition: "active";
        };
        readonly label: "飞跃";
        readonly description: "朝一个方向飞跃，可以越过中间阻挡，但落点不能是墙。";
        readonly disabledHint: "当前还不能使用这个飞跃工具。";
        readonly source: "turn";
        readonly targetMode: "direction";
        readonly conditions: [];
        readonly defaultCharges: 1;
        readonly defaultParams: {
            readonly jumpDistance: 2;
        };
        readonly color: "#85c772";
        readonly rollable: true;
        readonly debugGrantable: true;
        readonly endsTurnOnUse: false;
    };
    readonly hookshot: {
        readonly actorMovement: {
            readonly type: "drag";
            readonly disposition: "active";
        };
        readonly label: "钩锁";
        readonly description: "朝前方发射钩锁，命中墙时拉近自己，命中玩家时拉近对方。";
        readonly disabledHint: "当前还不能使用这个钩锁工具。";
        readonly source: "turn";
        readonly targetMode: "direction";
        readonly conditions: [];
        readonly defaultCharges: 1;
        readonly defaultParams: {
            readonly hookLength: 3;
        };
        readonly color: "#6ca7d9";
        readonly rollable: true;
        readonly debugGrantable: true;
        readonly endsTurnOnUse: false;
    };
    readonly dash: {
        readonly label: "冲刺";
        readonly description: "让当前回合工具列表中的所有移动工具额外获得指定点数。";
        readonly disabledHint: "需要保留一个可用的<移动>时才能使用。";
        readonly source: "turn";
        readonly targetMode: "instant";
        readonly conditions: [{
            readonly kind: "tool_present";
            readonly toolId: "movement";
        }];
        readonly defaultCharges: 1;
        readonly defaultParams: {
            readonly dashBonus: 2;
        };
        readonly color: "#f0ad4e";
        readonly rollable: true;
        readonly debugGrantable: true;
        readonly endsTurnOnUse: false;
    };
    readonly brake: {
        readonly actorMovement: {
            readonly type: "translate";
            readonly disposition: "active";
        };
        readonly label: "制动";
        readonly description: "沿一个轴向移动至多指定格数，并停在实际可达的目标格。";
        readonly disabledHint: "这个制动工具已经没有可用距离了。";
        readonly source: "turn";
        readonly targetMode: "tile";
        readonly tileTargeting: "axis_line";
        readonly conditions: [];
        readonly defaultCharges: 1;
        readonly defaultParams: {
            readonly brakeRange: 3;
        };
        readonly buttonValue: {
            readonly paramId: "brakeRange";
            readonly unit: "tile";
        };
        readonly color: "#53a6b9";
        readonly rollable: false;
        readonly debugGrantable: true;
        readonly endsTurnOnUse: false;
    };
    readonly buildWall: {
        readonly label: "砌墙";
        readonly description: "在周围八格中选择一个空地，生成一面指定耐久的土墙。";
        readonly disabledHint: "这个位置不能砌墙。";
        readonly source: "turn";
        readonly targetMode: "tile";
        readonly tileTargeting: "adjacent_ring";
        readonly conditions: [];
        readonly defaultCharges: 1;
        readonly defaultParams: {
            readonly wallDurability: 2;
        };
        readonly color: "#be7d4d";
        readonly rollable: true;
        readonly debugGrantable: true;
        readonly endsTurnOnUse: false;
    };
    readonly basketball: {
        readonly label: "篮球";
        readonly description: "朝一个方向投出篮球，遇墙会反弹，命中玩家会推动并返还新的篮球。";
        readonly disabledHint: "当前还不能使用这个篮球工具。";
        readonly source: "turn";
        readonly targetMode: "direction";
        readonly conditions: [];
        readonly defaultCharges: 1;
        readonly defaultParams: {
            readonly projectileRange: 999;
            readonly projectileBounceCount: 1;
            readonly projectilePushDistance: 1;
        };
        readonly color: "#d9824c";
        readonly rollable: true;
        readonly debugGrantable: true;
        readonly endsTurnOnUse: false;
    };
    readonly rocket: {
        readonly label: "火箭";
        readonly description: "朝一个方向发射火箭，在碰撞点爆炸并击飞周围目标。";
        readonly disabledHint: "当前还不能使用这个火箭工具。";
        readonly source: "turn";
        readonly targetMode: "direction";
        readonly conditions: [];
        readonly defaultCharges: 1;
        readonly defaultParams: {
            readonly projectileRange: 999;
            readonly rocketBlastLeapDistance: 3;
            readonly rocketSplashPushDistance: 1;
        };
        readonly color: "#dc5f56";
        readonly rollable: true;
        readonly debugGrantable: true;
        readonly endsTurnOnUse: false;
    };
    readonly teleport: {
        readonly actorMovement: {
            readonly type: "teleport";
            readonly disposition: "active";
        };
        readonly label: "瞬移";
        readonly description: "选择全场任意一个可落脚地块，直接瞬移到目标位置。";
        readonly disabledHint: "当前还不能瞬移到这个位置。";
        readonly source: "turn";
        readonly targetMode: "tile";
        readonly tileTargeting: "board_any";
        readonly conditions: [];
        readonly defaultCharges: 1;
        readonly defaultParams: {};
        readonly color: "#7b8bff";
        readonly rollable: false;
        readonly debugGrantable: true;
        readonly endsTurnOnUse: false;
    };
    readonly deployWallet: {
        readonly label: "放置钱包";
        readonly description: "在 5x5 范围内选择一个可部署地块放置钱包，并立即结束当前回合。";
        readonly disabledHint: "当前无法在这个位置放置钱包。";
        readonly source: "character_skill";
        readonly targetMode: "tile";
        readonly tileTargeting: "board_any";
        readonly conditions: [];
        readonly defaultCharges: 1;
        readonly defaultParams: {
            readonly targetRange: 2;
        };
        readonly color: "#8d7a3d";
        readonly rollable: false;
        readonly debugGrantable: false;
        readonly endsTurnOnUse: true;
    };
    readonly bombThrow: {
        readonly label: "投弹";
        readonly description: "选择周围八码内的一格，并指定一个方向，让其中所有玩家位移 2 格。";
        readonly disabledHint: "请先选择一个有效目标格，并指定推动方向。";
        readonly source: "turn";
        readonly targetMode: "tile_direction";
        readonly tileTargeting: "adjacent_ring";
        readonly conditions: [];
        readonly defaultCharges: 1;
        readonly defaultParams: {
            readonly targetRange: 1;
            readonly pushDistance: 2;
        };
        readonly color: "#d86a42";
        readonly rollable: false;
        readonly debugGrantable: true;
        readonly endsTurnOnUse: false;
    };
    readonly balance: {
        readonly label: "制衡";
        readonly description: "在压缩本回合移动，或把本回合移动转存到下回合之间二选一。";
        readonly disabledHint: "需要保留一个有剩余点数的<移动>时才能使用。";
        readonly source: "turn";
        readonly targetMode: "choice";
        readonly choices: readonly [{
            readonly id: "trim_and_bank";
            readonly label: "本回合 -1";
            readonly description: "本回合移动点数 -1，下回合额外获得 1 点移动。";
        }, {
            readonly id: "store_all";
            readonly label: "转存本回合";
            readonly description: "本回合失去全部移动，下回合额外获得本回合的移动。";
        }];
        readonly conditions: [{
            readonly kind: "tool_present";
            readonly toolId: "movement";
        }];
        readonly defaultCharges: 1;
        readonly defaultParams: {};
        readonly color: "#8c6bda";
        readonly rollable: false;
        readonly debugGrantable: true;
        readonly endsTurnOnUse: false;
    };
};

declare const SUMMON_REGISTRY: {
    readonly wallet: {
        readonly label: "钱包";
        readonly description: "领导经过自己放置的钱包时会拾取并获得一个额外工具骰结果。";
        readonly triggerMode: "movement_trigger";
    };
};

declare const CHARACTER_REGISTRY: {
    readonly late: {
        readonly label: "罗素的关门弟子";
        readonly summary: "你的所有<移动>变为<制动>。";
        readonly turnStartGrants: [];
        readonly turnStartActionIds: readonly [];
        readonly activeSkillLoadout: [];
        readonly toolTransforms: [{
            readonly fromToolId: "movement";
            readonly toToolId: "brake";
            readonly paramMappings: [{
                readonly fromParamId: "movePoints";
                readonly toParamId: "brakeRange";
            }];
        }];
    };
    readonly ehh: {
        readonly label: "鹅哈哈";
        readonly summary: "每回合额外获得一颗<篮球>。";
        readonly turnStartGrants: [{
            readonly toolId: "basketball";
        }];
        readonly turnStartActionIds: readonly [];
        readonly activeSkillLoadout: [];
        readonly toolTransforms: [];
    };
    readonly leader: {
        readonly label: "领导";
        readonly summary: "可以部署钱包，自己经过时拾取并获得一个工具骰。";
        readonly turnStartGrants: [];
        readonly turnStartActionIds: readonly [];
        readonly activeSkillLoadout: [{
            readonly toolId: "deployWallet";
        }];
        readonly toolTransforms: [];
    };
    readonly blaze: {
        readonly label: "布拉泽";
        readonly summary: "回合开始时可以进入投弹准备，并在下个回合获得<投弹>。";
        readonly turnStartGrants: [];
        readonly turnStartActionIds: readonly ["blazePrepareBomb"];
        readonly activeSkillLoadout: [];
        readonly toolTransforms: [];
    };
    readonly volaty: {
        readonly label: "芙兰迪";
        readonly summary: "回合开始时可以放弃工具骰，并让本回合的移动变为飞跃。";
        readonly turnStartGrants: [];
        readonly turnStartActionIds: readonly ["volatySkipToolDie"];
        readonly activeSkillLoadout: [];
        readonly toolTransforms: [];
    };
    readonly chain: {
        readonly label: "常";
        readonly summary: "若你在回合外未发生移动，本回合获得一个长度为 2 的小钩锁。";
        readonly turnStartGrants: [];
        readonly turnStartActionIds: readonly [];
        readonly activeSkillLoadout: [];
        readonly toolTransforms: [];
    };
    readonly farther: {
        readonly label: "法真";
        readonly summary: "每回合获得一个<制衡>，并能把本回合的移动转存到下回合。";
        readonly turnStartGrants: [];
        readonly turnStartActionIds: readonly [];
        readonly activeSkillLoadout: [];
        readonly toolTransforms: [];
    };
};

type TileType = TileType$1;
type TurnPhase = TurnPhase$1;
type Direction = Direction$1;
type MovementType = MovementType$1;
type MovementDisposition = MovementDisposition$1;
type MovementTiming = "in_turn" | "out_of_turn";
type GameMode = "free" | "race";
type GameSettlementState = "active" | "complete";
type RoomPhase = "lobby" | "in_game" | "settlement";
type CharacterId = keyof typeof CHARACTER_REGISTRY;
type SummonId = keyof typeof SUMMON_REGISTRY;
type ToolId = keyof typeof TOOL_REGISTRY;
type GameMapId = keyof typeof GAME_MAP_REGISTRY;
type RolledToolId = typeof TOOL_DIE_FACES$1[number]["toolId"];
type TurnStartActionId = keyof typeof TURN_START_ACTION_REGISTRY;
type ToolSource = ToolSource$1;
type ToolTargetMode = ToolTargetMode$1;
type TileTargetingMode = TileTargetingMode$1;
type PlayerTurnFlag = "lucky_tile_claimed";
type ToolParameterId = ToolParameterId$1;
type ToolParameterValueMap = ToolParameterValueMap$1;
type CharacterStateValue = boolean | number | string;
type CharacterStateMap = Partial<Record<string, CharacterStateValue>>;
type EventType = "piece_moved" | "move_blocked" | "earth_wall_broken" | "turn_started" | "dice_rolled" | "tool_used" | "turn_ended" | "terrain_triggered" | "player_respawned" | "debug_granted" | "character_switched" | "summon_triggered" | "character_action_used" | "player_kicked" | "player_finished" | "match_finished";
interface GridPosition {
    x: number;
    y: number;
}
interface TileDefinition extends GridPosition {
    direction: Direction | null;
    durability: number;
    key: string;
    type: TileType;
}
interface BoardDefinition {
    height: number;
    tiles: TileDefinition[];
    width: number;
}
interface ToolButtonValueDefinition extends ToolButtonValueContentDefinition {
}
interface MovementDescriptor extends MovementContentDefinition {
    tags: string[];
    timing: MovementTiming;
}
interface TurnStartActionSnapshot {
    actionId: TurnStartActionId;
    characterId: CharacterId;
}
interface PlayerSnapshot {
    boardVisible: boolean;
    characterId: CharacterId;
    characterState: CharacterStateMap;
    color: string;
    finishRank: number | null;
    finishedTurnNumber: number | null;
    id: string;
    isConnected: boolean;
    isReady: boolean;
    name: string;
    petId: string;
    position: GridPosition;
    spawnPosition: GridPosition;
    tools: TurnToolSnapshot[];
    turnFlags: PlayerTurnFlag[];
}
interface SummonSnapshot {
    instanceId: string;
    ownerId: string;
    position: GridPosition;
    summonId: SummonId;
}
interface TurnInfoSnapshot {
    currentPlayerId: string;
    lastRolledToolId: RolledToolId | null;
    moveRoll: number;
    phase: TurnPhase;
    turnStartActions: TurnStartActionSnapshot[];
    toolDieSeed: number;
    turnNumber: number;
}
interface EventLogEntry {
    createdAt: number;
    id: string;
    message: string;
    type: EventType;
}
type PresentationMotionStyle = "ground" | "arc" | "finish";
type PresentationProjectileType = "basketball" | "rocket";
type PresentationEffectType = keyof typeof EFFECT_REGISTRY;
interface TurnToolSnapshot {
    charges: number;
    instanceId: string;
    params: ToolParameterValueMap;
    source: ToolSource;
    toolId: ToolId;
}
interface ToolCondition {
    kind: "tool_present";
    toolId: ToolId;
}
interface ToolChoiceDefinition extends ToolChoiceContentDefinition {
}
interface ToolLoadoutDefinition {
    charges?: number;
    params?: ToolParameterValueMap;
    source?: ToolSource;
    toolId: ToolId;
}
interface ToolDieFaceDefinition extends ToolLoadoutDefinition {
    toolId: RolledToolId;
}
interface ToolDefinition {
    actorMovement?: MovementContentDefinition;
    buttonValue?: ToolButtonValueDefinition;
    choices?: readonly ToolChoiceDefinition[];
    color: string;
    conditions: ToolCondition[];
    debugGrantable: boolean;
    defaultCharges: number;
    defaultParams: ToolParameterValueMap;
    description: string;
    disabledHint: string | null;
    endsTurnOnUse: boolean;
    id: ToolId;
    label: string;
    rollable: boolean;
    source: ToolSource;
    targetMode: ToolTargetMode;
    tileTargeting?: TileTargetingMode;
}
interface GameSnapshot {
    allowDebugTools: boolean;
    boardHeight: number;
    boardWidth: number;
    eventLog: EventLogEntry[];
    hostPlayerId: string | null;
    latestPresentation: SequencedActionPresentation | null;
    mapId: GameMapId | "custom";
    mapLabel: string;
    mode: GameMode;
    players: PlayerSnapshot[];
    roomCode: string;
    roomPhase: RoomPhase;
    settlementState: GameSettlementState;
    summons: SummonSnapshot[];
    tiles: TileDefinition[];
    turnInfo: TurnInfoSnapshot;
}
interface UseToolCommandPayload {
    choiceId?: string;
    direction?: Direction;
    targetPosition?: GridPosition;
    toolInstanceId: string;
}
interface UseTurnStartActionCommandPayload {
    actionId: TurnStartActionId;
    choiceId?: string;
}
interface GrantDebugToolPayload {
    toolId: ToolId;
}
interface SetCharacterCommandPayload {
    characterId: CharacterId;
}
interface SetReadyCommandPayload {
    isReady: boolean;
}
interface KickPlayerCommandPayload {
    playerId: string;
}
interface MovementActor {
    characterId: CharacterId;
    characterState: CharacterStateMap;
    id: string;
    position: GridPosition;
    spawnPosition: GridPosition;
    turnFlags: PlayerTurnFlag[];
}
interface MovementContext {
    actor: MovementActor;
    board: BoardDefinition;
    direction: Direction;
    movePoints: number;
}
type MovementResolution = {
    kind: "blocked";
    reason: string;
    target: GridPosition;
} | {
    destroyedTileKey?: string;
    kind: "moved";
    moveCost: number;
    target: GridPosition;
};
interface BoardPlayerState {
    boardVisible: boolean;
    characterId: CharacterId;
    characterState: CharacterStateMap;
    id: string;
    position: GridPosition;
    spawnPosition: GridPosition;
    turnFlags: PlayerTurnFlag[];
}
interface BoardSummonState {
    instanceId: string;
    ownerId: string;
    position: GridPosition;
    summonId: SummonId;
}
interface TileMutation {
    key: string;
    nextDurability: number;
    nextType: TileType;
    position: GridPosition;
}
interface AffectedPlayerMove {
    characterState?: CharacterStateMap;
    movement: MovementDescriptor;
    path: GridPosition[];
    playerId: string;
    reason: string;
    startPosition: GridPosition;
    target: GridPosition;
    turnFlags?: PlayerTurnFlag[];
}
interface ResolvedPlayerMovement {
    movement: MovementDescriptor;
    path: GridPosition[];
    playerId: string;
    startPosition: GridPosition;
    target: GridPosition;
}
interface ActionContextBase {
    actor: MovementActor;
    board: BoardDefinition;
    players: BoardPlayerState[];
}
interface DirectionalActionContext extends ActionContextBase {
    direction: Direction;
}
interface ToolActionContext extends ActionContextBase {
    activeTool: TurnToolSnapshot;
    choiceId?: string;
    direction?: Direction;
    summons: BoardSummonState[];
    targetPosition?: GridPosition;
    toolDieSeed: number;
    tools: TurnToolSnapshot[];
}
interface ResolvedActorState {
    characterState: CharacterStateMap;
    position: GridPosition;
    turnFlags: PlayerTurnFlag[];
}
interface ToolAvailability {
    reason: string | null;
    usable: boolean;
}
type TriggeredTerrainEffect = {
    kind: "goal";
    movement: MovementDescriptor | null;
    playerId: string;
    position: GridPosition;
    tileKey: string;
} | {
    kind: "pit";
    movement: MovementDescriptor | null;
    playerId: string;
    position: GridPosition;
    respawnPosition: GridPosition;
    tileKey: string;
} | {
    grantedTool: TurnToolSnapshot;
    kind: "lucky";
    movement: MovementDescriptor | null;
    playerId: string;
    position: GridPosition;
    tileKey: string;
} | {
    bonusMovePoints: number;
    direction: Direction;
    kind: "conveyor_boost";
    movement: MovementDescriptor;
    playerId: string;
    position: GridPosition;
    tileKey: string;
} | {
    fromDirection: Direction;
    kind: "conveyor_turn";
    movement: MovementDescriptor;
    playerId: string;
    position: GridPosition;
    tileKey: string;
    toDirection: Direction;
};
type TriggeredSummonEffect = {
    grantedTool: TurnToolSnapshot;
    kind: "wallet_pickup";
    movement: MovementDescriptor;
    ownerId: string;
    playerId: string;
    position: GridPosition;
    summonId: SummonId;
    summonInstanceId: string;
};
type SummonMutation = {
    instanceId: string;
    kind: "upsert";
    ownerId: string;
    position: GridPosition;
    summonId: SummonId;
} | {
    instanceId: string;
    kind: "remove";
};
interface ActionPresentationEventBase {
    durationMs: number;
    id: string;
    startMs: number;
}
interface PlayerMotionPresentationEvent extends ActionPresentationEventBase {
    kind: "player_motion";
    motionStyle: PresentationMotionStyle;
    playerId: string;
    positions: GridPosition[];
}
interface ProjectilePresentationEvent extends ActionPresentationEventBase {
    kind: "projectile";
    ownerId: string;
    positions: GridPosition[];
    projectileType: PresentationProjectileType;
}
interface EffectPresentationEvent extends ActionPresentationEventBase {
    effectType: PresentationEffectType;
    kind: "effect";
    position: GridPosition;
    tiles: GridPosition[];
}
interface TilePresentationState {
    direction: Direction | null;
    durability: number;
    type: TileType;
}
interface TileStateTransition {
    after: TilePresentationState;
    before: TilePresentationState;
    key: string;
    position: GridPosition;
}
interface SummonPresentationState {
    instanceId: string;
    ownerId: string;
    position: GridPosition;
    summonId: SummonId;
}
interface SummonStateTransition {
    after: SummonPresentationState | null;
    before: SummonPresentationState | null;
    instanceId: string;
}
interface PlayerPresentationState {
    boardVisible: boolean;
    playerId: string;
}
interface PlayerStateTransition {
    after: PlayerPresentationState;
    before: PlayerPresentationState;
    playerId: string;
}
interface StateTransitionPresentationEvent extends ActionPresentationEventBase {
    kind: "state_transition";
    playerTransitions: PlayerStateTransition[];
    summonTransitions: SummonStateTransition[];
    tileTransitions: TileStateTransition[];
}
type ActionPresentationEvent = PlayerMotionPresentationEvent | ProjectilePresentationEvent | EffectPresentationEvent | StateTransitionPresentationEvent;
interface ActionPresentation {
    actorId: string;
    durationMs: number;
    events: ActionPresentationEvent[];
    toolId: ToolId;
}
interface SequencedActionPresentation extends ActionPresentation {
    sequence: number;
}
type ActionResolution = {
    actorMovement: ResolvedPlayerMovement | null;
    actor: ResolvedActorState;
    affectedPlayers: AffectedPlayerMove[];
    endsTurn: boolean;
    kind: "blocked";
    nextToolDieSeed: number;
    path: GridPosition[];
    presentation: ActionPresentation | null;
    previewTiles: GridPosition[];
    reason: string;
    summonMutations: SummonMutation[];
    tileMutations: TileMutation[];
    tools: TurnToolSnapshot[];
    triggeredSummonEffects: TriggeredSummonEffect[];
    triggeredTerrainEffects: TriggeredTerrainEffect[];
} | {
    actorMovement: ResolvedPlayerMovement | null;
    actor: ResolvedActorState;
    affectedPlayers: AffectedPlayerMove[];
    endsTurn: boolean;
    kind: "applied";
    nextToolDieSeed: number;
    path: GridPosition[];
    presentation: ActionPresentation | null;
    previewTiles: GridPosition[];
    summary: string;
    summonMutations: SummonMutation[];
    tileMutations: TileMutation[];
    tools: TurnToolSnapshot[];
    triggeredSummonEffects: TriggeredSummonEffect[];
    triggeredTerrainEffects: TriggeredTerrainEffect[];
};

interface MovementSystemContext {
    activeTool: TurnToolSnapshot | null;
    actorId: string;
    board: BoardDefinition;
    players: BoardPlayerState[];
    sourceId: string;
    summons: BoardSummonState[];
}
interface MovementSubject {
    characterId: MovementActor["characterId"];
    characterState: CharacterStateMap;
    id: string;
    position: GridPosition;
    spawnPosition: GridPosition;
    turnFlags: MovementActor["turnFlags"];
}
interface StationaryStopOptions {
    player: MovementSubject;
    priorSummonMutations?: SummonMutation[];
    priorTileMutations?: TileMutation[];
    toolDieSeed: number;
    tools: TurnToolSnapshot[];
}
interface MovementSystemResolution {
    actor: ResolvedActorState;
    nextToolDieSeed: number;
    path: GridPosition[];
    stopReason: string;
    summonMutations: SummonMutation[];
    tileMutations: TileMutation[];
    tools: TurnToolSnapshot[];
    triggeredSummonEffects: TriggeredSummonEffect[];
    triggeredTerrainEffects: TriggeredTerrainEffect[];
}
declare function resolveCurrentTileStop(context: MovementSystemContext, options: StationaryStopOptions): MovementSystemResolution;

declare function getDirectionVector(direction: Direction): GridPosition;
declare function getOppositeDirection(direction: Direction): Direction;
declare function stepPosition(position: GridPosition, direction: Direction, amount?: number): GridPosition;
declare function isSolidTileType(tileType: TileType): boolean;

declare function resolveToolAction(context: ToolActionContext): ActionResolution;

declare function toTileKey(position: GridPosition): string;
declare function createBoardDefinition(mapId?: string): BoardDefinition;
declare function createDefaultBoardDefinition(): BoardDefinition;
declare function getTile(board: BoardDefinition, position: GridPosition): TileDefinition | undefined;
declare function getTilesByType(board: BoardDefinition, type: TileDefinition["type"]): TileDefinition[];
declare function isWithinBoard(board: BoardDefinition, position: GridPosition): boolean;

interface CharacterToolTransformDefinition {
    fromToolId: ToolId;
    paramMappings: Array<{
        fromParamId: ToolParameterId;
        toParamId: ToolParameterId;
    }>;
    toToolId: ToolId;
}
interface CharacterDefinition {
    activeSkillLoadout: ToolLoadoutDefinition[];
    id: CharacterId;
    label: string;
    summary: string;
    toolTransforms: CharacterToolTransformDefinition[];
    turnStartActionIds: readonly TurnStartActionId[];
    turnStartGrants: ToolLoadoutDefinition[];
}
declare const CHARACTER_DEFINITIONS: Record<"late" | "ehh" | "leader" | "blaze" | "volaty" | "chain" | "farther", CharacterDefinition>;
declare function getCharacterDefinition(characterId: CharacterId): CharacterDefinition;
declare function getCharacterIds(): CharacterId[];
declare function getNextCharacterId(characterId: CharacterId): CharacterId;
declare function buildCharacterTurnLoadout(characterId: CharacterId): ToolLoadoutDefinition[];
declare function getCharacterActiveSkillToolIds(characterId: CharacterId): ToolId[];
declare function getCharacterTurnStartActionIds(characterId: CharacterId): readonly TurnStartActionId[];
declare function applyCharacterToolTransforms(characterId: CharacterId, tools: TurnToolSnapshot[]): TurnToolSnapshot[];

declare const BLAZE_BOMB_PREPARED_STATE_KEY = "blazeBombPrepared";
declare const VOLATY_LEAP_TURN_STATE_KEY = "volatyLeapTurn";
declare const CHAIN_MOVED_OUT_OF_TURN_STATE_KEY = "chainMovedOutOfTurn";
declare const CHAIN_HOOK_READY_STATE_KEY = "chainHookReady";
declare const FARTHER_PENDING_MOVE_BONUS_STATE_KEY = "fartherPendingMoveBonus";
interface CharacterTurnStartResolution {
    nextCharacterState: CharacterStateMap;
    turnStartActions: TurnStartActionId[];
}
interface CharacterTurnLoadoutResolution {
    loadout: ToolLoadoutDefinition[];
    nextCharacterState: CharacterStateMap;
}
interface CharacterTurnStartActionResolution {
    endTurn: boolean;
    nextCharacterState: CharacterStateMap;
    skipToolDie: boolean;
}
declare function cloneCharacterState(characterState: CharacterStateMap): CharacterStateMap;
declare function getCharacterStateBoolean(characterState: CharacterStateMap, key: string): boolean;
declare function getCharacterStateNumber(characterState: CharacterStateMap, key: string): number;
declare function setCharacterStateValue(characterState: CharacterStateMap, key: string, value: boolean | number | string | undefined): CharacterStateMap;
declare function prepareCharacterTurnStart(characterId: CharacterId, characterState: CharacterStateMap): CharacterTurnStartResolution;
declare function buildCharacterTurnLoadoutRuntime(characterId: CharacterId, characterState: CharacterStateMap): CharacterTurnLoadoutResolution;
declare function resolveCharacterTurnStartAction(characterId: CharacterId, characterState: CharacterStateMap, actionId: TurnStartActionId): CharacterTurnStartActionResolution | null;
declare function getCharacterMovementOverrideType(characterId: CharacterId, characterState: CharacterStateMap): MovementType | null;
declare function markCharacterMovedOutOfTurn(characterId: CharacterId, characterState: CharacterStateMap): CharacterStateMap;
declare function applyCharacterTurnEndCleanup(characterId: CharacterId, characterState: CharacterStateMap): CharacterStateMap;
declare function getTotalMovementPoints(tools: TurnToolSnapshot[]): number;
declare function adjustMovementTools(tools: TurnToolSnapshot[], delta: number): TurnToolSnapshot[];
declare function clearMovementTools(tools: TurnToolSnapshot[]): TurnToolSnapshot[];

declare const WATCHER_ROOM_NAME = "watcher_room";
declare const BOARD_WIDTH = 9;
declare const BOARD_HEIGHT = 9;
declare const DEFAULT_MOVE_POINTS = 0;
declare const DEFAULT_MOVEMENT_ACTIONS = 0;
declare const BASE_MOVEMENT_ACTIONS_PER_TURN = 1;
declare const MOVEMENT_DIE_FACES: readonly [1, 2, 3, 4, 5, 6];
declare const PLAYER_COLORS: string[];
declare const PLAYER_SPAWNS: {
    x: number;
    y: number;
}[];

interface DieRollResult<T> {
    value: T;
    nextSeed: number;
}
declare function nextDeterministicSeed(seed: number): number;
declare function rollMovementDie(seed: number): DieRollResult<number>;
declare function rollToolDie(seed: number): DieRollResult<ToolDieFaceDefinition>;

interface PresentationEffectDefinition {
    description: string;
    id: PresentationEffectType;
    label: string;
}
declare const PRESENTATION_EFFECT_DEFINITIONS: Record<PresentationEffectType, PresentationEffectDefinition>;
declare function getPresentationEffectDefinition(effectType: PresentationEffectType): PresentationEffectDefinition;

declare const GOLDEN_CASES: GoldenCaseDefinition[];

declare function buildGoldenLayoutSymbols(overrides?: Partial<Record<string, LayoutSymbolDefinition>>): Record<string, LayoutSymbolDefinition>;
declare function createBoardDefinitionFromGoldenLayout(layout: readonly string[], symbolOverrides?: Partial<Record<string, LayoutSymbolDefinition>>): BoardDefinition;
declare function serializeGoldenBoardLayout(board: BoardDefinition, symbolOverrides?: Partial<Record<string, LayoutSymbolDefinition>>): string[];

interface SimulationToolLoadoutDefinition {
    charges?: number;
    instanceId?: string;
    params?: TurnToolSnapshot["params"];
    source?: ToolSource;
    toolId: ToolId;
}
interface SimulationPlayerDefinition {
    boardVisible?: boolean;
    characterId?: CharacterId;
    characterState?: CharacterStateMap;
    color?: string;
    finishRank?: number | null;
    finishedTurnNumber?: number | null;
    id: string;
    name?: string;
    petId?: string;
    position: GridPosition;
    spawnPosition?: GridPosition;
    tools?: SimulationToolLoadoutDefinition[];
    turnFlags?: PlayerTurnFlag[];
}
interface SimulationSummonDefinition {
    instanceId?: string;
    ownerId: string;
    position: GridPosition;
    summonId: SummonId;
}
interface SimulationSeedState {
    moveDieSeed: number;
    nextPresentationSequence: number;
    nextToolInstanceSerial: number;
    toolDieSeed: number;
}
interface SimulationSceneDefinition {
    allowDebugTools?: boolean;
    layout: readonly string[];
    mapId?: GameMapId | "custom";
    mapLabel?: string;
    mode?: GameMode;
    players: SimulationPlayerDefinition[];
    seeds?: Partial<SimulationSeedState>;
    settlementState?: GameSnapshot["settlementState"];
    summons?: SimulationSummonDefinition[];
    symbols?: Partial<Record<string, LayoutSymbolDefinition>>;
    turn?: Partial<TurnInfoSnapshot>;
}
interface SimulationRollDiceCommand {
    actorId: string;
    kind: "rollDice";
}
interface SimulationUseTurnStartActionCommand {
    actorId: string;
    kind: "useTurnStartAction";
    payload: UseTurnStartActionCommandPayload;
}
interface SimulationUseToolCommand {
    actorId: string;
    kind: "useTool";
    payload: UseToolCommandPayload;
}
interface SimulationEndTurnCommand {
    actorId: string;
    kind: "endTurn";
}
interface SimulationSetCharacterCommand {
    actorId: string;
    kind: "setCharacter";
    payload: SetCharacterCommandPayload;
}
interface SimulationGrantDebugToolCommand {
    actorId: string;
    kind: "grantDebugTool";
    payload: GrantDebugToolPayload;
}
type SimulationCommand = SimulationRollDiceCommand | SimulationUseTurnStartActionCommand | SimulationUseToolCommand | SimulationEndTurnCommand | SimulationSetCharacterCommand | SimulationGrantDebugToolCommand;
interface SimulationCommandOutcome {
    message: string;
    reason?: string;
    status: "blocked" | "ok";
}
interface SimulationDispatchResult {
    outcome: SimulationCommandOutcome;
    snapshot: GameSnapshot;
}
interface GameSimulation {
    dispatch: (command: SimulationCommand) => SimulationDispatchResult;
    getSnapshot: () => GameSnapshot;
}

declare function cloneGameSnapshot(snapshot: GameSnapshot): GameSnapshot;
declare function createGameSimulation(sceneDefinition: SimulationSceneDefinition): GameSimulation;

interface GoldenToolLoadoutDefinition extends SimulationToolLoadoutDefinition {
}
interface GoldenPlayerDefinition {
    characterId?: CharacterId;
    characterState?: CharacterStateMap;
    color?: string;
    id: string;
    name?: string;
    position: GridPosition;
    spawnPosition?: GridPosition;
    tools?: GoldenToolLoadoutDefinition[];
    turnFlags?: PlayerTurnFlag[];
}
interface GoldenSummonDefinition {
    instanceId?: string;
    ownerId: string;
    position: GridPosition;
    summonId: SummonId;
}
interface GoldenSeedState {
    moveDieSeed: number;
    nextPresentationSequence: number;
    nextToolInstanceSerial: number;
    toolDieSeed: number;
}
interface GoldenSceneDefinition extends SimulationSceneDefinition {
}
interface GoldenToolSelectorDefinition {
    instanceId?: string;
    nth?: number;
    source?: ToolSource;
    toolId?: ToolId;
}
interface GoldenStepExpectation {
    blockedReasonIncludes?: string;
}
interface GoldenCaseStepBase {
    actorId: string;
    expect?: GoldenStepExpectation;
    label?: string;
}
interface GoldenRollDiceStep extends GoldenCaseStepBase {
    kind: "rollDice";
}
interface GoldenUseToolStep extends GoldenCaseStepBase {
    choiceId?: string;
    direction?: Direction;
    kind: "useTool";
    targetPosition?: GridPosition;
    tool: GoldenToolSelectorDefinition | ToolId;
}
interface GoldenUseTurnStartActionStep extends GoldenCaseStepBase {
    actionId: GameSnapshot["turnInfo"]["turnStartActions"][number]["actionId"];
    kind: "useTurnStartAction";
}
interface GoldenEndTurnStep extends GoldenCaseStepBase {
    kind: "endTurn";
}
interface GoldenSetCharacterStep extends GoldenCaseStepBase {
    characterId: CharacterId;
    kind: "setCharacter";
}
interface GoldenGrantDebugToolStep extends GoldenCaseStepBase {
    kind: "grantDebugTool";
    toolId: ToolId;
}
type GoldenCaseStep = GoldenRollDiceStep | GoldenUseTurnStartActionStep | GoldenUseToolStep | GoldenEndTurnStep | GoldenSetCharacterStep | GoldenGrantDebugToolStep;
interface GoldenExpectedPlayerState {
    characterId?: CharacterId;
    finishRank?: number | null;
    finishedTurnNumber?: number | null;
    position?: GridPosition;
    spawnPosition?: GridPosition;
    toolCount?: number;
    toolIds?: ToolId[];
    turnFlags?: PlayerTurnFlag[];
}
interface GoldenExpectedSummonState {
    instanceId?: string;
    ownerId?: string;
    position: GridPosition;
    summonId: SummonId;
}
interface GoldenPresentationExpectation {
    eventKinds?: ActionPresentationEvent["kind"][];
    toolId?: ToolId | null;
}
interface GoldenCaseExpectation {
    allowDebugTools?: boolean;
    boardLayout?: readonly string[];
    eventTypes?: EventType[];
    latestPresentation?: GoldenPresentationExpectation;
    mapId?: GameSnapshot["mapId"];
    mapLabel?: string;
    mode?: GameMode;
    players?: Record<string, GoldenExpectedPlayerState>;
    settlementState?: GameSnapshot["settlementState"];
    summons?: GoldenExpectedSummonState[];
    summonCount?: number;
    turnInfo?: Partial<TurnInfoSnapshot>;
}
interface GoldenCaseDefinition {
    description?: string;
    expect: GoldenCaseExpectation;
    id: string;
    scene: GoldenSceneDefinition;
    steps: GoldenCaseStep[];
    title: string;
}
interface GoldenCasePlayerSummary {
    characterId: CharacterId;
    color: string;
    finishRank: number | null;
    finishedTurnNumber: number | null;
    position: GridPosition;
    spawnPosition: GridPosition;
    toolCount: number;
    toolIds: ToolId[];
    turnFlags: PlayerTurnFlag[];
}
interface GoldenCasePresentationSummary {
    eventKinds: ActionPresentationEvent["kind"][];
    sequence: number | null;
    toolId: ToolId | null;
}
interface GoldenCaseStateSummary {
    allowDebugTools: boolean;
    boardLayout: string[];
    eventTypes: EventType[];
    latestPresentation: GoldenCasePresentationSummary;
    mapId: GameSnapshot["mapId"];
    mapLabel: string;
    mode: GameMode;
    players: Record<string, GoldenCasePlayerSummary>;
    settlementState: GameSnapshot["settlementState"];
    summons: SummonSnapshot[];
    turnInfo: TurnInfoSnapshot;
}
interface GoldenCaseStepResult {
    label: string;
    message: string;
    passed: boolean;
    status: "blocked" | "ok";
}
interface GoldenCasePlaybackStep {
    label: string;
    outcome: SimulationCommandOutcome;
    snapshot: GameSnapshot;
    step: GoldenCaseStep;
    stepResult: GoldenCaseStepResult;
}
interface GoldenCaseResult {
    actual: GoldenCaseStateSummary;
    caseId: string;
    description?: string;
    mismatches: string[];
    passed: boolean;
    snapshot: GameSnapshot;
    stepResults: GoldenCaseStepResult[];
    title: string;
}
interface GoldenCasePlayback {
    initialSnapshot: GameSnapshot;
    result: GoldenCaseResult;
    steps: GoldenCasePlaybackStep[];
}
declare function defineGoldenCase(caseDefinition: GoldenCaseDefinition): GoldenCaseDefinition;

declare function buildGoldenCasePlayback(caseDefinition: GoldenCaseDefinition): GoldenCasePlayback;
declare function runGoldenCase(caseDefinition: GoldenCaseDefinition): GoldenCaseResult;
declare function runGoldenCases(caseDefinitions: readonly GoldenCaseDefinition[]): GoldenCaseResult[];

interface FinishedPlayerLike {
    finishRank: number | null;
    finishedTurnNumber: number | null;
    id: string;
}
interface RaceStandingEntry {
    finishedTurnNumber: number;
    playerId: string;
    rank: number;
}
interface GameMapRuntimeMetadata {
    allowDebugTools: boolean;
    mapId: GameMapId;
    mapLabel: string;
    mode: GameMode;
}
declare function buildGameMapRuntimeMetadata(mapId?: string): GameMapRuntimeMetadata;
declare function isPlayerFinished(player: Pick<FinishedPlayerLike, "finishRank">): boolean;
declare function getNextFinishRank(players: FinishedPlayerLike[]): number;
declare function buildRaceStandings(players: FinishedPlayerLike[]): RaceStandingEntry[];
declare function areAllRacePlayersFinished(players: FinishedPlayerLike[]): boolean;
declare function resolveSettlementState(mode: GameMode, players: FinishedPlayerLike[]): GameSettlementState;
declare function getNextActiveRacePlayerId(playerOrder: string[], players: FinishedPlayerLike[], currentPlayerId: string): string | null;

declare const ROCKET_BLAST_DELAY_MS = 40;
declare function createPresentation(actorId: string, toolId: ToolId, events: ActionPresentationEvent[]): ActionPresentation | null;
declare function createPlayerMotionEvent(eventId: string, playerId: string, positions: GridPosition[], motionStyle: PresentationMotionStyle, startMs?: number): ActionPresentationEvent | null;
declare function createProjectileEvent(eventId: string, ownerId: string, projectileType: PresentationProjectileType, positions: GridPosition[], startMs?: number): ActionPresentationEvent | null;
declare function createEffectEvent(eventId: string, effectType: PresentationEffectType, position: GridPosition, tiles: GridPosition[], startMs?: number, durationMs?: number): ActionPresentationEvent;
declare function createStateTransitionEvent(eventId: string, tileTransitions: TileStateTransition[], summonTransitions: SummonStateTransition[], playerTransitions?: PlayerStateTransition[], startMs?: number): ActionPresentationEvent | null;
declare function appendPresentationEvents(presentation: ActionPresentation | null, actorId: string, toolId: ToolId, events: ActionPresentationEvent[]): ActionPresentation | null;
declare function getMotionArrivalStartMs(positions: GridPosition[], motionStyle: PresentationMotionStyle, targetPosition: GridPosition, startMs?: number): number | null;
declare function buildMotionPositions(startPosition: GridPosition, path: GridPosition[]): GridPosition[];

interface SummonTriggerTarget {
    characterId: CharacterId;
    characterState: CharacterStateMap;
    id: string;
    position: GridPosition;
    spawnPosition: GridPosition;
    turnFlags: PlayerTurnFlag[];
}
interface SummonTriggerContext {
    direction?: Direction;
    movement: MovementDescriptor | null;
    player: SummonTriggerTarget;
    position: GridPosition;
    remainingMovePoints?: number;
    sourceId: string;
    summon: BoardSummonState;
    toolDieSeed: number;
    tools: TurnToolSnapshot[];
}
interface SummonTriggerResult {
    consumeSummon?: boolean;
    nextCharacterState?: CharacterStateMap;
    nextDirection?: Direction;
    nextRemainingMovePoints?: number;
    nextToolDieSeed?: number;
    nextTools?: TurnToolSnapshot[];
    nextTurnFlags?: PlayerTurnFlag[];
    triggeredSummonEffects: TriggeredSummonEffect[];
}
interface SummonPhaseContext {
    direction?: Direction;
    movement: MovementDescriptor | null;
    player: MovementActor;
    position: GridPosition;
    remainingMovePoints?: number;
    sourceId: string;
    summons: BoardSummonState[];
    toolDieSeed: number;
    tools: TurnToolSnapshot[];
}
interface SummonPhaseResolution {
    nextCharacterState?: CharacterStateMap;
    nextDirection?: Direction;
    nextRemainingMovePoints?: number;
    nextToolDieSeed?: number;
    nextTools?: TurnToolSnapshot[];
    nextTurnFlags?: PlayerTurnFlag[];
    summonMutations: SummonMutation[];
    triggeredSummonEffects: TriggeredSummonEffect[];
}
interface SummonDefinition {
    description: string;
    id: SummonId;
    label: string;
    onPassThrough?: (context: SummonTriggerContext) => SummonTriggerResult | null;
    onStop?: (context: SummonTriggerContext) => SummonTriggerResult | null;
    triggerMode: "movement_trigger";
}
declare const SUMMON_DEFINITIONS: Record<SummonId, SummonDefinition>;
declare function getSummonDefinition(summonId: SummonId): SummonDefinition;
declare function hasSummonAtPosition(summons: BoardSummonState[], position: GridPosition): boolean;
declare function createSummonUpsertMutation(instanceId: string, summonId: SummonId, ownerId: string, position: GridPosition): SummonMutation;
declare function resolvePassThroughSummonEffects(context: SummonPhaseContext): SummonPhaseResolution;
declare function resolveStopSummonEffects(context: SummonPhaseContext): SummonPhaseResolution;

interface TerrainPassThroughContext {
    direction?: Direction;
    movement: MovementDescriptor;
    playerId: string;
    position: GridPosition;
    remainingMovePoints?: number;
    tile: TileDefinition;
}
interface TerrainPassThroughResult {
    nextCharacterState?: CharacterStateMap;
    nextDirection?: Direction;
    nextRemainingMovePoints?: number;
    nextToolDieSeed?: number;
    nextTools?: TurnToolSnapshot[];
    nextTurnFlags?: PlayerTurnFlag[];
    triggeredTerrainEffects: TriggeredTerrainEffect[];
}
interface StopResolutionTarget {
    characterId: MovementActor["characterId"];
    characterState: CharacterStateMap;
    id: string;
    isActor: boolean;
    position: GridPosition;
    spawnPosition: GridPosition;
    turnFlags: PlayerTurnFlag[];
}
interface TerrainStopContext {
    movement: MovementDescriptor | null;
    player: StopResolutionTarget;
    sourceId: string;
    tile: TileDefinition;
    toolDieSeed: number;
    tools: TurnToolSnapshot[];
}
interface TerrainStopResult {
    nextCharacterState?: CharacterStateMap;
    nextPosition?: GridPosition;
    nextToolDieSeed?: number;
    nextTools?: TurnToolSnapshot[];
    nextTurnFlags?: PlayerTurnFlag[];
    triggeredTerrainEffects: TriggeredTerrainEffect[];
}
declare function resolvePassThroughTerrainEffect(context: TerrainPassThroughContext): TerrainPassThroughResult;
declare function resolveStopTerrainEffect(context: TerrainStopContext): TerrainStopResult | null;
declare function isLuckyTurnFlag(flag: PlayerTurnFlag): boolean;
declare function getTerrainTileKey(position: GridPosition): string;
declare function createTerrainStopTarget(actor: MovementActor, position: GridPosition, isActor: boolean): StopResolutionTarget;

declare const TOOL_DEFINITIONS: Record<"teleport" | "jump" | "hookshot" | "dash" | "buildWall" | "basketball" | "rocket" | "movement" | "brake" | "deployWallet" | "bombThrow" | "balance", ToolDefinition>;
declare const TOOL_DIE_FACES: readonly ToolDieFaceDefinition[];
declare function getToolDefinition(toolId: ToolId): ToolDefinition;
declare function isDirectionalTool(toolId: ToolId): boolean;
declare function isTileTargetTool(toolId: ToolId): boolean;
declare function isChoiceTool(toolId: ToolId): boolean;
declare function isTileDirectionTool(toolId: ToolId): boolean;
declare function isAimTool(toolId: ToolId): boolean;
declare function isCharacterSkillTool(tool: TurnToolSnapshot): boolean;
declare function createToolInstance(instanceId: string, toolId: ToolId, overrides?: Omit<ToolLoadoutDefinition, "toolId">): TurnToolSnapshot;
declare function createMovementToolInstance(instanceId: string, movePoints: number): TurnToolSnapshot;
declare function createRolledToolInstance(instanceId: string, face: ToolDieFaceDefinition): TurnToolSnapshot;
declare function createDebugToolInstance(instanceId: string, toolId: ToolId): TurnToolSnapshot;
declare function findToolInstance(tools: TurnToolSnapshot[], instanceId: string): TurnToolSnapshot | undefined;
declare function getToolParam(tool: TurnToolSnapshot, paramId: ToolParameterId): number;
declare function consumeToolInstance(tools: TurnToolSnapshot[], instanceId: string): TurnToolSnapshot[];
declare function getToolAvailability(tool: TurnToolSnapshot, tools: TurnToolSnapshot[]): ToolAvailability;
declare function getToolDisabledMessage(tool: TurnToolSnapshot, tools: TurnToolSnapshot[]): string | null;
declare function describeToolButtonLabel(tool: TurnToolSnapshot): string;
declare function describeToolButtonValue(tool: TurnToolSnapshot): string | null;
declare function describeToolParameters(tool: TurnToolSnapshot): string[];
declare function getToolChoiceDefinitions(toolId: ToolId): readonly ToolChoiceDefinition[];
declare function getDebugGrantableToolIds(): ToolId[];
declare function getRollableToolIds(): RolledToolId[];

interface TurnStartActionDefinition {
    color: string;
    description: string;
    id: TurnStartActionId;
    label: string;
}
declare const TURN_START_ACTION_DEFINITIONS: Record<"blazePrepareBomb" | "volatySkipToolDie", TurnStartActionDefinition>;
declare function getTurnStartActionDefinition(actionId: TurnStartActionId): TurnStartActionDefinition;
declare function createTurnStartActionSnapshot(actionId: TurnStartActionId, characterId: CharacterId): TurnStartActionSnapshot;

export { type ActionContextBase, type ActionPresentation, type ActionPresentationEvent, type ActionPresentationEventBase, type ActionResolution, type AffectedPlayerMove, BASE_MOVEMENT_ACTIONS_PER_TURN, BLAZE_BOMB_PREPARED_STATE_KEY, BOARD_HEIGHT, BOARD_WIDTH, type BoardDefinition, type BoardPlayerState, type BoardSummonState, CHAIN_HOOK_READY_STATE_KEY, CHAIN_MOVED_OUT_OF_TURN_STATE_KEY, CHARACTER_DEFINITIONS, type CharacterDefinition, type CharacterId, type CharacterStateMap, type CharacterStateValue, type CharacterTurnLoadoutResolution, type CharacterTurnStartActionResolution, type CharacterTurnStartResolution, DEFAULT_GAME_MAP_ID, DEFAULT_MOVEMENT_ACTIONS, DEFAULT_MOVE_POINTS, type DieRollResult, type Direction, type DirectionalActionContext, type EffectPresentationEvent, type EventLogEntry, type EventType, FARTHER_PENDING_MOVE_BONUS_STATE_KEY, GAME_MAP_REGISTRY, GOLDEN_CASES, type GameMapContentDefinition, type GameMapId, type GameMapRegistry, type GameMapRuntimeMetadata, type GameMode, type GameSettlementState, type GameSimulation, type GameSnapshot, type GoldenCaseDefinition, type GoldenCaseExpectation, type GoldenCasePlayback, type GoldenCasePlaybackStep, type GoldenCasePlayerSummary, type GoldenCasePresentationSummary, type GoldenCaseResult, type GoldenCaseStateSummary, type GoldenCaseStep, type GoldenCaseStepResult, type GoldenEndTurnStep, type GoldenExpectedPlayerState, type GoldenExpectedSummonState, type GoldenGrantDebugToolStep, type GoldenPlayerDefinition, type GoldenPresentationExpectation, type GoldenRollDiceStep, type GoldenSceneDefinition, type GoldenSeedState, type GoldenSetCharacterStep, type GoldenStepExpectation, type GoldenSummonDefinition, type GoldenToolLoadoutDefinition, type GoldenToolSelectorDefinition, type GoldenUseToolStep, type GoldenUseTurnStartActionStep, type GrantDebugToolPayload, type GridPosition, type KickPlayerCommandPayload, MOVEMENT_DIE_FACES, type MovementActor, type MovementContext, type MovementDescriptor, type MovementDisposition, type MovementResolution, type MovementTiming, type MovementType, PLAYER_COLORS, PLAYER_SPAWNS, PRESENTATION_EFFECT_DEFINITIONS, type PlayerMotionPresentationEvent, type PlayerPresentationState, type PlayerSnapshot, type PlayerStateTransition, type PlayerTurnFlag, type PresentationEffectDefinition, type PresentationEffectType, type PresentationMotionStyle, type PresentationProjectileType, type ProjectilePresentationEvent, RACE_GAME_MAP_ID, ROCKET_BLAST_DELAY_MS, type RaceStandingEntry, type ResolvedActorState, type ResolvedPlayerMovement, type RolledToolId, type RoomPhase, SUMMON_DEFINITIONS, type SequencedActionPresentation, type SetCharacterCommandPayload, type SetReadyCommandPayload, type SimulationCommand, type SimulationCommandOutcome, type SimulationDispatchResult, type SimulationEndTurnCommand, type SimulationGrantDebugToolCommand, type SimulationPlayerDefinition, type SimulationRollDiceCommand, type SimulationSceneDefinition, type SimulationSeedState, type SimulationSetCharacterCommand, type SimulationSummonDefinition, type SimulationToolLoadoutDefinition, type SimulationUseToolCommand, type SimulationUseTurnStartActionCommand, type StateTransitionPresentationEvent, type StopResolutionTarget, type SummonDefinition, type SummonId, type SummonMutation, type SummonPhaseResolution, type SummonPresentationState, type SummonSnapshot, type SummonStateTransition, TOOL_DEFINITIONS, TOOL_DIE_FACES, TURN_START_ACTION_DEFINITIONS, type TerrainPassThroughResult, type TerrainStopContext, type TerrainStopResult, type TileDefinition, type TileMutation, type TilePresentationState, type TileStateTransition, type TileTargetingMode, type TileType, type ToolActionContext, type ToolAvailability, type ToolButtonValueDefinition, type ToolChoiceDefinition, type ToolCondition, type ToolDefinition, type ToolDieFaceDefinition, type ToolId, type ToolLoadoutDefinition, type ToolParameterId, type ToolParameterValueMap, type ToolSource, type ToolTargetMode, type TriggeredSummonEffect, type TriggeredTerrainEffect, type TurnInfoSnapshot, type TurnPhase, type TurnStartActionDefinition, type TurnStartActionId, type TurnStartActionSnapshot, type TurnToolSnapshot, type UseToolCommandPayload, type UseTurnStartActionCommandPayload, VOLATY_LEAP_TURN_STATE_KEY, WATCHER_ROOM_NAME, adjustMovementTools, appendPresentationEvents, applyCharacterToolTransforms, applyCharacterTurnEndCleanup, areAllRacePlayersFinished, buildCharacterTurnLoadout, buildCharacterTurnLoadoutRuntime, buildGameMapRuntimeMetadata, buildGoldenCasePlayback, buildGoldenLayoutSymbols, buildMotionPositions, buildRaceStandings, clearMovementTools, cloneCharacterState, cloneGameSnapshot, consumeToolInstance, createBoardDefinition, createBoardDefinitionFromGoldenLayout, createDebugToolInstance, createDefaultBoardDefinition, createEffectEvent, createGameSimulation, createMovementToolInstance, createPlayerMotionEvent, createPresentation, createProjectileEvent, createRolledToolInstance, createStateTransitionEvent, createSummonUpsertMutation, createTerrainStopTarget, createToolInstance, createTurnStartActionSnapshot, defineGoldenCase, describeToolButtonLabel, describeToolButtonValue, describeToolParameters, findToolInstance, getCharacterActiveSkillToolIds, getCharacterDefinition, getCharacterIds, getCharacterMovementOverrideType, getCharacterStateBoolean, getCharacterStateNumber, getCharacterTurnStartActionIds, getDebugGrantableToolIds, getDirectionVector, getGameMapDefinition, getGameMapIds, getGameMapSpawnPosition, getMotionArrivalStartMs, getNextActiveRacePlayerId, getNextCharacterId, getNextFinishRank, getOppositeDirection, getPresentationEffectDefinition, getRollableToolIds, getSummonDefinition, getTerrainTileKey, getTile, getTilesByType, getToolAvailability, getToolChoiceDefinitions, getToolDefinition, getToolDisabledMessage, getToolParam, getTotalMovementPoints, getTurnStartActionDefinition, hasSummonAtPosition, isAimTool, isCharacterSkillTool, isChoiceTool, isDirectionalTool, isLuckyTurnFlag, isPlayerFinished, isSolidTileType, isTileDirectionTool, isTileTargetTool, isWithinBoard, markCharacterMovedOutOfTurn, nextDeterministicSeed, prepareCharacterTurnStart, resolveCharacterTurnStartAction, resolveCurrentTileStop, resolveGameMapId, resolvePassThroughSummonEffects, resolvePassThroughTerrainEffect, resolveSettlementState, resolveStopSummonEffects, resolveStopTerrainEffect, resolveToolAction, rollMovementDie, rollToolDie, runGoldenCase, runGoldenCases, serializeGoldenBoardLayout, setCharacterStateValue, stepPosition, toTileKey };
