import type { LayoutSymbolDefinition } from "./defaultBoard";

// The first race track stays compact so goal flow and settlement rules are easy to iterate on.
export const RACE_BOARD_LAYOUT = [
  "#	#	#	#	#	#	#	#	#	#	#	#	#	#	#	#	#	#	#	#",
  "#	Poison	.	.	Vv	.	.	.	.	.	E2	.	Vv	.	.	.	E2	.	.	#",
  "#	Poison	.	.	.	#	.	.	.	.	.	.	.	.	.	#	#	#	.	#",
  "#	Poison	.	Lucky	Poison	.	#	#	.	.	.	#	.	.	#	#	Poison	Goal	.	#",
  "#	#	.	#	.	.	.	.	.	.	#	Poison	.	.	Lucky	#	#	#	.	#",
  "#	.	.	#	.	.	.	.	Poison	#	.	.	.	.	.	.	.	#	.	#",
  "#	.	Start	#	.	.	E2	E2	#	#	.	.	.	.	V<	E2	.	#	.	#",
  "#	.	#	#	.	.	.	.	.	#	.	.	.	E2	.	.	.	Poison	.	#",
  "#	Lucky	.	.	.	V^	.	.	.	.	.	V^	.	E2	.	.	.	Poison	.	#",
  "#	#	#	#	#	#	#	#	#	#	#	#	#	#	#	#	#	#	#	#"
] as const;

export const RACE_BOARD_SYMBOLS: Partial<Record<string, LayoutSymbolDefinition>> = {};
