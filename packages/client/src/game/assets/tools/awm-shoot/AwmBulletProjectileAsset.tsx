import type { Direction } from "@watcher/shared";

const ROTATION_BY_DIRECTION: Record<Direction, number> = {
  up: 0,
  right: -Math.PI / 2,
  down: Math.PI,
  left: Math.PI / 2
};

// AWM bullet uses a narrow glowing tracer with a small tail.
export function AwmBulletProjectileAsset({
  facing,
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
  const rotationY = facing ? ROTATION_BY_DIRECTION[facing] : 0;
  const flareOpacity = 0.28 + Math.sin(progress * Math.PI) * 0.18;
  const tailOpacity = 0.54 + Math.sin(progress * Math.PI) * 0.24;

  return (
    <group position={[worldX, 0.5 + lift, worldZ]} rotation={[0, rotationY, 0]} scale={[1.08, 1.08, 1.08]}>
      <mesh position={[0, 0, -0.18]} castShadow>
        <capsuleGeometry args={[0.05, 0.34, 6, 12]} />
        <meshStandardMaterial color="#fff4d2" emissive="#a8c6ff" emissiveIntensity={1.15} />
      </mesh>
      <mesh position={[0, 0, 0.24]}>
        <capsuleGeometry args={[0.034, 0.82, 4, 10]} />
        <meshBasicMaterial color="#89b4ff" toneMapped={false} transparent opacity={tailOpacity} />
      </mesh>
      <mesh position={[0, 0, -0.12]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.08, 0.2, 18]} />
        <meshBasicMaterial color="#d5e5ff" toneMapped={false} transparent opacity={flareOpacity} />
      </mesh>
    </group>
  );
}
