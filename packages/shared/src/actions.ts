import { getTile, isWithinBoard, toTileKey } from "./board";
import {
  applyPassThroughSummonEffects,
  createSummonUpsertMutation,
  hasSummonAtPosition
} from "./summons";
import { applyStopTerrainEffects, resolvePassThroughTerrainEffect } from "./terrain";
import {
  consumeToolInstance,
  createToolInstance,
  getToolAvailability,
  getToolDefinition,
  getToolParam
} from "./tools";
import type {
  ActionPresentation,
  ActionPresentationEvent,
  ActionResolution,
  AffectedPlayerMove,
  BoardDefinition,
  BoardPlayerState,
  Direction,
  GridPosition,
  MovementActor,
  TileDefinition,
  TileMutation,
  TileType,
  ToolActionContext,
  ToolId,
  SummonMutation,
  TriggeredTerrainEffect,
  TriggeredSummonEffect,
  TurnToolSnapshot
} from "./types";

const DIRECTION_VECTORS: Record<Direction, GridPosition> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 }
};

const CARDINAL_DIRECTIONS: Direction[] = ["up", "right", "down", "left"];
const GROUND_MOTION_MS_PER_STEP = 150;
const ARC_MOTION_MS_PER_STEP = 210;
const PROJECTILE_MOTION_MS_PER_STEP = 110;
const ROCKET_EXPLOSION_EFFECT_MS = 420;
const ROCKET_BLAST_DELAY_MS = 40;

type ToolExecutor = (context: ToolActionContext) => ActionResolution;

interface AxisTarget {
  direction: Direction;
  distance: number;
  snappedTarget: GridPosition;
}

interface GroundTraversalResult {
  currentDirection: Direction;
  path: GridPosition[];
  position: GridPosition;
  remainingMovePoints: number;
  stopReason: string;
  tileMutations: TileMutation[];
  triggeredTerrainEffects: TriggeredTerrainEffect[];
}

interface GroundTraversalOptions {
  actorId: string;
  board: BoardDefinition;
  direction: Direction;
  movePoints: number;
  maxSteps?: number;
  position: GridPosition;
  priorTileMutations?: TileMutation[];
}

interface ProjectileTraceResult {
  path: GridPosition[];
  collision:
    | {
        kind: "none";
        endPosition: GridPosition;
        direction: Direction;
      }
    | {
        kind: "edge";
        endPosition: GridPosition;
        direction: Direction;
      }
    | {
        kind: "solid";
        position: GridPosition;
        previousPosition: GridPosition;
        direction: Direction;
        tile: TileDefinition;
      }
    | {
        kind: "player";
        position: GridPosition;
        previousPosition: GridPosition;
        direction: Direction;
        players: BoardPlayerState[];
      };
}

function toPositionKey(position: GridPosition): string {
  return `${position.x},${position.y}`;
}

// Blocked resolutions preserve tool inventory so previews can explain why an action failed.
function buildBlockedResolution(
  actor: MovementActor,
  tools: TurnToolSnapshot[],
  reason: string,
  nextToolDieSeed: number,
  path: GridPosition[] = [],
  triggeredTerrainEffects: TriggeredTerrainEffect[] = [],
  previewTiles: GridPosition[] = []
): ActionResolution {
  return {
    kind: "blocked",
    reason,
    path,
    previewTiles,
    actor: {
      position: actor.position,
      turnFlags: actor.turnFlags
    },
    tools,
    affectedPlayers: [],
    tileMutations: [],
    summonMutations: [],
    triggeredTerrainEffects,
    triggeredSummonEffects: [],
    presentation: null,
    endsTurn: false,
    nextToolDieSeed
  };
}

// Applied resolutions capture the immediate tool result before stop-terrain post-processing.
function buildAppliedResolution(
  nextActor: MovementActor,
  tools: TurnToolSnapshot[],
  summary: string,
  nextToolDieSeed: number,
  path: GridPosition[],
  tileMutations: TileMutation[] = [],
  affectedPlayers: AffectedPlayerMove[] = [],
  triggeredTerrainEffects: TriggeredTerrainEffect[] = [],
  previewTiles: GridPosition[] = [],
  presentation: ActionPresentation | null = null,
  summonMutations: SummonMutation[] = [],
  triggeredSummonEffects: TriggeredSummonEffect[] = [],
  endsTurn = false
): ActionResolution {
  return {
    kind: "applied",
    summary,
    path,
    previewTiles,
    actor: {
      position: nextActor.position,
      turnFlags: nextActor.turnFlags
    },
    tools,
    affectedPlayers,
    tileMutations,
    summonMutations,
    triggeredTerrainEffects,
    triggeredSummonEffects,
    presentation,
    endsTurn,
    nextToolDieSeed
  };
}

// Presentation events stay semantic so the client can map them onto meshes and effects.
function createPresentation(
  actorId: string,
  toolId: ToolId,
  events: ActionPresentationEvent[]
): ActionPresentation | null {
  if (!events.length) {
    return null;
  }

  return {
    actorId,
    toolId,
    events,
    durationMs: Math.max(...events.map((event) => event.startMs + event.durationMs))
  };
}

