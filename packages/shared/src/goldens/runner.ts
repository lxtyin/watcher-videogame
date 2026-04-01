import { createGameSimulation } from "../simulation";
import type {
  GameSnapshot,
  GridPosition,
  SummonSnapshot,
  TurnInfoSnapshot,
  TurnToolSnapshot
} from "../types";
import { findToolInstance } from "../tools";
import { serializeGoldenBoardLayout } from "./layout";
import type {
  GoldenCaseDefinition,
  GoldenCasePlayback,
  GoldenCasePlaybackStep,
  GoldenCasePlayerSummary,
  GoldenCaseResult,
  GoldenCaseStateSummary,
  GoldenCaseStep,
  GoldenCaseStepResult,
  GoldenExpectedPlayerState,
  GoldenExpectedSummonState,
  GoldenToolSelectorDefinition
} from "./types";

function clonePosition(position: GridPosition): GridPosition {
  return {
    x: position.x,
    y: position.y
  };
}

function cloneTurnInfo(turnInfo: TurnInfoSnapshot): TurnInfoSnapshot {
  return {
    currentPlayerId: turnInfo.currentPlayerId,
    phase: turnInfo.phase,
    turnNumber: turnInfo.turnNumber,
    moveRoll: turnInfo.moveRoll,
    lastRolledToolId: turnInfo.lastRolledToolId,
    toolDieSeed: turnInfo.toolDieSeed
  };
}

function resolveToolSelector(
  toolSelector: GoldenToolSelectorDefinition | TurnToolSnapshot["toolId"]
): GoldenToolSelectorDefinition {
  return typeof toolSelector === "string" ? { toolId: toolSelector } : toolSelector;
}

function findToolBySelector(
  tools: TurnToolSnapshot[],
  toolSelector: GoldenToolSelectorDefinition | TurnToolSnapshot["toolId"]
): TurnToolSnapshot | undefined {
  const normalizedSelector = resolveToolSelector(toolSelector);

  if (normalizedSelector.instanceId) {
    return findToolInstance(tools, normalizedSelector.instanceId);
  }

  const candidates = tools.filter((tool) => {
    if (normalizedSelector.toolId && tool.toolId !== normalizedSelector.toolId) {
      return false;
    }

    if (normalizedSelector.source && tool.source !== normalizedSelector.source) {
      return false;
    }

    return true;
  });

  return candidates[normalizedSelector.nth ?? 0];
}

function buildBlockedOutcome(message: string) {
  return {
    message,
    reason: message,
    status: "blocked" as const
  };
}

// Golden steps stay data-friendly, then resolve into the simulator's high-level commands.
function executeGoldenStep(
  snapshot: GameSnapshot,
  simulation: ReturnType<typeof createGameSimulation>,
  step: GoldenCaseStep
): {
  outcome: { message: string; reason?: string; status: "blocked" | "ok" };
  snapshot: GameSnapshot;
} {
  switch (step.kind) {
    case "rollDice":
      return simulation.dispatch({
        kind: "rollDice",
        actorId: step.actorId
      });
    case "endTurn":
      return simulation.dispatch({
        kind: "endTurn",
        actorId: step.actorId
      });
    case "setCharacter":
      return simulation.dispatch({
        kind: "setCharacter",
        actorId: step.actorId,
        payload: {
          characterId: step.characterId
        }
      });
    case "grantDebugTool":
      return simulation.dispatch({
        kind: "grantDebugTool",
        actorId: step.actorId,
        payload: {
          toolId: step.toolId
        }
      });
    case "useTool": {
      const actor = snapshot.players.find((player) => player.id === step.actorId);

      if (!actor) {
        return {
          outcome: buildBlockedOutcome(`Player ${step.actorId} cannot act right now.`),
          snapshot
        };
      }

      const activeTool = findToolBySelector(actor.tools, step.tool);

      if (!activeTool) {
        return {
          outcome: buildBlockedOutcome(`${actor.name} does not have the selected tool.`),
          snapshot
        };
      }

      return simulation.dispatch({
        kind: "useTool",
        actorId: step.actorId,
        payload: {
          toolInstanceId: activeTool.instanceId,
          ...(step.direction ? { direction: step.direction } : {}),
          ...(step.targetPosition ? { targetPosition: clonePosition(step.targetPosition) } : {})
        }
      });
    }
  }
}

function handleStepExpectation(
  step: GoldenCaseStep,
  outcome: { message: string; reason?: string; status: "blocked" | "ok" }
): GoldenCaseStepResult {
  const blockedReason = step.expect?.blockedReasonIncludes;

  if (!blockedReason) {
    return {
      label: step.label ?? `${step.kind}:${step.actorId}`,
      message: outcome.message,
      passed: outcome.status === "ok",
      status: outcome.status
    };
  }

  return {
    label: step.label ?? `${step.kind}:${step.actorId}`,
    message: outcome.message,
    passed:
      outcome.status === "blocked" &&
      Boolean(outcome.reason?.includes(blockedReason)),
    status: outcome.status
  };
}

