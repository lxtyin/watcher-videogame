import { IMPACT_RECOIL_CONTACT_PROGRESS } from "@watcher/shared";
import type {
  ActionPresentationEvent,
  Direction,
  GameSnapshot,
  GridPosition,
  PlayerSnapshot,
  PresentationAnchor,
  PresentationEffectMetadata,
  PlayerStateTransition,
  PresentationEffectType,
  PresentationLinkProgressStyle,
  PresentationLinkStyle,
  PresentationMotionStyle,
  PresentationProjectileType,
  SequencedActionPresentation,
  SummonSnapshot,
  SummonStateTransition,
  TileDefinition,
  TileStateTransition
} from "@watcher/shared";

interface SampledGridPosition {
  facing: Direction | null;
  lift: number;
  x: number;
  y: number;
}

export interface ActivePlayerMotionPlayback {
  motionStyle: PresentationMotionStyle;
  playerId: string;
  position: SampledGridPosition;
  progress: number;
}

export interface ActiveSummonMotionPlayback {
  motionStyle: PresentationMotionStyle;
  position: SampledGridPosition;
  progress: number;
  summonInstanceId: string;
}

export interface ActiveProjectilePlayback {
  eventId: string;
  ownerId: string | null;
  position: SampledGridPosition;
  projectileType: PresentationProjectileType;
  progress: number;
}

export interface ActiveEffectReactionPlayback {
  effectType: PresentationEffectType;
  eventId: string;
  kind: "effect";
  metadata?: PresentationEffectMetadata;
  position: GridPosition;
  progress: number;
  tiles: GridPosition[];
}

export interface ActivePlayerLiftReactionPlayback {
  eventId: string;
  height: number;
  kind: "player_lift";
  playerId: string;
  progress: number;
}

export interface ActiveNumberPopupReactionPlayback {
  eventId: string;
  kind: "number_popup";
  position: GridPosition;
  progress: number;
  value: number;
}

export interface ActiveLinkReactionPlayback {
  eventId: string;
  from: PresentationAnchor;
  kind: "link";
  progress: number;
  progressStyle: PresentationLinkProgressStyle;
  style: PresentationLinkStyle;
  to: PresentationAnchor;
}

export type ActiveReactionPlayback =
  | ActiveEffectReactionPlayback
  | ActiveLinkReactionPlayback
  | ActiveNumberPopupReactionPlayback
  | ActivePlayerLiftReactionPlayback;

interface PendingStateTransitionPlayback {
  eventId: string;
  playerTransitions: PlayerStateTransition[];
  sequence: number;
  startMs: number;
  summonTransitions: SummonStateTransition[];
  tileTransitions: TileStateTransition[];
}

export interface PlaybackEngineState {
  activeElapsedMs: number;
  displayedPlayerPositions: Record<string, GridPosition>;
  displayedPlayers: PlayerSnapshot[];
  displayedSummons: SummonSnapshot[];
  displayedTiles: TileDefinition[];
  playerMotions: Record<string, ActivePlayerMotionPlayback>;
  projectiles: ActiveProjectilePlayback[];
  reactions: ActiveReactionPlayback[];
  summonMotions: Record<string, ActiveSummonMotionPlayback>;
}

export interface PlaybackEngineInput {
  activeActionPresentation: SequencedActionPresentation | null;
  activeActionPresentationStartedAtMs: number | null;
  actionPresentationQueue: SequencedActionPresentation[];
  simulationTimeMs: number;
  snapshot: GameSnapshot | null;
}

function clampProgress(progress: number): number {
  return Math.max(0, Math.min(1, progress));
}

function clonePosition(position: GridPosition): GridPosition {
  return {
    x: position.x,
    y: position.y
  };
}