function createPlayerMotionEvent(
  eventId: string,
  playerId: string,
  positions: GridPosition[],
  motionStyle: "ground" | "arc",
  startMs = 0
): ActionPresentationEvent | null {
  if (positions.length < 2) {
    return null;
  }

  const stepCount = Math.max(1, positions.length - 1);

  return {
    id: eventId,
    kind: "player_motion",
    playerId,
    motionStyle,
    positions,
    startMs,
    durationMs: stepCount * (motionStyle === "arc" ? ARC_MOTION_MS_PER_STEP : GROUND_MOTION_MS_PER_STEP)
  };
}

function createProjectileEvent(
  eventId: string,
  ownerId: string,
  projectileType: "basketball" | "rocket",
  positions: GridPosition[],
  startMs = 0
): ActionPresentationEvent | null {
  if (positions.length < 2) {
    return null;
  }

  return {
    id: eventId,
    kind: "projectile",
    ownerId,
    projectileType,
    positions,
    startMs,
    durationMs: Math.max(1, positions.length - 1) * PROJECTILE_MOTION_MS_PER_STEP
  };
}

function createEffectEvent(
  eventId: string,
  effectType: "rocket_explosion",
  position: GridPosition,
  tiles: GridPosition[],
  startMs = 0,
  durationMs = ROCKET_EXPLOSION_EFFECT_MS
): ActionPresentationEvent {
  return {
    id: eventId,
    kind: "effect",
    effectType,
    position,
    tiles,
    startMs,
    durationMs
  };
}

function buildMotionPositions(startPosition: GridPosition, path: GridPosition[]): GridPosition[] {
  return path.length ? [startPosition, ...path] : [startPosition];
}

// Stop terrain runs after tool mechanics so every executor inherits the same landing rules.
function finalizeAppliedResolution(
  context: ToolActionContext,
  resolution: ActionResolution
): ActionResolution {
  if (resolution.kind === "blocked") {
    return resolution;
  }

  const stopResolution = applyStopTerrainEffects({
    activeTool: context.activeTool,
    actor: context.actor,
    actorPosition: resolution.actor.position,
    affectedPlayers: resolution.affectedPlayers,
    board: context.board,
    players: context.players,
    tileMutations: resolution.tileMutations,
    toolDieSeed: resolution.nextToolDieSeed,
    tools: resolution.tools
  });

  return {
    ...resolution,
    actor: stopResolution.actor,
    affectedPlayers: stopResolution.affectedPlayers,
    tools: stopResolution.tools,
    triggeredTerrainEffects: [
      ...resolution.triggeredTerrainEffects,
      ...stopResolution.triggeredTerrainEffects
    ],
    nextToolDieSeed: stopResolution.nextToolDieSeed
  };
}

function applyPassThroughBoardEffects(
  context: ToolActionContext,
  resolution: ActionResolution
): ActionResolution {
  if (resolution.kind === "blocked") {
    return resolution;
  }

  if (
    !resolution.path.length ||
    getToolDefinition(context.activeTool.toolId).passThroughEffectMode !== "ground"
  ) {
    return resolution;
  }

  const summonResolution = applyPassThroughSummonEffects({
    actor: context.actor,
    path: resolution.path,
    summons: context.summons,
    toolDieSeed: resolution.nextToolDieSeed,
    tools: resolution.tools
  });

  if (!summonResolution.summonMutations.length && !summonResolution.triggeredSummonEffects.length) {
    return resolution;
  }

  return {
    ...resolution,
    tools: summonResolution.tools,
    summonMutations: [...resolution.summonMutations, ...summonResolution.summonMutations],
    triggeredSummonEffects: [
      ...resolution.triggeredSummonEffects,
      ...summonResolution.triggeredSummonEffects
    ],
    nextToolDieSeed: summonResolution.nextToolDieSeed
  };
}

export function getDirectionVector(direction: Direction): GridPosition {
  return DIRECTION_VECTORS[direction];
}

// Opposite directions are reused when hookshot pulls a target back toward the actor.
export function getOppositeDirection(direction: Direction): Direction {
  switch (direction) {
    case "up":
      return "down";
    case "down":
      return "up";
    case "left":
      return "right";
    case "right":
      return "left";
  }
}

// Step math stays centralized so every tool uses the same board coordinate system.
export function stepPosition(
  position: GridPosition,
  direction: Direction,
  amount = 1
): GridPosition {
  const vector = getDirectionVector(direction);

  return {
    x: position.x + vector.x * amount,
    y: position.y + vector.y * amount
  };
}

function buildStraightPath(
  startPosition: GridPosition,
  direction: Direction,
  distance: number
): GridPosition[] {
  return Array.from({ length: distance }, (_, index) =>
    stepPosition(startPosition, direction, index + 1)
  );
}

// Solid tiles block both grounded traversal and landing checks.
export function isSolidTileType(tileType: TileType): boolean {
  return tileType === "wall" || tileType === "earthWall";
}

