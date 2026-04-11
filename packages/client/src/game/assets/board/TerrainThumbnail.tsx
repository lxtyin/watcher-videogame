import type { TerrainThumbnailEntry } from "./terrainThumbnailCatalog";

export function TerrainThumbnail({
  entry,
  thumbnailUrl
}: {
  entry: TerrainThumbnailEntry;
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
