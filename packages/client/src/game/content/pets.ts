interface PetModelAssetDefinition {
  id: string;
  publicPath: string;
  sourcePath: string;
}

const PET_MODEL_NAMES = [
  "animal-beaver",
  "animal-bee",
  "animal-bunny",
  "animal-cat",
  "animal-caterpillar",
  "animal-chick",
  "animal-cow",
  "animal-crab",
  "animal-deer",
  "animal-dog",
  "animal-elephant",
  "animal-fish",
  "animal-fox",
  "animal-giraffe",
  "animal-hog",
  "animal-koala",
  "animal-lion",
  "animal-monkey",
  "animal-panda",
  "animal-parrot",
  "animal-penguin",
  "animal-pig",
  "animal-polar",
  "animal-tiger"
] as const;

// Runtime asset paths stay together with their source references for future swaps or imports.
export const PET_MODEL_ASSETS: PetModelAssetDefinition[] = PET_MODEL_NAMES.map((modelName) => ({
  id: modelName,
  publicPath: `/assets/cube-pets/${modelName}.glb`,
  sourcePath: `resources/kenney_cube-pets_1.0/Models/GLB format/${modelName}.glb`
}));

export const PET_MODEL_PATHS = PET_MODEL_ASSETS.map((asset) => asset.publicPath);

// Cube-pet models face the opposite way from the board's cardinal helper arrows.
export const PET_MODEL_FORWARD_OFFSET_Y = Math.PI;

function hashText(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

// Player ids pick a stable pseudo-random pet so sessions stay readable across reconnects.
export function getPetModelPath(playerId: string): string {
  return PET_MODEL_PATHS[hashText(playerId) % PET_MODEL_PATHS.length] ?? PET_MODEL_PATHS[0]!;
}
