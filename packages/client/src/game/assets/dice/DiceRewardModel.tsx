import { Clone, useGLTF } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import { Material, Mesh, Object3D } from "three";
import {
  normalizeDiceRewardCode,
  type DiceRewardCode,
  type RolledToolId
} from "@watcher/shared";
import {
  POINT_DIE_FACE_ORDER,
  POINT_DIE_FACE_TOP_ORIENTATIONS,
  TOOL_DIE_FACE_ORDER,
  TOOL_DIE_FACE_TOP_ORIENTATIONS
} from "../../state/diceRollAnimation";

const pointDiceModelUrl = new URL("./models/pointDice.glb", import.meta.url).href;
const randomDiceModelUrl = new URL("./models/randomDice.glb", import.meta.url).href;
const toolDiceModelUrl = new URL("./models/toolDice.glb", import.meta.url).href;

function enableShadows(scene: Object3D): void {
  scene.traverse((object) => {
    const mesh = object as Mesh;

    if (!mesh.isMesh) {
      return;
    }

    mesh.castShadow = true;
    mesh.receiveShadow = true;
  });
}

function applyOpacity(object: Object3D, opacity: number): void {
  object.traverse((entry) => {
    const mesh = entry as Mesh;

    if (!mesh.isMesh) {
      return;
    }

    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

    for (const material of materials) {
      const editableMaterial = material as Material;
      editableMaterial.transparent = opacity < 1;
      editableMaterial.opacity = opacity;
      editableMaterial.depthWrite = opacity >= 1;
    }
  });
}

function cloneWithEditableMaterials(object: Object3D): Object3D {
  const clone = object.clone(true);

  clone.traverse((entry) => {
    const mesh = entry as Mesh;

    if (!mesh.isMesh) {
      return;
    }

    mesh.material = Array.isArray(mesh.material)
      ? mesh.material.map((material) => material.clone())
      : mesh.material.clone();
  });

  return clone;
}

function getPointFaceIndex(rewardCode: DiceRewardCode): number {
  if (!rewardCode.startsWith("point:")) {
    return 0;
  }

  const value = Number.parseInt(rewardCode.slice("point:".length), 10);
  const faceIndex = POINT_DIE_FACE_ORDER.indexOf(
    value as (typeof POINT_DIE_FACE_ORDER)[number]
  );

  return faceIndex >= 0 ? faceIndex : 0;
}

function getToolFaceIndex(rewardCode: DiceRewardCode): number {
  if (!rewardCode.startsWith("tool:")) {
    return 0;
  }

  const toolId = rewardCode.slice("tool:".length) as RolledToolId;
  const faceIndex = TOOL_DIE_FACE_ORDER.indexOf(toolId);

  return faceIndex >= 0 ? faceIndex : 0;
}

export function getDiceRewardRotation(rewardCode: DiceRewardCode): [number, number, number] {
  if (rewardCode.startsWith("point:")) {
    return POINT_DIE_FACE_TOP_ORIENTATIONS[getPointFaceIndex(rewardCode)] ?? [0, 0, 0];
  }

  if (rewardCode.startsWith("tool:")) {
    return TOOL_DIE_FACE_TOP_ORIENTATIONS[getToolFaceIndex(rewardCode)] ?? [0, 0, 0];
  }

  return [0, 0, 0];
}

function FadingClone({ object, opacity }: { object: Object3D; opacity: number }) {
  const clone = useMemo(() => cloneWithEditableMaterials(object), [object]);

  useEffect(() => {
    enableShadows(clone);
  }, [clone]);

  useEffect(() => {
    applyOpacity(clone, opacity);
  }, [clone, opacity]);

  return <primitive object={clone} />;
}

export function DiceRewardModel({
  opacity = 1,
  rewardCode
}: {
  opacity?: number;
  rewardCode: DiceRewardCode | string;
}) {
  const normalizedRewardCode = normalizeDiceRewardCode(rewardCode);
  const pointDice = useGLTF(pointDiceModelUrl);
  const randomDice = useGLTF(randomDiceModelUrl);
  const toolDice = useGLTF(toolDiceModelUrl);
  const object =
    normalizedRewardCode === "random_tool"
      ? randomDice.scene
      : normalizedRewardCode.startsWith("point:")
        ? pointDice.scene
        : toolDice.scene;

  useEffect(() => {
    enableShadows(pointDice.scene);
    enableShadows(randomDice.scene);
    enableShadows(toolDice.scene);
  }, [pointDice.scene, randomDice.scene, toolDice.scene]);

  return (
    <group rotation={getDiceRewardRotation(normalizedRewardCode)}>
      {opacity >= 1 ? (
        <Clone object={object} castShadow receiveShadow />
      ) : (
        <FadingClone object={object} opacity={opacity} />
      )}
    </group>
  );
}

useGLTF.preload(pointDiceModelUrl);
useGLTF.preload(randomDiceModelUrl);
useGLTF.preload(toolDiceModelUrl);
