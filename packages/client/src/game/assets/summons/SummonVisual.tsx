import type { ThreeEvent } from "@react-three/fiber";
import type { ComponentType } from "react";
import type { SummonId, SummonSnapshot } from "@watcher/shared";
import { WalletSummonAsset } from "../tools/deploy-wallet/WalletSummonAsset";
import { toWorldPosition } from "../../utils/boardMath";
import { DicePigSummonAsset } from "./DicePigSummonAsset";

interface SummonAssetProps {
  color: string;
  opacity?: number;
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
  opacity,
  onPointerDown,
  positionY = 0,
  rotation = [0, 0, 0],
  summon
}: {
  boardHeight: number;
  boardWidth: number;
  color: string;
  opacity?: number;
  onPointerDown?: (event: ThreeEvent<PointerEvent>) => void;
  positionY?: number;
  rotation?: [number, number, number];
  summon: SummonSnapshot;
}) {
  const Asset = SUMMON_ASSETS[summon.summonId];
  const pointerProps = onPointerDown ? { onPointerDown } : {};
  const [x, , z] = toWorldPosition(summon.position, boardWidth, boardHeight);
  const assetProps = opacity === undefined ? { color } : { color, opacity };

  return (
    <group {...pointerProps} position={[x, 0, z]}>
      <group position={[0, positionY, 0]} rotation={rotation}>
        <Asset {...assetProps} />
      </group>
    </group>
  );
}
