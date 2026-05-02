import type { LayoutSymbolDefinition } from "./defaultBoard";

export const RACE_BOARD3_LAYOUT = [
  "#	#	#	#	#	#	#	#	#	#	#	#	#	#",
  "#	Lucky	#	.	.	.	Start	High	Pit	Goal	Pit	Pit	Pit	#",
  "#	.	Pit	.	.	.	.	High	Lucky	.	.	E2	C>	#",
  "#	Vv	.	.	.	High	High	High	High	High	.	.	E2	#",
  "#	.	.	.	#	#	Pit	Lucky	.	.	.	.	E2	#",
  "#	.	E2	E2	#	Pit	.	.	.	E2	E2	.	V<	#",
  "#	.	.	.	#	.	.	.	V<	.	.	.	C<	#",
  "#	.	.	Lucky	.	.	.	#	#	Pit	Pit	C^	.	#",
  "#	Poison	C^	.	V>	.	Poison	.	V>	.	.	.	Poison	#",
  "#	#	#	#	#	#	#	#	#	#	#	#	#	#"
] as const;


export const RACE_BOARD3_SYMBOLS: Partial<Record<string, LayoutSymbolDefinition>> = {};
