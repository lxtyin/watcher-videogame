import { PLAYER_COLORS } from "../constants";
import { applyCharacterToolTransforms, getCharacterDefinition } from "../characters";
import { rollMovementDie, rollToolDie } from "../dice";
import { resolveToolAction } from "../actions";
import {
  createDebugToolInstance,
  createMovementToolInstance,
  createRolledToolInstance,
  createToolInstance,
  findToolInstance,
  getToolDefinition
} from "../tools";
import type {
  ActionPresentation,
  BoardDefinition,
  BoardPlayerState,
  BoardSummonState,
  EventLogEntry,
  EventType,
  GameSnapshot,
  GridPosition,
  PlayerSnapshot,
  PlayerTurnFlag,
  SummonMutation,
  SummonSnapshot,
  TileMutation,
  TriggeredSummonEffect,
  TriggeredTerrainEffect,
  TurnInfoSnapshot,
  TurnToolSnapshot,
  UseToolCommandPayload
} from "../types";
import type {
  GoldenCaseDefinition,
  GoldenCasePlayerSummary,
  GoldenCaseResult,
  GoldenCaseStateSummary,
  GoldenCaseStep,
  GoldenCaseStepResult,
  GoldenExpectedPlayerState,
  GoldenExpectedSummonState,
  GoldenGrantDebugToolStep,
  GoldenRollDiceStep,
  GoldenSetCharacterStep,
  GoldenToolLoadoutDefinition,
  GoldenToolSelectorDefinition,
  GoldenUseToolStep
} from "./types";
import {
  createBoardDefinitionFromGoldenLayout,
  serializeGoldenBoardLayout
} from "./layout";

interface GoldenMutableState {
  caseDefinition: GoldenCaseDefinition;
  eventSerial: number;
  moveDieSeed: number;
  nextPresentationSequence: number;
  nextToolInstanceSerial: number;
  playerOrder: string[];
  snapshot: GameSnapshot;
  toolDieSeed: number;
}

interface GoldenCommandOutcome {
  message: string;
  reason?: string;
  status: "blocked" | "ok";
}

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

function buildBoardDefinition(snapshot: GameSnapshot): BoardDefinition {
  return {
    width: snapshot.boardWidth,
    height: snapshot.boardHeight,
    tiles: snapshot.tiles.map((tile) => ({
      ...tile,
      direction: tile.direction
    }))
  };
}

function buildBoardPlayers(snapshot: GameSnapshot): BoardPlayerState[] {
  return snapshot.players.map((player) => ({
    id: player.id,
    characterId: player.characterId,
    position: clonePosition(player.position),
    spawnPosition: clonePosition(player.spawnPosition),
    turnFlags: [...player.turnFlags]
  }));
}

function buildBoardSummons(snapshot: GameSnapshot): BoardSummonState[] {
  return snapshot.summons.map((summon) => ({
    instanceId: summon.instanceId,
    ownerId: summon.ownerId,
    position: clonePosition(summon.position),
    summonId: summon.summonId
  }));
}

function findPlayer(snapshot: GameSnapshot, playerId: string): PlayerSnapshot | undefined {
  return snapshot.players.find((player) => player.id === playerId);
}

function normalizePlayerTools(
  player: PlayerSnapshot,
  tools: TurnToolSnapshot[]
): TurnToolSnapshot[] {
  return applyCharacterToolTransforms(player.characterId, tools);
}

function clearPlayerTurnResources(player: PlayerSnapshot): void {
  player.tools = [];
  player.turnFlags = [];
}

function applyPlayerTurnFlags(player: PlayerSnapshot, turnFlags: PlayerTurnFlag[]): void {
  player.turnFlags = [...turnFlags];
}

function applyToolInventory(player: PlayerSnapshot, tools: TurnToolSnapshot[]): void {
  player.tools = normalizePlayerTools(player, tools);
}

function applyTileMutations(snapshot: GameSnapshot, tileMutations: TileMutation[]): void {
  const tilesByKey = new Map(snapshot.tiles.map((tile) => [tile.key, tile] as const));

  for (const mutation of tileMutations) {
    const tile = tilesByKey.get(mutation.key);

    if (!tile) {
      continue;
    }

    tile.type = mutation.nextType;
    tile.durability = mutation.nextDurability;
    tile.direction = null;
  }
}

