import {
  DEFAULT_BOARD_LAYOUT,
  createInitialSummonsFromLayout,
  createBoardDefinitionFromLayout,
  getLayoutWidth,
  layoutCellHasInitialSummon,
  resizeBoardLayout,
  setLayoutCellDescriptor,
  type GameMode,
  type GridPosition
} from "@watcher/shared";
import { useEffect, useMemo, useState } from "react";
import { UiIcon } from "../game/assets/ui/icons";
import { TerrainThumbnailCaptureDeck } from "../game/assets/board/TerrainThumbnailCaptureDeck";
import { TerrainThumbnail } from "../game/assets/board/TerrainThumbnail";
import { getStoredPlayerProfile, useWatcherConnection } from "../game/network/useWatcherConnection";
import { useGameStore } from "../game/state/useGameStore";
import { formatMapEditorDocument, parseMapEditorDocument, type MapEditorDocumentLike } from "./layoutFormat";
import { MapEditorCanvas } from "./MapEditorCanvas";
import {
  expandTerrainLibraryEntriesForCapture,
  isTerrainEntrySelected,
  resolveTerrainEntrySelectionSymbol,
  resolveSelectedTerrain,
  cycleTerrainSymbolVariant,
  TERRAIN_LIBRARY_ENTRIES
} from "./terrainCatalog";

function createInitialDocument(): MapEditorDocumentLike {
  return {
    allowDebugTools: true,
    layout: [...DEFAULT_BOARD_LAYOUT],
    mapLabel: "未命名地图",
    mode: "free"
  };
}

const INITIAL_DOCUMENT = createInitialDocument();

function normalizeSizeInput(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(1, parsed);
}

function navigateToHome(): void {
  window.location.assign("/");
}

function navigateToRoom(roomCode: string): void {
  const url = new URL(window.location.href);
  url.pathname = "/";
  url.search = "";
  url.searchParams.set("room", roomCode);
  window.location.assign(url.toString());
}

