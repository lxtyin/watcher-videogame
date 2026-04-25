import { cloneModifierIds } from "../modifiers";
import { clonePlayerTags } from "../playerTags";
import type {
  ActionPhaseEffect,
  ActionPresentation,
  ActionPresentationEvent,
  ActionResolution,
  AffectedPlayerMove,
  BoardDefinition,
  BoardPlayerState,
  BoardSummonState,
  GameMode,
  GameSnapshot,
  GridPosition,
  MovementActor,
  PlayerTurnFlag,
  PreviewDescriptor,
  ResolvedPlayerMovement,
  SummonMutation,
  TileMutation,
  ToolActionContext,
  ToolId,
  TriggeredSummonEffect,
  TriggeredTerrainEffect,
  TurnToolSnapshot
} from "../types";
import { createPresentation } from "./actionPresentation";
import { createEmptyPreview, createPreviewDescriptor } from "./previewDescriptor";

export interface ResolutionDraft {
  actor: MovementActor;
  actorId: string;
  board: BoardDefinition;
  mode: GameMode;
  nextToolDieSeed: number;
  nextEventOrdinal: number;
  playersById: Map<string, BoardPlayerState>;
  presentationEvents: ActionPresentationEvent[];
  presentationToolId: ToolId;
  previewHighlightTiles: GridPosition[];
  sourceId: string;
  summonMutations: SummonMutation[];
  summonsById: Map<string, BoardSummonState>;
  tileMutations: TileMutation[];
  tools: TurnToolSnapshot[];
  triggeredSummonEffects: TriggeredSummonEffect[];
  triggeredTerrainEffects: TriggeredTerrainEffect[];
  affectedPlayers: AffectedPlayerMove[];
}

export interface ToolActionDraft extends ResolutionDraft {
  actorMovement: ResolvedPlayerMovement | null;
  endsTurn: boolean;
  kind: "blocked" | "applied";
  path: GridPosition[];
  phaseEffect: ActionPhaseEffect | null;
  preview: PreviewDescriptor;
  reason: string | null;
  summary: string | null;
}

function clonePosition(position: GridPosition): GridPosition {
  return {
    x: position.x,
    y: position.y
  };
}

function appendUniquePosition(positions: GridPosition[], position: GridPosition): void {
  if (positions.some((entry) => entry.x === position.x && entry.y === position.y)) {
    return;
  }

  positions.push(clonePosition(position));
}

function finalizeDraftPreview(draft: ToolActionDraft): PreviewDescriptor {
  return createPreviewDescriptor({
    ...draft.preview,
    highlightTiles: [
      ...draft.preview.highlightTiles,
      ...draft.previewHighlightTiles
    ]
  });
}

function cloneBoardPlayerState(player: BoardPlayerState): BoardPlayerState {
  return {
    boardVisible: player.boardVisible,
    characterId: player.characterId,
    id: player.id,
    modifiers: cloneModifierIds(player.modifiers),
    position: clonePosition(player.position),
    spawnPosition: clonePosition(player.spawnPosition),
    tags: clonePlayerTags(player.tags),
    teamId: player.teamId,
    turnFlags: [...player.turnFlags]
  };
}

function cloneBoardSummonState(summon: BoardSummonState): BoardSummonState {
  return {
    instanceId: summon.instanceId,
    ownerId: summon.ownerId,
    position: clonePosition(summon.position),
    summonId: summon.summonId
  };
}

function cloneActor(actor: MovementActor): MovementActor {
  return {
    characterId: actor.characterId,
    id: actor.id,
    modifiers: cloneModifierIds(actor.modifiers),
    position: clonePosition(actor.position),
    spawnPosition: clonePosition(actor.spawnPosition),
    tags: clonePlayerTags(actor.tags),
    teamId: actor.teamId,
    turnFlags: [...actor.turnFlags]
  };
}

