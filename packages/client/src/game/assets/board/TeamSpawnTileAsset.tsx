import type { TeamId } from "@watcher/shared";
import { getTeamAccentColor, getTeamTrimColor } from "./teamColors";

export function TeamSpawnTileAsset({
  faction
}: {
  faction: TeamId | null;
}) {
  const accent = getTeamAccentColor(faction);
  const trim = getTeamTrimColor(faction);

  return (
    <group position={[0, -0.38, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[0.24, 0.37, 40]} />
        <meshStandardMaterial color={trim} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[0.18, 32]} />
        <meshStandardMaterial color={accent} />
      </mesh>
    </group>
  );
}

