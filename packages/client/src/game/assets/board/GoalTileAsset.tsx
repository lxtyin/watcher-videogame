export function GoalTileAsset() {
  return (
    <group>
      <mesh position={[0, -0.24, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <ringGeometry args={[0.24, 0.38, 44]} />
        <meshStandardMaterial color="#cf5a4d" />
      </mesh>
      <mesh position={[0, -0.08, 0]} castShadow receiveShadow>
        <torusGeometry args={[0.21, 0.05, 14, 28]} />
        <meshStandardMaterial color="#fff1cb" emissive="#7f3a24" emissiveIntensity={0.25} />
      </mesh>
    </group>
  );
}
