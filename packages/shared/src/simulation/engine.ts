import { applyCharacterToolTransforms, getCharacterDefinition, getCharacterIds } from "../characters";
import {
  adjustMovementTools,
  applyCharacterTurnEndCleanup,
  buildCharacterTurnLoadoutRuntime,
  cloneCharacterState,
  getCharacterStateNumber,
  markCharacterMovedOutOfTurn,
  prepareCharacterTurnStart,
  resolveCharacterTurnStartAction,
  FARTHER_PENDING_MOVE_BONUS_STATE_KEY,
  getTotalMovementPoints
} from "../characterRuntime";
import { PLAYER_COLORS } from "../constants";
import { rollMovementDie, rollToolDie } from "../dice";
import {
  buildGameMapRuntimeMetadata,
  getNextActiveRacePlayerId,
  getNextFinishRank,
  resolveSettlementState
} from "../gameplay";
import { resolveCurrentTileStop, resolveToolAction } from "../actions";
import {
  createDebugToolInstance,
  createMovementToolInstance,
  createRolledToolInstance,
  createToolInstance,
  findToolInstance,
  getToolDefinition,
  getToolParam
} from "../tools";
import {
  createTurnStartActionSnapshot,
  getTurnStartActionDefinition
} from "../turnStartActions";
import type {
  ActionPresentation,
  BoardDefinition,
  BoardPlayerState,
  BoardSummonState,
  CharacterStateMap,
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
  TurnToolSnapshot
} from "../types";
import type { UseToolCommandPayload, UseTurnStartActionCommandPayload } from "../types";
import type {
  GameSimulation,
  SimulationCommand,
  SimulationCommandOutcome,
  SimulationDispatchResult,
  SimulationSceneDefinition,
  SimulationToolLoadoutDefinition
} from "./types";
import { createBoardDefinitionFromGoldenLayout } from "../goldens/layout";

interface SimulationMutableState {
  eventSerial: number;
  moveDieSeed: number;
  nextPresentationSequence: number;
  nextToolInstanceSerial: number;
  playerOrder: string[];
  snapshot: GameSnapshot;
  toolDieSeed: number;
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
    turnStartActions: turnInfo.turnStartActions.map((action) => ({
      ...action
    })),
    toolDieSeed: turnInfo.toolDieSeed
  };
}

