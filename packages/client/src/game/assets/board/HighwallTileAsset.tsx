// Highwall adds a fence silhouette so players can read that leap traversal is blocked.
export function HighwallTileAsset() {
  return (
    <group position={[0, 0.44, 0]}>
      <mesh position={[0, 0.16, 0]} castShadow>
        <boxGeometry args={[0.84, 0.12, 0.12]} />
        <meshStandardMaterial color="#6b7688" />
      </mesh>
      <mesh position={[0.3, 0.16, 0]} castShadow>
        <boxGeometry args={[0.12, 0.12, 0.84]} />
        <meshStandardMaterial color="#6b7688" />
      </mesh>
      <mesh position={[-0.3, 0.16, 0]} castShadow>
        <boxGeometry args={[0.12, 0.12, 0.84]} />
        <meshStandardMaterial color="#6b7688" />
      </mesh>
      {[-0.24, -0.08, 0.08, 0.24].map((offset) => (
        <mesh key={`highwall-front-${offset}`} position={[offset, -0.08, -0.34]} castShadow>
          <boxGeometry args={[0.05, 0.46, 0.05]} />
          <meshStandardMaterial color="#8c97aa" />
        </mesh>
      ))}
      {[-0.24, -0.08, 0.08, 0.24].map((offset) => (
        <mesh key={`highwall-side-${offset}`} position={[-0.34, -0.08, offset]} castShadow>
          <boxGeometry args={[0.05, 0.46, 0.05]} />
          <meshStandardMaterial color="#8c97aa" />
        </mesh>
      ))}
    </group>
  );
}
