import { Clone, useGLTF } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import { Box3, Mesh, Vector3 } from "three";
import { PET_MODEL_FORWARD_OFFSET_Y, PET_MODEL_PATHS, getPetModelPath } from "../content/pets";

interface PetPieceProps {
  fallbackSeed?: string | undefined;
  petId?: string | undefined;
  position: [number, number, number];
  rotation: [number, number, number];
}

// Cube-pet models are normalized to a shared board footprint before being rendered.
export function PetPiece({ fallbackSeed, petId, position, rotation }: PetPieceProps) {
  const modelPath = getPetModelPath(petId, fallbackSeed);
  const { scene } = useGLTF(modelPath);

  useEffect(() => {
    // Mesh shadow flags are enabled once on the shared glTF scene before cloning.
    scene.traverse((object) => {
      const mesh = object as Mesh;

      if (!mesh.isMesh) {
        return;
      }

      mesh.castShadow = true;
      mesh.receiveShadow = true;
    });
  }, [scene]);

  const normalizedModel = useMemo(() => {
    const bounds = new Box3().setFromObject(scene);
    const size = new Vector3();
    const center = new Vector3();
    bounds.getSize(size);
    bounds.getCenter(center);

    const widthScale = 0.76 / Math.max(size.x, size.z, 0.001);
    const heightScale = 0.9 / Math.max(size.y, 0.001);
    const scale = Math.min(widthScale, heightScale);

    return {
      offset: [-center.x * scale, -bounds.min.y * scale, -center.z * scale] as [number, number, number],
      scale
    };
  }, [scene]);

  return (
    <group
      position={position}
      rotation={[rotation[0], rotation[1] + PET_MODEL_FORWARD_OFFSET_Y, rotation[2]]}
      scale={normalizedModel.scale}
    >
      <Clone object={scene} position={normalizedModel.offset} />
    </group>
  );
}

PET_MODEL_PATHS.forEach((modelPath) => {
  useGLTF.preload(modelPath);
});
