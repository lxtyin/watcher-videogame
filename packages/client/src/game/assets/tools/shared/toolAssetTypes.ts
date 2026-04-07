import type { GridPosition } from "@watcher/shared";

export interface DirectionAssetProps {
  active: boolean;
  accent: string;
}

export interface ToolEffectTileAssetProps {
  boardHeight: number;
  boardWidth: number;
  color: string;
  position: GridPosition;
}