function applySummonMutations(snapshot: GameSnapshot, summonMutations: SummonMutation[]): void {
  const summonsById = new Map(
    snapshot.summons.map((summon) => [summon.instanceId, summon] as const)
  );

  for (const mutation of summonMutations) {
    if (mutation.kind === "remove") {
      summonsById.delete(mutation.instanceId);
      continue;
    }

    summonsById.set(mutation.instanceId, {
      instanceId: mutation.instanceId,
      summonId: mutation.summonId,
      ownerId: mutation.ownerId,
      position: clonePosition(mutation.position)
    });
  }

  snapshot.summons = Array.from(summonsById.values());
}

function applyAffectedPlayerMoves(
  snapshot: GameSnapshot,
  affectedPlayers: Array<{
    playerId: string;
    target: GridPosition;
    turnFlags?: PlayerTurnFlag[];
  }>
): void {
  for (const affectedPlayer of affectedPlayers) {
    const player = findPlayer(snapshot, affectedPlayer.playerId);

    if (!player) {
      continue;
    }

    player.position = clonePosition(affectedPlayer.target);

    if (affectedPlayer.turnFlags) {
      applyPlayerTurnFlags(player, affectedPlayer.turnFlags);
    }
  }
}

function pushEvent(state: GoldenMutableState, type: EventType, message: string): void {
  const entry: EventLogEntry = {
    id: `golden-event-${state.eventSerial}`,
    type,
    message,
    createdAt: state.eventSerial
  };

  state.eventSerial += 1;
  state.snapshot.eventLog = [...state.snapshot.eventLog, entry].slice(-10);
}

function pushTerrainEvents(
  state: GoldenMutableState,
  actorId: string,
  triggeredTerrainEffects: TriggeredTerrainEffect[]
): void {
  const actor = findPlayer(state.snapshot, actorId);

  for (const terrainEffect of triggeredTerrainEffects) {
    const affectedPlayer = findPlayer(state.snapshot, terrainEffect.playerId);

    if (!affectedPlayer) {
      continue;
    }

    if (terrainEffect.kind === "pit") {
      pushEvent(
        state,
        "player_respawned",
        `${affectedPlayer.name} fell into a pit and respawned at (${terrainEffect.respawnPosition.x}, ${terrainEffect.respawnPosition.y}).`
      );
      continue;
    }

    if (terrainEffect.kind === "lucky") {
      pushEvent(
        state,
        "terrain_triggered",
        `${affectedPlayer.name} landed on a lucky block and gained ${getToolDefinition(terrainEffect.grantedTool.toolId).label}.`
      );
      continue;
    }

    if (terrainEffect.kind === "conveyor_boost" && actor) {
      pushEvent(
        state,
        "terrain_triggered",
        `${actor.name} rode a conveyor for +${terrainEffect.bonusMovePoints} move points.`
      );
      continue;
    }

    if (terrainEffect.kind === "conveyor_turn" && actor) {
      pushEvent(
        state,
        "terrain_triggered",
        `${actor.name} was redirected from ${terrainEffect.fromDirection} to ${terrainEffect.toDirection}.`
      );
    }
  }
}

function pushSummonEvents(
  state: GoldenMutableState,
  triggeredSummonEffects: TriggeredSummonEffect[]
): void {
  for (const summonEffect of triggeredSummonEffects) {
    if (summonEffect.kind !== "wallet_pickup") {
      continue;
    }

    const player = findPlayer(state.snapshot, summonEffect.playerId);

    if (!player) {
      continue;
    }

    pushEvent(
      state,
      "summon_triggered",
      `${player.name} picked up a wallet and gained ${getToolDefinition(summonEffect.grantedTool.toolId).label}.`
    );
  }
}

function publishActionPresentation(
  state: GoldenMutableState,
  presentation: ActionPresentation | null
): void {
  if (!presentation) {
    return;
  }

  state.snapshot.latestPresentation = {
    ...presentation,
    sequence: state.nextPresentationSequence
  };
  state.nextPresentationSequence += 1;
}

function detectNextToolInstanceSerial(players: PlayerSnapshot[]): number {
  const serials = players.flatMap((player) =>
    player.tools.map((tool) => {
      const match = tool.instanceId.match(/-(\d+)$/);
      return match ? Number(match[1]) : 0;
    })
  );

  return Math.max(1, ...(serials.length ? serials.map((value) => value + 1) : [1]));
}