function summarizePlayers(
  players: GameSnapshot["players"]
): Record<string, GoldenCasePlayerSummary> {
  return Object.fromEntries(
    players.map((player) => [
      player.id,
      {
        characterId: player.characterId,
        color: player.color,
        position: clonePosition(player.position),
        spawnPosition: clonePosition(player.spawnPosition),
        toolCount: player.tools.length,
        toolIds: player.tools.map((tool) => tool.toolId),
        turnFlags: [...player.turnFlags]
      }
    ])
  );
}

function buildCaseStateSummary(
  caseDefinition: GoldenCaseDefinition,
  snapshot: GameSnapshot
): GoldenCaseStateSummary {
  return {
    boardLayout: serializeGoldenBoardLayout(
      {
        width: snapshot.boardWidth,
        height: snapshot.boardHeight,
        tiles: snapshot.tiles.map((tile) => ({
          ...tile,
          direction: tile.direction
        }))
      },
      caseDefinition.scene.symbols
    ),
    eventTypes: snapshot.eventLog.map((entry) => entry.type),
    latestPresentation: {
      toolId: snapshot.latestPresentation?.toolId ?? null,
      sequence: snapshot.latestPresentation?.sequence ?? null,
      eventKinds: snapshot.latestPresentation?.events.map((event) => event.kind) ?? []
    },
    players: summarizePlayers(snapshot.players),
    summons: snapshot.summons.map((summon) => ({
      ...summon,
      position: clonePosition(summon.position)
    })),
    turnInfo: cloneTurnInfo(snapshot.turnInfo)
  };
}

function positionsEqual(left: GridPosition, right: GridPosition): boolean {
  return left.x === right.x && left.y === right.y;
}

function compareExpectedPlayerState(
  playerId: string,
  expected: GoldenExpectedPlayerState,
  actual: GoldenCasePlayerSummary | undefined,
  mismatches: string[]
): void {
  if (!actual) {
    mismatches.push(`Expected player "${playerId}" to exist.`);
    return;
  }

  if (expected.characterId && actual.characterId !== expected.characterId) {
    mismatches.push(
      `Player "${playerId}" character mismatch: expected ${expected.characterId}, got ${actual.characterId}.`
    );
  }

  if (expected.position && !positionsEqual(expected.position, actual.position)) {
    mismatches.push(
      `Player "${playerId}" position mismatch: expected (${expected.position.x}, ${expected.position.y}), got (${actual.position.x}, ${actual.position.y}).`
    );
  }

  if (
    expected.spawnPosition &&
    !positionsEqual(expected.spawnPosition, actual.spawnPosition)
  ) {
    mismatches.push(
      `Player "${playerId}" spawn mismatch: expected (${expected.spawnPosition.x}, ${expected.spawnPosition.y}), got (${actual.spawnPosition.x}, ${actual.spawnPosition.y}).`
    );
  }

  if (expected.toolCount !== undefined && actual.toolCount !== expected.toolCount) {
    mismatches.push(
      `Player "${playerId}" tool count mismatch: expected ${expected.toolCount}, got ${actual.toolCount}.`
    );
  }

  if (
    expected.toolIds &&
    JSON.stringify(expected.toolIds) !== JSON.stringify(actual.toolIds)
  ) {
    mismatches.push(
      `Player "${playerId}" tool ids mismatch: expected [${expected.toolIds.join(", ")}], got [${actual.toolIds.join(", ")}].`
    );
  }

  if (
    expected.turnFlags &&
    JSON.stringify(expected.turnFlags) !== JSON.stringify(actual.turnFlags)
  ) {
    mismatches.push(
      `Player "${playerId}" turn flags mismatch: expected [${expected.turnFlags.join(", ")}], got [${actual.turnFlags.join(", ")}].`
    );
  }
}

function matchesExpectedSummon(
  actual: SummonSnapshot,
  expected: GoldenExpectedSummonState
): boolean {
  if (actual.summonId !== expected.summonId) {
    return false;
  }

  if (expected.ownerId && actual.ownerId !== expected.ownerId) {
    return false;
  }

  if (expected.instanceId && actual.instanceId !== expected.instanceId) {
    return false;
  }

  return positionsEqual(actual.position, expected.position);
}

