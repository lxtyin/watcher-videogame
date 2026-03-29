export type TileType = "floor" | "wall" | "earthWall";
export type TurnPhase = "roll" | "action";
export type Direction = "up" | "down" | "left" | "right";
export type ToolId = "jump" | "hookshot" | "pivot" | "dash";
export type ToolTargetMode = "direction" | "instant";
export type EventType =
  | "piece_moved"
  | "move_blocked"
  | "earth_wall_broken"
  | "turn_started"
  | "dice_rolled"
  | "tool_used"
  | "turn_ended";

export interface GridPosition {
  x: number;
  y: number;
}

export interface TileDefinition extends GridPosition {
  key: string;
  type: TileType;
  durability: number;
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
  remainingMovePoints: number;
  movementActionsRemaining: number;
  availableTools: ToolChargeSnapshot[];
}

export interface TurnInfoSnapshot {
  currentPlayerId: string;
  phase: TurnPhase;
  remainingMovePoints: number;
  movementActionsRemaining: number;
  turnNumber: number;
  moveRoll: number;
  lastRolledToolId: ToolId | null;
}

export interface EventLogEntry {
  id: string;
  type: EventType;
  message: string;
  createdAt: number;
}

export interface ToolChargeSnapshot {
  id: ToolId;
  charges: number;
}

export interface ToolDefinition {
  id: ToolId;
  label: string;
  description: string;
  targetMode: ToolTargetMode;
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

export interface MoveCommandPayload {
  direction: Direction;
}

export interface UseToolCommandPayload {
  toolId: ToolId;
  direction?: Direction;
}

export interface MovementActor {
  id: string;
  position: GridPosition;
  remainingMovePoints: number;
  movementActionsRemaining: number;
}

export interface MovementContext {
  board: BoardDefinition;
  actor: MovementActor;
  direction: Direction;
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
      remainingMovePoints: number;
      destroyedTileKey?: string;
    };

export interface BoardPlayerState {
  id: string;
  position: GridPosition;
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
}

export interface DirectionalActionContext {
  board: BoardDefinition;
  actor: MovementActor;
  direction: Direction;
  players: BoardPlayerState[];
}

export interface ToolActionContext extends DirectionalActionContext {
  toolId: ToolId;
}

export interface ResolvedActorState {
  position: GridPosition;
  remainingMovePoints: number;
  movementActionsRemaining: number;
}

export type ActionResolution =
  | {
      kind: "blocked";
      reason: string;
      path: GridPosition[];
      actor: ResolvedActorState;
      affectedPlayers: AffectedPlayerMove[];
      tileMutations: TileMutation[];
      consumedMovePoints: number;
    }
  | {
      kind: "applied";
      summary: string;
      path: GridPosition[];
      actor: ResolvedActorState;
      affectedPlayers: AffectedPlayerMove[];
      tileMutations: TileMutation[];
      consumedMovePoints: number;
    };
