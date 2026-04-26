import type { Direction, GridPosition } from "../types";
import type { ToolContentDefinition } from "../content/schema";
import { createDragDirectionInteraction } from "../toolInteraction";
import {
  buildMotionPositions,
  createEffectEvent,
  createProjectileEvent,
  ROCKET_BLAST_DELAY_MS
} from "../rules/actionPresentation";
import {
  appendDraftPresentationEvents,
  getDraftPlayers,
  setDraftApplied,
  setDraftBlocked,
  setDraftToolInventory,
  type ResolutionDraft
} from "../rules/actionDraft";
import { consumeActiveTool, requireDirection } from "../rules/actionResolution";
import { createMovementDescriptorInput } from "../rules/displacement";
import {
  didDisplacementTakeEffect,
  resolveLeapDisplacement,
  resolveLinearDisplacement
} from "../rules/movementSystem";
// import { collectDirectionSelectionTiles } from "../rules/previewDescriptor";
import {
  CARDINAL_DIRECTIONS,
  collectExplosionPreviewTiles,
  findPlayersAtPosition,
  getOppositeDirection,
  stepPosition,
  traceProjectileFromPosition
} from "../rules/spatial";
import { resolveImpactTerrainEffect } from "../terrain";
import type { ToolModule } from "./types";
import {
  createToolPreview,
  createDraftSoundEvent,
  createPlayerAnchor,
  createPositionAnchor,
  createUsedSummary,
  getToolParamValue,
  isChargedToolAvailable,
  toMovementSubject
} from "./helpers";

const ROCKET_EXPLOSION_EFFECT_MS = 420;


export const ROCKET_TOOL_DEFINITION: ToolContentDefinition = {
  label: "火箭",
  disabledHint: "当前不能使用火箭。",
  source: "turn",
  interaction: createDragDirectionInteraction(),
  isAvailable: isChargedToolAvailable,
  defaultCharges: 1,
  defaultParams: {
    projectileRange: 999,
    rocketBlastLeapDistance: 3,
    rocketSplashPushDistance: 1
  },
  getTextDescription: ({ params }) => ({
    title: "火箭",
    description: "向所选方向发射火箭，命中后在落点爆炸并击飞周围玩家。",
    details: [
      `炸飞 ${params.rocketBlastLeapDistance ?? 0} 格, 推动 ${params.rocketSplashPushDistance ?? 0} 格`
      // `射程 ${(params.projectileRange ?? 0) >= 999 ? "全场" : `${params.projectileRange ?? 0} 格`}`,
      // `炸飞距离 ${params.rocketBlastLeapDistance ?? 0} 格`,
      // `爆风推力 ${params.rocketSplashPushDistance ?? 0} 格`
    ]
  }),
  color: "#dc5f56",
  rollable: true,
  debugGrantable: true,
  endsTurnOnUse: false
};

export interface RocketCoreSpec {
  blastLeapDistance: number;
  direction: Direction;
  eventIdPrefix: string;
  originPosition: GridPosition;
  projectileOwnerId: string | null;
  projectileRange: number;
  splashPushDistance: number;
  startMs: number;
  tagBase: string;
}

export interface RocketCoreResult {
  effectTiles: GridPosition[];
  explosionPosition: GridPosition | null;
  path: GridPosition[];
}

function createPassiveRocketMovement(
  toolTagBase: string,
  variant: "blast" | "splash"
) {
  return createMovementDescriptorInput("passive", {
    tags: [toolTagBase, `rocket:${variant}`],
    timing: "out_of_turn"
  });
}