function toBoardPlayerState(actor: MovementActor, boardVisible = true): BoardPlayerState {
  return {
    boardVisible,
    characterId: actor.characterId,
    id: actor.id,
    modifiers: cloneModifierIds(actor.modifiers),
    position: clonePosition(actor.position),
    spawnPosition: clonePosition(actor.spawnPosition),
    tags: clonePlayerTags(actor.tags),
    teamId: actor.teamId,
    turnFlags: [...actor.turnFlags]
  };
}

function syncDraftActorPlayerEntry(draft: ResolutionDraft): void {
  const previous = draft.playersById.get(draft.actor.id);

  draft.playersById.set(
    draft.actor.id,
    toBoardPlayerState(draft.actor, previous?.boardVisible ?? true)
  );
}

export function createResolutionDraft(options: {
  actor: MovementActor;
  board: BoardDefinition;
  mode: GameMode;
  nextToolDieSeed: number;
  players: BoardPlayerState[];
  presentationToolId: ToolId;
  sourceId: string;
  summons: BoardSummonState[];
  tools: TurnToolSnapshot[];
}): ResolutionDraft {
  const draft: ResolutionDraft = {
    actor: cloneActor(options.actor),
    actorId: options.actor.id,
    board: options.board,
    mode: options.mode,
    nextToolDieSeed: options.nextToolDieSeed,
    nextEventOrdinal: 0,
    playersById: new Map(
      options.players.map((player) => [player.id, cloneBoardPlayerState(player)] as const)
    ),
    presentationEvents: [],
    presentationToolId: options.presentationToolId,
    previewHighlightTiles: [],
    sourceId: options.sourceId,
    summonMutations: [],
    summonsById: new Map(
      options.summons.map((summon) => [summon.instanceId, cloneBoardSummonState(summon)] as const)
    ),
    tileMutations: [],
    tools: [...options.tools],
    triggeredSummonEffects: [],
    triggeredTerrainEffects: [],
    affectedPlayers: []
  };

  syncDraftActorPlayerEntry(draft);
  return draft;
}

export function createDraftEventId(
  draft: ResolutionDraft,
  scope: string
): string {
  const eventId = `${draft.sourceId}:${scope}:${draft.nextEventOrdinal}`;
  draft.nextEventOrdinal += 1;
  return eventId;
}

export function createToolActionDraft(context: ToolActionContext): ToolActionDraft {
  return {
    ...createResolutionDraft({
      actor: context.actor,
      board: context.board,
      mode: context.mode,
      nextToolDieSeed: context.toolDieSeed,
      players: context.players,
      presentationToolId: context.activeTool.toolId,
      sourceId: context.activeTool.instanceId,
      summons: context.summons,
      tools: [...context.tools]
    }),
    actorMovement: null,
    endsTurn: false,
    kind: "blocked",
    path: [],
    phaseEffect: null,
    preview: createEmptyPreview(false),
    reason: "Tool did not resolve",
    summary: null
  };
}

export function getDraftPlayers(draft: ResolutionDraft): BoardPlayerState[] {
  return [...draft.playersById.values()].map(cloneBoardPlayerState);
}

export function getDraftSummons(draft: ResolutionDraft): BoardSummonState[] {
  return [...draft.summonsById.values()].map(cloneBoardSummonState);
}

export function setDraftToolInventory(
  draft: ResolutionDraft,
  tools: TurnToolSnapshot[]
): void {
  draft.tools = [...tools];
}

export function setDraftToolDieSeed(
  draft: ResolutionDraft,
  nextToolDieSeed: number
): void {
  draft.nextToolDieSeed = nextToolDieSeed;
}

export function applyResolvedActorStateToDraft(
  draft: ResolutionDraft,
  actor: Pick<MovementActor, "modifiers" | "position" | "tags" | "turnFlags">
): void {
  draft.actor.modifiers = cloneModifierIds(actor.modifiers);
  draft.actor.position = clonePosition(actor.position);
  draft.actor.tags = clonePlayerTags(actor.tags);
  draft.actor.turnFlags = [...actor.turnFlags];
  syncDraftActorPlayerEntry(draft);
}

export function setDraftActorTags(
  draft: ResolutionDraft,
  tags: MovementActor["tags"]
): void {
  draft.actor.tags = clonePlayerTags(tags);
  syncDraftActorPlayerEntry(draft);
}

