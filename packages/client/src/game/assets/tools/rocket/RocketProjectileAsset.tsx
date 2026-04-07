import type { Direction } from "@watcher/shared";

// Rocket flight is authored as a dedicated mesh so other projectiles can diverge later.
export function RocketProjectileAsset({
  facing: _facing,
  lift,
  progress,
  worldX,
  worldZ
}: {
  facing: Direction | null;
  lift: number;
  progress: number;
  worldX: number;
  worldZ: number;
}) {
  return (
    <group
      position={[worldX, 0.6 + lift, worldZ]}
      rotation={[0, -progress * Math.PI * 3.2, 0]}
    >
      <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[0.14, 0.44, 12]} />
        <meshStandardMaterial color="#ef6d53" emissive="#9f2a1b" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[-0.18, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[0.08, 0.18, 10]} />
        <meshBasicMaterial color="#ffd29b" transparent opacity={0.65} />
      </mesh>
    </group>
  );
}
