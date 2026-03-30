import type { ComponentType } from "react";
import type { SummonId, SummonSnapshot } from "@watcher/shared";
import { WalletSummonAsset } from "./WalletSummonAsset";

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
  summon
}: {
  boardHeight: number;
  boardWidth: number;
  color: string;
  opacity?: number;
  summon: SummonSnapshot;
}) {
  const Asset = SUMMON_ASSETS[summon.summonId];
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

  return <Asset {...assetProps} />;
}
