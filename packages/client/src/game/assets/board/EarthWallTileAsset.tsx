// Earth walls read as packed clay with a brighter top edge and embedded stones.
export function EarthWallTileAsset() {
  return (
    <group position={[0, 0.02, 0]}>
      <mesh position={[0, 0.16, 0]} castShadow>
        <boxGeometry args={[0.88, 0.1, 0.88]} />
        <meshStandardMaterial color="#d79857" />
      </mesh>
      <mesh position={[-0.18, 0.08, -0.08]} rotation={[0.2, -0.3, 0.1]} castShadow>
        <boxGeometry args={[0.16, 0.08, 0.1]} />
        <meshStandardMaterial color="#8f5a32" />
      </mesh>
      <mesh position={[0.12, 0.04, 0.18]} rotation={[-0.15, 0.2, -0.08]} castShadow>
        <boxGeometry args={[0.12, 0.06, 0.16]} />
        <meshStandardMaterial color="#8a5128" />
      </mesh>
      <mesh position={[0.24, 0.12, -0.22]} scale={[0.16, 0.1, 0.12]}>
        <sphereGeometry args={[0.34, 12, 12]} />
        <meshStandardMaterial color="#c7b39b" roughness={0.8} />
      </mesh>
      <mesh position={[-0.24, 0.1, 0.2]} scale={[0.12, 0.09, 0.14]}>
        <sphereGeometry args={[0.32, 12, 12]} />
        <meshStandardMaterial color="#dbc6ab" roughness={0.78} />
      </mesh>
    </group>
  );
}
