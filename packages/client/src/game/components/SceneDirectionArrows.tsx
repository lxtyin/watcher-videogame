import type { ComponentType } from "react";
import type { Direction, ToolId } from "@watcher/shared";
import { Color } from "three";
import { getActionUiConfig } from "../content/actionUi";
import { BasketballDirectionAsset } from "../assets/tools/basketball/BasketballDirectionAsset";
import { HookshotDirectionAsset } from "../assets/tools/hookshot/HookshotDirectionAsset";
import { JumpDirectionAsset } from "../assets/tools/jump/JumpDirectionAsset";
import { MovementDirectionAsset } from "../assets/tools/movement/MovementDirectionAsset";
import { PunchDirectionAsset } from "../assets/tools/punch/PunchDirectionAsset";
import { RocketDirectionAsset } from "../assets/tools/rocket/RocketDirectionAsset";
import { SpecialDirectionAsset } from "../assets/tools/shared/SpecialDirectionAsset";
import type { DirectionAssetProps } from "../assets/tools/shared/toolAssetTypes";

interface SceneDirectionArrowsProps {
  actionId: ToolId;
  activeDirection: Direction | null;
  position: [number, number, number];
}

interface DirectionLayout {
  position: [number, number, number];
  rotationY: number;
}

type DirectionAssetComponent = ComponentType<DirectionAssetProps>;

const DIRECTION_LAYOUTS: Record<Direction, DirectionLayout> = {
  up: {
    position: [0, 0, -1.08],
    rotationY: 0
  },
  right: {
    position: [1.08, 0, 0],
    rotationY: -Math.PI / 2
  },
  down: {
    position: [0, 0, 1.08],
    rotationY: Math.PI
  },
  left: {
    position: [-1.08, 0, 0],
    rotationY: Math.PI / 2
  }
};

const TOOL_DIRECTION_ASSETS: Partial<Record<ToolId, DirectionAssetComponent>> = {
  movement: MovementDirectionAsset,
  jump: JumpDirectionAsset,
  hookshot: HookshotDirectionAsset,
  basketball: BasketballDirectionAsset,
  punch: PunchDirectionAsset,
  rocket: RocketDirectionAsset
};

function mixColor(base: string, target: string, ratio: number): string {
  return new Color(base).lerp(new Color(target), ratio).getStyle();
}

// Each direction arrow reuses the same layout shell and swaps only the tool-specific asset.
function DirectionArrow({
  accent,
  active,
  asset: Asset,
  direction
}: {
  accent: string;
  active: boolean;
  asset: DirectionAssetComponent;
  direction: Direction;
}) {
  const layout = DIRECTION_LAYOUTS[direction];
  const ringColor = mixColor(accent, "#ffffff", active ? 0.12 : 0.28);
  const haloOpacity = active ? 0.34 : 0.14;
  const arrowScale = active ? 1.08 : 1;
  const outlineColor = active ? mixColor(accent, "#fff9ef", 0.62) : mixColor(accent, "#ffffff", 0.38);

  return (
    <group
      position={layout.position}
      rotation={[0, layout.rotationY, 0]}
      scale={[arrowScale, arrowScale, arrowScale]}
    >
      <mesh position={[0, 0.02, -0.12]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.18, 0.36, 40]} />
        <meshBasicMaterial
          color={ringColor}
          transparent
          opacity={haloOpacity}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, 0.01, -0.12]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.16, 32]} />
        <meshBasicMaterial
          color={accent}
          transparent
          opacity={active ? 0.18 : 0.08}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, 0.085, -0.08]} renderOrder={18}>
        <boxGeometry args={[0.24, 0.16, 0.72]} />
        <meshBasicMaterial
          color={outlineColor}
          transparent
          opacity={active ? 0.22 : 0.12}
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, 0.1, -0.52]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={18}>
        <coneGeometry args={[0.21, 0.38, 6]} />
        <meshBasicMaterial
          color={outlineColor}
          transparent
          opacity={active ? 0.28 : 0.16}
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <Asset active={active} accent={accent} />
    </group>
  );
}

// World-space arrows keep direction choice anchored to the acting piece instead of the HUD.
export function SceneDirectionArrows({
  actionId,
  activeDirection,
  position
}: SceneDirectionArrowsProps) {
  const { accent } = getActionUiConfig(actionId);
  const Asset = TOOL_DIRECTION_ASSETS[actionId] ?? SpecialDirectionAsset;

  return (
    <group position={position}>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.54, 0.68, 48]} />
        <meshBasicMaterial color={accent} transparent opacity={0.14} />
      </mesh>
      {(Object.keys(DIRECTION_LAYOUTS) as Direction[]).map((direction) => (
        <DirectionArrow
          key={direction}
          accent={accent}
          active={activeDirection === direction}
          asset={Asset}
          direction={direction}
        />
      ))}
    </group>
  );
}
