import type { ThreeEvent } from "@react-three/fiber";
import type { ComponentType } from "react";
import type { SummonId, SummonSnapshot } from "@watcher/shared";
import { WalletSummonAsset } from "../tools/deploy-wallet/WalletSummonAsset";

interface SummonAssetProps {
  boardHeight: number;
  boardWidth: number;
  color: string;
  opacity?: number;
  position: SummonSnapshot["position"];
}

type SummonAssetComponent = ComponentType<SummonAssetProps>;

const SUMMON_ASSETS: Record<SummonId, SummonAssetComponent> = {
  wallet: WalletSummonAsset
};

// Summon visuals resolve through a registry so BoardScene does not switch on summon ids.
export function SummonVisual({
  boardHeight,
  boardWidth,
  color,
  opacity,
  onPointerDown,
  summon
}: {
  boardHeight: number;
  boardWidth: number;
  color: string;
  opacity?: number;
  onPointerDown?: (event: ThreeEvent<PointerEvent>) => void;
  summon: SummonSnapshot;
}) {
  const Asset = SUMMON_ASSETS[summon.summonId];
  const pointerProps = onPointerDown ? { onPointerDown } : {};
  const assetProps =
    opacity === undefined
      ? {
          boardHeight,
          boardWidth,
          color,
          position: summon.position
        }
      : {
          boardHeight,
          boardWidth,
          color,
          opacity,
          position: summon.position
        };

  return (
    <group {...pointerProps}>
      <Asset {...assetProps} />
    </group>
  );
}
