import type {
  Direction as ContentDirection,
  MovementContentDefinition,
  MovementDisposition as ContentMovementDisposition,
  MovementType as ContentMovementType,
  TileTargetingMode as ContentTileTargetingMode,
  TileType as ContentTileType,
  ToolChoiceContentDefinition,
  ToolButtonValueContentDefinition,
  ToolParameterId as ContentToolParameterId,
  ToolParameterValueMap as ContentToolParameterValueMap,
  ToolSource as ContentToolSource,
  ToolTargetMode as ContentToolTargetMode,
  TurnPhase as ContentTurnPhase
} from "./content/schema";

export type TileType = ContentTileType;
export type TurnPhase = ContentTurnPhase;
export type Direction = ContentDirection;
export type MovementType = ContentMovementType;
export type MovementDisposition = ContentMovementDisposition;
export type MovementTiming = "in_turn" | "out_of_turn";
export type GameMode = "free" | "race";
export type GameSettlementState = "active" | "complete";
export type RoomPhase = "lobby" | "in_game" | "settlement";
export type CharacterId = keyof typeof import("./content/characters").CHARACTER_REGISTRY;
export type SummonId = keyof typeof import("./content/summons").SUMMON_REGISTRY;
export type ToolId = keyof typeof import("./content/tools").TOOL_REGISTRY;
export type GameMapId = keyof typeof import("./content/maps").GAME_MAP_REGISTRY;
export type RolledToolId = typeof import("./content/tools").TOOL_DIE_FACES[number]["toolId"];
export type TurnStartActionId =
  keyof typeof import("./content/turnStartActions").TURN_START_ACTION_REGISTRY;
export type ToolSource = ContentToolSource;
export type ToolTargetMode = ContentToolTargetMode;
export type TileTargetingMode = ContentTileTargetingMode;
export type PlayerTurnFlag = "lucky_tile_claimed";
export type ToolParameterId = ContentToolParameterId;
export type ToolParameterValueMap = ContentToolParameterValueMap;
export type CharacterStateValue = boolean | number | string;
export type CharacterStateMap = Partial<Record<string, CharacterStateValue>>;
export type EventType =
  | "piece_moved"
  | "move_blocked"
  | "earth_wall_broken"
  | "turn_started"
  | "dice_rolled"
  | "tool_used"
  | "turn_ended"
  | "terrain_triggered"
  | "player_respawned"
  | "debug_granted"
  | "character_switched"
  | "summon_triggered"
  | "character_action_used"
  | "player_kicked"
  | "player_finished"
  | "match_finished";

export interface GridPosition {
  x: number;
  y: number;
}

export interface TileDefinition extends GridPosition {
  direction: Direction | null;
  durability: number;
  key: string;
  type: TileType;
}

export interface BoardDefinition {
  height: number;
  tiles: TileDefinition[];
  width: number;
}

export interface ToolButtonValueDefinition extends ToolButtonValueContentDefinition {}

export interface MovementDescriptor extends MovementContentDefinition {
  tags: string[];
  timing: MovementTiming;
}

export interface TurnStartActionSnapshot {
  actionId: TurnStartActionId;
  characterId: CharacterId;
}

