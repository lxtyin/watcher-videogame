import type { ThreeEvent } from "@react-three/fiber";
import type { ComponentType } from "react";
import type { GridPosition, SummonId, SummonSnapshot } from "@watcher/shared";
import { WalletSummonAsset } from "../tools/deploy-wallet/WalletSummonAsset";
import { toWorldPositionFromGrid } from "../shared/gridPlacement";
import { DicePigSummonAsset } from "./DicePigSummonAsset";

interface SummonAssetProps {
  color: string;
  opacity?: number;
  summon: SummonSnapshot;
}

type SummonAssetComponent = ComponentType<SummonAssetProps>;

const SUMMON_ASSETS: Record<SummonId, SummonAssetComponent> = {
  dicePig: DicePigSummonAsset,
  wallet: WalletSummonAsset
};

// Summon visuals resolve through a registry so BoardScene does not switch on summon ids.
export function SummonVisual({
  boardHeight,
  boardWidth,
  color,
  gridPosition,
  opacity,
  onPointerDown,
  positionY = 0,
  renderOrder,
  rotation = [0, 0, 0],
  summon
}: {
  boardHeight: number;
  boardWidth: number;
  color: string;
  gridPosition?: GridPosition;
  opacity?: number;
  onPointerDown?: (event: ThreeEvent<PointerEvent>) => void;
  positionY?: number;
  renderOrder?: number;
  rotation?: [number, number, number];
  summon: SummonSnapshot;
}) {
  const Asset = SUMMON_ASSETS[summon.summonId];
  const pointerProps = onPointerDown ? { onPointerDown } : {};
  const renderOrderProps = renderOrder === undefined ? {} : { renderOrder };
  const position = gridPosition ?? summon.position;
  const [x, , z] = toWorldPositionFromGrid(position.x, position.y, boardWidth, boardHeight);
  const assetProps = opacity === undefined ? { color, summon } : { color, opacity, summon };

  return (
    <group {...pointerProps} {...renderOrderProps} position={[x, 0, z]}>
      <group position={[0, positionY, 0]} rotation={rotation}>
        <Asset {...assetProps} />
      </group>
    </group>
  );
}
