import type { TileDefinition, TileType } from "@watcher/shared";
import type { ThreeEvent } from "@react-three/fiber";
import { memo, useCallback, useLayoutEffect, useMemo, useRef } from "react";
import {
  BoxGeometry,
  Color,
  MeshBasicMaterial,
  Matrix4,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  type InstancedMesh
} from "three";
import {
  BoardTileDecorationAsset,
  BoardTileSelectionOverlay,
  TILE_VISUAL_STYLE
} from "../assets/board/BoardTileVisual";
import { toWorldPosition } from "../utils/boardMath";

const TILE_BASE_GEOMETRY = new BoxGeometry(1, 1, 1);
const TILE_INTERACTION_GEOMETRY = new PlaneGeometry(1, 1);
const TILE_INTERACTION_MATERIAL = new MeshBasicMaterial({
  depthWrite: false,
  opacity: 0,
  transparent: true
});
const TILE_BASE_MATERIALS = Object.fromEntries(
  (Object.keys(TILE_VISUAL_STYLE) as TileType[]).map((tileType) => [
    tileType,
    new MeshStandardMaterial({
      color: new Color(TILE_VISUAL_STYLE[tileType].color)
    })
  ])
) as Record<TileType, MeshStandardMaterial>;
const TILE_MATRIX = new Matrix4();
const TILE_OBJECT = new Object3D();

function groupTilesByType(tiles: readonly TileDefinition[]) {
  const groupedTiles = new Map<TileType, TileDefinition[]>();

  for (const tile of tiles) {
    const existingTiles = groupedTiles.get(tile.type) ?? [];
    existingTiles.push(tile);
    groupedTiles.set(tile.type, existingTiles);
  }

  return groupedTiles;
}

