import { Color } from "three";
import type { DirectionAssetProps } from "./toolAssetTypes";

function mixColor(base: string, target: string, ratio: number): string {
  return new Color(base).lerp(new Color(target), ratio).getStyle();
}

// Fallback arrows cover directional tools before bespoke art is authored for them.
export function SpecialDirectionAsset({ active, accent }: DirectionAssetProps) {
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
