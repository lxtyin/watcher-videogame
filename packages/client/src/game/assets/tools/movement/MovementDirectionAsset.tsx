import { Color } from "three";
import type { DirectionAssetProps } from "../shared/toolAssetTypes";

function mixColor(base: string, target: string, ratio: number): string {
  return new Color(base).lerp(new Color(target), ratio).getStyle();
}

// Movement arrows favor a broad shaft so they read as grounded translation.
export function MovementDirectionAsset({ active, accent }: DirectionAssetProps) {
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