function createToolInstanceId(
  state: GoldenMutableState,
  toolId: TurnToolSnapshot["toolId"]
): string {
  const instanceId = `${toolId}-${state.nextToolInstanceSerial}`;
  state.nextToolInstanceSerial += 1;
  return instanceId;
}

function materializeSceneTool(
  state: GoldenMutableState,
  toolDefinition: GoldenToolLoadoutDefinition
): TurnToolSnapshot {
  return createToolInstance(
    toolDefinition.instanceId ?? createToolInstanceId(state, toolDefinition.toolId),
    toolDefinition.toolId,
    {
      ...(toolDefinition.charges !== undefined ? { charges: toolDefinition.charges } : {}),
      ...(toolDefinition.params ? { params: toolDefinition.params } : {}),
      ...(toolDefinition.source ? { source: toolDefinition.source } : {})
    }
  );
}

function buildTurnStartTools(
  state: GoldenMutableState,
  player: PlayerSnapshot,
  baseTools: TurnToolSnapshot[]
): TurnToolSnapshot[] {
  const characterDefinition = getCharacterDefinition(player.characterId);

  return normalizePlayerTools(player, [
    ...baseTools,
    ...characterDefinition.turnStartGrants.map((tool) => materializeSceneTool(state, tool)),
    ...characterDefinition.activeSkillLoadout.map((tool) => materializeSceneTool(state, tool))
  ]);
}

function beginTurnFor(
  state: GoldenMutableState,
  playerId: string,
  shouldAdvanceTurnNumber: boolean
): void {
  const player = findPlayer(state.snapshot, playerId);

  if (!player) {
    return;
  }

  clearPlayerTurnResources(player);
  state.snapshot.turnInfo.currentPlayerId = playerId;
  state.snapshot.turnInfo.phase = "roll";
  state.snapshot.turnInfo.moveRoll = 0;
  state.snapshot.turnInfo.lastRolledToolId = null;
  state.snapshot.turnInfo.toolDieSeed = state.toolDieSeed;

  if (shouldAdvanceTurnNumber) {
    state.snapshot.turnInfo.turnNumber += 1;
  }

  pushEvent(state, "turn_started", `${player.name}'s turn started. Roll the dice.`);
}

function getNextPlayerId(state: GoldenMutableState, currentPlayerId: string): string {
  const currentIndex = state.playerOrder.findIndex((playerId) => playerId === currentPlayerId);

  if (currentIndex < 0) {
    return state.playerOrder[0] ?? currentPlayerId;
  }

  return state.playerOrder[(currentIndex + 1) % state.playerOrder.length] ?? currentPlayerId;
}

