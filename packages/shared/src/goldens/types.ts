import type { LayoutSymbolDefinition } from "../content/boards/defaultBoard";
import type {
  ActionPresentationEvent,
  CharacterId,
  Direction,
  EventType,
  GameMode,
  GameSnapshot,
  GridPosition,
  PlayerTagMap,
  PlayerTurnFlag,
  SummonId,
  SummonSnapshot,
  TileType,
  ToolId,
  ToolSource,
  TurnInfoSnapshot,
  TurnToolSnapshot
} from "../types";
import type {
  SimulationCommandOutcome,
  SimulationSceneDefinition,
  SimulationToolLoadoutDefinition
} from "../simulation";

export interface GoldenToolLoadoutDefinition extends SimulationToolLoadoutDefinition {}

export interface GoldenPlayerDefinition {
  characterId?: CharacterId;
  color?: string;
  id: string;
  name?: string;
  position: GridPosition;
  spawnPosition?: GridPosition;
  tags?: PlayerTagMap;
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

export interface GoldenSceneDefinition extends SimulationSceneDefinition {}

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
  choiceId?: string;
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
  finishRank?: number | null;
  finishedTurnNumber?: number | null;
  position?: GridPosition;
  spawnPosition?: GridPosition;
  tags?: PlayerTagMap;
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
  finishRank: number | null;
  finishedTurnNumber: number | null;
  position: GridPosition;
  spawnPosition: GridPosition;
  tags: PlayerTagMap;
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

export interface GoldenCaseStepResult {
  label: string;
  message: string;
  passed: boolean;
  status: "blocked" | "ok";
}

export interface GoldenCasePlaybackStep {
  label: string;
  outcome: SimulationCommandOutcome;
  snapshot: GameSnapshot;
  step: GoldenCaseStep;
  stepResult: GoldenCaseStepResult;
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

export interface GoldenCasePlayback {
  initialSnapshot: GameSnapshot;
  result: GoldenCaseResult;
  steps: GoldenCasePlaybackStep[];
}

export function defineGoldenCase(caseDefinition: GoldenCaseDefinition): GoldenCaseDefinition {
  return caseDefinition;
}
