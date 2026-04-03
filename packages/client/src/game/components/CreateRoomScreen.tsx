import { getGameMapDefinition, getGameMapIds, type GameMapId } from "@watcher/shared";
import { useMemo, useRef, useState, type CSSProperties } from "react";
import { MapThumbnail } from "./MapThumbnail";

interface CreateRoomScreenProps {
  busy: boolean;
  lastError: string | null;
  mapId: GameMapId;
  onBack: () => void;
  onCreateRoom: () => Promise<void>;
  onMapIdChange: (mapId: GameMapId) => void;
}

function describeMapMode(mode: "free" | "race"): string {
  return mode === "race" ? "竞速模式" : "自由模式";
}

function getWrappedMapId(mapIds: GameMapId[], currentMapId: GameMapId, offset: number): GameMapId {
  const currentIndex = Math.max(0, mapIds.indexOf(currentMapId));
  const nextIndex = (currentIndex + offset + mapIds.length) % mapIds.length;
  return mapIds[nextIndex] ?? currentMapId;
}

// The create-room screen keeps map choice focused and centered around one large preview.
export function CreateRoomScreen({
  busy,
  lastError,
  mapId,
  onBack,
  onCreateRoom,
  onMapIdChange
}: CreateRoomScreenProps) {
  const mapIds = useMemo(() => getGameMapIds(), []);
  const activeMapId = mapIds.includes(mapId) ? mapId : (mapIds[0] ?? mapId);
  const activeDefinition = getGameMapDefinition(activeMapId);
  const [dragOffset, setDragOffset] = useState(0);
  const pointerStartXRef = useRef<number | null>(null);

  const commitSwipe = (deltaX: number) => {
    if (Math.abs(deltaX) > 56) {
      onMapIdChange(getWrappedMapId(mapIds, activeMapId, deltaX < 0 ? 1 : -1));
    }

    setDragOffset(0);
    pointerStartXRef.current = null;
  };

  return (
    <div className="create-room-shell">
      <button
        type="button"
        className="ghost-button create-room-back-button"
        data-testid="create-room-back"
        onClick={onBack}
      >
        返回
      </button>

      <section className="create-room-stage">
        <p className="eyebrow">Create Room</p>
        <h1 className="create-room-title">{activeDefinition.label}</h1>

        <div className="create-room-carousel">
          <button
            type="button"
            className="create-room-arrow"
            data-testid="create-map-prev"
            aria-label="选择上一张地图"
            onClick={() => onMapIdChange(getWrappedMapId(mapIds, activeMapId, -1))}
          >
            ‹
          </button>

          <div
            className="create-room-preview-card"
            style={{ "--drag-offset": `${dragOffset}px` } as CSSProperties}
            onPointerDown={(event) => {
              pointerStartXRef.current = event.clientX;
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              if (pointerStartXRef.current === null) {
                return;
              }

              setDragOffset(Math.max(-88, Math.min(88, event.clientX - pointerStartXRef.current)));
            }}
            onPointerUp={(event) => {
              if (pointerStartXRef.current === null) {
                return;
              }

              event.currentTarget.releasePointerCapture(event.pointerId);
              commitSwipe(event.clientX - pointerStartXRef.current);
            }}
            onPointerCancel={() => {
              setDragOffset(0);
              pointerStartXRef.current = null;
            }}
          >
            <MapThumbnail mapId={activeMapId} />

            <div className="create-room-preview-meta">
              <span className="create-room-mode-pill">{describeMapMode(activeDefinition.mode)}</span>
              <p>{activeDefinition.description}</p>
            </div>
          </div>

          <button
            type="button"
            className="create-room-arrow"
            data-testid="create-map-next"
            aria-label="选择下一张地图"
            onClick={() => onMapIdChange(getWrappedMapId(mapIds, activeMapId, 1))}
          >
            ›
          </button>
        </div>

        <div className="create-room-dots" role="tablist" aria-label="地图选择">
          {mapIds.map((entry) => (
            <button
              key={entry}
              type="button"
              role="tab"
              aria-selected={entry === activeMapId}
              className={`create-room-dot${entry === activeMapId ? " selected" : ""}`}
              data-testid={`create-map-option-${entry}`}
              onClick={() => onMapIdChange(entry)}
            />
          ))}
        </div>

        <button
          type="button"
          className="create-room-submit"
          data-testid="create-room-submit"
          disabled={busy}
          onClick={() => void onCreateRoom()}
        >
          {busy ? "创建中..." : "创建房间"}
        </button>

        {lastError ? <p className="error-copy home-error">{lastError}</p> : null}
      </section>
    </div>
  );
}
