import type { LayoutSymbolDefinition } from "./defaultBoard";

// The first race track stays compact so goal flow and settlement rules are easy to iterate on.
export const RACE_BOARD2_LAYOUT = [
  "#	#	#	#	#	#	#	#	#	#	#	#	#	#	#	#	#	#	#",
  "#	Poison	Start	.	.	V>	.	.	.	.	.	.	.	.	.	.	Vv	.	#",
  "#	#	.	.	.	.	E2	.	Poison	Poison	E2	.	Poison	.	E2	E2	.	.	#",
  "#	#	#	.	.	.	.	#	.	.	.	.	.	.	.	.	.	Poison	#",
  "#	#	#	#	.	.	.	.	.	E2	Lucky	E2	.	.	.	Poison	.	#	#",
  "#	#	#	#	#	Lucky	.	.	.	.	.	.	.	V<	.	.	.	.	#",
  "#	.	.	#	#	#	Poison	#	#	Poison	.	.	.	#	#	#	#	Poison	#",
  "#	.	.	.	Poison	#	.	#	#	.	.	.	V>	.	.	Poison	.	.	#",
  "#	.	Lucky	.	.	.	V^	.	.	V^	.	E2	.	.	Lucky	E2	.	E2	#",
  "#	#	#	.	.	.	.	E2	.	Poison	.	.	E2	Poison	Poison	E2	.	.	#",
  "#	Poison	Goal	.	V^	.	Poison	E2	.	.	.	.	V<	.	.	.	V<	Poison	#",
  "#	#	#	#	#	#	#	#	#	#	#	#	#	#	#	#	#	#	#"
] as const;

export const RACE_BOARD2_SYMBOLS: Partial<Record<string, LayoutSymbolDefinition>> = {};
