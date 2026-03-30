// Generic tile previews stay lightweight because they are rendered often while aiming.
export function TilePreviewAsset({ color }: { color: string }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[0.82, 0.82]} />
      <meshBasicMaterial color={color} transparent opacity={0.58} />
    </mesh>
  );
}
