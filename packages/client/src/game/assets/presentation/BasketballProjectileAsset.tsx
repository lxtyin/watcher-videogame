// Basketball uses a compact spinning sphere asset during flight playback.
export function BasketballProjectileAsset({
  lift,
  progress,
  worldX,
  worldZ
}: {
  lift: number;
  progress: number;
  worldX: number;
  worldZ: number;
}) {
  return (
    <group
      position={[worldX, 0.46 + lift, worldZ]}
      rotation={[progress * Math.PI * 8, progress * Math.PI * 5, 0]}
    >
      <mesh castShadow>
        <sphereGeometry args={[0.17, 18, 18]} />
        <meshStandardMaterial color="#f08b4c" emissive="#8c4217" emissiveIntensity={0.34} />
      </mesh>
    </group>
  );
}
