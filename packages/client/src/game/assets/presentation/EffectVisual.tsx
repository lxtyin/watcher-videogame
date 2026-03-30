import type { ComponentType } from "react";
import type { PresentationEffectType } from "@watcher/shared";
import type { ActiveEffectPlayback } from "../../animation/presentationPlayback";
import { RocketExplosionEffectAsset } from "./RocketExplosionEffectAsset";

interface EffectAssetProps {
  boardHeight: number;
  boardWidth: number;
  position: ActiveEffectPlayback["position"];
  progress: number;
  tiles: ActiveEffectPlayback["tiles"];
}

type EffectAssetComponent = ComponentType<EffectAssetProps>;

const EFFECT_ASSETS: Record<PresentationEffectType, EffectAssetComponent> = {
  rocket_explosion: RocketExplosionEffectAsset
};

// Effects resolve from semantic effect ids so visuals can evolve without touching BoardScene.
export function EffectVisual({
  boardHeight,
  boardWidth,
  effect
}: {
  boardHeight: number;
  boardWidth: number;
  effect: ActiveEffectPlayback;
}) {
  const Asset = EFFECT_ASSETS[effect.effectType];

  return (
    <Asset
      boardHeight={boardHeight}
      boardWidth={boardWidth}
      position={effect.position}
      progress={effect.progress}
      tiles={effect.tiles}
    />
  );
}