export function setDraftActorTurnFlags(
  draft: ResolutionDraft,
  turnFlags: PlayerTurnFlag[]
): void {
  draft.actor.turnFlags = [...turnFlags];
  syncDraftActorPlayerEntry(draft);
}

export function setDraftActorPosition(
  draft: ResolutionDraft,
  position: GridPosition
): void {
  draft.actor.position = clonePosition(position);
  syncDraftActorPlayerEntry(draft);
}

export function appendDraftAffectedPlayerMove(
  draft: ResolutionDraft,
  affectedPlayer: AffectedPlayerMove
): void {
  const clonedMove: AffectedPlayerMove = {
    ...affectedPlayer,
    startPosition: clonePosition(affectedPlayer.startPosition),
    target: clonePosition(affectedPlayer.target),
    path: affectedPlayer.path.map(clonePosition)
  };

  if (affectedPlayer.modifiers) {
    clonedMove.modifiers = cloneModifierIds(affectedPlayer.modifiers);
  }

  if (affectedPlayer.tags) {
    clonedMove.tags = clonePlayerTags(affectedPlayer.tags);
  }

  if (affectedPlayer.turnFlags) {
    clonedMove.turnFlags = [...affectedPlayer.turnFlags];
  }

  draft.affectedPlayers.push(clonedMove);

  const playerEntry = draft.playersById.get(affectedPlayer.playerId);

  if (playerEntry) {
    playerEntry.position = clonePosition(affectedPlayer.target);

    if (affectedPlayer.modifiers) {
      playerEntry.modifiers = cloneModifierIds(affectedPlayer.modifiers);
    }

    if (affectedPlayer.tags) {
      playerEntry.tags = clonePlayerTags(affectedPlayer.tags);
    }

    if (affectedPlayer.turnFlags) {
      playerEntry.turnFlags = [...affectedPlayer.turnFlags];
    }

    if (affectedPlayer.boardVisible !== undefined) {
      playerEntry.boardVisible = affectedPlayer.boardVisible;
    }
  }

  if (affectedPlayer.playerId === draft.actorId) {
    draft.actor.position = clonePosition(affectedPlayer.target);

    if (affectedPlayer.modifiers) {
      draft.actor.modifiers = cloneModifierIds(affectedPlayer.modifiers);
    }

    if (affectedPlayer.tags) {
      draft.actor.tags = clonePlayerTags(affectedPlayer.tags);
    }

    if (affectedPlayer.turnFlags) {
      draft.actor.turnFlags = [...affectedPlayer.turnFlags];
    }

    if (affectedPlayer.boardVisible !== undefined) {
      setDraftPlayerVisibility(draft, affectedPlayer.playerId, affectedPlayer.boardVisible);
    } else {
      syncDraftActorPlayerEntry(draft);
    }
  }
}

export function applyResolvedPlayerStateToDraft(
  draft: ResolutionDraft,
  player: Pick<MovementActor, "characterId" | "id" | "modifiers" | "position" | "spawnPosition" | "tags" | "teamId" | "turnFlags">
): void {
  if (player.id === draft.actorId) {
    draft.actor.characterId = player.characterId;
    draft.actor.modifiers = cloneModifierIds(player.modifiers);
    draft.actor.position = clonePosition(player.position);
    draft.actor.spawnPosition = clonePosition(player.spawnPosition);
    draft.actor.tags = clonePlayerTags(player.tags);
    draft.actor.teamId = player.teamId;
    draft.actor.turnFlags = [...player.turnFlags];
    syncDraftActorPlayerEntry(draft);
    return;
  }

  const playerEntry = draft.playersById.get(player.id);

  if (!playerEntry) {
    return;
  }

  playerEntry.characterId = player.characterId;
  playerEntry.modifiers = cloneModifierIds(player.modifiers);
  playerEntry.position = clonePosition(player.position);
  playerEntry.spawnPosition = clonePosition(player.spawnPosition);
  playerEntry.tags = clonePlayerTags(player.tags);
  playerEntry.teamId = player.teamId;
  playerEntry.turnFlags = [...player.turnFlags];
}

