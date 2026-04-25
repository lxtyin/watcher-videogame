import {
  createBoardDefinitionFromLayout,
  type GameMode
} from "@watcher/shared";

export interface MapEditorDocumentLike {
  allowDebugTools: boolean;
  layout: string[];
  mapLabel: string;
  mode: GameMode;
}

const LABEL_PATTERN = /^\/\/\s*label:\s*(.+)$/im;
const MODE_PATTERN = /^\/\/\s*mode:\s*(free|race|bedwars)\s*$/im;
const DEBUG_PATTERN = /^\/\/\s*allowDebugTools:\s*(true|false)\s*$/im;
const LAYOUT_PATTERN =
  /export\s+const\s+[A-Z0-9_]+_LAYOUT\s*=\s*\[([\s\S]*?)\]\s*as const\s*;?/im;
const ARRAY_PATTERN = /\[([\s\S]*?)\]/m;
const ROW_PATTERN = /"([^"\\]*(?:\\.[^"\\]*)*)"/g;

function decodeRow(rawRow: string): string {
  return rawRow.replace(/\\(["\\])/g, "$1");
}

function extractLayoutText(source: string): string | null {
  const layoutMatch = source.match(LAYOUT_PATTERN);

  if (layoutMatch?.[1]) {
    return layoutMatch[1];
  }

  const arrayMatch = source.match(ARRAY_PATTERN);
  return arrayMatch?.[1] ?? null;
}

export function formatMapEditorDocument(document: MapEditorDocumentLike): string {
  const rows = document.layout.map((row) => `  "${row}"`).join(",\n");

  return [
    `// label: ${document.mapLabel}`,
    `// mode: ${document.mode}`,
    `// allowDebugTools: ${String(document.allowDebugTools)}`,
    "export const CUSTOM_BOARD_LAYOUT = [",
    rows,
    "] as const;",
    "",
    "export const CUSTOM_BOARD_SYMBOLS = DEFAULT_BOARD_SYMBOLS;"
  ].join("\n");
}

export function parseMapEditorDocument(
  source: string,
  fallback: MapEditorDocumentLike
): MapEditorDocumentLike {
  const layoutSource = extractLayoutText(source);

  if (!layoutSource) {
    throw new Error("未找到地图布局数组。");
  }

  const rows: string[] = [];

  for (const match of layoutSource.matchAll(ROW_PATTERN)) {
    rows.push(decodeRow(match[1] ?? ""));
  }

  if (!rows.length) {
    throw new Error("地图布局不能为空。");
  }

  createBoardDefinitionFromLayout(rows);

  return {
    allowDebugTools: source.match(DEBUG_PATTERN)?.[1] === "true" ? true : fallback.allowDebugTools,
    layout: rows,
    mapLabel: source.match(LABEL_PATTERN)?.[1]?.trim() || fallback.mapLabel,
    mode: (source.match(MODE_PATTERN)?.[1] as GameMode | undefined) ?? fallback.mode
  };
}
