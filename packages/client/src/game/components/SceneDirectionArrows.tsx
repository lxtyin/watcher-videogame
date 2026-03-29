import type { Direction, ToolId } from "@watcher/shared";
import { Color } from "three";
import { getActionUiConfig, getDirectionalActionVariant } from "../config/actionUi";

interface SceneDirectionArrowsProps {
  actionId: ToolId;
  activeDirection: Direction | null;
  position: [number, number, number];
}

interface DirectionLayout {
  position: [number, number, number];
  rotationY: number;
}

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

const JUMP_MARKERS = [
  { y: 0.07, z: 0.22, radius: 0.05 },
  { y: 0.16, z: 0.02, radius: 0.055 },
  { y: 0.24, z: -0.2, radius: 0.05 },
  { y: 0.16, z: -0.42, radius: 0.045 }
] as const;

const HOOKSHOT_CHAIN_SEGMENTS = [0.22, 0.06, -0.1, -0.26, -0.42] as const;

function mixColor(base: string, target: string, ratio: number): string {
  return new Color(base).lerp(new Color(target), ratio).getStyle();
}

function MoveArrow({ active, accent }: { active: boolean; accent: string }) {
  const coreColor = active ? mixColor(accent, "#ffffff", 0.18) : mixColor(accent, "#9aa3ad", 0.4);

  return (
    <>
      <mesh position={[0, 0.035, -0.06]}>
        <boxGeometry args={[0.24, 0.04, 0.72]} />
        <meshBasicMaterial color={accent} transparent opacity={active ? 0.2 : 0.1} />
      </mesh>
      <mesh position={[0, 0.1, -0.06]}>
        <boxGeometry args={[0.12, 0.12, 0.48]} />
        <meshStandardMaterial
          color={coreColor}
          emissive={accent}
          emissiveIntensity={active ? 0.6 : 0.16}
        />
      </mesh>
      <mesh position={[0, 0.11, -0.46]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.18, 0.34, 6]} />
        <meshStandardMaterial
          color={coreColor}
          emissive={accent}
          emissiveIntensity={active ? 0.76 : 0.2}
        />
      </mesh>
    </>
  );
}

function JumpArrow({ active, accent }: { active: boolean; accent: string }) {
  const beadColor = active ? mixColor(accent, "#ffffff", 0.2) : mixColor(accent, "#aab6a0", 0.34);

  return (
    <>
      <mesh position={[0, 0.03, -0.06]}>
        <boxGeometry args={[0.16, 0.04, 0.38]} />
        <meshBasicMaterial color={accent} transparent opacity={active ? 0.18 : 0.08} />
      </mesh>
      {JUMP_MARKERS.map((marker) => (
        <mesh key={`${marker.z}`} position={[0, marker.y, marker.z]}>
          <sphereGeometry args={[marker.radius, 14, 14]} />
          <meshStandardMaterial
            color={beadColor}
            emissive={accent}
            emissiveIntensity={active ? 0.66 : 0.22}
          />
        </mesh>
      ))}
      <mesh position={[0, 0.12, -0.62]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.17, 0.32, 6]} />
        <meshStandardMaterial
          color={beadColor}
          emissive={accent}
          emissiveIntensity={active ? 0.82 : 0.24}
        />
      </mesh>
    </>
  );
}

