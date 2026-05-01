import { getTile } from "./board";
import { getCharacterDefinition, getCharacterIds } from "./characters";
import { rollMovementDie, rollToolDie } from "./dice";
import {
  buildGameMapRuntimeMetadata,
  getNextActivePlayerId,
  getNextFinishRank,
  isPlayerActiveForTurn,
  resolveSettlementState
} from "./gameplay";
import { createBoardDefinitionFromGoldenLayout } from "./goldens/layout";
import { cloneModifierIds } from "./modifiers";
import { clonePlayerTags } from "./playerTags";
import {
  appendPresentationEvents,
  createEffectEvent,
  createPresentation,
  createPlayerMotionEvent,
  createStateTransitionEvent
} from "./rules/actionPresentation";
import { buildStateTransitionPresentationEvents } from "./rules/actionResolution";
import { createTurnStartResolutionDraft } from "./rules/actionDraft";
import { resolveToolAction } from "./actions";
import {
  applyDiceRollModifiers,
  applyMovementResolvedModifiers,
  applyOnGetToolModifiers,
  applyTurnActionStartModifiers,
  applyTurnEndModifiers,
  applyTurnEndStartModifiers,
  applyTurnStartModifiers
} from "./skills";
import { resolveStopSummonEffects } from "./summons";
import { resolveStopTerrainEffect } from "./terrain";
import {
  cloneToolSelectionRecord,
  getDirectionSelection
} from "./toolInteraction";
import {
  canUseToolInPhase,
  createDebugToolInstance,
  createMovementToolInstance,
  createToolInstance,
  findToolInstance,
  getToolDefinition
} from "./tools";
import { getAssignedPlayerColor, getSequentialTeamId, getTeamDisplayLabel } from "./teams";
import type {
  ActionPhaseEffect,
  ActionPresentation,
  BoardDefinition,
  BoardPlayerState,
  BoardSummonState,
  EventLogEntry,
  EventType,
  GameSnapshot,
  GridPosition,
  PlayerTagMap,
  PlayerSnapshot,
  PlayerStateTransition,
  ToolHistoryEntrySnapshot,
  PlayerTurnFlag,
  SummonMutation,
  TileMutation,
  TriggeredSummonEffect,
  TriggeredTerrainEffect,
  TurnInfoSnapshot,
  TurnToolSnapshot
} from "./types";
import type { UseToolCommandPayload } from "./types";
import type {
  GameOrchestrationState,
  GameRuntimeState,
  SimulationCommand,
  SimulationCommandOutcome,
  SimulationDispatchResult,
  SimulationSceneDefinition
} from "./simulation/types";

interface MutableGameOrchestrationState {
  runtime: GameRuntimeState;
  snapshot: GameSnapshot;
}

const STUN_SKIP_EFFECT_MS = 520;

interface ToolLoadoutLike {
  charges?: number;
  instanceId?: string;
  params?: TurnToolSnapshot["params"];
  source?: TurnToolSnapshot["source"];
  toolId: TurnToolSnapshot["toolId"];
}

export interface GameOrchestrator {
  advanceTurn: () => SimulationDispatchResult;
  dispatch: (command: SimulationCommand) => SimulationDispatchResult;
  getRuntimeState: () => GameRuntimeState;
  getSnapshot: () => GameSnapshot;
  hasPendingAdvance: () => boolean;
}

function clonePosition(position: GridPosition): GridPosition {
  return {
    x: position.x,
    y: position.y
  };
}

function cloneToolHistoryEntry(entry: ToolHistoryEntrySnapshot): ToolHistoryEntrySnapshot {
  return {
    playerId: entry.playerId,
    toolId: entry.toolId,
    source: entry.source,
    turnNumber: entry.turnNumber,
    params: {
      ...entry.params
    }
  };
}

function cloneTurnInfo(turnInfo: TurnInfoSnapshot): TurnInfoSnapshot {
  return {
    currentPlayerId: turnInfo.currentPlayerId,
    phase: turnInfo.phase,
    turnNumber: turnInfo.turnNumber,
    lastRolledMoveDieValue: turnInfo.lastRolledMoveDieValue,
    moveRoll: turnInfo.moveRoll,
    lastRolledToolId: turnInfo.lastRolledToolId,
    toolDieSeed: turnInfo.toolDieSeed
  };
}

export function cloneOrchestratedGameSnapshot(snapshot: GameSnapshot): GameSnapshot {
  return {
    ...snapshot,
    hostPlayerId: snapshot.hostPlayerId,
    tiles: snapshot.tiles.map((tile) => ({ ...tile, faction: tile.faction })),
    players: snapshot.players.map((player) => ({
      ...player,
      boardVisible: player.boardVisible,
      finishRank: player.finishRank,
      finishedTurnNumber: player.finishedTurnNumber,
      isConnected: player.isConnected,
      isReady: player.isReady,
      petId: player.petId,
      modifiers: cloneModifierIds(player.modifiers),
      position: clonePosition(player.position),
      spawnPosition: clonePosition(player.spawnPosition),
      tags: clonePlayerTags(player.tags),
      teamId: player.teamId,
      tools: player.tools.map((tool) => ({
        ...tool,
        params: {
          ...tool.params
        }
      })),
      turnFlags: [...player.turnFlags]
    })),
    toolHistory: snapshot.toolHistory.map(cloneToolHistoryEntry),
    summons: snapshot.summons.map((summon) => ({
      ...summon,
      position: clonePosition(summon.position)
    })),
    eventLog: snapshot.eventLog.map((entry) => ({ ...entry })),
    turnInfo: cloneTurnInfo(snapshot.turnInfo),
    latestPresentation: snapshot.latestPresentation
      ? {
          ...snapshot.latestPresentation,
          events: snapshot.latestPresentation.events.map((event) =>
            event.kind === "state_transition"
              ? {
                  ...event,
                  tileTransitions: event.tileTransitions.map((transition) => ({
                    ...transition,
                    before: { ...transition.before },
                    after: { ...transition.after }
                  })),
                  summonTransitions: event.summonTransitions.map((transition) => ({
                    ...transition,
                    before: transition.before ? { ...transition.before, position: { ...transition.before.position } } : null,
                    after: transition.after ? { ...transition.after, position: { ...transition.after.position } } : null
                  })),
                  playerTransitions: event.playerTransitions.map((transition) => ({
                    ...transition,
                    before: { ...transition.before },
                    after: { ...transition.after }
                  }))
                }
              : {
                  ...event
                }
          )
        }
      : null
  };
}

export function cloneGameRuntimeState(runtime: GameRuntimeState): GameRuntimeState {
  return {
    ...runtime,
    pendingAdvance: runtime.pendingAdvance ? { ...runtime.pendingAdvance } : null
  };
}

function cloneGameOrchestrationState(
  state: GameOrchestrationState
): MutableGameOrchestrationState {
  return {
    snapshot: cloneOrchestratedGameSnapshot(state.snapshot),
    runtime: cloneGameRuntimeState(state.runtime)
  };
}

function buildBoardDefinition(snapshot: GameSnapshot): BoardDefinition {
  return {
    width: snapshot.boardWidth,
    height: snapshot.boardHeight,
    tiles: snapshot.tiles.map((tile) => ({
      ...tile,
      direction: tile.direction,
      faction: tile.faction
    }))
  };
}

