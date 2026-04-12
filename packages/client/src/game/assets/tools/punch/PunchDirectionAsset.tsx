import { Color } from "three";
import type { DirectionAssetProps } from "../shared/toolAssetTypes";

function mixColor(base: string, target: string, ratio: number): string {
  return new Color(base).lerp(new Color(target), ratio).getStyle();
}

const KNUCKLE_OFFSETS = [-0.12, -0.04, 0.04, 0.12] as const;

// Punch arrows read as a compact fist with a short impact marker at the tip.
export function PunchDirectionAsset({ active, accent }: DirectionAssetProps) {
  const gloveColor = active
    ? mixColor(accent, "#fff0f4", 0.22)
    : mixColor(accent, "#d0a2b0", 0.34);
  const bandColor = mixColor(accent, "#ffffff", active ? 0.48 : 0.32);
  const impactOpacity = active ? 0.72 : 0.28;

  return (
    <>
      <mesh position={[0, 0.1, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.08, 0.12, 0.42, 16]} />
        <meshStandardMaterial
          color={bandColor}
          emissive={accent}
          emissiveIntensity={active ? 0.34 : 0.12}
        />
      </mesh>
      <mesh position={[0, 0.12, -0.28]} scale={[1.08, 0.82, 0.92]}>
        <sphereGeometry args={[0.2, 18, 18]} />
        <meshStandardMaterial
          color={gloveColor}
          emissive={accent}
          emissiveIntensity={active ? 0.62 : 0.2}
        />
      </mesh>
      {KNUCKLE_OFFSETS.map((x) => (
        <mesh key={x} position={[x, 0.2, -0.44]} scale={[1, 0.72, 0.82]}>
          <sphereGeometry args={[0.065, 12, 12]} />
          <meshStandardMaterial
            color={mixColor(gloveColor, "#ffffff", 0.18)}
            emissive={accent}
            emissiveIntensity={active ? 0.74 : 0.22}
          />
        </mesh>
      ))}
      <mesh
        position={[0, 0.08, -0.62]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[active ? 1.08 : 0.92, active ? 1.08 : 0.92, 1]}
      >
        <ringGeometry args={[0.1, 0.18, 6]} />
        <meshBasicMaterial
          color={mixColor(accent, "#ffffff", 0.4)}
          depthWrite={false}
          opacity={impactOpacity}
          toneMapped={false}
          transparent
        />
      </mesh>
    </>
  );
}