function HookshotArrow({ active, accent }: { active: boolean; accent: string }) {
  const chainColor = active ? mixColor(accent, "#ffffff", 0.16) : mixColor(accent, "#a3abb6", 0.38);

  return (
    <>
      {HOOKSHOT_CHAIN_SEGMENTS.map((segment, index) => (
        <mesh
          key={`${segment}`}
          position={[0, 0.08, segment]}
          rotation={[0, 0, index % 2 === 0 ? Math.PI / 4 : -Math.PI / 4]}
        >
          <boxGeometry args={[0.16, 0.04, 0.08]} />
          <meshStandardMaterial
            color={chainColor}
            emissive={accent}
            emissiveIntensity={active ? 0.54 : 0.18}
          />
        </mesh>
      ))}
      <mesh position={[0, 0.08, -0.62]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.15, 0.3, 6]} />
        <meshStandardMaterial
          color={chainColor}
          emissive={accent}
          emissiveIntensity={active ? 0.74 : 0.22}
        />
      </mesh>
      <mesh position={[0, 0.08, -0.78]}>
        <boxGeometry args={[0.3, 0.05, 0.08]} />
        <meshStandardMaterial
          color={chainColor}
          emissive={accent}
          emissiveIntensity={active ? 0.48 : 0.14}
        />
      </mesh>
    </>
  );
}

function SpecialArrow({ active, accent }: { active: boolean; accent: string }) {
  const coreColor = active ? mixColor(accent, "#ffffff", 0.22) : mixColor(accent, "#b6ac8d", 0.36);

  return (
    <>
      <mesh position={[0, 0.09, -0.08]}>
        <boxGeometry args={[0.16, 0.12, 0.54]} />
        <meshStandardMaterial
          color={coreColor}
          emissive={accent}
          emissiveIntensity={active ? 0.58 : 0.18}
        />
      </mesh>
      <mesh position={[0, 0.11, -0.38]}>
        <boxGeometry args={[0.22, 0.08, 0.18]} />
        <meshStandardMaterial
          color={coreColor}
          emissive={accent}
          emissiveIntensity={active ? 0.74 : 0.22}
        />
      </mesh>
      <mesh position={[0, 0.11, -0.6]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.16, 0.3, 6]} />
        <meshStandardMaterial
          color={coreColor}
          emissive={accent}
          emissiveIntensity={active ? 0.82 : 0.24}
        />
      </mesh>
    </>
  );
}

function DirectionArrow({
  accent,
  active,
  direction,
  variant
}: {
  accent: string;
  active: boolean;
  direction: Direction;
  variant: ReturnType<typeof getDirectionalActionVariant>;
}) {
  const layout = DIRECTION_LAYOUTS[direction];
  const ringColor = mixColor(accent, "#ffffff", active ? 0.12 : 0.28);
  const haloOpacity = active ? 0.34 : 0.14;
  const arrowScale = active ? 1.08 : 1;

  return (
    <group
      position={layout.position}
      rotation={[0, layout.rotationY, 0]}
      scale={[arrowScale, arrowScale, arrowScale]}
    >
      <mesh position={[0, 0.02, -0.12]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.18, 0.36, 40]} />
        <meshBasicMaterial color={ringColor} transparent opacity={haloOpacity} />
      </mesh>
      <mesh position={[0, 0.01, -0.12]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.16, 32]} />
        <meshBasicMaterial color={accent} transparent opacity={active ? 0.18 : 0.08} />
      </mesh>
      {variant === "move" ? <MoveArrow active={active} accent={accent} /> : null}
      {variant === "jump" ? <JumpArrow active={active} accent={accent} /> : null}
      {variant === "hookshot" ? <HookshotArrow active={active} accent={accent} /> : null}
      {variant === "special" ? <SpecialArrow active={active} accent={accent} /> : null}
    </group>
  );
}

export function SceneDirectionArrows({
  actionId,
  activeDirection,
  position
}: SceneDirectionArrowsProps) {
  const { accent } = getActionUiConfig(actionId);
  const variant = getDirectionalActionVariant(actionId);

  // Directional guides live in the world so the player reads intent directly from the board.
  return (
    <group position={position}>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.54, 0.68, 48]} />
        <meshBasicMaterial color={accent} transparent opacity={0.14} />
      </mesh>
      {(
        Object.keys(DIRECTION_LAYOUTS) as Direction[]
      ).map((direction) => (
        <DirectionArrow
          key={direction}
          accent={accent}
          active={activeDirection === direction}
          direction={direction}
          variant={variant}
        />
      ))}
    </group>
  );
}
