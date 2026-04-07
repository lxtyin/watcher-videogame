import { WalletSummonAsset } from "./WalletSummonAsset";
import type { ToolEffectTileAssetProps } from "../shared/toolAssetTypes";

// Wallet deployment preview reuses the summon mesh with reduced opacity.
export function DeployWalletEffectPreviewAsset({
  boardHeight,
  boardWidth,
  color,
  position
}: ToolEffectTileAssetProps) {
  return (
    <WalletSummonAsset
      boardHeight={boardHeight}
      boardWidth={boardWidth}
      color={color}
      opacity={0.45}
      position={position}
    />
  );
}
