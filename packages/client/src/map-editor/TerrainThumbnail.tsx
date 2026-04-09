import type { TerrainLibraryEntry } from "./terrainCatalog";

export function TerrainThumbnail({
  entry,
  thumbnailUrl
}: {
  entry: TerrainLibraryEntry;
  thumbnailUrl: string | null;
}) {
  return (
    <div className="terrain-thumbnail" aria-hidden="true">
      {thumbnailUrl ? (
        <img alt="" draggable={false} src={thumbnailUrl} />
      ) : (
        <div className="terrain-thumbnail__fallback">{entry.symbol}</div>
      )}
    </div>
  );
}
