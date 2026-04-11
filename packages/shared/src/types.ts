import type {
  Direction as ContentDirection,
  MovementContentDefinition,
  MovementDisposition as ContentMovementDisposition,
  MovementType as ContentMovementType,
  TileType as ContentTileType,
  ToolChoiceContentDefinition,
  ToolButtonValueContentDefinition,
  ToolInteractionAnchorDefinition as ContentToolInteractionAnchorDefinition,
  ToolInteractionDefinition as ContentToolInteractionDefinition,
  ToolInteractionStageDefinition as ContentToolInteractionStageDefinition,
  ToolParameterId as ContentToolParameterId,
  ToolParameterValueMap as ContentToolParameterValueMap,
  ToolSource as ContentToolSource,
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
export type SkillId = string;
export type ModifierId = string;
export type CharacterId = keyof typeof import("./content/characters").CHARACTER_REGISTRY;
export type SummonId = keyof typeof import("./content/summons").SUMMON_REGISTRY;
export type ToolId = keyof typeof import("./content/tools").TOOL_REGISTRY;
export type GameMapId = keyof typeof import("./content/maps").GAME_MAP_REGISTRY;
export type RolledToolId = typeof import("./content/tools").TOOL_DIE_FACES[number]["toolId"];
export type ToolSource = ContentToolSource;
export type ToolInteractionAnchor = ContentToolInteractionAnchorDefinition;
export type ToolInteractionStageDefinition = ContentToolInteractionStageDefinition;
export type ToolInteractionDefinition = ContentToolInteractionDefinition;
export type PlayerTurnFlag = string;
export type ToolParameterId = ContentToolParameterId;
export type ToolParameterValueMap = ContentToolParameterValueMap;
export type PlayerTagValue = boolean | number | string;
export type PlayerTagMap = Partial<Record<string, PlayerTagValue>>;

export type ToolSelectionValue =
  | {
      direction: Direction;
      kind: "direction";
    }
  | {
      kind: "tile";
      position: GridPosition;
    }
  | {
      choiceId: string;
      kind: "choice";
    };

export type ToolSelectionRecord = Partial<Record<string, ToolSelectionValue>>;
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

export interface MovementDescriptor {
  disposition: ContentMovementDisposition;
  tags: string[];
  timing: MovementTiming;
  type: ContentMovementType;
}

export interface MovementDescriptorInput {
  disposition: ContentMovementDisposition;
  tags: string[];
  timing: MovementTiming;
}

export interface PlayerSnapshot {
  boardVisible: boolean;
  characterId: CharacterId;
  color: string;
  finishRank: number | null;
  finishedTurnNumber: number | null;
  id: string;
  isConnected: boolean;
  isReady: boolean;
  name: string;
  petId: string;
  position: GridPosition;
  modifiers: ModifierId[];
  spawnPosition: GridPosition;
  tags: PlayerTagMap;
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
  toolDieSeed: number;
  turnNumber: number;
}

export interface EventLogEntry {
  createdAt: number;
  id: string;
  message: string;
  type: EventType;
}

export type PresentationMotionStyle = "ground" | "arc" | "finish" | "fall_side" | "spin_drop";
export type PresentationProjectileType = "basketball" | "rocket" | "awm_bullet";
export type PresentationEffectType = keyof typeof import("./content/effects").EFFECT_REGISTRY;
export type PresentationLinkStyle = "chain";
export type PresentationLinkProgressStyle = "full" | "extend_from_from";

export interface TurnToolSnapshot {
  charges: number;
  instanceId: string;
  params: ToolParameterValueMap;
  source: ToolSource;
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
  debugGrantable: boolean;
  defaultCharges: number;
  defaultParams: ToolParameterValueMap;
  description: string;
  disabledHint: string | null;
  endsTurnOnUse: boolean;
  phases: readonly TurnPhase[];
  id: ToolId;
  interaction: ToolInteractionDefinition;
  label: string;
  rollable: boolean;
  source: ToolSource;
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

export interface CustomMapDefinition {
  allowDebugTools: boolean;
  layout: string[];
  mapLabel: string;
  mode: GameMode;
}

export interface UseToolCommandPayload {
  input: ToolSelectionRecord;
  toolInstanceId: string;
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
  id: string;
  modifiers: ModifierId[];
  position: GridPosition;
  spawnPosition: GridPosition;
  tags: PlayerTagMap;
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
  id: string;
  modifiers: ModifierId[];
  position: GridPosition;
  spawnPosition: GridPosition;
  tags: PlayerTagMap;
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
  movement: MovementDescriptor;
  modifiers?: ModifierId[];
  path: GridPosition[];
  playerId: string;
  reason: string;
  startPosition: GridPosition;
  target: GridPosition;
  tags?: PlayerTagMap;
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
  input: ToolSelectionRecord;
  phase: TurnPhase;
  summons: BoardSummonState[];
  toolDieSeed: number;
  tools: TurnToolSnapshot[];
}

export interface ResolvedActorState {
  modifiers: ModifierId[];
  position: GridPosition;
  tags: PlayerTagMap;
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
      kind: "poison";
      movement: MovementDescriptor | null;
      playerId: string;
      position: GridPosition;
      respawnPosition: GridPosition;
      tileKey: string;
    }
  | {
      direction: Direction;
      kind: "cannon";
      movement: MovementDescriptor | null;
      playerId: string;
      position: GridPosition;
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

export type MotionPresentationSubject =
  | {
      kind: "player";
      motionStyle: PresentationMotionStyle;
      playerId: string;
    }
  | {
      kind: "projectile";
      ownerId: string | null;
      projectileType: PresentationProjectileType;
    };

export interface MotionPresentationEvent extends ActionPresentationEventBase {
  kind: "motion";
  positions: GridPosition[];
  subject: MotionPresentationSubject;
}

export type PresentationAnchor =
  | {
      kind: "player";
      playerId: string;
    }
  | {
      kind: "position";
      position: GridPosition;
    };

export type ReactionPresentationPayload =
  | {
      kind: "effect";
      effectType: PresentationEffectType;
      position: GridPosition;
      tiles: GridPosition[];
    }
  | {
      from: PresentationAnchor;
      kind: "link";
      progressStyle: PresentationLinkProgressStyle;
      style: PresentationLinkStyle;
      to: PresentationAnchor;
    }
  | {
      height: number;
      kind: "player_lift";
      playerId: string;
    };

export interface ReactionPresentationEvent extends ActionPresentationEventBase {
  kind: "reaction";
  reaction: ReactionPresentationPayload;
}

export interface PreviewPlayerTarget {
  boardVisible: boolean;
  playerId: string;
  startPosition: GridPosition;
  targetPosition: GridPosition;
}

export interface PreviewDescriptor {
  actorPath: GridPosition[];
  effectTiles: GridPosition[];
  playerTargets: PreviewPlayerTarget[];
  selectionTiles: GridPosition[];
  valid: boolean;
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
  | MotionPresentationEvent
  | ReactionPresentationEvent
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

export interface ActionPhaseEffect {
  finishTurn?: boolean;
  nextPhase?: TurnPhase;
}

export type ActionResolution =
  | {
      actorMovement: ResolvedPlayerMovement | null;
      actor: ResolvedActorState;
      affectedPlayers: AffectedPlayerMove[];
      endsTurn: boolean;
      phaseEffect: ActionPhaseEffect | null;
      kind: "blocked";
      nextToolDieSeed: number;
      path: GridPosition[];
      presentation: ActionPresentation | null;
      preview: PreviewDescriptor;
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
      phaseEffect: ActionPhaseEffect | null;
      kind: "applied";
      nextToolDieSeed: number;
      path: GridPosition[];
      presentation: ActionPresentation | null;
      preview: PreviewDescriptor;
      summary: string;
      summonMutations: SummonMutation[];
      tileMutations: TileMutation[];
      tools: TurnToolSnapshot[];
      triggeredSummonEffects: TriggeredSummonEffect[];
      triggeredTerrainEffects: TriggeredTerrainEffect[];
    };


