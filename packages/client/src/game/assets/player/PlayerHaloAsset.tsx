// Player halos are treated as a reusable presence asset instead of inline scene geometry.
export function PlayerHaloAsset({
  activeColor,
  color,
  isActive
}: {
  activeColor: string;
  color: string;
  isActive: boolean;
}) {
  return (
    <>
      {/* {isActive ? (
        <mesh position={[0, -0.285, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.46, 0.62, 44]} />
          <meshBasicMaterial color={activeColor} transparent opacity={0.5} toneMapped={false} />
        </mesh>
      ) : null} */}
      <mesh position={[0, -0.27, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.35, 0.46, 40]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={isActive ? 0.96 : 0.6}
          toneMapped={false}
        />
      </mesh>
    </>
  );
}
