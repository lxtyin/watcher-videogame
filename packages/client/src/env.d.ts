export {};

import type { useGameStore } from "./game/state/useGameStore";
import type {
  Direction,
  GridPosition,
  SummonSnapshot,
  TileStateMap,
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
  displayedSummons: Record<
    string,
    SummonSnapshot & {
      isCreature: boolean;
      stackIndex?: number;
      stackSerial?: number;
      stackY?: number;
    }
  >;
  displayedTiles: Record<
    string,
    {
      direction: Direction | null;
      durability: number;
      state: TileStateMap;
      type: TileType;
    }
  >;
  playback: {
    activePresentationSequence: number | null;
    activePlayerMotionCount: number;
    activeSummonMotionCount: number;
    activeProjectileCount: number;
    activeReactionCount: number;
    queuedPresentationCount: number;
  };
  diceRollAnimation: {
    dice: {
      kind: "point" | "tool";
      label: string;
      resultLabel: string;
    }[];
    durationMs: number;
    elapsedMs: number;
  } | null;
  scene: {
    boardHeight: number;
    boardWidth: number;
    playerCount: number;
    summonCount: number;
    tileCount: number;
  };
}

interface WatcherRenderStats {
  calls: number;
  frameAtMs: number;
  geometries: number;
  lines: number;
  points: number;
  textures: number;
  triangles: number;
}

declare global {
  interface Window {
    render_game_to_text: (() => string) | undefined;
    render_perf_to_text: (() => string) | undefined;
    advanceTime: ((ms: number) => void) | undefined;
    project_grid_to_client:
      | ((x: number, y: number, elevation?: number) => { x: number; y: number } | null)
      | undefined;
    watcher_render_stats: WatcherRenderStats | undefined;
    watcher_store: typeof useGameStore | undefined;
    watcher_scene_debug: WatcherSceneDebugState | undefined;
  }
}
