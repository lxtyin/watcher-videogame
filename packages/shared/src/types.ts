import type {
  Direction as ContentDirection,
  GameMode as ContentGameMode,
  MovementContentDefinition,
  MovementDisposition as ContentMovementDisposition,
  MovementType as ContentMovementType,
  TeamId as ContentTeamId,
  TileType as ContentTileType,
  ToolHistoryEntryContentDefinition,
  ToolChoiceContentDefinition,
  ToolInteractionAnchorDefinition as ContentToolInteractionAnchorDefinition,
  ToolInteractionDefinition as ContentToolInteractionDefinition,
  ToolInteractionStageDefinition as ContentToolInteractionStageDefinition,
  ToolCommonParameterId as ContentToolCommonParameterId,
  ToolContentDefinition as ContentToolContentDefinition,
  ToolParameterId as ContentToolParameterId,
  ToolParameterValueMap as ContentToolParameterValueMap,
  ToolUsabilityContext as ContentToolUsabilityContext,
  ToolUsabilityResult as ContentToolUsabilityResult,
  TextDescription as ContentTextDescription,
  ToolTextDescriptionContext as ContentToolTextDescriptionContext,
  ToolSource as ContentToolSource,
  TurnPhase as ContentTurnPhase
} from "./content/schema";

export type TileType = ContentTileType;
export type TurnPhase = ContentTurnPhase;
export type Direction = ContentDirection;
export type MovementType = ContentMovementType;
export type MovementDisposition = ContentMovementDisposition;
export type MovementTiming = "in_turn" | "out_of_turn";
export type GameMode = ContentGameMode;
export type TeamId = ContentTeamId;
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
export type TextDescription = ContentTextDescription;
export type ToolTextDescriptionContext = ContentToolTextDescriptionContext;
export type PlayerTurnFlag = string;
export type ToolCommonParameterId = ContentToolCommonParameterId;
export type ToolParameterId = ContentToolParameterId;
export type ToolParameterValueMap = ContentToolParameterValueMap;
export type ToolUsabilityContext = ContentToolUsabilityContext;
export type ToolUsabilityResult = ContentToolUsabilityResult;
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
  faction: TeamId | null;
  key: string;
  type: TileType;
}

export interface BoardDefinition {
  height: number;
  tiles: TileDefinition[];
  width: number;
}

export interface MovementDescriptor {
  disposition: ContentMovementDisposition;
  tags: string[];
  timing: MovementTiming;
  type: ContentMovementType;
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
  teamId: TeamId | null;
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
  lastRolledMoveDieValue: number;
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

export type PresentationMotionStyle =
  | "ground"
  | "arc"
  | "finish"
  | "fall_side"
  | "spin_drop"
  | "impact_recoil";
export type PresentationProjectileType = "basketball" | "rocket" | "awm_bullet";
export type PresentationEffectType = keyof typeof import("./content/effects").EFFECT_REGISTRY;
export type PresentationSoundCueId = keyof typeof import("./content/sounds").SOUND_CUE_REGISTRY;
export type PresentationLinkStyle = "chain";
export type PresentationLinkProgressStyle = "full" | "extend_from_from";

export interface TurnToolSnapshot {
  charges: number;
  instanceId: string;
  params: ToolParameterValueMap;
  source: ToolSource;
  toolId: ToolId;
}

export interface ToolHistoryEntrySnapshot extends ToolHistoryEntryContentDefinition {
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
  choices?: readonly ToolChoiceDefinition[];
  color: string;
  debugGrantable: boolean;
  defaultCharges: number;
  defaultParams: ToolParameterValueMap;
  disabledHint: string | null;
  endsTurnOnUse: boolean;
  getTextDescription: (context: ToolTextDescriptionContext) => TextDescription;
  phases: readonly TurnPhase[];
  id: ToolId;
  isAvailable: ContentToolContentDefinition["isAvailable"];
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
  toolHistory: ToolHistoryEntrySnapshot[];
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
  teamId: TeamId | null;
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
  teamId: TeamId | null;
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
  presentationStartMs?: number;
  position: GridPosition;
}

export interface AffectedPlayerMove {
  boardVisible?: boolean;
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
  mode: GameMode;
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
  toolHistory: ToolHistoryEntrySnapshot[];
  turnNumber: number;
  tools: TurnToolSnapshot[];
}

export interface ResolvedActorState {
  boardVisible: boolean;
  modifiers: ModifierId[];
  position: GridPosition;
  tags: PlayerTagMap;
  turnFlags: PlayerTurnFlag[];
}

export type TriggeredTerrainEffect =
  | {
      grantedTool: TurnToolSnapshot;
      impactStrength: number;
      kind: "boxing_ball";
      movement: MovementDescriptor;
      playerId: string;
      position: GridPosition;
      tileKey: string;
    }
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
      respawnPosition: GridPosition | null;
      tileKey: string;
    }
  | {
      kind: "poison";
      movement: MovementDescriptor | null;
      playerId: string;
      position: GridPosition;
      respawnPosition: GridPosition | null;
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
      grantedTool: TurnToolSnapshot;
      kind: "team_camp";
      playerId: string;
      position: GridPosition;
      teamId: TeamId;
      tileKey: string;
    }
  | {
      kind: "tower";
      playerId: string;
      position: GridPosition;
      remainingDurability: number;
      teamId: TeamId;
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
  movement: MovementDescriptor | null;
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
      kind: "number_popup";
      position: GridPosition;
      value: number;
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

export interface SoundPresentationPayload {
  anchor: PresentationAnchor | null;
  cueId: PresentationSoundCueId;
  volume?: number;
}

export interface SoundPresentationEvent extends ActionPresentationEventBase {
  kind: "sound";
  sound: SoundPresentationPayload;
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
  highlightTiles: GridPosition[];
  playerTargets: PreviewPlayerTarget[];
  selectionTiles: GridPosition[];
  valid: boolean;
}

export interface TilePresentationState {
  direction: Direction | null;
  durability: number;
  faction: TeamId | null;
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
  | SoundPresentationEvent
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
  rollMode?: "movement_only" | "standard" | "tool_only";
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


