// The active turn cursor is authored separately so its visual can evolve independently.
export function CurrentTurnMarkerAsset({
  color,
  x,
  z
}: {
  color: string;
  x: number;
  z: number;
}) {
  return (
    <mesh position={[x, -0.38, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.18, 24]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  );
}