export function setDraftPlayerVisibility(
  draft: ResolutionDraft,
  playerId: string,
  boardVisible: boolean
): void {
  if (playerId === draft.actorId) {
    draft.playersById.set(playerId, toBoardPlayerState(draft.actor, boardVisible));
    return;
  }

  const playerEntry = draft.playersById.get(playerId);

  if (!playerEntry) {
    return;
  }

  playerEntry.boardVisible = boardVisible;
}

export function appendDraftPresentationEvents(
  draft: ResolutionDraft,
  events: ActionPresentationEvent[]
): void {
  if (!events.length) {
    return;
  }

  draft.presentationEvents.push(...events);
}

export function markDraftPresentation(draft: ResolutionDraft): number {
  return draft.presentationEvents.length;
}

export function consumeDraftPresentationFrom(
  draft: ResolutionDraft,
  mark: number
): ActionPresentationEvent[] {
  const events = draft.presentationEvents.slice(mark);
  draft.presentationEvents = draft.presentationEvents.slice(0, mark);
  return events;
}

export function setDraftPresentationToolId(
  draft: ResolutionDraft,
  toolId: ToolId
): void {
  draft.presentationToolId = toolId;
}

export function appendDraftTileMutations(
  draft: ResolutionDraft,
  tileMutations: TileMutation[]
): void {
  if (!tileMutations.length) {
    return;
  }

  draft.tileMutations.push(...tileMutations);
}

export function appendDraftSummonMutations(
  draft: ResolutionDraft,
  summonMutations: SummonMutation[]
): void {
  for (const summonMutation of summonMutations) {
    draft.summonMutations.push(summonMutation);

    if (summonMutation.kind === "remove") {
      draft.summonsById.delete(summonMutation.instanceId);
      continue;
    }

    draft.summonsById.set(summonMutation.instanceId, {
      instanceId: summonMutation.instanceId,
      ownerId: summonMutation.ownerId,
      position: clonePosition(summonMutation.position),
      summonId: summonMutation.summonId
    });
  }
}

export function appendDraftTriggeredTerrainEffects(
  draft: ResolutionDraft,
  triggeredTerrainEffects: TriggeredTerrainEffect[]
): void {
  if (!triggeredTerrainEffects.length) {
    return;
  }

  draft.triggeredTerrainEffects.push(...triggeredTerrainEffects);
}

export function appendDraftTriggeredSummonEffects(
  draft: ResolutionDraft,
  triggeredSummonEffects: TriggeredSummonEffect[]
): void {
  if (!triggeredSummonEffects.length) {
    return;
  }

  draft.triggeredSummonEffects.push(...triggeredSummonEffects);
}

export function appendDraftPreviewHighlightTiles(
  draft: ResolutionDraft,
  highlightTiles: GridPosition[]
): void {
  for (const position of highlightTiles) {
    appendUniquePosition(draft.previewHighlightTiles, position);
  }
}

export function setDraftBlocked(
  draft: ToolActionDraft,
  reason: string,
  options: {
    path?: GridPosition[];
    preview?: PreviewDescriptor;
  } = {}
): void {
  draft.kind = "blocked";
  draft.reason = reason;
  draft.path = options.path ? options.path.map(clonePosition) : [];

  if (options.preview) {
    draft.preview = options.preview;
  }
}

export function setDraftApplied(
  draft: ToolActionDraft,
  summary: string,
  options: {
    actorMovement?: ResolvedPlayerMovement | null;
    endsTurn?: boolean;
    path?: GridPosition[];
    phaseEffect?: ActionPhaseEffect | null;
    preview?: PreviewDescriptor;
  } = {}
): void {
  draft.kind = "applied";
  draft.reason = null;
  draft.summary = summary;
  draft.path = options.path ? options.path.map(clonePosition) : draft.path;
  draft.actorMovement = options.actorMovement ?? draft.actorMovement;
  draft.endsTurn = options.endsTurn ?? draft.endsTurn;
  draft.phaseEffect = options.phaseEffect ?? draft.phaseEffect;

  if (options.preview) {
    draft.preview = options.preview;
  }
}

