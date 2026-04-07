import { Color } from "three";
import type { DirectionAssetProps } from "../shared/toolAssetTypes";

const HOOKSHOT_CHAIN_SEGMENTS = [0.22, 0.06, -0.1, -0.26, -0.42] as const;

function mixColor(base: string, target: string, ratio: number): string {
  return new Color(base).lerp(new Color(target), ratio).getStyle();
}

// Hookshot arrows stretch forward with chain segments to suggest reach and pull.
export function HookshotDirectionAsset({ active, accent }: DirectionAssetProps) {
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
