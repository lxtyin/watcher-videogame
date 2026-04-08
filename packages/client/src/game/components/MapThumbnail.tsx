import { createBoardDefinition, type Direction, type GameMapId, type TileDefinition } from "@watcher/shared";
import { useMemo, type CSSProperties } from "react";

function getTileGlyph(tile: TileDefinition): string {
  if (tile.type === "start") {
    return "S";
  }

  if (tile.type === "goal") {
    return "G";
  }

  if (tile.type === "poison") {
    return "P";
  }

  if (tile.type === "highwall") {
    return "H";
  }

  if (tile.type === "cannon") {
    return "C";
  }

  if (tile.type === "lucky") {
    return "?";
  }

  if (tile.type === "emptyLucky") {
    return "";
  }

  if (tile.type === "conveyor") {
    const directionGlyphs: Record<Direction, string> = {
      up: "↑",
      down: "↓",
      left: "←",
      right: "→"
    };

    return tile.direction ? directionGlyphs[tile.direction] : "";
  }

  return "";
}

// Map thumbnails reuse the shared board registry so menu previews stay authoritative.
export function MapThumbnail({ mapId }: { mapId: GameMapId }) {
  const board = useMemo(() => createBoardDefinition(mapId), [mapId]);

  return (
    <div
      className="map-thumbnail"
      style={
        {
          "--map-cols": board.width,
          "--map-rows": board.height
        } as CSSProperties
      }
    >
      {board.tiles.map((tile) => (
        <div
          key={tile.key}
          className={`map-thumbnail__tile map-thumbnail__tile--${tile.type}`}
          data-direction={tile.direction ?? undefined}
        >
          {getTileGlyph(tile)}
        </div>
      ))}
    </div>
  );
}
