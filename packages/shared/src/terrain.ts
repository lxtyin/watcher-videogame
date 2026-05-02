import { toTileKey } from "./board";
import type { TextDescription } from "./content/schema";
import type { GridPosition, TileDefinition } from "./types";
import type { ResolutionDraft } from "./rules/actionDraft";
import { getMovementTimingForPlayer } from "./rules/displacement";
import { getTerrainModule } from "./terrain-modules";
import type { PassThroughTerrainState } from "./terrain-modules/types";

// Pass-through terrain runs during displacement, so remaining move points and direction can change immediately.
export function resolvePassThroughTerrainEffect(
  draft: ResolutionDraft,
  context: {
    movement: import("./types").MovementDescriptor;
    startMs: number;
    state: PassThroughTerrainState;
    tile: TileDefinition;
  }
): void {
  const terrainDefinition = getTerrainModule(context.tile.type);

  if (!terrainDefinition?.onPassThrough) {
    return;
  }

  terrainDefinition.onPassThrough({
    draft,
    movement: context.movement,
    movementTiming: getMovementTimingForPlayer(draft.actorId, context.state.player.id),
    startMs: context.startMs,
    state: context.state,
    tile: context.tile
  });
}

// Stop terrain resolves when a displacement ends or when phase-entry stop processing runs on a tile.
export function resolveStopTerrainEffect(
  draft: ResolutionDraft,
  context: {
    movement: import("./types").MovementDescriptor | null;
    player: import("./types").MovementActor;
    position: GridPosition;
    startMs: number;
    tile: TileDefinition;
  }
): void {
  const terrainDefinition = getTerrainModule(context.tile.type);

  if (!terrainDefinition?.onStop) {
    return;
  }

  terrainDefinition.onStop({
    draft,
    movement: context.movement,
    movementTiming: getMovementTimingForPlayer(draft.actorId, context.player.id),
    player: context.player,
    position: context.position,
    startMs: context.startMs,
    tile: context.tile
  });
}

export function resolveImpactTerrainEffect(
  draft: ResolutionDraft,
  context: {
    direction: import("./types").Direction;
    position: GridPosition;
    source: import("./terrain-modules/types").TerrainImpactSource;
    startMs: number;
    strength: number;
    tile: TileDefinition;
  }
): void {
  const terrainDefinition = getTerrainModule(context.tile.type);

  if (!terrainDefinition?.onImpact) {
    return;
  }

  terrainDefinition.onImpact({
    direction: context.direction,
    draft,
    position: context.position,
    source: context.source,
    startMs: context.startMs,
    strength: context.strength,
    tile: context.tile
  });
}

// Terrain events reuse normal tile keys so logs and visuals refer to the same cell id.
export function getTerrainTileKey(position: GridPosition): string {
  return toTileKey(position);
}

export function getTerrainTextDescription(tile: TileDefinition): TextDescription {
  return getTerrainModule(tile.type).getTextDescription(tile);
}

export function getTerrainAccent(tileType: TileDefinition["type"]): string {
  return getTerrainModule(tileType).accent;
}
