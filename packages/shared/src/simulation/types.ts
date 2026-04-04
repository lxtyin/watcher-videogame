import type { LayoutSymbolDefinition } from "../content/boards/defaultBoard";
import type {
  CharacterStateMap,
  CharacterId,
  GameMapId,
  GameMode,
  GameSnapshot,
  GrantDebugToolPayload,
  GridPosition,
  PlayerTurnFlag,
  SetCharacterCommandPayload,
  SummonId,
  ToolId,
  ToolSource,
  TurnInfoSnapshot,
  TurnToolSnapshot,
  UseTurnStartActionCommandPayload,
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

export interface SimulationRollDiceCommand {
  actorId: string;
  kind: "rollDice";
}

export interface SimulationUseTurnStartActionCommand {
  actorId: string;
  kind: "useTurnStartAction";
  payload: UseTurnStartActionCommandPayload;
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
  | SimulationUseTurnStartActionCommand
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
  dispatch: (command: SimulationCommand) => SimulationDispatchResult;
  getSnapshot: () => GameSnapshot;
}