// The simulator returns immutable snapshots so tests and local playback can consume them safely.
export function cloneGameSnapshot(snapshot: GameSnapshot): GameSnapshot {
  return {
    ...snapshot,
    hostPlayerId: snapshot.hostPlayerId,
    tiles: snapshot.tiles.map((tile) => ({ ...tile })),
    players: snapshot.players.map((player) => ({
      ...player,
      characterState: cloneCharacterState(player.characterState),
      finishRank: player.finishRank,
      finishedTurnNumber: player.finishedTurnNumber,
      isConnected: player.isConnected,
      isReady: player.isReady,
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
    summons: snapshot.summons.map((summon) => ({
      ...summon,
      position: clonePosition(summon.position)
    })),
    eventLog: snapshot.eventLog.map((entry) => ({ ...entry })),
    turnInfo: cloneTurnInfo(snapshot.turnInfo),
    latestPresentation: snapshot.latestPresentation
      ? {
          ...snapshot.latestPresentation,
          events: snapshot.latestPresentation.events.map((event) => ({ ...event }))
        }
      : null
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
    characterState: cloneCharacterState(player.characterState),
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

function isRaceMode(state: SimulationMutableState): boolean {
  return state.snapshot.mode === "race";
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

function applyCharacterState(player: PlayerSnapshot, characterState: CharacterStateMap): void {
  player.characterState = cloneCharacterState(characterState);
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
    characterState?: CharacterStateMap;
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

    if (affectedPlayer.characterState) {
      applyCharacterState(player, affectedPlayer.characterState);
    }
  }
}

function markOutOfTurnMovement(
  snapshot: GameSnapshot,
  activePlayerId: string,
  affectedPlayers: Array<{
    playerId: string;
  }>
): void {
  for (const affectedPlayer of affectedPlayers) {
    if (affectedPlayer.playerId === activePlayerId) {
      continue;
    }

    const player = findPlayer(snapshot, affectedPlayer.playerId);

    if (!player) {
      continue;
    }

    applyCharacterState(
      player,
      markCharacterMovedOutOfTurn(player.characterId, player.characterState)
    );
  }
}

function pushEvent(state: SimulationMutableState, type: EventType, message: string): void {
  const entry: EventLogEntry = {
    id: `simulation-event-${state.eventSerial}`,
    type,
    message,
    createdAt: state.eventSerial
  };

  state.eventSerial += 1;
  state.snapshot.eventLog = [...state.snapshot.eventLog, entry].slice(-10);
}

function pushTerrainEvents(
  state: SimulationMutableState,
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
  state: SimulationMutableState,
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

function enterSettlementState(state: SimulationMutableState): void {
  state.snapshot.turnInfo.currentPlayerId = "";
  state.snapshot.turnInfo.phase = "roll";
  state.snapshot.turnInfo.moveRoll = 0;
  state.snapshot.turnInfo.lastRolledToolId = null;
  state.snapshot.turnInfo.turnStartActions = [];
  state.snapshot.settlementState = "complete";
}

function applyRaceGoalProgress(
  state: SimulationMutableState,
  actorId: string,
  triggeredTerrainEffects: TriggeredTerrainEffect[]
): {
  actorFinished: boolean;
  settlementComplete: boolean;
} {
  if (!isRaceMode(state)) {
    return {
      actorFinished: false,
      settlementComplete: false
    };
  }

  let actorFinished = false;
  const goalPlayerIds = [
    ...new Set(
      triggeredTerrainEffects
        .filter((effect): effect is Extract<TriggeredTerrainEffect, { kind: "goal" }> => effect.kind === "goal")
        .map((effect) => effect.playerId)
    )
  ];

  for (const playerId of goalPlayerIds) {
    const player = findPlayer(state.snapshot, playerId);

    if (!player || player.finishRank !== null) {
      continue;
    }

    player.finishRank = getNextFinishRank(state.snapshot.players);
    player.finishedTurnNumber = state.snapshot.turnInfo.turnNumber;
    actorFinished = actorFinished || player.id === actorId;
    pushEvent(
      state,
      "player_finished",
      `${player.name} reached the goal on turn ${state.snapshot.turnInfo.turnNumber} and finished #${player.finishRank}.`
    );
  }

  const settlementState = resolveSettlementState(state.snapshot.mode, state.snapshot.players);
  const settlementComplete = settlementState === "complete";

  if (settlementComplete && state.snapshot.settlementState !== "complete") {
    enterSettlementState(state);
    pushEvent(state, "match_finished", "All players reached the goal. Settlement is ready.");
  } else {
    state.snapshot.settlementState = settlementState;
  }

  return {
    actorFinished,
    settlementComplete
  };
}

function publishActionPresentation(
  state: SimulationMutableState,
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
  state: SimulationMutableState,
  toolId: TurnToolSnapshot["toolId"]
): string {
  const instanceId = `${toolId}-${state.nextToolInstanceSerial}`;
  state.nextToolInstanceSerial += 1;
  return instanceId;
}

function materializeSceneTool(
  state: SimulationMutableState,
  toolDefinition: SimulationToolLoadoutDefinition
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

function buildTurnActionTools(
  state: SimulationMutableState,
  player: PlayerSnapshot,
  baseTools: TurnToolSnapshot[]
): TurnToolSnapshot[] {
  const runtimeLoadout = buildCharacterTurnLoadoutRuntime(
    player.characterId,
    player.characterState
  );
  applyCharacterState(player, runtimeLoadout.nextCharacterState);

  return normalizePlayerTools(player, [
    ...baseTools,
    ...runtimeLoadout.loadout.map((tool) => materializeSceneTool(state, tool))
  ]);
}

function refreshTurnStartActions(
  state: SimulationMutableState,
  player: PlayerSnapshot,
  actionIds: readonly import("../types").TurnStartActionId[]
): void {
  state.snapshot.turnInfo.turnStartActions = actionIds.map((actionId) =>
    createTurnStartActionSnapshot(actionId, player.characterId)
  );
}

function applyTurnStartStop(
  state: SimulationMutableState,
  player: PlayerSnapshot
): TriggeredTerrainEffect[] {
  const stopResolution = resolveCurrentTileStop(
    {
      activeTool: null,
      actorId: player.id,
      board: buildBoardDefinition(state.snapshot),
      players: buildBoardPlayers(state.snapshot),
      sourceId: `turn-start:${player.id}:${state.snapshot.turnInfo.turnNumber}`,
      summons: buildBoardSummons(state.snapshot)
    },
    {
      player: {
        characterId: player.characterId,
        characterState: cloneCharacterState(player.characterState),
        id: player.id,
        position: clonePosition(player.position),
        spawnPosition: clonePosition(player.spawnPosition),
        turnFlags: [...player.turnFlags]
      },
      toolDieSeed: state.toolDieSeed,
      tools: [...player.tools]
    }
  );

  player.position = clonePosition(stopResolution.actor.position);
  applyCharacterState(player, stopResolution.actor.characterState);
  applyPlayerTurnFlags(player, stopResolution.actor.turnFlags);
  applyToolInventory(player, stopResolution.tools);
  applyTileMutations(state.snapshot, stopResolution.tileMutations);
  applySummonMutations(state.snapshot, stopResolution.summonMutations);
  state.toolDieSeed = stopResolution.nextToolDieSeed;
  state.snapshot.turnInfo.toolDieSeed = state.toolDieSeed;
  pushTerrainEvents(state, player.id, stopResolution.triggeredTerrainEffects);
  pushSummonEvents(state, stopResolution.triggeredSummonEffects);
  return stopResolution.triggeredTerrainEffects;
}

function prepareTurnStartState(player: PlayerSnapshot) {
  const preparation = prepareCharacterTurnStart(player.characterId, player.characterState);
  applyCharacterState(player, preparation.nextCharacterState);
  return preparation;
}

function enterActionPhaseWithRoll(
  state: SimulationMutableState,
  player: PlayerSnapshot,
  moveRoll: number,
  rolledTool: TurnToolSnapshot | null
): void {
  applyToolInventory(
    player,
    buildTurnActionTools(
      state,
      player,
      [
        ...player.tools,
        createMovementToolInstance(createToolInstanceId(state, "movement"), moveRoll),
        ...(rolledTool ? [rolledTool] : [])
      ]
    )
  );

  state.snapshot.turnInfo.phase = "action";
  state.snapshot.turnInfo.moveRoll = moveRoll;
  state.snapshot.turnInfo.lastRolledToolId =
    (rolledTool?.toolId as TurnInfoSnapshot["lastRolledToolId"]) ?? null;
  state.snapshot.turnInfo.turnStartActions = [];
  state.snapshot.turnInfo.toolDieSeed = state.toolDieSeed;
}

function finishTurn(
  state: SimulationMutableState,
  player: PlayerSnapshot,
  message: string
): void {
  pushEvent(state, "turn_ended", message);
  applyCharacterState(
    player,
    applyCharacterTurnEndCleanup(player.characterId, player.characterState)
  );
  clearPlayerTurnResources(player);
  beginTurnFor(state, getNextPlayerId(state, player.id), true);
}

function beginTurnFor(
  state: SimulationMutableState,
  playerId: string,
  shouldAdvanceTurnNumber: boolean
): void {
  const player = findPlayer(state.snapshot, playerId);

  if (!player) {
    return;
  }

  const preparation = prepareTurnStartState(player);
  clearPlayerTurnResources(player);
  state.snapshot.turnInfo.currentPlayerId = playerId;
  state.snapshot.turnInfo.phase = "roll";
  state.snapshot.turnInfo.moveRoll = 0;
  state.snapshot.turnInfo.lastRolledToolId = null;
  refreshTurnStartActions(state, player, preparation.turnStartActions);
  state.snapshot.turnInfo.toolDieSeed = state.toolDieSeed;

  if (shouldAdvanceTurnNumber) {
    state.snapshot.turnInfo.turnNumber += 1;
  }

  pushEvent(state, "turn_started", `${player.name}'s turn started. Roll the dice.`);
  const triggeredTerrainEffects = applyTurnStartStop(state, player);
  const goalProgress = applyRaceGoalProgress(state, player.id, triggeredTerrainEffects);

  if (!goalProgress.actorFinished || goalProgress.settlementComplete) {
    return;
  }

  clearPlayerTurnResources(player);
  const nextPlayerId = getNextPlayerId(state, player.id);

  if (nextPlayerId === player.id) {
    enterSettlementState(state);
    pushEvent(state, "match_finished", "All players reached the goal. Settlement is ready.");
    return;
  }

  beginTurnFor(state, nextPlayerId, true);
}

function getNextPlayerId(state: SimulationMutableState, currentPlayerId: string): string {
  if (isRaceMode(state)) {
    return getNextActiveRacePlayerId(
      state.playerOrder,
      state.snapshot.players,
      currentPlayerId
    ) ?? currentPlayerId;
  }

  const currentIndex = state.playerOrder.findIndex((playerId) => playerId === currentPlayerId);

  if (currentIndex < 0) {
    return state.playerOrder[0] ?? currentPlayerId;
  }

  return state.playerOrder[(currentIndex + 1) % state.playerOrder.length] ?? currentPlayerId;
}

function ensureActivePlayer(
  state: SimulationMutableState,
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

function buildBlockedOutcome(reason: string): SimulationCommandOutcome {
  return {
    status: "blocked",
    reason,
    message: reason
  };
}

function runRollDiceCommand(
  state: SimulationMutableState,
  actorId: string
): SimulationCommandOutcome {
  const player = ensureActivePlayer(state, actorId);

  if (!player) {
    return buildBlockedOutcome(`Player ${actorId} cannot roll right now.`);
  }

  if (state.snapshot.turnInfo.phase !== "roll") {
    return buildBlockedOutcome(`${player.name} cannot roll right now.`);
  }

  const movementRoll = rollMovementDie(state.moveDieSeed);
  state.moveDieSeed = movementRoll.nextSeed;

  const toolRoll = rollToolDie(state.toolDieSeed);
  state.toolDieSeed = toolRoll.nextSeed;
  enterActionPhaseWithRoll(
    state,
    player,
    movementRoll.value,
    createRolledToolInstance(createToolInstanceId(state, toolRoll.value.toolId), toolRoll.value)
  );

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

function runUseTurnStartActionCommand(
  state: SimulationMutableState,
  actorId: string,
  payload: UseTurnStartActionCommandPayload
): SimulationCommandOutcome {
  const player = ensureActivePlayer(state, actorId);

  if (!player) {
    return buildBlockedOutcome(`Player ${actorId} cannot act right now.`);
  }

  if (state.snapshot.turnInfo.phase !== "roll") {
    return buildBlockedOutcome(`${player.name} can only use this action before rolling.`);
  }

  const availableAction = state.snapshot.turnInfo.turnStartActions.find(
    (action) => action.actionId === payload.actionId
  );

  if (!availableAction) {
    return buildBlockedOutcome(`${player.name} cannot use that roll-phase action right now.`);
  }

  const resolution = resolveCharacterTurnStartAction(
    player.characterId,
    player.characterState,
    payload.actionId
  );

  if (!resolution) {
    return buildBlockedOutcome(`${player.name} cannot use that roll-phase action right now.`);
  }

  applyCharacterState(player, resolution.nextCharacterState);
  pushEvent(
    state,
    "character_action_used",
    `${player.name} used ${getTurnStartActionDefinition(availableAction.actionId).label}.`
  );

  if (resolution.endTurn) {
    finishTurn(state, player, `${player.name} ended the turn.`);

    return {
      status: "ok",
      message: `${player.name} prepared the next turn.`
    };
  }

  if (resolution.skipToolDie) {
    const movementRoll = rollMovementDie(state.moveDieSeed);
    state.moveDieSeed = movementRoll.nextSeed;
    enterActionPhaseWithRoll(state, player, movementRoll.value, null);
    pushEvent(
      state,
      "dice_rolled",
      `${player.name} rolled Movement ${movementRoll.value} and skipped the tool die.`
    );

    return {
      status: "ok",
      message: `${player.name} entered leap mode for this turn.`
    };
  }

  return {
    status: "ok",
    message: `${player.name} used a roll-phase action.`
  };
}

function runUseToolCommand(
  state: SimulationMutableState,
  actorId: string,
  payload: UseToolCommandPayload
): SimulationCommandOutcome {
  const player = ensureActivePlayer(state, actorId);

  if (!player) {
    return buildBlockedOutcome(`Player ${actorId} cannot act right now.`);
  }

  if (state.snapshot.turnInfo.phase !== "action") {
    return buildBlockedOutcome(`${player.name} must roll dice first.`);
  }

  const activeTool = findToolInstance(player.tools, payload.toolInstanceId);

  if (!activeTool) {
    return buildBlockedOutcome(`${player.name} does not have the selected tool.`);
  }

  const resolution = resolveToolAction({
    board: buildBoardDefinition(state.snapshot),
    actor: {
      id: player.id,
      characterId: player.characterId,
      characterState: cloneCharacterState(player.characterState),
      position: clonePosition(player.position),
      spawnPosition: clonePosition(player.spawnPosition),
      turnFlags: [...player.turnFlags]
    },
    activeTool,
    ...(payload.direction ? { direction: payload.direction } : {}),
    ...(payload.choiceId ? { choiceId: payload.choiceId } : {}),
    ...(payload.targetPosition ? { targetPosition: clonePosition(payload.targetPosition) } : {}),
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
  applyCharacterState(player, resolution.actor.characterState);
  applyPlayerTurnFlags(player, resolution.actor.turnFlags);
  applyToolInventory(player, resolution.tools);
  applyTileMutations(state.snapshot, resolution.tileMutations);
  applySummonMutations(state.snapshot, resolution.summonMutations);
  applyAffectedPlayerMoves(state.snapshot, resolution.affectedPlayers);
  markOutOfTurnMovement(state.snapshot, player.id, resolution.affectedPlayers);

  state.toolDieSeed = resolution.nextToolDieSeed;
  state.snapshot.turnInfo.toolDieSeed = state.toolDieSeed;
  publishActionPresentation(state, resolution.presentation);

  if (resolution.tileMutations.some((mutation) => mutation.nextType === "floor")) {
    pushEvent(state, "earth_wall_broken", `${player.name} broke an earth wall while moving.`);
  }

  pushTerrainEvents(state, player.id, resolution.triggeredTerrainEffects);
  pushSummonEvents(state, resolution.triggeredSummonEffects);
  const goalProgress = applyRaceGoalProgress(state, player.id, resolution.triggeredTerrainEffects);

  if (activeTool.toolId === "movement") {
    pushEvent(
      state,
      "piece_moved",
      `${player.name} used Movement ${payload.direction} to (${player.position.x}, ${player.position.y}).`
    );
  } else {
    pushEvent(state, "tool_used", `${player.name} used ${getToolDefinition(activeTool.toolId).label}.`);
  }

  if (goalProgress.actorFinished) {
    clearPlayerTurnResources(player);

    if (!goalProgress.settlementComplete) {
      const nextPlayerId = getNextPlayerId(state, player.id);

      if (nextPlayerId !== player.id) {
        beginTurnFor(state, nextPlayerId, true);
      }
    }

    return {
      status: "ok",
      message: resolution.summary
    };
  }

  if (!resolution.endsTurn) {
    return {
      status: "ok",
      message: resolution.summary
    };
  }

  finishTurn(state, player, `${player.name} ended the turn.`);

  return {
    status: "ok",
    message: resolution.summary
  };
}

function runEndTurnCommand(
  state: SimulationMutableState,
  actorId: string
): SimulationCommandOutcome {
  const player = ensureActivePlayer(state, actorId);

  if (!player) {
    return buildBlockedOutcome(`Player ${actorId} cannot end the turn right now.`);
  }

  if (state.snapshot.turnInfo.phase !== "action") {
    return buildBlockedOutcome(`${player.name} must roll before ending the turn.`);
  }

  finishTurn(state, player, `${player.name} ended the turn.`);

  return {
    status: "ok",
    message: `${player.name} ended the turn.`
  };
}

function runSetCharacterCommand(
  state: SimulationMutableState,
  actorId: string,
  characterId: string
): SimulationCommandOutcome {
  const player = ensureActivePlayer(state, actorId);

  if (!player) {
    return buildBlockedOutcome(`Player ${actorId} cannot switch character right now.`);
  }

  if (state.snapshot.turnInfo.phase !== "roll") {
    return buildBlockedOutcome(`${player.name} can only switch character before rolling.`);
  }

  if (!getCharacterIds().includes(characterId as PlayerSnapshot["characterId"])) {
    return buildBlockedOutcome(`${player.name} tried to switch to an unknown character.`);
  }

  player.characterId = characterId as PlayerSnapshot["characterId"];
  applyCharacterState(player, {});
  refreshTurnStartActions(
    state,
    player,
    [...getCharacterDefinition(player.characterId).turnStartActionIds]
  );
  pushEvent(
    state,
    "character_switched",
    `${player.name} switched to ${getCharacterDefinition(player.characterId).label}.`
  );

  return {
    status: "ok",
    message: `${player.name} switched to ${player.characterId}.`
  };
}

function runGrantDebugToolCommand(
  state: SimulationMutableState,
  actorId: string,
  toolId: TurnToolSnapshot["toolId"]
): SimulationCommandOutcome {
  const player = ensureActivePlayer(state, actorId);

  if (!player) {
    return buildBlockedOutcome(`Player ${actorId} cannot receive a debug tool right now.`);
  }

  if (state.snapshot.turnInfo.phase !== "action") {
    return buildBlockedOutcome(`${player.name} must roll before granting a debug tool.`);
  }

  if (!state.snapshot.allowDebugTools) {
    return buildBlockedOutcome("Debug tools are disabled on this map.");
  }

  const definition = getToolDefinition(toolId);

  if (!definition.debugGrantable) {
    return buildBlockedOutcome(`${definition.label} cannot be debug-granted right now.`);
  }

  const grantedTool =
    toolId === "movement"
      ? createMovementToolInstance(createToolInstanceId(state, "movement"), 4)
      : createDebugToolInstance(createToolInstanceId(state, toolId), toolId);

  applyToolInventory(player, [...player.tools, grantedTool]);
  pushEvent(state, "debug_granted", `${player.name} debug gained ${definition.label}.`);

  return {
    status: "ok",
    message: `${player.name} gained ${definition.label}.`
  };
}

function dispatchSimulationCommand(
  state: SimulationMutableState,
  command: SimulationCommand
): SimulationCommandOutcome {
  switch (command.kind) {
    case "rollDice":
      return runRollDiceCommand(state, command.actorId);
    case "useTurnStartAction":
      return runUseTurnStartActionCommand(state, command.actorId, command.payload);
    case "useTool":
      return runUseToolCommand(state, command.actorId, command.payload);
    case "endTurn":
      return runEndTurnCommand(state, command.actorId);
    case "setCharacter":
      return runSetCharacterCommand(state, command.actorId, command.payload.characterId);
    case "grantDebugTool":
      return runGrantDebugToolCommand(state, command.actorId, command.payload.toolId);
  }
}

function createInitialState(sceneDefinition: SimulationSceneDefinition): SimulationMutableState {
  if (!sceneDefinition.players.length) {
    throw new Error("Simulation scene must define at least one player.");
  }

  const mapMetadata =
    sceneDefinition.mapId === "custom"
      ? {
          allowDebugTools: sceneDefinition.allowDebugTools ?? false,
          mapId: "custom" as const,
          mapLabel: sceneDefinition.mapLabel ?? "自定义场景",
          mode: sceneDefinition.mode ?? "free"
        }
      : buildGameMapRuntimeMetadata(sceneDefinition.mapId);
  const board = createBoardDefinitionFromGoldenLayout(
    sceneDefinition.layout,
    sceneDefinition.symbols
  );
  const firstPlayerId = sceneDefinition.players[0]?.id ?? "";
  const players: PlayerSnapshot[] = sceneDefinition.players.map((player, index) => ({
    id: player.id,
    name: player.name ?? player.id,
    color: player.color ?? PLAYER_COLORS[index % PLAYER_COLORS.length] ?? "#ec6f5a",
    characterId: player.characterId ?? "late",
    characterState: cloneCharacterState(player.characterState ?? {}),
    finishRank: player.finishRank ?? null,
    finishedTurnNumber: player.finishedTurnNumber ?? null,
    isConnected: true,
    isReady: false,
    position: clonePosition(player.position),
    spawnPosition: clonePosition(player.spawnPosition ?? player.position),
    tools: [],
    turnFlags: [...(player.turnFlags ?? [])]
  }));

  const state: SimulationMutableState = {
    eventSerial: 1,
    moveDieSeed: sceneDefinition.seeds?.moveDieSeed ?? 11,
    nextPresentationSequence: sceneDefinition.seeds?.nextPresentationSequence ?? 1,
    nextToolInstanceSerial: sceneDefinition.seeds?.nextToolInstanceSerial ?? 1,
    playerOrder: players.map((player) => player.id),
    snapshot: {
      allowDebugTools: mapMetadata.allowDebugTools,
      boardWidth: board.width,
      boardHeight: board.height,
      hostPlayerId: players[0]?.id ?? null,
      tiles: board.tiles,
      players,
      mapId: mapMetadata.mapId,
      mapLabel: mapMetadata.mapLabel,
      mode: mapMetadata.mode,
      roomCode: sceneDefinition.mapId ?? "local-sim",
      roomPhase: "in_game",
      settlementState: sceneDefinition.settlementState ?? resolveSettlementState(mapMetadata.mode, players),
      summons: [],
      eventLog: [],
      latestPresentation: null,
      turnInfo: {
        currentPlayerId: sceneDefinition.turn?.currentPlayerId ?? firstPlayerId,
        phase: sceneDefinition.turn?.phase ?? "action",
        moveRoll: sceneDefinition.turn?.moveRoll ?? 0,
        lastRolledToolId: sceneDefinition.turn?.lastRolledToolId ?? null,
        turnStartActions: [],
        toolDieSeed:
          sceneDefinition.turn?.toolDieSeed ??
          sceneDefinition.seeds?.toolDieSeed ??
          1,
        turnNumber: sceneDefinition.turn?.turnNumber ?? 1
      }
    },
    toolDieSeed:
      sceneDefinition.seeds?.toolDieSeed ??
      sceneDefinition.turn?.toolDieSeed ??
      1
  };

  for (const scenePlayer of sceneDefinition.players) {
    const player = findPlayer(state.snapshot, scenePlayer.id);

    if (!player) {
      continue;
    }

    applyToolInventory(
      player,
      (scenePlayer.tools ?? []).map((tool) => materializeSceneTool(state, tool))
    );
  }

  state.snapshot.summons = (sceneDefinition.summons ?? []).map((summon, index) => ({
    instanceId: summon.instanceId ?? `${summon.summonId}-${index + 1}`,
    summonId: summon.summonId,
    ownerId: summon.ownerId,
    position: clonePosition(summon.position)
  }));

  if (sceneDefinition.seeds?.nextToolInstanceSerial === undefined) {
    state.nextToolInstanceSerial = detectNextToolInstanceSerial(state.snapshot.players);
  }

  if (state.snapshot.turnInfo.phase === "roll") {
    const activePlayer = findPlayer(state.snapshot, state.snapshot.turnInfo.currentPlayerId);

    if (activePlayer) {
      const preparation = prepareTurnStartState(activePlayer);
      refreshTurnStartActions(state, activePlayer, preparation.turnStartActions);
      const triggeredTerrainEffects = applyTurnStartStop(state, activePlayer);
      const goalProgress = applyRaceGoalProgress(state, activePlayer.id, triggeredTerrainEffects);

      if (goalProgress.actorFinished && !goalProgress.settlementComplete) {
        clearPlayerTurnResources(activePlayer);
        const nextPlayerId = getNextPlayerId(state, activePlayer.id);

        if (nextPlayerId !== activePlayer.id) {
          beginTurnFor(state, nextPlayerId, true);
        }
      }
    }
  }

  return state;
}

class LocalGameSimulation implements GameSimulation {
  private readonly state: SimulationMutableState;

  constructor(sceneDefinition: SimulationSceneDefinition) {
    this.state = createInitialState(sceneDefinition);
  }

  // Callers receive a cloned snapshot so test assertions cannot mutate simulator state.
  getSnapshot(): GameSnapshot {
    return cloneGameSnapshot(this.state.snapshot);
  }

  // Commands mirror the same high-level user intents used by the room protocol.
  dispatch(command: SimulationCommand): SimulationDispatchResult {
    const outcome = dispatchSimulationCommand(this.state, command);

    return {
      outcome,
      snapshot: this.getSnapshot()
    };
  }
}

// Golden tests and local web playback share one pure simulator instead of reimplementing turn flow.
export function createGameSimulation(sceneDefinition: SimulationSceneDefinition): GameSimulation {
  return new LocalGameSimulation(sceneDefinition);
}
