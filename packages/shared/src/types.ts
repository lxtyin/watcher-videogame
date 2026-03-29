export type TileType =
  | "floor"
  | "wall"
  | "earthWall"
  | "pit"
  | "lucky"
  | "conveyor";
export type TurnPhase = "roll" | "action";
export type Direction = "up" | "down" | "left" | "right";
export type ToolId = "movement" | "jump" | "hookshot" | "pivot" | "dash" | "brake";
export type RolledToolId = Exclude<ToolId, "movement">;
export type ToolTargetMode = "direction" | "tile" | "instant";
export type PlayerTurnFlag = "lucky_tile_claimed";
export type EventType =
  | "piece_moved"
  | "move_blocked"
  | "earth_wall_broken"
  | "turn_started"
  | "dice_rolled"
  | "tool_used"
  | "turn_ended"
  | "terrain_triggered"
  | "player_respawned";

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

export interface TurnToolSnapshot {
  instanceId: string;
  toolId: ToolId;
  charges: number;
  movePoints: number | null;
  range: number | null;
}

export interface ToolCondition {
  kind: "tool_present";
  toolId: ToolId;
}

export interface ToolDefinition {
  id: ToolId;
  label: string;
  description: string;
  disabledHint: string | null;
  targetMode: ToolTargetMode;
  conditions: ToolCondition[];
  chargesPerRoll: number;
  color: string;
}

export interface GameSnapshot {
  boardWidth: number;
  boardHeight: number;
  tiles: TileDefinition[];
  players: PlayerSnapshot[];
  turnInfo: TurnInfoSnapshot;
  eventLog: EventLogEntry[];
}

export interface UseToolCommandPayload {
  toolInstanceId: string;
  direction?: Direction;
  targetPosition?: GridPosition;
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
  occupiedPositions: GridPosition[];
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

export type ActionResolution =
  | {
      kind: "blocked";
      reason: string;
      path: GridPosition[];
      actor: ResolvedActorState;
      tools: TurnToolSnapshot[];
      affectedPlayers: AffectedPlayerMove[];
      tileMutations: TileMutation[];
      triggeredTerrainEffects: TriggeredTerrainEffect[];
      nextToolDieSeed: number;
    }
  | {
      kind: "applied";
      summary: string;
      path: GridPosition[];
      actor: ResolvedActorState;
      tools: TurnToolSnapshot[];
      affectedPlayers: AffectedPlayerMove[];
      tileMutations: TileMutation[];
      triggeredTerrainEffects: TriggeredTerrainEffect[];
      nextToolDieSeed: number;
    };
