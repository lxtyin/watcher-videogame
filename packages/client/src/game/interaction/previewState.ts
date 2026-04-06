import {
  type GameSnapshot,
  type GridPosition,
  type PreviewDescriptor,
  type SummonSnapshot,
  type ToolId
} from "@watcher/shared";
import { getActionUiConfig } from "../content/actionUi";

export type TilePreviewVariant = "tile" | "blast";

export interface PreviewRingSpec {
  color?: string;
  key: string;
  opacity: number;
  position: GridPosition;
  radius: number;
}

export interface PreviewSummonSpec {
  color: string;
  key: string;
  opacity?: number;
  summon: SummonSnapshot;
}

interface ScenePreviewExtras {
  landingRings?: PreviewRingSpec[];
  summonPreviews?: PreviewSummonSpec[];
  wallGhostPositions?: GridPosition[];
}

interface ToolPreviewResolverContext {
  previewColor: string;
  previewDescriptor: PreviewDescriptor | null;
  sessionId: string | null;
  snapshot: GameSnapshot | null;
}

type ToolPreviewResolver = (context: ToolPreviewResolverContext) => ScenePreviewExtras;

const TOOL_PREVIEW_STYLE_OVERRIDES: Partial<
  Record<ToolId, { color?: string }>
> = {
  rocket: {
    color: "#f15a49"
  }
};

const TOOL_PREVIEW_RESOLVERS: Partial<Record<ToolId, ToolPreviewResolver>> = {
  buildWall: ({ previewDescriptor }) => ({
    wallGhostPositions: previewDescriptor?.valid ? previewDescriptor.effectTiles : []
  }),
  deployWallet: ({ previewColor, previewDescriptor, sessionId }) => ({
    summonPreviews:
      previewDescriptor?.valid
        ? previewDescriptor.effectTiles.map((position, index) => ({
            key: `preview-wallet-${position.x}-${position.y}-${index}`,
            color: previewColor,
            opacity: 0.45,
            summon: {
              instanceId: `preview-wallet-${position.x}-${position.y}-${index}`,
              ownerId: sessionId ?? "preview",
              position,
              summonId: "wallet"
            }
          }))
        : []
  })
};

function buildLandingRings(
  previewDescriptor: PreviewDescriptor | null,
  snapshot: GameSnapshot | null
): PreviewRingSpec[] {
  if (!snapshot || !previewDescriptor?.valid) {
    return [];
  }

  return previewDescriptor.playerTargets.flatMap((target, index) => {
    if (
      !target.boardVisible ||
      target.startPosition.x === target.targetPosition.x &&
        target.startPosition.y === target.targetPosition.y
    ) {
      return [];
    }

    const player = snapshot.players.find((entry) => entry.id === target.playerId);

    if (!player) {
      return [];
    }

    return [
      {
        color: player.color,
        key: `landing-preview-${target.playerId}-${index}`,
        opacity: 0.72,
        position: target.targetPosition,
        radius: 0.54
      }
    ];
  });
}

function buildPreviewKeys(previewDescriptor: PreviewDescriptor | null): Set<string> {
  return new Set(
    [
      ...(previewDescriptor?.selectionTiles ?? []),
      ...(previewDescriptor?.effectTiles ?? [])
    ].map((position) => `${position.x},${position.y}`)
  );
}

function getPreviewStyle(toolId: ToolId | null): {
  color: string;
  variant: TilePreviewVariant;
} {
  if (!toolId) {
    return {
      color: "#6abf69",
      variant: "tile"
    };
  }

  const override = TOOL_PREVIEW_STYLE_OVERRIDES[toolId];

  return {
    color: override?.color ?? getActionUiConfig(toolId).accent,
    variant: "tile"
  };
}

export interface ScenePreviewState {
  landingRings: PreviewRingSpec[];
  previewColor: string;
  previewKeys: Set<string>;
  previewVariant: TilePreviewVariant;
  summonPreviews: PreviewSummonSpec[];
  wallGhostPositions: GridPosition[];
}

// Scene preview state is resolved through tool registries instead of BoardScene-specific branches.
export function resolveScenePreviewState({
  previewDescriptor,
  sessionId,
  snapshot,
  toolId
}: {
  previewDescriptor: PreviewDescriptor | null;
  sessionId: string | null;
  snapshot: GameSnapshot | null;
  toolId: ToolId | null;
}): ScenePreviewState {
  const previewStyle = getPreviewStyle(toolId);
  const resolver = toolId ? TOOL_PREVIEW_RESOLVERS[toolId] : undefined;
  const extras = resolver
    ? resolver({
        previewColor: previewStyle.color,
        previewDescriptor,
        sessionId,
        snapshot
      })
    : {};

  return {
    landingRings: [
      ...buildLandingRings(previewDescriptor, snapshot),
      ...(extras.landingRings ?? [])
    ],
    previewColor: previewStyle.color,
    previewKeys: buildPreviewKeys(previewDescriptor),
    previewVariant: previewStyle.variant,
    summonPreviews: extras.summonPreviews ?? [],
    wallGhostPositions: extras.wallGhostPositions ?? []
  };
}
