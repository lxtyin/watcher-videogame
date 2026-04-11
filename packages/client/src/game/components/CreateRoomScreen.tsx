import { useMemo, useRef, useState, type CSSProperties } from "react";
import { getGameMapDefinition, getGameMapIds, type GameMapId } from "@watcher/shared";
import { UiIcon } from "../assets/ui/icons";
import { CreateRoomMapPreview } from "./CreateRoomMapPreview";

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
  const [transitionDirection, setTransitionDirection] = useState<"next" | "previous">("next");
  const [transitionKey, setTransitionKey] = useState(0);
  const pointerStartXRef = useRef<number | null>(null);

  const changeMapByOffset = (offset: number) => {
    if (!offset) {
      return;
    }

    const nextMapId = getWrappedMapId(mapIds, activeMapId, offset);

    if (nextMapId === activeMapId) {
      return;
    }

    setTransitionDirection(offset > 0 ? "next" : "previous");
    setTransitionKey((current) => current + 1);
    onMapIdChange(nextMapId);
  };

  const commitSwipe = (deltaX: number) => {
    if (Math.abs(deltaX) > 56) {
      changeMapByOffset(deltaX < 0 ? 1 : -1);
    }

    setDragOffset(0);
    pointerStartXRef.current = null;
  };

  return (
    <div
      className="create-room-shell"
      style={{ "--drag-offset": `${dragOffset}px` } as CSSProperties}
      onPointerDown={(event) => {
        if (event.target instanceof Element && event.target.closest("button")) {
          return;
        }

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
      <CreateRoomMapPreview
        mapId={activeMapId}
        transitionDirection={transitionDirection}
        transitionKey={transitionKey}
      />

      <button
        type="button"
        className="ghost-button create-room-back-button"
        data-testid="create-room-back"
        onClick={onBack}
      >
        <UiIcon name="return" />
      </button>

      <button
        type="button"
        className="create-room-arrow create-room-arrow--previous"
        data-testid="create-map-prev"
        aria-label="选择上一张地图"
        onClick={() => changeMapByOffset(-1)}
      >
        <UiIcon name="chevron-left" />
      </button>

      <section className="create-room-stage">
        <h1 className="create-room-title">{activeDefinition.label}</h1>

        <div className="create-room-preview-meta">
          <p>{activeDefinition.description}</p>
          <span className="create-room-mode-pill">{describeMapMode(activeDefinition.mode)}</span>
        </div>
      </section>

      <div className="create-room-control-bar">
        <button
          type="button"
          className="create-room-submit"
          data-testid="create-room-submit"
          disabled={busy}
          onClick={() => void onCreateRoom()}
        >
          {busy ? "创建中..." : "创建房间"}
        </button>
      </div>

      {lastError ? <p className="error-copy home-error create-room-error">{lastError}</p> : null}

      <button
        type="button"
        className="create-room-arrow create-room-arrow--next"
        data-testid="create-map-next"
        aria-label="选择下一张地图"
        onClick={() => changeMapByOffset(1)}
      >
        <UiIcon name="chevron-right" />
      </button>
    </div>
  );
}