export function setDraftActionPresentation(
  draft: ToolActionDraft,
  presentation: ActionPresentation | null
): void {
  draft.presentationEvents = presentation?.events ? [...presentation.events] : [];
}

export function finalizeToolActionDraft(draft: ToolActionDraft): ActionResolution {
  const presentation =
    draft.presentationEvents.length
      ? createPresentation(draft.actorId, draft.presentationToolId, draft.presentationEvents)
      : null;
  const preview = finalizeDraftPreview(draft);

  if (draft.kind === "blocked") {
    return {
      actor: {
        boardVisible: draft.playersById.get(draft.actorId)?.boardVisible ?? true,
        modifiers: cloneModifierIds(draft.actor.modifiers),
        position: clonePosition(draft.actor.position),
        tags: clonePlayerTags(draft.actor.tags),
        turnFlags: [...draft.actor.turnFlags]
      },
      actorMovement: null,
      affectedPlayers: draft.affectedPlayers,
      endsTurn: false,
      kind: "blocked",
      nextToolDieSeed: draft.nextToolDieSeed,
      path: draft.path.map(clonePosition),
      phaseEffect: null,
      presentation,
      preview,
      reason: draft.reason ?? "Tool did not resolve",
      summonMutations: draft.summonMutations,
      tileMutations: draft.tileMutations,
      tools: draft.tools,
      triggeredSummonEffects: draft.triggeredSummonEffects,
      triggeredTerrainEffects: draft.triggeredTerrainEffects
    };
  }

  return {
    actor: {
      boardVisible: draft.playersById.get(draft.actorId)?.boardVisible ?? true,
      modifiers: cloneModifierIds(draft.actor.modifiers),
      position: clonePosition(draft.actor.position),
      tags: clonePlayerTags(draft.actor.tags),
      turnFlags: [...draft.actor.turnFlags]
    },
    actorMovement: draft.actorMovement,
    affectedPlayers: draft.affectedPlayers,
    endsTurn: draft.endsTurn,
    kind: "applied",
    nextToolDieSeed: draft.nextToolDieSeed,
    path: draft.path.map(clonePosition),
    phaseEffect: draft.phaseEffect,
    presentation,
    preview,
    summary: draft.summary ?? "Tool resolved.",
    summonMutations: draft.summonMutations,
    tileMutations: draft.tileMutations,
    tools: draft.tools,
    triggeredSummonEffects: draft.triggeredSummonEffects,
    triggeredTerrainEffects: draft.triggeredTerrainEffects
  };
}

export function createTurnStartResolutionDraft(
  snapshot: GameSnapshot,
  actor: MovementActor,
  sourceId: string,
  toolDieSeed: number,
  tools: TurnToolSnapshot[],
  presentationToolId: ToolId = "movement"
): ResolutionDraft {
  return createResolutionDraft({
    actor,
    board: {
      width: snapshot.boardWidth,
      height: snapshot.boardHeight,
      tiles: snapshot.tiles.map((tile) => ({
        ...tile,
        direction: tile.direction,
        faction: tile.faction
      }))
    },
    mode: snapshot.mode,
    nextToolDieSeed: toolDieSeed,
    players: snapshot.players
      .filter((player) => player.boardVisible)
      .map((player) => ({
        boardVisible: player.boardVisible,
        characterId: player.characterId,
        id: player.id,
        modifiers: cloneModifierIds(player.modifiers),
        position: clonePosition(player.position),
        spawnPosition: clonePosition(player.spawnPosition),
        tags: clonePlayerTags(player.tags),
        teamId: player.teamId,
        turnFlags: [...player.turnFlags]
      })),
    presentationToolId,
    sourceId,
    summons: snapshot.summons.map((summon) => ({
      instanceId: summon.instanceId,
      ownerId: summon.ownerId,
      position: clonePosition(summon.position),
      summonId: summon.summonId
    })),
    tools
  });
}
