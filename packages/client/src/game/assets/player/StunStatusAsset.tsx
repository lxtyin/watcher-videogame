export function StunStatusAsset({
  timeMs
}: {
  timeMs: number;
}) {
  const orbit = timeMs / 520;

  return (
    <group position={[0, 1.12, 0]}>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.16, 0.24, 28]} />
        <meshBasicMaterial color="#ffd95a" toneMapped={false} transparent opacity={0.72} />
      </mesh>
      {Array.from({ length: 3 }, (_, index) => {
        const angle = orbit + (index * Math.PI * 2) / 3;
        const radius = 0.2 + Math.sin(timeMs / 360 + index) * 0.02;

        return (
          <mesh
            key={`stun-status-${index}`}
            position={[
              Math.cos(angle) * radius,
              0.08 + Math.sin(timeMs / 280 + index) * 0.03,
              Math.sin(angle) * radius
            ]}
            rotation={[0, angle, Math.PI / 4]}
            scale={[0.06, 0.1, 0.06]}
          >
            <octahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color="#fff1a8" emissive="#ffcf57" emissiveIntensity={0.7} />
          </mesh>
        );
      })}
    </group>
  );
}
