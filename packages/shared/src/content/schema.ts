export type TileType =
  | "floor"
  | "wall"
  | "earthWall"
  | "pit"
  | "lucky"
  | "conveyor";

export type TurnPhase = "roll" | "action";
export type Direction = "up" | "down" | "left" | "right";
export type ToolSource = "turn" | "character_skill";
export type ToolTargetMode = "direction" | "tile" | "instant";
export type TileTargetingMode = "axis_line" | "adjacent_ring" | "board_any";
export type MovementType = "translate" | "leap" | "drag";
export type MovementDisposition = "active" | "passive";

export type ToolParameterId =
  | "movePoints"
  | "jumpDistance"
  | "hookLength"
  | "dashBonus"
  | "brakeRange"
  | "projectileRange"
  | "projectileBounceCount"
  | "projectilePushDistance"
  | "wallDurability"
  | "targetRange"
  | "rocketBlastLeapDistance"
  | "rocketSplashPushDistance";

export type ToolParameterValueMap = Partial<Record<ToolParameterId, number>>;

export interface ToolButtonValueContentDefinition {
  paramId: ToolParameterId;
  unit: "point" | "tile";
}

export interface ToolConditionContentDefinition {
  kind: "tool_present";
  toolId: string;
}

export interface MovementContentDefinition {
  disposition: MovementDisposition;
  type: MovementType;
}

export interface ToolContentDefinition {
  actorMovement?: MovementContentDefinition;
  buttonValue?: ToolButtonValueContentDefinition;
  color: string;
  conditions: ToolConditionContentDefinition[];
  defaultCharges: number;
  defaultParams: ToolParameterValueMap;
  debugGrantable: boolean;
  description: string;
  disabledHint: string | null;
  endsTurnOnUse: boolean;
  rollable: boolean;
  source: ToolSource;
  targetMode: ToolTargetMode;
  tileTargeting?: TileTargetingMode;
}

export interface ToolLoadoutContentDefinition {
  charges?: number;
  params?: ToolParameterValueMap;
  source?: ToolSource;
  toolId: string;
}

export interface ToolDieFaceContentDefinition extends ToolLoadoutContentDefinition {
  toolId: string;
}

export interface CharacterToolTransformContentDefinition {
  fromToolId: string;
  paramMappings: Array<{
    fromParamId: ToolParameterId;
    toParamId: ToolParameterId;
  }>;
  toToolId: string;
}

export interface CharacterContentDefinition {
  activeSkillLoadout: ToolLoadoutContentDefinition[];
  label: string;
  passiveDescriptions: string[];
  summary: string;
  toolTransforms: CharacterToolTransformContentDefinition[];
  turnStartGrants: ToolLoadoutContentDefinition[];
}

export interface SummonContentDefinition {
  description: string;
  label: string;
  triggerMode: "movement_trigger";
}

export interface PresentationEffectContentDefinition {
  description: string;
  label: string;
}