function positionsEqual(a: GridPosition, b: GridPosition): boolean {
  return a.x === b.x && a.y === b.y;
}

function dedupePositions(positions: GridPosition[]): GridPosition[] {
  const seen = new Set<string>();

  return positions.filter((position) => {
    const key = toPositionKey(position);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function findPlayersAtPosition(
  players: BoardPlayerState[],
  position: GridPosition,
  ignoredPlayerIds: string[] = []
): BoardPlayerState[] {
  return players.filter(
    (player) =>
      !ignoredPlayerIds.includes(player.id) &&
      player.position.x === position.x &&
      player.position.y === position.y
  );
}

// Tile lookups can be overridden by pending mutations during one composite action.
function getTileAfterMutations(
  board: BoardDefinition,
  tileMutations: TileMutation[],
  position: GridPosition
): TileDefinition | null {
  const tile = getTile(board, position);

  if (!tile) {
    return null;
  }

  const matchingMutation = tileMutations.find((entry) => entry.key === tile.key);

  if (!matchingMutation) {
    return tile;
  }

  return {
    ...tile,
    type: matchingMutation.nextType,
    durability: matchingMutation.nextDurability
  };
}

// Landing validation only checks board topology now that players can stack.
function isLandablePosition(
  board: BoardDefinition,
  position: GridPosition,
  tileMutations: TileMutation[] = []
): boolean {
  if (!isWithinBoard(board, position)) {
    return false;
  }

  const tile = getTileAfterMutations(board, tileMutations, position);

  if (!tile || isSolidTileType(tile.type)) {
    return false;
  }

  return true;
}

// Tile mutations are emitted through one helper so floors and walls use the same room sync path.
function createTileMutation(
  position: GridPosition,
  nextType: TileType,
  nextDurability: number
): TileMutation {
  return {
    key: toTileKey(position),
    position,
    nextType,
    nextDurability
  };
}

function buildDerivedToolInstanceId(activeTool: TurnToolSnapshot, suffix: string): string {
  return `${activeTool.instanceId}:${suffix}`;
}

function buildSummonInstanceId(activeTool: TurnToolSnapshot, summonId: string): string {
  return `${activeTool.instanceId}:${summonId}`;
}

// Tool consumption stays centralized so executors do not rewrite inventory logic.
function consumeActiveTool(context: ToolActionContext): TurnToolSnapshot[] {
  return consumeToolInstance(context.tools, context.activeTool.instanceId);
}

// Directional executors read from the optional payload through one shared helper.
function requireDirection(context: ToolActionContext): Direction | null {
  return context.direction ?? null;
}

// Tile-target tools snap off-axis drags onto one cardinal lane before resolving.
function normalizeAxisTarget(
  from: GridPosition,
  target: GridPosition | undefined
): AxisTarget | null {
  if (!target) {
    return null;
  }

  const deltaX = target.x - from.x;
  const deltaY = target.y - from.y;

  if (!deltaX && !deltaY) {
    return null;
  }

  if (Math.abs(deltaX) >= Math.abs(deltaY) && deltaX !== 0) {
    const direction = deltaX > 0 ? "right" : "left";
    const distance = Math.abs(deltaX);

    return {
      direction,
      distance,
      snappedTarget: stepPosition(from, direction, distance)
    };
  }

  if (deltaY !== 0) {
    const direction = deltaY > 0 ? "down" : "up";
    const distance = Math.abs(deltaY);

    return {
      direction,
      distance,
      snappedTarget: stepPosition(from, direction, distance)
    };
  }

  return null;
}

// Ground traversal is shared by movement and push-like effects so tile rules stay identical.
function resolveGroundTraversal(options: GroundTraversalOptions): GroundTraversalResult {
  let currentDirection = options.direction;
  let currentPosition = options.position;
  let remainingMovePoints = options.movePoints;
  let remainingSteps = options.maxSteps ?? Number.POSITIVE_INFINITY;
  const path: GridPosition[] = [];
  const tileMutations: TileMutation[] = [];
  const effectiveTileMutations = [...(options.priorTileMutations ?? [])];
  const triggeredTerrainEffects: TriggeredTerrainEffect[] = [];
  let stopReason = "Movement ended";

  while (remainingMovePoints > 0 && remainingSteps > 0) {
    const target = stepPosition(currentPosition, currentDirection);

    if (!isWithinBoard(options.board, target)) {
      stopReason = "Board edge";
      break;
    }

    const tile = getTileAfterMutations(options.board, effectiveTileMutations, target);

    if (!tile) {
      stopReason = "Missing tile";
      break;
    }

    if (tile.type === "wall") {
      stopReason = "Wall";
      break;
    }

    const moveCost = tile.type === "earthWall" ? 1 + tile.durability : 1;

    if (remainingMovePoints < moveCost) {
      stopReason = "Not enough move points";
      break;
    }

    remainingMovePoints -= moveCost;
    remainingSteps -= 1;
    currentPosition = target;
    path.push(target);

    if (tile.type === "earthWall") {
      const mutation = createTileMutation(target, "floor", 0);
      tileMutations.push(mutation);
      effectiveTileMutations.push(mutation);
    }

    const terrainResolution = resolvePassThroughTerrainEffect({
      direction: currentDirection,
      playerId: options.actorId,
      position: currentPosition,
      remainingMovePoints,
      tile
    });

    currentDirection = terrainResolution.direction;
    remainingMovePoints = terrainResolution.remainingMovePoints;
    triggeredTerrainEffects.push(...terrainResolution.triggeredTerrainEffects);
  }

  return {
    currentDirection,
    path,
    position: currentPosition,
    remainingMovePoints,
    stopReason,
    tileMutations,
    triggeredTerrainEffects
  };
}

// Leap resolution reuses landing rules while ignoring walls between start and destination.
function resolveLeapLanding(
  board: BoardDefinition,
  startPosition: GridPosition,
  direction: Direction,
  maxDistance: number,
  tileMutations: TileMutation[] = []
): { landing: GridPosition | null; path: GridPosition[] } {

  for (let distance = maxDistance; distance >= 1; distance -= 1) {
    const landing = stepPosition(startPosition, direction, distance);

    if (isLandablePosition(board, landing, tileMutations)) {
      const path = Array.from({ length: distance }, (_, index) =>
        stepPosition(startPosition, direction, index + 1)
      );

      return {
        landing,
        path
      };
    }
  }

  return {
    landing: null,
    path: []
  };
}

// Push resolution is grounded traversal with a move budget equal to push strength.
function resolvePushTarget(
  context: ToolActionContext,
  pushedPlayer: BoardPlayerState,
  direction: Direction,
  distance: number,
  priorTileMutations: TileMutation[] = []
): GroundTraversalResult {
  return resolveGroundTraversal({
    actorId: pushedPlayer.id,
    board: context.board,
    direction,
    movePoints: distance,
    position: pushedPlayer.position,
    priorTileMutations
  });
}

// Projectile tracing stops on the first solid tile or tile that contains any players.
function traceProjectile(
  context: ToolActionContext,
  direction: Direction,
  maxDistance: number,
  maxBounces: number
): ProjectileTraceResult {
  let currentDirection = direction;
  let currentPosition = context.actor.position;
  let remainingBounces = maxBounces;
  const path: GridPosition[] = [];

  for (let step = 0; step < maxDistance; step += 1) {
    const target = stepPosition(currentPosition, currentDirection);

    if (!isWithinBoard(context.board, target)) {
      return {
        path,
        collision: {
          kind: "edge",
          endPosition: currentPosition,
          direction: currentDirection
        }
      };
    }

    const tile = getTile(context.board, target);

    if (tile && isSolidTileType(tile.type)) {
      if (remainingBounces > 0) {
        remainingBounces -= 1;
        currentDirection = getOppositeDirection(currentDirection);
        currentPosition = target;
        continue;
      }

      return {
        path,
        collision: {
          kind: "solid",
          position: target,
          previousPosition: currentPosition,
          direction: currentDirection,
          tile
        }
      };
    }

    currentPosition = target;
    path.push(target);

    const hitPlayers = findPlayersAtPosition(context.players, target, []);

    if (hitPlayers.length) {
      return {
        path,
        collision: {
          kind: "player",
          position: target,
          previousPosition: path[path.length - 2] ?? context.actor.position,
          direction: currentDirection,
          players: hitPlayers
        }
      };
    }
  }

  return {
    path,
    collision: {
      kind: "none",
      endPosition: currentPosition,
      direction: currentDirection
    }
  };
}

function collectExplosionPreviewTiles(
  board: BoardDefinition,
  center: GridPosition
): GridPosition[] {
  return dedupePositions([
    center,
    ...CARDINAL_DIRECTIONS.map((direction) => stepPosition(center, direction))
  ]).filter((position) => isWithinBoard(board, position));
}

// Movement spends the tool's stored move points on the grounded traversal pipeline.
function resolveMovementTool(context: ToolActionContext): ActionResolution {
  const direction = requireDirection(context);
  const movePoints = getToolParam(context.activeTool, "movePoints");

  if (!direction) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Movement needs a direction",
      context.toolDieSeed
    );
  }

  if (movePoints < 1) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "No move points left",
      context.toolDieSeed
    );
  }

  const traversal = resolveGroundTraversal({
    actorId: context.actor.id,
    board: context.board,
    direction,
    movePoints,
    position: context.actor.position
  });
  const presentation = createPresentation(context.actor.id, context.activeTool.toolId, [
    createPlayerMotionEvent(
      `${context.activeTool.instanceId}:actor-move`,
      context.actor.id,
      buildMotionPositions(context.actor.position, traversal.path),
      "ground"
    )
  ].flatMap((event) => (event ? [event] : [])));

  return buildAppliedResolution(
    {
      ...context.actor,
      position: traversal.position
    },
    consumeActiveTool(context),
    `Used ${getToolDefinition(context.activeTool.toolId).label}.`,
    context.toolDieSeed,
    traversal.path,
    traversal.tileMutations,
    [],
    traversal.triggeredTerrainEffects,
    traversal.path,
    presentation
  );
}

