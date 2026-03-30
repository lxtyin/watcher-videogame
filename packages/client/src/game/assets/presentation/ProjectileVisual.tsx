import type { ComponentType } from "react";
import type { PresentationProjectileType } from "@watcher/shared";
import type { ActiveProjectilePlayback } from "../../animation/presentationPlayback";
import { toWorldPositionFromGrid } from "../shared/gridPlacement";
import { BasketballProjectileAsset } from "./BasketballProjectileAsset";
import { RocketProjectileAsset } from "./RocketProjectileAsset";

interface ProjectileAssetProps {
  lift: number;
  progress: number;
  worldX: number;
  worldZ: number;
}

type ProjectileAssetComponent = ComponentType<ProjectileAssetProps>;

const PROJECTILE_ASSETS: Record<PresentationProjectileType, ProjectileAssetComponent> = {
  basketball: BasketballProjectileAsset,
  rocket: RocketProjectileAsset
};

// Projectiles resolve by semantic projectile type so playback stays declarative.
export function ProjectileVisual({
  boardHeight,
  boardWidth,
  projectile
}: {
  boardHeight: number;
  boardWidth: number;
  projectile: ActiveProjectilePlayback;
}) {
  const [worldX, , worldZ] = toWorldPositionFromGrid(
    projectile.position.x,
    projectile.position.y,
    boardWidth,
    boardHeight
  );
  const Asset = PROJECTILE_ASSETS[projectile.projectileType];

  return (
    <Asset
      lift={projectile.position.lift}
      progress={projectile.progress}
      worldX={worldX}
      worldZ={worldZ}
    />
  );
}