export function resolveRocketCore(
  draft: ResolutionDraft,
  spec: RocketCoreSpec
): RocketCoreResult {
  const blastMovement = createPassiveRocketMovement(spec.tagBase, "blast");
  const splashMovement = createPassiveRocketMovement(spec.tagBase, "splash");
  const trace = traceProjectileFromPosition(
    {
      board: draft.board,
      players: getDraftPlayers(draft)
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
    buildMotionPositions(spec.originPosition, trace.path),
    spec.startMs
  );
  const explosionStartMs = projectileEvent ? projectileEvent.startMs + projectileEvent.durationMs : spec.startMs;

  if (projectileEvent) {
    appendDraftPresentationEvents(draft, [
      projectileEvent,
      createDraftSoundEvent(draft, "tool_shot_heavy", "rocket:launch", {
        anchor: spec.projectileOwnerId
          ? createPlayerAnchor(spec.projectileOwnerId)
          : createPositionAnchor(spec.originPosition),
        startMs: spec.startMs
      })
    ]);
  } else {
    appendDraftPresentationEvents(draft, [
      createDraftSoundEvent(draft, "tool_shot_heavy", "rocket:launch", {
        anchor: spec.projectileOwnerId
          ? createPlayerAnchor(spec.projectileOwnerId)
          : createPositionAnchor(spec.originPosition),
        startMs: spec.startMs
      })
    ]);
  }

  if (trace.collision.kind === "solid") {
    resolveImpactTerrainEffect(draft, {
      direction: trace.collision.direction,
      position: trace.collision.position,
      source: {
        kind: "projectile",
        ownerId: spec.projectileOwnerId,
        projectileType: "rocket"
      },
      startMs: explosionStartMs,
      strength: 999,
      tile: trace.collision.tile
    });
  }

  const livePlayers = getDraftPlayers(draft);
  const centerPlayers =
    trace.collision.kind === "player"
      ? trace.collision.players
      : findPlayersAtPosition(livePlayers, explosionPosition, []);

  centerPlayers.forEach((hitPlayer) => {
    const leapResolution = resolveLeapDisplacement(draft, {
      direction: centerLeapDirection,
      maxDistance: spec.blastLeapDistance,
      movement: blastMovement,
      player: toMovementSubject(hitPlayer),
      startMs: explosionStartMs + ROCKET_BLAST_DELAY_MS,
      trackAffectedPlayerReason: "rocket_blast"
    });

    if (!leapResolution.path.length) {
      return;
    }
  });

  for (const splashDirection of CARDINAL_DIRECTIONS) {
    const splashPosition = stepPosition(explosionPosition, splashDirection);
    const splashPlayers = findPlayersAtPosition(
      getDraftPlayers(draft),
      splashPosition,
      centerPlayers.map((player) => player.id)
    );

    for (const splashPlayer of splashPlayers) {
      const pushResolution = resolveLinearDisplacement(draft, {
        direction: splashDirection,
        movePoints: spec.splashPushDistance,
        movement: splashMovement,
        player: toMovementSubject(splashPlayer),
        startMs: explosionStartMs + ROCKET_BLAST_DELAY_MS,
        trackAffectedPlayerReason: "rocket_splash"
      });

      if (!didDisplacementTakeEffect(pushResolution)) {
        continue;
      }
    }
  }

  const effectTiles = collectExplosionPreviewTiles(draft.board, explosionPosition);
  appendDraftPresentationEvents(draft, [
    createDraftSoundEvent(draft, "tool_explosion", "rocket:explosion-sound", {
      anchor: createPositionAnchor(explosionPosition),
      startMs: explosionStartMs
    }),
    createEffectEvent(
      `${spec.eventIdPrefix}:explosion`,
      "rocket_explosion",
      explosionPosition,
      effectTiles,
      explosionStartMs,
      ROCKET_EXPLOSION_EFFECT_MS
    )
  ]);

  return {
    effectTiles,
    explosionPosition,
    path: trace.path
  };
}

function resolveRocketTool(
  draft: Parameters<ToolModule["execute"]>[0],
  context: Parameters<ToolModule["execute"]>[1]
): void {
  const direction = requireDirection(context);
  const projectileRange = getToolParamValue(context.activeTool, "projectileRange", 999);
  const blastLeapDistance = getToolParamValue(context.activeTool, "rocketBlastLeapDistance", 3);
  const splashPushDistance = getToolParamValue(context.activeTool, "rocketSplashPushDistance", 1);
  // const selectionTiles = collectDirectionSelectionTiles(context.board, context.actor.position);

  if (!direction) {
    setDraftBlocked(draft, "Rocket needs a direction", {
      preview: createToolPreview(context, {
        // selectionTiles,
        valid: false
      })
    });
    return;
  }

  const trace = traceProjectileFromPosition(
    {
      board: draft.board,
      players: getDraftPlayers(draft)
    },
    context.actor.position,
    direction,
    projectileRange,
    0
  );
  const explosionPosition =
    trace.collision.kind === "player"
      ? trace.collision.position
      : trace.collision.kind === "solid"
        ? trace.collision.previousPosition
        : trace.path[trace.path.length - 1] ?? null;

  if (!explosionPosition) {
    setDraftBlocked(draft, "No rocket flight path", {
      path: trace.path,
      preview: createToolPreview(context, {
        actorPath: trace.path,
        // selectionTiles,
        valid: false
      })
    });
    return;
  }

  setDraftToolInventory(draft, consumeActiveTool(context));
  const rocketResolution = resolveRocketCore(draft, {
    blastLeapDistance,
    direction,
    eventIdPrefix: context.activeTool.instanceId,
    originPosition: context.actor.position,
    projectileOwnerId: context.actor.id,
    projectileRange,
    splashPushDistance,
    startMs: 0,
    tagBase: `tool:${context.activeTool.toolId}`
  });

  setDraftApplied(draft, createUsedSummary(ROCKET_TOOL_DEFINITION.label), {
    path: trace.path,
    preview: createToolPreview(context, {
      actorPath: trace.path,
      affectedPlayers: draft.affectedPlayers,
      effectTiles: rocketResolution.effectTiles,
      // selectionTiles,
      valid: true
    })
  });
}

export const ROCKET_TOOL_MODULE: ToolModule<"rocket"> = {
  id: "rocket",
  definition: ROCKET_TOOL_DEFINITION,
  dieFace: {
    params: {
      projectileRange: 999,
      rocketBlastLeapDistance: 3,
      rocketSplashPushDistance: 1
    }
  },
  execute: resolveRocketTool
};
