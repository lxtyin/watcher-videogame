export type TileType =
  | "floor"
  | "wall"
  | "earthWall"
  | "pit"
  | "lucky"
  | "conveyor"
  | "start"
  | "goal";

export type GameMode = "free" | "race";

export type TurnPhase = "roll" | "action";
export type Direction = "up" | "down" | "left" | "right";
export type ToolSource = "turn" | "character_skill";
export type ToolTargetMode =
  | "direction"
  | "tile"
  | "instant"
  | "choice"
  | "tile_direction";
export type TileTargetingMode = "axis_line" | "adjacent_ring" | "board_any";
export type MovementType = "translate" | "leap" | "drag" | "teleport";
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
  | "rocketSplashPushDistance"
  | "pushDistance";

export type ToolParameterValueMap = Partial<Record<ToolParameterId, number>>;

export interface ToolButtonValueContentDefinition {
  paramId: ToolParameterId;
  unit: "point" | "tile";
}

export interface ToolConditionContentDefinition {
  kind: "tool_present";
  toolId: string;
}

export interface ToolChoiceContentDefinition {
  description: string;
  id: string;
  label: string;
}

export interface MovementContentDefinition {
  disposition: MovementDisposition;
  type: MovementType;
}

export interface ToolContentDefinition {
  actorMovement?: MovementContentDefinition;
  buttonValue?: ToolButtonValueContentDefinition;
  choices?: readonly ToolChoiceContentDefinition[];
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
  summary: string;
  toolTransforms: CharacterToolTransformContentDefinition[];
  turnStartActionIds: readonly string[];
  turnStartGrants: ToolLoadoutContentDefinition[];
}

export interface TurnStartActionContentDefinition {
  color: string;
  description: string;
  label: string;
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

