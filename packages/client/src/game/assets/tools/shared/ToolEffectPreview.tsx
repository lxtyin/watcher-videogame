import type { ComponentType } from "react";
import type { ToolId } from "@watcher/shared";
import { BuildWallEffectPreviewAsset } from "../build-wall/BuildWallEffectPreviewAsset";
import { DeployWalletEffectPreviewAsset } from "../deploy-wallet/DeployWalletEffectPreviewAsset";
import { RocketEffectPreviewTileAsset } from "../rocket/RocketEffectPreviewTileAsset";
import { ToolEffectTilePreviewAsset } from "./ToolEffectTilePreviewAsset";
import type { ToolEffectTileAssetProps } from "./toolAssetTypes";

type ToolEffectTileAssetComponent = ComponentType<ToolEffectTileAssetProps>;

const TOOL_EFFECT_TILE_ASSETS: Partial<Record<ToolId, ToolEffectTileAssetComponent>> = {
  buildWall: BuildWallEffectPreviewAsset,
  deployWallet: DeployWalletEffectPreviewAsset,
  rocket: RocketEffectPreviewTileAsset
};

// Tool effect previews reuse effectTiles and only swap the mesh asset per tool when needed.
export function ToolEffectPreview({
  boardHeight,
  boardWidth,
  color,
  effectTiles,
  toolId
}: {
  boardHeight: number;
  boardWidth: number;
  color: string;
  effectTiles: ToolEffectTileAssetProps["position"][];
  toolId: ToolId | null;
}) {
  if (!effectTiles.length) {
    return null;
  }

  const Asset = (toolId ? TOOL_EFFECT_TILE_ASSETS[toolId] : undefined) ?? ToolEffectTilePreviewAsset;

  return (
    <>
      {effectTiles.map((position, index) => (
        <Asset
          key={`tool-effect-${toolId ?? "generic"}-${position.x}-${position.y}-${index}`}
          boardHeight={boardHeight}
          boardWidth={boardWidth}
          color={color}
          position={position}
        />
      ))}
    </>
  );
}
