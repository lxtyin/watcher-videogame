import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { BoardTileVisual } from "./BoardTileVisual";
import type { TerrainThumbnailEntry } from "./terrainThumbnailCatalog";

function ThumbnailCaptureScene({
  entry,
  onCaptured
}: {
  entry: TerrainThumbnailEntry;
  onCaptured: (url: string) => void;
}) {
  const capturedRef = useRef(false);
  const frameCountRef = useRef(0);

  useEffect(() => {
    capturedRef.current = false;
    frameCountRef.current = 0;
  }, [entry.symbol]);

  useFrame(({ gl }) => {
    if (capturedRef.current) {
      return;
    }

    frameCountRef.current += 1;

    if (frameCountRef.current < 2) {
      return;
    }

    capturedRef.current = true;
    onCaptured(gl.domElement.toDataURL("image/png"));
  });

  return (
    <>
      <ambientLight intensity={1.15} />
      <directionalLight intensity={1.2} position={[4, 6, 3]} />
      <BoardTileVisual
        key={entry.symbol}
        boardHeight={1}
        boardWidth={1}
        selectionActive={false}
        selectionColor="#ffffff"
        tile={entry.tile}
      />
    </>
  );
}

export function TerrainThumbnailCaptureDeck({
  entries,
  thumbnailUrls,
  onCapture
}: {
  entries: readonly TerrainThumbnailEntry[];
  thumbnailUrls: Partial<Record<string, string>>;
  onCapture: (symbol: string, url: string) => void;
}) {
  const pendingEntry = useMemo(
    () => entries.find((entry) => !thumbnailUrls[entry.symbol]) ?? null,
    [entries, thumbnailUrls]
  );

  if (!pendingEntry) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      style={{
        height: "96px",
        left: "-9999px",
        opacity: 0,
        pointerEvents: "none",
        position: "fixed",
        top: "-9999px",
        width: "96px"
      }}
    >
      <Canvas
        camera={{ position: [2.2, 2.8, 2.2], fov: 34 }}
        dpr={1}
        frameloop="always"
        gl={{ alpha: true, preserveDrawingBuffer: true }}
        shadows={false}
        style={{ height: "96px", width: "96px" }}
      >
        <ThumbnailCaptureScene
          entry={pendingEntry}
          onCaptured={(url) => onCapture(pendingEntry.symbol, url)}
        />
      </Canvas>
    </div>
  );
}
