import type { LayoutSymbolDefinition } from "../content/boards/defaultBoard";
import type {
  CharacterId,
  GameMapId,
  GameMode,
  GameSnapshot,
  GrantDebugToolPayload,
  GridPosition,
  PlayerTagMap,
  PlayerTurnFlag,
  SetCharacterCommandPayload,
  SummonId,
  ToolId,
  ToolSource,
  TurnInfoSnapshot,
  TurnToolSnapshot,
  UseToolCommandPayload
} from "../types";

export interface SimulationToolLoadoutDefinition {
  charges?: number;
  instanceId?: string;
  params?: TurnToolSnapshot["params"];
  source?: ToolSource;
  toolId: ToolId;
}

export interface SimulationPlayerDefinition {
  boardVisible?: boolean;
  characterId?: CharacterId;
  color?: string;
  finishRank?: number | null;
  finishedTurnNumber?: number | null;
  id: string;
  name?: string;
  petId?: string;
  position: GridPosition;
  spawnPosition?: GridPosition;
  tags?: PlayerTagMap;
  tools?: SimulationToolLoadoutDefinition[];
  turnFlags?: PlayerTurnFlag[];
}

export interface SimulationSummonDefinition {
  instanceId?: string;
  ownerId: string;
  position: GridPosition;
  summonId: SummonId;
}

export interface SimulationSeedState {
  moveDieSeed: number;
  nextPresentationSequence: number;
  nextToolInstanceSerial: number;
  toolDieSeed: number;
}

export interface SimulationSceneDefinition {
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

export interface GamePendingAdvance {
  kind: "race_finish";
  nextPlayerId: string | null;
  shouldAdvanceTurnNumber: boolean;
}

export interface GameRuntimeState extends SimulationSeedState {
  eventSerial: number;
  pendingAdvance: GamePendingAdvance | null;
}

export interface GameOrchestrationState {
  runtime: GameRuntimeState;
  snapshot: GameSnapshot;
}

export interface SimulationRollDiceCommand {
  actorId: string;
  kind: "rollDice";
}

export interface SimulationUseToolCommand {
  actorId: string;
  kind: "useTool";
  payload: UseToolCommandPayload;
}

export interface SimulationEndTurnCommand {
  actorId: string;
  kind: "endTurn";
}

export interface SimulationSetCharacterCommand {
  actorId: string;
  kind: "setCharacter";
  payload: SetCharacterCommandPayload;
}

export interface SimulationGrantDebugToolCommand {
  actorId: string;
  kind: "grantDebugTool";
  payload: GrantDebugToolPayload;
}

export type SimulationCommand =
  | SimulationRollDiceCommand
  | SimulationUseToolCommand
  | SimulationEndTurnCommand
  | SimulationSetCharacterCommand
  | SimulationGrantDebugToolCommand;

export interface SimulationCommandOutcome {
  message: string;
  reason?: string;
  status: "blocked" | "ok";
}

export interface SimulationDispatchResult {
  outcome: SimulationCommandOutcome;
  snapshot: GameSnapshot;
}

export interface GameSimulation {
  advanceTurn: () => SimulationDispatchResult;
  dispatch: (command: SimulationCommand) => SimulationDispatchResult;
  getSnapshot: () => GameSnapshot;
  getRuntimeState: () => GameRuntimeState;
  hasPendingAdvance: () => boolean;
}
