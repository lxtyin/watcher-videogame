import type { TileStateMap } from "./types";

export function cloneTileState(state: TileStateMap | undefined): TileStateMap {
  return { ...(state ?? {}) };
}

export function isTileStateEmpty(state: TileStateMap | undefined): boolean {
  return Object.keys(state ?? {}).length === 0;
}
