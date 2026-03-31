import type { TileDefinition, TileType } from "@watcher/shared";
import { toWorldPosition } from "../../utils/boardMath";
import type { TilePreviewVariant } from "../../interaction/previewState";
import { ConveyorArrowAsset } from "./ConveyorArrowAsset";
import { LuckyBlockAsset } from "./LuckyBlockAsset";
import { PitDecorationAsset } from "./PitDecorationAsset";
import { BlastPreviewTileAsset } from "../previews/BlastPreviewTileAsset";
import { TilePreviewAsset } from "../previews/TilePreviewAsset";

interface TileVisualStyle {
  color: string;
  height: number;
}

const TILE_VISUAL_STYLE: Record<TileType, TileVisualStyle> = {
  floor: { color: "#d5c6a1", height: 0.22 },
  wall: { color: "#455062", height: 1.15 },
  earthWall: { color: "#bc7441", height: 0.7 },
  pit: { color: "#8b705f", height: 0.22 },
  lucky: { color: "#d6bf70", height: 0.22 },
  conveyor: { color: "#b8c7cd", height: 0.22 }
};

// Board tiles compose a base block plus optional content assets and preview overlays.
export function BoardTileVisual({
  boardHeight,
  boardWidth,
  previewActive,
  previewColor,
  previewVariant,
  tile
}: {
  boardHeight: number;
  boardWidth: number;
  previewActive: boolean;
  previewColor: string;
  previewVariant: TilePreviewVariant;
  tile: TileDefinition;
}) {
  const [x, , z] = toWorldPosition({ x: tile.x, y: tile.y }, boardWidth, boardHeight);
  const tileStyle = TILE_VISUAL_STYLE[tile.type];

  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, tileStyle.height / 2 - 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.96, tileStyle.height, 0.96]} />
        <meshStandardMaterial color={tileStyle.color} />
      </mesh>
      {tile.type === "pit" ? <PitDecorationAsset /> : null}
      {tile.type === "lucky" ? <LuckyBlockAsset /> : null}
      {tile.type === "conveyor" && tile.direction ? (
        <ConveyorArrowAsset direction={tile.direction} />
      ) : null}
      {previewActive ? (
        <group position={[0, -0.26, 0]}>
          {previewVariant === "blast" ? (
            <BlastPreviewTileAsset color={previewColor} />
          ) : (
            <TilePreviewAsset color={previewColor} />
          )}
        </group>
      ) : null}
    </group>
  );
}
