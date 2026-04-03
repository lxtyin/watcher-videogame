import { Canvas } from "@react-three/fiber";
import type { CSSProperties } from "react";
import { PetPiece } from "./PetPiece";

export function PetThumbnail({
  color,
  playerId
}: {
  color: string;
  playerId: string;
}) {
  return (
    <div className="pet-thumbnail" style={{ "--player-accent": color } as CSSProperties}>
      <Canvas camera={{ position: [0, 1.4, 2.6], fov: 28 }}>
        <ambientLight intensity={1.2} />
        <directionalLight position={[3, 5, 4]} intensity={1.1} castShadow />
        <group position={[0, -0.48, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <circleGeometry args={[0.74, 40]} />
            <meshStandardMaterial color={color} transparent opacity={0.24} />
          </mesh>
          <mesh position={[0, -0.06, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <circleGeometry args={[0.56, 40]} />
            <meshStandardMaterial color="#f5eedb" />
          </mesh>
          <PetPiece playerId={playerId} position={[0, 0, 0]} rotationY={5 * Math.PI / 4} />
        </group>
      </Canvas>
    </div>
  );
}
