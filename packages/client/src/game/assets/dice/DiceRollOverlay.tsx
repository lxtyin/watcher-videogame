import { Clone, useGLTF } from "@react-three/drei";
import type { DiceRollAnimation, DiceRollDieAnimation } from "../../state/diceRollAnimation";

const pointDiceModelUrl = new URL("./models/pointDice.glb", import.meta.url).href;
const toolDiceModelUrl = new URL("./models/toolDice.glb", import.meta.url).href;

interface DicePose {
  localRotation: [number, number, number];
  position: [number, number, number];
  yaw: number;
}

interface DiceRollOverlayProps {
  animation: DiceRollAnimation;
  boardHeight: number;
  boardWidth: number;
  simulationTimeMs: number;
}

const PLANE_Y = 0.9;
const DICE_SCALE = 0.55;
const DICE_START_LIFT = 4.3;
const DICE_HALF_SIDE = DICE_SCALE * 0.5;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function lerp(start: number, end: number, progress: number): number {
  return start + (end - start) * progress;
}

function easeOutCubic(value: number): number {
  const inverse = 1 - clamp01(value);

  return 1 - inverse * inverse * inverse;
}

function getCubeVerticalHalfExtent(rotation: [number, number, number]): number {
  const [x, y, z] = rotation;
  const cx = Math.cos(x);
  const sx = Math.sin(x);
  const cy = Math.cos(y);
  const sy = Math.sin(y);
  const cz = Math.cos(z);
  const sz = Math.sin(z);
  const localXWorldY = cx * sz + sx * cz * sy;
  const localYWorldY = cx * cz - sx * sz * sy;
  const localZWorldY = -sx * cy;

  return DICE_HALF_SIDE * (
    Math.abs(localXWorldY) +
    Math.abs(localYWorldY) +
    Math.abs(localZWorldY)
  );
}

function getDiePose(
  die: DiceRollDieAnimation,
  animation: DiceRollAnimation,
  elapsedMs: number
): DicePose {
  const rollProgress = clamp01(elapsedMs / animation.rollMs);
  const travelProgress = easeOutCubic(Math.min(1, rollProgress / 0.78));
  const fallProgress = easeOutCubic(Math.min(1, rollProgress / 0.42));
  const spinProgress = easeOutCubic(rollProgress);
  const residualSpin = 1 - spinProgress;
  const bounceProgress = Math.max(0, (rollProgress - 0.38) / 0.58);
  const bounceLift = Math.max(
    0,
    Math.sin(bounceProgress * Math.PI * 4 + die.wobblePhase) *
      0.28 *
      Math.pow(1 - clamp01(bounceProgress), 2)
  );
  const travelWobble = Math.sin(rollProgress * Math.PI * 2.6 + die.wobblePhase) * 0.18 * residualSpin;
  const airborneLift = DICE_START_LIFT * (1 - fallProgress);
  const localRotation: [number, number, number] = [
    die.finalLocalRotation[0] + die.spinTurnsX * Math.PI * 2 * residualSpin,
    die.finalLocalRotation[1] + (die.spinTurnsX + die.spinTurnsZ) * Math.PI * residualSpin,
    die.finalLocalRotation[2] + die.spinTurnsZ * Math.PI * 2 * residualSpin
  ];

  return {
    localRotation,
    position: [
      lerp(die.startOffsetX, die.landingOffsetX, travelProgress) + travelWobble,
      PLANE_Y + getCubeVerticalHalfExtent(localRotation) + airborneLift + bounceLift,
      lerp(die.startOffsetZ, die.landingOffsetZ, travelProgress) - travelWobble * 0.42
    ],
    yaw: die.finalYaw
  };
}

function DiceModel({ die, localRotation, position, yaw }: DicePose & { die: DiceRollDieAnimation }) {
  const pointDice = useGLTF(pointDiceModelUrl);
  const toolDice = useGLTF(toolDiceModelUrl);
  const object = die.kind === "point" ? pointDice.scene : toolDice.scene;

  return (
    <group position={position} rotation={[0, yaw, 0]} scale={DICE_SCALE}>
      <group rotation={localRotation}>
        <Clone object={object} castShadow receiveShadow />
      </group>
    </group>
  );
}

export function DiceRollOverlay({
  animation,
  boardHeight,
  boardWidth,
  simulationTimeMs
}: DiceRollOverlayProps) {
  const elapsedMs = Math.max(0, simulationTimeMs - animation.startedAtMs);
  const planeOpacity = elapsedMs >= animation.durationMs ? 0 : 0.36;

  if (planeOpacity <= 0) {
    return null;
  }

  return (
    <group renderOrder={90}>
      <mesh position={[0, PLANE_Y, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[boardWidth + 1.8, boardHeight + 1.8]} />
        <meshStandardMaterial
          color="#ffffff"
          depthWrite={false}
          opacity={planeOpacity}
          transparent
        />
      </mesh>
      {animation.dice.map((die) => (
        <DiceModel
          key={die.key}
          die={die}
          {...getDiePose(die, animation, elapsedMs)}
        />
      ))}
    </group>
  );
}

useGLTF.preload(pointDiceModelUrl);
useGLTF.preload(toolDiceModelUrl);
