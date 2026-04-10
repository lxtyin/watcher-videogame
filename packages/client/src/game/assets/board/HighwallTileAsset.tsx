import { WallTileAsset } from "./WallTileAsset";

// Highwall extends the standard wall with a fence silhouette so players can read that leap traversal is blocked.
export function HighwallTileAsset() {
  return (
    <group position={[0, 0.26, 0]}>
      <WallTileAsset />
      {/* <mesh position={[0, 0.18, 0]} castShadow>
        <boxGeometry args={[0.86, 0.08, 0.86]} />
        <meshStandardMaterial color="#8591a4" />
      </mesh> */}
      <mesh position={[0, 0.52, -0.36]} castShadow>
        <boxGeometry args={[0.84, 0.09, 0.06]} />
        <meshStandardMaterial color="#5b6678" />
      </mesh>
      <mesh position={[-0.36, 0.52, 0]} castShadow>
        <boxGeometry args={[0.06, 0.09, 0.84]} />
        <meshStandardMaterial color="#5b6678" />
      </mesh>
      <mesh position={[0.36, 0.52, 0]} castShadow>
        <boxGeometry args={[0.06, 0.09, 0.84]} />
        <meshStandardMaterial color="#5b6678" />
      </mesh>
      <mesh position={[0, 0.52, 0.36]} castShadow>
        <boxGeometry args={[0.84, 0.09, 0.06]} />
        <meshStandardMaterial color="#5b6678" />
      </mesh>
      {[-0.24, 0, 0.24].map((offset) => (
        <mesh key={`highwall-front-${offset}`} position={[offset, 0.08, -0.34]} castShadow>
          <boxGeometry args={[0.05, 0.96, 0.05]} />
          <meshStandardMaterial color="#8c97aa" />
        </mesh>
      ))}
      {[-0.24, 0, 0.24].map((offset) => (
        <mesh key={`highwall-side-${offset}`} position={[-0.34, 0.08, offset]} castShadow>
          <boxGeometry args={[0.05, 0.96, 0.05]} />
          <meshStandardMaterial color="#8c97aa" />
        </mesh>
      ))}
      {[-0.24, 0, 0.24].map((offset) => (
        <mesh key={`highwall-right-${offset}`} position={[0.34, 0.08, offset]} castShadow>
          <boxGeometry args={[0.05, 0.96, 0.05]} />
          <meshStandardMaterial color="#8c97aa" />
        </mesh>
      ))}
      {[-0.24, 0, 0.24].map((offset) => (
        <mesh key={`highwall-back-${offset}`} position={[offset, 0.08, 0.34]} castShadow>
          <boxGeometry args={[0.05, 0.96, 0.05]} />
          <meshStandardMaterial color="#8c97aa" />
        </mesh>
      ))}
    </group>
  );
}
