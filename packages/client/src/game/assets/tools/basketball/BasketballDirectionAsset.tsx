import { Color } from "three";
import type { DirectionAssetProps } from "../shared/toolAssetTypes";

function mixColor(base: string, target: string, ratio: number): string {
  return new Color(base).lerp(new Color(target), ratio).getStyle();
}

// Basketball arrows read as a light projectile rather than a heavy movement command.
export function BasketballDirectionAsset({ active, accent }: DirectionAssetProps) {
  const ballColor = active ? mixColor(accent, "#fff1d8", 0.3) : mixColor(accent, "#d8c4a8", 0.34);

  return (
    <>
      <mesh position={[0, 0.08, 0.08]}>
        <sphereGeometry args={[0.11, 18, 18]} />
        <meshStandardMaterial
          color={ballColor}
          emissive={accent}
          emissiveIntensity={active ? 0.56 : 0.16}
        />
      </mesh>
      <mesh position={[0, 0.1, -0.18]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.12, 0.018, 10, 18]} />
        <meshStandardMaterial
          color={ballColor}
          emissive={accent}
          emissiveIntensity={active ? 0.48 : 0.14}
        />
      </mesh>
      <mesh position={[0, 0.12, -0.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.17, 0.32, 7]} />
        <meshStandardMaterial
          color={ballColor}
          emissive={accent}
          emissiveIntensity={active ? 0.78 : 0.2}
        />
      </mesh>
    </>
  );
}