function buildBoardPlayers(snapshot: GameSnapshot): BoardPlayerState[] {
  return snapshot.players
    .filter((player) => player.boardVisible)
    .map((player) => ({
      id: player.id,
      boardVisible: player.boardVisible,
      characterId: player.characterId,
      modifiers: cloneModifierIds(player.modifiers),
      position: clonePosition(player.position),
      spawnPosition: clonePosition(player.spawnPosition),
      tags: clonePlayerTags(player.tags),
      teamId: player.teamId,
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

function getPlayerOrder(snapshot: GameSnapshot): string[] {
  return snapshot.players.map((player) => player.id);
}

function didTurnOrderWrap(
  state: MutableGameOrchestrationState,
  currentPlayerId: string,
  nextPlayerId: string | null
): boolean {
  if (!nextPlayerId) {
    return false;
  }

  const playerOrder = getPlayerOrder(state.snapshot);
  const currentIndex = playerOrder.indexOf(currentPlayerId);
  const nextIndex = playerOrder.indexOf(nextPlayerId);

  if (currentIndex < 0 || nextIndex < 0) {
    return false;
  }

  return nextIndex <= currentIndex;
}

function isRaceMode(state: MutableGameOrchestrationState): boolean {
  return state.snapshot.mode === "race";
}

function isBedwarsMode(state: MutableGameOrchestrationState): boolean {
  return state.snapshot.mode === "bedwars";
}

function normalizePlayerTools(
  player: PlayerSnapshot,
  snapshot: GameSnapshot,
  tools: TurnToolSnapshot[],
  phase: TurnInfoSnapshot["phase"]
): ReturnType<typeof applyOnGetToolModifiers> {
  return applyOnGetToolModifiers(
    player.characterId,
    {
      id: player.id,
      modifiers: cloneModifierIds(player.modifiers),
      phase,
      position: clonePosition(player.position),
      tags: clonePlayerTags(player.tags),
      toolHistory: snapshot.toolHistory.map(cloneToolHistoryEntry),
      turnNumber: snapshot.turnInfo.turnNumber,
      tools
    },
    tools
  );
}

function clearPlayerTurnResources(player: PlayerSnapshot): void {
  player.tools = [];
  player.turnFlags = [];
}

function clearPlayerTools(player: PlayerSnapshot): void {
  player.tools = [];
}

function applyPlayerModifiers(player: PlayerSnapshot, modifiers: readonly import("./types").ModifierId[]): void {
  player.modifiers = cloneModifierIds(modifiers);
}

function applyPlayerTurnFlags(player: PlayerSnapshot, turnFlags: PlayerTurnFlag[]): void {
  player.turnFlags = [...turnFlags];
}

function applyToolInventory(
  snapshot: GameSnapshot,
  player: PlayerSnapshot,
  tools: TurnToolSnapshot[],
  phase: TurnInfoSnapshot["phase"]
): void {
  const normalizedTools = normalizePlayerTools(player, snapshot, tools, phase);
  applyPlayerModifiers(player, normalizedTools.nextModifiers);
  applyPlayerTags(player, normalizedTools.nextTags);
  player.tools = normalizedTools.tools;
}

function applyPlayerTags(player: PlayerSnapshot, tags: PlayerTagMap): void {
  player.tags = clonePlayerTags(tags);
}

function clonePlayerTools(tools: TurnToolSnapshot[]): TurnToolSnapshot[] {
  return tools.map((tool) => ({
    ...tool,
    params: {
      ...tool.params
    }
  }));
}

function recordToolHistoryEntry(
  snapshot: GameSnapshot,
  playerId: string,
  tool: TurnToolSnapshot
): void {
  snapshot.toolHistory = [
    ...snapshot.toolHistory,
    {
      playerId,
      toolId: tool.toolId,
      source: tool.source,
      turnNumber: snapshot.turnInfo.turnNumber,
      params: {
        ...tool.params
      }
    }
  ];
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
    boardVisible?: boolean;
    modifiers?: import("./types").ModifierId[];
    playerId: string;
    target: GridPosition;
    tags?: PlayerTagMap;
    turnFlags?: PlayerTurnFlag[];
  }>
): void {
  for (const affectedPlayer of affectedPlayers) {
    const player = findPlayer(snapshot, affectedPlayer.playerId);

    if (!player) {
      continue;
    }

    player.position = clonePosition(affectedPlayer.target);

    if (affectedPlayer.boardVisible !== undefined) {
      player.boardVisible = affectedPlayer.boardVisible;
    }

    if (affectedPlayer.turnFlags) {
      applyPlayerTurnFlags(player, affectedPlayer.turnFlags);
    }

    if (affectedPlayer.modifiers) {
      applyPlayerModifiers(player, affectedPlayer.modifiers);
    }

    if (affectedPlayer.tags) {
      applyPlayerTags(player, affectedPlayer.tags);
    }
  }
}

function applyMovementResolvedEffects(
  snapshot: GameSnapshot,
  phase: TurnInfoSnapshot["phase"],
  actorMovement: { movement: import("./types").MovementDescriptor; path: GridPosition[]; playerId: string } | null,
  affectedPlayers: Array<{
    movement: import("./types").MovementDescriptor;
    path: GridPosition[];
    playerId: string;
  }>
): void {
  const movementResults = [
    ...(actorMovement ? [actorMovement] : []),
    ...affectedPlayers
  ];

  for (const movementResult of movementResults) {
    if (!movementResult.path.length) {
      continue;
    }

    const player = findPlayer(snapshot, movementResult.playerId);

    if (!player) {
      continue;
    }

    const movementResolution = applyMovementResolvedModifiers(
      player.characterId,
      {
        id: player.id,
        modifiers: cloneModifierIds(player.modifiers),
        phase,
        position: clonePosition(player.position),
        tags: clonePlayerTags(player.tags),
        toolHistory: snapshot.toolHistory.map(cloneToolHistoryEntry),
        turnNumber: snapshot.turnInfo.turnNumber,
        tools: [...player.tools]
      },
      movementResult.movement,
      null,
      movementResult.path
    );
    applyPlayerModifiers(player, movementResolution.nextModifiers);
    applyPlayerTags(player, movementResolution.nextTags);
  }
}

function pushEvent(state: MutableGameOrchestrationState, type: EventType, message: string): void {
  const entry: EventLogEntry = {
    id: `orchestration-event-${state.runtime.eventSerial}`,
    type,
    message,
    createdAt: state.runtime.eventSerial
  };

  state.runtime.eventSerial += 1;
  state.snapshot.eventLog = [...state.snapshot.eventLog, entry].slice(-10);
}

function pushTerrainEvents(
  state: MutableGameOrchestrationState,
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
        terrainEffect.respawnPosition ? "player_respawned" : "terrain_triggered",
        terrainEffect.respawnPosition
          ? `${affectedPlayer.name} fell through a pit and respawned at (${terrainEffect.respawnPosition.x}, ${terrainEffect.respawnPosition.y}).`
          : `${affectedPlayer.name} fell through a pit and was eliminated.`
      );
      continue;
    }

    if (terrainEffect.kind === "poison") {
      pushEvent(
        state,
        terrainEffect.respawnPosition ? "player_respawned" : "terrain_triggered",
        terrainEffect.respawnPosition
          ? `${affectedPlayer.name} was knocked down by poison and respawned at (${terrainEffect.respawnPosition.x}, ${terrainEffect.respawnPosition.y}).`
          : `${affectedPlayer.name} was knocked down by poison and was eliminated.`
      );
      continue;
    }

    if (terrainEffect.kind === "cannon") {
      pushEvent(
        state,
        "terrain_triggered",
        `${affectedPlayer.name} triggered a cannon facing ${terrainEffect.direction}.`
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

    if (terrainEffect.kind === "team_camp") {
      pushEvent(
        state,
        "terrain_triggered",
        `${affectedPlayer.name} used the team camp and gained ${getToolDefinition(terrainEffect.grantedTool.toolId).label}.`
      );
      continue;
    }

    if (terrainEffect.kind === "boxing_ball") {
      pushEvent(
        state,
        "terrain_triggered",
        `${affectedPlayer.name} rammed a boxing ball for ${terrainEffect.impactStrength} and gained ${getToolDefinition(terrainEffect.grantedTool.toolId).label}.`
      );
      continue;
    }

    if (terrainEffect.kind === "tower") {
      pushEvent(
        state,
        "terrain_triggered",
        `${affectedPlayer.name} damaged the ${terrainEffect.teamId} tower. Remaining durability ${terrainEffect.remainingDurability}.`
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
  state: MutableGameOrchestrationState,
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

function enterSettlementState(state: MutableGameOrchestrationState): void {
  state.runtime.pendingAdvance = null;
  state.snapshot.roomPhase = "settlement";
  state.snapshot.turnInfo.currentPlayerId = "";
  state.snapshot.turnInfo.phase = "turn-start";
  state.snapshot.turnInfo.lastRolledMoveDieValue = 0;
  state.snapshot.turnInfo.moveRoll = 0;
  state.snapshot.turnInfo.lastRolledToolId = null;
  state.snapshot.settlementState = "complete";
}

function refreshSettlementState(state: MutableGameOrchestrationState): boolean {
  const settlementState = resolveSettlementState(state.snapshot.mode, state.snapshot.players);
  state.snapshot.settlementState = settlementState;
  return settlementState === "complete";
}

function wasPlayerKnockedOutByTerrain(
  triggeredTerrainEffects: TriggeredTerrainEffect[],
  playerId: string
): boolean {
  return triggeredTerrainEffects.some(
    (effect) => (effect.kind === "pit" || effect.kind === "poison") && effect.playerId === playerId
  );
}

function applyModeProgress(
  state: MutableGameOrchestrationState,
  actorId: string,
  triggeredTerrainEffects: TriggeredTerrainEffect[]
): {
  actorFinished: boolean;
  settlementComplete: boolean;
} {
  if (!isRaceMode(state)) {
    return {
      actorFinished: false,
      settlementComplete: refreshSettlementState(state)
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
    player.boardVisible = false;
    actorFinished = actorFinished || player.id === actorId;
    pushEvent(
      state,
      "player_finished",
      `${player.name} reached the goal on turn ${state.snapshot.turnInfo.turnNumber} and finished #${player.finishRank}.`
    );
  }

  return {
    actorFinished,
    settlementComplete: refreshSettlementState(state)
  };
}

function publishActionPresentation(
  state: MutableGameOrchestrationState,
  presentation: ActionPresentation | null
): void {
  if (!presentation) {
    return;
  }

  state.snapshot.latestPresentation = {
    ...presentation,
    sequence: state.runtime.nextPresentationSequence
  };
  state.runtime.nextPresentationSequence += 1;
}

function publishDraftPresentation(
  state: MutableGameOrchestrationState,
  options: {
    actorId: string;
    board: BoardDefinition;
    presentationEvents: ActionPresentation["events"];
    sourceId: string;
    summonMutations: SummonMutation[];
    summons: BoardSummonState[];
    tileMutations: TileMutation[];
    toolId: TurnToolSnapshot["toolId"];
  }
): void {
  const basePresentation = createPresentation(
    options.actorId,
    options.toolId,
    options.presentationEvents
  );
  const transitionEvents = buildStateTransitionPresentationEvents({
    activePresentation: basePresentation,
    board: options.board,
    sourceId: options.sourceId,
    summonMutations: options.summonMutations,
    summons: options.summons,
    tileMutations: options.tileMutations
  });

  publishActionPresentation(
    state,
    appendPresentationEvents(
      basePresentation,
      options.actorId,
      options.toolId,
      transitionEvents
    )
  );
}

function restoreLuckyTilesForTurnStart(
  state: MutableGameOrchestrationState,
  playerId: string
): void {
  const tileMutations = state.snapshot.tiles
    .filter((tile) => tile.type === "emptyLucky")
    .map((tile) => ({
      key: tile.key,
      nextDurability: tile.durability,
      nextType: "lucky" as const,
      position: clonePosition({
        x: tile.x,
        y: tile.y
      })
    }));

  if (!tileMutations.length) {
    return;
  }

  const board = buildBoardDefinition(state.snapshot);
  const summons = buildBoardSummons(state.snapshot);

  publishDraftPresentation(state, {
    actorId: playerId,
    board,
    presentationEvents: [],
    sourceId: `turn-start:${playerId}:${state.snapshot.turnInfo.turnNumber}:lucky-restore`,
    summonMutations: [],
    summons,
    tileMutations,
    toolId: "movement"
  });
  applyTileMutations(state.snapshot, tileMutations);
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
  state: MutableGameOrchestrationState,
  toolId: TurnToolSnapshot["toolId"]
): string {
  const instanceId = `${toolId}-${state.runtime.nextToolInstanceSerial}`;
  state.runtime.nextToolInstanceSerial += 1;
  return instanceId;
}

function materializeToolLoadout(
  state: MutableGameOrchestrationState,
  toolDefinition: ToolLoadoutLike
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

function applyPhaseStartToPlayer(
  state: MutableGameOrchestrationState,
  player: PlayerSnapshot,
  phase: TurnInfoSnapshot["phase"]
): { skipTurn: boolean } {
  const phaseStart =
    phase === "turn-start"
      ? applyTurnStartModifiers(player.characterId, {
          id: player.id,
          modifiers: cloneModifierIds(player.modifiers),
          phase,
          position: clonePosition(player.position),
          tags: clonePlayerTags(player.tags),
          toolHistory: state.snapshot.toolHistory.map(cloneToolHistoryEntry),
          turnNumber: state.snapshot.turnInfo.turnNumber,
          tools: [...player.tools]
        })
      : phase === "turn-action"
        ? applyTurnActionStartModifiers(player.characterId, {
            id: player.id,
            modifiers: cloneModifierIds(player.modifiers),
            phase,
            position: clonePosition(player.position),
            tags: clonePlayerTags(player.tags),
            toolHistory: state.snapshot.toolHistory.map(cloneToolHistoryEntry),
            turnNumber: state.snapshot.turnInfo.turnNumber,
            tools: [...player.tools]
          })
        : applyTurnEndStartModifiers(player.characterId, {
            id: player.id,
            modifiers: cloneModifierIds(player.modifiers),
            phase,
            position: clonePosition(player.position),
            tags: clonePlayerTags(player.tags),
            toolHistory: state.snapshot.toolHistory.map(cloneToolHistoryEntry),
            turnNumber: state.snapshot.turnInfo.turnNumber,
            tools: [...player.tools]
          });

  applyPlayerModifiers(player, phaseStart.nextModifiers);
  applyPlayerTags(player, phaseStart.nextTags);

  if (!phaseStart.grantTools.length) {
    return {
      skipTurn: phaseStart.skipTurn
    };
  }

  applyToolInventory(
    state.snapshot,
    player,
    [
      ...player.tools,
      ...phaseStart.grantTools.map((tool: ToolLoadoutLike) => materializeToolLoadout(state, tool))
    ],
    phase
  );

  return {
    skipTurn: phaseStart.skipTurn
  };
}

function applyPhaseEntryStop(
  state: MutableGameOrchestrationState,
  player: PlayerSnapshot,
  phase: TurnInfoSnapshot["phase"],
  options: {
    includeSummons?: boolean;
    includeTerrain?: boolean;
  } = {}
): TriggeredTerrainEffect[] {
  const includeSummons = options.includeSummons ?? true;
  const includeTerrain = options.includeTerrain ?? true;
  const board = buildBoardDefinition(state.snapshot);
  const summons = buildBoardSummons(state.snapshot);
  const draft = createTurnStartResolutionDraft(
    state.snapshot,
    {
      characterId: player.characterId,
      id: player.id,
      modifiers: cloneModifierIds(player.modifiers),
      position: clonePosition(player.position),
      spawnPosition: clonePosition(player.spawnPosition),
      tags: clonePlayerTags(player.tags),
      teamId: player.teamId,
      turnFlags: [...player.turnFlags]
    },
    `${phase}:${player.id}:${state.snapshot.turnInfo.turnNumber}`,
    state.runtime.toolDieSeed,
    [...player.tools],
    "movement"
  );

  if (includeSummons) {
    resolveStopSummonEffects(draft, {
      movement: null,
      phase,
      player: draft.actor,
      position: draft.actor.position,
      startMs: 0
    });
  }

  const tile = includeTerrain ? getTile(draft.board, draft.actor.position) : null;

  if (tile) {
    resolveStopTerrainEffect(draft, {
      movement: null,
      player: draft.actor,
      position: draft.actor.position,
      startMs: 0,
      tile
    });
  }

  player.position = clonePosition(draft.actor.position);
  applyPlayerModifiers(player, draft.actor.modifiers);
  applyPlayerTags(player, draft.actor.tags);
  applyPlayerTurnFlags(player, draft.actor.turnFlags);
  player.tools = clonePlayerTools(draft.tools);
  applyTileMutations(state.snapshot, draft.tileMutations);
  applySummonMutations(state.snapshot, draft.summonMutations);
  applyAffectedPlayerMoves(state.snapshot, draft.affectedPlayers);
  applyMovementResolvedEffects(state.snapshot, phase, null, draft.affectedPlayers);
  state.runtime.toolDieSeed = draft.nextToolDieSeed;
  state.snapshot.turnInfo.toolDieSeed = state.runtime.toolDieSeed;
  if (draft.presentationEvents.length || draft.tileMutations.length || draft.summonMutations.length) {
    publishDraftPresentation(state, {
      actorId: player.id,
      board,
      presentationEvents: draft.presentationEvents,
      sourceId: draft.sourceId,
      summonMutations: draft.summonMutations,
      summons,
      tileMutations: draft.tileMutations,
      toolId: draft.presentationToolId
    });
  }
  pushTerrainEvents(state, player.id, draft.triggeredTerrainEffects);
  pushSummonEvents(state, draft.triggeredSummonEffects);
  return draft.triggeredTerrainEffects;
}

function enterActionPhaseWithRoll(
  state: MutableGameOrchestrationState,
  player: PlayerSnapshot,
  moveRoll: number,
  rolledTool: ToolLoadoutLike | null
): void {
  const diceRollModifiers = applyDiceRollModifiers(
    player.characterId,
    {
      id: player.id,
      modifiers: cloneModifierIds(player.modifiers),
      phase: "turn-start",
      position: clonePosition(player.position),
      tags: clonePlayerTags(player.tags),
      toolHistory: state.snapshot.toolHistory.map(cloneToolHistoryEntry),
      turnNumber: state.snapshot.turnInfo.turnNumber,
      tools: [...player.tools]
    },
    moveRoll,
    rolledTool
  );

  applyPlayerModifiers(player, diceRollModifiers.nextModifiers);
  applyPlayerTags(player, diceRollModifiers.nextTags);
  applyToolInventory(
    state.snapshot,
    player,
    [
      ...(diceRollModifiers.movementRoll > 0
        ? [
        createMovementToolInstance(
          createToolInstanceId(state, "movement"),
          diceRollModifiers.movementRoll)
        ] : []
      ),
      // createMovementToolInstance(
      //   createToolInstanceId(state, "movement"),
      //   diceRollModifiers.movementRoll
      // ),
      ...(diceRollModifiers.rolledTool
        ? [
            materializeToolLoadout(state, {
              ...diceRollModifiers.rolledTool
            })
          ]
        : []),
      ...diceRollModifiers.grantTools.map((tool) => materializeToolLoadout(state, tool))
    ],
    "turn-action"
  );

  state.snapshot.turnInfo.phase = "turn-action";
  state.snapshot.turnInfo.lastRolledMoveDieValue = moveRoll;
  state.snapshot.turnInfo.moveRoll = diceRollModifiers.movementRoll;
  state.snapshot.turnInfo.lastRolledToolId =
    (diceRollModifiers.rolledTool?.toolId as TurnInfoSnapshot["lastRolledToolId"]) ?? null;
  state.snapshot.turnInfo.toolDieSeed = state.runtime.toolDieSeed;
  const triggeredTerrainEffects = applyPhaseEntryStop(state, player, "turn-action");
  const goalProgress = applyModeProgress(state, player.id, triggeredTerrainEffects);
  const actorWasKnockedOut = wasPlayerKnockedOutByTerrain(triggeredTerrainEffects, player.id);

  if (goalProgress.actorFinished) {
    queueRaceFinishAdvance(
      state,
      player,
      state.snapshot.latestPresentation,
      true,
      goalProgress.settlementComplete
    );
    return;
  }

  if (isBedwarsMode(state) && goalProgress.settlementComplete) {
    queueSettlementAdvance(state);
    return;
  }

  if (isBedwarsMode(state) && actorWasKnockedOut) {
    finishTurn(state, player, `${player.name} was knocked out and ended the turn.`);
    return;
  }

  applyPhaseStartToPlayer(state, player, "turn-action");
}

function createRaceFinishPresentation(
  playerId: string,
  position: GridPosition,
  presentation: ActionPresentation | null
): ActionPresentation {
  const finishStartMs = presentation?.durationMs ?? 0;
  const finishMotionEvent = createPlayerMotionEvent(
    `race-finish:${playerId}`,
    playerId,
    [position, position],
    "finish",
    finishStartMs
  );
  const playerTransition: PlayerStateTransition = {
    playerId,
    before: {
      playerId,
      boardVisible: true
    },
    after: {
      playerId,
      boardVisible: false
    }
  };
  const hideEvent = createStateTransitionEvent(
    `race-finish-hide:${playerId}`,
    [],
    [],
    [playerTransition],
    finishStartMs + (finishMotionEvent?.durationMs ?? 0)
  );

  return appendPresentationEvents(
    presentation,
    playerId,
    presentation?.toolId ?? "movement",
    [finishMotionEvent, hideEvent].filter(
      (event): event is NonNullable<typeof event> => event !== null
    )
  ) ?? {
    actorId: playerId,
    toolId: "movement",
    durationMs: 0,
    events: []
  };
}

function getNextPlayerId(
  state: MutableGameOrchestrationState,
  currentPlayerId: string
): string | null {
  const playerOrder = getPlayerOrder(state.snapshot);

  if (!playerOrder.length) {
    return null;
  }

  return getNextActivePlayerId(
    playerOrder,
    state.snapshot.players,
    currentPlayerId,
    state.snapshot.mode
  );
}

function queueRaceFinishAdvance(
  state: MutableGameOrchestrationState,
  player: PlayerSnapshot,
  presentation: ActionPresentation | null,
  shouldAdvanceTurnNumber: boolean,
  settlementComplete: boolean
): void {
  clearPlayerTurnResources(player);
  const nextPlayerId = settlementComplete ? null : getNextPlayerId(state, player.id);
  publishActionPresentation(
    state,
    createRaceFinishPresentation(player.id, clonePosition(player.position), presentation)
  );
  state.runtime.pendingAdvance = {
    kind: "race_finish",
    nextPlayerId,
    shouldAdvanceTurnNumber
  };
}

function queueSettlementAdvance(state: MutableGameOrchestrationState): void {
  state.runtime.pendingAdvance = {
    kind: "presentation_settlement",
    nextPlayerId: null,
    shouldAdvanceTurnNumber: false
  };
}

function resolveTurnEndAdvance(
  state: MutableGameOrchestrationState,
  player: PlayerSnapshot,
  message: string
): string | null {
  const phaseEnd = applyTurnEndModifiers(player.characterId, {
    id: player.id,
    modifiers: cloneModifierIds(player.modifiers),
    phase: state.snapshot.turnInfo.phase,
    position: clonePosition(player.position),
    tags: clonePlayerTags(player.tags),
    toolHistory: state.snapshot.toolHistory.map(cloneToolHistoryEntry),
    turnNumber: state.snapshot.turnInfo.turnNumber,
    tools: [...player.tools]
  });

  applyPlayerModifiers(player, phaseEnd.nextModifiers);
  applyPlayerTags(player, phaseEnd.nextTags);
  pushEvent(state, "turn_ended", message);
  state.snapshot.turnInfo.phase = "turn-end";
  clearPlayerTurnResources(player);
  return getNextPlayerId(state, player.id);
}

function finishTurn(
  state: MutableGameOrchestrationState,
  player: PlayerSnapshot,
  message: string
): void {
  const nextPlayerId = resolveTurnEndAdvance(state, player, message);

  if (nextPlayerId) {
    beginTurnFor(state, nextPlayerId, true);
    return;
  }

  enterSettlementState(state);
}

function enterTurnEndPhase(
  state: MutableGameOrchestrationState,
  player: PlayerSnapshot
): boolean {
  state.snapshot.turnInfo.phase = "turn-end";
  clearPlayerTools(player);
  const phaseStart = applyPhaseStartToPlayer(state, player, "turn-end");

  return phaseStart.skipTurn || player.tools.length < 1;
}

function publishTurnStartPresentation(
  state: MutableGameOrchestrationState,
  baselineSequence: number | null,
  playerId: string,
  events: ActionPresentation["events"]
): void {
  if (!events.length) {
    return;
  }

  const latestPresentation = state.snapshot.latestPresentation;

  if (latestPresentation && latestPresentation.sequence !== baselineSequence) {
    const mergedPresentation = appendPresentationEvents(
      latestPresentation,
      playerId,
      latestPresentation.toolId,
      events
    );

    if (mergedPresentation) {
      state.snapshot.latestPresentation = {
        ...mergedPresentation,
        sequence: latestPresentation.sequence
      };
    }
    return;
  }

  publishActionPresentation(state, createPresentation(playerId, "movement", events));
}

function queueTurnSkipAdvance(
  state: MutableGameOrchestrationState,
  player: PlayerSnapshot,
  message: string,
  presentationBaselineSequence: number | null
): void {
  const nextPlayerId = resolveTurnEndAdvance(state, player, message);
  publishTurnStartPresentation(state, presentationBaselineSequence, player.id, [
    createEffectEvent(
      `turn-skip:${player.id}:${state.snapshot.turnInfo.turnNumber}`,
      "stun_clear",
      clonePosition(player.position),
      [clonePosition(player.position)],
      0,
      STUN_SKIP_EFFECT_MS
    )
  ]);
  state.runtime.pendingAdvance = {
    kind: "turn_skip",
    nextPlayerId,
    shouldAdvanceTurnNumber: nextPlayerId !== null
  };
}

function beginTurnFor(
  state: MutableGameOrchestrationState,
  playerId: string,
  shouldAdvanceTurnNumber: boolean
): void {
  const player = findPlayer(state.snapshot, playerId);

  if (!player) {
    return;
  }

  state.runtime.pendingAdvance = null;
  clearPlayerTurnResources(player);
  state.snapshot.turnInfo.currentPlayerId = playerId;
  state.snapshot.turnInfo.phase = "turn-start";
  state.snapshot.turnInfo.lastRolledMoveDieValue = 0;
  state.snapshot.turnInfo.moveRoll = 0;
  state.snapshot.turnInfo.lastRolledToolId = null;
  state.snapshot.turnInfo.toolDieSeed = state.runtime.toolDieSeed;
  state.snapshot.roomPhase = "in_game";

  if (shouldAdvanceTurnNumber) {
    state.snapshot.turnInfo.turnNumber += 1;
  }

  const presentationBaselineSequence = state.snapshot.latestPresentation?.sequence ?? null;
  restoreLuckyTilesForTurnStart(state, playerId);
  pushEvent(state, "turn_started", `${player.name}'s turn started. Roll the dice.`);
  const phaseStart = applyPhaseStartToPlayer(state, player, "turn-start");
  applyPhaseEntryStop(state, player, "turn-start", {
    includeSummons: true,
    includeTerrain: false
  });

  if (phaseStart.skipTurn) {
    queueTurnSkipAdvance(
      state,
      player,
      `${player.name} was stunned and skipped the turn.`,
      presentationBaselineSequence
    );
  }
}

function bootstrapExistingTurnStartPhase(state: MutableGameOrchestrationState): void {
  const activePlayer = findPlayer(state.snapshot, state.snapshot.turnInfo.currentPlayerId);

  if (!activePlayer) {
    return;
  }

  state.snapshot.turnInfo.toolDieSeed = state.runtime.toolDieSeed;
  const presentationBaselineSequence = state.snapshot.latestPresentation?.sequence ?? null;
  const phaseStart = applyPhaseStartToPlayer(state, activePlayer, "turn-start");
  applyPhaseEntryStop(state, activePlayer, "turn-start", {
    includeSummons: true,
    includeTerrain: false
  });

  if (phaseStart.skipTurn) {
    queueTurnSkipAdvance(
      state,
      activePlayer,
      `${activePlayer.name} was stunned and skipped the turn.`,
      presentationBaselineSequence
    );
  }
}

function hasPendingAdvance(runtime: GameRuntimeState): boolean {
  return runtime.pendingAdvance !== null;
}

function ensureActivePlayer(
  state: MutableGameOrchestrationState,
  actorId: string
): PlayerSnapshot | null {
  const player = findPlayer(state.snapshot, actorId);

  if (!player) {
    return null;
  }

  if (state.snapshot.roomPhase !== "in_game") {
    pushEvent(state, "move_blocked", `${player.name} cannot act before the game starts.`);
    return null;
  }

  if (hasPendingAdvance(state.runtime)) {
    pushEvent(state, "move_blocked", `${player.name} must wait for the finish animation to resolve.`);
    return null;
  }

  if (state.snapshot.turnInfo.currentPlayerId !== actorId) {
    pushEvent(state, "move_blocked", `${player.name} tried to act out of turn.`);
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

function buildOkOutcome(message: string): SimulationCommandOutcome {
  return {
    status: "ok",
    message
  };
}

function rollIntoActionPhase(
  state: MutableGameOrchestrationState,
  player: PlayerSnapshot,
  rollMode: NonNullable<ActionPhaseEffect["rollMode"]>
): void {
  if (rollMode === "standard") {
    const movementRoll = rollMovementDie(state.runtime.moveDieSeed);
    state.runtime.moveDieSeed = movementRoll.nextSeed;
    const toolRoll = rollToolDie(state.runtime.toolDieSeed);
    state.runtime.toolDieSeed = toolRoll.nextSeed;
    pushEvent(
      state,
      "dice_rolled",
      `${player.name} rolled Movement ${movementRoll.value} and ${getToolDefinition(toolRoll.value.toolId).label}.`
    );
    enterActionPhaseWithRoll(state, player, movementRoll.value, toolRoll.value);
    return;
  }

  if (rollMode === "movement_only") {
    const movementRoll = rollMovementDie(state.runtime.moveDieSeed);
    state.runtime.moveDieSeed = movementRoll.nextSeed;
    pushEvent(
      state,
      "dice_rolled",
      `${player.name} rolled Movement ${movementRoll.value} and skipped the tool die.`
    );
    enterActionPhaseWithRoll(state, player, movementRoll.value, null);
    return;
  }

  const toolRoll = rollToolDie(state.runtime.toolDieSeed);
  state.runtime.toolDieSeed = toolRoll.nextSeed;
  pushEvent(
    state,
    "dice_rolled",
    `${player.name} skipped the movement die and rolled ${getToolDefinition(toolRoll.value.toolId).label}.`
  );
  enterActionPhaseWithRoll(state, player, 0, toolRoll.value);
}

function buildSettlementMessage(state: MutableGameOrchestrationState): string {
  if (isRaceMode(state)) {
    return "All players reached the goal. Settlement is ready.";
  }

  if (isBedwarsMode(state)) {
    const winningTeam = state.snapshot.players.find((player) => player.boardVisible && player.teamId)?.teamId;
    return winningTeam ? `${getTeamDisplayLabel(winningTeam)}获胜。` : "起床战争结束。";
  }

  return "Settlement is ready.";
}

function blockCommand(
  state: MutableGameOrchestrationState,
  message: string
): SimulationCommandOutcome {
  pushEvent(state, "move_blocked", message);
  return buildBlockedOutcome(message);
}

function runRollDiceCommand(
  state: MutableGameOrchestrationState,
  actorId: string
): SimulationCommandOutcome {
  const player = ensureActivePlayer(state, actorId);

  if (!player) {
    return buildBlockedOutcome(`Player ${actorId} cannot roll right now.`);
  }

  if (state.snapshot.turnInfo.phase !== "turn-start") {
    return blockCommand(state, `${player.name} cannot roll right now.`);
  }

  const movementRoll = rollMovementDie(state.runtime.moveDieSeed);
  state.runtime.moveDieSeed = movementRoll.nextSeed;

  const toolRoll = rollToolDie(state.runtime.toolDieSeed);
  state.runtime.toolDieSeed = toolRoll.nextSeed;
  pushEvent(
    state,
    "dice_rolled",
    `${player.name} rolled Movement ${movementRoll.value} and ${getToolDefinition(toolRoll.value.toolId).label}.`
  );
  enterActionPhaseWithRoll(state, player, movementRoll.value, toolRoll.value);

  return buildOkOutcome(`${player.name} rolled successfully.`);
}

function runUseToolCommand(
  state: MutableGameOrchestrationState,
  actorId: string,
  payload: UseToolCommandPayload
): SimulationCommandOutcome {
  const player = ensureActivePlayer(state, actorId);

  if (!player) {
    return buildBlockedOutcome(`Player ${actorId} cannot act right now.`);
  }

  const activeTool = findToolInstance(player.tools, payload.toolInstanceId);

  if (!activeTool) {
    return blockCommand(state, `${player.name} does not have the selected tool.`);
  }

  if (!canUseToolInPhase(activeTool.toolId, state.snapshot.turnInfo.phase)) {
    return blockCommand(
      state,
      `${player.name} cannot use ${getToolDefinition(activeTool.toolId).label} during ${state.snapshot.turnInfo.phase}.`
    );
  }

  const resolution = resolveToolAction({
    board: buildBoardDefinition(state.snapshot),
    actor: {
      id: player.id,
      characterId: player.characterId,
      modifiers: cloneModifierIds(player.modifiers),
      position: clonePosition(player.position),
      spawnPosition: clonePosition(player.spawnPosition),
      tags: clonePlayerTags(player.tags),
      teamId: player.teamId,
      turnFlags: [...player.turnFlags]
    },
    activeTool,
    input: cloneToolSelectionRecord(payload.input),
    mode: state.snapshot.mode,
    phase: state.snapshot.turnInfo.phase,
    toolHistory: state.snapshot.toolHistory.map(cloneToolHistoryEntry),
    players: buildBoardPlayers(state.snapshot),
    summons: buildBoardSummons(state.snapshot),
    toolDieSeed: state.runtime.toolDieSeed,
    turnNumber: state.snapshot.turnInfo.turnNumber,
    tools: [...player.tools]
  });

  if (resolution.kind === "blocked") {
    return blockCommand(
      state,
      `${player.name} cannot use ${getToolDefinition(activeTool.toolId).label}: ${resolution.reason}.`
    );
  }

  player.position = clonePosition(resolution.actor.position);
  player.boardVisible = resolution.actor.boardVisible;
  applyPlayerModifiers(player, resolution.actor.modifiers);
  applyPlayerTags(player, resolution.actor.tags);
  applyPlayerTurnFlags(player, resolution.actor.turnFlags);
  applyToolInventory(state.snapshot, player, resolution.tools, state.snapshot.turnInfo.phase);
  applyTileMutations(state.snapshot, resolution.tileMutations);
  applySummonMutations(state.snapshot, resolution.summonMutations);
  applyAffectedPlayerMoves(state.snapshot, resolution.affectedPlayers);
  applyMovementResolvedEffects(
    state.snapshot,
    state.snapshot.turnInfo.phase,
    resolution.actorMovement
      ? {
          movement: resolution.actorMovement.movement,
          path: resolution.actorMovement.path,
          playerId: resolution.actorMovement.playerId
        }
      : null,
    resolution.affectedPlayers
  );

  state.runtime.toolDieSeed = resolution.nextToolDieSeed;
  state.snapshot.turnInfo.toolDieSeed = state.runtime.toolDieSeed;
  publishActionPresentation(state, resolution.presentation);

  if (resolution.tileMutations.some((mutation) => mutation.nextType === "floor")) {
    pushEvent(state, "earth_wall_broken", `${player.name} broke an earth wall while moving.`);
  }

  pushTerrainEvents(state, player.id, resolution.triggeredTerrainEffects);
  pushSummonEvents(state, resolution.triggeredSummonEffects);
  const goalProgress = applyModeProgress(state, player.id, resolution.triggeredTerrainEffects);
  const actorWasKnockedOut = wasPlayerKnockedOutByTerrain(resolution.triggeredTerrainEffects, player.id);
  recordToolHistoryEntry(state.snapshot, player.id, activeTool);

  if (activeTool.toolId === "movement") {
    const movementDirection = getDirectionSelection(payload.input);
    pushEvent(
      state,
      "piece_moved",
      `${player.name} used Movement ${movementDirection ?? "unknown"} to (${player.position.x}, ${player.position.y}).`
    );
  } else {
    pushEvent(state, "tool_used", `${player.name} used ${getToolDefinition(activeTool.toolId).label}.`);
  }

  if (goalProgress.actorFinished) {
    queueRaceFinishAdvance(state, player, resolution.presentation, true, goalProgress.settlementComplete);
    return buildOkOutcome(resolution.summary);
  }

  if (isBedwarsMode(state) && goalProgress.settlementComplete) {
    queueSettlementAdvance(state);
    return buildOkOutcome(resolution.summary);
  }
  if (resolution.phaseEffect?.rollMode) {
    rollIntoActionPhase(state, player, resolution.phaseEffect.rollMode);
    return buildOkOutcome(resolution.summary);
  }

  if (!(resolution.phaseEffect?.finishTurn || resolution.endsTurn)) {
    if (resolution.phaseEffect?.nextPhase === "turn-end") {
      if (enterTurnEndPhase(state, player)) {
        finishTurn(state, player, `${player.name} ended the turn.`);
      }

      return buildOkOutcome(resolution.summary);
    }

    if (resolution.phaseEffect?.nextPhase) {
      state.snapshot.turnInfo.phase = resolution.phaseEffect.nextPhase;
    }

    if (isBedwarsMode(state) && actorWasKnockedOut) {
      finishTurn(state, player, `${player.name} was knocked out and ended the turn.`);
      return buildOkOutcome(resolution.summary);
    }

    if (state.snapshot.turnInfo.phase === "turn-end" && player.tools.length < 1) {
      finishTurn(state, player, `${player.name} ended the turn.`);
    }

    return buildOkOutcome(resolution.summary);
  }

  finishTurn(state, player, `${player.name} ended the turn.`);
  return buildOkOutcome(resolution.summary);
}

function runEndTurnCommand(
  state: MutableGameOrchestrationState,
  actorId: string
): SimulationCommandOutcome {
  const player = ensureActivePlayer(state, actorId);

  if (!player) {
    return buildBlockedOutcome(`Player ${actorId} cannot end the turn right now.`);
  }

  if (state.snapshot.turnInfo.phase === "turn-action") {
    if (enterTurnEndPhase(state, player)) {
      finishTurn(state, player, `${player.name} ended the turn.`);
      return buildOkOutcome(`${player.name} ended the turn.`);
    }

    return buildOkOutcome(`${player.name} entered the turn-end phase.`);
  }

  if (state.snapshot.turnInfo.phase !== "turn-end") {
    return blockCommand(
      state,
      `${player.name} can only end the turn during the action phase or skip the turn-end phase.`
    );
  }

  finishTurn(state, player, `${player.name} ended the turn.`);
  return buildOkOutcome(`${player.name} ended the turn.`);
}

function runSetCharacterCommand(
  state: MutableGameOrchestrationState,
  actorId: string,
  characterId: string
): SimulationCommandOutcome {
  const player = ensureActivePlayer(state, actorId);

  if (!player) {
    return buildBlockedOutcome(`Player ${actorId} cannot switch character right now.`);
  }

  if (state.snapshot.turnInfo.phase !== "turn-start") {
    return blockCommand(state, `${player.name} can only switch character during turn start.`);
  }

  if (!getCharacterIds().includes(characterId as PlayerSnapshot["characterId"])) {
    return blockCommand(state, `${player.name} tried to switch to an unknown character.`);
  }

  player.characterId = characterId as PlayerSnapshot["characterId"];
  applyPlayerModifiers(player, []);
  applyPlayerTags(player, {});
  clearPlayerTurnResources(player);
  const phaseStart = applyPhaseStartToPlayer(state, player, "turn-start");
  pushEvent(
    state,
    "character_switched",
    `${player.name} switched to ${getCharacterDefinition(player.characterId).label}.`
  );

  if (phaseStart.skipTurn) {
    finishTurn(state, player, `${player.name} was stunned and skipped the turn.`);
  }

  return buildOkOutcome(`${player.name} switched to ${player.characterId}.`);
}

function runGrantDebugToolCommand(
  state: MutableGameOrchestrationState,
  actorId: string,
  toolId: TurnToolSnapshot["toolId"]
): SimulationCommandOutcome {
  const player = ensureActivePlayer(state, actorId);

  if (!player) {
    return buildBlockedOutcome(`Player ${actorId} cannot receive a debug tool right now.`);
  }

  if (state.snapshot.turnInfo.phase !== "turn-action") {
    return blockCommand(state, `${player.name} can only grant a debug tool during the action phase.`);
  }

  if (!state.snapshot.allowDebugTools) {
    return blockCommand(state, "Debug tools are disabled on this map.");
  }

  const definition = getToolDefinition(toolId);

  if (!definition.debugGrantable) {
    return blockCommand(state, `${definition.label} cannot be debug-granted right now.`);
  }

  const grantedTool =
    toolId === "movement"
      ? createMovementToolInstance(createToolInstanceId(state, "movement"), 4)
      : createDebugToolInstance(createToolInstanceId(state, toolId), toolId);

  applyToolInventory(state.snapshot, player, [...player.tools, grantedTool], state.snapshot.turnInfo.phase);
  pushEvent(state, "debug_granted", `${player.name} debug gained ${definition.label}.`);

  return buildOkOutcome(`${player.name} gained ${definition.label}.`);
}

function dispatchGameCommand(
  state: MutableGameOrchestrationState,
  command: SimulationCommand
): SimulationCommandOutcome {
  switch (command.kind) {
    case "rollDice":
      return runRollDiceCommand(state, command.actorId);
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

function runAdvanceTurn(state: MutableGameOrchestrationState): SimulationCommandOutcome {
  const pendingAdvance = state.runtime.pendingAdvance;

  if (pendingAdvance) {
    state.runtime.pendingAdvance = null;

    if (!pendingAdvance.nextPlayerId) {
      enterSettlementState(state);
      if (pendingAdvance.kind !== "turn_skip") {
        pushEvent(state, "match_finished", buildSettlementMessage(state));
      }
      return buildOkOutcome("Advanced into settlement.");
    }

    beginTurnFor(
      state,
      pendingAdvance.nextPlayerId,
      pendingAdvance.shouldAdvanceTurnNumber
    );
    return buildOkOutcome(`Advanced to ${pendingAdvance.nextPlayerId}.`);
  }

  if (state.snapshot.roomPhase !== "in_game") {
    return buildBlockedOutcome("The match is not currently in progress.");
  }

  if (!state.snapshot.players.length) {
    return buildBlockedOutcome("No players are available to take a turn.");
  }

  const currentPlayerId = state.snapshot.turnInfo.currentPlayerId;

  if (!currentPlayerId) {
    const firstPlayerId =
      state.snapshot.players.find((player) => isPlayerActiveForTurn(state.snapshot.mode, player))?.id ?? null;

    if (!firstPlayerId) {
      return buildBlockedOutcome("No players are available to take a turn.");
    }

    beginTurnFor(state, firstPlayerId, false);
    return buildOkOutcome(`Started ${firstPlayerId}'s turn.`);
  }

  const currentPlayer = findPlayer(state.snapshot, currentPlayerId);

  if (!currentPlayer || !isPlayerActiveForTurn(state.snapshot.mode, currentPlayer)) {
    const nextPlayerId = getNextPlayerId(state, currentPlayerId);

    if (!nextPlayerId) {
      enterSettlementState(state);
      pushEvent(state, "match_finished", buildSettlementMessage(state));
      return buildOkOutcome("Advanced into settlement.");
    }

    beginTurnFor(state, nextPlayerId, true);
    return buildOkOutcome(`Advanced to ${nextPlayerId}.`);
  }

  return buildBlockedOutcome("There is no pending turn advance.");
}

export function createInitialGameRuntimeState(
  seeds?: Partial<Pick<GameRuntimeState, "moveDieSeed" | "nextPresentationSequence" | "nextToolInstanceSerial" | "toolDieSeed">>
): GameRuntimeState {
  return {
    eventSerial: 1,
    moveDieSeed: seeds?.moveDieSeed ?? 11,
    nextPresentationSequence: seeds?.nextPresentationSequence ?? 1,
    nextToolInstanceSerial: seeds?.nextToolInstanceSerial ?? 1,
    pendingAdvance: null,
    toolDieSeed: seeds?.toolDieSeed ?? 1
  };
}

export function createGameOrchestrationStateFromScene(
  sceneDefinition: SimulationSceneDefinition
): GameOrchestrationState {
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
  const players: PlayerSnapshot[] = sceneDefinition.players.map((player, index) => {
    const teamId =
      mapMetadata.mode === "bedwars"
        ? (player.teamId ?? getSequentialTeamId(index))
        : (player.teamId ?? null);

    return {
      id: player.id,
      name: player.name ?? player.id,
      petId: player.petId ?? "",
      color: player.color ?? getAssignedPlayerColor(mapMetadata.mode, index, teamId),
      boardVisible: player.boardVisible ?? player.finishRank == null,
      characterId: player.characterId ?? "late",
      finishRank: player.finishRank ?? null,
      finishedTurnNumber: player.finishedTurnNumber ?? null,
      isConnected: true,
      isReady: false,
      modifiers: cloneModifierIds(player.modifiers ?? []),
      position: clonePosition(player.position),
      spawnPosition: clonePosition(player.spawnPosition ?? player.position),
      tags: clonePlayerTags(player.tags ?? {}),
      teamId,
      tools: [],
      turnFlags: [...(player.turnFlags ?? [])]
    };
  });
  const runtime = createInitialGameRuntimeState({
    ...(sceneDefinition.seeds?.moveDieSeed !== undefined
      ? { moveDieSeed: sceneDefinition.seeds.moveDieSeed }
      : {}),
    ...(sceneDefinition.seeds?.nextPresentationSequence !== undefined
      ? { nextPresentationSequence: sceneDefinition.seeds.nextPresentationSequence }
      : {}),
    ...(sceneDefinition.seeds?.nextToolInstanceSerial !== undefined
      ? { nextToolInstanceSerial: sceneDefinition.seeds.nextToolInstanceSerial }
      : {}),
    ...(sceneDefinition.seeds?.toolDieSeed !== undefined ||
    sceneDefinition.turn?.toolDieSeed !== undefined
      ? {
          toolDieSeed:
            sceneDefinition.seeds?.toolDieSeed ??
            sceneDefinition.turn?.toolDieSeed ??
            1
        }
      : {})
  });
  const state: MutableGameOrchestrationState = {
    runtime,
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
      toolHistory: [],
      settlementState: sceneDefinition.settlementState ?? resolveSettlementState(mapMetadata.mode, players),
      summons: [],
      eventLog: [],
      latestPresentation: null,
      turnInfo: {
        currentPlayerId: sceneDefinition.turn?.currentPlayerId ?? firstPlayerId,
        phase: sceneDefinition.turn?.phase ?? "turn-action",
        lastRolledMoveDieValue: sceneDefinition.turn?.lastRolledMoveDieValue ?? 0,
        moveRoll: sceneDefinition.turn?.moveRoll ?? 0,
        lastRolledToolId: sceneDefinition.turn?.lastRolledToolId ?? null,
        toolDieSeed:
          sceneDefinition.turn?.toolDieSeed ??
          sceneDefinition.seeds?.toolDieSeed ??
          1,
        turnNumber: sceneDefinition.turn?.turnNumber ?? 1
      }
    }
  };

  for (const scenePlayer of sceneDefinition.players) {
    const player = findPlayer(state.snapshot, scenePlayer.id);

    if (!player) {
      continue;
    }

    applyToolInventory(
      state.snapshot,
      player,
      (scenePlayer.tools ?? []).map((tool) => materializeToolLoadout(state, tool)),
      state.snapshot.turnInfo.phase
    );
  }

  state.snapshot.summons = (sceneDefinition.summons ?? []).map((summon, index) => ({
    instanceId: summon.instanceId ?? `${summon.summonId}-${index + 1}`,
    summonId: summon.summonId,
    ownerId: summon.ownerId,
    position: clonePosition(summon.position)
  }));

  if (sceneDefinition.seeds?.nextToolInstanceSerial === undefined) {
    state.runtime.nextToolInstanceSerial = detectNextToolInstanceSerial(state.snapshot.players);
  }

  if (state.snapshot.turnInfo.phase === "turn-start" && state.snapshot.turnInfo.currentPlayerId) {
    bootstrapExistingTurnStartPhase(state);

    while (hasPendingAdvance(state.runtime)) {
      runAdvanceTurn(state);
    }
  }

  return {
    runtime: cloneGameRuntimeState(state.runtime),
    snapshot: cloneOrchestratedGameSnapshot(state.snapshot)
  };
}

class MutableGameOrchestrator implements GameOrchestrator {
  private readonly state: MutableGameOrchestrationState;

  constructor(initialState: GameOrchestrationState) {
    this.state = cloneGameOrchestrationState(initialState);
  }

  getSnapshot(): GameSnapshot {
    return cloneOrchestratedGameSnapshot(this.state.snapshot);
  }

  getRuntimeState(): GameRuntimeState {
    return cloneGameRuntimeState(this.state.runtime);
  }

  hasPendingAdvance(): boolean {
    return hasPendingAdvance(this.state.runtime);
  }

  dispatch(command: SimulationCommand): SimulationDispatchResult {
    const outcome = dispatchGameCommand(this.state, command);

    return {
      outcome,
      snapshot: this.getSnapshot()
    };
  }

  advanceTurn(): SimulationDispatchResult {
    const outcome = runAdvanceTurn(this.state);

    return {
      outcome,
      snapshot: this.getSnapshot()
    };
  }
}

export function createGameOrchestrator(
  initialState: GameOrchestrationState
): GameOrchestrator {
  return new MutableGameOrchestrator(initialState);
}

