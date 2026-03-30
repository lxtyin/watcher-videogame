// Pits sink below the tile top so the hole reads from the default camera angle.
export function PitDecorationAsset() {
  return (
    <group position={[0, -0.22, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.24, 0.42, 36]} />
        <meshBasicMaterial color="#5b4b46" transparent opacity={0.88} />
      </mesh>
      <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.22, 32]} />
        <meshBasicMaterial color="#171418" />
      </mesh>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.34, 0.46, 36]} />
        <meshBasicMaterial color="#9a7162" transparent opacity={0.42} />
      </mesh>
    </group>
  );
}