// Jump checks multiple landings without triggering grounded pass-through terrain.
function resolveJumpTool(context: ToolActionContext): ActionResolution {
  const direction = requireDirection(context);
  const jumpDistance = getToolParam(context.activeTool, "jumpDistance");

  if (!direction) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Jump needs a direction",
      context.toolDieSeed
    );
  }

  const leap = resolveLeapLanding(
    context.board,
    context.actor.position,
    direction,
    jumpDistance
  );

  if (!leap.landing) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "No landing tile",
      context.toolDieSeed,
      leap.path,
      [],
      leap.path
    );
  }

  const presentation = createPresentation(context.actor.id, context.activeTool.toolId, [
    createPlayerMotionEvent(
      `${context.activeTool.instanceId}:actor-jump`,
      context.actor.id,
      buildMotionPositions(context.actor.position, leap.path),
      "arc"
    )
  ].flatMap((event) => (event ? [event] : [])));

  return buildAppliedResolution(
    {
      ...context.actor,
      position: leap.landing
    },
    consumeActiveTool(context),
    `Used ${getToolDefinition(context.activeTool.toolId).label}.`,
    context.toolDieSeed,
    leap.path,
    [],
    [],
    [],
    leap.path,
    presentation
  );
}

// Hookshot either pulls a player or snaps the actor toward the first solid obstacle hit.
function resolveHookshotTool(context: ToolActionContext): ActionResolution {
  const direction = requireDirection(context);
  const hookLength = getToolParam(context.activeTool, "hookLength");

  if (!direction) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Hookshot needs a direction",
      context.toolDieSeed
    );
  }

  const rayPath: GridPosition[] = [];

  for (let distance = 1; distance <= hookLength; distance += 1) {
    const target = stepPosition(context.actor.position, direction, distance);

    if (!isWithinBoard(context.board, target)) {
      break;
    }

    const tile = getTile(context.board, target);

    if (tile && isSolidTileType(tile.type)) {
      if (distance === 1) {
        return buildBlockedResolution(
          context.actor,
          context.tools,
          "No hookshot landing space",
          context.toolDieSeed,
          rayPath,
          [],
          rayPath
        );
      }

      const landing = stepPosition(context.actor.position, direction, distance - 1);
      const presentation = createPresentation(context.actor.id, context.activeTool.toolId, [
        createPlayerMotionEvent(
          `${context.activeTool.instanceId}:actor-hook`,
          context.actor.id,
          buildMotionPositions(context.actor.position, rayPath),
          "ground"
        )
      ].flatMap((event) => (event ? [event] : [])));

      return buildAppliedResolution(
        {
          ...context.actor,
          position: landing
        },
        consumeActiveTool(context),
        `Used ${getToolDefinition(context.activeTool.toolId).label}.`,
        context.toolDieSeed,
        rayPath,
        [],
        [],
        [],
        rayPath,
        presentation
      );
    }

    rayPath.push(target);

    const hitPlayers = findPlayersAtPosition(context.players, target, [context.actor.id]);

    if (hitPlayers.length) {
      const pullDirection = getOppositeDirection(direction);
      const affectedPlayerResults = hitPlayers.flatMap((hitPlayer) => {
        let currentTarget = hitPlayer.position;
        const pullPath: GridPosition[] = [];

        while (true) {
          const nextTarget = stepPosition(currentTarget, pullDirection);

          if (positionsEqual(nextTarget, context.actor.position)) {
            break;
          }

          if (!isLandablePosition(context.board, nextTarget)) {
            break;
          }

          currentTarget = nextTarget;
          pullPath.push(currentTarget);
        }

        if (positionsEqual(currentTarget, hitPlayer.position)) {
          return [];
        }

        return [
          {
            path: pullPath,
            playerId: hitPlayer.id,
            target: currentTarget,
            reason: "hookshot"
          }
        ];
      });
      const affectedPlayers = affectedPlayerResults.map(({ playerId, target, reason }) => ({
        playerId,
        target,
        reason
      }));

      if (!affectedPlayers.length) {
        return buildBlockedResolution(
          context.actor,
          context.tools,
          "Target cannot be pulled",
          context.toolDieSeed,
          rayPath,
          [],
          rayPath
        );
      }

      const presentation = createPresentation(
        context.actor.id,
        context.activeTool.toolId,
        affectedPlayerResults.flatMap((result, index) => {
          const event = createPlayerMotionEvent(
            `${context.activeTool.instanceId}:hooked-${index}`,
            result.playerId,
            buildMotionPositions(
              hitPlayers.find((player) => player.id === result.playerId)?.position ?? result.target,
              result.path
            ),
            "ground"
          );

          return event ? [event] : [];
        })
      );

      return buildAppliedResolution(
        context.actor,
        consumeActiveTool(context),
        `Used ${getToolDefinition(context.activeTool.toolId).label}.`,
        context.toolDieSeed,
        rayPath,
        [],
        affectedPlayers,
        [],
        rayPath,
        presentation
      );
    }

  }

  return buildBlockedResolution(
    context.actor,
    context.tools,
    "No hookshot target",
    context.toolDieSeed,
    rayPath,
    [],
    rayPath
  );
}