function clonePlayer(player: PlayerSnapshot): PlayerSnapshot {
  return {
    ...player,
    modifiers: [...player.modifiers],
    position: clonePosition(player.position),
    spawnPosition: clonePosition(player.spawnPosition),
    tags: { ...player.tags },
    tools: player.tools.map((tool) => ({
      ...tool,
      params: { ...tool.params }
    })),
    turnFlags: [...player.turnFlags]
  };
}

function cloneSummon(summon: SummonSnapshot): SummonSnapshot {
  return {
    ...summon,
    position: clonePosition(summon.position),
    state: { ...summon.state }
  };
}

function cloneTile(tile: TileDefinition): TileDefinition {
  return {
    ...tile,
    state: { ...(tile.state ?? {}) }
  };
}

function getFacingBetweenPoints(from: GridPosition, to: GridPosition): Direction | null {
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;

  if (Math.abs(deltaX) >= Math.abs(deltaY) && deltaX !== 0) {
    return deltaX > 0 ? "right" : "left";
  }

  if (deltaY !== 0) {
    return deltaY > 0 ? "down" : "up";
  }

  return null;
}

function sampleGridPath(
  positions: GridPosition[],
  progress: number,
  liftHeight = 0
): SampledGridPosition {
  if (positions.length === 0) {
    return {
      x: 0,
      y: 0,
      lift: 0,
      facing: null
    };
  }

  if (positions.length === 1) {
    return {
      x: positions[0]!.x,
      y: positions[0]!.y,
      lift: 0,
      facing: null
    };
  }

  const normalizedProgress = clampProgress(progress);
  const segmentProgress = normalizedProgress * (positions.length - 1);
  const segmentIndex = Math.min(positions.length - 2, Math.floor(segmentProgress));
  const localProgress = segmentProgress - segmentIndex;
  const from = positions[segmentIndex]!;
  const to = positions[segmentIndex + 1]!;

  return {
    x: from.x + (to.x - from.x) * localProgress,
    y: from.y + (to.y - from.y) * localProgress,
    lift: Math.sin(normalizedProgress * Math.PI) * liftHeight,
    facing: getFacingBetweenPoints(from, to)
  };
}

function easeOutCubic(value: number): number {
  const normalizedValue = clampProgress(value);
  return 1 - (1 - normalizedValue) ** 3;
}

function lerpNumber(from: number, to: number, progress: number): number {
  return from + (to - from) * progress;
}

function sampleImpactRecoilPath(positions: GridPosition[], progress: number): SampledGridPosition {
  if (positions.length < 3) {
    return sampleGridPath(positions, progress);
  }

  const normalizedProgress = clampProgress(progress);
  const start = positions[0]!;
  const contact = positions[1]!;
  const end = positions[positions.length - 1]!;
  const facing = getFacingBetweenPoints(start, contact);

  if (normalizedProgress <= IMPACT_RECOIL_CONTACT_PROGRESS) {
    const localProgress = easeOutCubic(normalizedProgress / IMPACT_RECOIL_CONTACT_PROGRESS);
    return {
      x: lerpNumber(start.x, contact.x, localProgress),
      y: lerpNumber(start.y, contact.y, localProgress),
      lift: 0,
      facing
    };
  }

  const returnProgress = easeOutCubic(
    (normalizedProgress - IMPACT_RECOIL_CONTACT_PROGRESS) / (1 - IMPACT_RECOIL_CONTACT_PROGRESS)
  );

  return {
    x: lerpNumber(contact.x, end.x, returnProgress),
    y: lerpNumber(contact.y, end.y, returnProgress),
    lift: 0,
    facing
  };
}

function isEventActive(event: ActionPresentationEvent, elapsedMs: number): boolean {
  return elapsedMs >= event.startMs && elapsedMs <= event.startMs + event.durationMs;
}

function getEventProgress(event: ActionPresentationEvent, elapsedMs: number): number {
  if (event.durationMs <= 0) {
    return 1;
  }

  return clampProgress((elapsedMs - event.startMs) / event.durationMs);
}

