// Poison tiles stay low to the ground so the gas reads above the board top.
export function PoisonTileAsset() {
  return (
    <group position={[0, -0.15, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.22, 0.42, 32]} />
        <meshBasicMaterial color="#9ce579" toneMapped={false} transparent opacity={0.5} />
      </mesh>
      <mesh position={[0, 0.1, 0]} scale={[0.44, 0.18, 0.44]}>
        <sphereGeometry args={[0.42, 18, 18]} />
        <meshBasicMaterial color="#a3ff87" toneMapped={false} transparent opacity={0.18} />
      </mesh>
      <mesh position={[-0.12, 0.04, 0.1]} scale={[0.18, 0.12, 0.18]}>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshBasicMaterial color="#d4ffba" toneMapped={false} transparent opacity={0.26} />
      </mesh>
      <mesh position={[0.14, 0.12, -0.08]} scale={[0.16, 0.1, 0.16]}>
        <sphereGeometry args={[0.38, 16, 16]} />
        <meshBasicMaterial color="#d4ffba" toneMapped={false} transparent opacity={0.2} />
      </mesh>
    </group>
  );
}
