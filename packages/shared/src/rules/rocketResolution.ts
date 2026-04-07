import type {
  AffectedPlayerMove,
  ActionPresentationEvent,
  BoardDefinition,
  BoardPlayerState,
  BoardSummonState,
  Direction,
  GridPosition,
  SummonMutation,
  TileMutation,
  TriggeredSummonEffect,
  TriggeredTerrainEffect,
  TurnToolSnapshot
} from "../types";
import {
  buildMotionPositions,
  createEffectEvent,
  createPlayerMotionEvent,
  createProjectileEvent,
  offsetPresentationEvents,
  ROCKET_BLAST_DELAY_MS
} from "./actionPresentation";
import { createMovementDescriptor } from "./displacement";
import { resolveLeapDisplacement, resolveLinearDisplacement } from "./movementSystem";
import {
  CARDINAL_DIRECTIONS,
  collectExplosionPreviewTiles,
  findPlayersAtPosition,
  getOppositeDirection,
  stepPosition,
  traceProjectileFromPosition
} from "./spatial";

export interface RocketResolutionEnvironment {
  actorId: string;
  board: BoardDefinition;
  players: BoardPlayerState[];
  sourceId: string;
  summons: BoardSummonState[];
}

export interface RocketResolutionSpec {
  blastLeapDistance: number;
  direction: Direction;
  eventIdPrefix: string;
  originPosition: GridPosition;
  projectileOwnerId: string | null;
  projectileRange: number;
  splashPushDistance: number;
  tagBase: string;
}

export interface MutableRocketResolutionDraft {
  affectedPlayers: AffectedPlayerMove[];
  nextToolDieSeed: number;
  presentationEvents: ActionPresentationEvent[];
  summonMutations: SummonMutation[];
  tileMutations: TileMutation[];
  tools: TurnToolSnapshot[];
  triggeredSummonEffects: TriggeredSummonEffect[];
  triggeredTerrainEffects: TriggeredTerrainEffect[];
}

export interface RocketResolutionResult {
  effectTiles: GridPosition[];
  explosionPosition: GridPosition | null;
  path: GridPosition[];
}

function clonePosition(position: GridPosition): GridPosition {
  return {
    x: position.x,
    y: position.y
  };
}

function createMovementSubject(player: BoardPlayerState) {
  return {
    characterId: player.characterId,
    id: player.id,
    modifiers: [...player.modifiers],
    position: clonePosition(player.position),
    spawnPosition: clonePosition(player.spawnPosition),
    tags: { ...player.tags },
    turnFlags: [...player.turnFlags]
  };
}

function createAffectedPlayerMove(
  player: BoardPlayerState,
  movement: ReturnType<typeof createMovementDescriptor>,
  resolution: ReturnType<typeof resolveLinearDisplacement> | ReturnType<typeof resolveLeapDisplacement>,
  reason: string
): AffectedPlayerMove {
  return {
    movement,
    path: resolution.path,
    playerId: player.id,
    reason,
    startPosition: player.position,
    modifiers: resolution.actor.modifiers,
    target: resolution.actor.position,
    tags: resolution.actor.tags,
    turnFlags: resolution.actor.turnFlags
  };
}

function appendMovementResolution(
  draft: MutableRocketResolutionDraft,
  resolution: ReturnType<typeof resolveLinearDisplacement> | ReturnType<typeof resolveLeapDisplacement>,
  startMsOffset = 0
): void {
  draft.nextToolDieSeed = resolution.nextToolDieSeed;
  draft.tools = resolution.tools;
  draft.tileMutations.push(...resolution.tileMutations);
  draft.summonMutations.push(...resolution.summonMutations);
  draft.triggeredTerrainEffects.push(...resolution.triggeredTerrainEffects);
  draft.triggeredSummonEffects.push(...resolution.triggeredSummonEffects);
  draft.affectedPlayers.push(...resolution.affectedPlayers);
  draft.presentationEvents.push(...offsetPresentationEvents(resolution.presentationEvents, startMsOffset));
}

export function createRocketResolutionDraft(
  tools: TurnToolSnapshot[],
  toolDieSeed: number
): MutableRocketResolutionDraft {
  return {
    affectedPlayers: [],
    nextToolDieSeed: toolDieSeed,
    presentationEvents: [],
    summonMutations: [],
    tileMutations: [],
    tools,
    triggeredSummonEffects: [],
    triggeredTerrainEffects: []
  };
}

