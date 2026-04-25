import type { TeamId } from "@watcher/shared";
import { Html } from "@react-three/drei";
import { getTeamAccentColor, getTeamTrimColor } from "./teamColors";

export function TowerTileAsset({
  durability,
  faction
}: {
  durability: number;
  faction: TeamId | null;
}) {
  const accent = getTeamAccentColor(faction);
  const trim = getTeamTrimColor(faction);

  return (
    <group position={[0, -0.12, 0]}>
      <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.2, 0.26, 0.56, 20]} />
        <meshStandardMaterial color={trim} />
      </mesh>
      <mesh position={[0, 0.68, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.28, 0.28, 0.12, 20]} />
        <meshStandardMaterial color={accent} />
      </mesh>
      <Html
        center
        position={[0, 1.05, 0]}
        style={{
          background: "rgba(18, 20, 28, 0.88)",
          border: `1px solid ${accent}`,
          borderRadius: "6px",
          color: "#ffffff",
          fontSize: "14px",
          fontWeight: 700,
          lineHeight: 1,
          minWidth: "26px",
          padding: "4px 6px",
          textAlign: "center",
          pointerEvents: "none"
        }}
      >
        {durability}
      </Html>
    </group>
  );
}

