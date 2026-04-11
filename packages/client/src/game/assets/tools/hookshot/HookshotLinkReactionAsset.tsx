// Hookshot retraction renders as a shrinking chain between two semantic endpoints.
export function HookshotLinkReactionAsset({
  fromWorldX,
  fromWorldZ,
  progress,
  toWorldX,
  toWorldZ
}: {
  fromWorldX: number;
  fromWorldZ: number;
  progress: number;
  toWorldX: number;
  toWorldZ: number;
}) {
  const deltaX = toWorldX - fromWorldX;
  const deltaZ = toWorldZ - fromWorldZ;
  const length = Math.hypot(deltaX, deltaZ);

  if (length < 0.04) {
    return null;
  }

  const rotationY = Math.atan2(deltaX, deltaZ);
  const midX = (fromWorldX + toWorldX) / 2;
  const midZ = (fromWorldZ + toWorldZ) / 2;
  const segmentCount = Math.max(3, Math.min(9, Math.round(length / 0.22)));
  const tension = 0.94 + Math.sin(progress * Math.PI) * 0.04;
  const glowOpacity = 0.28 + (1 - progress) * 0.18;

  return (
    <group position={[midX, 0.0, midZ]} rotation={[0, rotationY, 0]} scale={[tension, tension, 1]}>
      <mesh position={[0, 0.01, 0]}>
        <boxGeometry args={[0.06, 0.03, length]} />
        <meshBasicMaterial color="#87b7e2" toneMapped={false} transparent opacity={glowOpacity} />
      </mesh>
      {Array.from({ length: segmentCount }, (_, index) => {
        const normalized = segmentCount === 1 ? 0.5 : index / (segmentCount - 1);
        const z = -length / 2 + normalized * length;

        return (
          <mesh
            key={`hookshot-link-segment-${index}`}
            position={[0, 0.015, z]}
            rotation={[0, 0, index % 2 === 0 ? Math.PI / 4 : -Math.PI / 4]}
            castShadow
          >
            <boxGeometry args={[0.16, 0.05, 0.08]} />
            <meshStandardMaterial color="#dce8f7" emissive="#7bb5e2" emissiveIntensity={0.34} />
          </mesh>
        );
      })}
      <mesh position={[0, 0.02, length / 2]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
        <coneGeometry args={[0.13, 0.28, 6]} />
        <meshStandardMaterial color="#eef5ff" emissive="#9ac8ec" emissiveIntensity={0.52} />
      </mesh>
    </group>
  );
}
