interface PetModelAssetDefinition {
  id: PetId;
  publicPath: string;
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
  "animal-tiger",
  "ak-amiya",
  "ak-logos",
  "ak-ifrit",
  "ak-ines",
  "ak-kal'tsit",
  "ak-lappland",
  "ak-logos",
  "ak-saga",
  "ak-saria",
  "ak-shu",
  "ak-silence",
  "ak-silverash",
  "ak-skadi",
  "ak-suzuran",
  "ak-tragodia",
  "ak-vulpisfoglia",
  "ak-w",
  "ak-bеточки"
] as const;

export type PetId = (typeof PET_MODEL_NAMES)[number];

// Pet models are fetched from client public assets, so every id here must map to an existing .glb file there.
export const PET_MODEL_ASSETS: PetModelAssetDefinition[] = PET_MODEL_NAMES.map((modelName) => ({
  id: modelName,
  publicPath: `/assets/cube-pets/${modelName}.glb`
}));

export const PET_MODEL_PATHS = PET_MODEL_ASSETS.map((asset) => asset.publicPath);
const PET_MODEL_ASSET_BY_ID = new Map(PET_MODEL_ASSETS.map((asset) => [asset.id, asset] as const));

// Cube-pet models face the opposite way from the board's cardinal helper arrows.
export const PET_MODEL_FORWARD_OFFSET_Y = Math.PI;

function hashText(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function formatPetLabel(id: PetId): string {
  return id
    .replace("animal-", "")
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getPetIds(): PetId[] {
  return [...PET_MODEL_NAMES];
}

export function getRandomPetId(): PetId {
  return PET_MODEL_NAMES[Math.floor(Math.random() * PET_MODEL_NAMES.length)] ?? PET_MODEL_NAMES[0];
}

export function resolvePetId(petId: string | null | undefined, fallbackSeed?: string): PetId {
  if (petId && PET_MODEL_ASSET_BY_ID.has(petId as PetId)) {
    return petId as PetId;
  }

  if (fallbackSeed) {
    return PET_MODEL_NAMES[hashText(fallbackSeed) % PET_MODEL_NAMES.length] ?? PET_MODEL_NAMES[0];
  }

  return getRandomPetId();
}

export function getPetLabel(petId: string | null | undefined, fallbackSeed?: string): string {
  return formatPetLabel(resolvePetId(petId, fallbackSeed));
}

// Pet ids are stable player-facing picks, while invalid ids fall back safely.
export function getPetModelPath(petId: string | null | undefined, fallbackSeed?: string): string {
  return PET_MODEL_ASSET_BY_ID.get(resolvePetId(petId, fallbackSeed))?.publicPath ?? PET_MODEL_PATHS[0]!;
}