// Dash buffs every remaining Movement tool so execution order stays meaningful.
function resolveDashTool(context: ToolActionContext): ActionResolution {
  const dashBonus = getToolParam(context.activeTool, "dashBonus");
  const nextTools = consumeActiveTool(context).map((tool) =>
    tool.toolId === "movement"
      ? {
          ...tool,
          params: {
            ...tool.params,
            movePoints: getToolParam(tool, "movePoints") + dashBonus
          }
        }
      : tool
  );

  return buildAppliedResolution(
    context.actor,
    nextTools,
    `Used ${getToolDefinition(context.activeTool.toolId).label}.`,
    context.toolDieSeed,
    []
  );
}

// Brake is a tile-target move that stops early on the actual reachable tile.
function resolveBrakeTool(context: ToolActionContext): ActionResolution {
  const maxRange = getToolParam(context.activeTool, "brakeRange");
  const axisTarget = normalizeAxisTarget(context.actor.position, context.targetPosition);

  if (!axisTarget) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Brake needs a target tile",
      context.toolDieSeed
    );
  }

  if (maxRange < 1) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "No brake range left",
      context.toolDieSeed
    );
  }

  const requestedDistance = Math.min(maxRange, axisTarget.distance);
  const traversal = resolveGroundTraversal(
    {
      actorId: context.actor.id,
      board: context.board,
      direction: axisTarget.direction,
      movePoints: requestedDistance,
      maxSteps: requestedDistance,
      position: context.actor.position
    }
  );

  if (!traversal.path.length) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      traversal.stopReason,
      context.toolDieSeed,
      [],
      [],
      [axisTarget.snappedTarget]
    );
  }

  const presentation = createPresentation(context.actor.id, context.activeTool.toolId, [
    createPlayerMotionEvent(
      `${context.activeTool.instanceId}:actor-brake`,
      context.actor.id,
      buildMotionPositions(context.actor.position, traversal.path),
      "ground"
    )
  ].flatMap((event) => (event ? [event] : [])));

  return buildAppliedResolution(
    {
      ...context.actor,
      position: traversal.position
    },
    consumeActiveTool(context),
    `Used ${getToolDefinition(context.activeTool.toolId).label}.`,
    context.toolDieSeed,
    traversal.path,
    traversal.tileMutations,
    [],
    traversal.triggeredTerrainEffects,
    traversal.path,
    presentation
  );
}