function getProjectileLiftHeight(projectileType: PresentationProjectileType): number {
  switch (projectileType) {
    case "rocket":
      return 0.18;
    case "basketball":
      return 0.08;
    case "awm_bullet":
      return 0.05;
  }
}

function getMotionLiftHeight(
  motionStyle: PresentationMotionStyle,
  positionCount: number
): number {
  if (motionStyle === "arc") {
    return 0.7 + Math.max(0, positionCount - 2) * 0.08;
  }

  if (motionStyle === "finish") {
    return 1.75;
  }

  return 0;
}

function sampleMotionPath(
  motionStyle: PresentationMotionStyle,
  positions: GridPosition[],
  progress: number
): SampledGridPosition {
  return motionStyle === "impact_recoil"
    ? sampleImpactRecoilPath(positions, progress)
    : sampleGridPath(positions, progress, getMotionLiftHeight(motionStyle, positions.length));
}

function evaluateEventPlayback(
  presentation: SequencedActionPresentation | null,
  elapsedMs: number
): Pick<PlaybackEngineState, "playerMotions" | "projectiles" | "reactions" | "summonMotions"> {
  if (!presentation) {
    return {
      playerMotions: {},
      projectiles: [],
      reactions: [],
      summonMotions: {}
    };
  }

  const playerMotions: Record<string, ActivePlayerMotionPlayback> = {};
  const projectiles: ActiveProjectilePlayback[] = [];
  const reactions: ActiveReactionPlayback[] = [];
  const summonMotions: Record<string, ActiveSummonMotionPlayback> = {};

  for (const event of presentation.events) {
    if (!isEventActive(event, elapsedMs)) {
      continue;
    }

    const progress = getEventProgress(event, elapsedMs);

    if (event.kind === "motion" && event.subject.kind === "player") {
      playerMotions[event.subject.playerId] = {
        playerId: event.subject.playerId,
        motionStyle: event.subject.motionStyle,
        progress,
        position: sampleMotionPath(event.subject.motionStyle, event.positions, progress)
      };
      continue;
    }

    if (event.kind === "motion" && event.subject.kind === "summon") {
      summonMotions[event.subject.summonInstanceId] = {
        summonInstanceId: event.subject.summonInstanceId,
        motionStyle: event.subject.motionStyle,
        progress,
        position: sampleMotionPath(event.subject.motionStyle, event.positions, progress)
      };
      continue;
    }

    if (event.kind === "motion" && event.subject.kind === "projectile") {
      projectiles.push({
        eventId: event.id,
        ownerId: event.subject.ownerId,
        projectileType: event.subject.projectileType,
        progress,
        position: sampleGridPath(
          event.positions,
          progress,
          getProjectileLiftHeight(event.subject.projectileType)
        )
      });
      continue;
    }

    if (event.kind !== "reaction") {
      continue;
    }

    if (event.reaction.kind === "effect") {
      reactions.push({
        eventId: event.id,
        effectType: event.reaction.effectType,
        kind: "effect",
        ...(event.reaction.metadata === undefined ? {} : { metadata: event.reaction.metadata }),
        position: event.reaction.position,
        progress,
        tiles: event.reaction.tiles
      });
      continue;
    }

    if (event.reaction.kind === "number_popup") {
      reactions.push({
        eventId: event.id,
        kind: "number_popup",
        position: event.reaction.position,
        progress,
        value: event.reaction.value
      });
      continue;
    }

    if (event.reaction.kind === "link") {
      reactions.push({
        eventId: event.id,
        from: event.reaction.from,
        kind: "link",
        progress,
        progressStyle: event.reaction.progressStyle,
        style: event.reaction.style,
        to: event.reaction.to
      });
      continue;
    }

    reactions.push({
      eventId: event.id,
      height: event.reaction.height,
      kind: "player_lift",
      playerId: event.reaction.playerId,
      progress
    });
  }

  return {
    playerMotions,
    projectiles,
    reactions,
    summonMotions
  };
}