function compareCaseExpectation(
  caseDefinition: GoldenCaseDefinition,
  actual: GoldenCaseStateSummary,
  stepResults: GoldenCaseStepResult[]
): string[] {
  const mismatches = stepResults
    .filter((stepResult) => !stepResult.passed)
    .map((stepResult) => `Step "${stepResult.label}" failed: ${stepResult.message}`);
  const expectation = caseDefinition.expect;

  if (
    expectation.boardLayout &&
    JSON.stringify(expectation.boardLayout) !== JSON.stringify(actual.boardLayout)
  ) {
    mismatches.push("Board layout mismatch.");
  }

  if (expectation.players) {
    for (const [playerId, expectedPlayer] of Object.entries(expectation.players)) {
      compareExpectedPlayerState(playerId, expectedPlayer, actual.players[playerId], mismatches);
    }
  }

  if (
    expectation.summonCount !== undefined &&
    actual.summons.length !== expectation.summonCount
  ) {
    mismatches.push(
      `Summon count mismatch: expected ${expectation.summonCount}, got ${actual.summons.length}.`
    );
  }

  if (expectation.summons) {
    const missingExpectedSummons = expectation.summons.filter(
      (expectedSummon) =>
        !actual.summons.some((actualSummon) =>
          matchesExpectedSummon(actualSummon, expectedSummon)
        )
    );

    if (missingExpectedSummons.length) {
      mismatches.push(
        `Missing expected summons: ${missingExpectedSummons
          .map(
            (summon) =>
              `${summon.summonId}@(${summon.position.x}, ${summon.position.y})`
          )
          .join(", ")}.`
      );
    }
  }

  if (expectation.turnInfo) {
    for (const [key, value] of Object.entries(expectation.turnInfo)) {
      if (
        JSON.stringify(actual.turnInfo[key as keyof TurnInfoSnapshot]) !==
        JSON.stringify(value)
      ) {
        mismatches.push(
          `Turn info mismatch for "${key}": expected ${JSON.stringify(value)}, got ${JSON.stringify(actual.turnInfo[key as keyof TurnInfoSnapshot])}.`
        );
      }
    }
  }

  if (
    expectation.eventTypes &&
    JSON.stringify(expectation.eventTypes) !== JSON.stringify(actual.eventTypes)
  ) {
    mismatches.push(
      `Event types mismatch: expected [${expectation.eventTypes.join(", ")}], got [${actual.eventTypes.join(", ")}].`
    );
  }

  if (expectation.latestPresentation) {
    if (
      expectation.latestPresentation.toolId !== undefined &&
      actual.latestPresentation.toolId !== expectation.latestPresentation.toolId
    ) {
      mismatches.push(
        `Latest presentation tool mismatch: expected ${String(expectation.latestPresentation.toolId)}, got ${String(actual.latestPresentation.toolId)}.`
      );
    }

    if (
      expectation.latestPresentation.eventKinds &&
      JSON.stringify(expectation.latestPresentation.eventKinds) !==
        JSON.stringify(actual.latestPresentation.eventKinds)
    ) {
      mismatches.push(
        `Latest presentation event kinds mismatch: expected [${expectation.latestPresentation.eventKinds.join(", ")}], got [${actual.latestPresentation.eventKinds.join(", ")}].`
      );
    }
  }

  return mismatches;
}

// Playback keeps the full snapshot timeline so the web runner can animate the same golden cases.
export function buildGoldenCasePlayback(caseDefinition: GoldenCaseDefinition): GoldenCasePlayback {
  const simulation = createGameSimulation(caseDefinition.scene);
  const initialSnapshot = simulation.getSnapshot();
  let currentSnapshot = initialSnapshot;
  const playbackSteps: GoldenCasePlaybackStep[] = [];

  for (const step of caseDefinition.steps) {
    const execution = executeGoldenStep(currentSnapshot, simulation, step);
    const stepResult = handleStepExpectation(step, execution.outcome);

    playbackSteps.push({
      label: stepResult.label,
      outcome: execution.outcome,
      snapshot: execution.snapshot,
      step,
      stepResult
    });

    currentSnapshot = execution.snapshot;
  }

  const actual = buildCaseStateSummary(caseDefinition, currentSnapshot);
  const stepResults = playbackSteps.map((step) => step.stepResult);
  const mismatches = compareCaseExpectation(caseDefinition, actual, stepResults);
  const result: GoldenCaseResult = {
    caseId: caseDefinition.id,
    title: caseDefinition.title,
    ...(caseDefinition.description ? { description: caseDefinition.description } : {}),
    actual,
    snapshot: currentSnapshot,
    stepResults,
    mismatches,
    passed: mismatches.length === 0
  };

  return {
    initialSnapshot,
    result,
    steps: playbackSteps
  };
}

export function runGoldenCase(caseDefinition: GoldenCaseDefinition): GoldenCaseResult {
  return buildGoldenCasePlayback(caseDefinition).result;
}

export function runGoldenCases(
  caseDefinitions: readonly GoldenCaseDefinition[]
): GoldenCaseResult[] {
  return caseDefinitions.map((caseDefinition) => runGoldenCase(caseDefinition));
}
