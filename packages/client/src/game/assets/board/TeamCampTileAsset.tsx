import type { TeamId } from "@watcher/shared";
import { getTeamAccentColor, getTeamTrimColor } from "./teamColors";

export function TeamCampTileAsset({
  faction
}: {
  faction: TeamId | null;
}) {
  const accent = getTeamAccentColor(faction);
  const trim = getTeamTrimColor(faction);

  return (
    <group position={[0, -0.32, 0]}>
      <mesh position={[0, 0.08, 0]} castShadow>
        <boxGeometry args={[0.44, 0.16, 0.44]} />
        <meshStandardMaterial color={trim} />
      </mesh>
      <mesh position={[0, 0.18, 0]} castShadow>
        <boxGeometry args={[0.26, 0.18, 0.26]} />
        <meshStandardMaterial color={accent} />
      </mesh>
    </group>
  );
}