function updateInstancedTileMatrices(
  mesh: InstancedMesh,
  tiles: readonly TileDefinition[],
  boardWidth: number,
  boardHeight: number,
  scaleY: number,
  yCenter: number
) {
  tiles.forEach((tile, index) => {
    const [x, , z] = toWorldPosition({ x: tile.x, y: tile.y }, boardWidth, boardHeight);
    TILE_OBJECT.position.set(x, yCenter, z);
    TILE_OBJECT.rotation.set(0, 0, 0);
    TILE_OBJECT.scale.set(0.96, scaleY, 0.96);
    TILE_OBJECT.updateMatrix();
    mesh.setMatrixAt(index, TILE_OBJECT.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
}

function updateInstancedInteractionMatrices(
  mesh: InstancedMesh,
  tiles: readonly TileDefinition[],
  boardWidth: number,
  boardHeight: number
) {
  tiles.forEach((tile, index) => {
    const [x, , z] = toWorldPosition({ x: tile.x, y: tile.y }, boardWidth, boardHeight);
    TILE_OBJECT.position.set(x, -0.38, z);
    TILE_OBJECT.rotation.set(-Math.PI / 2, 0, 0);
    TILE_OBJECT.scale.set(0.98, 1, 0.98);
    TILE_OBJECT.updateMatrix();
    mesh.setMatrixAt(index, TILE_OBJECT.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
}

function TileBaseInstances({
  boardHeight,
  boardWidth,
  tileType,
  tiles
}: {
  boardHeight: number;
  boardWidth: number;
  tileType: TileType;
  tiles: readonly TileDefinition[];
}) {
  const meshRef = useRef<InstancedMesh>(null);
  const tileStyle = TILE_VISUAL_STYLE[tileType];

  useLayoutEffect(() => {
    if (!meshRef.current) {
      return;
    }

    updateInstancedTileMatrices(
      meshRef.current,
      tiles,
      boardWidth,
      boardHeight,
      tileStyle.height,
      tileStyle.height / 2 - 0.5
    );
  }, [boardHeight, boardWidth, tileStyle.height, tiles]);

  if (!tiles.length) {
    return null;
  }

  return (
    <instancedMesh
      ref={meshRef}
      args={[TILE_BASE_GEOMETRY, TILE_BASE_MATERIALS[tileType], tiles.length]}
      castShadow
      frustumCulled={false}
      receiveShadow
    />
  );
}

function TileDecorationLayer({
  boardHeight,
  boardWidth,
  tiles
}: {
  boardHeight: number;
  boardWidth: number;
  tiles: readonly TileDefinition[];
}) {
  return (
    <>
      {tiles.map((tile) => {
        const [x, y, z] = toWorldPosition({ x: tile.x, y: tile.y }, boardWidth, boardHeight);

        return (
          <group key={`tile-decoration-${tile.key}`} position={[x, y, z]}>
            <BoardTileDecorationAsset tile={tile} />
          </group>
        );
      })}
    </>
  );
}

function TileInteractionLayer({
  boardHeight,
  boardWidth,
  onTilePointerDown,
  tiles
}: {
  boardHeight: number;
  boardWidth: number;
  onTilePointerDown: ((tile: TileDefinition, event: ThreeEvent<PointerEvent>) => void) | undefined;
  tiles: readonly TileDefinition[];
}) {
  const meshRef = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    if (!meshRef.current) {
      return;
    }

    updateInstancedInteractionMatrices(meshRef.current, tiles, boardWidth, boardHeight);
  }, [boardHeight, boardWidth, tiles]);

  const handlePointerDown = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (!onTilePointerDown || event.instanceId === undefined) {
        return;
      }

      const tile = tiles[event.instanceId];

      if (!tile) {
        return;
      }

      onTilePointerDown(tile, event);
    },
    [onTilePointerDown, tiles]
  );

  if (!tiles.length || !onTilePointerDown) {
    return null;
  }

  return (
    <instancedMesh
      ref={meshRef}
      args={[TILE_INTERACTION_GEOMETRY, TILE_INTERACTION_MATERIAL, tiles.length]}
      frustumCulled={false}
      onPointerDown={handlePointerDown}
    />
  );
}

function BoardTileSelectionLayerComponent({
  boardHeight,
  boardWidth,
  color,
  selectionKeys,
  tiles
}: {
  boardHeight: number;
  boardWidth: number;
  color: string;
  selectionKeys: ReadonlySet<string>;
  tiles: readonly TileDefinition[];
}) {
  if (!selectionKeys.size) {
    return null;
  }

  return (
    <>
      {tiles
        .filter((tile) => selectionKeys.has(tile.key))
        .map((tile) => {
          const [x, y, z] = toWorldPosition({ x: tile.x, y: tile.y }, boardWidth, boardHeight);

          return (
            <group key={`tile-selection-${tile.key}`} position={[x, y, z]}>
              <BoardTileSelectionOverlay active color={color} />
            </group>
          );
        })}
    </>
  );
}

function BoardStaticTileLayerComponent({
  boardHeight,
  boardWidth,
  onTilePointerDown,
  tiles
}: {
  boardHeight: number;
  boardWidth: number;
  onTilePointerDown: ((tile: TileDefinition, event: ThreeEvent<PointerEvent>) => void) | undefined;
  tiles: readonly TileDefinition[];
}) {
  const groupedTiles = useMemo(() => groupTilesByType(tiles), [tiles]);

  return (
    <>
      {(Object.keys(TILE_VISUAL_STYLE) as TileType[]).map((tileType) => (
        <TileBaseInstances
          key={`tile-base-${tileType}`}
          boardHeight={boardHeight}
          boardWidth={boardWidth}
          tileType={tileType}
          tiles={groupedTiles.get(tileType) ?? []}
        />
      ))}
      <TileDecorationLayer
        boardHeight={boardHeight}
        boardWidth={boardWidth}
        tiles={tiles}
      />
      <TileInteractionLayer
        boardHeight={boardHeight}
        boardWidth={boardWidth}
        onTilePointerDown={onTilePointerDown}
        tiles={tiles}
      />
    </>
  );
}

export const BoardStaticTileLayer = memo(BoardStaticTileLayerComponent);
export const BoardTileSelectionLayer = memo(BoardTileSelectionLayerComponent);
