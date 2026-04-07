import { Color } from "three";
import type { DirectionAssetProps } from "../shared/toolAssetTypes";

function mixColor(base: string, target: string, ratio: number): string {
  return new Color(base).lerp(new Color(target), ratio).getStyle();
}

// Rocket arrows use a heavier silhouette so explosive tools stand apart from other shots.
export function RocketDirectionAsset({ active, accent }: DirectionAssetProps) {
  const rocketColor = active ? mixColor(accent, "#ffffff", 0.22) : mixColor(accent, "#d7b3ab", 0.28);

  return (
    <>
      <mesh position={[0, 0.1, -0.12]}>
        <capsuleGeometry args={[0.08, 0.34, 4, 10]} />
        <meshStandardMaterial
          color={rocketColor}
          emissive={accent}
          emissiveIntensity={active ? 0.62 : 0.18}
        />
      </mesh>
      <mesh position={[0, 0.1, -0.42]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.15, 0.28, 7]} />
        <meshStandardMaterial
          color={rocketColor}
          emissive={accent}
          emissiveIntensity={active ? 0.82 : 0.22}
        />
      </mesh>
      <mesh position={[0, 0.08, 0.14]}>
        <boxGeometry args={[0.22, 0.03, 0.12]} />
        <meshStandardMaterial
          color={rocketColor}
          emissive={accent}
          emissiveIntensity={active ? 0.44 : 0.12}
        />
      </mesh>
    </>
  );
}
