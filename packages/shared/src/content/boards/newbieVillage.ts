import type { LayoutSymbolDefinition } from "./defaultBoard";

export const NEWBIE_VILLAGE_BOARD_LAYOUT = [
  "High	High	High	High	High	High	High	High	High	High	High	High	High	High",
  "High	#	#	#	.	.	.	.	.	.	.	.	.	High",
  "High	#	#	#	E2	E2	.	L?	.	#	#	#	.	High",
  "High	.	L?	.	L?	E2	.	L?	.	.	.	#	.	High",
  "High	.	L?	.	L?	E2	.	L?	.	.	Goal	#	.	High",
  "High	.	L?	.	L?	E2	.	L?	.	.	.	#	.	High",
  "High	.	.	.	E2	E2	.	L?	.	#	#	#	.	High",
  "Poison	Poison	Poison	Poison	Poison	.	.	.	.	.	.	.	.	High",
  "Poison	E2	E2	E2	Poison	High	High	High	High	High	High	High	High	High",
  "Poison	.	L6	.	Poison	High	L:punch	.	E2	Poison	L:hookshot	Poison	.|p6	High",
  "Poison	.|p:rocket	.|p:hookshot	.|p:buildWall	Poison	High	.	.	E2	Pit	Pit	Pit	E2	High",
  "Poison	.	.	.	Poison	High	.	.	E2	.	.	.	E2	High",
  "#	#	L:rocket	#	#	L4	L:punch	.	E2	.	L:hookshot	.	E2	High",
  "High	.	.	.	.	Vv	.	High	#	#	#	#	#	High",
  "High	.	.	.	.	.	.|p:basketball	High	L:jump	L:jump	L:jump	L:jump	L:jump	High",
  "High	.	L:rocket	.	.	V<	.|p:basketball	High	.	.	.	.	.	High",
  "High	E2	E2	E2	.	.	Pit	High	.	.	.	.	.	High",
  "High	E2	E2	E2	.	.	Pit	High	.	.	Start	.	.	High",
  "High	E2	E2	E2	.	.	Pit	High	.	.	.	.	.	High",
  "High	High	High	High	High	High	High	High	High	High	High	High	High	High"
] as const;


export const NEWBIE_VILLAGE_BOARD_SYMBOLS: Partial<Record<string, LayoutSymbolDefinition>> = {};
