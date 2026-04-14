interface EarthWallPillarSpec {
  color: string;
  height: number;
  rotationY: number;
  width: number;
  x: number;
  z: number;
}

const EARTH_WALL_PILLARS: EarthWallPillarSpec[] = [
  { color: "#cf8750", height: 0.56, rotationY: 0.1, width: 0.14, x: -0.3, z: -0.22 },
  { color: "#a96337", height: 0.72, rotationY: -0.16, width: 0.16, x: -0.12, z: -0.28 },
  { color: "#d89555", height: 0.5, rotationY: 0.24, width: 0.13, x: 0.08, z: -0.24 },
  { color: "#b66e3e", height: 0.64, rotationY: -0.08, width: 0.15, x: 0.28, z: -0.2 },
  { color: "#d08a50", height: 0.78, rotationY: 0.22, width: 0.17, x: -0.24, z: -0.02 },
  { color: "#9f5d35", height: 0.58, rotationY: -0.26, width: 0.14, x: -0.04, z: 0.02 },
  { color: "#c97c45", height: 0.7, rotationY: 0.05, width: 0.16, x: 0.18, z: 0.02 },
  { color: "#e0a061", height: 0.46, rotationY: 0.32, width: 0.12, x: 0.36, z: 0.06 },
  { color: "#b3683a", height: 0.62, rotationY: -0.2, width: 0.15, x: -0.3, z: 0.24 },
  { color: "#d68f56", height: 0.52, rotationY: 0.18, width: 0.13, x: -0.08, z: 0.28 },
  { color: "#aa6238", height: 0.74, rotationY: -0.12, width: 0.16, x: 0.12, z: 0.24 },
  { color: "#ce814b", height: 0.6, rotationY: 0.26, width: 0.14, x: 0.32, z: 0.24 }
];

// Earth walls read as uneven packed clay pillars that can preview a collapse state.
export function EarthWallTileAsset({ breaking = false }: { breaking?: boolean }) {
  const opacity = breaking ? 0.38 : 1;

  return (
    <group position={[0, 0.01, 0]}>
      {EARTH_WALL_PILLARS.map((pillar, index) => {
        const outwardScale = breaking ? 1.2 : 1;
        const position: [number, number, number] = [
          pillar.x * outwardScale,
          -0.2 + pillar.height * 0.5,
          pillar.z * outwardScale
        ];
        const rotation: [number, number, number] = [0.03 * ((index % 3) - 1), pillar.rotationY, 0.02 * ((index % 2) ? 1 : -1)];

        return (
          <mesh
            key={`earth-wall-pillar-${index}`}
            // castShadow={!breaking}
            position={position}
            rotation={rotation}
          >
            <boxGeometry args={[pillar.width, pillar.height, pillar.width * 1.18]} />
            <meshStandardMaterial
              color={pillar.color}
              transparent
              opacity={opacity}
              roughness={0.86}
            />
          </mesh>
        );
      })}
    </group>
  );
}
