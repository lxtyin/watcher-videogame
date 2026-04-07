import type { ComponentType } from "react";
import type { PresentationAnchor, PresentationLinkStyle } from "@watcher/shared";
import type { ActiveLinkReactionPlayback } from "../../animation/playbackEngine";
import { HookshotLinkReactionAsset } from "../tools/hookshot/HookshotLinkReactionAsset";
import { toWorldPositionFromGrid } from "../shared/gridPlacement";

interface LinkReactionAssetProps {
  fromWorldX: number;
  fromWorldZ: number;
  progress: number;
  toWorldX: number;
  toWorldZ: number;
}

type LinkReactionAssetComponent = ComponentType<LinkReactionAssetProps>;

const LINK_REACTION_ASSETS: Record<PresentationLinkStyle, LinkReactionAssetComponent> = {
  chain: HookshotLinkReactionAsset
};

function resolveAnchorPosition(
  anchor: PresentationAnchor,
  playerPositions: Record<string, { x: number; y: number }>
): { x: number; y: number } | null {
  if (anchor.kind === "position") {
    return anchor.position;
  }

  return playerPositions[anchor.playerId] ?? null;
}

export function LinkReactionVisual({
  boardHeight,
  boardWidth,
  playerPositions,
  reaction
}: {
  boardHeight: number;
  boardWidth: number;
  playerPositions: Record<string, { x: number; y: number }>;
  reaction: ActiveLinkReactionPlayback;
}) {
  const fromPosition = resolveAnchorPosition(reaction.from, playerPositions);
  const toPosition = resolveAnchorPosition(reaction.to, playerPositions);

  if (!fromPosition || !toPosition) {
    return null;
  }

  const displayedToPosition =
    reaction.progressStyle === "extend_from_from"
      ? {
          x: fromPosition.x + (toPosition.x - fromPosition.x) * reaction.progress,
          y: fromPosition.y + (toPosition.y - fromPosition.y) * reaction.progress
        }
      : toPosition;

  const [fromWorldX, , fromWorldZ] = toWorldPositionFromGrid(
    fromPosition.x,
    fromPosition.y,
    boardWidth,
    boardHeight
  );
  const [toWorldX, , toWorldZ] = toWorldPositionFromGrid(
    displayedToPosition.x,
    displayedToPosition.y,
    boardWidth,
    boardHeight
  );
  const Asset = LINK_REACTION_ASSETS[reaction.style];

  return (
    <Asset
      fromWorldX={fromWorldX}
      fromWorldZ={fromWorldZ}
      progress={reaction.progress}
      toWorldX={toWorldX}
      toWorldZ={toWorldZ}
    />
  );
}
