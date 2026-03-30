// Lucky blocks stay as a simple authored placeholder until real art lands.
export function LuckyBlockAsset() {
  return (
    <group position={[0, 0.08, 0]}>
      <mesh position={[0, -0.1, 0]} castShadow>
        <boxGeometry args={[0.48, 0.34, 0.48]} />
        <meshStandardMaterial color="#f1cc59" emissive="#8a6d10" emissiveIntensity={0.34} />
      </mesh>
      <mesh position={[0, -0.07, 0]}>
        <boxGeometry args={[0.5, 0.3, 0.15]} />
        <meshStandardMaterial color="#fff5c9" emissive="#b7931d" emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[0, -0.07, 0]}>
        <boxGeometry args={[0.15, 0.3, 0.5]} />
        <meshStandardMaterial color="#fff5c9" emissive="#b7931d" emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}