export function MapEditorApp() {
  const [documentState, setDocumentState] = useState<MapEditorDocumentLike>(() => INITIAL_DOCUMENT);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(".");
  const [hoveredPosition, setHoveredPosition] = useState<GridPosition | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isPainting, setIsPainting] = useState(false);
  const [importText, setImportText] = useState("");
  const [sizeWidthInput, setSizeWidthInput] = useState(() => String(getLayoutWidth(INITIAL_DOCUMENT.layout)));
  const [sizeHeightInput, setSizeHeightInput] = useState(() => String(INITIAL_DOCUMENT.layout.length));
  const [thumbnailUrls, setThumbnailUrls] = useState<Partial<Record<string, string>>>({});
  const snapshot = useGameStore((state) => state.snapshot);
  const connectionStatus = useGameStore((state) => state.connectionStatus);
  const lastError = useGameStore((state) => state.lastError);
  const { createRoom } = useWatcherConnection(null);
  const storedProfile = useMemo(() => getStoredPlayerProfile(), []);
  const selectedTerrain = useMemo(() => resolveSelectedTerrain(selectedSymbol), [selectedSymbol]);
  const thumbnailEntries = useMemo(
    () => expandTerrainLibraryEntriesForCapture(TERRAIN_LIBRARY_ENTRIES),
    []
  );
  const board = useMemo(
    () => createBoardDefinitionFromLayout(documentState.layout),
    [documentState.layout]
  );
  const editorSummons = useMemo(
    () => createInitialSummonsFromLayout(documentState.layout),
    [documentState.layout]
  );
  const createRoomBusy = connectionStatus === "connecting";

  useEffect(() => {
    setSizeWidthInput(String(getLayoutWidth(documentState.layout)));
    setSizeHeightInput(String(documentState.layout.length));
  }, [documentState.layout]);

  useEffect(() => {
    const handlePointerUp = () => {
      setIsPainting(false);
    };

    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "r") {
        return;
      }

      const target = event.target;

      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        return;
      }

      const rotatedSymbol = cycleTerrainSymbolVariant(selectedSymbol);

      if (rotatedSymbol === selectedSymbol) {
        return;
      }

      event.preventDefault();
      setSelectedSymbol(rotatedSymbol);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedSymbol]);

  useEffect(() => {
    const renderEditorToText = () =>
      JSON.stringify({
        route: "mapeditor",
        label: documentState.mapLabel,
        mode: documentState.mode,
        allowDebugTools: documentState.allowDebugTools,
        size: {
          width: board.width,
          height: board.height
        },
        selectedSymbol,
        summonCount: editorSummons.length,
        hoveredPosition,
        painting: isPainting
      });

    window.render_game_to_text = renderEditorToText;

    return () => {
      window.render_game_to_text = undefined;
    };
  }, [board.height, board.width, documentState.allowDebugTools, documentState.mapLabel, documentState.mode, editorSummons.length, hoveredPosition, isPainting, selectedSymbol]);

  return (
    <div className="map-editor-shell" onContextMenu={(event) => {
      event.preventDefault();
      setSelectedSymbol(null);
      setIsPainting(false);
    }}>
      <TerrainThumbnailCaptureDeck
        entries={thumbnailEntries}
        thumbnailUrls={thumbnailUrls}
        onCapture={(symbol, url) => {
          setThumbnailUrls((current) => {
            if (current[symbol] === url) {
              return current;
            }

            return {
              ...current,
              [symbol]: url
            };
          });
        }}
      />
      <aside className="map-editor-sidebar">
        <div className="brand-block">
          <p className="eyebrow">Map Editor</p>
          <h1>地图编辑器</h1>
          <p className="lead">复用现有地形与棋盘渲染，直接编辑 shared 布局文本并一键开房测试。</p>
        </div>

        <section className="map-editor-card">
          <p className="section-title">基础信息</p>
          <label className="home-field">
            <span>地图名称</span>
            <input
              value={documentState.mapLabel}
              onChange={(event) =>
                setDocumentState((current) => ({
                  ...current,
                  mapLabel: event.target.value
                }))
              }
            />
          </label>

          <label className="home-field">
            <span>玩法模式</span>
            <select
              value={documentState.mode}
              onChange={(event) =>
                setDocumentState((current) => ({
                  ...current,
                  mode: event.target.value as GameMode
                }))
              }
            >
              <option value="free">自由模式</option>
              <option value="race">竞速模式</option>
              <option value="bedwars">起床战争</option>
            </select>
          </label>

          <label className="map-editor-checkbox">
            <input
              checked={documentState.allowDebugTools}
              type="checkbox"
              onChange={(event) =>
                setDocumentState((current) => ({
                  ...current,
                  allowDebugTools: event.target.checked
                }))
              }
            />
            <span>允许作弊工具</span>
          </label>
        </section>

        <section className="map-editor-card">
          <p className="section-title">地图尺寸</p>
          <div className="map-editor-size-row">
            <label className="home-field">
              <span>宽度</span>
              <input value={sizeWidthInput} onChange={(event) => setSizeWidthInput(event.target.value)} />
            </label>
            <label className="home-field">
              <span>高度</span>
              <input value={sizeHeightInput} onChange={(event) => setSizeHeightInput(event.target.value)} />
            </label>
          </div>
          <button
            type="button"
            onClick={() => {
              setDocumentState((current) => ({
                ...current,
                layout: resizeBoardLayout(
                  current.layout,
                  normalizeSizeInput(sizeWidthInput, board.width),
                  normalizeSizeInput(sizeHeightInput, board.height)
                )
              }));
              setHoveredPosition(null);
            }}
          >
            应用尺寸
          </button>
        </section>

        <section className="map-editor-card">
          <p className="section-title">操作说明</p>
          <p className="hint-copy">左键点击下方地形卡，选中当前要摆放的地形。</p>
          <p className="hint-copy">左键在棋盘中按下并拖动，可以连续摆放同一种地形。</p>
          <p className="hint-copy">右键随时取消当前选中，回到未选中状态。</p>
          <p className="hint-copy">按 `R` 可切换当前项目形态，例如大炮方向、传送带方向、阵营或骰子猪携带内容。</p>
        </section>

        <section className="map-editor-card">
          <p className="section-title">导入导出</p>
          <textarea
            className="map-editor-textarea"
            value={importText}
              onChange={(event) => setImportText(event.target.value)}
            placeholder="导出会生成 defaultBoard 风格的布局文本；导入时也接受同样格式。"
          />
          <div className="map-editor-button-row">
            <button
              type="button"
              onClick={() => setImportText(formatMapEditorDocument(documentState))}
            >
              生成导出文本
            </button>
            <button
              type="button"
              onClick={async () => {
                const text = formatMapEditorDocument(documentState);
                setImportText(text);

                if (navigator.clipboard?.writeText) {
                  await navigator.clipboard.writeText(text);
                }
              }}
            >
              复制导出文本
            </button>
          </div>
          <button
            type="button"
              onClick={() => {
              try {
                const parsed = parseMapEditorDocument(importText, documentState);
                setDocumentState(parsed);
                setHoveredPosition(null);
                setImportError(null);
              } catch (error: unknown) {
                setImportError(error instanceof Error ? error.message : "导入失败。");
              }
            }}
          >
            导入文本
          </button>
          {importError ? <p className="error-copy">{importError}</p> : null}
        </section>

        <section className="map-editor-card">
          <p className="section-title">联机测试</p>
          <p className="hint-copy">
            当前会沿用你本机保存的昵称和棋子形象创建房间，成功后直接跳到联机页面。
          </p>
          <div className="map-editor-button-row">
            <button type="button" className="ghost-button" onClick={navigateToHome}>
              <UiIcon name="return" />
              <span>返回首页</span>
            </button>
            <button
              type="button"
              disabled={createRoomBusy}
              onClick={async () => {
                const roomCode = await createRoom({
                  customMap: {
                    allowDebugTools: documentState.allowDebugTools,
                    layout: [...documentState.layout],
                    mapLabel: documentState.mapLabel,
                    mode: documentState.mode
                  },
                  mapId: "custom",
                  petId: storedProfile.petId,
                  playerName: storedProfile.playerName
                });

                if (roomCode) {
                  navigateToRoom(roomCode);
                }
              }}
            >
              {createRoomBusy ? "创建中..." : "用当前地图开房测试"}
            </button>
          </div>
          {lastError ? <p className="error-copy">{lastError}</p> : null}
          {snapshot ? <p className="hint-copy">当前仍连接着一个房间；开新房前建议先回到首页。</p> : null}
        </section>
      </aside>

      <main className="map-editor-stage">
        <section
          className="scene-panel map-editor-scene-panel"
          onPointerDown={(event) => {
            if (event.button === 0 && selectedTerrain) {
              setIsPainting(true);
            }
          }}
          onPointerLeave={() => {
            setHoveredPosition(null);
          }}
        >
          <MapEditorCanvas
            board={board}
            summons={editorSummons}
            hoveredPosition={hoveredPosition}
            isPainting={isPainting}
            onHoverPosition={setHoveredPosition}
            onPaintPosition={(position) => {
              if (!selectedTerrain) {
                return;
              }

              const targetTile = board.tiles.find((tile) => tile.x === position.x && tile.y === position.y);
              const selectedPlacesSummon = layoutCellHasInitialSummon(selectedTerrain.symbol);

              if (selectedPlacesSummon && targetTile?.type !== "floor") {
                return;
              }

              setDocumentState((current) => ({
                ...current,
                layout: setLayoutCellDescriptor(current.layout, position, selectedTerrain.symbol)
              }));
            }}
            onPointerUp={() => setIsPainting(false)}
            selectedTerrain={selectedTerrain}
          />
        </section>

        <section className="map-editor-terrain-panel">
          <div className="map-editor-terrain-panel__header">
            <div>
              <p className="section-title">地形库</p>
              <p className="hint-copy">
                左键选中后在棋盘中按下并拖动连续放置，右键取消，`R` 切换形态。
              </p>
            </div>
            <div className="mini-pill">
              {selectedTerrain ? `当前：${selectedTerrain.label}` : "当前：未选中"}
            </div>
          </div>

          <div className="map-editor-terrain-grid">
            {TERRAIN_LIBRARY_ENTRIES.map((entry) => (
              <button
                key={entry.symbol}
                type="button"
                className={`map-editor-terrain-button${isTerrainEntrySelected(entry, selectedSymbol) ? " selected" : ""}`}
                onClick={() => setSelectedSymbol(resolveTerrainEntrySelectionSymbol(entry, selectedSymbol))}
              >
                <TerrainThumbnail
                  entry={entry}
                  thumbnailUrl={
                    thumbnailUrls[resolveTerrainEntrySelectionSymbol(entry, selectedSymbol)] ??
                    thumbnailUrls[entry.symbol] ??
                    null
                  }
                />
                <span>{entry.label}</span>
                <small>{resolveTerrainEntrySelectionSymbol(entry, selectedSymbol)}</small>
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default MapEditorApp;
