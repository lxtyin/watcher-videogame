export function BoxingBallSharedAsset({
  opacity = 1,
  swingRotationZ = 0
}: {
  opacity?: number;
  swingRotationZ?: number;
}) {
  return (
    <group position={[0, 0.02, 0]}>
      <mesh position={[0, -0.1, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.18, 0.3, 28]} />
        <meshStandardMaterial color="#9f6a42" transparent opacity={opacity} roughness={0.82} />
      </mesh>
      <mesh position={[0, 0.04, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.06, 0.18, 16]} />
        <meshStandardMaterial color="#7a5640" transparent opacity={opacity} roughness={0.88} />
      </mesh>
      <group position={[0, 0.56, 0]} rotation={[0, 0, swingRotationZ]}>
        <mesh position={[0, 0.04, 0]} castShadow>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshStandardMaterial color="#d9cba2" transparent opacity={opacity} roughness={0.42} />
        </mesh>
        <mesh position={[0, -0.14, 0]} castShadow>
          <cylinderGeometry args={[0.018, 0.018, 0.34, 12]} />
          <meshStandardMaterial color="#d8d0be" transparent opacity={opacity} roughness={0.34} />
        </mesh>
        <mesh position={[0, -0.42, 0]} castShadow>
          <sphereGeometry args={[0.22, 24, 24]} />
          <meshStandardMaterial color="#c94e4e" transparent opacity={opacity} roughness={0.58} />
        </mesh>
        <mesh position={[-0.08, -0.46, 0.16]} rotation={[0.12, 0.06, 0.12]} castShadow>
          <boxGeometry args={[0.05, 0.12, 0.08]} />
          <meshStandardMaterial color="#eadcc3" transparent opacity={opacity} roughness={0.5} />
        </mesh>
      </group>
    </group>
  );
}
