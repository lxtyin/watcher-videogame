import type { LayoutSymbolDefinition } from "../content/defaultBoard";
import type {
  ActionPresentationEvent,
  CharacterId,
  Direction,
  EventType,
  GameSnapshot,
  GridPosition,
  PlayerTurnFlag,
  SummonId,
  SummonSnapshot,
  TileType,
  ToolId,
  ToolSource,
  TurnInfoSnapshot,
  TurnToolSnapshot
} from "../types";

export interface GoldenToolLoadoutDefinition {
  charges?: number;
  instanceId?: string;
  params?: TurnToolSnapshot["params"];
  source?: ToolSource;
  toolId: ToolId;
}

export interface GoldenPlayerDefinition {
  characterId?: CharacterId;
  color?: string;
  id: string;
  name?: string;
  position: GridPosition;
  spawnPosition?: GridPosition;
  tools?: GoldenToolLoadoutDefinition[];
  turnFlags?: PlayerTurnFlag[];
}

export interface GoldenSummonDefinition {
  instanceId?: string;
  ownerId: string;
  position: GridPosition;
  summonId: SummonId;
}

export interface GoldenSeedState {
  moveDieSeed: number;
  nextPresentationSequence: number;
  nextToolInstanceSerial: number;
  toolDieSeed: number;
}

export interface GoldenSceneDefinition {
  layout: readonly string[];
  players: GoldenPlayerDefinition[];
  seeds?: Partial<GoldenSeedState>;
  summons?: GoldenSummonDefinition[];
  symbols?: Partial<Record<string, LayoutSymbolDefinition>>;
  turn?: Partial<TurnInfoSnapshot>;
}

export interface GoldenToolSelectorDefinition {
  instanceId?: string;
  nth?: number;
  source?: ToolSource;
  toolId?: ToolId;
}

export interface GoldenStepExpectation {
  blockedReasonIncludes?: string;
}

interface GoldenCaseStepBase {
  actorId: string;
  expect?: GoldenStepExpectation;
  label?: string;
}

export interface GoldenRollDiceStep extends GoldenCaseStepBase {
  kind: "rollDice";
}

export interface GoldenUseToolStep extends GoldenCaseStepBase {
  direction?: Direction;
  kind: "useTool";
  targetPosition?: GridPosition;
  tool: GoldenToolSelectorDefinition | ToolId;
}

export interface GoldenEndTurnStep extends GoldenCaseStepBase {
  kind: "endTurn";
}

export interface GoldenSetCharacterStep extends GoldenCaseStepBase {
  characterId: CharacterId;
  kind: "setCharacter";
}

export interface GoldenGrantDebugToolStep extends GoldenCaseStepBase {
  kind: "grantDebugTool";
  toolId: ToolId;
}

export type GoldenCaseStep =
  | GoldenRollDiceStep
  | GoldenUseToolStep
  | GoldenEndTurnStep
  | GoldenSetCharacterStep
  | GoldenGrantDebugToolStep;

export interface GoldenExpectedPlayerState {
  characterId?: CharacterId;
  position?: GridPosition;
  spawnPosition?: GridPosition;
  toolCount?: number;
  toolIds?: ToolId[];
  turnFlags?: PlayerTurnFlag[];
}

export interface GoldenExpectedSummonState {
  instanceId?: string;
  ownerId?: string;
  position: GridPosition;
  summonId: SummonId;
}

export interface GoldenPresentationExpectation {
  eventKinds?: ActionPresentationEvent["kind"][];
  toolId?: ToolId | null;
}

export interface GoldenCaseExpectation {
  boardLayout?: readonly string[];
  eventTypes?: EventType[];
  latestPresentation?: GoldenPresentationExpectation;
  players?: Record<string, GoldenExpectedPlayerState>;
  summons?: GoldenExpectedSummonState[];
  summonCount?: number;
  turnInfo?: Partial<TurnInfoSnapshot>;
}

export interface GoldenCaseDefinition {
  description?: string;
  expect: GoldenCaseExpectation;
  id: string;
  scene: GoldenSceneDefinition;
  steps: GoldenCaseStep[];
  title: string;
}

export interface GoldenCasePlayerSummary {
  characterId: CharacterId;
  color: string;
  position: GridPosition;
  spawnPosition: GridPosition;
  toolCount: number;
  toolIds: ToolId[];
  turnFlags: PlayerTurnFlag[];
}

export interface GoldenCasePresentationSummary {
  eventKinds: ActionPresentationEvent["kind"][];
  sequence: number | null;
  toolId: ToolId | null;
}

export interface GoldenCaseStateSummary {
  boardLayout: string[];
  eventTypes: EventType[];
  latestPresentation: GoldenCasePresentationSummary;
  players: Record<string, GoldenCasePlayerSummary>;
  summons: SummonSnapshot[];
  turnInfo: TurnInfoSnapshot;
}

export interface GoldenCaseStepResult {
  label: string;
  message: string;
  passed: boolean;
  status: "blocked" | "ok";
}

export interface GoldenCaseResult {
  actual: GoldenCaseStateSummary;
  caseId: string;
  description?: string;
  mismatches: string[];
  passed: boolean;
  snapshot: GameSnapshot;
  stepResults: GoldenCaseStepResult[];
  title: string;
}

export function defineGoldenCase(caseDefinition: GoldenCaseDefinition): GoldenCaseDefinition {
  return caseDefinition;
}