function getActionPresentationElapsedMs(
  presentation: SequencedActionPresentation | null,
  startedAtMs: number | null,
  simulationTimeMs: number
): number {
  if (!presentation || startedAtMs === null) {
    return 0;
  }

  return Math.max(0, simulationTimeMs - startedAtMs);
}

function collectPendingOriginsFromPresentation(
  pendingOrigins: Record<string, GridPosition>,
  presentation: SequencedActionPresentation | null,
  elapsedMs: number
): void {
  if (!presentation) {
    return;
  }

  for (const event of presentation.events) {
    if (
      event.kind !== "motion" ||
      event.subject.kind !== "player" ||
      event.subject.playerId in pendingOrigins
    ) {
      continue;
    }

    if (event.startMs <= elapsedMs) {
      continue;
    }

    pendingOrigins[event.subject.playerId] = clonePosition(event.positions[0]!);
  }
}

function collectPendingPlayerOrigins(
  activePresentation: SequencedActionPresentation | null,
  activeElapsedMs: number,
  queuedPresentations: SequencedActionPresentation[]
): Record<string, GridPosition> {
  const pendingOrigins: Record<string, GridPosition> = {};

  collectPendingOriginsFromPresentation(pendingOrigins, activePresentation, activeElapsedMs);

  for (const presentation of queuedPresentations) {
    collectPendingOriginsFromPresentation(pendingOrigins, presentation, -1);
  }

  return pendingOrigins;
}

function collectPendingStateTransitionsFromPresentation(
  pendingTransitions: PendingStateTransitionPlayback[],
  presentation: SequencedActionPresentation | null,
  elapsedMs: number
): void {
  if (!presentation) {
    return;
  }

  for (const event of presentation.events) {
    if (event.kind !== "state_transition" || event.startMs <= elapsedMs) {
      continue;
    }

    pendingTransitions.push({
      eventId: event.id,
      playerTransitions: event.playerTransitions ?? [],
      sequence: presentation.sequence,
      startMs: event.startMs,
      summonTransitions: event.summonTransitions,
      tileTransitions: event.tileTransitions
    });
  }
}

function collectPendingStateTransitions(
  activePresentation: SequencedActionPresentation | null,
  activeElapsedMs: number,
  queuedPresentations: SequencedActionPresentation[]
): PendingStateTransitionPlayback[] {
  const pendingTransitions: PendingStateTransitionPlayback[] = [];

  collectPendingStateTransitionsFromPresentation(
    pendingTransitions,
    activePresentation,
    activeElapsedMs
  );

  for (const presentation of queuedPresentations) {
    collectPendingStateTransitionsFromPresentation(pendingTransitions, presentation, -1);
  }

  return pendingTransitions.sort(
    (left, right) =>
      right.sequence - left.sequence ||
      right.startMs - left.startMs ||
      right.eventId.localeCompare(left.eventId)
  );
}

function resolveDisplayedTiles(
  snapshot: GameSnapshot,
  pendingTransitions: PendingStateTransitionPlayback[]
): TileDefinition[] {
  const tilesByKey = new Map(snapshot.tiles.map((tile) => [tile.key, cloneTile(tile)] as const));

  for (const transition of pendingTransitions) {
    for (const tileTransition of transition.tileTransitions) {
      const currentTile = tilesByKey.get(tileTransition.key);

      if (!currentTile) {
        continue;
      }

      tilesByKey.set(tileTransition.key, {
        ...currentTile,
        type: tileTransition.before.type,
        durability: tileTransition.before.durability,
        direction: tileTransition.before.direction,
        faction: tileTransition.before.faction,
        state: { ...(tileTransition.before.state ?? {}) }
      });
    }
  }

  return [...tilesByKey.values()];
}