// Wall building turns a nearby floor tile into a new earth wall.
function resolveBuildWallTool(context: ToolActionContext): ActionResolution {
  const targetPosition = context.targetPosition;
  const wallDurability = getToolParam(context.activeTool, "wallDurability");

  if (!targetPosition) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Build Wall needs a target tile",
      context.toolDieSeed
    );
  }

  const deltaX = Math.abs(targetPosition.x - context.actor.position.x);
  const deltaY = Math.abs(targetPosition.y - context.actor.position.y);

  if ((deltaX === 0 && deltaY === 0) || deltaX > 1 || deltaY > 1) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Build Wall must target one of the surrounding tiles",
      context.toolDieSeed,
      [],
      [],
      [targetPosition]
    );
  }

  const tile = getTile(context.board, targetPosition);

  if (!tile || tile.type !== "floor") {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Build Wall needs an empty floor tile",
      context.toolDieSeed,
      [],
      [],
      [targetPosition]
    );
  }

  return buildAppliedResolution(
    context.actor,
    consumeActiveTool(context),
    `Used ${getToolDefinition(context.activeTool.toolId).label}.`,
    context.toolDieSeed,
    [],
    [createTileMutation(targetPosition, "earthWall", wallDurability)],
    [],
    [],
    [targetPosition]
  );
}

// Wallet deployment is implemented as a role-owned tool so it reuses the normal aim pipeline.
function resolveDeployWalletTool(context: ToolActionContext): ActionResolution {
  const targetPosition = context.targetPosition;
  const targetRange = getToolParam(context.activeTool, "targetRange");

  if (!targetPosition) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Deploy Wallet needs a target tile",
      context.toolDieSeed
    );
  }

  if (
    Math.abs(targetPosition.x - context.actor.position.x) > targetRange ||
    Math.abs(targetPosition.y - context.actor.position.y) > targetRange
  ) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Target tile is outside the deployment range",
      context.toolDieSeed,
      [],
      [],
      [targetPosition]
    );
  }

  if (!isLandablePosition(context.board, targetPosition)) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Deploy Wallet needs a landable tile",
      context.toolDieSeed,
      [],
      [],
      [targetPosition]
    );
  }

  if (hasSummonAtPosition(context.summons, targetPosition)) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Target tile already contains a summon",
      context.toolDieSeed,
      [],
      [],
      [targetPosition]
    );
  }

  return buildAppliedResolution(
    context.actor,
    consumeActiveTool(context),
    `Used ${getToolDefinition(context.activeTool.toolId).label}.`,
    context.toolDieSeed,
    [],
    [],
    [],
    [],
    [targetPosition],
    null,
    [
      createSummonUpsertMutation(
        buildSummonInstanceId(context.activeTool, "wallet"),
        "wallet",
        context.actor.id,
        targetPosition
      )
    ],
    [],
    true
  );
}

