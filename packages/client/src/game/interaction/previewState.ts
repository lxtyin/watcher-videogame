import {
  type GameSnapshot,
  type GridPosition,
  type PreviewDescriptor,
  type ToolId
} from "@watcher/shared";
import { getActionUiConfig } from "../content/actionUi";

export interface PreviewRingSpec {
  color?: string;
  key: string;
  opacity: number;
  position: GridPosition;
  radius: number;
}

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
  return new Set((previewDescriptor?.selectionTiles ?? []).map((position) => `${position.x},${position.y}`));
}

export interface ScenePreviewState {
  effectTiles: GridPosition[];
  landingRings: PreviewRingSpec[];
  previewColor: string;
  selectionKeys: Set<string>;
}

function getPreviewColor(toolId: ToolId | null): string {
  return toolId ? getActionUiConfig(toolId).accent : "#6abf69";
}

// Scene preview state keeps selection tiles and effect tiles separate so client assets can differ cleanly.
export function resolveScenePreviewState({
  previewDescriptor,
  snapshot,
  toolId
}: {
  previewDescriptor: PreviewDescriptor | null;
  snapshot: GameSnapshot | null;
  toolId: ToolId | null;
}): ScenePreviewState {
  return {
    effectTiles: previewDescriptor?.effectTiles ?? [],
    landingRings: buildLandingRings(previewDescriptor, snapshot),
    previewColor: getPreviewColor(toolId),
    selectionKeys: buildPreviewKeys(previewDescriptor)
  };
}