function resolveDisplayedSummons(
  snapshot: GameSnapshot,
  pendingTransitions: PendingStateTransitionPlayback[]
): SummonSnapshot[] {
  const summonsById = new Map(
    snapshot.summons.map((summon) => [summon.instanceId, cloneSummon(summon)] as const)
  );

  for (const transition of pendingTransitions) {
    for (const summonTransition of transition.summonTransitions) {
      if (summonTransition.before && !summonTransition.after) {
        summonsById.set(summonTransition.instanceId, cloneSummon(summonTransition.before));
        continue;
      }

      if (!summonTransition.before && summonTransition.after) {
        summonsById.delete(summonTransition.instanceId);
        continue;
      }

      if (summonTransition.before) {
        summonsById.set(summonTransition.instanceId, cloneSummon(summonTransition.before));
      }
    }
  }

  return [...summonsById.values()];
}

function resolveDisplayedPlayers(
  snapshot: GameSnapshot,
  pendingTransitions: PendingStateTransitionPlayback[]
): PlayerSnapshot[] {
  const playersById = new Map(
    snapshot.players.map((player) => [player.id, clonePlayer(player)] as const)
  );

  for (const transition of pendingTransitions) {
    for (const playerTransition of transition.playerTransitions) {
      const currentPlayer = playersById.get(playerTransition.playerId);

      if (!currentPlayer) {
        continue;
      }

      playersById.set(playerTransition.playerId, {
        ...currentPlayer,
        boardVisible: playerTransition.before.boardVisible
      });
    }
  }

  return [...playersById.values()];
}

export function evaluatePlaybackEngine(
  input: PlaybackEngineInput
): PlaybackEngineState {
  if (!input.snapshot) {
    return {
      activeElapsedMs: 0,
      displayedPlayerPositions: {},
      displayedPlayers: [],
      displayedSummons: [],
      displayedTiles: [],
      playerMotions: {},
      projectiles: [],
      reactions: [],
      summonMotions: {}
    };
  }

  const activeElapsedMs = getActionPresentationElapsedMs(
    input.activeActionPresentation,
    input.activeActionPresentationStartedAtMs,
    input.simulationTimeMs
  );
  const eventPlayback = evaluateEventPlayback(input.activeActionPresentation, activeElapsedMs);
  const pendingStateTransitions = collectPendingStateTransitions(
    input.activeActionPresentation,
    activeElapsedMs,
    input.actionPresentationQueue
  );
  const pendingPlayerOrigins = collectPendingPlayerOrigins(
    input.activeActionPresentation,
    activeElapsedMs,
    input.actionPresentationQueue
  );
  const displayedPlayers = resolveDisplayedPlayers(input.snapshot, pendingStateTransitions);
  const displayedPlayerPositions = Object.fromEntries(
    input.snapshot.players.map((player) => {
      const activeMotion = eventPlayback.playerMotions[player.id];

      if (activeMotion) {
        return [
          player.id,
          {
            x: activeMotion.position.x,
            y: activeMotion.position.y
          }
        ] as const;
      }

      return [
        player.id,
        pendingPlayerOrigins[player.id] ?? clonePosition(player.position)
      ] as const;
    })
  );

  const displayedSummons = resolveDisplayedSummons(input.snapshot, pendingStateTransitions).map((summon) => {
    const activeMotion = eventPlayback.summonMotions[summon.instanceId];

    if (!activeMotion) {
      return summon;
    }

    return {
      ...summon,
      position: {
        x: activeMotion.position.x,
        y: activeMotion.position.y
      }
    };
  });

  return {
    activeElapsedMs,
    displayedPlayerPositions,
    displayedPlayers,
    displayedSummons,
    displayedTiles: resolveDisplayedTiles(input.snapshot, pendingStateTransitions),
    playerMotions: eventPlayback.playerMotions,
    projectiles: eventPlayback.projectiles,
    reactions: eventPlayback.reactions,
    summonMotions: eventPlayback.summonMotions
  };
}
