import type { Direction } from "@watcher/shared";

const DIRECTION_ROTATION_Y: Record<Direction, number> = {
  up: 0,
  down: Math.PI,
  left: Math.PI / 2,
  right: -Math.PI / 2
};

export function CannonTileAsset({ direction }: { direction: Direction }) {
  return (
    <group rotation={[0, DIRECTION_ROTATION_Y[direction], 0]}>
      <mesh position={[0, -0.1, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.24, 0.3, 0.18, 18]} />
        <meshStandardMaterial color="#596272" />
      </mesh>
      <mesh position={[0, 0.06, -0.1]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.14, 0.5, 18]} />
        <meshStandardMaterial color="#394353" emissive="#9f6442" emissiveIntensity={0.18} />
      </mesh>
      <mesh position={[0, 0.03, 0.14]} castShadow>
        <boxGeometry args={[0.32, 0.08, 0.16]} />
        <meshStandardMaterial color="#7d684d" />
      </mesh>
      <mesh position={[0, 0.14, -0.34]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.08, 0.13, 20]} />
        <meshBasicMaterial color="#ffc089" toneMapped={false} transparent opacity={0.52} />
      </mesh>
    </group>
  );
}
