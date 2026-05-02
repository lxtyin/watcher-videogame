import { Clone, useGLTF } from "@react-three/drei";
import {
  getDicePigCarryCode,
  type DicePigCarryCode,
  type RolledToolId,
  type SummonSnapshot
} from "@watcher/shared";
import { useEffect } from "react";
import { Mesh, Object3D } from "three";
import {
  POINT_DIE_FACE_ORDER,
  POINT_DIE_FACE_TOP_ORIENTATIONS,
  TOOL_DIE_FACE_ORDER,
  TOOL_DIE_FACE_TOP_ORIENTATIONS
} from "../../state/diceRollAnimation";
import { PetPiece } from "../player/PetPiece";

const pointDiceModelUrl = new URL("../dice/models/pointDice.glb", import.meta.url).href;
const randomDiceModelUrl = new URL("../dice/models/randomDice.glb", import.meta.url).href;
const toolDiceModelUrl = new URL("../dice/models/toolDice.glb", import.meta.url).href;

const DICE_OFFSET: [number, number, number] = [0, 1.0, -0.5];
const DICE_SCALE = 1.4;

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

function getPointFaceIndex(carryCode: DicePigCarryCode): number {
  if (!carryCode.startsWith("point:")) {
    return 0;
  }

  const value = Number.parseInt(carryCode.slice("point:".length), 10);
  const faceIndex = POINT_DIE_FACE_ORDER.indexOf(
    value as (typeof POINT_DIE_FACE_ORDER)[number]
  );

  return faceIndex >= 0 ? faceIndex : 0;
}

function getToolFaceIndex(carryCode: DicePigCarryCode): number {
  if (!carryCode.startsWith("tool:")) {
    return 0;
  }

  const toolId = carryCode.slice("tool:".length) as RolledToolId;
  const faceIndex = TOOL_DIE_FACE_ORDER.indexOf(toolId);

  return faceIndex >= 0 ? faceIndex : 0;
}

function getDiceRotation(carryCode: DicePigCarryCode): [number, number, number] {
  if (carryCode.startsWith("point:")) {
    return POINT_DIE_FACE_TOP_ORIENTATIONS[getPointFaceIndex(carryCode)] ?? [0, 0, 0];
  }

  if (carryCode.startsWith("tool:")) {
    return TOOL_DIE_FACE_TOP_ORIENTATIONS[getToolFaceIndex(carryCode)] ?? [0, 0, 0];
  }

  return [0, 0, 0];
}

export function DicePigSummonAsset({
  color,
  opacity = 1,
  summon
}: {
  color: string;
  opacity?: number;
  summon: SummonSnapshot;
}) {
  const pointDice = useGLTF(pointDiceModelUrl);
  const randomDice = useGLTF(randomDiceModelUrl);
  const toolDice = useGLTF(toolDiceModelUrl);
  const carryCode = getDicePigCarryCode(summon.state);
  const transparent = opacity < 1;

  useEffect(() => {
    enableShadows(pointDice.scene);
    enableShadows(randomDice.scene);
    enableShadows(toolDice.scene);
  }, [pointDice.scene, randomDice.scene, toolDice.scene]);

  const diceObject =
    carryCode === "none"
      ? null
      : carryCode === "random_tool"
        ? randomDice.scene
        : carryCode.startsWith("point:")
          ? pointDice.scene
          : toolDice.scene;

  return (
    <group>
      {/* <mesh position={[0, -0.18, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.22, 0.34, 28]} />
        <meshBasicMaterial color={color} transparent={transparent} opacity={opacity * 0.78} />
      </mesh> */}
      <PetPiece petId="animal-pig" position={[0, 0, 0]} rotation={[0, 0, 0]}>
        {diceObject ? (
          <group position={DICE_OFFSET} scale={DICE_SCALE}>
            <group rotation={getDiceRotation(carryCode)}>
              <Clone object={diceObject} castShadow receiveShadow />
            </group>
          </group>
        ) : null}
      </PetPiece>
    </group>
  );
}

useGLTF.preload(pointDiceModelUrl);
useGLTF.preload(randomDiceModelUrl);
useGLTF.preload(toolDiceModelUrl);
