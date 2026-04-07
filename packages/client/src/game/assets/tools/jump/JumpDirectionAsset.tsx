import { Color } from "three";
import type { DirectionAssetProps } from "../shared/toolAssetTypes";

const JUMP_MARKERS = [
  { y: 0.07, z: 0.22, radius: 0.05 },
  { y: 0.16, z: 0.02, radius: 0.055 },
  { y: 0.24, z: -0.2, radius: 0.05 },
  { y: 0.16, z: -0.42, radius: 0.045 }
] as const;

function mixColor(base: string, target: string, ratio: number): string {
  return new Color(base).lerp(new Color(target), ratio).getStyle();
}

// Jump arrows use beads to imply an arcing leap rather than a straight slide.
export function JumpDirectionAsset({ active, accent }: DirectionAssetProps) {
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
