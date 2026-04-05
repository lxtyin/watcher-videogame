import type { ComponentType } from "react";
import type { PresentationEffectType } from "@watcher/shared";
import type { ActiveEffectReactionPlayback } from "../../animation/playbackEngine";
import { RocketExplosionEffectAsset } from "./RocketExplosionEffectAsset";

interface EffectAssetProps {
  boardHeight: number;
  boardWidth: number;
  position: ActiveEffectReactionPlayback["position"];
  progress: number;
  tiles: ActiveEffectReactionPlayback["tiles"];
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
  effect: ActiveEffectReactionPlayback;
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
