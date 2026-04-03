export function StartTileAsset() {
  return (
    <group>
      <mesh position={[0, -0.26, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <ringGeometry args={[0.2, 0.35, 36]} />
        <meshStandardMaterial color="#4aa9a1" />
      </mesh>
      <mesh position={[0, -0.18, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.12, 0.12, 0.16, 18]} />
        <meshStandardMaterial color="#dff6f2" />
      </mesh>
    </group>
  );
}
