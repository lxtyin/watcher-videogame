
export function DangerTileHighlightAsset() {
  return (
    <group position={[0, 0.42, 0]}>
      <mesh position={[0, 0.1, 0] } rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.1, 0.5, 8]} />
        <meshBasicMaterial color="#ff2d3f" toneMapped={false} />
      </mesh>
      <mesh position={[0, -0.4, 0]}>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshBasicMaterial color="#ff2d3f" toneMapped={false} />
      </mesh>
      <mesh position={[0, -0.4, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <ringGeometry args={[0.24, 0.38, 44]} />
        <meshStandardMaterial color="#ff8690" />
      </mesh>
      {/* <mesh position={[0, 0.1, -0.014]} scale={[1.34, 1.18, 1]}>
        <boxGeometry args={[0.12, 0.44, 0.02]} />
        <meshBasicMaterial color="#fff0f0" toneMapped={false} transparent opacity={0.58} />
      </mesh> */}
    </group>
  );
}