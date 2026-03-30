// Rocket preview tiles use a dedicated blast marker instead of the generic square fill.
export function BlastPreviewTileAsset({ color }: { color: string }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <boxGeometry args={[1.1, 1.1]} />
        <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.34} />
      </mesh>
    </group>
  );
}