export function resolveRocketIntoDraft(
  environment: RocketResolutionEnvironment,
  spec: RocketResolutionSpec,
  draft: MutableRocketResolutionDraft
): RocketResolutionResult {
  const blastMovement = createMovementDescriptor("leap", "passive", {
    tags: [spec.tagBase, "rocket:blast"],
    timing: "out_of_turn"
  });
  const splashMovement = createMovementDescriptor("translate", "passive", {
    tags: [spec.tagBase, "rocket:splash"],
    timing: "out_of_turn"
  });
  const trace = traceProjectileFromPosition(
    {
      board: environment.board,
      players: environment.players
    },
    spec.originPosition,
    spec.direction,
    spec.projectileRange,
    0
  );
  const explosionPosition =
    trace.collision.kind === "player"
      ? trace.collision.position
      : trace.collision.kind === "solid"
        ? trace.collision.previousPosition
        : trace.path[trace.path.length - 1] ?? null;
  const centerLeapDirection =
    trace.collision.kind === "player"
      ? trace.collision.direction
      : getOppositeDirection(trace.collision.direction);

  if (!explosionPosition) {
    return {
      effectTiles: [],
      explosionPosition: null,
      path: trace.path
    };
  }

  const projectileEvent = createProjectileEvent(
    `${spec.eventIdPrefix}:projectile`,
    spec.projectileOwnerId,
    "rocket",
    buildMotionPositions(spec.originPosition, trace.path)
  );
  const explosionStartMs = projectileEvent ? projectileEvent.startMs + projectileEvent.durationMs : 0;

  if (projectileEvent) {
    draft.presentationEvents.push(projectileEvent);
  }

  const centerPlayers =
    trace.collision.kind === "player"
      ? trace.collision.players
      : findPlayersAtPosition(environment.players, explosionPosition, []);

  centerPlayers.forEach((hitPlayer, index) => {
    const leapResolution = resolveLeapDisplacement(
      {
        activeTool: null,
        actorId: environment.actorId,
        board: environment.board,
        players: environment.players,
        sourceId: environment.sourceId,
        summons: environment.summons
      },
      {
        direction: centerLeapDirection,
        maxDistance: spec.blastLeapDistance,
        movement: blastMovement,
        player: createMovementSubject(hitPlayer),
        priorSummonMutations: draft.summonMutations,
        priorTileMutations: draft.tileMutations,
        toolDieSeed: draft.nextToolDieSeed,
        tools: draft.tools
      }
    );

    if (!leapResolution.path.length) {
      return;
    }

    const motionEvent = createPlayerMotionEvent(
      `${spec.eventIdPrefix}:blast-${index}`,
      hitPlayer.id,
      buildMotionPositions(hitPlayer.position, leapResolution.path),
      "arc",
      explosionStartMs + ROCKET_BLAST_DELAY_MS
    );

    draft.affectedPlayers.push(
      createAffectedPlayerMove(hitPlayer, blastMovement, leapResolution, "rocket_blast")
    );
    appendMovementResolution(
      draft,
      leapResolution,
      (motionEvent?.startMs ?? explosionStartMs + ROCKET_BLAST_DELAY_MS) + (motionEvent?.durationMs ?? 0)
    );

    if (motionEvent) {
      draft.presentationEvents.push(motionEvent);
    }
  });

  for (const splashDirection of CARDINAL_DIRECTIONS) {
    const splashPosition = stepPosition(explosionPosition, splashDirection);
    const splashPlayers = findPlayersAtPosition(
      environment.players,
      splashPosition,
      centerPlayers.map((player) => player.id)
    );

    for (const splashPlayer of splashPlayers) {
      const pushResolution = resolveLinearDisplacement(
        {
          activeTool: null,
          actorId: environment.actorId,
          board: environment.board,
          players: environment.players,
          sourceId: environment.sourceId,
          summons: environment.summons
        },
        {
          direction: splashDirection,
          maxSteps: spec.splashPushDistance,
          movePoints: spec.splashPushDistance,
          movement: splashMovement,
          player: createMovementSubject(splashPlayer),
          priorSummonMutations: draft.summonMutations,
          priorTileMutations: draft.tileMutations,
          toolDieSeed: draft.nextToolDieSeed,
          tools: draft.tools
        }
      );

      if (!pushResolution.path.length) {
        continue;
      }

      const motionEvent = createPlayerMotionEvent(
        `${spec.eventIdPrefix}:splash-${splashPlayer.id}-${splashDirection}`,
        splashPlayer.id,
        buildMotionPositions(splashPlayer.position, pushResolution.path),
        "ground",
        explosionStartMs + ROCKET_BLAST_DELAY_MS
      );

      draft.affectedPlayers.push(
        createAffectedPlayerMove(splashPlayer, splashMovement, pushResolution, "rocket_splash")
      );
      appendMovementResolution(
        draft,
        pushResolution,
        (motionEvent?.startMs ?? explosionStartMs + ROCKET_BLAST_DELAY_MS) + (motionEvent?.durationMs ?? 0)
      );

      if (motionEvent) {
        draft.presentationEvents.push(motionEvent);
      }
    }
  }

  const effectTiles = collectExplosionPreviewTiles(environment.board, explosionPosition);
  draft.presentationEvents.push(
    createEffectEvent(
      `${spec.eventIdPrefix}:explosion`,
      "rocket_explosion",
      explosionPosition,
      effectTiles,
      explosionStartMs
    )
  );

  return {
    effectTiles,
    explosionPosition,
    path: trace.path
  };
}
