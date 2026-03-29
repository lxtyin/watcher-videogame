export type TileType =
  | "floor"
  | "wall"
  | "earthWall"
  | "pit"
  | "lucky"
  | "conveyor";
export type TurnPhase = "roll" | "action";
export type Direction = "up" | "down" | "left" | "right";
export type ToolId =
  | "movement"
  | "jump"
  | "hookshot"
  | "dash"
  | "brake"
  | "buildWall"
  | "basketball"
  | "rocket"
  | "teleport";
export type RolledToolId = Exclude<ToolId, "movement" | "teleport">;
export type ToolTargetMode = "direction" | "tile" | "instant";
export type TileTargetingMode = "axis_line" | "adjacent_ring" | "board_any";
export type PlayerTurnFlag = "lucky_tile_claimed";
export type ToolParameterId =
  | "movePoints"
  | "jumpDistance"
  | "hookLength"
  | "dashBonus"
  | "brakeRange"
  | "projectileRange"
  | "projectileBounceCount"
  | "projectilePushDistance"
  | "wallDurability"
  | "rocketBlastLeapDistance"
  | "rocketSplashPushDistance";
export type ToolParameterValueMap = Partial<Record<ToolParameterId, number>>;
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
  | "debug_granted";

export interface GridPosition {
  x: number;
  y: number;
}

export interface TileDefinition extends GridPosition {
  key: string;
  type: TileType;
  durability: number;
  direction: Direction | null;
}

export interface BoardDefinition {
  width: number;
  height: number;
  tiles: TileDefinition[];
}

export interface ToolButtonValueDefinition {
  paramId: ToolParameterId;
  unit: "point" | "tile";
}

export interface PlayerSnapshot {
  id: string;
  name: string;
  color: string;
  position: GridPosition;
  spawnPosition: GridPosition;
  turnFlags: PlayerTurnFlag[];
  tools: TurnToolSnapshot[];
}

export interface TurnInfoSnapshot {
  currentPlayerId: string;
  phase: TurnPhase;
  turnNumber: number;
  moveRoll: number;
  lastRolledToolId: RolledToolId | null;
  toolDieSeed: number;
}

export interface EventLogEntry {
  id: string;
  type: EventType;
  message: string;
  createdAt: number;
}

export type PresentationMotionStyle = "ground" | "arc";
export type PresentationProjectileType = "basketball" | "rocket";
export type PresentationEffectType = "rocket_explosion";

export interface TurnToolSnapshot {
  instanceId: string;
  toolId: ToolId;
  charges: number;
  params: ToolParameterValueMap;
}

export interface ToolCondition {
  kind: "tool_present";
  toolId: ToolId;
}

export interface ToolLoadoutDefinition {
  toolId: ToolId;
  charges?: number;
  params?: ToolParameterValueMap;
}

export interface ToolDieFaceDefinition extends ToolLoadoutDefinition {
  toolId: RolledToolId;
}

export interface ToolDefinition {
  id: ToolId;
  label: string;
  description: string;
  disabledHint: string | null;
  targetMode: ToolTargetMode;
  tileTargeting?: TileTargetingMode;
  conditions: ToolCondition[];
  defaultCharges: number;
  defaultParams: ToolParameterValueMap;
  buttonValue?: ToolButtonValueDefinition;
  color: string;
  rollable: boolean;
  debugGrantable: boolean;
}

export interface GameSnapshot {
  boardWidth: number;
  boardHeight: number;
  tiles: TileDefinition[];
  players: PlayerSnapshot[];
  turnInfo: TurnInfoSnapshot;
  eventLog: EventLogEntry[];
  latestPresentation: SequencedActionPresentation | null;
}

export interface UseToolCommandPayload {
  toolInstanceId: string;
  direction?: Direction;
  targetPosition?: GridPosition;
}

export interface GrantDebugToolPayload {
  toolId: ToolId;
}

export interface MovementActor {
  id: string;
  position: GridPosition;
  spawnPosition: GridPosition;
  turnFlags: PlayerTurnFlag[];
}

export interface MovementContext {
  board: BoardDefinition;
  actor: MovementActor;
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
      kind: "moved";
      target: GridPosition;
      moveCost: number;
      destroyedTileKey?: string;
    };

export interface BoardPlayerState {
  id: string;
  position: GridPosition;
  spawnPosition: GridPosition;
  turnFlags: PlayerTurnFlag[];
}

export interface TileMutation {
  key: string;
  position: GridPosition;
  nextType: TileType;
  nextDurability: number;
}

export interface AffectedPlayerMove {
  playerId: string;
  target: GridPosition;
  reason: string;
  turnFlags?: PlayerTurnFlag[];
}

export interface ActionContextBase {
  board: BoardDefinition;
  actor: MovementActor;
  players: BoardPlayerState[];
}

export interface DirectionalActionContext extends ActionContextBase {
  direction: Direction;
}

export interface ToolActionContext extends ActionContextBase {
  activeTool: TurnToolSnapshot;
  tools: TurnToolSnapshot[];
  toolDieSeed: number;
  direction?: Direction;
  targetPosition?: GridPosition;
}

export interface ResolvedActorState {
  position: GridPosition;
  turnFlags: PlayerTurnFlag[];
}

export interface ToolAvailability {
  usable: boolean;
  reason: string | null;
}

export type TriggeredTerrainEffect =
  | {
      kind: "pit";
      playerId: string;
      tileKey: string;
      position: GridPosition;
      respawnPosition: GridPosition;
    }
  | {
      kind: "lucky";
      playerId: string;
      tileKey: string;
      position: GridPosition;
      grantedTool: TurnToolSnapshot;
    }
  | {
      kind: "conveyor_boost";
      playerId: string;
      tileKey: string;
      position: GridPosition;
      direction: Direction;
      bonusMovePoints: number;
    }
  | {
      kind: "conveyor_turn";
      playerId: string;
      tileKey: string;
      position: GridPosition;
      fromDirection: Direction;
      toDirection: Direction;
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
  kind: "effect";
  effectType: PresentationEffectType;
  position: GridPosition;
  tiles: GridPosition[];
}

export type ActionPresentationEvent =
  | PlayerMotionPresentationEvent
  | ProjectilePresentationEvent
  | EffectPresentationEvent;

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
      kind: "blocked";
      reason: string;
      path: GridPosition[];
      previewTiles: GridPosition[];
      actor: ResolvedActorState;
      tools: TurnToolSnapshot[];
      affectedPlayers: AffectedPlayerMove[];
      tileMutations: TileMutation[];
      triggeredTerrainEffects: TriggeredTerrainEffect[];
      presentation: ActionPresentation | null;
      nextToolDieSeed: number;
    }
  | {
      kind: "applied";
      summary: string;
      path: GridPosition[];
      previewTiles: GridPosition[];
      actor: ResolvedActorState;
      tools: TurnToolSnapshot[];
      affectedPlayers: AffectedPlayerMove[];
      tileMutations: TileMutation[];
      triggeredTerrainEffects: TriggeredTerrainEffect[];
      presentation: ActionPresentation | null;
      nextToolDieSeed: number;
    };