function ensureActivePlayer(
  state: GoldenMutableState,
  actorId: string
): PlayerSnapshot | null {
  const player = findPlayer(state.snapshot, actorId);

  if (!player) {
    return null;
  }

  if (state.snapshot.turnInfo.currentPlayerId !== actorId) {
    return null;
  }

  return player;
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

function buildBlockedOutcome(reason: string): GoldenCommandOutcome {
  return {
    status: "blocked",
    reason,
    message: reason
  };
}

function handleStepExpectation(
  step: GoldenCaseStep,
  outcome: GoldenCommandOutcome
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

function runRollDiceStep(
  state: GoldenMutableState,
  step: GoldenRollDiceStep
): GoldenCommandOutcome {
  const player = ensureActivePlayer(state, step.actorId);

  if (!player) {
    return buildBlockedOutcome(`Player ${step.actorId} cannot roll right now.`);
  }

  if (state.snapshot.turnInfo.phase !== "roll") {
    return buildBlockedOutcome(`${player.name} cannot roll right now.`);
  }

  const movementRoll = rollMovementDie(state.moveDieSeed);
  state.moveDieSeed = movementRoll.nextSeed;

  const toolRoll = rollToolDie(state.toolDieSeed);
  state.toolDieSeed = toolRoll.nextSeed;

  clearPlayerTurnResources(player);
  applyToolInventory(
    player,
    buildTurnStartTools(state, player, [
      createMovementToolInstance(
        createToolInstanceId(state, "movement"),
        movementRoll.value
      ),
      createRolledToolInstance(
        createToolInstanceId(state, toolRoll.value.toolId),
        toolRoll.value
      )
    ])
  );

  state.snapshot.turnInfo.phase = "action";
  state.snapshot.turnInfo.moveRoll = movementRoll.value;
  state.snapshot.turnInfo.lastRolledToolId = toolRoll.value.toolId;
  state.snapshot.turnInfo.toolDieSeed = state.toolDieSeed;

  pushEvent(
    state,
    "dice_rolled",
    `${player.name} rolled Movement ${movementRoll.value} and ${getToolDefinition(toolRoll.value.toolId).label}.`
  );

  return {
    status: "ok",
    message: `${player.name} rolled successfully.`
  };
}

function runUseToolStep(
  state: GoldenMutableState,
  step: GoldenUseToolStep
): GoldenCommandOutcome {
  const player = ensureActivePlayer(state, step.actorId);

  if (!player) {
    return buildBlockedOutcome(`Player ${step.actorId} cannot act right now.`);
  }

  if (state.snapshot.turnInfo.phase !== "action") {
    return buildBlockedOutcome(`${player.name} must roll dice first.`);
  }

  const activeTool = findToolBySelector(player.tools, step.tool);

  if (!activeTool) {
    return buildBlockedOutcome(`${player.name} does not have the selected tool.`);
  }

  const payload: UseToolCommandPayload = {
    toolInstanceId: activeTool.instanceId,
    ...(step.direction ? { direction: step.direction } : {}),
    ...(step.targetPosition ? { targetPosition: clonePosition(step.targetPosition) } : {})
  };

  const resolution = resolveToolAction({
    board: buildBoardDefinition(state.snapshot),
    actor: {
      id: player.id,
      characterId: player.characterId,
      position: clonePosition(player.position),
      spawnPosition: clonePosition(player.spawnPosition),
      turnFlags: [...player.turnFlags]
    },
    activeTool,
    direction: payload.direction ?? "up",
    ...(payload.targetPosition ? { targetPosition: payload.targetPosition } : {}),
    players: buildBoardPlayers(state.snapshot),
    summons: buildBoardSummons(state.snapshot),
    toolDieSeed: state.toolDieSeed,
    tools: [...player.tools]
  });

  if (resolution.kind === "blocked") {
    pushEvent(
      state,
      "move_blocked",
      `${player.name} cannot use ${getToolDefinition(activeTool.toolId).label}: ${resolution.reason}.`
    );
    return buildBlockedOutcome(resolution.reason);
  }

  player.position = clonePosition(resolution.actor.position);
  applyPlayerTurnFlags(player, resolution.actor.turnFlags);
  applyToolInventory(player, resolution.tools);
  applyTileMutations(state.snapshot, resolution.tileMutations);
  applySummonMutations(state.snapshot, resolution.summonMutations);
  applyAffectedPlayerMoves(state.snapshot, resolution.affectedPlayers);

  state.toolDieSeed = resolution.nextToolDieSeed;
  state.snapshot.turnInfo.toolDieSeed = state.toolDieSeed;
  publishActionPresentation(state, resolution.presentation);

  if (resolution.tileMutations.some((mutation) => mutation.nextType === "floor")) {
    pushEvent(state, "earth_wall_broken", `${player.name} broke an earth wall while moving.`);
  }

  pushTerrainEvents(state, player.id, resolution.triggeredTerrainEffects);
  pushSummonEvents(state, resolution.triggeredSummonEffects);

  if (activeTool.toolId === "movement") {
    pushEvent(
      state,
      "piece_moved",
      `${player.name} used Movement ${payload.direction} to (${player.position.x}, ${player.position.y}).`
    );
  } else {
    pushEvent(state, "tool_used", `${player.name} used ${getToolDefinition(activeTool.toolId).label}.`);
  }

  if (!resolution.endsTurn) {
    return {
      status: "ok",
      message: resolution.summary
    };
  }

  pushEvent(state, "turn_ended", `${player.name} ended the turn.`);
  clearPlayerTurnResources(player);
  beginTurnFor(state, getNextPlayerId(state, player.id), true);

  return {
    status: "ok",
    message: resolution.summary
  };
}

function runEndTurnStep(
  state: GoldenMutableState,
  actorId: string
): GoldenCommandOutcome {
  const player = ensureActivePlayer(state, actorId);

  if (!player) {
    return buildBlockedOutcome(`Player ${actorId} cannot end the turn right now.`);
  }

  if (state.snapshot.turnInfo.phase !== "action") {
    return buildBlockedOutcome(`${player.name} must roll before ending the turn.`);
  }

  pushEvent(state, "turn_ended", `${player.name} ended the turn.`);
  clearPlayerTurnResources(player);
  beginTurnFor(state, getNextPlayerId(state, player.id), true);

  return {
    status: "ok",
    message: `${player.name} ended the turn.`
  };
}

function runSetCharacterStep(
  state: GoldenMutableState,
  step: GoldenSetCharacterStep
): GoldenCommandOutcome {
  const player = ensureActivePlayer(state, step.actorId);

  if (!player) {
    return buildBlockedOutcome(`Player ${step.actorId} cannot switch character right now.`);
  }

  if (state.snapshot.turnInfo.phase !== "roll") {
    return buildBlockedOutcome(`${player.name} can only switch character before rolling.`);
  }

  player.characterId = step.characterId;
  pushEvent(
    state,
    "character_switched",
    `${player.name} switched to ${getCharacterDefinition(step.characterId).label}.`
  );

  return {
    status: "ok",
    message: `${player.name} switched to ${step.characterId}.`
  };
}

function runGrantDebugToolStep(
  state: GoldenMutableState,
  step: GoldenGrantDebugToolStep
): GoldenCommandOutcome {
  const player = ensureActivePlayer(state, step.actorId);

  if (!player) {
    return buildBlockedOutcome(`Player ${step.actorId} cannot receive a debug tool right now.`);
  }

  if (state.snapshot.turnInfo.phase !== "action") {
    return buildBlockedOutcome(`${player.name} must roll before granting a debug tool.`);
  }

  const definition = getToolDefinition(step.toolId);

  if (!definition.debugGrantable) {
    return buildBlockedOutcome(`${definition.label} cannot be debug-granted right now.`);
  }

  const grantedTool =
    step.toolId === "movement"
      ? createMovementToolInstance(createToolInstanceId(state, "movement"), 4)
      : createDebugToolInstance(createToolInstanceId(state, step.toolId), step.toolId);

  applyToolInventory(player, [...player.tools, grantedTool]);
  pushEvent(state, "debug_granted", `${player.name} debug gained ${definition.label}.`);

  return {
    status: "ok",
    message: `${player.name} gained ${definition.label}.`
  };
}

function runStep(
  state: GoldenMutableState,
  step: GoldenCaseStep
): GoldenCommandOutcome {
  switch (step.kind) {
    case "rollDice":
      return runRollDiceStep(state, step);
    case "useTool":
      return runUseToolStep(state, step);
    case "endTurn":
      return runEndTurnStep(state, step.actorId);
    case "setCharacter":
      return runSetCharacterStep(state, step);
    case "grantDebugTool":
      return runGrantDebugToolStep(state, step);
  }
}

function createInitialState(caseDefinition: GoldenCaseDefinition): GoldenMutableState {
  if (!caseDefinition.scene.players.length) {
    throw new Error(`Golden case "${caseDefinition.id}" must define at least one player.`);
  }

  const board = createBoardDefinitionFromGoldenLayout(
    caseDefinition.scene.layout,
    caseDefinition.scene.symbols
  );
  const firstPlayerId = caseDefinition.scene.players[0]?.id ?? "";
  const players: PlayerSnapshot[] = caseDefinition.scene.players.map((player, index) => ({
    id: player.id,
    name: player.name ?? player.id,
    color: player.color ?? PLAYER_COLORS[index % PLAYER_COLORS.length] ?? "#ec6f5a",
    characterId: player.characterId ?? "late",
    position: clonePosition(player.position),
    spawnPosition: clonePosition(player.spawnPosition ?? player.position),
    tools: [],
    turnFlags: [...(player.turnFlags ?? [])]
  }));

  const state: GoldenMutableState = {
    caseDefinition,
    eventSerial: 1,
    moveDieSeed: caseDefinition.scene.seeds?.moveDieSeed ?? 11,
    nextPresentationSequence: caseDefinition.scene.seeds?.nextPresentationSequence ?? 1,
    nextToolInstanceSerial: caseDefinition.scene.seeds?.nextToolInstanceSerial ?? 1,
    playerOrder: players.map((player) => player.id),
    snapshot: {
      boardWidth: board.width,
      boardHeight: board.height,
      tiles: board.tiles,
      players,
      summons: [],
      eventLog: [],
      latestPresentation: null,
      turnInfo: {
        currentPlayerId: caseDefinition.scene.turn?.currentPlayerId ?? firstPlayerId,
        phase: caseDefinition.scene.turn?.phase ?? "action",
        moveRoll: caseDefinition.scene.turn?.moveRoll ?? 0,
        lastRolledToolId: caseDefinition.scene.turn?.lastRolledToolId ?? null,
        toolDieSeed:
          caseDefinition.scene.turn?.toolDieSeed ??
          caseDefinition.scene.seeds?.toolDieSeed ??
          1,
        turnNumber: caseDefinition.scene.turn?.turnNumber ?? 1
      }
    },
    toolDieSeed:
      caseDefinition.scene.seeds?.toolDieSeed ??
      caseDefinition.scene.turn?.toolDieSeed ??
      1
  };

  for (const scenePlayer of caseDefinition.scene.players) {
    const player = findPlayer(state.snapshot, scenePlayer.id);

    if (!player) {
      continue;
    }

    applyToolInventory(
      player,
      (scenePlayer.tools ?? []).map((tool) => materializeSceneTool(state, tool))
    );
  }

  state.snapshot.summons = (caseDefinition.scene.summons ?? []).map((summon, index) => ({
    instanceId: summon.instanceId ?? `${summon.summonId}-${index + 1}`,
    summonId: summon.summonId,
    ownerId: summon.ownerId,
    position: clonePosition(summon.position)
  }));

  if (caseDefinition.scene.seeds?.nextToolInstanceSerial === undefined) {
    state.nextToolInstanceSerial = detectNextToolInstanceSerial(state.snapshot.players);
  }

  return state;
}

function summarizePlayers(
  players: PlayerSnapshot[]
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

function buildCaseStateSummary(state: GoldenMutableState): GoldenCaseStateSummary {
  return {
    boardLayout: serializeGoldenBoardLayout(
      buildBoardDefinition(state.snapshot),
      state.caseDefinition.scene.symbols
    ),
    eventTypes: state.snapshot.eventLog.map((entry) => entry.type),
    latestPresentation: {
      toolId: state.snapshot.latestPresentation?.toolId ?? null,
      sequence: state.snapshot.latestPresentation?.sequence ?? null,
      eventKinds: state.snapshot.latestPresentation?.events.map((event) => event.kind) ?? []
    },
    players: summarizePlayers(state.snapshot.players),
    summons: state.snapshot.summons.map((summon) => ({
      ...summon,
      position: clonePosition(summon.position)
    })),
    turnInfo: cloneTurnInfo(state.snapshot.turnInfo)
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

// Golden cases run the shared rules against small, data-only scenes and emit a comparable summary.
export function runGoldenCase(caseDefinition: GoldenCaseDefinition): GoldenCaseResult {
  const state = createInitialState(caseDefinition);
  const stepResults = caseDefinition.steps.map((step) =>
    handleStepExpectation(step, runStep(state, step))
  );
  const actual = buildCaseStateSummary(state);
  const mismatches = compareCaseExpectation(caseDefinition, actual, stepResults);

  return {
    caseId: caseDefinition.id,
    title: caseDefinition.title,
    ...(caseDefinition.description ? { description: caseDefinition.description } : {}),
    actual,
    snapshot: {
      ...state.snapshot,
      tiles: state.snapshot.tiles.map((tile) => ({ ...tile })),
      players: state.snapshot.players.map((player) => ({
        ...player,
        position: clonePosition(player.position),
        spawnPosition: clonePosition(player.spawnPosition),
        tools: player.tools.map((tool) => ({
          ...tool,
          params: {
            ...tool.params
          }
        })),
        turnFlags: [...player.turnFlags]
      })),
      summons: state.snapshot.summons.map((summon) => ({
        ...summon,
        position: clonePosition(summon.position)
      })),
      eventLog: state.snapshot.eventLog.map((entry) => ({ ...entry })),
      turnInfo: cloneTurnInfo(state.snapshot.turnInfo),
      latestPresentation: state.snapshot.latestPresentation
        ? {
            ...state.snapshot.latestPresentation,
            events: state.snapshot.latestPresentation.events.map((event) => ({ ...event }))
          }
        : null
    },
    stepResults,
    mismatches,
    passed: mismatches.length === 0
  };
}

export function runGoldenCases(
  caseDefinitions: readonly GoldenCaseDefinition[]
): GoldenCaseResult[] {
  return caseDefinitions.map((caseDefinition) => runGoldenCase(caseDefinition));
}
