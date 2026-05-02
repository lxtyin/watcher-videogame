import {
  createInitialSummonsFromLayout,
  toTileKey,
  type BoardSummonState,
  type BoardDefinition,
  type GridPosition
} from "@watcher/shared";
import { BoardTileVisual } from "../game/assets/board/BoardTileVisual";
import { SummonVisual } from "../game/assets/summons/SummonVisual";
import { estimateBoardShadowBounds } from "../game/utils/shadowCamera";
import type { TerrainLibraryEntry } from "./terrainCatalog";

const GHOST_SELECTION_COLOR = "#f7f0dc";

function createGhostBoard(board: BoardDefinition, entry: TerrainLibraryEntry, position: GridPosition) {
  const ghostLayout = board.tiles.map((tile) =>
    tile.x === position.x && tile.y === position.y
      ? {
          ...entry.tile,
          key: `ghost:${toTileKey(position)}`,
          x: position.x,
          y: position.y
        }
      : null
  );

  return ghostLayout.find((tile) => tile !== null) ?? null;
}

function createGhostSummon(
  board: BoardDefinition,
  entry: TerrainLibraryEntry,
  position: GridPosition
): BoardSummonState | null {
  const targetTile = board.tiles.find((tile) => tile.x === position.x && tile.y === position.y);

  if (targetTile?.type !== "floor") {
    return null;
  }

  const initialSummon = createInitialSummonsFromLayout([`${entry.symbol}\t.`])[0];

  if (!initialSummon) {
    return null;
  }

  return {
    ...initialSummon,
    instanceId: `ghost:${initialSummon.instanceId}`,
    position
  };
}

export function MapEditorScene({
  board,
  summons,
  hoveredPosition,
  isPainting,
  onHoverPosition,
  onPaintPosition,
  selectedTerrain
}: {
  board: BoardDefinition;
  summons: BoardSummonState[];
  hoveredPosition: GridPosition | null;
  isPainting: boolean;
  onHoverPosition: (position: GridPosition | null) => void;
  onPaintPosition: (position: GridPosition) => void;
  selectedTerrain: TerrainLibraryEntry | null;
}) {
  const ghostTile =
    selectedTerrain && hoveredPosition
      ? createGhostBoard(board, selectedTerrain, hoveredPosition)
      : null;
  const ghostSummon =
    selectedTerrain && hoveredPosition
      ? createGhostSummon(board, selectedTerrain, hoveredPosition)
      : null;
  const hoveredTileKey = hoveredPosition ? toTileKey(hoveredPosition) : null;
  const shadowBounds = estimateBoardShadowBounds(board.width, board.height);

  return (
    <>
      <color attach="background" args={["#f3ead9"]} />
      <ambientLight intensity={1.08} />
      <directionalLight
        castShadow
        intensity={1.18}
        position={[5, 9, 6]}
        shadow-camera-bottom={-shadowBounds}
        shadow-camera-left={-shadowBounds}
        shadow-camera-right={shadowBounds}
        shadow-camera-top={shadowBounds}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <group>
        {board.tiles.map((tile) => (
          <BoardTileVisual
            key={tile.key}
            boardHeight={board.height}
            boardWidth={board.width}
            onPointerDown={(event) => {
              event.stopPropagation();

              if (event.button !== 0 || !selectedTerrain) {
                return;
              }

              onPaintPosition({ x: tile.x, y: tile.y });
              onHoverPosition({ x: tile.x, y: tile.y });
            }}
            onPointerEnter={(event) => {
              event.stopPropagation();
              onHoverPosition({ x: tile.x, y: tile.y });

              if (isPainting && selectedTerrain) {
                onPaintPosition({ x: tile.x, y: tile.y });
              }
            }}
            selectionActive={Boolean(!selectedTerrain && hoveredTileKey === tile.key)}
            selectionColor={selectedTerrain ? GHOST_SELECTION_COLOR : "#ffffff"}
            tile={tile}
          />
        ))}
      </group>
      {ghostTile ? (
        <BoardTileVisual
          baseOpacity={0.52}
          boardHeight={board.height}
          boardWidth={board.width}
          selectionActive={false}
          selectionColor={GHOST_SELECTION_COLOR}
          tile={ghostTile}
          yOffset={0.18}
        />
      ) : null}
      {summons.map((summon) => (
        <SummonVisual
          key={summon.instanceId}
          boardHeight={board.height}
          boardWidth={board.width}
          color="#dba84a"
          onPointerDown={(event) => {
            event.stopPropagation();

            if (event.button !== 0 || !selectedTerrain) {
              return;
            }

            onPaintPosition(summon.position);
            onHoverPosition(summon.position);
          }}
          summon={summon}
        />
      ))}
      {ghostSummon ? (
        <SummonVisual
          boardHeight={board.height}
          boardWidth={board.width}
          color="#dba84a"
          opacity={0.54}
          summon={ghostSummon}
        />
      ) : null}
    </>
  );
}
