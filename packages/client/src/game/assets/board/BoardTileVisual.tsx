import type { TileDefinition, TileType } from "@watcher/shared";
import type { ThreeEvent } from "@react-three/fiber";
import { toWorldPosition } from "../../utils/boardMath";
import { BoxingBallTileAsset } from "./BoxingBallTileAsset";
import { CannonTileAsset } from "./CannonTileAsset";
import { ConveyorArrowAsset } from "./ConveyorArrowAsset";
import { EarthWallTileAsset } from "./EarthWallTileAsset";
import { GoalTileAsset } from "./GoalTileAsset";
import { HighwallTileAsset } from "./HighwallTileAsset";
import { LuckyBlockAsset } from "./LuckyBlockAsset";
import { PitDecorationAsset } from "./PitDecorationAsset";
import { PoisonTileAsset } from "./PoisonTileAsset";
import { StartTileAsset } from "./StartTileAsset";
import { TeamCampTileAsset } from "./TeamCampTileAsset";
import { TeamSpawnTileAsset } from "./TeamSpawnTileAsset";
import { TowerTileAsset } from "./TowerTileAsset";
import { ToolTilePreviewAsset } from "../tools/shared/ToolTilePreviewAsset";
import { WallTileAsset } from "./WallTileAsset";
import { DangerTileHighlightAsset } from "./DangerTileHighlightAsset";

interface TileVisualStyle {
  color: string;
  height: number;
}

export const TILE_VISUAL_STYLE: Record<TileType, TileVisualStyle> = {
  floor: { color: "#d5c6a1", height: 0.22 },
  wall: { color: "#455062", height: 0.8 },
  earthWall: { color: "#bc7441", height: 0.22 },
  boxingBall: { color: "#c8b39d", height: 0.22 },
  tower: { color: "#9c98a6", height: 0.22 },
  teamSpawn: { color: "#bbc8d2", height: 0.22 },
  teamCamp: { color: "#ccb37b", height: 0.22 },
  highwall: { color: "#556273", height: 0.8 },
  poison: { color: "#4c6b3e", height: 0.22 },
  pit: { color: "#8b705f", height: 0.22 },
  cannon: { color: "#67584a", height: 0.22 },
  lucky: { color: "#d6bf70", height: 0.22 },
  emptyLucky: { color: "#b7a36a", height: 0.22 },
  conveyor: { color: "#b8c7cd", height: 0.22 },
  start: { color: "#9fd9d3", height: 0.22 },
  goal: { color: "#e59e96", height: 0.22 }
};


export function BoardTileDecorationAsset({
  highlighted = false,
  tile
}: {
  highlighted?: boolean;
  tile: TileDefinition;
}) {
  return (
    <>
      {tile.type === "wall" ? <WallTileAsset /> : null}
      {tile.type === "earthWall" ? <EarthWallTileAsset breaking={highlighted} /> : null}
      {tile.type === "boxingBall" ? <BoxingBallTileAsset /> : null}
      {tile.type === "tower" ? <TowerTileAsset durability={tile.durability} faction={tile.faction} /> : null}
      {tile.type === "teamSpawn" ? <TeamSpawnTileAsset faction={tile.faction} /> : null}
      {tile.type === "teamCamp" ? <TeamCampTileAsset faction={tile.faction} /> : null}
      {tile.type === "pit" ? <PitDecorationAsset /> : null}
      {tile.type === "poison" ? <PoisonTileAsset /> : null}
      {tile.type === "cannon" && tile.direction ? <CannonTileAsset direction={tile.direction} /> : null}
      {tile.type === "highwall" ? <HighwallTileAsset /> : null}
      {tile.type === "lucky" ? <LuckyBlockAsset tile={tile} /> : null}
      {tile.type === "start" ? <StartTileAsset /> : null}
      {tile.type === "goal" ? <GoalTileAsset /> : null}
      {tile.type === "conveyor" && tile.direction ? (
        <ConveyorArrowAsset direction={tile.direction} highlighted={highlighted}/>
      ) : null}
      {highlighted && (tile.type === "pit" || tile.type === "poison") ? <DangerTileHighlightAsset /> : null}
    </>
  );
}

export function BoardTileSelectionOverlay({
  active,
  color
}: {
  active: boolean;
  color: string;
}) {
  if (!active) {
    return null;
  }

  return (
    <group position={[0, -0.26, 0]}>
      <ToolTilePreviewAsset color={color} />
    </group>
  );
}

// Board tiles compose a base block plus optional content assets and preview overlays.
export function BoardTileVisual({
  baseOpacity = 1,
  boardHeight,
  boardWidth,
  onPointerDown,
  onPointerEnter,
  onPointerLeave,
  selectionActive,
  selectionColor,
  tile,
  highlighted = false,
  yOffset = 0
}: {
  baseOpacity?: number;
  boardHeight: number;
  boardWidth: number;
  onPointerDown?: (event: ThreeEvent<PointerEvent>) => void;
  onPointerEnter?: (event: ThreeEvent<PointerEvent>) => void;
  onPointerLeave?: (event: ThreeEvent<PointerEvent>) => void;
  selectionActive: boolean;
  selectionColor: string;
  tile: TileDefinition;
  highlighted?: boolean;
  yOffset?: number;
}) {
  const [x, y, z] = toWorldPosition({ x: tile.x, y: tile.y }, boardWidth, boardHeight);
  const tileStyle = TILE_VISUAL_STYLE[tile.type];
  const pointerProps = {
    ...(onPointerDown ? { onPointerDown } : {}),
    ...(onPointerEnter ? { onPointerEnter } : {}),
    ...(onPointerLeave ? { onPointerLeave } : {})
  };

  return (
    <group position={[x, y + yOffset, z]} {...pointerProps}>
      <mesh position={[0, tileStyle.height / 2 - 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.96, tileStyle.height, 0.96]} />
        <meshStandardMaterial
          color={tileStyle.color}
          transparent={baseOpacity < 1}
          opacity={baseOpacity}
        />
      </mesh>
      <BoardTileDecorationAsset highlighted={highlighted} tile={tile} />
      <BoardTileSelectionOverlay active={selectionActive} color={selectionColor} />
    </group>
  );
}
