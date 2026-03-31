import {
  getToolDefinition,
  type ActionResolution,
  type GameSnapshot,
  type GridPosition,
  type PlayerSnapshot,
  type SummonSnapshot,
  type ToolId
} from "@watcher/shared";
import { getActionUiConfig } from "../content/actionUi";

export type TilePreviewVariant = "tile" | "blast";

export interface PreviewRingSpec {
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
  actor: PlayerSnapshot | null;
  displayedPlayerPositions: Record<string, GridPosition>;
  previewColor: string;
  previewResolution: ActionResolution | null;
  sessionId: string | null;
  snapshot: GameSnapshot | null;
}

type ToolPreviewResolver = (context: ToolPreviewResolverContext) => ScenePreviewExtras;

const TOOL_PREVIEW_STYLE_OVERRIDES: Partial<
  Record<ToolId, { color?: string; variant?: TilePreviewVariant }>
> = {
  rocket: {
    color: "#f15a49",
    variant: "blast"
  }
};

const TOOL_PREVIEW_RESOLVERS: Partial<Record<ToolId, ToolPreviewResolver>> = {
  hookshot: ({ displayedPlayerPositions, previewColor, previewResolution, snapshot }) => {
    if (
      !snapshot ||
      previewResolution?.kind !== "applied" ||
      !previewResolution.affectedPlayers.length
    ) {
      return {};
    }

    return {
      landingRings: previewResolution.affectedPlayers.flatMap((affectedPlayer, index) => {
        const player = snapshot.players.find((entry) => entry.id === affectedPlayer.playerId);

        if (!player) {
          return [];
        }

        return [
          {
            key: `hookshot-preview-${affectedPlayer.playerId}-${index}`,
            opacity: 0.68,
            position: displayedPlayerPositions[player.id] ?? player.position,
            radius: 0.52
          }
        ];
      })
    };
  },
  buildWall: ({ previewResolution }) => ({
    wallGhostPositions:
      previewResolution?.kind === "applied"
        ? previewResolution.tileMutations
            .filter((mutation) => mutation.nextType === "earthWall")
            .map((mutation) => mutation.position)
        : []
  }),
  deployWallet: ({ previewColor, previewResolution, sessionId }) => ({
    summonPreviews:
      previewResolution?.kind === "applied"
        ? previewResolution.summonMutations.flatMap((mutation, index) =>
            mutation.kind === "upsert" && mutation.summonId === "wallet"
              ? [
                  {
                    key: `preview-wallet-${mutation.position.x}-${mutation.position.y}-${index}`,
                    color: previewColor,
                    opacity: 0.45,
                    summon: {
                      instanceId: `preview-wallet-${mutation.position.x}-${mutation.position.y}-${index}`,
                      ownerId: sessionId ?? "preview",
                      position: mutation.position,
                      summonId: "wallet"
                    }
                  }
                ]
              : []
          )
        : []
  })
};

function buildDefaultLandingRing(
  actor: PlayerSnapshot | null,
  previewResolution: ActionResolution | null
): PreviewRingSpec[] {
  if (!actor || previewResolution?.kind !== "applied") {
    return [];
  }

  if (
    previewResolution.actor.position.x === actor.position.x &&
    previewResolution.actor.position.y === actor.position.y
  ) {
    return [];
  }

  return [
    {
      key: `landing-preview-${previewResolution.actor.position.x}-${previewResolution.actor.position.y}`,
      opacity: 0.72,
      position: previewResolution.actor.position,
      radius: 0.56
    }
  ];
}

function buildPreviewKeys(previewResolution: ActionResolution | null): Set<string> {
  return new Set(
    previewResolution?.previewTiles.map((position) => `${position.x},${position.y}`) ?? []
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
    variant: override?.variant ?? "tile"
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
  actor,
  displayedPlayerPositions,
  previewResolution,
  sessionId,
  snapshot,
  toolId
}: {
  actor: PlayerSnapshot | null;
  displayedPlayerPositions: Record<string, GridPosition>;
  previewResolution: ActionResolution | null;
  sessionId: string | null;
  snapshot: GameSnapshot | null;
  toolId: ToolId | null;
}): ScenePreviewState {
  const previewStyle = getPreviewStyle(toolId);
  const resolver = toolId ? TOOL_PREVIEW_RESOLVERS[toolId] : undefined;
  const extras = resolver
    ? resolver({
        actor,
        displayedPlayerPositions,
        previewColor: previewStyle.color,
        previewResolution,
        sessionId,
        snapshot
      })
    : {};

  return {
    landingRings: [
      ...buildDefaultLandingRing(actor, previewResolution),
      ...(extras.landingRings ?? [])
    ],
    previewColor: previewStyle.color,
    previewKeys: buildPreviewKeys(previewResolution),
    previewVariant: previewStyle.variant,
    summonPreviews: extras.summonPreviews ?? [],
    wallGhostPositions: extras.wallGhostPositions ?? []
  };
}