export interface PlayerSnapshot {
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

export interface SummonSnapshot {
  instanceId: string;
  ownerId: string;
  position: GridPosition;
  summonId: SummonId;
}

export interface TurnInfoSnapshot {
  currentPlayerId: string;
  lastRolledToolId: RolledToolId | null;
  moveRoll: number;
  phase: TurnPhase;
  turnStartActions: TurnStartActionSnapshot[];
  toolDieSeed: number;
  turnNumber: number;
}

export interface EventLogEntry {
  createdAt: number;
  id: string;
  message: string;
  type: EventType;
}

export type PresentationMotionStyle = "ground" | "arc" | "finish";
export type PresentationProjectileType = "basketball" | "rocket";
export type PresentationEffectType = keyof typeof import("./content/effects").EFFECT_REGISTRY;

export interface TurnToolSnapshot {
  charges: number;
  instanceId: string;
  params: ToolParameterValueMap;
  source: ToolSource;
  toolId: ToolId;
}

export interface ToolCondition {
  kind: "tool_present";
  toolId: ToolId;
}

export interface ToolChoiceDefinition extends ToolChoiceContentDefinition {}

export interface ToolLoadoutDefinition {
  charges?: number;
  params?: ToolParameterValueMap;
  source?: ToolSource;
  toolId: ToolId;
}

export interface ToolDieFaceDefinition extends ToolLoadoutDefinition {
  toolId: RolledToolId;
}

export interface ToolDefinition {
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

export interface GameSnapshot {
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

export interface UseToolCommandPayload {
  choiceId?: string;
  direction?: Direction;
  targetPosition?: GridPosition;
  toolInstanceId: string;
}

export interface UseTurnStartActionCommandPayload {
  actionId: TurnStartActionId;
  choiceId?: string;
}

export interface GrantDebugToolPayload {
  toolId: ToolId;
}

export interface SetCharacterCommandPayload {
  characterId: CharacterId;
}

export interface SetReadyCommandPayload {
  isReady: boolean;
}

export interface KickPlayerCommandPayload {
  playerId: string;
}

export interface MovementActor {
  characterId: CharacterId;
  characterState: CharacterStateMap;
  id: string;
  position: GridPosition;
  spawnPosition: GridPosition;
  turnFlags: PlayerTurnFlag[];
}

export interface MovementContext {
  actor: MovementActor;
  board: BoardDefinition;
  direction: Direction;
  movePoints: number;
}

export type MovementResolution =
  | {
      kind: "blocked";
      reason: string;
      target: GridPosition;
    }
  | {
      destroyedTileKey?: string;
      kind: "moved";
      moveCost: number;
      target: GridPosition;
    };

export interface BoardPlayerState {
  boardVisible: boolean;
  characterId: CharacterId;
  characterState: CharacterStateMap;
  id: string;
  position: GridPosition;
  spawnPosition: GridPosition;
  turnFlags: PlayerTurnFlag[];
}

export interface BoardSummonState {
  instanceId: string;
  ownerId: string;
  position: GridPosition;
  summonId: SummonId;
}

export interface TileMutation {
  key: string;
  nextDurability: number;
  nextType: TileType;
  position: GridPosition;
}

export interface AffectedPlayerMove {
  characterState?: CharacterStateMap;
  movement: MovementDescriptor;
  path: GridPosition[];
  playerId: string;
  reason: string;
  startPosition: GridPosition;
  target: GridPosition;
  turnFlags?: PlayerTurnFlag[];
}

export interface ResolvedPlayerMovement {
  movement: MovementDescriptor;
  path: GridPosition[];
  playerId: string;
  startPosition: GridPosition;
  target: GridPosition;
}

export interface ActionContextBase {
  actor: MovementActor;
  board: BoardDefinition;
  players: BoardPlayerState[];
}

export interface DirectionalActionContext extends ActionContextBase {
  direction: Direction;
}

export interface ToolActionContext extends ActionContextBase {
  activeTool: TurnToolSnapshot;
  choiceId?: string;
  direction?: Direction;
  summons: BoardSummonState[];
  targetPosition?: GridPosition;
  toolDieSeed: number;
  tools: TurnToolSnapshot[];
}

export interface ResolvedActorState {
  characterState: CharacterStateMap;
  position: GridPosition;
  turnFlags: PlayerTurnFlag[];
}

export interface ToolAvailability {
  reason: string | null;
  usable: boolean;
}

export type TriggeredTerrainEffect =
  | {
      kind: "goal";
      movement: MovementDescriptor | null;
      playerId: string;
      position: GridPosition;
      tileKey: string;
    }
  | {
      kind: "pit";
      movement: MovementDescriptor | null;
      playerId: string;
      position: GridPosition;
      respawnPosition: GridPosition;
      tileKey: string;
    }
  | {
      grantedTool: TurnToolSnapshot;
      kind: "lucky";
      movement: MovementDescriptor | null;
      playerId: string;
      position: GridPosition;
      tileKey: string;
    }
  | {
      bonusMovePoints: number;
      direction: Direction;
      kind: "conveyor_boost";
      movement: MovementDescriptor;
      playerId: string;
      position: GridPosition;
      tileKey: string;
    }
  | {
      fromDirection: Direction;
      kind: "conveyor_turn";
      movement: MovementDescriptor;
      playerId: string;
      position: GridPosition;
      tileKey: string;
      toDirection: Direction;
    };

export type TriggeredSummonEffect = {
  grantedTool: TurnToolSnapshot;
  kind: "wallet_pickup";
  movement: MovementDescriptor;
  ownerId: string;
  playerId: string;
  position: GridPosition;
  summonId: SummonId;
  summonInstanceId: string;
};

export type SummonMutation =
  | {
      instanceId: string;
      kind: "upsert";
      ownerId: string;
      position: GridPosition;
      summonId: SummonId;
    }
  | {
      instanceId: string;
      kind: "remove";
    };

export interface ActionPresentationEventBase {
  durationMs: number;
  id: string;
  startMs: number;
}

export interface PlayerMotionPresentationEvent extends ActionPresentationEventBase {
  kind: "player_motion";
  motionStyle: PresentationMotionStyle;
  playerId: string;
  positions: GridPosition[];
}

export interface ProjectilePresentationEvent extends ActionPresentationEventBase {
  kind: "projectile";
  ownerId: string;
  positions: GridPosition[];
  projectileType: PresentationProjectileType;
}

export interface EffectPresentationEvent extends ActionPresentationEventBase {
  effectType: PresentationEffectType;
  kind: "effect";
  position: GridPosition;
  tiles: GridPosition[];
}

export interface TilePresentationState {
  direction: Direction | null;
  durability: number;
  type: TileType;
}

export interface TileStateTransition {
  after: TilePresentationState;
  before: TilePresentationState;
  key: string;
  position: GridPosition;
}

export interface SummonPresentationState {
  instanceId: string;
  ownerId: string;
  position: GridPosition;
  summonId: SummonId;
}

export interface SummonStateTransition {
  after: SummonPresentationState | null;
  before: SummonPresentationState | null;
  instanceId: string;
}

export interface PlayerPresentationState {
  boardVisible: boolean;
  playerId: string;
}

export interface PlayerStateTransition {
  after: PlayerPresentationState;
  before: PlayerPresentationState;
  playerId: string;
}

export interface StateTransitionPresentationEvent extends ActionPresentationEventBase {
  kind: "state_transition";
  playerTransitions: PlayerStateTransition[];
  summonTransitions: SummonStateTransition[];
  tileTransitions: TileStateTransition[];
}

export type ActionPresentationEvent =
  | PlayerMotionPresentationEvent
  | ProjectilePresentationEvent
  | EffectPresentationEvent
  | StateTransitionPresentationEvent;

export interface ActionPresentation {
  actorId: string;
  durationMs: number;
  events: ActionPresentationEvent[];
  toolId: ToolId;
}

export interface SequencedActionPresentation extends ActionPresentation {
  sequence: number;
}

export type ActionResolution =
  | {
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
    }
  | {
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


