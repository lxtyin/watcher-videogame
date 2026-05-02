import type { LayoutSymbolDefinition } from "./defaultBoard";

export const BEDWARS_BOARD_LAYOUT = [
  "#	#	#	#	#	#	#	#	#	#	#	#	#	#	#",
  "#	.	TowerW	.	CampW	.	.	.	.	.	.	.	.	.	#",
  "#	SpawnW	.	.	.	.	.	.	Poison	.	.	.	.	.	#",
  "#	.	CampW	.	.	#	#	#	.	.	.	.	.	.	#",
  "#	.	.	.	.	.	.	.	.	CampB	.	.	.	TowerB	#",
  "#	.	.	.	.	.	Poison	.	.	.	.	.	SpawnB	.	#",
  "#	#	#	#	#	#	#	#	#	#	#	#	#	#	#"
] as const;

export const BEDWARS_BOARD_SYMBOLS: Partial<Record<string, LayoutSymbolDefinition>> = {};