// Basketball uses a bouncing projectile and can reward extra charges after a player hit.
function resolveBasketballTool(context: ToolActionContext): ActionResolution {
  const direction = requireDirection(context);
  const projectileRange = getToolParam(context.activeTool, "projectileRange");
  const bounceCount = getToolParam(context.activeTool, "projectileBounceCount");
  const pushDistance = getToolParam(context.activeTool, "projectilePushDistance");
  let nextTools = consumeActiveTool(context);
  const affectedPlayers: AffectedPlayerMove[] = [];
  const tileMutations: TileMutation[] = [];
  const triggeredTerrainEffects: TriggeredTerrainEffect[] = [];

  if (!direction) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Basketball needs a direction",
      context.toolDieSeed
    );
  }

  const trace = traceProjectile(context, direction, projectileRange, bounceCount);
  const projectileEvent = createProjectileEvent(
    `${context.activeTool.instanceId}:projectile`,
    context.actor.id,
    "basketball",
    buildMotionPositions(context.actor.position, trace.path)
  );
  const impactStartMs = projectileEvent ? projectileEvent.startMs + projectileEvent.durationMs : 0;
  const motionEvents: ActionPresentationEvent[] = projectileEvent ? [projectileEvent] : [];

  if (trace.collision.kind === "player") {
    for (const [index, hitPlayer] of trace.collision.players.entries()) {
      const traversal = resolvePushTarget(
        context,
        hitPlayer,
        trace.collision.direction,
        pushDistance,
        tileMutations
      );

      if (!traversal.path.length) {
        continue;
      }

      affectedPlayers.push({
        playerId: hitPlayer.id,
        target: traversal.position,
        reason: "basketball"
      });
      tileMutations.push(...traversal.tileMutations);
      triggeredTerrainEffects.push(...traversal.triggeredTerrainEffects);
      const motionEvent = createPlayerMotionEvent(
        `${context.activeTool.instanceId}:basketball-hit-${index}`,
        hitPlayer.id,
        buildMotionPositions(hitPlayer.position, traversal.path),
        "ground",
        impactStartMs
      );

      if (motionEvent) {
        motionEvents.push(motionEvent);
      }
    }
  }

  const presentation = createPresentation(context.actor.id, context.activeTool.toolId, motionEvents);

  return buildAppliedResolution(
    context.actor,
    nextTools,
    `Used ${getToolDefinition(context.activeTool.toolId).label}.`,
    context.toolDieSeed,
    trace.path,
    tileMutations,
    affectedPlayers,
    triggeredTerrainEffects,
    [],
    presentation
  );
}

