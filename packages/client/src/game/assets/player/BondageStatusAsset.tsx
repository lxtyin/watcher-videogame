export function BondageStatusAsset({
  stacks,
  timeMs
}: {
  stacks: number;
  timeMs: number;
}) {
  const ringCount = Math.max(1, Math.min(3, stacks));

  return (
    <group position={[0, 0.42, 0]}>
      {Array.from({ length: ringCount }, (_, index) => {
        const wobble = Math.sin(timeMs / 420 + index * 0.8) * 0.08;
        const y = -0.08 + index * 0.14;

        return (
          <group
            key={`bondage-ring-${index}`}
            position={[0, y, 0]}
            rotation={[0.5 + wobble, timeMs / 1500 + index * 0.7, 0.85 - wobble]}
          >
            <mesh>
              <torusGeometry args={[0.28, 0.028, 10, 34]} />
              <meshStandardMaterial color="#cfd4de" metalness={0.72} roughness={0.28} />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.22, 0.02, 8, 28]} />
              <meshStandardMaterial color="#7f8794" metalness={0.58} roughness={0.4} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
