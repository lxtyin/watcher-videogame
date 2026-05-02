export function DicePigSummonAsset({
  color,
  opacity = 1
}: {
  color: string;
  opacity?: number;
}) {
  const transparent = opacity < 1;

  return (
    <group>
      <mesh position={[0, -0.18, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.2, 0.31, 28]} />
        <meshBasicMaterial color={color} transparent={transparent} opacity={opacity * 0.78} />
      </mesh>
      <mesh position={[0, 0.04, 0]} castShadow scale={[1.18, 0.84, 0.88]}>
        <sphereGeometry args={[0.24, 24, 18]} />
        <meshStandardMaterial color="#f3a1b7" roughness={0.54} transparent={transparent} opacity={opacity} />
      </mesh>
      <mesh position={[0.26, 0.07, 0]} castShadow scale={[0.85, 0.75, 0.75]}>
        <sphereGeometry args={[0.15, 20, 16]} />
        <meshStandardMaterial color="#f6b0c2" roughness={0.5} transparent={transparent} opacity={opacity} />
      </mesh>
      <mesh position={[0.39, 0.08, 0]} castShadow rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.045, 0.055, 0.05, 16]} />
        <meshStandardMaterial color="#ef8fa8" roughness={0.5} transparent={transparent} opacity={opacity} />
      </mesh>
      <mesh position={[0.39, 0.12, 0.04]}>
        <sphereGeometry args={[0.016, 8, 8]} />
        <meshBasicMaterial color="#4b2b37" transparent={transparent} opacity={opacity} />
      </mesh>
      <mesh position={[0.39, 0.12, -0.04]}>
        <sphereGeometry args={[0.016, 8, 8]} />
        <meshBasicMaterial color="#4b2b37" transparent={transparent} opacity={opacity} />
      </mesh>
      <mesh position={[0.22, 0.22, 0.09]} rotation={[0.55, 0, -0.25]} castShadow>
        <coneGeometry args={[0.055, 0.12, 3]} />
        <meshStandardMaterial color="#f6b0c2" roughness={0.52} transparent={transparent} opacity={opacity} />
      </mesh>
      <mesh position={[0.22, 0.22, -0.09]} rotation={[-0.55, 0, -0.25]} castShadow>
        <coneGeometry args={[0.055, 0.12, 3]} />
        <meshStandardMaterial color="#f6b0c2" roughness={0.52} transparent={transparent} opacity={opacity} />
      </mesh>
      {[-0.13, 0.11].map((xOffset) =>
        [-0.11, 0.11].map((zOffset) => (
          <mesh key={`${xOffset}:${zOffset}`} position={[xOffset, -0.14, zOffset]} castShadow>
            <boxGeometry args={[0.055, 0.13, 0.055]} />
            <meshStandardMaterial color="#cb6f88" roughness={0.58} transparent={transparent} opacity={opacity} />
          </mesh>
        ))
      )}
      <mesh position={[-0.28, 0.1, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.06, 0.012, 8, 18]} />
        <meshStandardMaterial color="#e58aa3" roughness={0.44} transparent={transparent} opacity={opacity} />
      </mesh>
    </group>
  );
}
