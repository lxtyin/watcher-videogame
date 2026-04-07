import type { TileDefinition, TileType } from "@watcher/shared";
import type { ThreeEvent } from "@react-three/fiber";
import { toWorldPosition } from "../../utils/boardMath";
import { CannonTileAsset } from "./CannonTileAsset";
import { ConveyorArrowAsset } from "./ConveyorArrowAsset";
import { GoalTileAsset } from "./GoalTileAsset";
import { LuckyBlockAsset } from "./LuckyBlockAsset";
import { PitDecorationAsset } from "./PitDecorationAsset";
import { StartTileAsset } from "./StartTileAsset";
import { ToolTilePreviewAsset } from "../tools/shared/ToolTilePreviewAsset";

interface TileVisualStyle {
  color: string;
  height: number;
}

const TILE_VISUAL_STYLE: Record<TileType, TileVisualStyle> = {
  floor: { color: "#d5c6a1", height: 0.22 },
  wall: { color: "#455062", height: 1.15 },
  earthWall: { color: "#bc7441", height: 0.7 },
  pit: { color: "#8b705f", height: 0.22 },
  cannon: { color: "#67584a", height: 0.22 },
  lucky: { color: "#d6bf70", height: 0.22 },
  conveyor: { color: "#b8c7cd", height: 0.22 },
  start: { color: "#9fd9d3", height: 0.22 },
  goal: { color: "#e59e96", height: 0.22 }
};

// Board tiles compose a base block plus optional content assets and preview overlays.
export function BoardTileVisual({
  boardHeight,
  boardWidth,
  onPointerDown,
  selectionActive,
  selectionColor,
  tile
}: {
  boardHeight: number;
  boardWidth: number;
  onPointerDown?: (event: ThreeEvent<PointerEvent>) => void;
  selectionActive: boolean;
  selectionColor: string;
  tile: TileDefinition;
}) {
  const [x, , z] = toWorldPosition({ x: tile.x, y: tile.y }, boardWidth, boardHeight);
  const tileStyle = TILE_VISUAL_STYLE[tile.type];
  const pointerProps = onPointerDown ? { onPointerDown } : {};

  return (
    <group position={[x, 0, z]} {...pointerProps}>
      <mesh position={[0, tileStyle.height / 2 - 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.96, tileStyle.height, 0.96]} />
        <meshStandardMaterial color={tileStyle.color} />
      </mesh>
      {tile.type === "pit" ? <PitDecorationAsset /> : null}
      {tile.type === "cannon" && tile.direction ? <CannonTileAsset direction={tile.direction} /> : null}
      {tile.type === "lucky" ? <LuckyBlockAsset /> : null}
      {tile.type === "start" ? <StartTileAsset /> : null}
      {tile.type === "goal" ? <GoalTileAsset /> : null}
      {tile.type === "conveyor" && tile.direction ? (
        <ConveyorArrowAsset direction={tile.direction} />
      ) : null}
      {selectionActive ? (
        <group position={[0, -0.26, 0]}>
          <ToolTilePreviewAsset color={selectionColor} />
        </group>
      ) : null}
    </group>
  );
}
