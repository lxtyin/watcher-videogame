import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const legacyDescriptorMap = {
  ".": ".",
  "#": "#",
  e: "E2",
  b: "Box",
  P: ".|p?",
  t: "TowerW",
  T: "TowerB",
  i: "SpawnW",
  I: "SpawnB",
  c: "CampW",
  C: "CampB",
  p: "Poison",
  o: "Pit",
  H: "High",
  l: "Lucky",
  x: "Lucky0",
  s: "Start",
  g: "Goal",
  "^": "V^",
  v: "Vv",
  "<": "V<",
  ">": "V>",
  D: "Cv",
  U: "C^",
  L: "C<",
  R: "C>"
};

const targetRoots = [
  "packages/shared/src/content/boards",
  "packages/shared/src/goldens/cases"
];

function walkFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return walkFiles(fullPath);
    }

    return entry.isFile() && entry.name.endsWith(".ts") ? [fullPath] : [];
  });
}

function convertLegacyRow(row) {
  if (row.includes("\t")) {
    return row;
  }

  return [...row].map((character) => legacyDescriptorMap[character] ?? character).join("\t");
}

function convertRowsInArrayBody(body) {
  return body.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, (match, rawRow) => {
    if (!rawRow || rawRow.includes("\\") || rawRow.includes("\t")) {
      return match;
    }

    return `"${convertLegacyRow(rawRow)}"`;
  });
}

function convertLayoutArrays(source) {
  return source
    .replace(
      /((?:layout|boardLayout)\s*:\s*\[)([\s\S]*?)(\])/g,
      (_match, prefix, body, suffix) => `${prefix}${convertRowsInArrayBody(body)}${suffix}`
    )
    .replace(
      /(export\s+const\s+[A-Z0-9_]+_LAYOUT\s*=\s*\[)([\s\S]*?)(\]\s*as const;?)/g,
      (_match, prefix, body, suffix) => `${prefix}${convertRowsInArrayBody(body)}${suffix}`
    );
}

let changedCount = 0;

for (const targetRoot of targetRoots) {
  const absoluteRoot = path.join(repoRoot, targetRoot);

  for (const filePath of walkFiles(absoluteRoot)) {
    const source = fs.readFileSync(filePath, "utf8");
    const nextSource = convertLayoutArrays(source);

    if (nextSource === source) {
      continue;
    }

    fs.writeFileSync(filePath, nextSource);
    changedCount += 1;
    console.log(path.relative(repoRoot, filePath));
  }
}

console.log(`Migrated ${changedCount} files.`);
