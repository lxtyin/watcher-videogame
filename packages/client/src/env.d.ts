export {};

import type { useGameStore } from "./game/state/useGameStore";
import type {
  Direction,
  GridPosition,
  SummonSnapshot,
  TileType
} from "@watcher/shared";

interface WatcherSceneDebugState {
  inspectionCard:
    | {
        accent: string;
        description: string;
        direction?: Direction | null;
        kindLabel: string;
        subtitle?: string;
        thumbnailToken: string;
        title: string;
      }
    | null;
  displayedPlayers: Record<
    string,
    GridPosition & {
      color: string;
      isActive: boolean;
      stackSerial: number;
      stackIndex: number;
      stackY: number;
    }
  >;
  displayedSummons: Record<string, SummonSnapshot>;
  displayedTiles: Record<
    string,
    {
      direction: Direction | null;
      durability: number;
      type: TileType;
    }
  >;
}

declare global {
  interface Window {
    render_game_to_text: (() => string) | undefined;
    advanceTime: ((ms: number) => void) | undefined;
    project_grid_to_client:
      | ((x: number, y: number, elevation?: number) => { x: number; y: number } | null)
      | undefined;
    watcher_store: typeof useGameStore | undefined;
    watcher_scene_debug: WatcherSceneDebugState | undefined;
  }
}
