export type TileType =
  | "floor"
  | "wall"
  | "earthWall"
  | "pit"
  | "cannon"
  | "lucky"
  | "conveyor"
  | "start"
  | "goal";

export type GameMode = "free" | "race";

export type TurnPhase = "turn-start" | "turn-action" | "turn-end";
export type Direction = "up" | "down" | "left" | "right";
export type ToolSource = "turn" | "character_skill";
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

export type ToolInteractionAnchorDefinition =
  | {
      kind: "actor";
    }
  | {
      kind: "tile_slot";
      slotKey: string;
    };

export type ToolInteractionStageDefinition =
  | {
      anchor: ToolInteractionAnchorDefinition;
      directionKey: string;
      kind: "drag-direction-release";
    }
  | {
      kind: "drag-tile-release";
      tileKey: string;
    }
  | {
      directionKey: string;
      kind: "drag-axis-tile-release";
      tileKey: string;
    }
  | {
      choiceKey: string;
      kind: "modal-choice";
    };

export interface ToolInteractionDefinition {
  stages: readonly ToolInteractionStageDefinition[];
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
  interaction: ToolInteractionDefinition;
  label: string;
  phases?: readonly TurnPhase[];
  rollable: boolean;
  source: ToolSource;
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

export interface CharacterContentDefinition {
  label: string;
  skillIds: readonly string[];
  summary: string;
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