// Rocket resolves a line trace, then applies an explosion-centered knockback pattern.
function resolveRocketTool(context: ToolActionContext): ActionResolution {
  const direction = requireDirection(context);
  const projectileRange = getToolParam(context.activeTool, "projectileRange");
  const blastLeapDistance = getToolParam(context.activeTool, "rocketBlastLeapDistance");
  const splashPushDistance = getToolParam(context.activeTool, "rocketSplashPushDistance");

  if (!direction) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Rocket needs a direction",
      context.toolDieSeed
    );
  }

  const trace = traceProjectile(context, direction, projectileRange, 0);

  const explosionPosition =
    trace.collision.kind === "player"
      ? trace.collision.position
      : trace.collision.kind === "solid"
        ? trace.collision.previousPosition
        : trace.path[trace.path.length - 1] ?? null;
  
  const centerLeapDirection =
    trace.collision.kind === "player"
      ? trace.collision.direction : getOppositeDirection(trace.collision.direction);

  if (!explosionPosition) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "No rocket flight path",
      context.toolDieSeed
    );
  }

  const projectileEvent = createProjectileEvent(
    `${context.activeTool.instanceId}:projectile`,
    context.actor.id,
    "rocket",
    buildMotionPositions(context.actor.position, trace.path)
  );
  const explosionStartMs = projectileEvent ? projectileEvent.startMs + projectileEvent.durationMs : 0;
  const affectedPlayers: AffectedPlayerMove[] = [];
  const tileMutations: TileMutation[] = [];
  const triggeredTerrainEffects: TriggeredTerrainEffect[] = [];
  const motionEvents: ActionPresentationEvent[] = projectileEvent ? [projectileEvent] : [];
  const centerPlayers =
    trace.collision.kind === "player"
      ? trace.collision.players
      : findPlayersAtPosition(context.players, explosionPosition, []);

  centerPlayers.forEach((hitPlayer, index) => {
    const leap = resolveLeapLanding(
      context.board,
      hitPlayer.position,
      centerLeapDirection,
      blastLeapDistance,
      tileMutations
    );

    if (!leap.landing) {
      return;
    }

    affectedPlayers.push({
      playerId: hitPlayer.id,
      target: leap.landing,
      reason: "rocket_blast"
    });
    const motionEvent = createPlayerMotionEvent(
      `${context.activeTool.instanceId}:blast-${index}`,
      hitPlayer.id,
      buildMotionPositions(hitPlayer.position, leap.path),
      "arc",
      explosionStartMs + ROCKET_BLAST_DELAY_MS
    );

    if (motionEvent) {
      motionEvents.push(motionEvent);
    }
  });

  for (const splashDirection of CARDINAL_DIRECTIONS) {
    const splashPosition = stepPosition(explosionPosition, splashDirection);
    const splashPlayers = findPlayersAtPosition(
      context.players,
      splashPosition,
      centerPlayers.map((player) => player.id)
    );

    for (const splashPlayer of splashPlayers) {
      const traversal = resolvePushTarget(
        context,
        splashPlayer,
        splashDirection,
        splashPushDistance,
        tileMutations
      );

      if (!traversal.path.length) {
        continue;
      }

      affectedPlayers.push({
        playerId: splashPlayer.id,
        target: traversal.position,
        reason: "rocket_splash"
      });
      tileMutations.push(...traversal.tileMutations);
      triggeredTerrainEffects.push(...traversal.triggeredTerrainEffects);
      const motionEvent = createPlayerMotionEvent(
        `${context.activeTool.instanceId}:splash-${splashPlayer.id}-${splashDirection}`,
        splashPlayer.id,
        buildMotionPositions(splashPlayer.position, traversal.path),
        "ground",
        explosionStartMs + ROCKET_BLAST_DELAY_MS
      );

      if (motionEvent) {
        motionEvents.push(motionEvent);
      }
    }
  }

  motionEvents.push(
    createEffectEvent(
      `${context.activeTool.instanceId}:explosion`,
      "rocket_explosion",
      explosionPosition,
      collectExplosionPreviewTiles(context.board, explosionPosition),
      explosionStartMs
    )
  );
  const previewTiles = collectExplosionPreviewTiles(context.board, explosionPosition);
  const presentation = createPresentation(context.actor.id, context.activeTool.toolId, motionEvents);

  return buildAppliedResolution(
    context.actor,
    consumeActiveTool(context),
    `Used ${getToolDefinition(context.activeTool.toolId).label}.`,
    context.toolDieSeed,
    trace.path,
    tileMutations,
    affectedPlayers,
    triggeredTerrainEffects,
    previewTiles,
    presentation
  );
}

// Teleport moves directly onto any valid landing tile on the board.
function resolveTeleportTool(context: ToolActionContext): ActionResolution {
  const targetPosition = context.targetPosition;

  if (!targetPosition) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Teleport needs a target tile",
      context.toolDieSeed
    );
  }

  if (
    !isLandablePosition(
      context.board,
      targetPosition
    )
  ) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      "Teleport target is not landable",
      context.toolDieSeed,
      [],
      [],
      [targetPosition]
    );
  }

  return buildAppliedResolution(
    {
      ...context.actor,
      position: targetPosition
    },
    consumeActiveTool(context),
    `Used ${getToolDefinition(context.activeTool.toolId).label}.`,
    context.toolDieSeed,
    [targetPosition],
    [],
    [],
    [],
    [targetPosition]
  );
}

const TOOL_EXECUTORS: Record<ToolId, ToolExecutor> = {
  movement: resolveMovementTool,
  jump: resolveJumpTool,
  hookshot: resolveHookshotTool,
  dash: resolveDashTool,
  brake: resolveBrakeTool,
  buildWall: resolveBuildWallTool,
  deployWallet: resolveDeployWalletTool,
  basketball: resolveBasketballTool,
  rocket: resolveRocketTool,
  teleport: resolveTeleportTool
};

// Tool resolution is shared by the room and preview layer so both follow one ruleset.
export function resolveToolAction(context: ToolActionContext): ActionResolution {
  const availability = getToolAvailability(context.activeTool, context.tools);
  const toolDefinition = getToolDefinition(context.activeTool.toolId);

  if (!availability.usable) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      availability.reason ?? "Tool cannot be used right now",
      context.toolDieSeed
    );
  }

  if (toolDefinition.targetMode === "direction" && !context.direction) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      `${toolDefinition.label} needs a direction`,
      context.toolDieSeed
    );
  }

  if (toolDefinition.targetMode === "tile" && !context.targetPosition) {
    return buildBlockedResolution(
      context.actor,
      context.tools,
      `${toolDefinition.label} needs a target tile`,
      context.toolDieSeed
    );
  }

  const executedResolution = TOOL_EXECUTORS[context.activeTool.toolId](context);
  const definitionAdjustedResolution =
    executedResolution.kind === "applied" && toolDefinition.endsTurnOnUse
      ? {
          ...executedResolution,
          endsTurn: executedResolution.endsTurn || toolDefinition.endsTurnOnUse
        }
      : executedResolution;

  return finalizeAppliedResolution(
    context,
    applyPassThroughBoardEffects(context, definitionAdjustedResolution)
  );
}
